import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Endpoint público para verificar el estado de un usuario.
 * No requiere autenticación - cualquiera puede consultar el estado de un usuario.
 *
 * Lógica:
 * 1. Primero consulta el estado guardado en perfiles.status (actualizado por sesión activa)
 * 2. Si el estado es "in-game", verifica con Riot Spectator API para confirmar
 * 3. Si el estado es "online", retorna "online" directamente
 * 4. Si no hay sesión activa o el estado es "offline", retorna "offline"
 *
 * Query params:
 * - userId: ID del usuario a consultar
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const RIOT_API_KEY = process.env.RIOT_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    // Obtener userId del query param
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // PASO 1: Consultar el estado guardado en la tabla perfiles
    const { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select("status")
      .eq("id", userId)
      .single();

    if (perfilError) {
      console.warn(
        "[GET /api/riot/matches/active/public] Error fetching profile status:",
        perfilError
      );
    }

    const dbStatus = perfil?.status as "online" | "in-game" | "offline" | null;

    console.log(
      "[GET /api/riot/matches/active/public] Profile status from DB:",
      {
        userId: userId.substring(0, 8) + "...",
        dbStatus,
      }
    );

    // PASO 2: Si el estado en BD es "online", retornar directamente sin consultar Riot
    if (dbStatus === "online") {
      return NextResponse.json(
        { status: "online", reason: "User has active session" },
        { status: 200 }
      );
    }

    // PASO 3: Si el estado en BD es "in-game", confiar en él (se actualiza cada 10s por el hook)
    // Solo verificar con Riot si NO hay estado en BD (caso de compatibilidad)
    if (dbStatus === "in-game") {
      // Confiar en el estado de BD - el hook del usuario lo mantiene actualizado
      return NextResponse.json(
        {
          status: "in-game",
          reason: "User has active game (from database)",
        },
        { status: 200 }
      );
    }

    // PASO 4: Si no hay estado en BD, verificar con Riot (solo para compatibilidad)
    if (!dbStatus) {
      // Verificar si tiene cuenta Riot vinculada
      const { data: riotAccount, error: riotError } = await supabase
        .from("linked_accounts_riot")
        .select("puuid, active_shard, summoner_id")
        .eq("user_id", userId)
        .single();

      if (riotError || !riotAccount || !riotAccount.puuid) {
        // No tiene cuenta Riot - retornar offline
        return NextResponse.json(
          { status: "offline", reason: "No linked Riot account" },
          { status: 200 }
        );
      }

      // Tiene cuenta Riot, verificar partida activa solo si no hay estado
      if (!RIOT_API_KEY) {
        // Sin API key de Riot, retornar offline
        return NextResponse.json(
          {
            status: "offline",
            reason: "RIOT_API_KEY not configured",
          },
          { status: 200 }
        );
      }

      const platformRegion = (riotAccount.active_shard || "la1").toLowerCase();
      const spectatorUrl = `https://${platformRegion}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${riotAccount.puuid}`;

      console.log(
        "[GET /api/riot/matches/active/public] Checking active match (no DB status):",
        {
          userId: userId.substring(0, 8) + "...",
          puuid: riotAccount.puuid?.substring(0, 8) + "...",
          platformRegion,
        }
      );

      const spectatorResponse = await fetch(spectatorUrl, {
        method: "GET",
        headers: {
          "X-Riot-Token": RIOT_API_KEY,
        },
        cache: "no-store",
      });

      console.log(
        "[GET /api/riot/matches/active/public] Spectator response status:",
        spectatorResponse.status
      );

      // 404 = no está en partida activa
      if (spectatorResponse.status === 404) {
        return NextResponse.json(
          { status: "offline", reason: "No active game" },
          { status: 200 }
        );
      }

      // 200 = en partida
      if (spectatorResponse.status === 200) {
        const data = await spectatorResponse.json().catch(() => null);

        console.log(
          "[GET /api/riot/matches/active/public] ACTIVE GAME DETECTED:",
          {
            gameId: data?.gameId,
            gameLength: data?.gameLength,
          }
        );

        return NextResponse.json(
          {
            status: "in-game",
            reason: "Active game detected",
            gameId: data?.gameId ?? null,
            gameStartTime: data?.gameStartTime ?? null,
            gameLength: data?.gameLength ?? null,
            queueId: data?.gameQueueConfigId ?? null,
          },
          { status: 200 }
        );
      }

      // Otros errores de Riot - retornar offline
      return NextResponse.json(
        {
          status: "offline",
          reason: "Riot API error",
        },
        { status: 200 }
      );
    }

    // PASO 5: Estado es "offline" o null - retornar offline
    return NextResponse.json(
      {
        status: "offline",
        reason: dbStatus ? "User offline" : "No status set",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[GET /api/riot/matches/active/public] Unexpected error:",
      error
    );
    return NextResponse.json(
      { status: "offline", reason: "Internal error" },
      { status: 200 }
    );
  }
}
