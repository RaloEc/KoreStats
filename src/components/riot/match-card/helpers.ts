/**
 * Helpers y utilidades compartidas para Match History
 */

import {
  FALLBACK_VERSION,
  getLatestDDragonVersion as getLatestDDragonVersionFromLib,
  resolveDDragonAssetVersion,
} from "@/lib/riot/helpers";

// Re-export para compatibilidad hacia atrás
export const getLatestDDragonVersion = getLatestDDragonVersionFromLib;
export { FALLBACK_VERSION };

let cachedVersion: string = FALLBACK_VERSION;
let lastVersionFetch = 0;
const VERSION_TTL_MS = 1000 * 60 * 60; // 1 hora

async function refreshCachedVersion() {
  try {
    cachedVersion = await getLatestDDragonVersionFromLib();
    lastVersionFetch = Date.now();
  } catch (error) {
    console.error(
      "[match-card/helpers] Error al refrescar versión DDragon",
      error,
    );
  }
}

function maybeRefreshVersion() {
  const now = Date.now();
  if (now - lastVersionFetch > VERSION_TTL_MS) {
    refreshCachedVersion();
  }
}

// Lanzar la primera actualización sin bloquear
void refreshCachedVersion();

function resolveVersion(version?: string) {
  if (version) {
    return resolveDDragonAssetVersion(version);
  }
  maybeRefreshVersion();
  return cachedVersion;
}

export const SUMMONER_SPELL_MAP: Record<number, string> = {
  1: "SummonerBoost",
  3: "SummonerExhaust",
  4: "SummonerFlash",
  6: "SummonerHaste",
  7: "SummonerHeal",
  11: "SummonerSmite",
  12: "SummonerTeleport",
  13: "SummonerMana",
  14: "SummonerDot",
  21: "SummonerBarrier",
  32: "SummonerSnowball",
  39: "SummonerSnowURFSnowball_Mark",
  54: "SummonerFlee",
  55: "SummonerSummonerAttack",
};

export const RUNE_STYLE_MAP: Record<number, string> = {
  8000: "7201_Precision",
  8100: "7200_Domination",
  8200: "7202_Sorcery",
  8300: "7203_Whimsy", // Inspiración
  8400: "7204_Resolve", // Valor/Resolve
};

export function getQueueName(queueId: number): string {
  const queueNames: Record<number, string> = {
    400: "Normales", // Draft Pick
    420: "SoloQ", // Ranked Solo
    430: "Normales", // Blind Pick
    440: "Flex", // Ranked Flex
    450: "ARAM", // All Random All Mid
    490: "Normales", // Quickplay
    700: "Clash", // Clash
    720: "ARAM Clash", // ARAM Clash
    900: "URF", // URF
    1020: "One For All", // One For All
    1300: "Nexus Blitz", // Nexus Blitz
    1400: "Libro de Hechizos", // Ultimate Spellbook
    1700: "Arena", // Arena
    1900: "URF", // URF
  };
  return queueNames[queueId] || `Evento (${queueId})`;
}

export function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const date = new Date(timestamp);
  const diffMs = now - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const currentYear = new Date().getFullYear();
  const matchYear = date.getFullYear();

  if (matchYear < currentYear) {
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (days >= 7) {
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  if (days > 0) return `${days}D`;
  if (hours > 0) return `${hours}H`;
  return `${Math.max(1, minutes)}m`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function getChampionImageUrl(
  championName: string,
  version: string = FALLBACK_VERSION,
): string {
  if (championName === "FiddleSticks") championName = "Fiddlesticks";
  const resolvedVersion = resolveVersion(version);
  return `https://ddragon.leagueoflegends.com/cdn/${resolvedVersion}/img/champion/${championName}.png`;
}

export function getItemImageUrl(
  itemId: number,
  version: string = FALLBACK_VERSION,
): string {
  if (itemId === 0) return "";
  const resolvedVersion = resolveVersion(version);
  return `https://ddragon.leagueoflegends.com/cdn/${resolvedVersion}/img/item/${itemId}.png`;
}

export function getSummonerSpellUrl(
  summonerId: number,
  version: string = FALLBACK_VERSION,
): string {
  if (summonerId === 0) return "";
  const resolvedVersion = resolveVersion(version);
  const spellName = SUMMONER_SPELL_MAP[summonerId];
  if (!spellName) {
    console.warn(
      `[getSummonerSpellUrl] Summoner spell ID ${summonerId} not found in map`,
    );
    return "";
  }
  return `https://ddragon.leagueoflegends.com/cdn/${resolvedVersion}/img/spell/${spellName}.png`;
}

export function getRuneIconUrl(runeStyleId: number): string {
  const styleName = RUNE_STYLE_MAP[runeStyleId];
  if (!styleName) return "";
  return `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${styleName}.png`;
}
