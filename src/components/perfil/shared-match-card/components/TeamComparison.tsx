"use client";

import React from "react";
import { ComparativeBullet } from "./ComparativeBullet";

interface TeamComparisonProps {
  // Datos del jugador
  damageToChampions: number;
  goldEarned: number;
  visionScore: number;
  killParticipation: number;
  // Promedios del equipo
  teamAvgDamageToChampions: number;
  teamAvgGoldEarned: number;
  teamAvgVisionScore: number;
  teamAvgKillParticipation: number;
  // Totales del equipo
  teamTotalDamage?: number;
  teamTotalGold?: number;
  teamTotalKills?: number;
  // Comparaciones
  isBetterThanAvgDamage: boolean;
  isBetterThanAvgGold: boolean;
  isBetterThanAvgVision: boolean;
  isBetterThanAvgKP: boolean;
  // Estilo
  userColor: string;
}

export const TeamComparison: React.FC<TeamComparisonProps> = ({
  damageToChampions,
  goldEarned,
  visionScore,
  killParticipation,
  teamAvgDamageToChampions,
  teamAvgGoldEarned,
  teamAvgVisionScore,
  teamAvgKillParticipation,
  teamTotalDamage,
  teamTotalGold,
  teamTotalKills,
  isBetterThanAvgDamage,
  isBetterThanAvgGold,
  isBetterThanAvgVision,
  isBetterThanAvgKP,
  userColor,
}) => {
  const hasAnyData =
    Boolean(teamTotalDamage) ||
    Boolean(teamTotalGold) ||
    Boolean(teamTotalKills);

  if (!hasAnyData) return null;

  const getDeltaLabel = (value: number, avg: number, isPercentage = false) => {
    if (avg <= 0) return undefined;
    if (isPercentage) {
      const delta = value - avg;
      const sign = delta >= 0 ? "+" : "";
      return `${sign}${delta.toFixed(0)}pp`;
    }
    const delta = (value / avg - 1) * 100;
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${delta.toFixed(0)}%`;
  };

  return (
    <div className="space-y-3 p-3 rounded-xl border border-slate-200/60 bg-white dark:border-white/10 dark:bg-slate-950">
      <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-white/70 tracking-wide">
        Comparativa vs Equipo
      </h4>

      {teamTotalDamage && (
        <ComparativeBullet
          label="Daño a Campeones"
          valueLabel={`${(damageToChampions / 1000).toFixed(1)}k`}
          value={damageToChampions}
          avg={teamAvgDamageToChampions}
          avgLabel={`${(teamAvgDamageToChampions / 1000).toFixed(1)}k`}
          deltaLabel={getDeltaLabel(
            damageToChampions,
            teamAvgDamageToChampions
          )}
          isBetter={isBetterThanAvgDamage}
          userColor={userColor}
        />
      )}

      {teamTotalKills && teamAvgKillParticipation > 0 && (
        <ComparativeBullet
          label="Participación en Kills"
          valueLabel={`${killParticipation.toFixed(0)}%`}
          value={killParticipation}
          avg={teamAvgKillParticipation}
          avgLabel={`${teamAvgKillParticipation.toFixed(0)}%`}
          deltaLabel={getDeltaLabel(
            killParticipation,
            teamAvgKillParticipation,
            true
          )}
          isBetter={isBetterThanAvgKP}
          userColor={userColor}
        />
      )}

      {teamTotalGold && (
        <ComparativeBullet
          label="Oro"
          valueLabel={`${(goldEarned / 1000).toFixed(1)}k`}
          value={goldEarned}
          avg={teamAvgGoldEarned}
          avgLabel={`${(teamAvgGoldEarned / 1000).toFixed(1)}k`}
          deltaLabel={getDeltaLabel(goldEarned, teamAvgGoldEarned)}
          isBetter={isBetterThanAvgGold}
          userColor={userColor}
        />
      )}

      {teamAvgVisionScore > 0 && (
        <ComparativeBullet
          label="Visión"
          valueLabel={`${visionScore}`}
          value={visionScore}
          avg={teamAvgVisionScore}
          avgLabel={`${teamAvgVisionScore.toFixed(0)}`}
          deltaLabel={getDeltaLabel(visionScore, teamAvgVisionScore)}
          isBetter={isBetterThanAvgVision}
          userColor={userColor}
        />
      )}
    </div>
  );
};
