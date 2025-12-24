"use client";

import React from "react";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getChampionImageUrl,
  getSummonerSpellUrl,
  getItemImageUrl,
} from "@/components/riot/match-card/helpers";

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
  // Nuevos campos opcionales
  summoner1Id?: number;
  summoner2Id?: number;
  perkPrimaryStyle?: number;
  perkSubStyle?: number;
  item0?: number;
  item1?: number;
  item2?: number;
  item3?: number;
  item4?: number;
  item5?: number;
  item6?: number;
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

const RUNE_STYLE_MAP: Record<number, string> = {
  8000: "7201_Precision",
  8100: "7200_Domination",
  8200: "7202_Sorcery",
  8300: "7204_Resolve",
  8400: "7203_Whimsy",
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

// Función para remover el tag de Riot (#TAG)
const getDisplayName = (summonerName: string): string => {
  const hashIndex = summonerName.indexOf("#");
  return hashIndex !== -1 ? summonerName.substring(0, hashIndex) : summonerName;
};

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

    const displayName = getDisplayName(player.summonerName);

    // Items del jugador
    const items = [
      player.item0,
      player.item1,
      player.item2,
      player.item3,
      player.item4,
      player.item5,
      player.item6,
    ].filter((item) => item && item > 0);

    return (
      <div
        key={`${player.team}-${idx}`}
        className="group/player flex items-center gap-2 p-2 rounded-lg bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-white/60 dark:border-white/20 shadow-sm transition-all duration-200 hover:bg-white/70 dark:hover:bg-black/70"
      >
        {/* Avatar del campeón */}
        <div className="relative w-9 h-9 rounded-md overflow-hidden bg-white/80 dark:bg-white/20 shrink-0 shadow-sm">
          <Image
            src={getChampionImageUrl(champKey, dataVersion)}
            alt={player.championName}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        {/* Información del jugador */}
        <div className="flex-1 min-w-0 space-y-0.5">
          {/* Nombre */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-[9px] sm:text-[10px] font-black text-slate-900 dark:text-slate-50 truncate cursor-help">
                {displayName}
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              {player.summonerName}
            </TooltipContent>
          </Tooltip>

          {/* KDA */}
          <div className="text-[7px] sm:text-[8px] text-slate-600 dark:text-slate-300 font-bold">
            {player.kills}/{player.deaths}/{player.assists}
          </div>
        </div>

        {/* Runas y Hechizos */}
        {/* Runas y Hechizos (Grid 2x2) */}
        <div className="grid grid-cols-2 gap-0.5 shrink-0">
          {/* Runa Principal */}
          {player.perkPrimaryStyle &&
          RUNE_STYLE_MAP[player.perkPrimaryStyle] ? (
            <div className="w-4 h-4 rounded-sm overflow-hidden bg-slate-800/50">
              <Image
                src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${
                  RUNE_STYLE_MAP[player.perkPrimaryStyle]
                }.png`}
                alt="Runa principal"
                width={16}
                height={16}
                className="object-cover scale-110"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-4 h-4" />
          )}

          {/* Hechizo 1 */}
          {player.summoner1Id &&
          getSummonerSpellUrl(player.summoner1Id, dataVersion) ? (
            <div className="w-4 h-4 rounded-sm overflow-hidden bg-slate-800/50">
              <Image
                src={getSummonerSpellUrl(player.summoner1Id, dataVersion)}
                alt="Hechizo 1"
                width={16}
                height={16}
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-4 h-4" />
          )}

          {/* Runa Secundaria */}
          {player.perkSubStyle && RUNE_STYLE_MAP[player.perkSubStyle] ? (
            <div className="w-4 h-4 rounded-sm overflow-hidden bg-slate-800/50">
              <Image
                src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${
                  RUNE_STYLE_MAP[player.perkSubStyle]
                }.png`}
                alt="Runa secundaria"
                width={16}
                height={16}
                className="object-cover opacity-70 scale-90"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-4 h-4" />
          )}

          {/* Hechizo 2 */}
          {player.summoner2Id &&
          getSummonerSpellUrl(player.summoner2Id, dataVersion) ? (
            <div className="w-4 h-4 rounded-sm overflow-hidden bg-slate-800/50">
              <Image
                src={getSummonerSpellUrl(player.summoner2Id, dataVersion)}
                alt="Hechizo 2"
                width={16}
                height={16}
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {/* Divider Vertical */}
        <div className="hidden sm:block w-px h-8 bg-slate-300/30 dark:bg-slate-700/50 mx-1 shrink-0" />

        {/* Items */}
        <div className="hidden sm:flex gap-0.5 shrink-0">
          {items.slice(0, 6).map((itemId, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-sm overflow-hidden bg-slate-800/50 border border-slate-700/30"
            >
              <Image
                src={getItemImageUrl(itemId, dataVersion)}
                alt={`Item ${i + 1}`}
                width={16}
                height={16}
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="group/teams p-4 rounded-2xl border border-white/40 dark:border-white/20 bg-white/30 dark:bg-black/30 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:bg-white/40 dark:hover:bg-black/40 hover:shadow-[0_12px_48px_rgba(0,0,0,0.16)] dark:hover:shadow-[0_12px_48px_rgba(0,0,0,0.5)]">
      <h4 className="text-[9px] sm:text-[10px] uppercase font-black text-slate-700 dark:text-slate-200 tracking-widest mb-3">
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
