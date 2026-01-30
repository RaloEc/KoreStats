"use client";

import React, { memo } from "react";
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
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

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
  totalCS?: number; // Añadido
  summoner1Id?: number;
  summoner2Id?: number;
  perkPrimaryStyle?: number;
  perkSubStyle?: number;
  keystoneId?: number;
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
  8300: "7203_Whimsy", // Inspiración
  8400: "7204_Resolve", // Valor/Resolve
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

import { getPerkDataBatch } from "@/lib/riot/perksCache";

export const TeamPlayers: React.FC<TeamPlayersProps> = memo(
  ({ players, dataVersion }) => {
    const [keystoneIcons, setKeystoneIcons] = React.useState<
      Record<number, string>
    >({});

    // Cargar iconos de runas para todos los jugadores
    React.useEffect(() => {
      const keystoneIds = Array.from(
        new Set(
          players
            .map((p) => p.keystoneId)
            .filter((id): id is number => !!id && id > 0),
        ),
      );

      if (keystoneIds.length > 0) {
        getPerkDataBatch(keystoneIds).then(({ icons }) => {
          setKeystoneIcons(icons);
        });
      }
    }, [players]);

    if (!players || players.length === 0) return null;

    const blue = players.filter((p) => p.team === "blue").sort(sortByRole);
    const red = players.filter((p) => p.team === "red").sort(sortByRole);

    const renderPlayer = (
      player: Player,
      idx: number,
      teamColor: "blue" | "red",
    ) => {
      const champKey =
        player.championName === "FiddleSticks"
          ? "Fiddlesticks"
          : player.championName.replace(/\s+/g, "");

      const displayName = getDisplayName(player.summonerName);
      const slotClass =
        "w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-sm overflow-hidden bg-slate-950 border border-white/10 shadow-sm";

      return (
        <div
          key={`${player.team}-${idx}`}
          className={cn(
            "group/player flex items-center gap-2 p-1.5 rounded-lg transition-all duration-200",
            teamColor === "blue"
              ? "bg-blue-500/[0.03] hover:bg-blue-500/[0.08] border border-blue-500/10"
              : "bg-rose-500/[0.03] hover:bg-rose-500/[0.08] border border-rose-500/10",
          )}
        >
          {/* Champion Avatar */}
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-md overflow-hidden bg-black/20 shrink-0 border border-white/5">
            <Image
              src={getChampionImageUrl(champKey, dataVersion)}
              alt={player.championName}
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          {/* Runas y Hechizos (Ahora al lado del avatar) */}
          <div className="grid grid-cols-2 gap-0.5 shrink-0 px-1.5 border-r border-white/10 mr-0.5">
            {player.keystoneId && keystoneIcons[player.keystoneId] ? (
              <div className={slotClass}>
                <Image
                  src={keystoneIcons[player.keystoneId]}
                  alt="R"
                  width={18}
                  height={18}
                  className="object-cover scale-110"
                  unoptimized
                />
              </div>
            ) : (
              <div className={slotClass} />
            )}
            {player.summoner1Id &&
            getSummonerSpellUrl(player.summoner1Id, dataVersion) ? (
              <div className={slotClass}>
                <Image
                  src={getSummonerSpellUrl(player.summoner1Id, dataVersion)}
                  alt="S"
                  width={18}
                  height={18}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className={slotClass} />
            )}
            {player.perkSubStyle && RUNE_STYLE_MAP[player.perkSubStyle] ? (
              <div className={slotClass}>
                <Image
                  src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${RUNE_STYLE_MAP[player.perkSubStyle]}.png`}
                  alt="S"
                  width={18}
                  height={18}
                  className="object-cover scale-[0.85]"
                  unoptimized
                />
              </div>
            ) : (
              <div className={slotClass} />
            )}
            {player.summoner2Id &&
            getSummonerSpellUrl(player.summoner2Id, dataVersion) ? (
              <div className={slotClass}>
                <Image
                  src={getSummonerSpellUrl(player.summoner2Id, dataVersion)}
                  alt="S"
                  width={18}
                  height={18}
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className={slotClass} />
            )}
          </div>

          {/* Player Info & KDA/CS */}
          <div className="flex-1 min-w-0 overflow-hidden pr-2">
            <div className="text-[11px] font-black text-slate-900 dark:text-slate-100 truncate mb-0.5">
              {displayName}
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold tracking-tight">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <span className="opacity-90">{player.kills}</span>
                <span className="mx-px opacity-30">/</span>
                <span className="text-rose-500/90">{player.deaths}</span>
                <span className="mx-px opacity-30">/</span>
                <span className="opacity-90">{player.assists}</span>
              </div>
              <div className="flex items-center gap-0.5 border-l border-slate-200 dark:border-white/10 pl-2 ml-0.5 text-amber-500 font-black">
                <span>{player.totalCS ?? 0}</span>
                <span className="opacity-70 text-[7px] tracking-tighter uppercase">
                  CS
                </span>
              </div>
            </div>
          </div>

          {/* Items - Cuadrícula 3x2 con Ward Centrado Lateralmente */}
          <div className="flex items-center gap-1.5 shrink-0 px-2 ml-auto border-l border-white/5">
            <div className="grid grid-cols-[repeat(3,1fr)_auto] grid-rows-2 gap-0.5 items-center">
              {/* Items Principales Fila 1 */}
              {[player.item0, player.item1, player.item2].map((itemId, i) => (
                <div
                  key={`i-top-${i}`}
                  className={cn(
                    "w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-[17px] lg:h-[17px] rounded-md overflow-hidden transition-all border",
                    itemId && itemId > 0
                      ? "bg-black/40 shadow-inner border-black/10 dark:border-white/10"
                      : "bg-slate-200/30 dark:bg-white/5 border-slate-300/30 dark:border-white/5",
                  )}
                >
                  {itemId && itemId > 0 ? (
                    <Image
                      src={getItemImageUrl(itemId, dataVersion)}
                      alt="I"
                      width={17}
                      height={17}
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>
              ))}

              {/* Centinela (Ward) - Centrado en Row Span 2 */}
              <div className="row-span-2 ml-1">
                <div
                  className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5 lg:w-[22px] lg:h-[22px] rounded-full overflow-hidden flex items-center justify-center transition-all border",
                    player.item6 && player.item6 > 0
                      ? "border-amber-500/30 bg-black/40 shadow-lg"
                      : "bg-slate-200/30 dark:bg-white/5 border-slate-300/30 dark:border-white/5",
                  )}
                >
                  {player.item6 && player.item6 > 0 ? (
                    <Image
                      src={getItemImageUrl(player.item6, dataVersion)}
                      alt="W"
                      width={22}
                      height={22}
                      className="object-cover scale-90"
                      unoptimized
                    />
                  ) : null}
                </div>
              </div>

              {/* Items Principales Fila 2 */}
              {[player.item3, player.item4, player.item5].map((itemId, i) => (
                <div
                  key={`i-bot-${i}`}
                  className={cn(
                    "w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-[17px] lg:h-[17px] rounded-md overflow-hidden transition-all border",
                    itemId && itemId > 0
                      ? "bg-black/40 shadow-inner border-black/10 dark:border-white/10"
                      : "bg-slate-200/30 dark:bg-white/5 border-slate-300/30 dark:border-white/5",
                  )}
                >
                  {itemId && itemId > 0 ? (
                    <Image
                      src={getItemImageUrl(itemId, dataVersion)}
                      alt="I"
                      width={17}
                      height={17}
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="group/teams p-3 rounded-xl border border-slate-200/50 dark:border-white/[0.05] bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-xl overflow-hidden relative">
        <div className="flex items-center justify-between mb-3 px-1">
          <h4 className="text-[9px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-[0.2em] flex items-center gap-2">
            <Users className="w-3 h-3" />
            Integrantes de la Partida
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
          {/* Blue Side */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-1 mb-1.5 border-l-2 border-blue-500 pl-2">
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">
                Bando Azul
              </span>
            </div>
            {blue.map((p, idx) => renderPlayer(p, idx, "blue"))}
          </div>

          {/* Red Side */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-1 mb-1.5 border-l-2 border-rose-500 pl-2">
              <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">
                Bando Rojo
              </span>
            </div>
            {red.map((p, idx) => renderPlayer(p, idx, "red"))}
          </div>

          {/* Center VS Indicator (Desktop Only) */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center z-10 shadow-lg">
            <span className="text-[8px] font-black text-slate-400">VS</span>
          </div>
        </div>
      </div>
    );
  },
);
