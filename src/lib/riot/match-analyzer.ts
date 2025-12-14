/**
 * Analizador de partidas para generar etiquetas/badges automáticas
 * Utiliza lógica matemática simple (sin IA)
 */

export type MatchTag =
  | "MVP"
  | "Stomper"
  | "Muralla"
  | "Farmeador"
  | "Visionario"
  | "Objetivos"
  | "Implacable"
  | "Titan"
  | "Demoledor"
  | "KS"
  | "Sacrificado"
  | "Ladron"
  | "Desafortunado"
  | "DiosDelCS"
  | "SoloKill"
  | "Remontada"
  | "Destructor"
  | "FuriaTemprana"
  | "MaestroDeCC"
  | "Duelista"
  | "PrimeraSangre"
  | "PentaKill"
  | "QuadraKill"
  | "TripleKill"
  | "DobleKill";

export interface MatchTagInput {
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  gameDuration: number;
  goldEarned: number;
  csPerMinute?: number;
  totalDamageDealtToChampions?: number;
  totalDamageTaken?: number;
  damageSelfMitigated?: number;
  visionScore?: number;
  wardsPlaced?: number;
  damageToObjectives?: number;
  damageToTurrets?: number;
  killParticipation?: number;
  teamDamageShare?: number;
  objectivesStolen?: number;
  role?: string | null;
  laneOpponentCsPerMinute?: number;
  laneOpponentTotalCs?: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  damagePerMinutePercentile?: number;
  goldPerMinutePercentile?: number;
  visionScorePercentile?: number;
  utilityScorePercentile?: number;
  teamContext?: TeamContext;
  criticalMistakes?: CriticalMistakeFlags;
  // Para cálculo de performance score
  teamTotalKills?: number;
  teamTotalDamage?: number;
  teamTotalGold?: number;
  // Nuevos campos para badges extendidos
  pentaKills?: number;
  quadraKills?: number;
  tripleKills?: number;
  doubleKills?: number;
  firstBloodKill?: boolean;
  totalTimeCCDealt?: number;
  soloKills?: number; // De challenges
  turretPlatesTaken?: number; // De challenges
  earlyLaningPhaseGoldExpAdvantage?: number; // De challenges (prox. Furia Temprana)
  goldDeficit?: number; // Calculado si es posible, o flag
}

export interface TeamContext {
  teamKills?: number;
  enemyKills?: number;
  teamDragons?: number;
  enemyDragons?: number;
  teamHeralds?: number;
  enemyHeralds?: number;
  teamBarons?: number;
  enemyBarons?: number;
  teamTowers?: number;
  enemyTowers?: number;
  allyLowKdaCount?: number;
  allyLowDamageShareCount?: number;
  afkAllyMinutes?: number;
  enemyEarlyFedPlayers?: number;
  mmrGap?: number;
  autofillAllies?: number;
}

export interface CriticalMistakeFlags {
  nashorThrows?: number;
  preObjectiveDeaths?: number;
  missedTeleports?: number;
}

export interface DesafortunadoAnalysis {
  awarded: boolean;
  impactScore: number;
  penaltyScore: number;
  blockers: number;
  positiveReasons: string[];
  negativeReasons: string[];
  narrative: string | null;
}

export interface MatchTagInfo {
  tag: MatchTag;
  color: string;
  label: string;
  description: string;
}

/**
 * Mapeo de tags a información visual
 */
