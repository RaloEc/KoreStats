/**
 * Servicio para sincronizar y gestionar historial de partidas de League of Legends
 * Utiliza la API Match-V5 de Riot Games
 */

import { getServiceClient } from "@/lib/supabase/server";
import {
  updateMatchRankings,
  getOrUpdateSummonerRank,
} from "@/lib/riot/league";
import { calculatePerformanceScore } from "@/lib/riot/match-analyzer";

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_BACKFILL_BATCH_SIZE = 50;
const MAX_BACKFILL_BATCHES = 10;
const API_REQUEST_DELAY_MS = 120;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface MatchCreationRow {
  matches?: {
    game_creation?: number | null;
  } | null;
}

const MATCH_CACHE_TTL_MS = 5 * 60 * 1000;
const TIMELINE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

export async function getCachedMatchHistory(
  userId: string,
  puuid: string
): Promise<any[]> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("match_history_cache")
      .select("match_data, expires_at")
      .eq("user_id", userId)
      .eq("puuid", puuid)
      .gt("expires_at", new Date().toISOString())
      .order("rank_position", { ascending: true });

    if (error) {
      console.error("[getCachedMatchHistory] Error:", error.message);
      return [];
    }

    return (data ?? []).map((row) => row.match_data);
  } catch (error: any) {
    console.error("[getCachedMatchHistory] Error:", error.message);
    return [];
  }
}

export async function refreshMatchHistoryCache(
  userId: string,
  puuid: string
): Promise<void> {
  try {
    const supabase = getServiceClient();
    const { matches } = await getMatchHistory(puuid, { limit: 5 });

    if (!matches || matches.length === 0) {
      console.log(
        "[refreshMatchHistoryCache] No hay partidas para cachear",
        puuid
      );
      return;
    }

    await supabase
      .from("match_history_cache")
      .delete()
      .eq("user_id", userId)
      .eq("puuid", puuid);

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + MATCH_CACHE_TTL_MS
    ).toISOString();
    const cachedRows = matches.map((match: any, index: number) => ({
      user_id: userId,
      puuid,
      match_id: match.match_id ?? match.id ?? `cached-${index}`,
      match_data: match,
      rank_position: index + 1,
      cached_at: now.toISOString(),
      expires_at: expiresAt,
    }));

    const { error } = await supabase
      .from("match_history_cache")
      .insert(cachedRows);

    if (error) {
      console.error(
        "[refreshMatchHistoryCache] Error al insertar:",
        error.message
      );
    } else {
      console.log(
        "[refreshMatchHistoryCache] Caché actualizado",
        `${matches.length} partidas`
      );
    }
  } catch (error: any) {
    console.error("[refreshMatchHistoryCache] Error:", error.message);
  }
}

interface SyncMatchHistoryOptions {
  ensureWeeks?: number;
}

/**
 * Mapea una región de plataforma a su región de ruteo
 * La API Match-V5 requiere regiones de ruteo, no regiones de plataforma
 *
 * @param platformRegion - Región de plataforma (ej: 'la1', 'euw1', 'kr')
 * @returns Región de ruteo (ej: 'americas', 'europe', 'asia')
 */
export function getRoutingRegion(platformRegion: string): string {
  const region = platformRegion.toLowerCase();

  // Americas
  if (["la1", "la2", "na1", "br1"].includes(region)) {
    return "americas";
  }

  // Europe
  if (["euw1", "eune1", "tr1", "ru"].includes(region)) {
    return "europe";
  }

  // Asia
  if (["kr", "jp1"].includes(region)) {
    return "asia";
  }

  // Default
  console.warn(
    `[getRoutingRegion] Región desconocida: ${platformRegion}, usando 'americas'`
  );
  return "americas";
}

/**
 * Interfaz para la respuesta de Match-V5 (Riot API usa camelCase)
 */
interface MatchData {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameMode: string;
    gameVersion: string;
    queueId: number;
    participants: ParticipantData[];
  };
}

interface ParticipantData {
  puuid: string;
  summonerName: string;
  summonerId: string;
  summonerLevel: number;
  championId: number;
  championName: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealt: number;
  totalDamageDealtToChampions: number;
  damageDealtToBuildings: number;
  damageDealtToObjectives: number;
  damageDealtToTurrets: number;
  damageSelfMitigated: number;
  goldEarned: number;
  totalDamageTaken: number;
  totalHeal: number;
  visionScore: number;
  detectorWardsPlaced: number;
  wardsKilled: number;
  wardsPlaced: number;
  totalTimeCCDealt: number;
  totalTimeSpentDead: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  totalAllyJungleMinionsKilled: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  perks?: {
    styles?: Array<{
      style?: number;
      description?: string;
    }>;
  };
  riotIdGameName?: string;
  riotIdTagline?: string; // ← Lowercase 'l'
  summoner1Id: number;
  summoner2Id: number;
  lane: string;
  role: string;
  pentaKills: number;
  quadraKills: number;
  assistMePings?: number;
  dangerPings?: number;
  commandPings?: number;
  allInPings?: number;
  baitPings?: number;
  basicPings?: number;
  enemyMissingPings?: number;
  enemyVisionPings?: number;
  getBackPings?: number;
  holdPings?: number;
  needVisionPings?: number;
  onMyWayPings?: number;
  pushPings?: number;
  visionClearedPings?: number;
}

/**
 * Obtiene la lista de IDs de partidas recientes desde Riot API
 */
