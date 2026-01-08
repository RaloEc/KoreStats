"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crosshair, Trophy, Swords } from "lucide-react";
import Image from "next/image";
import { getChampionImg } from "@/lib/riot/helpers";
import { cn } from "@/lib/utils";

interface DamageChartProps {
  participants: any[];
  gameVersion?: string;
}

const COLORS = [
  "#7c8ba1", // Soft Slate
  "#8b94f6", // Soft Indigo
  "#f68ba2", // Soft Rose
  "#8bf6d4", // Soft Mint
  "#f6c58b", // Soft Peach
];

const COLORS_RED = [
  "#9ca3af", // Gray for neutral
  "#f87171", // Red 400
  "#fb7185", // Rose 400
  "#f43f5e", // Rose 500
  "#fda4af", // Rose 300
];

const COLORS_BLUE = [
  "#9ca3af", // Gray for neutral
  "#60a5fa", // Blue 400
  "#3b82f6", // Blue 500
  "#93c5fd", // Blue 300
  "#bfdbfe", // Blue 200
];

function TeamDamageSection({
  data,
  title,
  totalDamage,
  colorPalette,
  gameVersion,
  alignRight = false,
}: any) {
  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          "flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 mb-2",
          alignRight ? "justify-end" : "justify-start"
        )}
      >
        <h4
          className={cn(
            "text-xs font-bold uppercase tracking-widest",
            title.includes("Azul") ? "text-blue-500" : "text-rose-500"
          )}
        >
          {title}
        </h4>
        <span className="text-[10px] text-slate-400 font-mono">
          {totalDamage.toLocaleString()} DMG
        </span>
      </div>

      <div className="grid grid-cols-[1fr,1.5fr] gap-4 items-center">
        {/* Chart */}
        <div className="relative h-[160px] w-full flex justify-center items-center">
          <PieChart width={160} height={160}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colorPalette[index % colorPalette.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }: any) => {
                if (active && payload && payload.length) {
                  const pData = payload[0].payload;
                  const percent =
                    totalDamage > 0 ? (pData.value / totalDamage) * 100 : 0;
                  return (
                    <div className="bg-slate-900/90 border border-slate-700 p-2 rounded text-xs text-white shadow-xl pointer-events-none">
                      <p className="font-bold mb-1">{pData.championName}</p>
                      <p>
                        {pData.value.toLocaleString()} ({percent.toFixed(1)}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
            <Swords className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {data.map((player: any, index: number) => {
            const percent =
              totalDamage > 0 ? (player.value / totalDamage) * 100 : 0;
            const isTop = index === 0;

            return (
              <div
                key={player.participantId}
                className="flex items-center gap-2 text-xs"
              >
                <div className="relative w-8 h-8 rounded border border-slate-700 overflow-hidden shrink-0">
                  <Image
                    src={getChampionImg(player.championName, gameVersion)}
                    alt={player.name}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-0.5">
                    <span
                      className={cn(
                        "font-bold truncate",
                        isTop ? "text-amber-500" : "text-slate-300"
                      )}
                    >
                      {player.championName}
                    </span>
                    <span className="text-slate-500">
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percent}%`,
                        backgroundColor:
                          colorPalette[index % colorPalette.length],
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DamageChart({ participants, gameVersion }: DamageChartProps) {
  const { blueTeam, redTeam } = useMemo(() => {
    const processTeam = (teamId: number) => {
      const teamMembers = participants
        .filter((p) => p.teamId === teamId)
        .map((p) => ({
          participantId: p.participantId,
          name: p.summonerName,
          championName: p.championName,
          value: p.totalDamageDealtToChampions || 0,
        }))
        .sort((a, b) => b.value - a.value);

      const total = teamMembers.reduce((acc, curr) => acc + curr.value, 0);
      return { data: teamMembers, total };
    };

    return {
      blueTeam: processTeam(100),
      redTeam: processTeam(200),
    };
  }, [participants]);

  return (
    <Card className="bg-transparent border-slate-200/50 dark:border-slate-800/50 shadow-none overflow-hidden min-h-[380px] col-span-1 lg:col-span-2">
      <CardHeader className="border-b border-slate-200/20 dark:border-slate-800/20 pb-4 pt-5 px-6">
        <CardTitle className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-2">
          <Crosshair className="w-4 h-4" />
          Distribución de Daño Total
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <TeamDamageSection
            data={blueTeam.data}
            totalDamage={blueTeam.total}
            title="Equipo Azul"
            colorPalette={COLORS_BLUE}
            gameVersion={gameVersion}
          />
          <TeamDamageSection
            data={redTeam.data}
            totalDamage={redTeam.total}
            title="Equipo Rojo"
            colorPalette={COLORS_RED}
            gameVersion={gameVersion}
            alignRight
          />
        </div>
      </CardContent>
    </Card>
  );
}
