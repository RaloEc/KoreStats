import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/riot/champion-mastery
 *
 * Obtiene los top 3 campeones con más maestría del usuario
 * Requiere headers: x-user-id, x-puuid
 *
 * Respuesta:
 * - 200: Array con top 3 campeones
 * - 401: Usuario no autenticado
 * - 500: Error interno del servidor
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[GET /api/riot/champion-mastery] Iniciando...");

    // Obtener userId del header (para perfiles públicos) o de la sesión
    const headerUserId = request.headers.get("x-user-id");

    // Si hay x-user-id en el header, es una consulta pública
    // Si no, requiere autenticación
    let targetUserId: string;

    if (headerUserId) {
      // Consulta pública - no requiere autenticación
      targetUserId = headerUserId;
      console.log(
        "[GET /api/riot/champion-mastery] Consulta pública para userId:",
        targetUserId
      );
    } else {
      // Consulta propia - requiere autenticación
      const supabase = await createClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user?.id) {
        console.error(
          "[GET /api/riot/champion-mastery] Usuario no autenticado:",
          sessionError
        );
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }

      targetUserId = session.user.id;
      console.log(
        "[GET /api/riot/champion-mastery] Consulta autenticada para userId:",
        targetUserId
      );
    }

    // Obtener puuid del header
    const puuid = request.headers.get("x-puuid");
    if (!puuid) {
      console.error("[GET /api/riot/champion-mastery] PUUID no proporcionado");
      return NextResponse.json({ error: "PUUID requerido" }, { status: 400 });
    }

    console.log("[GET /api/riot/champion-mastery] PUUID:", puuid);

    // Crear cliente de Supabase
    // Para consultas públicas, usar service role para bypassear RLS
    const supabase = headerUserId
      ? await (async () => {
          const { createClient } = await import("@supabase/supabase-js");
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
          return createClient(supabaseUrl, supabaseServiceKey);
        })()
      : await createClient();

    // Obtener cuenta de Riot para el region/shard
    const { data: riotAccount, error: accountError } = await supabase
      .from("linked_accounts_riot")
      .select("active_shard")
      .eq("user_id", targetUserId)
      .single();

    if (accountError || !riotAccount) {
      console.error(
        "[GET /api/riot/champion-mastery] Error obteniendo cuenta:",
        accountError
      );
      return NextResponse.json(
        { error: "No hay cuenta de Riot vinculada" },
        { status: 404 }
      );
    }

    const region = riotAccount.active_shard || "la1";
    const apiKey = process.env.RIOT_API_KEY;

    if (!apiKey) {
      console.error(
        "[GET /api/riot/champion-mastery] RIOT_API_KEY no configurada"
      );
      return NextResponse.json(
        { error: "Configuración de servidor incompleta" },
        { status: 500 }
      );
    }

    // Primero intentar obtener del caché
    const { data: cachedMasteries, error: cacheError } = await supabase
      .from("champion_mastery_cache")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("puuid", puuid)
      .gt("expires_at", new Date().toISOString())
      .order("rank_position", { ascending: true })
      .limit(3);

    if (!cacheError && cachedMasteries && cachedMasteries.length > 0) {
      console.log(
        "[GET /api/riot/champion-mastery] ✅ Datos obtenidos del caché:",
        cachedMasteries.length,
        "campeones"
      );

      // Convertir formato de caché al formato de Riot API
      const formattedMasteries = cachedMasteries.map((cache) => ({
        championId: cache.champion_id,
        championLevel: cache.mastery_level,
        championPoints: cache.mastery_points,
        lastPlayTime: cache.last_play_time,
      }));

      return NextResponse.json(
        {
          success: true,
          masteries: formattedMasteries,
          source: "cache",
        },
        { status: 200 }
      );
    }

    // Si no hay caché válido, obtener de Riot API
    const riotApiUrl = `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=3`;

    console.log(
      "[GET /api/riot/champion-mastery] Fetching from Riot API:",
      riotApiUrl
    );

    // Hacer request a Riot API
    const response = await fetch(riotApiUrl, {
      headers: {
        "X-Riot-Token": apiKey,
      },
    });

    if (!response.ok) {
      console.error(
        "[GET /api/riot/champion-mastery] Error from Riot API:",
        response.status,
        await response.text()
      );
      return NextResponse.json(
        { error: "Error al obtener datos de Riot API" },
        { status: response.status }
      );
    }

    const masteryData = await response.json();
    console.log(
      "[GET /api/riot/champion-mastery] ✅ Datos obtenidos de Riot API:",
      masteryData.length,
      "campeones"
    );

    // Cachear los datos en BD (sin esperar)
    const cacheInserts = masteryData.map((mastery: any, index: number) => ({
      user_id: targetUserId,
      puuid,
      champion_id: mastery.championId,
      mastery_level: mastery.championLevel,
      mastery_points: mastery.championPoints,
      last_play_time: mastery.lastPlayTime,
      rank_position: index + 1,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
    }));

    // Insertar en caché sin bloquear la respuesta (fire and forget)
    (async () => {
      try {
        await supabase
          .from("champion_mastery_cache")
          .upsert(cacheInserts, { onConflict: "user_id,puuid,champion_id" });
        console.log(
          "[GET /api/riot/champion-mastery] ✅ Caché actualizado:",
          cacheInserts.length,
          "registros"
        );
      } catch (err) {
        console.error(
          "[GET /api/riot/champion-mastery] Error cacheando datos:",
          err
        );
      }
    })();

    return NextResponse.json(
      {
        success: true,
        masteries: masteryData,
        source: "riot-api",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[GET /api/riot/champion-mastery] Error inesperado:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