const TAG_INFO: Record<MatchTag, MatchTagInfo> = {
  MVP: {
    tag: "MVP",
    color:
      "bg-amber-100 dark:bg-amber-200/85 text-slate-900 dark:text-slate-950",
    label: "MVP",
    description: "Mayor impacto en su equipo",
  },
  Stomper: {
    tag: "Stomper",
    color: "bg-rose-100 dark:bg-rose-200/80 text-slate-900 dark:text-slate-950",
    label: "Stomper",
    description: "Victoria aplastante",
  },
  Muralla: {
    tag: "Muralla",
    color:
      "bg-slate-200 dark:bg-slate-300/80 text-slate-900 dark:text-slate-950",
    label: "Muralla",
    description: "Tanque indestructible",
  },
  Farmeador: {
    tag: "Farmeador",
    color:
      "bg-amber-200 dark:bg-amber-200/85 text-slate-900 dark:text-slate-950",
    label: "Farmeador",
    description: "CS sobresaliente",
  },
  Visionario: {
    tag: "Visionario",
    color:
      "bg-emerald-100 dark:bg-emerald-200/85 text-slate-900 dark:text-slate-950",
    label: "Visionario",
    description: "Control total de visión",
  },
  Objetivos: {
    tag: "Objetivos",
    color: "bg-blue-100 dark:bg-blue-200/85 text-slate-900 dark:text-slate-950",
    label: "Objetivos",
    description: "Daño alto a torres/dragones",
  },
  Implacable: {
    tag: "Implacable",
    color:
      "bg-purple-100 dark:bg-fuchsia-200/85 text-slate-900 dark:text-slate-950",
    label: "Implacable",
    description: "Partida perfecta (sin muertes)",
  },
  Titan: {
    tag: "Titan",
    color:
      "bg-orange-100 dark:bg-orange-200/85 text-slate-900 dark:text-slate-950",
    label: "Titan",
    description: "Mas de un tercio del dano total del equipo",
  },
  Demoledor: {
    tag: "Demoledor",
    color:
      "bg-amber-100 dark:bg-amber-200/85 text-slate-900 dark:text-slate-950",
    label: "Demoledor",
    description: "Mas de 5000 de dano a torres",
  },
  KS: {
    tag: "KS",
    color: "bg-pink-100 dark:bg-pink-200/85 text-slate-900 dark:text-slate-950",
    label: "KS",
    description: "Muchas kills con muy poco daño real",
  },
  Sacrificado: {
    tag: "Sacrificado",
    color:
      "bg-slate-200 dark:bg-slate-200/85 text-slate-900 dark:text-slate-950",
    label: "Sacrificado",
    description: "Mas de 9 muertes pero victoria asegurada",
  },
  Ladron: {
    tag: "Ladron",
    color: "bg-red-100 dark:bg-red-200/85 text-slate-900 dark:text-slate-950",
    label: "Ladron",
    description: "Robo de objetivos epicos (Baron, Dragon, Heraldo)",
  },
  Desafortunado: {
    tag: "Desafortunado",
    color:
      "bg-slate-100 dark:bg-slate-200/80 text-slate-900 dark:text-slate-950",
    label: "Desafortunado",
    description: "Jugaste bien pero tu equipo no acompaño",
  },
  DiosDelCS: {
    tag: "DiosDelCS",
    color:
      "bg-yellow-100 dark:bg-yellow-200/85 text-slate-900 dark:text-slate-950",
    label: "Dios del CS",
    description: "Farmeo de nivel profesional",
  },
  SoloKill: {
    tag: "SoloKill",
    color: "bg-red-100 dark:bg-red-200/85 text-slate-900 dark:text-slate-950",
    label: "Solo Kill",
    description: "Eliminaciones en solitario",
  },
  Remontada: {
    tag: "Remontada",
    color: "bg-blue-100 dark:bg-blue-200/85 text-slate-900 dark:text-slate-950",
    label: "Remontada",
    description: "Victoria tras ir por debajo en oro",
  },
  Destructor: {
    tag: "Destructor",
    color:
      "bg-orange-200 dark:bg-orange-300/85 text-slate-900 dark:text-slate-950",
    label: "Destructor",
    description: "Daño masivo a campeones",
  },
  FuriaTemprana: {
    tag: "FuriaTemprana",
    color: "bg-rose-200 dark:bg-rose-300/85 text-slate-900 dark:text-slate-950",
    label: "Furia Temprana",
    description: "Dominio absoluto del early game",
  },
  MaestroDeCC: {
    tag: "MaestroDeCC",
    color:
      "bg-purple-200 dark:bg-purple-300/85 text-slate-900 dark:text-slate-950",
    label: "Maestro de CC",
    description: "Gran cantidad de control de masas aplicado",
  },
  Duelista: {
    tag: "Duelista",
    color: "bg-red-200 dark:bg-red-300/85 text-slate-900 dark:text-slate-950",
    label: "Duelista",
    description: "Múltiples victorias en 1v1",
  },
  PrimeraSangre: {
    tag: "PrimeraSangre",
    color: "bg-rose-100 dark:bg-rose-200/85 text-slate-900 dark:text-slate-950",
    label: "Primera Sangre",
    description: "Primer asesinato de la partida",
  },
  PentaKill: {
    tag: "PentaKill",
    color:
      "bg-red-500 text-white dark:bg-red-600 dark:text-white font-bold animate-pulse",
    label: "PENTA KILL",
    description: "5 asesinatos consecutivos",
  },
  QuadraKill: {
    tag: "QuadraKill",
    color: "bg-red-400 text-white dark:bg-red-500 dark:text-white font-bold",
    label: "QUADRA KILL",
    description: "4 asesinatos consecutivos",
  },
  TripleKill: {
    tag: "TripleKill",
    color:
      "bg-orange-400 text-white dark:bg-orange-500 dark:text-white font-bold",
    label: "TRIPLE KILL",
    description: "3 asesinatos consecutivos",
  },
  DobleKill: {
    tag: "DobleKill",
    color:
      "bg-amber-400 text-white dark:bg-amber-500 dark:text-white font-bold",
    label: "DOBLE KILL",
    description: "2 asesinatos consecutivos",
  },
};

