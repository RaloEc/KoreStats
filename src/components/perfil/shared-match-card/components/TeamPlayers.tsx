"use client";

import React from "react";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getChampionImageUrl } from "@/components/riot/match-card/helpers";

interface Player {
  championName: string;
  championId: number;
  summonerName: string;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  role: string;
  team: "blue" | "red";
}

interface TeamPlayersProps {
  players: Player[];
  dataVersion: string;
}

const ROLE_PRIORITY: Record<string, number> = {
  TOP: 1,
  JG: 2,
  JUN: 2,
  JUNGLE: 2,
  MID: 3,
  MIDDLE: 3,
  ADC: 4,
  BOT: 4,
  BOTTOM: 4,
  CARRY: 4,
  DUO_CARRY: 4,
  SUP: 5,
  SUPP: 5,
  SUPPORT: 5,
  UTILITY: 5,
  DUO_SUPPORT: 5,
};

const normalizeRole = (raw: unknown): string => {
  if (typeof raw !== "string") return "";
  const value = raw.trim().toUpperCase();
  if (!value) return "";
  if (value === "JUNGLE" || value === "JG" || value === "JUN") return "JUNGLE";
  if (value === "MID" || value === "MIDDLE") return "MID";
  if (
    value === "BOT" ||
    value === "BOTTOM" ||
    value === "ADC" ||
    value === "CARRY" ||
    value === "DUO_CARRY"
  )
    return "BOT";
  if (
    value === "SUP" ||
    value === "SUPP" ||
    value === "SUPPORT" ||
    value === "UTILITY" ||
    value === "DUO_SUPPORT"
  )
    return "SUP";
  if (value === "TOP") return "TOP";
  return value;
};

const sortByRole = (a: Player, b: Player) =>
  (ROLE_PRIORITY[normalizeRole(a.role)] || 99) -
  (ROLE_PRIORITY[normalizeRole(b.role)] || 99);

export const TeamPlayers: React.FC<TeamPlayersProps> = ({
  players,
  dataVersion,
}) => {
  if (!players || players.length === 0) return null;

  const blue = players.filter((p) => p.team === "blue").sort(sortByRole);
  const red = players.filter((p) => p.team === "red").sort(sortByRole);

  const renderPlayer = (player: Player, idx: number) => {
    const champKey =
      player.championName === "FiddleSticks"
        ? "Fiddlesticks"
        : player.championName.replace(/\s+/g, "");

    return (
      <div
        key={`${player.team}-${idx}`}
        className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60"
      >
        <div className="relative w-6 h-6 rounded overflow-hidden bg-white/70 dark:bg-white/15 shrink-0">
          <Image
            src={getChampionImageUrl(champKey, dataVersion)}
            alt={player.championName}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-[10px] font-bold text-slate-900 dark:text-white truncate cursor-help">
                {player.summonerName}
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              {player.summonerName}
            </TooltipContent>
          </Tooltip>
          <div className="text-[9px] text-slate-700 dark:text-white/70 truncate">
            {player.championName}
          </div>
          <div className="text-[8px] text-slate-600 dark:text-white/60">
            {player.kills}/{player.deaths}/{player.assists}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 rounded-xl border border-slate-200/60 bg-white dark:border-white/10 dark:bg-slate-950">
      <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-white/70 tracking-wide mb-2">
        Equipos
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          {blue.map((p, idx) => renderPlayer(p, idx))}
        </div>
        <div className="space-y-1.5">
          {red.map((p, idx) => renderPlayer(p, idx))}
        </div>
      </div>
    </div>
  );
};
