import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/utils/supabase-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/check-active-matches
 *
 * Cron que verifica:
 * 1. Partidas que estaban activas ("pre_game" snapshot) y ya terminaron -> Encola "post_game".
 * 2. Usuarios aleatorios para detectar inicio de partida automática -> Encola "pre_game".
 *
 * Se ejecuta cada minuto (via Vercel Cron).
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verificación de seguridad Cron (Bearer CRON_SECRET)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Permitir ejecución local para desarrollo
      const isLocal = request.headers.get("host")?.includes("localhost");
      if (!isLocal) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const supabase = getServiceClient();
    const RIOT_API_KEY = process.env.RIOT_API_KEY;

    if (!RIOT_API_KEY) {
      console.error("[check-active-matches] RIOT_API_KEY missing");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const log = [];

    // ==========================================
    // PARTE A: Detectar fin de partidas (games ended)
    // ==========================================
    const now = new Date();
    const threeHoursAgo = new Date(
      now.getTime() - 3 * 60 * 60 * 1000
    ).toISOString();
    const fifteenMinsAgo = new Date(
      now.getTime() - 15 * 60 * 1000
    ).toISOString();

    // 1. Obtener candidatos (partidas iniciadas)
    const { data: openMatches, error: matchError } = await supabase
      .from("lp_snapshots")
      .select("game_id, user_id, created_at")
      .eq("snapshot_type", "pre_game")
      .gt("created_at", threeHoursAgo)
      .lt("created_at", fifteenMinsAgo);

    if (matchError) {
      console.error(
        "[check-active-matches] Error fetching open matches:",
        matchError
      );
    } else if (openMatches && openMatches.length > 0) {
      log.push(`Found ${openMatches.length} pre_game snapshots`);

      // 2. Filtrar los que ya tienen post_game
      const gameIds = openMatches.map((m) => m.game_id);
      const { data: closedMatches } = await supabase
        .from("lp_snapshots")
        .select("game_id")
        .eq("snapshot_type", "post_game")
        .in("game_id", gameIds);

      const closedGameIds = new Set(closedMatches?.map((m) => m.game_id));
      const candidates = openMatches.filter(
        (m) => !closedGameIds.has(m.game_id)
      );

      log.push(`${candidates.length} matches are potentially active`);

      if (candidates.length > 0) {
        // 3. Obtener cuentas de Riot (para tener PUUID y Region)
        const userIds = Array.from(new Set(candidates.map((c) => c.user_id)));
        const { data: accounts } = await supabase
          .from("linked_accounts_riot")
          .select("user_id, puuid, active_shard")
          .in("user_id", userIds);

        const accountMap = new Map(accounts?.map((a) => [a.user_id, a]));

        for (const match of candidates) {
          const account = accountMap.get(match.user_id);
          if (!account || !account.puuid) continue;

          const region = account.active_shard || "la1";
          const puuid = account.puuid;

          const spectatorUrl = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`;

          try {
            const res = await fetch(spectatorUrl, {
              headers: { "X-Riot-Token": RIOT_API_KEY },
              next: { revalidate: 0 },
            });

            if (res.status === 404) {
              // 404 = Ya no está en partida -> TERMINÓ
              log.push(
                `Game ${match.game_id} ended for user ${match.user_id}. Queuing post_game.`
              );

              await supabase.from("lp_tracking_queue").insert({
                user_id: match.user_id,
                puuid: puuid,
                platform_region: region,
                game_id: match.game_id,
                action: "snapshot_lp_end",
                priority: 2,
                status: "pending",
              });
            }
          } catch (err) {
            console.error(`Error checking spectator for ${puuid}:`, err);
          }
        }
      }
    }

    // ==========================================
    // PARTE B: Detectar inicio de partidas (auto-start)
    // ==========================================
    const { data: usersToCheck } = await supabase
      .from("linked_accounts_riot")
      .select("user_id, puuid, active_shard")
      .not("puuid", "is", null)
      .limit(15);

    if (usersToCheck && usersToCheck.length > 0) {
      log.push(`Checking ${usersToCheck.length} users for new games`);

      for (const user of usersToCheck) {
        const region = user.active_shard || "la1";
        const spectatorUrl = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${user.puuid}`;

        try {
          const res = await fetch(spectatorUrl, {
            headers: { "X-Riot-Token": RIOT_API_KEY },
            next: { revalidate: 0 },
          });

          if (res.status === 200) {
            const gameData = await res.json();
            const gameId = gameData.gameId;

            if (gameId) {
              const { data: existingPre } = await supabase
                .from("lp_snapshots")
                .select("id")
                .eq("user_id", user.user_id)
                .eq("game_id", gameId)
                .eq("snapshot_type", "pre_game")
                .single();

              if (!existingPre) {
                const { data: existingJob } = await supabase
                  .from("lp_tracking_queue")
                  .select("id")
                  .eq("user_id", user.user_id)
                  .eq("game_id", gameId)
                  .eq("action", "snapshot_lp_start")
                  .in("status", ["pending", "processing"])
                  .single();

                if (!existingJob) {
                  log.push(
                    `New game ${gameId} detected for user ${user.user_id}. Queuing pre_game.`
                  );
                  await supabase.from("lp_tracking_queue").insert({
                    user_id: user.user_id,
                    puuid: user.puuid,
                    platform_region: region,
                    game_id: gameId,
                    action: "snapshot_lp_start",
                    priority: 1,
                    status: "pending",
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error(`Error checking new game for ${user.puuid}:`, err);
        }
      }
    }

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    console.error("[check-active-matches] Critical error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