interface GetMatchIdsParams {
  puuid: string;
  routingRegion: string;
  apiKey: string;
  start?: number;
  count?: number;
  startTime?: number;
  endTime?: number;
}

async function getMatchIds({
  puuid,
  routingRegion,
  apiKey,
  start = 0,
  count = 20,
  startTime,
  endTime,
}: GetMatchIdsParams): Promise<string[]> {
  try {
    console.log(
      `[getMatchIds] Obteniendo ${count} IDs de partidas para ${puuid} (start=${start}, startTime=${startTime})`
    );

    const params = new URLSearchParams();
    params.set("start", Math.max(0, start).toString());
    params.set("count", Math.max(1, Math.min(count, 100)).toString());

    if (typeof startTime === "number" && !Number.isNaN(startTime)) {
      params.set("startTime", Math.max(0, Math.floor(startTime)).toString());
    }

    if (typeof endTime === "number" && !Number.isNaN(endTime)) {
      params.set("endTime", Math.max(0, Math.floor(endTime)).toString());
    }

    const url = `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?${params.toString()}`;
    console.log(`[getMatchIds] URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": apiKey,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[getMatchIds] Error de Riot: ${response.status}`);
      console.error(`[getMatchIds] Response body:`, errorBody);
      return [];
    }

    const matchIds = await response.json();
    console.log(
      `[getMatchIds] ✅ Obtenidos ${matchIds.length} IDs de partidas`
    );
    if (matchIds.length > 0) {
      console.log(`[getMatchIds] 🎮 IDs retornados:`, matchIds);
    }
    return matchIds;
  } catch (error: any) {
    console.error("[getMatchIds] Error:", error.message);
    return [];
  }
}

async function filterExistingMatchIds(
  matchIds: string[],
  puuid?: string
): Promise<string[]> {
  if (matchIds.length === 0) {
    return [];
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("matches")
      .select("match_id")
      .in("match_id", matchIds);

    if (error) {
      console.error("[filterExistingMatchIds] ❌ Error:", error.message);
      return matchIds;
    }

    const existingMatchIds = (data || [])
      .map((row: { match_id?: string | null }) => row.match_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    const existing = new Set<string>(existingMatchIds);

    // Verificar si existen participantes para el jugador; si no, reintentar descarga
    let matchesMissingParticipant: string[] = [];
    if (puuid && existing.size > 0) {
      const { data: participantsData, error: participantsError } =
        await supabase
          .from("match_participants")
          .select("match_id")
          .in("match_id", Array.from(existing))
          .eq("puuid", puuid);

      if (participantsError) {
        console.warn(
          "[filterExistingMatchIds] ⚠️ No se pudo verificar participantes:",
          participantsError.message
        );
      } else {
        const participantMatchIds = (participantsData || [])
          .map((row: { match_id?: string | null }) => row.match_id)
          .filter(
            (id): id is string => typeof id === "string" && id.length > 0
          );
        const matchesWithParticipant = new Set<string>(participantMatchIds);
        matchesMissingParticipant = Array.from(existing).filter(
          (matchId) => !matchesWithParticipant.has(matchId)
        );

        if (matchesMissingParticipant.length > 0) {
          console.warn(
            "[filterExistingMatchIds] ♻️ Partidas sin participantes, se volverán a descargar:",
            matchesMissingParticipant
          );
        }
      }
    }

    // Considerar "nuevas" tanto las que no existen como las que requieren reintento
    const newMatches = matchIds.filter(
      (id) => !existing.has(id) || matchesMissingParticipant.includes(id)
    );

    console.log(
      `[filterExistingMatchIds] 📊 Total IDs: ${matchIds.length}, Existentes: ${existing.size}, Nuevos: ${newMatches.length}`
    );
    if (newMatches.length > 0) {
      console.log(`[filterExistingMatchIds] 🆕 Nuevos IDs:`, newMatches);
    }
    if (existing.size > 0) {
      console.log(
        `[filterExistingMatchIds] 📦 IDs existentes:`,
        Array.from(existing)
      );
    }

    return newMatches;
  } catch (error: any) {
    console.error("[filterExistingMatchIds] ❌ Error:", error.message);
    return matchIds;
  }
}

async function getMatchCreationBoundary(
  puuid: string,
  ascending: boolean
): Promise<number | null> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("match_participants")
      .select("matches!inner(game_creation)")
      .eq("puuid", puuid)
      .order("matches(game_creation)", {
        ascending,
      })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0] as MatchCreationRow;
    return row?.matches?.game_creation ?? null;
  } catch (error: any) {
    console.error("[getMatchCreationBoundary] Error:", error.message);
    return null;
  }
}

async function getLatestMatchCreation(puuid: string) {
  const latest = await getMatchCreationBoundary(puuid, false);
  console.log(`[getLatestMatchCreation] 📅 Latest match creation: ${latest}`);
  return latest;
}

async function getOldestMatchCreation(puuid: string) {
  return getMatchCreationBoundary(puuid, true);
}

