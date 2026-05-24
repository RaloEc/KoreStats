/**
 * Sincronización de estadísticas de Riot Games
 *
 * Este módulo obtiene información actualizada del jugador desde la API de Riot
 * incluyendo: shard activo, nivel, ícono, rango, puntos de liga, etc.
 */

// Utilidades relacionadas con Riot

export interface QueueRankSnapshot {
  tier: string;
  rank: string | null;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface RiotSyncResult {
  success: boolean;
  data?: {
    activeShard: string;
    summonerId: string;
    summonerLevel: number;
    profileIconId: number;
    soloRank: QueueRankSnapshot;
    flexRank: QueueRankSnapshot;
  };
  error?: string;
}

const UNRANKED_SNAPSHOT: QueueRankSnapshot = {
  tier: "UNRANKED",
  rank: null,
  leaguePoints: 0,
  wins: 0,
  losses: 0,
};

/**
 * Sincroniza las estadísticas del jugador desde la API de Riot
 *
 * Proceso:
 * 1. Usa la región almacenada (platformId) como fuente de verdad
 * 2. Obtiene datos del invocador (nivel, ícono)
 * 3. Obtiene información de rango (tier, rank, LP, W/L)
 * 4. Retorna toda la información
 *
 * @param puuid - PUUID del jugador
 * @param accessToken - Access token de Riot API
 * @param platformId - ID de plataforma/región (ej: 'la1', 'euw1', 'kr') - fuente de verdad desde BD
 * @returns Resultado con datos sincronizados o error
 */
export async function syncRiotStats(
  puuid: string,
  accessToken: string,
  platformId: string = "na1"
): Promise<RiotSyncResult> {
  try {

    if (!platformId) {
      throw new Error("PlatformId (región) no proporcionado");
    }

    const authHeaders = buildRiotAuthHeaders(accessToken);


    // PASO 2: Obtener datos del invocador
    const summonerData = await getSummonerData(puuid, platformId, authHeaders);

    if (!summonerData) {
      throw new Error("No se pudo obtener datos del invocador");
    }


    // PASO 3: Obtener información de rango (usando PUUID, ya que summonerId está deprecado)
    const rankData = await getRankData(puuid, platformId, authHeaders);

    // PASO 4: Compilar resultado
    const result: RiotSyncResult = {
      success: true,
      data: {
        activeShard: platformId,
        // Usamos el id de summoner solo si lo devuelve, caso contrario un string vacío o el puuid como fallback seguro
        summonerId: summonerData.id || "",
        summonerLevel: summonerData.summonerLevel,
        profileIconId: summonerData.profileIconId,
        soloRank: rankData.solo,
        flexRank: rankData.flex,
      },
    };

    return result;
  } catch (error: any) {
    console.error("[syncRiotStats] Error durante sincronización:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Obtiene datos del invocador (nivel, ícono, ID)
 *
 * Consulta: https://{activeShard}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}
 *
 * @param puuid - PUUID del jugador
 * @param activeShard - Shard activo
 * @returns Datos del invocador
 */
async function getSummonerData(
  puuid: string,
  activeShard: string,
  headers: Record<string, string>
): Promise<{
  id: string;
  summonerLevel: number;
  profileIconId: number;
} | null> {
  try {
    const url = `https://${activeShard}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
    const maskedKey = headers["X-Riot-Token"] ? `${headers["X-Riot-Token"].substring(0, 6)}...${headers["X-Riot-Token"].slice(-4)}` : "MISSING";
    console.log(`[getSummonerData] Fetching: ${url} with key ${maskedKey}`);


    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getSummonerData] Error de Riot (Status ${response.status}):`, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.status?.message || "Failed to get summoner data");
      } catch (e) {
        throw new Error(`Riot API Error ${response.status}: ${errorText}`);
      }
    }

    const data = await response.json();
    console.log(`[getSummonerData] Data received keys: ${Object.keys(data).join(", ")}`);
    
    // Riot API v4 deprecated the id field (summonerId) for by-puuid endpoint on Feb 26, 2025.
    const summonerId = data.id || data.summonerId || data.summoner_id || "";
    
    if (!summonerId) {
      console.warn("[getSummonerData] Riot response is missing a valid summoner ID field. Continuing without it.");
    }

    return {
      id: summonerId,
      summonerLevel: data.summonerLevel || 0,
      profileIconId: data.profileIconId || 0,
    };
  } catch (error: any) {
    console.error("[getSummonerData] Error:", error);
    throw error;
  }
}

/**
 * Obtiene información de rango del jugador
 *
 * Consulta: https://{platformId}.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}
 *
 * Filtra por queueType === 'RANKED_SOLO_5x5'
 * Si no hay datos de rango, retorna UNRANKED
 *
 * @param puuid - PUUID del jugador
 * @param platformId - Shard/plataforma (ej: la1)
 * @returns Información de rango
 */
async function getRankData(
  puuid: string,
  platformId: string,
  headers: Record<string, string>
): Promise<{
  solo: QueueRankSnapshot;
  flex: QueueRankSnapshot;
}> {
  const mapEntry = (entry: any | undefined): QueueRankSnapshot =>
    entry
      ? {
          tier: entry.tier,
          rank: entry.rank,
          leaguePoints: entry.leaguePoints,
          wins: entry.wins,
          losses: entry.losses,
        }
      : { ...UNRANKED_SNAPSHOT };

  try {
    const url = `https://${platformId}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
    const maskedKey = headers["X-Riot-Token"] ? `${headers["X-Riot-Token"].substring(0, 6)}...${headers["X-Riot-Token"].slice(-4)}` : "MISSING";
    console.log(`[getRankData] Fetching: ${url} with key ${maskedKey}`);


    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    // Si el usuario no tiene datos de rango (404), retorna UNRANKED
    if (response.status === 404) {
      console.log(
        "[getRankData] Usuario sin datos de rango (404) - Retornando UNRANKED"
      );
      return {
        solo: { ...UNRANKED_SNAPSHOT },
        flex: { ...UNRANKED_SNAPSHOT },
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getRankData] Error de Riot (Status ${response.status}):`, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.status?.message || "Failed to get rank data");
      } catch (e) {
        throw new Error(`Riot API Error ${response.status}: ${errorText}`);
      }
    }

    const data = await response.json();

    // Filtrar por RANKED_SOLO_5x5
    const soloRankData = data.find(
      (entry: any) => entry.queueType === "RANKED_SOLO_5x5"
    );
    const flexRankData = data.find(
      (entry: any) => entry.queueType === "RANKED_FLEX_SR"
    );


    return {
      solo: mapEntry(soloRankData),
      flex: mapEntry(flexRankData),
    };
  } catch (error: any) {
    console.error("[getRankData] Error:", error);

    // Si hay error, retorna UNRANKED como fallback
    console.log(
      "[getRankData] Error al obtener datos de rango - Retornando UNRANKED"
    );
    return {
      solo: { ...UNRANKED_SNAPSHOT },
      flex: { ...UNRANKED_SNAPSHOT },
    };
  }
}

/**
 * Determina la región de enrutamiento basada en el shard
 *
 * @param activeShard - Shard activo (ej: 'la1', 'euw1', 'kr')
 * @returns Región de enrutamiento (ej: 'americas', 'europe', 'asia')
 */
export function getRoutingRegionFromShard(activeShard: string): string {
  const regionMap: Record<string, string> = {
    la1: "americas",
    la2: "americas",
    br1: "americas",
    na1: "americas",
    euw1: "europe",
    eun1: "europe",
    kr: "asia",
    ru: "europe",
    tr1: "europe",
    jp1: "asia",
    vn2: "sea",
    ph2: "sea",
    sg2: "sea",
    th2: "sea",
  };

  return regionMap[activeShard] || "americas";
}

function buildRiotAuthHeaders(token: string): Record<string, string> {
  if (!token) {
    throw new Error("RIOT_API_KEY o token de Riot no configurado");
  }

  const headers: Record<string, string> = {
    "X-Riot-Token": token,
  };

  // Solo añadir Bearer si parece un JWT válido (eyJ...)
  if (token.startsWith("eyJ") && token.split(".").length === 3) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}
