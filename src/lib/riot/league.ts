/**
 * Funciones para consultar y almacenar datos de ranking desde League-V4
 * NOTA: updateMatchRankings debe ser llamado desde un Route Handler o Server Action
 */

interface LeagueEntry {
  summonerId: string;
  summonerName: string;
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

/**
 * Obtiene la información de ranking de un jugador desde Riot League-V4
 * Con reintentos automáticos para rate limiting (429)
 *
 * @param puuid - PUUID encriptado del jugador
 * @param platformRegion - Región de plataforma (ej: 'la1')
 * @param apiKey - API Key de Riot
 * @param summonerId - ID de invocador (opcional)
 * @param retries - Número de reintentos (default: 3)
 * @returns Array de entradas de ranking (puede haber múltiples colas)
 */
export async function getPlayerRanking(
  puuid: string,
  platformRegion: string,
  apiKey: string,
  summonerId?: string,
  retries: number = 3
): Promise<LeagueEntry[]> {
  try {
    const url = `https://${platformRegion}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await fetch(url, {
        headers: {
          "X-Riot-Token": apiKey,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const entries: LeagueEntry[] = await response.json();
        return entries;
      }

      // Rate limit: esperar y reintentar
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.pow(2, attempt) * 1000;

        console.warn(
          `[getPlayerRanking] Rate limit (429) para ${puuid}. Reintentando en ${waitTime}ms (intento ${
            attempt + 1
          }/${retries})`
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // Otros errores
      if (!response.ok) {
        console.warn(
          `[getPlayerRanking] Error ${response.status} para ${puuid}`
        );
        return [];
      }
    }

    console.warn(`[getPlayerRanking] Se agotaron los reintentos para ${puuid}`);
    return [];
  } catch (error: any) {
    console.error(`[getPlayerRanking] Error para ${puuid}:`, error.message);
    return [];
  }
}

/**
 * Actualiza los snapshots de ranking en match_participant_ranks
 * Consulta League-V4 y guarda los datos en BD
 * DEBE ser llamado desde un Route Handler o Server Action
 *
 * @param matchId - ID de la partida
 * @param participants - Array de participantes con summonerId
 * @param platformRegion - Región de plataforma
 * @param apiKey - API Key de Riot
 * @param supabaseClient - Cliente de Supabase (desde server)
 */
export async function updateMatchRankings(
  matchId: string,
  participants: Array<{ puuid: string; summonerId: string }>,
  platformRegion: string,
  apiKey: string,
  supabaseClient: any
): Promise<void> {
  try {
    console.log(
      `[updateMatchRankings] Iniciando actualización para matchId: ${matchId}, ${participants.length} participantes`
    );

    for (const participant of participants) {
      if (!participant.puuid) {
        console.warn(
          `[updateMatchRankings] Participante sin puuid: ${participant.summonerId}`
        );
        continue;
      }

      console.log(
        `[updateMatchRankings] Consultando ranking para puuid: ${participant.puuid}`
      );

      // Obtener ranking actual usando summonerId (con fallback a PUUID)
      const rankings = await getPlayerRanking(
        participant.puuid,
        platformRegion,
        apiKey,
        participant.summonerId
      );

      console.log(
        `[updateMatchRankings] Rankings obtenidos para ${participant.puuid}:`,
        rankings
      );

      // Buscar entradas de SoloQ y Flex
      const soloQRanking = rankings.find(
        (r) => r.queueType === "RANKED_SOLO_5x5"
      );
      const flexRanking = rankings.find(
        (r) => r.queueType === "RANKED_FLEX_SR"
      );

      if (!soloQRanking && !flexRanking) {
        console.warn(
          `[updateMatchRankings] No se encontró ranking competitivo para ${participant.puuid}. Rankings disponibles:`,
          rankings.map((r) => r.queueType)
        );
      }

      const updatePayload: Record<string, any> = {};

      if (soloQRanking) {
        console.log(
          `[updateMatchRankings] SoloQ: ${soloQRanking.tier} ${soloQRanking.rank}`
        );
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
        console.log(
          `[updateMatchRankings] Flex: ${flexRanking.tier} ${flexRanking.rank}`
        );
        Object.assign(updatePayload, {
          flex_tier: flexRanking.tier,
          flex_rank: flexRanking.rank,
          flex_league_points: flexRanking.leaguePoints,
          flex_wins: flexRanking.wins,
          flex_losses: flexRanking.losses,
        });
      }

      if (Object.keys(updatePayload).length > 0) {
        const { error } = await supabaseClient
          .from("match_participant_ranks")
          .update(updatePayload)
          .eq("match_id", matchId)
          .eq("puuid", participant.puuid);

        if (error) {
          console.error(
            `[updateMatchRankings] Error al actualizar ranking para ${participant.puuid}:`,
            error
          );
        } else {
          console.log(
            `[updateMatchRankings] ✅ Ranking actualizado para ${participant.puuid}`
          );
        }
      }

      // Delay entre solicitudes para respetar rate limits de Riot
      // Riot permite ~20 requests/segundo, así que 500ms es seguro
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(
      `[updateMatchRankings] ✅ Rankings actualizados para ${matchId}`
    );
  } catch (error: any) {
    console.error("[updateMatchRankings] Error:", error.message, error.stack);
  }
}

/**
 * Mapea tier + rank a un badge legible
 */
const tierTranslations: Record<string, string> = {
  IRON: "Hierro",
  BRONZE: "Bronce",
  SILVER: "Plata",
  GOLD: "Oro",
  PLATINUM: "Platino",
  EMERALD: "Esmeralda",
  DIAMOND: "Diamante",
  MASTER: "Maestro",
  GRANDMASTER: "Gran Maestro",
  CHALLENGER: "Retador",
};

export function formatRankBadge(
  tier: string | null,
  rank: string | null
): string {
  if (!tier) return "Sin rango";

  const normalizedTier = tier.toUpperCase();
  const tierLabel =
    tierTranslations[normalizedTier] ||
    normalizedTier.charAt(0) + normalizedTier.slice(1).toLowerCase();

  if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(normalizedTier)) {
    return tierLabel;
  }

  return `${tierLabel} ${rank || ""}`.trim();
}

/**
 * Obtiene o actualiza el rango de un jugador desde caché o Riot API
 */
export async function getOrUpdateSummonerRank(
  puuid: string,
  platformRegion: string,
  apiKey: string
): Promise<{
  tier: string | null;
  rank: string | null;
  league_points: number;
  wins: number;
  losses: number;
} | null> {
  try {
    const supabase = require("@/lib/supabase/server").getServiceClient();

    // 1. Intentar obtener del caché (tabla summoners)
    const { data: cachedSummoner, error: cacheError } = await supabase
      .from("summoners")
      .select("summoner_id, tier, rank, league_points, wins, losses, rank_updated_at")
      .eq("puuid", puuid)
      .single();

    // Si existe en caché y fue actualizado hace menos de 1 hora, usarlo
    if (cachedSummoner && cachedSummoner.rank_updated_at) {
      const lastUpdate = new Date(cachedSummoner.rank_updated_at).getTime();
      const now = Date.now();
      const oneHourMs = 60 * 60 * 1000;

      if (now - lastUpdate < oneHourMs) {
        console.log(
          `[getOrUpdateSummonerRank] Usando caché para ${puuid}: ${cachedSummoner.tier} ${cachedSummoner.rank}`
        );
        return {
          tier: cachedSummoner.tier,
          rank: cachedSummoner.rank,
          league_points: cachedSummoner.league_points || 0,
          wins: cachedSummoner.wins || 0,
          losses: cachedSummoner.losses || 0,
        };
      }
    }

    // 2. Si no está en caché o está desactualizado, consultar Riot API
    console.log(`[getOrUpdateSummonerRank] Consultando Riot API para ${puuid}`);
    const rankings = await getPlayerRanking(
      puuid,
      platformRegion,
      apiKey,
      cachedSummoner?.summoner_id
    );

    if (!rankings || rankings.length === 0) {
      console.warn(
        `[getOrUpdateSummonerRank] No se encontró ranking para ${puuid}`
      );
      return null;
    }

    // Buscar SoloQ ranking (prioridad)
    const soloQRanking = rankings.find(
      (r) => r.queueType === "RANKED_SOLO_5x5"
    );

    if (!soloQRanking) {
      console.warn(
        `[getOrUpdateSummonerRank] No se encontró SoloQ para ${puuid}`
      );
      return null;
    }

    // 3. Actualizar caché en tabla summoners
    const updatePayload = {
      puuid,
      tier: soloQRanking.tier,
      rank: soloQRanking.rank,
      league_points: soloQRanking.leaguePoints,
      wins: soloQRanking.wins,
      losses: soloQRanking.losses,
      rank_updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("summoners")
      .upsert(updatePayload, { onConflict: "puuid" });

    if (updateError) {
      console.warn(
        `[getOrUpdateSummonerRank] Error al actualizar caché para ${puuid}:`,
        updateError.message
      );
    } else {
      console.log(
        `[getOrUpdateSummonerRank] ✅ Caché actualizado para ${puuid}: ${soloQRanking.tier} ${soloQRanking.rank}`
      );
    }

    return {
      tier: soloQRanking.tier,
      rank: soloQRanking.rank,
      league_points: soloQRanking.leaguePoints,
      wins: soloQRanking.wins,
      losses: soloQRanking.losses,
    };
  } catch (error: any) {
    console.error(
      `[getOrUpdateSummonerRank] Error para ${puuid}:`,
      error.message
    );
    return null;
  }
}

/**
 * Obtiene el color del tier para UI
 */
export function getTierColor(tier: string | null): string {
  if (!tier) {
    return "text-slate-400";
  }

  const normalizedTier = tier.toUpperCase();

  switch (normalizedTier) {
    case "IRON":
      return "text-gray-600";
    case "BRONZE":
      return "text-amber-700";
    case "SILVER":
      return "text-gray-400";
    case "GOLD":
      return "text-yellow-500";
    case "PLATINUM":
      return "text-cyan-400";
    case "EMERALD":
      return "text-emerald-400";
    case "DIAMOND":
      return "text-blue-500";
    case "MASTER":
    case "GRANDMASTER":
    case "CHALLENGER":
      return "text-red-500";
    default:
      return "text-slate-400";
  }
}
