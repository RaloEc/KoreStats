import { createClient } from "@supabase/supabase-js";
import { syncMatchHistory } from "@/lib/riot/matches";
import { SupabaseClient } from "@supabase/supabase-js";

const BATCH_SIZE = 20; // Procesar 20 peticiones por ejecución si se llama desde otro cron
const DELAY_BETWEEN_REQUESTS_MS = 100;

export async function processLpQueue(
  supabaseUrl: string,
  supabaseServiceKey: string,
  riotApiKey: string,
  batchSize: number = BATCH_SIZE
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log("[QueueProcessor] Starting LP queue processing...");

  // Obtener trabajos pendientes
  const { data: jobs, error: fetchError } = await supabase
    .from("lp_tracking_queue")
    .select("*")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (fetchError) {
    console.error("[QueueProcessor] Error fetching jobs:", fetchError);
    return { processed: 0, error: fetchError, successCount: 0, failCount: 0 };
  }

  if (!jobs || jobs.length === 0) {
    console.log("[QueueProcessor] No pending jobs found");
    return { processed: 0, successCount: 0, failCount: 0 };
  }

  // Marcar como processing
  const jobIds = jobs.map((j) => j.id);
  await supabase
    .from("lp_tracking_queue")
    .update({ status: "processing" })
    .in("id", jobIds);

  let successCount = 0;
  let failCount = 0;

  for (const job of jobs) {
    try {
      let result: any = null;
      let success = false;

      // Lógica de procesamiento
      if (job.action === "check_active") {
        const region = job.platform_region || "la1";
        const spectatorUrl = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${job.puuid}`;
        const response = await fetch(spectatorUrl, {
          headers: { "X-Riot-Token": riotApiKey },
        });
        result = {
          hasActiveMatch: response.status === 200,
          status: response.status,
          data: response.status === 200 ? await response.json() : null,
        };
        success = true;
      } else if (
        job.action === "snapshot_lp_start" ||
        job.action === "snapshot_lp_end"
      ) {
        const region = job.platform_region || "la1";
        const leagueUrl = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-puuid/${job.puuid}`;

        const response = await fetch(leagueUrl, {
          headers: { "X-Riot-Token": riotApiKey },
        });

        if (response.status === 429) {
          console.warn(`[QueueProcessor] Rate limited for job ${job.id}`);
          await supabase
            .from("lp_tracking_queue")
            .update({ status: "pending", retry_count: job.retry_count + 1 })
            .eq("id", job.id);
          failCount++;
          continue;
        }

        if (response.ok) {
          const rankings = await response.json();
          const soloQ = rankings.find(
            (r: any) => r.queueType === "RANKED_SOLO_5x5"
          );
          if (soloQ) {
            const { error: snapshotError } = await supabase
              .from("lp_snapshots")
              .insert({
                user_id: job.user_id,
                puuid: job.puuid,
                game_id: job.game_id,
                snapshot_type:
                  job.action === "snapshot_lp_start" ? "pre_game" : "post_game",
                tier: soloQ.tier,
                rank: soloQ.rank,
                league_points: soloQ.leaguePoints,
                wins: soloQ.wins,
                losses: soloQ.losses,
                queue_type: "RANKED_SOLO_5x5",
              });

            if (snapshotError) {
              result = { error: snapshotError.message };
              success = false;
            } else {
              success = true;
              // Trigger sync if end match
              if (job.action === "snapshot_lp_end") {
                console.log(
                  `[QueueProcessor] Syncing matches for job ${job.id}...`
                );
                try {
                  const syncRes = await syncMatchHistory(
                    job.puuid,
                    region,
                    riotApiKey,
                    20
                  );
                  console.log(
                    `[QueueProcessor] Sync result: success=${syncRes.success}, new=${syncRes.newMatches}`
                  );
                } catch (e) {
                  console.error("[QueueProcessor] Sync error (non-fatal):", e);
                }
              }
            }
          } else {
            result = { error: "No SoloQ ranking found" };
            // Consider success false but maybe we should mark as completed to avoid loop?
            // Marking as failed for now so we can inspect
            success = false;
          }
        } else {
          result = { error: `Riot API error: ${response.status}` };
          success = false;
        }
      }

      // Actualizar estado final
      const status = success ? "completed" : "failed";
      await supabase
        .from("lp_tracking_queue")
        .update({
          status,
          processed_at: new Date().toISOString(),
          result,
          error_message: !success ? result?.error || "Unknown error" : null,
        })
        .eq("id", job.id);

      if (success) successCount++;
      else failCount++;

      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
    } catch (err: any) {
      console.error(`[QueueProcessor] Job ${job.id} exception:`, err);
      await supabase
        .from("lp_tracking_queue")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
          result: { error: err.message },
          error_message: err.message,
        })
        .eq("id", job.id);
      failCount++;
    }
  }

  return { processed: jobs.length, successCount, failCount };
}
