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
      error
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
  8300: "7204_Resolve",
  8400: "7203_Whimsy",
};

export function getQueueName(queueId: number): string {
  const queueNames: Record<number, string> = {
    400: "Normales",
    420: "SoloQ",
    430: "Normales",
    440: "Flex",
    450: "ARAM",
    700: "Clash",
    900: "URF",
  };
  return queueNames[queueId] || `Queue ${queueId}`;
}

export function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Hace poco";
  if (diffMins < 60) return `Hace ${diffMins}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString("es-ES");
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function getChampionImageUrl(
  championName: string,
  version: string = FALLBACK_VERSION
): string {
  if (championName === "FiddleSticks") championName = "Fiddlesticks";
  const resolvedVersion = resolveVersion(version);
  return `https://ddragon.leagueoflegends.com/cdn/${resolvedVersion}/img/champion/${championName}.png`;
}

export function getItemImageUrl(
  itemId: number,
  version: string = FALLBACK_VERSION
): string {
  if (itemId === 0) return "";
  const resolvedVersion = resolveVersion(version);
  return `https://ddragon.leagueoflegends.com/cdn/${resolvedVersion}/img/item/${itemId}.png`;
}

export function getSummonerSpellUrl(
  summonerId: number,
  version: string = FALLBACK_VERSION
): string {
  if (summonerId === 0) return "";
  const resolvedVersion = resolveVersion(version);
  const spellName = SUMMONER_SPELL_MAP[summonerId];
  if (!spellName) {
    console.warn(
      `[getSummonerSpellUrl] Summoner spell ID ${summonerId} not found in map`
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