async function ensureHistoricalCoverage(
  puuid: string,
  routingRegion: string,
  apiKey: string,
  ensureWeeks: number
): Promise<number> {
  if (!ensureWeeks || ensureWeeks <= 0) {
    return 0;
  }

  const threshold = Date.now() - ensureWeeks * WEEK_IN_MS;
  let batches = 0;
  let start = 0;
  let backfilledMatches = 0;

  while (batches < MAX_BACKFILL_BATCHES) {
    const oldestMatch = await getOldestMatchCreation(puuid);
    if (oldestMatch && oldestMatch <= threshold) {
      break;
    }

    const matchIds = await getMatchIds({
      puuid,
      routingRegion,
      apiKey,
      start,
      count: DEFAULT_BACKFILL_BATCH_SIZE,
    });

    if (matchIds.length === 0) {
      break;
    }

    const matchesToDownload = await filterExistingMatchIds(matchIds);

    if (matchesToDownload.length === 0) {
      start += DEFAULT_BACKFILL_BATCH_SIZE;
      batches++;
      continue;
    }

    for (const matchId of matchesToDownload) {
      const matchData = await getMatchDetails(matchId, routingRegion, apiKey);
      if (matchData) {
        const saved = await saveMatch(matchData);
        if (saved) {
          backfilledMatches++;
        }
      }

      await delay(API_REQUEST_DELAY_MS);
    }

    start += DEFAULT_BACKFILL_BATCH_SIZE;
    batches++;
  }

  return backfilledMatches;
}

/**
 * Intenta sincronizar una partida específica por su ID.
 * Útil cuando sabemos el ID (ej: desde spectator) pero aún no sale en la lista de historial.
 */
export async function syncMatchById(
  matchId: string,
  platformRegion: string,
  apiKey: string
): Promise<{ success: boolean; saved: boolean; error?: string }> {
  try {
    const routingRegion = getRoutingRegion(platformRegion);
    console.log(`[syncMatchById] Intentando sync directa de ${matchId}`);

    // Verificar si ya existe primero para ahorrar requests
    const exists = await matchExists(matchId);
    if (exists) {
      console.log(`[syncMatchById] La partida ${matchId} ya existe en BD.`);
      return { success: true, saved: false };
    }

    const matchData = await getMatchDetails(matchId, routingRegion, apiKey);

    if (!matchData) {
      return { success: false, saved: false, error: "Match not found in API" };
    }

    const saved = await saveMatch(matchData);
    return { success: true, saved };
  } catch (error: any) {
    console.error(`[syncMatchById] Error: ${error.message}`);
    return { success: false, saved: false, error: error.message };
  }
}

/**
 * Obtiene los detalles completos de una partida desde Riot API
 */
async function getMatchDetails(
  matchId: string,
  routingRegion: string,
  apiKey: string
): Promise<MatchData | null> {
  try {
    const url = `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}`;

    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": apiKey,
      },
    });

    if (!response.ok) {
      console.error(
        `[getMatchDetails] Error para ${matchId}: ${response.status}`
      );
      return null;
    }

    const matchData = await response.json();
    return matchData;
  } catch (error: any) {
    console.error(`[getMatchDetails] Error para ${matchId}:`, error.message);
    return null;
  }
}

/**
 * Verifica si una partida ya existe en la base de datos
 */
async function matchExists(matchId: string): Promise<boolean> {
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("matches")
      .select("match_id")
      .eq("match_id", matchId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[matchExists] Error:", error.message);
      return false;
    }

    return !!data;
  } catch (error: any) {
    console.error("[matchExists] Error:", error.message);
    return false;
  }
}

/**
 * Guarda una partida y sus participantes en la base de datos
 */
