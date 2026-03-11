import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, createClient } from "@/lib/supabase/server";
import {
  syncMatchHistory,
  getMatchHistory,
  getPlayerStats,
} from "@/lib/riot/matches";

/**
 * Valida que un PUUID tenga un formato válido
 * Los PUUIDs de Riot son strings de 78 caracteres con formato específico
 */
function isValidPuuid(puuid: string): boolean {
  if (!puuid || typeof puuid !== "string") return false;
  // Los PUUIDs tienen un patrón específico: caracteres alfanuméricos y guiones
  // Aproximadamente 78 caracteres
  return /^[a-zA-Z0-9_-]{78,}$/.test(puuid);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient();

    // Intentar obtener user_id de múltiples fuentes:
    // 1. Header x-user-id (para compatibilidad)
    // 2. Sesión autenticada
    // 3. Body del request
    let userId = request.headers.get("x-user-id");

    if (!userId) {
      // Intentar obtener desde la sesión
      const authClient = await createClient();
      const {
        data: { session },
      } = await authClient.auth.getSession();
      userId = session?.user?.id ?? null;
    }

    if (!userId) {
      // Fallback: intentar obtener del body
      try {
        const body = await request.clone().json();
        userId = body.userId ?? null;
      } catch {
        // El body puede estar vacío o malformado
      }
    }

    console.log("[POST /api/riot/matches/sync] userId:", userId);
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Obtener cuenta de Riot vinculada
    const { data: riotAccount, error: accountError } = await supabase
      .from("linked_accounts_riot")
      .select("*")
      .eq("user_id", userId)
      .single();

    console.log(
      "[POST /api/riot/matches/sync] riotAccount:",
      riotAccount,
      "error:",
      accountError
    );
    if (accountError || !riotAccount) {
      return NextResponse.json(
        {
          error: "No hay cuenta de Riot vinculada",
          details: accountError?.message,
        },
        { status: 404 }
      );
    }

    if (!riotAccount.puuid) {
      return NextResponse.json(
        { error: "Cuenta de Riot incompleta: falta PUUID" },
        { status: 400 }
      );
    }

    // Validar que el PUUID tenga un formato válido
    // Los PUUIDs de Riot tienen un formato específico
    if (!isValidPuuid(riotAccount.puuid)) {
      console.error(
        "[POST /api/riot/matches/sync] PUUID inválido:",
        riotAccount.puuid
      );
      return NextResponse.json(
        {
          error: "PUUID inválido o corrupto",
          details:
            "Por favor, desvincula tu cuenta de Riot y vuelve a autenticarte",
        },
        { status: 400 }
      );
    }

    // Obtener API Key de Riot
    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) {
      console.error(
        "[POST /api/riot/matches/sync] RIOT_API_KEY no configurada"
      );
      return NextResponse.json(
        { error: "Configuración de servidor incompleta" },
        { status: 500 }
      );
    }

    // Sincronizar partidas
    console.log("[POST /api/riot/matches/sync] Iniciando sincronización...");
    const result = await syncMatchHistory(
      riotAccount.puuid,
      riotAccount.active_shard || "la1",
      apiKey,
      100 // Sincronizar últimas 100 partidas
    );

    console.log(
      "[POST /api/riot/matches/sync] Resultado sincronización:",
      result
    );
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al sincronizar" },
        { status: 500 }
      );
    }

    // Limpiar caché de estadísticas agregadas para forzar recálculo
    try {
      await supabase
        .from("player_stats_cache")
        .delete()
        .eq("user_id", userId)
        .eq("puuid", riotAccount.puuid);
      console.log(
        "[POST /api/riot/matches/sync] player_stats_cache limpiado para usuario",
        userId
      );
    } catch (cacheError) {
      console.warn(
        "[POST /api/riot/matches/sync] No se pudo limpiar player_stats_cache:",
        cacheError
      );
    }

    // Limpiar caché local de historial para forzar recarga de primeras 5 partidas
    try {
      await supabase
        .from("match_history_cache")
        .delete()
        .eq("user_id", userId)
        .eq("puuid", riotAccount.puuid);
      console.log(
        "[POST /api/riot/matches/sync] match_history_cache limpiado para usuario",
        userId
      );
    } catch (cacheError) {
      console.warn(
        "[POST /api/riot/matches/sync] No se pudo limpiar match_history_cache:",
        cacheError
      );
    }

    // Obtener historial actualizado
    console.log(
      "[POST /api/riot/matches/sync] Obteniendo historial actualizado..."
    );
    const matchHistory = await getMatchHistory(riotAccount.puuid, {
      limit: 40,
    });
    const stats = await getPlayerStats(riotAccount.puuid, 40);
    console.log(
      "[POST /api/riot/matches/sync] Historial obtenido, matches:",
      matchHistory?.matches?.length,
      "stats:",
      stats
    );

    return NextResponse.json({
      success: true,
      message: `${result.newMatches} partidas nuevas sincronizadas`,
      newMatches: result.newMatches,
      totalMatches: result.totalMatches,
      matches: matchHistory.matches,
      hasMore: matchHistory.hasMore,
      nextCursor: matchHistory.nextCursor,
      stats,
    });
  } catch (error: any) {
    console.error(
      "[POST /api/riot/matches/sync] Error:",
      error.message || error
    );
    return NextResponse.json(
      {
        error: "Error al sincronizar partidas",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