/**
 * Analiza una partida y retorna un array de tags
 *
 * @param stats - Estadísticas de la partida
 * @returns Array de tags aplicables
 */
export function analyzeMatchTags(stats: MatchTagInput): MatchTag[] {
  const tags: MatchTag[] = [];

  // Calcular KDA
  const kda = calculateKDA(stats.kills, stats.deaths, stats.assists);
  const minutesPlayed = Math.max(1, stats.gameDuration / 60);
  const csPerMinute = calculateCsPerMinute(stats);
  const visionScorePerMinute =
    typeof stats.visionScore === "number"
      ? stats.visionScore / minutesPlayed
      : null;
  const killParticipation = stats.killParticipation ?? null;
  const teamDamageShare = stats.teamDamageShare ?? null;
  const durabilityScore =
    (stats.totalDamageTaken ?? 0) + (stats.damageSelfMitigated ?? 0);

  // MVP: alto KDA + impacto (KP o % daño)
  const hasHighImpact =
    (killParticipation !== null && killParticipation >= 0.65) ||
    (teamDamageShare !== null && teamDamageShare >= 0.3);

  if (kda >= 5 && hasHighImpact) {
    tags.push("MVP");
  }

  // Stomper: victoria rápida + snowball
  const goldPerMinute = stats.goldEarned / minutesPlayed;
  if (
    stats.win &&
    stats.gameDuration < 1200 &&
    (stats.kills >= 8 || goldPerMinute >= 600 || kda >= 6)
  ) {
    tags.push("Stomper");
  }

  // Muralla: tanqueo elevado
  if (durabilityScore >= 45000 && stats.deaths <= 5) {
    tags.push("Muralla");
  }

  // Farmeador: CS por minuto real
  if (shouldGrantFarmerTag(stats, csPerMinute)) {
    tags.push("Farmeador");
    // Si tiene Duelista, quitamos SoloKill para no redundar
    const index = tags.indexOf("SoloKill");
    if (index > -1) tags.splice(index, 1);
  }

  // Primera Sangre
  if (stats.firstBloodKill) {
    tags.push("PrimeraSangre");
  }

  // Multi-kills (prioridad: Penta > Quadra > Triple > Doble)
  if ((stats.pentaKills ?? 0) > 0) {
    tags.push("PentaKill");
  } else if ((stats.quadraKills ?? 0) > 0) {
    tags.push("QuadraKill");
  } else if ((stats.tripleKills ?? 0) > 0) {
    tags.push("TripleKill");
  } else if ((stats.doubleKills ?? 0) > 0) {
    tags.push("DobleKill");
  }

  const unluckyAnalysis = analyzeDesafortunado(stats);
  if (unluckyAnalysis.awarded) {
    tags.push("Desafortunado");
  }

  // Fallback para partidas sobresalientes aunque no cumplan nuevas reglas
  if (tags.length === 0) {
    if (kda > 10 || (stats.deaths === 0 && stats.kills + stats.assists >= 10)) {
      tags.push("MVP");
    } else if (shouldGrantFarmerTag(stats, csPerMinute, { fallback: true })) {
      tags.push("Farmeador");
    }
  }

  return tags;
}

