import type { MatchTag } from "@/lib/riot/match-analyzer";

/**
 * Tier de rendimiento basado en los tags de la partida
 */
export type PerformanceTier = "S" | "A" | "B" | "C";

/**
 * Determina el tier de rendimiento basado en los tags de análisis de la partida
 */
export function getPerformanceTier(tags: MatchTag[]): PerformanceTier {
  // Tags de tier S (rendimiento excepcional)
  const sTierTags: MatchTag[] = ["PentaKill", "QuadraKill", "MVP", "Stomper"];

  // Tags de tier A (buen rendimiento)
  const aTierTags: MatchTag[] = [
    "TripleKill",
    "Destructor",
    "PrimeraSangre",
    "Duelista",
    "FuriaTemprana",
    "Demoledor",
  ];

  // Tags de tier B (rendimiento decente)
  const bTierTags: MatchTag[] = [
    "DobleKill",
    "Farmeador",
    "DiosDelCS",
    "Visionario",
    "SoloKill",
    "Muralla",
    "Titan",
  ];

  // Contar tags por tier
  const sCount = tags.filter((tag) => sTierTags.includes(tag)).length;
  const aCount = tags.filter((tag) => aTierTags.includes(tag)).length;
  const bCount = tags.filter((tag) => bTierTags.includes(tag)).length;

  // Determinar tier basado en la cantidad y calidad de tags
  if (sCount >= 1) return "S"; // Al menos 1 tag S-tier
  if (aCount >= 2) return "A"; // Al menos 2 tags A-tier
  if (aCount >= 1 || bCount >= 2) return "B"; // 1 A-tier o 2+ B-tier
  return "C"; // Rendimiento básico
}

/**
 * Obtiene un skin ID basado en el tier de rendimiento
 * Usa el matchId como semilla para consistencia
 */
export function getPerformanceBasedSkinId(
  performanceTier: PerformanceTier,
  matchId: string
): number {
  // Pools de skins por tier
  const skinPools: Record<PerformanceTier, number[]> = {
    S: [5, 6, 7, 8, 9, 10], // Skins épicas/legendarias (números más altos)
    A: [3, 4, 5, 6], // Skins épicas
    B: [1, 2, 3], // Skins comunes
    C: [0, 1], // Skin base o primera skin
  };

  const pool = skinPools[performanceTier];

  // Generar índice consistente basado en matchId
  const hash = hashString(matchId);
  const index = hash % pool.length;

  return pool[index];
}

/**
 * Función hash simple para generar un número consistente desde un string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Obtiene el skin ID para una partida
 * En el futuro, esto puede verificar primero las preferencias del usuario (feature premium)
 */
export function getSkinIdForMatch(
  tags: MatchTag[],
  matchId: string,
  userPreference?: number // Para feature premium futura
): number {
  // Si hay preferencia del usuario (feature premium), usar esa
  if (userPreference !== undefined && userPreference >= 0) {
    return userPreference;
  }

  // Sino, basarse en rendimiento
  const tier = getPerformanceTier(tags);
  return getPerformanceBasedSkinId(tier, matchId);
}

/**
 * Obtiene información sobre el tier de rendimiento para mostrar al usuario
 */
export function getPerformanceTierInfo(tier: PerformanceTier): {
  label: string;
  description: string;
  color: string;
  emoji: string;
} {
  const tierInfo = {
    S: {
      label: "Legendario",
      description: "Rendimiento excepcional",
      color: "text-amber-500",
      emoji: "👑",
    },
    A: {
      label: "Épico",
      description: "Excelente rendimiento",
      color: "text-purple-500",
      emoji: "⭐",
    },
    B: {
      label: "Sólido",
      description: "Buen rendimiento",
      color: "text-blue-500",
      emoji: "💎",
    },
    C: {
      label: "Estándar",
      description: "Rendimiento básico",
      color: "text-slate-500",
      emoji: "🎮",
    },
  };

  return tierInfo[tier];
}
