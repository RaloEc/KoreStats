/**
 * Mapeo de rangos a imágenes de emblemas de Riot Games
 * Utiliza CommunityDragon como fuente de imágenes
 */

export type RiotTier =
  | "IRON"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "EMERALD"
  | "DIAMOND"
  | "MASTER"
  | "GRANDMASTER"
  | "CHALLENGER"
  | "UNRANKED";

/**
 * Obtiene la URL del emblema de rango desde CommunityDragon
 *
 * @param tier - Tier del jugador (ej: 'GOLD', 'PLATINUM')
 * @returns URL del emblema o placeholder si es UNRANKED
 */
export function getRankEmblemUrl(tier: RiotTier | string): string {
  const normalizedTier = (tier || "UNRANKED").toUpperCase() as RiotTier;

  if (normalizedTier === "UNRANKED") {
    // Placeholder gris para UNRANKED
    return "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/unranked.png";
  }

  const tierLower = normalizedTier.toLowerCase();
  // Esta fuente está mejor recortada (llena más el lienzo)
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/${tierLower}.png`;
}

/**
 * Obtiene el color del tier para uso en UI
 *
 * @param tier - Tier del jugador
 * @returns Color en formato hex o tailwind
 */
export function getTierColor(tier: RiotTier | string): string {
  const normalizedTier = (tier || "UNRANKED").toUpperCase() as RiotTier;

  const tierColors: Record<RiotTier, string> = {
    IRON: "#a09b8c",
    BRONZE: "#cd7f32",
    SILVER: "#c0c0c0",
    GOLD: "#ffd700",
    PLATINUM: "#e5e4e2",
    EMERALD: "#00cf80",
    DIAMOND: "#b9f2ff",
    MASTER: "#9d4edd",
    GRANDMASTER: "#ff0000",
    CHALLENGER: "#0099ff",
    UNRANKED: "#808080",
  };

  return tierColors[normalizedTier] || tierColors.UNRANKED;
}

/**
 * Obtiene el nombre legible del tier
 *
 * @param tier - Tier del jugador
 * @returns Nombre formateado (ej: 'Gold', 'Platinum')
 */
export function getTierDisplayName(tier: RiotTier | string): string {
  const normalizedTier = (tier || "UNRANKED").toUpperCase() as RiotTier;
  return normalizedTier.charAt(0) + normalizedTier.slice(1).toLowerCase();
}

/**
 * Calcula el porcentaje de winrate
 *
 * @param wins - Victorias
 * @param losses - Derrotas
 * @returns Porcentaje de winrate (0-100)
 */
export function calculateWinrate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

/**
 * Obtiene el color del winrate basado en el porcentaje
 *
 * @param winrate - Porcentaje de winrate
 * @returns Clase de Tailwind para el color
 */
export function getWinrateColor(winrate: number): string {
  if (winrate >= 55) return "bg-green-600";
  if (winrate >= 50) return "bg-green-500";
  if (winrate >= 45) return "bg-yellow-500";
  return "bg-red-500";
}

/**
 * Mapeo de tier a número para ordenamiento
 */
export const TIER_RANK_MAP: Record<RiotTier, number> = {
  CHALLENGER: 10,
  GRANDMASTER: 9,
  MASTER: 8,
  DIAMOND: 7,
  EMERALD: 6,
  PLATINUM: 5,
  GOLD: 4,
  SILVER: 3,
  BRONZE: 2,
  IRON: 1,
  UNRANKED: 0,
};

/**
 * Obtiene el rango numérico del tier
 *
 * @param tier - Tier del jugador
 * @returns Número del 0 al 9
 */
export function getTierRank(tier: RiotTier | string): number {
  const normalizedTier = (tier || "UNRANKED").toUpperCase() as RiotTier;
  return TIER_RANK_MAP[normalizedTier] || 0;
}