async function saveMatch(matchData: MatchData): Promise<boolean> {
  try {
    const supabase = getServiceClient();
    // Riot API devuelve camelCase: matchId
    const matchId = matchData?.metadata?.matchId;

    if (!matchId) {
      console.error(
        "[saveMatch] Error: matchId no encontrado en matchData. Estructura recibida:",
        JSON.stringify(matchData, null, 2)
      );
      return false;
    }

    // Limpiar registros previos del mismo match_id para permitir reintentos
    await supabase.from("match_participants").delete().eq("match_id", matchId);
    await supabase.from("matches").delete().eq("match_id", matchId);

    // Guardar información general de la partida
    // Mapeamos de camelCase (API) a snake_case (DB)
    const { error: matchError } = await supabase.from("matches").insert({
      match_id: matchId,
      data_version: matchData.metadata.dataVersion,
      game_creation: matchData.info.gameCreation,
      game_duration: matchData.info.gameDuration,
      game_mode: matchData.info.gameMode,
      queue_id: matchData.info.queueId,
      full_json: matchData,
    });

    if (matchError) {
      console.error(
        "[saveMatch] ❌ Error al guardar match:",
        matchError.message,
        matchError.details
      );
      return false;
    }
    console.log(`[saveMatch] ✅ Match insertado: ${matchId}`);

    // Guardar participantes
    const participants = matchData.info.participants.map((p, index) => ({
      match_id: matchId,
      puuid: p.puuid,
      summoner_id: p.summonerId,
      summoner_level: p.summonerLevel,
      summoner_name: p.riotIdGameName || p.summonerName || "Unknown",
      champion_id: p.championId,
      champion_name: p.championName,
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      kda:
        p.deaths === 0 ? p.kills + p.assists : (p.kills + p.assists) / p.deaths,
      total_damage_dealt: p.totalDamageDealt,
      total_damage_dealt_to_champions: p.totalDamageDealtToChampions,
      damage_dealt_to_buildings: p.damageDealtToBuildings,
      damage_dealt_to_objectives: p.damageDealtToObjectives,
      damage_dealt_to_turrets: p.damageDealtToTurrets,
      damage_self_mitigated: p.damageSelfMitigated,
      gold_earned: p.goldEarned,
      total_damage_taken: p.totalDamageTaken,
      total_heal: p.totalHeal,
      vision_score: p.visionScore,
      detector_wards_placed: p.detectorWardsPlaced,
      wards_killed: p.wardsKilled,
      wards_placed: p.wardsPlaced,
      total_time_cc_dealt: p.totalTimeCCDealt,
      total_time_spent_dead: p.totalTimeSpentDead,
      total_minions_killed: p.totalMinionsKilled,
      neutral_minions_killed: p.neutralMinionsKilled,
      total_ally_jungle_minions_killed: p.totalAllyJungleMinionsKilled,
      item0: p.item0,
      item1: p.item1,
      item2: p.item2,
      item3: p.item3,
      item4: p.item4,
      item5: p.item5,
      item6: p.item6,
      summoner1_id: p.summoner1Id,
      summoner2_id: p.summoner2Id,
      perk_primary_style: p.perks?.styles?.[0]?.style ?? null,
      perk_sub_style: p.perks?.styles?.[1]?.style ?? null,
      lane: p.lane,
      role: p.role,
      penta_kills: p.pentaKills,
      quadra_kills: p.quadraKills,
      assist_me_pings: p.assistMePings ?? 0,
      danger_pings: p.dangerPings ?? 0,
      command_pings: p.commandPings ?? 0,
      all_in_pings: p.allInPings ?? 0,
      bait_pings: p.baitPings ?? 0,
      basic_pings: p.basicPings ?? 0,
      enemy_missing_pings: p.enemyMissingPings ?? 0,
      enemy_vision_pings: p.enemyVisionPings ?? 0,
      get_back_pings: p.getBackPings ?? 0,
      hold_pings: p.holdPings ?? 0,
      need_vision_pings: p.needVisionPings ?? 0,
      on_my_way_pings: p.onMyWayPings ?? 0,
      push_pings: p.pushPings ?? 0,
      vision_cleared_pings: p.visionClearedPings ?? 0,
    }));

    const { error: participantsError } = await supabase
      .from("match_participants")
      .insert(participants);

    if (participantsError) {
      console.error(
        "[saveMatch] ❌ Error al guardar participantes:",
        participantsError.message,
        participantsError.details
      );

      try {
        await supabase.from("matches").delete().eq("match_id", matchId);
        console.warn(
          `[saveMatch] 📦 Match ${matchId} eliminado tras fallo en participantes`
        );
      } catch (cleanupError: any) {
        console.error(
          `[saveMatch] ⚠️ No se pudo limpiar match ${matchId}:`,
          cleanupError.message
        );
      }

      return false;
    }
    console.log(
      `[saveMatch] ✅ ${participants.length} participantes guardados para ${matchId}`
    );

    // FASE RÁPIDA: Marcar como 'processing' para que sea visible en el historial
    console.log(`[saveMatch] ⚡ Marcando partida como 'processing'...`);
    const { error: statusError } = await supabase
      .from("matches")
      .update({ ingest_status: "processing" })
      .eq("match_id", matchId);

    if (statusError) {
      console.warn(
        `[saveMatch] ⚠️ Error al marcar como processing:`,
        statusError.message
      );
    } else {
      console.log(
        `[saveMatch] ✅ Partida ${matchId} marcada como 'processing'`
      );
    }

    // FASE PESADA: Disparar job asíncrono para calcular ranking/performance
    // (no esperamos respuesta, solo lo registramos para procesar después)
    console.log(
      `[saveMatch] 🔄 Encolando procesamiento de ranking/performance para ${matchId}...`
    );

    // Fire-and-forget: procesar en background
    processMatchRankingAsync(matchId, matchData).catch((err) => {
      console.error(
        `[saveMatch] Error en procesamiento async de ${matchId}:`,
        err.message
      );
    });

    console.log(`[saveMatch] ✅ Partida ${matchId} guardada exitosamente`);

    return true;
  } catch (error: any) {
    console.error("[saveMatch] Error:", error.message);
    return false;
  }
}

/**
 * Procesa ranking y performance score de forma asíncrona (background job)
 * Se ejecuta sin bloquear la respuesta al usuario
 * Actualiza ingest_status a 'ready' cuando termina
 */