/**
 * Obtiene información visual de un tag
 */
export function getTagInfo(tag: MatchTag): MatchTagInfo {
  return TAG_INFO[tag];
}

/**
 * Obtiene todos los tags con su información visual
 */
export function getTagsInfo(tags: MatchTag[]): MatchTagInfo[] {
  return tags.map((tag) => getTagInfo(tag));
}

/**
 * Calcula el KDA de una partida
 */
export function calculateKDA(
  kills: number,
  deaths: number,
  assists: number
): number {
  if (deaths === 0) {
    return kills + assists;
  }
  return (kills + assists) / deaths;
}

/**
 * Calcula CS por minuto (estimado)
 */
export function calculateCsPerMinute(stats: MatchTagInput): number {
  const totalCs =
    (stats.totalMinionsKilled ?? 0) + (stats.neutralMinionsKilled ?? 0);
  const minutesPlayed = Math.max(1, stats.gameDuration / 60);
  if (totalCs > 0) {
    return totalCs / minutesPlayed;
  }
  if (typeof stats.csPerMinute === "number") {
    return stats.csPerMinute;
  }
  return 0;
}

interface FarmerOptions {
  fallback?: boolean;
}

function shouldGrantFarmerTag(
  stats: MatchTagInput,
  csPerMinute: number,
  options: FarmerOptions = {}
): boolean {
  const role = stats.role?.toUpperCase() ?? null;
  if (role === "SUPPORT" || role === "UTILITY") {
    return false;
  }

  const laneThreshold = stats.win ? 7.5 : 8.5;
  const jungleBonus = role === "JUNGLE" ? 0.5 : 0;
  const threshold = options.fallback ? laneThreshold + 0.5 : laneThreshold;
  const meetsCs = csPerMinute >= threshold - jungleBonus;

  if (!meetsCs) {
    return false;
  }

  const opponentCs = stats.laneOpponentCsPerMinute;
  if (typeof opponentCs === "number" && opponentCs > 0) {
    const hasGap = csPerMinute >= opponentCs * 1.15;
    return hasGap;
  }

  const totalCs =
    (stats.totalMinionsKilled ?? 0) + (stats.neutralMinionsKilled ?? 0);
  const opponentTotalCs = stats.laneOpponentTotalCs ?? 0;
  if (opponentTotalCs > 0) {
    return totalCs >= opponentTotalCs * 1.15;
  }

  return true;
}

/**
 * Obtiene descripción legible de un tag
 */
export function getTagDescription(tag: MatchTag): string {
  return TAG_INFO[tag].description;
}

