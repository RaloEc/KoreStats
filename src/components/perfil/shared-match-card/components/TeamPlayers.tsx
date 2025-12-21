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
        className="group/player flex items-center gap-2 p-2 rounded-lg bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-white/60 dark:border-white/20 shadow-sm transition-all duration-200 hover:bg-white/70 dark:hover:bg-black/70 hover:scale-[1.02]"
      >
        <div className="relative w-7 h-7 rounded-md overflow-hidden bg-white/80 dark:bg-white/20 shrink-0 shadow-sm">
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
              <div className="text-[10px] sm:text-xs font-black text-slate-900 dark:text-slate-50 truncate cursor-help">
                {player.summonerName}
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              {player.summonerName}
            </TooltipContent>
          </Tooltip>
          <div className="text-[9px] sm:text-[10px] text-slate-700 dark:text-slate-200 truncate font-semibold">
            {player.championName}
          </div>
          <div className="text-[8px] sm:text-[9px] text-slate-600 dark:text-slate-300 font-bold">
            {player.kills}/{player.deaths}/{player.assists}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="group/teams p-4 rounded-2xl border border-white/40 dark:border-white/20 bg-white/30 dark:bg-black/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:bg-white/40 dark:hover:bg-black/40 hover:shadow-[0_12px_48px_rgba(0,0,0,0.16)] dark:hover:shadow-[0_12px_48px_rgba(0,0,0,0.5)]">
      <h4 className="text-[10px] sm:text-xs uppercase font-black text-slate-700 dark:text-slate-200 tracking-widest mb-3">
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