async function processMatchRankingAsync(
  matchId: string,
  matchData: MatchData
): Promise<void> {
  try {
    const supabase = getServiceClient();
    console.log(`[processMatchRankingAsync] 🔄 Iniciando para ${matchId}...`);

    // Calcular totales de equipo
    const team100 = (matchData.info.participants as any[]).filter(
      (p: any) => p.teamId === 100
    );
    const team200 = (matchData.info.participants as any[]).filter(
      (p: any) => p.teamId === 200
    );

    const team100Stats = {
      kills: team100.reduce((sum, p) => sum + p.kills, 0),
      damage: team100.reduce(
        (sum, p) => sum + (p.totalDamageDealtToChampions ?? 0),
        0
      ),
      gold: team100.reduce((sum, p) => sum + p.goldEarned, 0),
    };

    const team200Stats = {
      kills: team200.reduce((sum, p) => sum + p.kills, 0),
      damage: team200.reduce(
        (sum, p) => sum + (p.totalDamageDealtToChampions ?? 0),
        0
      ),
      gold: team200.reduce((sum, p) => sum + p.goldEarned, 0),
    };

    // Calcular performance score para cada participante
    const scoresMap = new Map<string, number>();

    for (const participant of matchData.info.participants as any[]) {
      const teamStats =
        participant.teamId === 100 ? team100Stats : team200Stats;

      const score = calculatePerformanceScore({
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        win: participant.win,
        gameDuration: matchData.info.gameDuration,
        goldEarned: participant.goldEarned,
        totalDamageDealtToChampions:
          participant.totalDamageDealtToChampions ?? 0,
        visionScore: participant.visionScore ?? 0,
        totalMinionsKilled: participant.totalMinionsKilled ?? 0,
        neutralMinionsKilled: participant.neutralMinionsKilled ?? 0,
        role: participant.role || participant.lane,
        teamTotalKills: teamStats.kills,
        teamTotalDamage: teamStats.damage,
        teamTotalGold: teamStats.gold,
        objectivesStolen: participant.objectivesStolen ?? 0,
      });

      scoresMap.set(participant.puuid, score);
    }

    // Ordenar por score para obtener ranking
    const sortedScores = Array.from(scoresMap.entries()).sort(
      (a, b) => (b[1] ?? 0) - (a[1] ?? 0)
    );

    const rankingMap = new Map<string, number>();
    sortedScores.forEach(([puuid], index) => {
      rankingMap.set(puuid, index + 1);
    });

    // Actualizar match_participants con ranking y performance score
    for (const participant of matchData.info.participants as any[]) {
      const rankingPosition = rankingMap.get(participant.puuid) ?? null;
      const performanceScore = scoresMap.get(participant.puuid) ?? null;

      const { error: updateError } = await supabase
        .from("match_participants")
        .update({
          ranking_position: rankingPosition,
          performance_score: performanceScore,
        })
        .eq("match_id", matchId)
        .eq("puuid", participant.puuid);

      if (updateError) {
        console.warn(
          `[processMatchRankingAsync] ⚠️ Error actualizando ranking para ${participant.puuid}:`,
          updateError.message
        );
      }
    }

    console.log(
      `[processMatchRankingAsync] ✅ Ranking y performance scores calculados`
    );

    // Guardar snapshots de ranking para cada participante
    console.log(
      `[processMatchRankingAsync] Obteniendo rankings desde caché para ${matchId}...`
    );

    const platformRegion = "la1";
    const apiKey = process.env.RIOT_API_KEY;

    if (!apiKey) {
      console.warn(
        "[processMatchRankingAsync] RIOT_API_KEY no está configurada"
      );
    }

    // Obtener rankings en paralelo para mejorar el tiempo de procesamiento
    // (Aun siendo async, esto libera recursos más rápido)
    const rankSnapshots = await Promise.all(
      matchData.info.participants.map(
        async (participant: any, index: number) => {
          if (!participant.summonerId || !participant.puuid) {
            return null;
          }

          // Añadimos un pequeño escalonado para no lanzar las 10 peticiones exactamente al mismo tiempo
          await delay(index * 50);

          let rankData = null;
          if (apiKey) {
            rankData = await getOrUpdateSummonerRank(
              participant.puuid,
              platformRegion,
              apiKey
            );
          }

          return {
            match_id: matchId,
            puuid: participant.puuid,
            summoner_id: participant.summonerId,
            queue_type: "RANKED_SOLO_5x5",
            tier: rankData?.tier || null,
            rank: rankData?.rank || null,
            league_points: rankData?.league_points || 0,
            wins: rankData?.wins || 0,
            losses: rankData?.losses || 0,
          };
        }
      )
    );

    const validSnapshots = rankSnapshots.filter((s) => s !== null);

    if (validSnapshots.length > 0) {
      const { error: rankError } = await supabase
        .from("match_participant_ranks")
        .insert(validSnapshots);

      if (rankError) {
        console.warn(
          "[processMatchRankingAsync] Advertencia al guardar ranks:",
          rankError.message
        );
      } else {
        console.log(
          `[processMatchRankingAsync] ✅ ${rankSnapshots.length} snapshots de ranking guardados`
        );
      }
    }

    // Marcar como 'ready' cuando todo termina
    const { error: readyError } = await supabase
      .from("matches")
      .update({ ingest_status: "ready" })
      .eq("match_id", matchId);

    if (readyError) {
      console.warn(
        `[processMatchRankingAsync] ⚠️ Error al marcar como ready:`,
        readyError.message
      );
    } else {
      console.log(
        `[processMatchRankingAsync] ✅ Partida ${matchId} marcada como 'ready'`
      );
    }

    console.log(
      `[processMatchRankingAsync] ✅ Procesamiento completado para ${matchId}`
    );
  } catch (error: any) {
    console.error(
      `[processMatchRankingAsync] ❌ Error procesando ${matchId}:`,
      error.message
    );

    // Marcar como 'failed' si hay error
    try {
      const supabase = getServiceClient();
      await supabase
        .from("matches")
        .update({ ingest_status: "failed" })
        .eq("match_id", matchId);
    } catch (failError) {
      console.error(
        "[processMatchRankingAsync] Error marcando como failed:",
        failError
      );
    }
  }
}

/**
 * Sincroniza el historial de partidas de un jugador
 * Descarga solo las partidas nuevas que no existan en la BD
 *
 * @param puuid - PUUID del jugador
 * @param platformRegion - Región de plataforma (ej: 'la1')
 * @param apiKey - API Key de Riot
 * @param count - Número de partidas a sincronizar (default: 20)
 * @returns Resumen de la sincronización
 */
