import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { syncMatchHistory } from "@/lib/riot/matches";
import { processLpQueue } from "@/lib/riot/queue-processor";

export const dynamic = "force-dynamic";

// Tiempo máximo de ejecución seguro para Vercel Hobby (10s)
const MAX_EXECUTION_TIME_MS = 9000;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];
  const log = (msg: string) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
    console.log(`[Cron ${timestamp}] ${msg}`);
    logs.push(`[${timestamp}] ${msg}`);
  };

  try {
    // 1. Auth Check
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Si hay CRON_SECRET configurado, exigimos el header
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      log("Unauthorized: Invalid/Missing Token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceClient();
    const RIOT_API_KEY = process.env.RIOT_API_KEY;

    if (!RIOT_API_KEY) {
      log("Error: RIOT_API_KEY missing");
      return NextResponse.json({ error: "Config missing" }, { status: 500 });
    }

    // =========================================================================
    // FASE 1: Verificar usuarios "En Partida" (Active Games)
    // =========================================================================
    const { data: activeUsers, error: activeError } = await supabase
      .from("linked_accounts_riot")
      .select("user_id, puuid, active_shard, last_known_game_id")
      .eq("is_in_game", true)
      .limit(30); // Límite seguro

    let activeProcessed = 0;
    let gamesEnded = 0;

    if (activeUsers && activeUsers.length > 0) {
      log(`Checking ${activeUsers.length} active users...`);

      for (const user of activeUsers) {
        if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
          log("Timeout warning during Active Check");
          break;
        }

        const region = (user.active_shard || "la1").toLowerCase();
        // Spectator V5
        const url = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${user.puuid}`;

        try {
          const res = await fetch(url, {
            headers: { "X-Riot-Token": RIOT_API_KEY },
            cache: "no-store",
            next: { revalidate: 0 },
          });

          // 404 = Partida terminada
          if (res.status === 404) {
            log(`User ${user.user_id}: Game Ended (404).`);
            gamesEnded++;

            // 1. Actualizar estado DB
            await supabase
              .from("linked_accounts_riot")
              .update({
                is_in_game: false,
                last_known_game_id: null,
                last_active_check: new Date().toISOString(),
              })
              .eq("user_id", user.user_id);

            // 2. Encolar LP Snapshot (Esto dispara el syncMatchHistory en el worker)
            if (user.last_known_game_id) {
              log(
                `Queueing LP Snapshot (End) for game ${user.last_known_game_id}`
              );
              await supabase.from("lp_tracking_queue").insert({
                user_id: user.user_id,
                puuid: user.puuid,
                platform_region: region,
                priority: 2, // Alta
                action: "snapshot_lp_end",
                game_id: user.last_known_game_id,
                status: "pending",
              });
            } else {
              // Si no tenemos ID de partida, igual intentamos sincronizar
              log(`No active game ID, forcing sync immediately.`);
              syncMatchHistory(user.puuid, region, RIOT_API_KEY, 10).catch(
                (e) => log(`Sync fail: ${e}`)
              );
            }
          } else if (res.status === 200) {
            // Sigue en partida
            // log(`User ${user.user_id}: Still in game.`); // Verbose
            await supabase
              .from("linked_accounts_riot")
              .update({ last_active_check: new Date().toISOString() })
              .eq("user_id", user.user_id);
          } else {
            log(`User ${user.user_id}: Riot Error ${res.status}`);
          }
        } catch (err: any) {
          log(`User ${user.user_id}: Error ${err.message}`);
        }
        activeProcessed++;
      }
    }

    // =========================================================================
    // FASE 2: Sincronización Pasiva (Usuarios desconectados/offline)
    // =========================================================================
    let passiveProcessed = 0;
    if (Date.now() - startTime < MAX_EXECUTION_TIME_MS) {
      // Sincronizar un par de usuarios que no estén en juego, para asegurar historial al día
      const limit = 3;
      const { data: passiveUsers } = await supabase
        .from("linked_accounts_riot")
        .select("user_id, puuid, active_shard")
        .eq("is_in_game", false)
        .order("last_updated", { ascending: true, nullsFirst: true })
        .limit(limit);

      if (passiveUsers) {
        log(`Passive check for ${passiveUsers.length} users...`);
        for (const user of passiveUsers) {
          if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) break;

          const region = (user.active_shard || "la1").toLowerCase();

          // 1. Check proactivo de Spectator (Detectar inicio de partida sin abrir app)
          const spectatorUrl = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${user.puuid}`;

          try {
            const specRes = await fetch(spectatorUrl, {
              headers: { "X-Riot-Token": RIOT_API_KEY },
              cache: "no-store",
              next: { revalidate: 0 },
            });

            if (specRes.status === 200) {
              // ¡Usuario offline detectado en partida!
              const gameData = await specRes.json();
              const gameId = gameData.gameId;

              log(
                `User ${user.user_id}: Found Active Game ${gameId} (Offline Start)`
              );

              // Actualizar estado a "In Game"
              await supabase
                .from("linked_accounts_riot")
                .update({
                  is_in_game: true,
                  last_known_game_id: gameId,
                  last_active_check: new Date().toISOString(),
                })
                .eq("user_id", user.user_id);

              // Encolar Snapshot Pre-Game (LP Antes)
              // Importante: Al estar en partida, el LP actual de League-V4 sigue siendo el "Pre-Game"
              await supabase.from("lp_tracking_queue").insert({
                user_id: user.user_id,
                puuid: user.puuid,
                platform_region: region,
                priority: 1,
                action: "snapshot_lp_start",
                game_id: gameId,
                status: "pending",
              });

              passiveProcessed++;
              continue; // Ya no sincronizamos historial, nos enfocamos en el live tracking
            }
          } catch (specErr) {
            log(`Spectator check failed for ${user.user_id}: ${specErr}`);
          }

          // 2. Si no está en partida, sincronizamos historial normal
          try {
            await syncMatchHistory(user.puuid, region, RIOT_API_KEY, 10);
            await supabase
              .from("linked_accounts_riot")
              .update({ last_updated: new Date().toISOString() })
              .eq("user_id", user.user_id);
            passiveProcessed++;
          } catch (e) {
            log(`Passive sync error: ${e}`);
          }
        }
      }
    }

    // =========================================================================
    // FASE 3: Procesar Cola LP (Queue Processor)
    // =========================================================================
    let queueStats = { processed: 0, successCount: 0, failCount: 0 };
    if (Date.now() - startTime < MAX_EXECUTION_TIME_MS) {
      log("Processing LP/Sync Queue...");
      queueStats = await processLpQueue(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        RIOT_API_KEY,
        10 // Lote pequeño
      );
    }

    const duration = Date.now() - startTime;
    log(
      `Finished in ${duration}ms. Ended: ${gamesEnded}. Queue: ${queueStats.processed}`
    );

    return NextResponse.json({
      success: true,
      activeProcessed,
      gamesEnded,
      passiveProcessed,
      queueStats,
      logs,
    });
  } catch (error: any) {
    log(`Critical Error: ${error.message}`);
    return NextResponse.json({ error: error.message, logs }, { status: 500 });
  }
}
