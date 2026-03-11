import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { syncRiotStats, getRoutingRegionFromShard } from "@/lib/riot/sync";
import { syncMatchHistory, syncMatchById } from "@/lib/riot/matches";

const UNRANKED_RANK = {
  tier: "UNRANKED",
  rank: null,
  leaguePoints: 0,
  wins: 0,
  losses: 0,
};

/**
 * POST /api/riot/account/public/sync
 *
 * Sincroniza la cuenta de Riot Y el historial de partidas de un usuario público
 * Requiere x-user-id en los headers (el user_id del perfil a sincronizar)
 *
 * Headers:
 * - x-user-id: ID del usuario cuya cuenta se va a sincronizar (requerido)
 *
 * Respuesta:
 * - 200: Cuenta y partidas sincronizadas exitosamente
 * - 400: x-user-id no proporcionado
 * - 404: No hay cuenta de Riot vinculada para ese usuario
 * - 500: Error interno del servidor
 */
export async function POST(request: NextRequest) {
  try {
    console.log(
      "[POST /api/riot/account/public/sync] Iniciando sincronización..."
    );

    // Obtener user_id del body (más confiable que headers)
    const body = await request.json();
    const userId = body.userId;

    console.log("[POST /api/riot/account/public/sync] Body recibido:", {
      userId,
    });

    if (!userId) {
      console.error(
        "[POST /api/riot/account/public/sync] userId no proporcionado en body"
      );
      return NextResponse.json(
        { error: "userId es requerido en el body" },
        { status: 400 }
      );
    }

    console.log(
      "[POST /api/riot/account/public/sync] Sincronizando para usuario:",
      userId
    );

    const supabase = getServiceClient();

    // 1. Obtener cuenta de Riot vinculada o Perfil Público
    let puuid = "";
    let region = "";
    let sourceTable = "";
    let riotAccountRecord = null;

    // A. Intentar en linked_accounts_riot (usuarios normales)
    const { data: linkedAccount, error: linkedError } = await supabase
      .from("linked_accounts_riot")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (linkedAccount) {
      puuid = linkedAccount.puuid;
      region = linkedAccount.region;
      sourceTable = "linked_accounts_riot";
      riotAccountRecord = linkedAccount;
    } else {
      // B. Intentar en public_profiles (pros, streamers, etc)
      const { data: publicProfile, error: publicError } = await supabase
        .from("public_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (publicProfile) {
        puuid = publicProfile.puuid;
        region = publicProfile.region;
        sourceTable = "public_profiles";
        riotAccountRecord = publicProfile;
      }
    }

    if (!riotAccountRecord) {
      console.error(
        "[POST /api/riot/account/public/sync] No se encontró cuenta vinculada ni perfil público para:",
        userId
      );
      return NextResponse.json(
        { error: "No hay cuenta de Riot vinculada para este usuario" },
        { status: 404 }
      );
    }

    console.log("[POST /api/riot/account/public/sync] Cuenta encontrada", {
      puuid,
      region,
      source: sourceTable,
    });

    // 2. Sincronizar estadísticas de la cuenta (LP, wins, losses, rangos, etc.)
    console.log(
      "[POST /api/riot/account/public/sync] Sincronizando estadísticas de cuenta..."
    );

    const platformId = (region || "na1").toLowerCase();
    const syncResult = await syncRiotStats(
      puuid,
      process.env.RIOT_API_KEY || "",
      platformId
    );

    if (!syncResult.success) {
      console.error(
        "[POST /api/riot/account/public/sync] Error al sincronizar cuenta:",
        syncResult.error
      );
      return NextResponse.json(
        {
          error: "Error al sincronizar estadísticas",
          details: syncResult.error,
        },
        { status: 500 }
      );
    }

    const statsData = syncResult.data || {
      activeShard: platformId,
      summonerId: puuid, // Fallback
      summonerLevel: 0,
      profileIconId: 0,
      soloRank: { ...UNRANKED_RANK },
      flexRank: { ...UNRANKED_RANK },
    };

    const soloRank = statsData.soloRank || { ...UNRANKED_RANK };
    const flexRank = statsData.flexRank || { ...UNRANKED_RANK };

    console.log(
      "[POST /api/riot/account/public/sync] Datos de cuenta recibidos",
      {
        solo: soloRank,
        flex: flexRank,
        level: statsData.summonerLevel,
      }
    );

    // 3. Actualizar cuenta en BD
    console.log(
      `[POST /api/riot/account/public/sync] Actualizando datos en BD (${sourceTable})...`,
      { userId, soloTier: soloRank.tier, flexTier: flexRank.tier }
    );

    // A. Actualizar summoners (Cache global usado por perfiles públicos)
    const summonerUpdate = {
      summoner_id: statsData.summonerId,
      profile_icon_id: statsData.profileIconId,
      summoner_level: statsData.summonerLevel,
      tier: soloRank.tier,
      rank: soloRank.rank,
      league_points: soloRank.leaguePoints,
      wins: soloRank.wins,
      losses: soloRank.losses,
      rank_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: summonerError } = await supabase
      .from("summoners")
      .update(summonerUpdate)
      .eq("puuid", puuid);

    if (summonerError) {
      console.warn("[Sync] Error actualizando tabla summoners:", summonerError);
    }

    // B. Actualizar linked_accounts_riot (Solo si aplica)
    if (sourceTable === "linked_accounts_riot") {
      const updateData = {
        active_shard: statsData.activeShard,
        summoner_id: statsData.summonerId,
        profile_icon_id: statsData.profileIconId,
        summoner_level: statsData.summonerLevel,
        solo_tier: soloRank.tier,
        solo_rank: soloRank.rank,
        solo_league_points: soloRank.leaguePoints,
        solo_wins: soloRank.wins,
        solo_losses: soloRank.losses,
        flex_tier: flexRank.tier,
        flex_rank: flexRank.rank,
        flex_league_points: flexRank.leaguePoints,
        flex_wins: flexRank.wins,
        flex_losses: flexRank.losses,
        last_updated: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("linked_accounts_riot")
        .update(updateData)
        .eq("user_id", userId);

      if (updateError) {
        console.error(
          "[POST /api/riot/account/public/sync] Error al actualizar linked_accounts_riot:",
          updateError
        );
        return NextResponse.json(
          {
            error: "Error al guardar estadísticas",
            details: updateError.message,
          },
          { status: 500 }
        );
      }
    } else if (sourceTable === "public_profiles") {
      // Actualizar timestamp del perfil público
      await supabase
        .from("public_profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", userId);
    }

    console.log("[POST /api/riot/account/public/sync] ✅ Cuenta actualizada");

    // 4. Sincronización Avanzada: Buscar "Partidas Perdidas"
    // Intentamos recuperar ID de partida desde la DB o cola para forzar descarga directa
    // Esto hace que la actualización sea "instantánea" si ya detectamos que estaba en juego
    let instantMatchId: string | null = null;

    // A) Revisar si la cuenta decía estar en juego pero ya no lo está
    if (riotAccountRecord.is_in_game && riotAccountRecord.last_known_game_id) {
      // Verificar si realmente terminó
      const platformRegion = (region || "la1").toLowerCase();
      const spectatorUrl = `https://${platformRegion}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`;
      try {
        const specRes = await fetch(spectatorUrl, {
          headers: { "X-Riot-Token": process.env.RIOT_API_KEY || "" },
          cache: "no-store",
        });
        if (specRes.status === 404) {
          // Ya no está en juego, ¡podemos usar este ID!
          console.log(
            `[Sync] Detectada partida terminada reciente: ${riotAccountRecord.last_known_game_id}`
          );
          instantMatchId = String(riotAccountRecord.last_known_game_id);
        }
      } catch (e) {
        console.warn("[Sync] Error chequeando spectator:", e);
      }
    }

    // B) Revisar si hay un trabajo pendiente en cola con ID
    if (!instantMatchId) {
      const { data: queueJob } = await supabase
        .from("lp_tracking_queue")
        .select("game_id")
        .eq("user_id", userId)
        .neq("status", "completed") // pending o processing
        .not("game_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queueJob?.game_id) {
        console.log(
          `[Sync] Encontrado ID en cola de trabajos: ${queueJob.game_id}`
        );
        instantMatchId = String(queueJob.game_id);
      }
    }

    // C) Intentar descarga directa si tenemos ID
    if (instantMatchId) {
      console.log(`[Sync] 🚀 Intentando descarga directa de ${instantMatchId}`);
      const directSync = await syncMatchById(
        instantMatchId,
        region || "la1",
        process.env.RIOT_API_KEY || ""
      );
      if (directSync.success && directSync.saved) {
        console.log(
          `[Sync] ✅ Partida ${instantMatchId} descargada al instante`
        );
      }
    }

    // 5. Sincronizar historial de partidas (Método estándar por lista)
    console.log(
      "[POST /api/riot/account/public/sync] Sincronizando historial de partidas..."
    );

    const matchSyncResult = await syncMatchHistory(
      puuid,
      region || "la1",
      process.env.RIOT_API_KEY || "",
      100 // Últimas 100 partidas
    );

    console.log(
      "[POST /api/riot/account/public/sync] Resultado sync partidas:",
      {
        success: matchSyncResult.success,
        newMatches: matchSyncResult.newMatches,
        totalMatches: matchSyncResult.totalMatches,
      }
    );

    if (!matchSyncResult.success) {
      console.warn(
        "[POST /api/riot/account/public/sync] Advertencia al sincronizar partidas:",
        matchSyncResult.error
      );
      // No retornamos error aquí, la cuenta ya se actualizó
    } else if (matchSyncResult.newMatches === 0) {
      // Si no hubo partidas nuevas, puede ser lag de la API de Riot.
      // Encolamos un reintento en background para que el cron lo recoja en 1-2 min
      console.log(
        "[POST /api/riot/account/public/sync] 0 nuevas partidas. Encolando reintento en background..."
      );

      // Verificar si ya hay uno pendiente para no duplicar
      const { data: existingJob } = await supabase
        .from("lp_tracking_queue")
        .select("id")
        .eq("user_id", userId)
        .eq("action", "sync_matches")
        .eq("status", "pending")
        .maybeSingle();

      if (!existingJob) {
        const { error: queueError } = await supabase
          .from("lp_tracking_queue")
          .insert({
            user_id: userId,
            puuid: puuid,
            platform_region: (region || "la1").toLowerCase(),
            priority: 2,
            action: "sync_matches",
            status: "pending",
            retry_count: 0,
          });

        if (queueError) {
          console.error(
            "[POST /api/riot/account/public/sync] Error encolando reintento:",
            queueError.message
          );
        } else {
          console.log(
            "[POST /api/riot/account/public/sync] Reintento encolado exitosamente"
          );
        }
      } else {
        console.log(
          "[POST /api/riot/account/public/sync] Ya existe un job pendiente, saltando insert."
        );
      }
    }

    // 5. Limpiar cachés
    console.log("[POST /api/riot/account/public/sync] Limpiando cachés...");

    try {
      await supabase
        .from("player_stats_cache")
        .delete()
        .eq("user_id", userId)
        .eq("puuid", puuid);
      console.log(
        "[POST /api/riot/account/public/sync] player_stats_cache limpiado"
      );
    } catch (cacheError) {
      console.warn(
        "[POST /api/riot/account/public/sync] Error limpiando player_stats_cache:",
        cacheError
      );
    }

    try {
      await supabase
        .from("match_history_cache")
        .delete()
        .eq("user_id", userId)
        .eq("puuid", puuid);
      console.log(
        "[POST /api/riot/account/public/sync] match_history_cache limpiado"
      );
    } catch (cacheError) {
      console.warn(
        "[POST /api/riot/account/public/sync] Error limpiando match_history_cache:",
        cacheError
      );
    }

    console.log(
      "[POST /api/riot/account/public/sync] ✅ Sincronización completada"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Cuenta y partidas sincronizadas exitosamente",
        account: statsData,
        matches: {
          newMatches: matchSyncResult.newMatches,
          totalMatches: matchSyncResult.totalMatches,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "[POST /api/riot/account/public/sync] Error inesperado:",
      error
    );

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
