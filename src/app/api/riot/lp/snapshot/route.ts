import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * POST /api/riot/lp/snapshot
 *
 * Encola un snapshot de LP para ser procesado por el worker
 * Se llama cuando se detecta inicio o fin de partida
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener el token de autorización
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // Verificar el token y obtener el usuario
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obtener datos del body
    const body = await request.json();
    const { type, gameId, priority } = body;

    // Validar tipo
    if (!type || !["pre_game", "post_game", "manual"].includes(type)) {
      return NextResponse.json(
        {
          error:
            "Invalid snapshot type. Must be: pre_game, post_game, or manual",
        },
        { status: 400 }
      );
    }

    // Obtener cuenta de Riot del usuario
    const { data: riotAccount, error: riotError } = await supabase
      .from("linked_accounts_riot")
      .select("puuid, active_shard")
      .eq("user_id", user.id)
      .single();

    if (riotError || !riotAccount) {
      return NextResponse.json(
        { error: "No linked Riot account found" },
        { status: 404 }
      );
    }

    if (!riotAccount.puuid) {
      return NextResponse.json(
        { error: "Missing PUUID in Riot account" },
        { status: 400 }
      );
    }

    // Determinar acción según tipo
    let action: string;
    let jobPriority: number;

    switch (type) {
      case "pre_game":
        action = "snapshot_lp_start";
        jobPriority = priority ?? 1; // Alta prioridad
        break;
      case "post_game":
        action = "snapshot_lp_end";
        jobPriority = priority ?? 2; // Máxima prioridad
        break;
      case "manual":
        action = "snapshot_lp_start"; // Reutilizar lógica de snapshot
        jobPriority = priority ?? 0; // Prioridad normal
        break;
      default:
        return NextResponse.json(
          { error: "Invalid snapshot type" },
          { status: 400 }
        );
    }

    // Verificar si ya existe un trabajo pendiente para este game_id y tipo
    if (gameId && type !== "manual") {
      const { data: existingJob } = await supabase
        .from("lp_tracking_queue")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("game_id", gameId)
        .eq("action", action)
        .in("status", ["pending", "processing"])
        .single();

      if (existingJob) {
        console.log("[POST /api/riot/lp/snapshot] Job already exists:", {
          jobId: existingJob.id,
          status: existingJob.status,
          gameId,
          action,
        });

        return NextResponse.json({
          success: true,
          message: "Job already queued",
          jobId: existingJob.id,
          status: existingJob.status,
        });
      }
    }

    // Encolar trabajo
    const { data: job, error: insertError } = await supabase
      .from("lp_tracking_queue")
      .insert({
        user_id: user.id,
        puuid: riotAccount.puuid,
        platform_region: (riotAccount.active_shard || "la1").toLowerCase(),
        priority: jobPriority,
        action,
        game_id: gameId || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error(
        "[POST /api/riot/lp/snapshot] Error inserting job:",
        insertError
      );
      return NextResponse.json(
        { error: "Failed to queue snapshot job", details: insertError.message },
        { status: 500 }
      );
    }

    console.log("[POST /api/riot/lp/snapshot] Job queued successfully:", {
      jobId: job.id,
      type,
      gameId,
      priority: jobPriority,
      action,
    });

    return NextResponse.json({
      success: true,
      message: "Snapshot job queued successfully",
      jobId: job.id,
      priority: jobPriority,
      estimatedProcessingTime: "< 1 minute",
    });
  } catch (error: any) {
    console.error("[POST /api/riot/lp/snapshot] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/riot/lp/snapshot?gameId={gameId}
 *
 * Obtiene los snapshots de LP para una partida específica
 * Devuelve pre_game, post_game y el cálculo de LP ganado/perdido
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener gameId de query params
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");
    const targetUserId = searchParams.get("userId");
    const queueIdParam = searchParams.get("queueId");

    if (!gameId) {
      return NextResponse.json(
        { error: "Missing gameId parameter" },
        { status: 400 }
      );
    }

    // Obtener el token de autorización (opcional si hay targetUserId)
    const authHeader = request.headers.get("authorization");
    let user = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser(token);
      user = authUser;
    }

    // Si no hay usuario autenticado Y no hay targetUserId, rechazar
    if (!user && !targetUserId) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    // Si se especifica userId, usamos service role para bypassear RLS (para perfiles públicos)
    // Si no, usamos el cliente normal autenticado (solo propios) - aunque aquí ya estamos usando service key
    const clientToUse = supabase;

    const userIdToQuery = targetUserId || user?.id;

    // Obtener snapshots para esta partida
    console.log(`[GET /api/riot/lp/snapshot] Querying DB:`, {
      userIdToQuery,
      gameId: parseInt(gameId),
      queueId: queueIdParam,
    });

    const { data: snapshots, error: snapshotsError } = await clientToUse
      .from("lp_snapshots")
      .select("*")
      .eq("user_id", userIdToQuery)
      .eq("game_id", parseInt(gameId))
      .order("created_at", { ascending: true });

    console.log(`[GET /api/riot/lp/snapshot] DB Result:`, {
      count: snapshots?.length || 0,
      error: snapshotsError,
    });

    if (snapshotsError) {
      console.error(
        "[GET /api/riot/lp/snapshot] Error fetching snapshots:",
        snapshotsError
      );
      return NextResponse.json(
        { error: "Failed to fetch snapshots" },
        { status: 500 }
      );
    }

    // Filter by queue type if queueId is provided
    let targetQueueType: string | null = null;
    if (queueIdParam) {
      const qId = parseInt(queueIdParam);
      if (qId === 420) targetQueueType = "RANKED_SOLO_5x5";
      else if (qId === 440) targetQueueType = "RANKED_FLEX_SR";
    }

    const filteredSnapshots =
      targetQueueType && snapshots
        ? snapshots.filter((s) => s.queue_type === targetQueueType)
        : snapshots || [];

    // Fallback: If filteredSnapshots is empty but we have snapshots, maybe the queueId map is wrong or legacy data
    // Try to use all snapshots if we didn't find specific ones, OR if we didn't look for specific ones
    const workingSnapshots =
      filteredSnapshots.length > 0 ? filteredSnapshots : snapshots || [];

    const preGame = workingSnapshots.find(
      (s) => s.snapshot_type === "pre_game"
    );
    const postGame = workingSnapshots.find(
      (s) => s.snapshot_type === "post_game"
    );

    // Calcular LP change si tenemos ambos snapshots
    let lpChange = null;
    if (preGame && postGame) {
      const getTierValue = (tier: string) => {
        const tiers = [
          "IRON",
          "BRONZE",
          "SILVER",
          "GOLD",
          "PLATINUM",
          "EMERALD",
          "DIAMOND",
          "MASTER",
          "GRANDMASTER",
          "CHALLENGER",
        ];
        return tiers.indexOf(tier);
      };

      const getRankValue = (rank: string) => {
        const ranks = ["IV", "III", "II", "I"];
        return ranks.indexOf(rank);
      };

      const calculateTotalLp = (tier: string, rank: string, lp: number) => {
        const tierVal = getTierValue(tier);
        const rankVal = getRankValue(rank);

        // Si no es un tier válido, retornar 0 o el LP crudo
        if (tierVal === -1) return lp;

        // Para Apex Tiers (Master+), todos comparten la misma "base" de Diamond I 100LP
        // y su LP es absoluto.
        if (tierVal >= 7) {
          // Base hasta Diamond (6 * 400 = 2400) + Diamond I completado (100) = 2500?
          // Hagamos la matemática estándar:
          // Iron IV (0) -> Diamond I (400*6 + 3*100) = 2400 + 300 = 2700.
          // Al llegar a 2800 (Diamond I 100LP), saltas a Master.
          // Así que Master 0 PL = 2800 absoluto.
          return 2800 + lp;
        }

        // Para rangos normales (Iron - Diamond)
        // Cada Tier son 400 PL (4 divisiones de 100)
        // Cada Rank son 100 PL
        return tierVal * 400 + rankVal * 100 + lp;
      };

      const preTotal = calculateTotalLp(
        preGame.tier,
        preGame.rank,
        preGame.league_points
      );
      const postTotal = calculateTotalLp(
        postGame.tier,
        postGame.rank,
        postGame.league_points
      );

      const gained = postTotal - preTotal;

      lpChange = {
        gained,
        preLp: preGame.league_points,
        postLp: postGame.league_points,
        preTier: preGame.tier,
        postTier: postGame.tier,
        preRank: preGame.rank,
        postRank: postGame.rank,
        didPromote:
          getTierValue(postGame.tier) > getTierValue(preGame.tier) ||
          (postGame.tier === preGame.tier &&
            getRankValue(postGame.rank) > getRankValue(preGame.rank)),
        didDemote:
          getTierValue(postGame.tier) < getTierValue(preGame.tier) ||
          (postGame.tier === preGame.tier &&
            getRankValue(postGame.rank) < getRankValue(preGame.rank)),
      };
    }

    return NextResponse.json({
      success: true,
      gameId: parseInt(gameId),
      snapshots: {
        preGame,
        postGame,
      },
      lpChange,
      hasCompleteData: !!(preGame && postGame),
    });
  } catch (error: any) {
    console.error("[GET /api/riot/lp/snapshot] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
