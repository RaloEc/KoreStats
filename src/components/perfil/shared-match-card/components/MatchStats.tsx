"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Swords, Target, Eye, Zap, Coins, Castle } from "lucide-react";
import type { MatchTag } from "@/lib/riot/match-analyzer";
import { getTagInfo } from "../helpers";

interface StatItem {
  label: string;
  value: string;
  sub?: string;
  accentClass?: string;
  icon: React.ReactNode;
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
      icon: <Swords className="w-3.5 h-3.5" />,
    },
    {
      label: "CS",
      value: totalCS.toString(),
      sub: `${csPerMin.toFixed(1)}/m`,
      icon: <Target className="w-3.5 h-3.5" />,
    },
    {
      label: "Visión",
      value: visionScore.toString(),
      sub: "score",
      icon: <Eye className="w-3.5 h-3.5" />,
    },
    {
      label: "Daño",
      value: `${(damageToChampions / 1000).toFixed(1)}k`,
      sub: "champ",
      icon: <Zap className="w-3.5 h-3.5" />,
    },
    {
      label: "Oro",
      value: `${(goldEarned / 1000).toFixed(1)}k`,
      sub: "total",
      icon: <Coins className="w-3.5 h-3.5" />,
    },
    {
      label: "Torres",
      value: `${(damageToTurrets / 1000).toFixed(1)}k`,
      sub: "dmg",
      icon: <Castle className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="group/stats p-4 rounded-2xl border border-white/40 dark:border-white/20 bg-white/30 dark:bg-black/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:bg-white/40 dark:hover:bg-black/40 hover:shadow-[0_12px_48px_rgba(0,0,0,0.16)] dark:hover:shadow-[0_12px_48px_rgba(0,0,0,0.5)]">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="group/stat relative overflow-hidden rounded-xl border border-white/50 dark:border-white/20 bg-white/40 dark:bg-black/40 backdrop-blur-md px-3 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] transition-all duration-300 hover:bg-white/50 dark:hover:bg-black/50 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:scale-[1.02] flex flex-col justify-between"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* Brillo superior sutil */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent" />

            <div className="flex items-center justify-between mb-1">
              {/* Label */}
              <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-700 dark:text-slate-400 font-extrabold op-75">
                {stat.label}
              </div>
              {/* Icon */}
              <div className="text-slate-600 dark:text-slate-400 opacity-60 group-hover/stat:opacity-100 group-hover/stat:scale-110 transition-all duration-300">
                {stat.icon}
              </div>
            </div>

            {/* Valor principal */}
            <div
              className={`text-lg sm:text-xl font-black tracking-tight leading-none ${
                stat.accentClass ?? "text-slate-950 dark:text-slate-50"
              }`}
            >
              {stat.value}
            </div>

            {/* Subtexto */}
            {stat.sub && (
              <div className="text-[7px] sm:text-[8px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wide mt-0.5 opacity-80">
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
                    className={`group/tag inline-flex items-center px-2.5 py-1 rounded-full font-black text-[9px] sm:text-[10px] ${tagInfo.color} cursor-help shadow-[0_4px_16px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 hover:scale-110 hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_6px_24px_rgba(0,0,0,0.3)] backdrop-blur-sm border border-white/30 dark:border-white/10`}
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
