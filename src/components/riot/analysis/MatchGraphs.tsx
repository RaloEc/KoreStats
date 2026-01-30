"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchGraphsProps {
  timeline: any;
  focusTeamId?: number; // Team perspective for labels
}

export function MatchGraphs({ timeline, focusTeamId = 100 }: MatchGraphsProps) {
  if (!timeline || !timeline.info || !timeline.info.frames) return null;

  const isFocusTeamBlue = focusTeamId === 100;
  const focusColorHex = isFocusTeamBlue ? "#22d3ee" : "#f43f5e";
  const enemyColorHex = isFocusTeamBlue ? "#f43f5e" : "#22d3ee";

  const data = timeline.info.frames.map((frame: any, index: number) => {
    let blueGold = 0;
    let redGold = 0;
    let blueXp = 0;
    let redXp = 0;

    Object.values(frame.participantFrames).forEach((p: any) => {
      // Participants 1-5 are usually Blue (100), 6-10 are Red (200)
      // But we should check participantId if possible.
      // Standard: 1-5 Blue, 6-10 Red
      if (p.participantId <= 5) {
        blueGold += p.totalGold;
        blueXp += p.xp;
      } else {
        redGold += p.totalGold;
        redXp += p.xp;
      }
    });

    const goldDiff = blueGold - redGold;
    const xpDiff = blueXp - redXp;

    return {
      minute: index,
      blueGold,
      redGold,
      blueXp,
      redXp,
      goldDiff: Math.abs(blueGold - redGold),
      xpDiff: Math.abs(blueXp - redXp),
      isBlueLeading: blueGold > redGold,
      isBlueXpLeading: blueXp > redXp,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find team values in payload
      const blueVal =
        payload.find(
          (p: any) => p.dataKey === "blueGold" || p.dataKey === "blueXp",
        )?.value || 0;
      const redVal =
        payload.find(
          (p: any) => p.dataKey === "redGold" || p.dataKey === "redXp",
        )?.value || 0;
      const diff = Math.abs(blueVal - redVal);
      const blueLeading = blueVal > redVal;

      return (
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-2xl backdrop-blur-md min-w-[180px]">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 border-b border-slate-100 dark:border-white/10 pb-1 text-center font-bold">
            Minuto {label}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-blue-500/5 dark:bg-blue-500/10 p-1.5 rounded border border-blue-500/10 dark:border-blue-500/20">
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                Equipo Azul
              </span>
              <span className="font-mono text-slate-900 dark:text-white text-sm font-bold">
                {blueVal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center bg-rose-500/5 dark:bg-rose-500/10 p-1.5 rounded border border-rose-500/10 dark:border-rose-500/20">
              <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tighter">
                Equipo Rojo
              </span>
              <span className="font-mono text-slate-900 dark:text-white text-sm font-bold">
                {redVal.toLocaleString()}
              </span>
            </div>
            <div className="pt-1 flex flex-col items-center border-t border-slate-100 dark:border-white/5">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5 font-bold">
                Ventaja
              </span>
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shadow-sm",
                    blueLeading ? "bg-blue-500" : "bg-rose-500",
                  )}
                />
                <span
                  className={cn(
                    "text-base font-black font-mono",
                    blueLeading
                      ? "text-blue-600 dark:text-blue-500"
                      : "text-rose-600 dark:text-rose-500",
                  )}
                >
                  {diff.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Improved gradient logic to ensure sharp transition
  const renderGradient = (id: string) => (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset={off} stopColor={focusColorHex} stopOpacity={0.6} />
      <stop offset={off} stopColor={focusColorHex} stopOpacity={0.1} />
      <stop offset={off} stopColor={enemyColorHex} stopOpacity={0.1} />
      <stop offset={off} stopColor={enemyColorHex} stopOpacity={0.6} />
    </linearGradient>
  );

  const dataMax = Math.max(
    ...data.map((i: any) => Math.max(i.goldDiff, i.xpDiff, 1000)),
  );
  const dataMin = Math.min(
    ...data.map((i: any) => Math.min(i.goldDiff, i.xpDiff, -1000)),
  );

  const gradientOffsetValue = () => {
    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
    return dataMax / (dataMax - dataMin);
  };

  const off = gradientOffsetValue();

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        <div className="h-[320px] bg-slate-100/5 dark:bg-slate-900/20 animate-pulse rounded-xl" />
        <div className="h-[320px] bg-slate-100/5 dark:bg-slate-900/20 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
      {/* Gold Graph */}
      <Card className="bg-white/5 dark:bg-slate-900/40 border-slate-200/50 dark:border-white/5 overflow-hidden">
        <CardHeader className="pb-2 border-b border-white/5">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Ventaja de Oro
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-[250px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="white"
                opacity={0.05}
              />
              <XAxis dataKey="minute" hide />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="blueGold"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#blueGrad)"
                animationDuration={1000}
              />
              <Area
                type="monotone"
                dataKey="redGold"
                stroke="#ef4444"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#redGrad)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* XP Graph */}
      <Card className="bg-white/5 dark:bg-slate-900/40 border-slate-200/50 dark:border-white/5 overflow-hidden">
        <CardHeader className="pb-2 border-b border-white/5">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500" />
              Ventaja de Experiencia
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-[250px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="blueGradXp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="redGradXp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="white"
                opacity={0.05}
              />
              <XAxis dataKey="minute" hide />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="blueXp"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#blueGradXp)"
                animationDuration={1000}
              />
              <Area
                type="monotone"
                dataKey="redXp"
                stroke="#ef4444"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#redGradXp)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