export async function syncMatchHistory(
  puuid: string,
  platformRegion: string,
  apiKey: string,
  count: number = 20,
  options: SyncMatchHistoryOptions = {}
): Promise<{
  success: boolean;
  newMatches: number;
  totalMatches: number;
  error?: string;
}> {
  try {
    console.log(`[syncMatchHistory] Iniciando sincronización para ${puuid}`);

    // Obtener región de ruteo
    const routingRegion = getRoutingRegion(platformRegion);
    console.log(`[syncMatchHistory] Región de ruteo: ${routingRegion}`);

    const { ensureWeeks = 3 } = options;

    const latestMatchCreation = await getLatestMatchCreation(puuid);
    const startTime =
      typeof latestMatchCreation === "number"
        ? Math.floor(latestMatchCreation / 1000) + 1
        : undefined;

    console.log(
      `[syncMatchHistory] 🔍 latestMatchCreation: ${latestMatchCreation}, startTime: ${startTime}`
    );

    // Obtener IDs de partidas recientes posteriores a la última guardada
    const matchIds = await getMatchIds({
      puuid,
      routingRegion,
      apiKey,
      count,
      startTime,
    });

    if (matchIds.length === 0) {
      return {
        success: false,
        newMatches: 0,
        totalMatches: 0,
        error: "No se obtuvieron IDs de partidas",
      };
    }

    console.log(
      `[syncMatchHistory] Verificando ${matchIds.length} partidas...`
    );

    // Filtrar partidas que ya existen
    let newMatchCount = 0;
    const matchesToDownload = await filterExistingMatchIds(matchIds);

    console.log(
      `[syncMatchHistory] ${matchesToDownload.length} partidas nuevas para descargar`
    );

    // Descargar y guardar partidas nuevas en lotes para mejorar rendimiento
    const BATCH_SIZE = 5; // Procesar de 5 en 5 para balancear velocidad y límites de la API
    for (let i = 0; i < matchesToDownload.length; i += BATCH_SIZE) {
      const batch = matchesToDownload.slice(i, i + BATCH_SIZE);
      console.log(
        `[syncMatchHistory] 📥 Procesando lote de ${batch.length} partidas...`
      );

      await Promise.all(
        batch.map(async (matchId) => {
          try {
            const matchData = await getMatchDetails(
              matchId,
              routingRegion,
              apiKey
            );
            if (matchData) {
              console.log(
                `[syncMatchHistory] 💾 Guardando partida: ${matchId}`
              );
              const saved = await saveMatch(matchData);
              if (saved) {
                newMatchCount++;
              }
            }
          } catch (err: any) {
            console.error(
              `[syncMatchHistory] ❌ Error con ${matchId}:`,
              err.message
            );
          }
        })
      );

      // Solo esperar si no es el último lote
      if (i + BATCH_SIZE < matchesToDownload.length) {
        await delay(API_REQUEST_DELAY_MS * 1.5); // Delay ligeramente mayor entre lotes
      }
    }

    const backfilledMatches = await ensureHistoricalCoverage(
      puuid,
      routingRegion,
      apiKey,
      ensureWeeks
    );

    const totalSynced = newMatchCount + backfilledMatches;

    console.log(
      `[syncMatchHistory] ✅ Sincronización completada: ${totalSynced} partidas nuevas (recientes: ${newMatchCount}, backfill: ${backfilledMatches})`
    );

    return {
      success: true,
      newMatches: totalSynced,
      totalMatches: matchIds.length,
    };
  } catch (error: any) {
    console.error("[syncMatchHistory] Error:", error.message);
    return {
      success: false,
      newMatches: 0,
      totalMatches: 0,
      error: error.message,
    };
  }
}

/**
 * Obtiene el historial de partidas de un jugador desde la BD
 *
 * @param puuid - PUUID del jugador
 * @param options.limit - Número máximo de partidas a retornar (default: 10)
 * @param options.cursor - Timestamp (game_creation) para paginación descendente
 * @param options.queueIds - Lista de colas permitidas (queue_id)
 * @returns Partidas y metadatos de paginación
 */
