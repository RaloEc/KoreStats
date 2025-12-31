"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crosshair, Trophy } from "lucide-react";
import Image from "next/image";
import { getChampionImg } from "@/lib/riot/helpers";
import { cn } from "@/lib/utils";

interface DamageChartProps {
  participants: any[];
  teamId: number; // 100 or 200
  gameVersion?: string;
}

const COLORS = [
  "#7c8ba1", // Soft Slate
  "#8b94f6", // Soft Indigo
  "#f68ba2", // Soft Rose
  "#8bf6d4", // Soft Mint
  "#f6c58b", // Soft Peach
];

export function DamageChart({
  participants,
  teamId,
  gameVersion,
}: DamageChartProps) {
  const { data, totalTeamDamage } = useMemo(() => {
    const teamOnes = participants
      .filter((p) => p.teamId === teamId)
      .map((p) => ({
        name: p.championName,
        value: p.totalDamageDealtToChampions || 0,
        summonerName: p.summonerName,
        championName: p.championName,
      }))
      .sort((a, b) => b.value - a.value);

    const total = teamOnes.reduce((acc, p) => acc + p.value, 0);

    return {
      data: teamOnes,
      totalTeamDamage: total,
    };
  }, [participants, teamId]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
      const percent =
        totalTeamDamage > 0 ? (pData.value / totalTeamDamage) * 100 : 0;
      return (
        <div className="bg-slate-900/90 border border-slate-700/50 p-3 rounded-xl shadow-2xl text-xs backdrop-blur-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative w-9 h-9 rounded-lg border border-slate-700 overflow-hidden">
              <Image
                src={getChampionImg(pData.championName, gameVersion)}
                alt={pData.championName}
                fill
                sizes="36px"
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-semibold text-white">{pData.championName}</p>
              <p className="text-slate-500 text-[10px]">{pData.summonerName}</p>
            </div>
          </div>
          <p className="text-slate-300 font-medium">
            {pData.value.toLocaleString()}{" "}
            <span className="text-slate-500 mx-1">/</span> {percent.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-transparent border-slate-200/50 dark:border-slate-800/50 shadow-none overflow-hidden min-h-[380px]">
      <CardHeader className="border-b border-slate-200/20 dark:border-slate-800/20 pb-4 pt-5 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <Crosshair className="w-4 h-4" />
            Distribución de Daño
          </CardTitle>
          <div className="text-[10px] font-bold text-slate-400/80 dark:text-slate-500 font-mono tracking-tighter">
            TOTAL: {totalTeamDamage.toLocaleString()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid lg:grid-cols-[1.2fr,1.8fr] gap-8 items-center">
          {/* Donut Chart */}
          <div className="relative h-[200px] w-full flex items-center justify-center">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={200}
              minHeight={200}
            >
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={74}
                  outerRadius={86}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  animationDuration={800}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="hover:opacity-70 transition-opacity cursor-pointer outline-none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{ zIndex: 1000 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-[0.2em] mb-1">
                Impact
              </span>
              <span className="text-2xl font-light text-slate-900 dark:text-white">
                DMG
              </span>
            </div>
          </div>

          {/* Detailed List */}
          <div className="space-y-4">
            {data.map((player, index) => {
              const percent =
                totalTeamDamage > 0
                  ? (player.value / totalTeamDamage) * 100
                  : 0;
              const isTopDmg = index === 0;

              return (
                <div
                  key={player.name}
                  className="flex items-center gap-3 group"
                >
                  {/* Icon */}
                  <div className="relative w-11 h-11 shrink-0">
                    <div
                      className={cn(
                        "w-full h-full rounded-lg overflow-hidden border-2 shadow-sm transition-transform group-hover:scale-110",
                        isTopDmg
                          ? "border-amber-400"
                          : "border-slate-200 dark:border-slate-700"
                      )}
                    >
                      <Image
                        src={getChampionImg(player.championName, gameVersion)}
                        alt={player.name}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                    {isTopDmg && (
                      <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-900 rounded-full p-0.5 shadow-md">
                        <Trophy className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Bar and Stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-2">
                      <div className="truncate pr-4">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {player.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-2">
                          {percent.toFixed(1)}%
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {player.value.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Tiny Progress Bar */}
                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
