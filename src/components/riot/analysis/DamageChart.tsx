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

const DISTINCT_COLORS = [
  "#3b82f6", // Blue
  "#22c55e", // Green
  "#f59e0b", // Amber
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#84cc16", // Lime
  "#6366f1", // Indigo
  "#ef4444", // Red
];

function TeamDamageSection({
  data,
  title,
  totalDamage,
  gameVersion,
  alignRight = false,
}: any) {
  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          "flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 mb-2 justify-start",
        )}
      >
        <h4
          className={cn(
            "text-xs font-bold uppercase tracking-widest",
            title.includes("Azul") ? "text-blue-500" : "text-rose-500",
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
          <PieChart width={160} height={160} style={{ outline: "none" }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              style={{ outline: "none" }}
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
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
                      <p className="font-bold text-blue-400 mb-0.5 text-sm">
                        {pData.name}
                      </p>
                      <p className="text-slate-400 mb-1.5 text-[10px] uppercase tracking-wider">
                        {pData.championName}
                      </p>
                      <p className="font-mono text-xs pt-1 border-t border-white/10">
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
                    <div className="flex flex-col min-w-0">
                      <span
                        className={cn(
                          "font-bold truncate text-[11px]",
                          isTop ? "text-amber-500" : "text-slate-200",
                        )}
                      >
                        {player.name}
                      </span>
                      <span className="text-[9px] text-slate-500 truncate dark:text-slate-400 uppercase tracking-tighter">
                        {player.championName}
                      </span>
                    </div>
                    <span className="text-slate-500">
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: player.color,
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
          name:
            p.riotIdGameName || p.summonerName || p.summoner_name || "Jugador",
          championName: p.championName,
          value: p.totalDamageDealtToChampions || 0,
          color:
            DISTINCT_COLORS[(p.participantId - 1) % DISTINCT_COLORS.length],
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

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <Card className="bg-transparent border-slate-200/50 dark:border-slate-800/50 shadow-none overflow-hidden min-h-[380px] col-span-1 lg:col-span-2 animate-pulse">
        <div className="h-[380px]" />
      </Card>
    );
  }

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
            gameVersion={gameVersion}
          />
          <TeamDamageSection
            data={redTeam.data}
            totalDamage={redTeam.total}
            title="Equipo Rojo"
            gameVersion={gameVersion}
            alignRight
          />
        </div>
      </CardContent>
    </Card>
  );
}