export async function getMatchHistory(
  puuid: string,
  options:
    | number
    | { limit?: number; cursor?: number | null; queueIds?: number[] } = {}
): Promise<{
  matches: any[];
  hasMore: boolean;
  nextCursor: number | null;
}> {
  try {
    const supabase = getServiceClient();
    const normalizedOptions =
      typeof options === "number" ? { limit: options } : options ?? {};
    const limit = normalizedOptions.limit ?? 10;
    const cursor = Number.isFinite(normalizedOptions.cursor ?? null)
      ? Number(normalizedOptions.cursor)
      : null;
    const queueIds = normalizedOptions.queueIds;

    let query = supabase
      .from("match_participants")
      .select(
        `
        id,
        match_id,
        puuid,
        summoner_name,
        summoner_id,
        champion_id,
        champion_name,
        win,
        kills,
        deaths,
        assists,
        kda,
        total_damage_dealt,
        gold_earned,
        vision_score,
        item0,
        item1,
        item2,
        item3,
        item4,
        item5,
        item6,
        summoner1_id,
        summoner2_id,
        perk_primary_style,
        perk_sub_style,
        lane,
        role,
        created_at,
        ranking_position,
        performance_score,
        matches!inner (
          match_id,
          game_creation,
          game_duration,
          game_mode,
          queue_id,
          full_json,
          ingest_status
        )
      `
      )
      .eq("puuid", puuid);

    if (queueIds && queueIds.length > 0) {
      query = query.in("matches.queue_id", queueIds);
    }

    // Aplicar filtro de cursor para paginación (obtener partidas más antiguas)
    if (cursor) {
      query = query.filter("matches.game_creation", "lt", cursor);
    }

    const { data, error } = await query
      .order("matches(game_creation)", {
        ascending: false,
      })
      .limit(limit + 1);

    if (error) {
      console.error("[getMatchHistory] Error:", error.message);
      return { matches: [], hasMore: false, nextCursor: null };
    }

    // Debug logging
    if (data && data.length > 0) {
      console.log("[getMatchHistory] Primera partida:", {
        match_id: data[0].match_id,
        game_creation: data[0].matches?.game_creation,
        game_time: new Date(data[0].matches?.game_creation).toISOString(),
      });
      console.log("[getMatchHistory] Última partida:", {
        match_id: data[data.length - 1].match_id,
        game_creation: data[data.length - 1].matches?.game_creation,
        game_time: new Date(
          data[data.length - 1].matches?.game_creation
        ).toISOString(),
      });
    }

    // Obtener rankings para todas las partidas
    const matchIds = (data || []).map((p: any) => p.match_id);
    let rankingMap = new Map();

    if (matchIds.length > 0) {
      const { data: rankings, error: rankingsError } = await supabase
        .from("match_participant_ranks")
        .select(
          "summoner_id, match_id, tier, rank, league_points, wins, losses"
        )
        .in("match_id", matchIds);

      if (!rankingsError && rankings) {
        // Crear mapa con clave "summoner_id-match_id"
        rankingMap = new Map(
          rankings.map((r: any) => [`${r.summoner_id}-${r.match_id}`, r])
        );
      }
    }

    // Mapear datos de ranking
    const enrichedData = (data || []).map((p: any) => {
      const rankData = rankingMap.get(`${p.summoner_id}-${p.match_id}`) as any;
      return {
        ...p,
        tier: rankData?.tier || null,
        rank: rankData?.rank || null,
        league_points: rankData?.league_points || 0,
        wins: rankData?.wins || 0,
        losses: rankData?.losses || 0,
      };
    });

    const hasMore = enrichedData.length > limit;
    const matches = hasMore ? enrichedData.slice(0, limit) : enrichedData;
    const nextCursor = hasMore
      ? matches[matches.length - 1]?.matches?.game_creation || null
      : null;

    return { matches, hasMore, nextCursor };
  } catch (error: any) {
    console.error("[getMatchHistory] Error:", error.message);
    return { matches: [], hasMore: false, nextCursor: null };
  }
}

/**
 * Obtiene estadísticas agregadas de un jugador
 *
 * @param puuid - PUUID del jugador
 * @param limit - Número de partidas a considerar (default: 20)
 * @returns Estadísticas agregadas
 */
export async function getPlayerStats(
  puuid: string,
  options: number | { limit?: number; queueIds?: number[] } = {}
): Promise<{
  totalGames: number;
  wins: number;
  losses: number;
  winrate: number;
  avgKda: number;
  avgDamage: number;
  avgGold: number;
}> {
  try {
    const supabase = getServiceClient();
    const normalizedOptions =
      typeof options === "number" ? { limit: options } : options ?? {};
    const limit = normalizedOptions.limit ?? 20;
    const queueIds = normalizedOptions.queueIds;

    let query = supabase
      .from("match_participants")
      .select(
        `win, kda, total_damage_dealt, gold_earned, matches!inner(queue_id)`
      )
      .eq("puuid", puuid)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (queueIds && queueIds.length > 0) {
      query = query.in("matches.queue_id", queueIds);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winrate: 0,
        avgKda: 0,
        avgDamage: 0,
        avgGold: 0,
      };
    }

    const wins = data.filter((d) => d.win).length;
    const losses = data.length - wins;
    const avgKda = data.reduce((sum, d) => sum + (d.kda || 0), 0) / data.length;
    const avgDamage =
      data.reduce((sum, d) => sum + (d.total_damage_dealt || 0), 0) /
      data.length;
    const avgGold =
      data.reduce((sum, d) => sum + (d.gold_earned || 0), 0) / data.length;

    return {
      totalGames: data.length,
      wins,
      losses,
      winrate: Math.round((wins / data.length) * 100),
      avgKda: Math.round(avgKda * 100) / 100,
      avgDamage: Math.round(avgDamage),
      avgGold: Math.round(avgGold),
    };
  } catch (error: any) {
    console.error("[getPlayerStats] Error:", error.message);
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winrate: 0,
      avgKda: 0,
      avgDamage: 0,
      avgGold: 0,
    };
  }
}

/**
 * Obtiene los detalles completos de una partida incluyendo participantes desde la BD
 *
 * @param matchId - ID de la partida (ej: LA1_12345)
 * @returns Datos de la partida y participantes
 */
