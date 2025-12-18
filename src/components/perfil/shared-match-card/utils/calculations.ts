import type { SharedMatchData } from "../types";

export const calculateTeamStats = (partida: SharedMatchData) => {
  const teamAvgDamageToChampions =
    typeof partida.teamAvgDamageToChampions === "number" &&
    Number.isFinite(partida.teamAvgDamageToChampions)
      ? partida.teamAvgDamageToChampions
      : partida.teamTotalDamage
      ? partida.teamTotalDamage / 5
      : 0;

  const teamAvgGoldEarned =
    typeof partida.teamAvgGoldEarned === "number" &&
    Number.isFinite(partida.teamAvgGoldEarned)
      ? partida.teamAvgGoldEarned
      : partida.teamTotalGold
      ? partida.teamTotalGold / 5
      : 0;

  const teamAvgKillParticipation =
    typeof partida.teamAvgKillParticipation === "number" &&
    Number.isFinite(partida.teamAvgKillParticipation)
      ? partida.teamAvgKillParticipation
      : 0;

  const teamAvgVisionScore =
    typeof partida.teamAvgVisionScore === "number" &&
    Number.isFinite(partida.teamAvgVisionScore)
      ? partida.teamAvgVisionScore
      : 0;

  const teamAvgCsPerMin =
    typeof partida.teamAvgCsPerMin === "number" &&
    Number.isFinite(partida.teamAvgCsPerMin)
      ? partida.teamAvgCsPerMin
      : 0;

  const teamAvgDamageToTurrets =
    typeof partida.teamAvgDamageToTurrets === "number" &&
    Number.isFinite(partida.teamAvgDamageToTurrets)
      ? partida.teamAvgDamageToTurrets
      : 0;

  return {
    teamAvgDamageToChampions,
    teamAvgGoldEarned,
    teamAvgKillParticipation,
    teamAvgVisionScore,
    teamAvgCsPerMin,
    teamAvgDamageToTurrets,
  };
};

export const calculatePlayerStats = (partida: SharedMatchData) => {
  const damageShare = partida.teamTotalDamage
    ? (partida.damageToChampions / partida.teamTotalDamage) * 100
    : 0;

  const goldShare = partida.teamTotalGold
    ? (partida.goldEarned / partida.teamTotalGold) * 100
    : 0;

  const killParticipation = partida.teamTotalKills
    ? ((partida.kills + partida.assists) / partida.teamTotalKills) * 100
    : 0;

  const killParticipationRatio =
    partida.teamTotalKills && partida.teamTotalKills > 0
      ? (partida.kills + partida.assists) / partida.teamTotalKills
      : undefined;

  return {
    damageShare,
    goldShare,
    killParticipation,
    killParticipationRatio,
  };
};

export const calculateComparisons = (
  partida: SharedMatchData,
  teamStats: ReturnType<typeof calculateTeamStats>,
  playerStats: ReturnType<typeof calculatePlayerStats>
) => {
  const isBetterThanAvgDamage =
    teamStats.teamAvgDamageToChampions > 0
      ? partida.damageToChampions > teamStats.teamAvgDamageToChampions
      : false;

  const isBetterThanAvgGold =
    teamStats.teamAvgGoldEarned > 0
      ? partida.goldEarned > teamStats.teamAvgGoldEarned
      : false;

  const isBetterThanAvgKP =
    teamStats.teamAvgKillParticipation > 0
      ? playerStats.killParticipation > teamStats.teamAvgKillParticipation
      : false;

  const isBetterThanAvgVision =
    teamStats.teamAvgVisionScore > 0
      ? partida.visionScore > teamStats.teamAvgVisionScore
      : false;

  const isBetterThanAvgCs =
    teamStats.teamAvgCsPerMin > 0
      ? partida.csPerMin > teamStats.teamAvgCsPerMin
      : false;

  const isBetterThanAvgTurrets =
    teamStats.teamAvgDamageToTurrets > 0
      ? partida.damageToTurrets > teamStats.teamAvgDamageToTurrets
      : false;

  return {
    isBetterThanAvgDamage,
    isBetterThanAvgGold,
    isBetterThanAvgKP,
    isBetterThanAvgVision,
    isBetterThanAvgCs,
    isBetterThanAvgTurrets,
  };
};
