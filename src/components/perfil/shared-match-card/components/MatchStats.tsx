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
    <div className="group/stats p-4 rounded-2xl border border-white/40 dark:border-white/20 bg-white/30 dark:bg-black/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:bg-white/40 dark:hover:bg-black/40 hover:shadow-[0_12px_48px_rgba(0,0,0,0.16)] dark:hover:shadow-[0_12px_48px_rgba(0,0,0,0.5)]">
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="group/stat relative overflow-hidden rounded-xl border border-white/50 dark:border-white/20 bg-white/40 dark:bg-black/40 backdrop-blur-md px-3 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] transition-all duration-300 hover:bg-white/50 dark:hover:bg-black/50 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:scale-[1.02]"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* Brillo superior sutil */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent" />

            {/* Label */}
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-700 dark:text-slate-200 font-black mb-1">
              {stat.label}
            </div>

            {/* Valor principal */}
            <div
              className={`text-sm sm:text-base font-black leading-tight ${
                stat.accentClass ?? "text-slate-900 dark:text-slate-50"
              }`}
            >
              {stat.value}
            </div>

            {/* Subtexto */}
            {stat.sub && (
              <div className="text-[8px] sm:text-[9px] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wide mt-0.5">
                {stat.sub}
              </div>
            )}

            {/* Efecto de brillo al hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/20 dark:to-white/10 opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300 rounded-xl" />
          </div>
        ))}
      </div>

      {displayTags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {displayTags.map((tag) => {
            const tagInfo = getTagInfo(tag);
            return (
              <Tooltip key={tag}>
                <TooltipTrigger asChild>
                  <span
                    className={`group/tag inline-flex items-center px-3 py-1.5 rounded-full font-black text-[10px] sm:text-xs ${tagInfo.color} cursor-help shadow-[0_4px_16px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 hover:scale-110 hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_6px_24px_rgba(0,0,0,0.3)] backdrop-blur-sm border border-white/30 dark:border-white/10`}
                  >
                    {tagInfo.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold">
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