export function analyzeDesafortunado(
  stats: MatchTagInput
): DesafortunadoAnalysis {
  const positiveReasons: string[] = [];
  const negativeReasons: string[] = [];
  let impactScore = 0;
  let penaltyScore = 0;
  let blockers = 0;

  const kda = calculateKDA(stats.kills, stats.deaths, stats.assists);
  const killParticipation = stats.killParticipation ?? null;
  const teamDamageShare = stats.teamDamageShare ?? null;
  const role = stats.role?.toUpperCase() ?? null;

  if (kda >= 4) {
    impactScore += 2;
    positiveReasons.push(`KDA sobresaliente (${kda.toFixed(1)})`);
  }

  if (killParticipation !== null && killParticipation >= 0.55) {
    impactScore += 2;
    positiveReasons.push(
      `Participaste en ${(killParticipation * 100).toFixed(0)}% de las kills`
    );
  }

  if (teamDamageShare !== null && teamDamageShare >= 0.3) {
    impactScore += 2;
    positiveReasons.push(
      `Aportaste ${(teamDamageShare * 100).toFixed(1)}% del daño del equipo`
    );
  }

  if ((stats.damagePerMinutePercentile ?? 0) >= 0.8) {
    impactScore += 1.5;
    positiveReasons.push("Daño/minuto top del rol");
  }

  if ((stats.goldPerMinutePercentile ?? 0) >= 0.7) {
    impactScore += 1;
    positiveReasons.push("Oro por minuto por encima del percentil 70");
  }

  const isUtilityRole = role === "UTILITY" || role === "SUPPORT";
  if (isUtilityRole && (stats.visionScorePercentile ?? 0) >= 0.8) {
    impactScore += 1.5;
    positiveReasons.push("Control de visión excepcional");
  } else if ((stats.utilityScorePercentile ?? 0) >= 0.75) {
    impactScore += 1;
    positiveReasons.push("Aporte utilitario sobresaliente");
  }

  const team = stats.teamContext || {};
  if ((team.allyLowKdaCount ?? 0) > 0) {
    const value = Math.min(team.allyLowKdaCount ?? 0, 3);
    penaltyScore += value * 1.5;
    negativeReasons.push(`${value} aliados fueron feeders (KDA < 1)`);
  }

  if ((team.allyLowDamageShareCount ?? 0) > 0) {
    penaltyScore += 1;
    negativeReasons.push("Faltó daño en tu equipo");
  }

  if ((team.afkAllyMinutes ?? 0) >= 3) {
    penaltyScore += 2;
    negativeReasons.push("Hubo AFK prolongado en tu equipo");
  }

  const dragonGap = (team.enemyDragons ?? 0) - (team.teamDragons ?? 0);
  if (dragonGap >= 2) {
    penaltyScore += 1.5;
    negativeReasons.push(`Se perdieron ${dragonGap} dragones de diferencia`);
  }

  const heraldGap = (team.enemyHeralds ?? 0) - (team.teamHeralds ?? 0);
  if (heraldGap >= 1) {
    penaltyScore += 0.5;
    negativeReasons.push("El rival controló todos los heraldos");
  }

  const towerGap = (team.enemyTowers ?? 0) - (team.teamTowers ?? 0);
  if (towerGap >= 4) {
    penaltyScore += 1;
    negativeReasons.push("Gran desventaja en torres");
  }

  const killGap = (team.enemyKills ?? 0) - (team.teamKills ?? 0);
  if (killGap >= 10) {
    penaltyScore += 1;
    negativeReasons.push("Tu equipo murió 10+ veces más");
  }

  if ((team.enemyEarlyFedPlayers ?? 0) > 0) {
    penaltyScore += 1;
    negativeReasons.push("El rival snowballeó temprano");
  }

  if ((team.mmrGap ?? 0) >= 150) {
    penaltyScore += 1;
    negativeReasons.push("El matchmaking te puso con aliados de menor MMR");
  }

  if ((team.autofillAllies ?? 0) > 0) {
    penaltyScore += 0.5;
    negativeReasons.push("Hubo autofill en tu equipo");
  }

  const mistakes = stats.criticalMistakes || {};
  const mistakeScore =
    (mistakes.nashorThrows ?? 0) * 2 +
    (mistakes.preObjectiveDeaths ?? 0) * 1.5 +
    (mistakes.missedTeleports ?? 0) * 0.5;
  if (mistakeScore >= 2) {
    blockers += mistakeScore;
    negativeReasons.push(
      "Hubo errores críticos que afectan tu evaluación personal"
    );
  }

  const awarded =
    !stats.win && impactScore >= 5 && penaltyScore >= 4 && mistakeScore < 2;

  const narrative = awarded
    ? buildUnluckyNarrative(positiveReasons, negativeReasons)
    : null;

  return {
    awarded,
    impactScore,
    penaltyScore,
    blockers,
    positiveReasons,
    negativeReasons,
    narrative,
  };
}

