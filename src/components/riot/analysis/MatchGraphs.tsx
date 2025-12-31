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
      goldDiff: isFocusTeamBlue ? goldDiff : -goldDiff,
      xpDiff: isFocusTeamBlue ? xpDiff : -xpDiff,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const isFocusLead = value > 0;
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded shadow-xl text-xs">
          <p className="text-slate-500 dark:text-slate-400 mb-1">{label} min</p>
          <p
            className={`font-bold ${
              isFocusLead
                ? isFocusTeamBlue
                  ? "text-cyan-600 dark:text-cyan-400"
                  : "text-rose-600 dark:text-rose-400"
                : isFocusTeamBlue
                ? "text-rose-600 dark:text-rose-400"
                : "text-cyan-600 dark:text-cyan-400"
            }`}
          >
            {isFocusLead ? "Ventaja tu equipo" : "Ventaja enemigo"}:{" "}
            {Math.abs(value).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const gradientOffset = () => {
    const dataMax = Math.max(...data.map((i: any) => i.goldDiff));
    const dataMin = Math.min(...data.map((i: any) => i.goldDiff));

    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;

    return dataMax / (dataMax - dataMin);
  };

  const off = gradientOffset();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
      {/* Gold Graph */}
      <Card className="bg-white/30 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 min-w-0">
        <CardHeader>
          <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-yellow-500" />
            Ventaja de Oro
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] p-0 min-w-0">
          <div className="w-full h-full min-h-[200px] min-w-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={200}
              minHeight={200}
            >
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset={off}
                      stopColor={focusColorHex}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset={off}
                      stopColor={enemyColorHex}
                      stopOpacity={0.3}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="minute"
                  stroke="currentColor"
                  className="text-slate-400 dark:text-slate-500"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="currentColor"
                  className="text-slate-400 dark:text-slate-500"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <ReferenceLine
                  y={0}
                  stroke="currentColor"
                  className="text-slate-300 dark:text-slate-700"
                  strokeDasharray="3 3"
                />
                <Area
                  type="monotone"
                  dataKey="goldDiff"
                  stroke={focusColorHex}
                  strokeWidth={2}
                  fill="url(#splitColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* XP Graph */}
      <Card className="bg-white/30 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 min-w-0">
        <CardHeader>
          <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            Ventaja de Experiencia
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] p-0 min-w-0">
          <div className="w-full h-full min-h-[200px] min-w-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={200}
              minHeight={200}
            >
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="splitColorXp" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset={off}
                      stopColor={focusColorHex}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset={off}
                      stopColor={enemyColorHex}
                      stopOpacity={0.3}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="minute"
                  stroke="currentColor"
                  className="text-slate-400 dark:text-slate-500"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="currentColor"
                  className="text-slate-400 dark:text-slate-500"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <ReferenceLine
                  y={0}
                  stroke="currentColor"
                  className="text-slate-300 dark:text-slate-700"
                  strokeDasharray="3 3"
                />
                <Area
                  type="monotone"
                  dataKey="xpDiff"
                  stroke={focusColorHex}
                  strokeWidth={2}
                  fill="url(#splitColorXp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
