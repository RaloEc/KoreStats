/**
 * Helper functions for Riot API Data Dragon URLs
 */

export const FALLBACK_VERSION = "16.1.1";

/**
 * Obtiene la última versión disponible de DataDragon
 * Consulta: https://ddragon.leagueoflegends.com/api/versions.json
 * La primera posición del array contiene la versión más reciente
 *
 * @returns Última versión de DataDragon o FALLBACK_VERSION si hay error
 */
export async function getLatestDDragonVersion(): Promise<string> {
  try {
    const response = await fetch(
      "https://ddragon.leagueoflegends.com/api/versions.json",
      {
        next: { revalidate: 3600 }, // Cache por 1 hora
      }
    );

    if (!response.ok) {
      throw new Error(
        `Error al obtener versiones de DDragon: ${response.status}`
      );
    }

    const versions: string[] = await response.json();
    if (Array.isArray(versions) && versions.length > 0) {
      availableVersions = versions;
      return versions[0];
    }
    return FALLBACK_VERSION;
  } catch (error) {
    console.error("[getLatestDDragonVersion] Fallback activado", error);
    return FALLBACK_VERSION;
  }
}

const VERSION_CACHE_TTL = 1000 * 60 * 60; // 1 hora
let cachedLatestVersion = FALLBACK_VERSION;
let lastVersionFetch = 0;
let refreshPromise: Promise<void> | null = null;
let availableVersions: string[] = [];

