import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { getPlayerRanking } from "@/lib/riot/league";

export const dynamic = "force-dynamic";

const RIOT_API_KEY = process.env.RIOT_API_KEY!;
const DEFAULT_PLATFORM_REGION = "la1";
// Tiempo máximo de ejecución seguro (Netlify Functions suele tener 10s por defecto)
const MAX_EXECUTION_TIME_MS = 9000;

interface SyncResult {
  processed: number;
  synced: number;
  failed: number;
  skipped: number;
  message: string;
}

/**
 * GET /api/cron/rank-sync
 * Endpoint para cron-job.org u otros servicios de cron externos.
 * Sincroniza rangos de partidas históricas.
 * Requiere CRON_SECRET en header Authorization o query param ?key=
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];
  const log = (msg: string) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
    console.log(`[Cron RankSync ${timestamp}] ${msg}`);
    logs.push(`[${timestamp}] ${msg}`);
  };

  try {
    // 1. Auth Check
    const authHeader = request.headers.get("authorization") || "";
    const urlKey = request.nextUrl.searchParams.get("key") || "";
    const cronSecret = (process.env.CRON_SECRET || "").trim();

    if (cronSecret) {
      const cleanHeader = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (cleanHeader !== cronSecret && urlKey !== cronSecret) {
        log("Unauthorized attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const serviceClient = getServiceClient();

    // 2. Verificar configuración en BD (respetar el switch del Dashboard)
    const { data: settings } = await serviceClient
      .from("admin_settings")
      .select("value")
      .eq("key", "match_rank_sync")
      .single();

    const config = settings?.value || {
      enabled: false,
      batch_size: 25,
      delay_ms: 500,
    };

    if (!config.enabled) {
      log("Sincronización deshabilitada en configuración. Saltando.");
      return NextResponse.json({
        success: true,
        message: "Disabled in admin settings",
        logs,
      });
    }

    // 3. Obtener conteo de pendientes
    const { data: countResult } = await serviceClient.rpc(
      "count_pending_rank_syncs"
    );
    const pendingCount = countResult || 0;

    if (pendingCount === 0) {
      log("No hay registros pendientes.");
      // Actualizar timestamp de última ejecución exitosa
      await updateLastRun(serviceClient, config, {
        processed: 0,
        synced: 0,
        failed: 0,
        skipped: 0,
        message: "Todo al día",
      });
      return NextResponse.json({
        success: true,
        message: "No pending records",
        logs,
      });
    }

    // 4. Obtener lote de pendientes
    // Usamos batch_size de la config, pero limitado para asegurar ejecución rápida en cron
    const safeLimit = Math.min(config.batch_size || 25, 15);
    const { data: pendingRecords, error: fetchError } = await serviceClient.rpc(
      "get_pending_rank_syncs",
      { p_limit: safeLimit }
    );

    if (fetchError || !pendingRecords) {
      throw new Error(fetchError?.message || "Error fetching records");
    }

    log(
      `Procesando ${pendingRecords.length} registros (Pendientes totales: ${pendingCount})`
    );

    // 5. Procesar registros
    let synced = 0;
    let failed = 0;
    let skipped = 0;
    const delayMs = config.delay_ms || 500;

    for (const record of pendingRecords) {
      // Check timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        log("Tiempo límite alcanzado. Deteniendo proceso.");
        break;
      }

      try {
        if (!record.puuid) {
          await serviceClient
            .from("match_participant_ranks")
            .update({
              sync_status: "skipped",
              sync_error: "Sin PUUID",
              last_rank_sync: new Date().toISOString(),
            })
            .eq("id", record.id);
          skipped++;
          continue;
        }

        // Verificar caché
        const { data: cacheValid } = await serviceClient.rpc(
          "is_player_rank_cache_fresh",
          {
            p_puuid: record.puuid,
            p_queue_type: "RANKED_SOLO_5x5",
            p_ttl_hours: 12,
          }
        );

        let rankings;

        if (cacheValid) {
          // Usar caché
          const { data: cachedRanks } = await serviceClient
            .from("player_rank_cache")
            .select("*")
            .eq("puuid", record.puuid)
            .in("queue_type", ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"]);

          rankings =
            cachedRanks?.map((rank) => ({
              queueType: rank.queue_type,
              tier: rank.tier,
              rank: rank.rank,
              leaguePoints: rank.league_points,
              wins: rank.wins,
              losses: rank.losses,
              summonerId: record.summoner_id,
            })) || [];
        } else {
          // Consultar Riot API
          rankings = await getPlayerRanking(
            record.puuid,
            DEFAULT_PLATFORM_REGION,
            RIOT_API_KEY
          );

          // Actualizar caché
          for (const ranking of rankings) {
            await serviceClient
              .from("player_rank_cache")
              .upsert({
                puuid: record.puuid,
                queue_type: ranking.queueType,
                tier: ranking.tier,
                rank: ranking.rank,
                league_points: ranking.leaguePoints,
                wins: ranking.wins,
                losses: ranking.losses,
                last_synced_at: new Date().toISOString(),
              })
              .eq("puuid", record.puuid)
              .eq("queue_type", ranking.queueType);
          }
        }

        // Determinar ranks
        const soloQRanking = rankings.find(
          (r) => r.queueType === "RANKED_SOLO_5x5"
        );
        const flexRanking = rankings.find(
          (r) => r.queueType === "RANKED_FLEX_SR"
        );

        if (!soloQRanking && !flexRanking) {
          // Unranked
          await serviceClient
            .from("match_participant_ranks")
            .update({
              sync_status: "synced",
              sync_error: null,
              last_rank_sync: new Date().toISOString(),
            })
            .eq("id", record.id);
          synced++;
        } else {
          // Ranked check
          const updatePayload: any = {
            sync_status: "synced",
            sync_error: null,
            last_rank_sync: new Date().toISOString(),
          };

          if (soloQRanking) {
            Object.assign(updatePayload, {
              tier: soloQRanking.tier,
              rank: soloQRanking.rank,
              league_points: soloQRanking.leaguePoints,
              wins: soloQRanking.wins,
              losses: soloQRanking.losses,
              solo_tier: soloQRanking.tier,
              solo_rank: soloQRanking.rank,
              solo_league_points: soloQRanking.leaguePoints,
              solo_wins: soloQRanking.wins,
              solo_losses: soloQRanking.losses,
            });
          }

          if (flexRanking) {
            Object.assign(updatePayload, {
              flex_tier: flexRanking.tier,
              flex_rank: flexRanking.rank,
              flex_league_points: flexRanking.leaguePoints,
              flex_wins: flexRanking.wins,
              flex_losses: flexRanking.losses,
            });
          }

          await serviceClient
            .from("match_participant_ranks")
            .update(updatePayload)
            .eq("id", record.id);
          synced++;
        }

        // Delay
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } catch (error: any) {
        log(`Error procesando ${record.id}: ${error.message}`);
        await serviceClient
          .from("match_participant_ranks")
          .update({
            sync_status: "failed",
            sync_error: error.message || "Unknown error",
            last_rank_sync: new Date().toISOString(),
          })
          .eq("id", record.id);
        failed++;
      }
    }

    const result = {
      processed: synced + failed + skipped,
      synced,
      failed,
      skipped,
      message: `Cron ejecutado: ${synced} OK, ${failed} Error, ${skipped} Skipped`,
    };

    log(result.message);

    // Actualizar stats en admin_settings
    await updateLastRun(serviceClient, config, result);

    return NextResponse.json({
      success: true,
      result,
      logs,
    });
  } catch (error: any) {
    log(`Critical Error: ${error.message}`);
    return NextResponse.json({ error: error.message, logs }, { status: 500 });
  }
}

async function updateLastRun(
  client: any,
  currentConfig: any,
  result: SyncResult
) {
  await client
    .from("admin_settings")
    .update({
      value: {
        ...currentConfig,
        last_run: new Date().toISOString(),
        last_result: result,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("key", "match_rank_sync");
}