export async function getMatchById(matchId: string): Promise<{
  match: any;
  participants: any[];
} | null> {
  try {
    const supabase = getServiceClient();

    // Obtener datos de la partida
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("match_id", matchId)
      .single();

    if (matchError || !match) {
      console.error(
        "[getMatchById] Error al obtener match:",
        matchError?.message
      );
      return null;
    }

    // Obtener participantes
    const { data: participants, error: participantsError } = await supabase
      .from("match_participants")
      .select("*")
      .eq("match_id", matchId)
      // Ordenar por victoria (agrupa equipos) y luego por rol
      .order("win", { ascending: false })
      .order("role", { ascending: true });

    if (participantsError) {
      console.error(
        "[getMatchById] Error al obtener participantes:",
        participantsError.message
      );
      return { match, participants: [] };
    }

    // Obtener rankings por separado (si existen)
    const { data: rankings, error: rankingsError } = await supabase
      .from("match_participant_ranks")
      .select("summoner_id, tier, rank, league_points, wins, losses")
      .eq("match_id", matchId);

    if (rankingsError) {
      console.warn(
        "[getMatchById] Advertencia al obtener rankings:",
        rankingsError.message
      );
    }

    // Mapear los datos de ranking al nivel superior para facilitar acceso
    const rankingMap = new Map(
      (rankings || []).map((r: any) => [r.summoner_id, r])
    );

    const participantsWithRanks = (participants || []).map((p: any) => {
      const rankData = rankingMap.get(p.summoner_id) as any;
      return {
        ...p,
        tier: rankData?.tier || null,
        rank: rankData?.rank || null,
        league_points: rankData?.league_points || 0,
        wins: rankData?.wins || 0,
        losses: rankData?.losses || 0,
      };
    });

    return { match, participants: participantsWithRanks };
  } catch (error: any) {
    console.error("[getMatchById] Error:", error.message);
    return null;
  }
}

/**
 * Obtiene la línea de tiempo de una partida desde Riot API
 * (No se guarda en BD por ahora, caché simple en memoria/Next.js)
 *
 * @param matchId - ID de la partida
 * @param platformRegion - Región de plataforma (ej: 'la1') - Necesario para la API
 * @param apiKey - API Key de Riot
 */
interface GetMatchTimelineOptions {
  forceRefresh?: boolean;
}

export async function getMatchTimeline(
  matchId: string,
  platformRegion: string,
  apiKey: string,
  options?: GetMatchTimelineOptions
): Promise<any | null> {
  try {
    const supabase = getServiceClient();
    let cachedTimeline: any | null = null;
    let cachedAt: Date | null = null;

    // Intentar leer del caché
    const { data: cachedData, error: cacheError } = await supabase
      .from("match_timelines")
      .select("timeline, cached_at")
      .eq("match_id", matchId)
      .maybeSingle();

    if (cacheError) {
      console.warn(
        "[getMatchTimeline] Error leyendo caché:",
        cacheError.message
      );
    }

    if (cachedData?.timeline) {
      cachedTimeline = cachedData.timeline;
      cachedAt = cachedData.cached_at ? new Date(cachedData.cached_at) : null;

      const isFresh = cachedAt
        ? Date.now() - cachedAt.getTime() < TIMELINE_CACHE_TTL_MS
        : false;

      if (isFresh && !options?.forceRefresh) {
        console.log("[getMatchTimeline] Timeline desde caché", {
          matchId,
          cachedAt,
        });
        return cachedTimeline;
      }
    }

    if (!apiKey) {
      console.warn(
        "[getMatchTimeline] Sin API Key para refrescar timeline, devolviendo caché"
      );
      return cachedTimeline;
    }

    const routingRegion = getRoutingRegion(platformRegion);
    const url = `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;

    console.log(`[getMatchTimeline] Fetching timeline for ${matchId}`);

    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": apiKey,
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error(
        `[getMatchTimeline] Error ${response.status} al obtener timeline`
      );
      return cachedTimeline;
    }

    const timeline = await response.json();

    // Guardar en caché
    const { error: upsertError } = await supabase
      .from("match_timelines")
      .upsert({
        match_id: matchId,
        timeline,
        cached_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.warn(
        "[getMatchTimeline] Error guardando timeline en caché:",
        upsertError.message
      );
    }

    return timeline;
  } catch (error: any) {
    console.error("[getMatchTimeline] Error:", error.message);
    return null;
  }
}

/**
 * Procesa el timeline de una partida para extraer steals de objetivos epicos
 * Retorna un mapa de índice de participante -> numero de steals
 *
 * @param timeline - Timeline completo de la partida
 * @param matchInfo - Info del match con participantes
 * @returns Mapa de índice de participante -> objectivesStolen
 */
export function extractObjectiveSteals(
  timeline: any,
  matchInfo: any
): Record<number, number> {
  const stealsMap: Record<number, number> = {};

  if (!timeline?.info?.frames) {
    return stealsMap;
  }

  // Inicializar contador para todos los participantes (0-9)
  for (let i = 0; i < 10; i++) {
    stealsMap[i] = 0;
  }

  // Recorrer frames y eventos para detectar ELITE_MONSTER_KILL
  timeline.info.frames.forEach((frame: any) => {
    if (!frame.events) return;

    frame.events.forEach((event: any) => {
      if (event.type === "ELITE_MONSTER_KILL") {
        // Tipos de objetivos épicos: BARON_NASHOR, DRAGON, RIFTHERALD
        const isEpicObjective =
          event.monsterType === "BARON_NASHOR" ||
          event.monsterType === "DRAGON" ||
          event.monsterType === "RIFTHERALD";

        if (!isEpicObjective) return;

        // Detectar steal: el killer pertenece a un equipo diferente al que controlaba el objetivo
        // Nota: En el timeline, el objetivo no tiene "teamId" explícito, pero podemos inferir
        // que fue robado si el killer no es del equipo que lo estaba bajando
        // Para simplificar, contamos cualquier kill de objetivo épico como potencial steal
        // si el killer tiene baja participación en daño al objetivo (esto requeriría más análisis)

        // Por ahora, registramos todos los kills de objetivos épicos
        // En una versión mejorada, verificaríamos el daño previo
        if (
          typeof event.killerId === "number" &&
          stealsMap.hasOwnProperty(event.killerId)
        ) {
          stealsMap[event.killerId]++;
        }
      }
    });
  });

  return stealsMap;
}