async function refreshLatestVersionCache(force = false) {
  const shouldRefresh =
    force ||
    !lastVersionFetch ||
    Date.now() - lastVersionFetch > VERSION_CACHE_TTL;

  if (!shouldRefresh && cachedLatestVersion) {
    return;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const latest = await getLatestDDragonVersion();
        cachedLatestVersion = formatGameVersion(latest);
        lastVersionFetch = Date.now();
      } catch (error) {
        console.error(
          "[riot/helpers] No se pudo refrescar la versión de DDragon",
          error
        );
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

function findClosestAvailableVersion(version: string): string | null {
  if (!version) {
    return null;
  }

  if (availableVersions.length === 0) {
    return cachedLatestVersion || version;
  }

  if (availableVersions.includes(version)) {
    return version;
  }

  const [major, minor] = version.split(".");
  const prefix = `${major}.${minor}.`;
  const matchedVersion = availableVersions.find((v) => v.startsWith(prefix));

  if (matchedVersion) {
    return matchedVersion;
  }

  return cachedLatestVersion || availableVersions[0] || null;
}

function resolveAssetVersion(gameVersion?: string) {
  if (gameVersion) {
    const normalized = formatGameVersion(gameVersion);
    const availableVersion = findClosestAvailableVersion(normalized);
    if (availableVersion) {
      return formatGameVersion(availableVersion);
    }
  }
  refreshLatestVersionCache();
  return cachedLatestVersion;
}

export function resolveDDragonAssetVersion(gameVersion?: string): string {
  return resolveAssetVersion(gameVersion);
}

// Lanzar una actualización inicial sin bloquear
void refreshLatestVersionCache(true);

/**
 * Extracts the major.minor.patch version from a full version string.
 * Example: "15.23.1.5678" -> "15.23.1"
 */
export function formatGameVersion(version: string): string {
  if (!version) return FALLBACK_VERSION;
  const parts = version.split(".");
  if (parts.length >= 3) {
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }
  if (parts.length === 2) {
    return `${parts[0]}.${parts[1]}.1`;
  }
  return FALLBACK_VERSION;
}

export function getChampionImg(name: string, gameVersion?: string) {
  const version = resolveAssetVersion(gameVersion);
  const championName = name === "FiddleSticks" ? "Fiddlesticks" : name;
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`;
}

export function getItemImg(id: number, gameVersion?: string) {
  if (!id) return null;
  const version = resolveAssetVersion(gameVersion);
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${id}.png`;
}

export function normalizeSpellAssetName(
  spellName?: string | null
): string | null {
  if (!spellName) {
    return null;
  }
  return spellName === "SummonerCleanse" ? "SummonerBoost" : spellName;
}

export function getSpellImg(id: number, gameVersion?: string) {
  const version = resolveAssetVersion(gameVersion);
  const spells: Record<number, string> = {
    1: "SummonerBoost",
    3: "SummonerExhaust",
    4: "SummonerFlash",
    6: "SummonerHaste",
    7: "SummonerHeal",
    11: "SummonerSmite",
    12: "SummonerTeleport",
    13: "SummonerMana", // Clarity
    14: "SummonerDot", // Ignite
    21: "SummonerBarrier",
    30: "SummonerPoroRecall",
    31: "SummonerPoroThrow",
    32: "SummonerSnowball",
    39: "SummonerSnowURFSnowball_Mark",
  };
  const rawSpellName = spells[id] ?? (id === 1 ? "SummonerBoost" : null);
  const spellName = normalizeSpellAssetName(rawSpellName);

  return spellName
    ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spellName}.png`
    : null;
}

/**
 * Obtiene la URL del splash art de un campeón desde Community Dragon
 *
 * @param championId - ID del campeón
 * @param skinId - ID de la skin (default: 0 para skin base)
 * @returns URL del splash art centrado del campeón
 */
export async function getChampionSplashArt(
  championId: number,
  skinId: number = 0
): Promise<string> {
  const version = await getLatestDDragonVersion();
  return `https://cdn.communitydragon.org/${version}/champion/${championId}/splash-art/centered/skin/${skinId}`;
}

/**
 * Obtiene la URL de la imagen de una runa primaria/secundaria
 * Mapea IDs de runas a sus nombres
 *
 * @param perkId - ID de la runa (ej: 8112 para Precision)
 * @returns URL de la imagen de la runa
 */
const RUNE_STYLE_BASE_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles";

const RUNE_STYLE_IMAGES: Record<number, string> = {
  8000: "7201_precision.png",
  8100: "7200_domination.png",
  8200: "7202_sorcery.png",
  8300: "7203_whimsy.png",
  8400: "7204_resolve.png",
};

export function getRuneStyleImg(perkId: number | null): string | null {
  if (!perkId) return null;
  const file = RUNE_STYLE_IMAGES[perkId];
  if (!file) return null;
  return `${RUNE_STYLE_BASE_URL}/${file}`;
}

export function getPerkImg(perkId: number | null): string | null {
  if (!perkId) return null;
  return `https://cdn.communitydragon.org/latest/perk/${perkId}`;
}

/**
 * Cache para mapear IDs de campeones a nombres
 */
let championIdToNameCache: Record<number, string> = {};
let championCacheTime = 0;
const CHAMPION_CACHE_TTL = 1000 * 60 * 60; // 1 hora

/**
 * Obtiene el nombre del campeón a partir de su ID
 * Utiliza caché para evitar múltiples llamadas a la API
 *
 * @param championId - ID del campeón
 * @returns Nombre del campeón o null si no se encuentra
 */
export async function getChampionNameById(
  championId: number
): Promise<string | null> {
  try {
    // Verificar si está en caché y es válido
    if (
      championIdToNameCache[championId] &&
      Date.now() - championCacheTime < CHAMPION_CACHE_TTL
    ) {
      return championIdToNameCache[championId];
    }

    // Si el caché está vacío o expirado, obtener datos de DDragon
    if (Object.keys(championIdToNameCache).length === 0) {
      const version = await getLatestDDragonVersion();
      const response = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${version}/data/es_MX/champion.json`,
        {
          next: { revalidate: 3600 }, // Cache por 1 hora
        }
      );

      if (!response.ok) {
        console.error(
          "[getChampionNameById] Error fetching champion data:",
          response.status
        );
        return null;
      }

      const data = await response.json();

      // Construir mapa de ID a nombre
      if (data.data) {
        Object.entries(data.data).forEach((entry: any) => {
          const championData = entry[1];
          const id = parseInt(championData.key);
          championIdToNameCache[id] = championData.id;
        });
      }

      championCacheTime = Date.now();
    }

    return championIdToNameCache[championId] || null;
  } catch (error) {
    console.error("[getChampionNameById] Error:", error);
    return null;
  }
}

/**
 * Obtiene el nombre legible de la cola (queue) basado en su ID
 *
 * @param queueId - ID de la cola (ej: 420 para SoloQ)
 * @returns Nombre legible de la cola (SoloQ, Flex, ARAM, URF, Evento, etc.)
 */
export function getQueueName(queueId: number): string {
  const queueMap: Record<number, string> = {
    420: "SoloQ",
    440: "Flex",
    450: "ARAM",
    400: "Normal Draft",
    430: "Normal Blind",
    490: "Quickplay",
    700: "Clash",
    900: "URF",
    1010: "URF",
    1900: "URF",
    1700: "Arena",
    // Bots
    830: "Co-op vs AI (Intro)",
    840: "Co-op vs AI (Beginner)",
    850: "Co-op vs AI (Intermediate)",
  };

  return queueMap[queueId] || "Evento";
}