function buildUnluckyNarrative(
  positives: string[],
  negatives: string[]
): string {
  const topPositive = positives.slice(0, 2).join(" y ");
  const topNegative = negatives.slice(0, 2).join("; ");
  return `${topPositive}, pero ${topNegative}.`;
}

/**
 * Calcula el performance score compuesto (0-120)
 * Fórmula con pesos normalizados:
 * - KDA: 0.18
 * - Kill Participation: 0.21
 * - Damage Share: 0.26
 * - Gold Share: 0.13
 * - Vision/Utility: 0.10
 * - CS Score: 0.12
 * + Bonus de victoria: +20 puntos
 *
 * @param stats - Estadísticas de la partida
 * @returns Score entre 0 y 120
 */
export function calculatePerformanceScore(stats: MatchTagInput): number {
  const minutes = Math.max(1, stats.gameDuration / 60);

  // 1. KDA Score (0-1)
  const kda = calculateKDA(stats.kills, stats.deaths, stats.assists);
  const kdaScore = Math.min(kda / 8, 1); // Normalizar con umbral de 8

  // 2. Kill Participation (0-1)
  const teamKills = stats.teamTotalKills ?? 1;
  const playerKills = stats.kills + stats.assists;
  const kpScore = Math.min(playerKills / Math.max(1, teamKills * 0.5), 1); // Clamp a 1

  // 3. Damage Share (0-1)
  const teamDamage = stats.teamTotalDamage ?? 1;
  const playerDamage = stats.totalDamageDealtToChampions ?? 0;
  const dmgShare = Math.min(playerDamage / Math.max(1, teamDamage), 1);

  // 4. Gold Share (0-1)
  const teamGold = stats.teamTotalGold ?? 1;
  const goldShare = Math.min(stats.goldEarned / Math.max(1, teamGold), 1);

  // 5. Vision Score (dinámico según duración)
  const baseCap = minutes * 1.5;
  const isSupport =
    stats.role?.toUpperCase() === "UTILITY" ||
    stats.role?.toUpperCase() === "SUPPORT";
  const visCap = isSupport ? baseCap * 1.7 : baseCap;
  const visionScoreRaw = stats.visionScore ?? 0;
  let visionScore = Math.min(visionScoreRaw / Math.max(1, visCap), 1);

  // Bonus para soportes en visión
  if (isSupport) {
    visionScore = Math.min(visionScore * 1.15, 1);
  }

  // 6. CS Score (0-1)
  const csPerMinute = calculateCsPerMinute(stats);
  const csScore = Math.min(csPerMinute / 9, 1); // Normalizar con umbral de 9 cs/min

  // Calcular base score (suma de pesos = 1.0)
  const baseScore =
    0.18 * kdaScore +
    0.21 * kpScore +
    0.26 * dmgShare +
    0.13 * goldShare +
    0.1 * visionScore +
    0.12 * csScore;

  // Convertir a escala 0-100
  let finalScore = baseScore * 100;

  // Bonus de victoria: +20 puntos
  if (stats.win) {
    finalScore += 20;
  }

  // Micro-bonos por logros especiales
  if ((stats.objectivesStolen ?? 0) > 0) {
    finalScore += 2;
  }
  if (dmgShare > 0.35) {
    finalScore += 1;
  }
  if (stats.deaths === 0 && playerKills + stats.assists >= 10) {
    finalScore += 2;
  }

  // Penalización por muertes críticas
  const mistakes = stats.criticalMistakes || {};
  const mistakeScore =
    (mistakes.nashorThrows ?? 0) * 2 +
    (mistakes.preObjectiveDeaths ?? 0) * 1.5 +
    (mistakes.missedTeleports ?? 0) * 0.5;
  finalScore -= mistakeScore;

  // Clamp final a [0, 120]
  return Math.max(0, Math.min(finalScore, 120));
}
