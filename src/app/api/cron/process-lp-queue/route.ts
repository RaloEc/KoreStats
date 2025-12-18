import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Máximo 60 segundos para Vercel

const BATCH_SIZE = 50; // Procesar 50 peticiones por ejecución
const DELAY_BETWEEN_REQUESTS_MS = 50; // Reducir delay

/**
 * GET /api/cron/process-lp-queue
 *
 * Worker que procesa la cola de trabajos de LP tracking
 * Se ejecuta cada minuto vía Vercel Cron
 *
 * Autenticación: Requiere CRON_SECRET en header Authorization
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación de cron (excepto en desarrollo local)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isDevelopment = process.env.NODE_ENV === "development";
    const isLocalhost = request.headers.get("host")?.includes("localhost");

    // Permitir ejecución sin auth en desarrollo local
    if (!isDevelopment || !isLocalhost) {
      if (!cronSecret) {
        console.error("[process-lp-queue] CRON_SECRET not configured");
        return NextResponse.json(
          { error: "Cron secret not configured" },
          { status: 500 }
        );
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn("[process-lp-queue] Unauthorized cron request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      console.log(
        "[process-lp-queue] 🔓 Development mode - skipping auth check"
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const RIOT_API_KEY = process.env.RIOT_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey || !RIOT_API_KEY) {
      console.error("[process-lp-queue] Missing environment variables");
      return NextResponse.json(
        { error: "Configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[process-lp-queue] Starting queue processing...");
    console.log("[process-lp-queue] Supabase URL:", supabaseUrl); // Debug

    // Obtener trabajos pendientes ordenados por prioridad
    const { data: jobs, error: fetchError } = await supabase
      .from("lp_tracking_queue")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("[process-lp-queue] Error fetching jobs:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch jobs", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!jobs || jobs.length === 0) {
      console.log("[process-lp-queue] No pending jobs found in DB");
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No pending jobs",
      });
    }

    console.log(
      `[process-lp-queue] Found ${jobs.length} pending jobs. IDs:`,
      jobs.map((j) => j.id)
    );

    // Marcar trabajos como procesando
    const jobIds = jobs.map((j) => j.id);
    console.log("[process-lp-queue] Marking jobs as processing...", jobIds);

    const { error: updateError } = await supabase
      .from("lp_tracking_queue")
      .update({ status: "processing" })
      .in("id", jobIds);

    if (updateError) {
      console.error(
        "[process-lp-queue] Error marking jobs as processing:",
        updateError
      );
    }

    let successCount = 0;
    let failCount = 0;

    // Procesar cada trabajo
    for (const job of jobs) {
      try {
        console.log(`[process-lp-queue] Processing job ${job.id}:`, {
          action: job.action,
          priority: job.priority,
          gameId: job.game_id,
        });

        let result: any = null;
        let success = false;

        if (job.action === "check_active") {
          // Consultar Spectator API
          const spectatorUrl = `https://${job.platform_region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${job.puuid}`;

          const response = await fetch(spectatorUrl, {
            headers: { "X-Riot-Token": RIOT_API_KEY },
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
          // Consultar League-V4 para obtener LP
          const leagueUrl = `https://${job.platform_region}.api.riotgames.com/lol/league/v4/entries/by-puuid/${job.puuid}`;

          const response = await fetch(leagueUrl, {
            headers: { "X-Riot-Token": RIOT_API_KEY },
          });

          if (response.status === 429) {
            // Rate limit - no marcar como fallido, reintentar después
            console.warn(`[process-lp-queue] Rate limited for job ${job.id}`);

            await supabase
              .from("lp_tracking_queue")
              .update({
                status: "pending", // Volver a pending para reintentar
                retry_count: job.retry_count + 1,
              })
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
              // Guardar snapshot
              const { error: snapshotError } = await supabase
                .from("lp_snapshots")
                .insert({
                  user_id: job.user_id,
                  puuid: job.puuid,
                  game_id: job.game_id,
                  snapshot_type:
                    job.action === "snapshot_lp_start"
                      ? "pre_game"
                      : "post_game",
                  tier: soloQ.tier,
                  rank: soloQ.rank,
                  league_points: soloQ.leaguePoints,
                  wins: soloQ.wins,
                  losses: soloQ.losses,
                  queue_type: "RANKED_SOLO_5x5",
                });

              if (snapshotError) {
                console.error(
                  `[process-lp-queue] Error saving snapshot for job ${job.id}:`,
                  snapshotError
                );
                result = { error: snapshotError.message };
                success = false;
              } else {
                result = {
                  success: true,
                  lp: soloQ.leaguePoints,
                  tier: soloQ.tier,
                  rank: soloQ.rank,
                };
                success = true;
              }
            } else {
              result = { error: "No SoloQ ranking found" };
              success = false;
            }
          } else {
            result = { error: `Riot API error: ${response.status}` };
            success = false;
          }
        }

        // Actualizar estado del trabajo
        if (success) {
          await supabase
            .from("lp_tracking_queue")
            .update({
              status: "completed",
              processed_at: new Date().toISOString(),
              result,
            })
            .eq("id", job.id);

          successCount++;
          console.log(
            `[process-lp-queue] ✅ Job ${job.id} completed successfully`
          );
        } else {
          await supabase
            .from("lp_tracking_queue")
            .update({
              status: "failed",
              processed_at: new Date().toISOString(),
              result,
              error_message: result?.error || "Unknown error",
            })
            .eq("id", job.id);

          failCount++;
          console.log(
            `[process-lp-queue] ❌ Job ${job.id} failed:`,
            result?.error
          );
        }

        // Delay para respetar rate limit (15 req/s = ~67ms entre requests)
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS)
        );
      } catch (error: any) {
        console.error(
          `[process-lp-queue] Error processing job ${job.id}:`,
          error
        );

        // Marcar como fallido
        await supabase
          .from("lp_tracking_queue")
          .update({
            status: "failed",
            processed_at: new Date().toISOString(),
            result: { error: error.message },
            error_message: error.message,
          })
          .eq("id", job.id);

        failCount++;
      }
    }

    console.log("[process-lp-queue] Batch processing completed:", {
      total: jobs.length,
      success: successCount,
      failed: failCount,
    });

    return NextResponse.json({
      success: true,
      processed: jobs.length,
      succeeded: successCount,
      failed: failCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[process-lp-queue] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
