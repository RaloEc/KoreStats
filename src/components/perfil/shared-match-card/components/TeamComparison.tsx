"use client";

import React, { memo } from "react";
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

export const TeamComparison: React.FC<TeamComparisonProps> = memo(
  ({
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

    const getDeltaLabel = (
      value: number,
      avg: number,
      isPercentage = false,
    ) => {
      if (avg <= 0) return undefined;
      if (isPercentage) {
        const delta = value - avg;
        const sign = delta >= 0 ? "+" : "";
        return `${sign}${delta.toFixed(0)}%`; // pp es técnicamente correcto pero % es más común
      }
      const delta = (value / avg - 1) * 100;
      const sign = delta >= 0 ? "+" : "";
      return `${sign}${delta.toFixed(0)}%`;
    };

    return (
      <div className="group/comparison flex flex-col gap-6 p-5 rounded-2xl border border-slate-200/60 dark:border-white/[0.03] bg-white/80 dark:bg-black/80 backdrop-blur-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] uppercase font-bold text-black tracking-[0.2em] dark:text-white">
            Rendimiento vs Equipo
          </h4>
          <div className="h-px flex-1 bg-slate-200/50 dark:bg-white/[0.03] ml-4" />
        </div>

        <div className="grid gap-6">
          {teamTotalDamage && (
            <ComparativeBullet
              label="Daño Causado"
              valueLabel={`${(damageToChampions / 1000).toFixed(1)}k`}
              value={damageToChampions}
              avg={teamAvgDamageToChampions}
              avgLabel={`${(teamAvgDamageToChampions / 1000).toFixed(1)}k`}
              deltaLabel={getDeltaLabel(
                damageToChampions,
                teamAvgDamageToChampions,
              )}
              isBetter={isBetterThanAvgDamage}
              userColor={userColor}
            />
          )}

          {teamTotalKills && teamAvgKillParticipation > 0 && (
            <ComparativeBullet
              label="Participación"
              valueLabel={`${killParticipation.toFixed(0)}%`}
              value={killParticipation}
              avg={teamAvgKillParticipation}
              avgLabel={`${teamAvgKillParticipation.toFixed(0)}%`}
              deltaLabel={getDeltaLabel(
                killParticipation,
                teamAvgKillParticipation,
                true,
              )}
              isBetter={isBetterThanAvgKP}
              userColor={userColor}
            />
          )}

          {teamTotalGold && (
            <ComparativeBullet
              label="Oro Obtenido"
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
              label="Puntuación Visión"
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
      </div>
    );
  },
);
