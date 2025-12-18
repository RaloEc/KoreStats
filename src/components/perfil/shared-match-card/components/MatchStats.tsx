"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MatchTag } from "@/lib/riot/match-analyzer";
import { getTagInfo } from "../helpers";

interface StatItem {
  label: string;
  value: string;
  sub?: string;
  accentClass?: string;
}

interface MatchStatsProps {
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  totalCS: number;
  csPerMin: number;
  visionScore: number;
  damageToChampions: number;
  goldEarned: number;
  damageToTurrets: number;
  outcomeTextClass: string;
  displayTags: MatchTag[];
}

export const MatchStats: React.FC<MatchStatsProps> = ({
  kills,
  deaths,
  assists,
  kda,
  totalCS,
  csPerMin,
  visionScore,
  damageToChampions,
  goldEarned,
  damageToTurrets,
  outcomeTextClass,
  displayTags,
}) => {
  const stats: StatItem[] = [
    {
      label: "KDA",
      value: `${kills}/${deaths}/${assists}`,
      sub: `${kda.toFixed(2)}`,
      accentClass: outcomeTextClass,
    },
    {
      label: "CS",
      value: totalCS.toString(),
      sub: `${csPerMin.toFixed(1)}/m`,
    },
    {
      label: "Visión avanzada",
      value: visionScore.toString(),
      sub: "score",
    },
    {
      label: "Daño",
      value: `${(damageToChampions / 1000).toFixed(1)}k`,
      sub: "champ",
    },
    {
      label: "Oro",
      value: `${(goldEarned / 1000).toFixed(1)}k`,
      sub: "total",
    },
    {
      label: "Torres",
      value: `${(damageToTurrets / 1000).toFixed(1)}k`,
      sub: "dmg",
    },
  ];

  return (
    <div className="p-3 rounded-xl border border-slate-200/60 bg-white dark:border-white/10 dark:bg-slate-950">
      <div className="grid grid-cols-2 gap-1.5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="relative overflow-hidden rounded-lg border border-slate-200/60 bg-white px-1.5 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-slate-950"
          >
            <div className="text-[8px] uppercase tracking-tight text-slate-700 dark:text-white/60 font-bold">
              {stat.label}
            </div>
            <div
              className={`mt-0.5 text-xs font-semibold leading-tight ${
                stat.accentClass ?? "text-slate-900 dark:text-white"
              }`}
            >
              {stat.value}
            </div>
            {stat.sub && (
              <div className="text-[7px] text-slate-600 dark:text-white/50 font-semibold">
                {stat.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {displayTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {displayTags.map((tag) => {
            const tagInfo = getTagInfo(tag);
            return (
              <Tooltip key={tag}>
                <TooltipTrigger asChild>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full font-semibold text-[10px] sm:text-[11px] ${tagInfo.color} cursor-help`}
                  >
                    {tagInfo.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                  <p>{tagInfo.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
};
