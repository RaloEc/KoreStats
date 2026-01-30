"use client";

import React, { memo, useState } from "react";
import Image from "next/image";
import { BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getChampionImg,
  getItemImg,
  getSpellImg,
  getRuneStyleImg,
  getPerkImg,
} from "@/lib/riot/helpers";
import { formatRankBadge, getTierColor } from "@/lib/riot/league";
import { PerformanceBreakdown } from "@/lib/riot/match-analyzer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlayerNoteButton } from "./PlayerNoteButton";
import { PlayerNoteModal } from "./PlayerNoteModal";

// Helper functions duplicated to avoid complex exports/migrations
const getParticipantKey = (player: any) =>
  player.puuid ?? `${player.match_id}-${player.summoner_id ?? player.id}`;

const getValue = (p: any, key: string, altKey?: string) =>
  p[key] ?? (altKey ? p[altKey] : 0) ?? 0;

interface PerformanceTooltipContentProps {
  score: number;
  ranking: number;
  breakdown?: PerformanceBreakdown;
}

const PerformanceTooltipContent = ({
  score,
  ranking,
  breakdown,
}: PerformanceTooltipContentProps) => (
  <div className="px-1 py-1 text-slate-700 dark:text-slate-200">
    <div className="flex items-center justify-between gap-4 mb-2">
      <span className="font-bold text-sm text-slate-900 dark:text-white">
        Puntaje: {score.toFixed(1)}/120
      </span>
      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
        #{ranking} de 10
      </span>
    </div>
    <div className="space-y-1 border-t border-slate-200 dark:border-slate-800 pt-2 mb-2">
      <div className="flex justify-between text-[11px] gap-4">
        <span className="text-slate-500 dark:text-slate-400">
          Distribución de Daño (26%)
        </span>
        <span className="font-bold text-slate-900 dark:text-white">
          {breakdown ? breakdown.damage.toFixed(1) : "0.0"}
        </span>
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-500 dark:text-slate-400">
          Participación Kills (21%)
        </span>
        <span className="font-bold text-slate-900 dark:text-white">
          {breakdown ? breakdown.kp.toFixed(1) : "0.0"}
        </span>
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-500 dark:text-slate-400">
          KDA / Supervivencia (18%)
        </span>
        <span className="font-bold text-slate-900 dark:text-white">
          {breakdown ? breakdown.kda.toFixed(1) : "0.0"}
        </span>
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-500 dark:text-slate-400">
          Oro Generado (13%)
        </span>
        <span className="font-bold text-slate-900 dark:text-white">
          {breakdown ? breakdown.gold.toFixed(1) : "0.0"}
        </span>
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-500 dark:text-slate-400">
          Farmeo (CS/min) (12%)
        </span>
        <span className="font-bold text-slate-900 dark:text-white">
          {breakdown ? breakdown.cs.toFixed(1) : "0.0"}
        </span>
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-500 dark:text-slate-400">
          Visión / Utilidad (10%)
        </span>
        <span className="font-bold text-slate-900 dark:text-white">
          {breakdown ? breakdown.vision.toFixed(1) : "0.0"}
        </span>
      </div>
      {breakdown && breakdown.victoryBonus > 0 && (
        <div className="flex justify-between text-[11px] text-blue-600 dark:text-blue-400 border-t border-slate-200/60 dark:border-slate-800/60 pt-1 mt-1 font-medium">
          <span>Bono de Victoria</span>
          <span className="font-bold">
            +{breakdown.victoryBonus.toFixed(0)}
          </span>
        </div>
      )}
      {breakdown && breakdown.penalties !== 0 && (
        <div
          className={cn(
            "flex justify-between text-[11px]",
            breakdown.penalties > 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-emerald-600 dark:text-emerald-400",
          )}
        >
          <span>Ajustes Especiales</span>
          <span className="font-bold">
            {breakdown.penalties > 0 ? "-" : "+"}
            {Math.abs(breakdown.penalties).toFixed(1)}
          </span>
        </div>
      )}
    </div>
    <div className="text-[9px] text-slate-400 dark:text-slate-500 italic leading-tight">
      * Los valores a la derecha indican los puntos reales aportados al score
      final.
    </div>
  </div>
);

export interface ScoreboardPlayerRowProps {
  player: any;
  isCurrentUser: boolean;
  isWinner: boolean;
  matchId: string;
  gameVersion: string;
  rankPos: number;
  breakdown?: PerformanceBreakdown;
  score: number;
  savedBuildKeys: string[];
  isSaving: boolean;
  saveBuild: (args: { matchId: string; targetPuuid: string }) => void;
  notes: Record<string, any>;
  saveNote: (data: any) => void;
  deleteNote: (puuid: string) => void;
  perkIconById: Record<string, string>;
  isListMode?: boolean;
}

export const ScoreboardPlayerRow = memo(
  ({
    player,
    isCurrentUser,
    isWinner,
    matchId,
    gameVersion,
    rankPos,
    breakdown,
    score,
    savedBuildKeys,
    isSaving,
    saveBuild,
    notes,
    saveNote,
    deleteNote,
    perkIconById,
    isListMode = false,
  }: ScoreboardPlayerRowProps) => {
    const [isNoteOpen, setIsNoteOpen] = useState(false);

    // Basic stats extraction using the helper
    const cs =
      (player.total_minions_killed ?? player.totalMinionsKilled ?? 0) +
      (player.neutral_minions_killed ?? player.neutralMinionsKilled ?? 0);

    const dmgToChamps = getValue(
      player,
      "total_damage_dealt_to_champions",
      "totalDamageDealtToChampions",
    );
    const vision = getValue(player, "vision_score", "visionScore");
    const gold = getValue(player, "gold_earned", "goldEarned");

    const tier = player.tier ?? null;
    const rank = player.rank ?? null;
    const rankBadge = formatRankBadge(tier, rank);
    const rankColor = getTierColor(tier);
    const badges: string[] = [];
    if (rankPos === 1) badges.push("MVP");

    const savedKey = `${matchId}:${player.puuid ?? ""}`;
    const isSaved = savedBuildKeys.includes(savedKey);
    const canSave = Boolean(
      matchId && typeof player.puuid === "string" && player.puuid,
    );

    if (isListMode) {
      return (
        <div
          className={cn(
            "flex flex-row items-center gap-2 px-2.5 py-1.5 border-b border-slate-200/30 dark:border-slate-800/30 last:border-0 transition-all duration-200",
            isCurrentUser
              ? isWinner
                ? "bg-blue-500/15"
                : "bg-red-500/15"
              : "bg-white/5 dark:bg-black/25",
          )}
        >
          {/* Avatar + Spells/Runes compacto */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative shrink-0">
              <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shadow-sm">
                <Image
                  src={getChampionImg(player.champion_name, gameVersion)}
                  alt={player.champion_name}
                  fill
                  sizes="36px"
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* Rank Position Badge - Sobrepuesto en esquina superior derecha */}
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 z-10 text-[7px] font-black w-[14px] h-[14px] flex items-center justify-center rounded-full shadow-lg border transition-colors",
                  rankPos === 1
                    ? "bg-amber-400 text-slate-900 border-amber-500"
                    : rankPos <= 3
                      ? "bg-sky-400 text-slate-900 border-sky-500"
                      : "bg-slate-100/95 text-slate-600 dark:bg-slate-800/95 dark:text-slate-400 border-slate-200 dark:border-slate-700",
                )}
              >
                {rankPos || "-"}
              </span>
              {(player.champ_level || player.champLevel) && (
                <div className="absolute -bottom-1 -right-1 bg-slate-900 text-[7px] text-white px-1 rounded-full border border-slate-700 z-10">
                  {player.champ_level || player.champLevel}
                </div>
              )}
            </div>

            {/* Cuadrícula 2x2 para Spells y Runas */}
            <div className="grid grid-cols-2 grid-rows-2 gap-0.5 shrink-0">
              {/* Spells */}
              {[
                player.summoner1_id || player.summoner1Id,
                player.summoner2_id || player.summoner2Id,
              ]
                .filter(Boolean)
                .map((sid, i) => (
                  <div
                    key={`s-${i}`}
                    className="w-4 h-4 rounded-sm border border-slate-300/30 dark:border-slate-700/30 overflow-hidden bg-black/20"
                  >
                    <Image
                      src={getSpellImg(sid, gameVersion)!}
                      alt="Spell"
                      width={16}
                      height={16}
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              {/* Runas */}
              <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-700/50 overflow-hidden flex items-center justify-center">
                {player.keystone_id && perkIconById[player.keystone_id] && (
                  <img
                    src={perkIconById[player.keystone_id]}
                    alt="Key"
                    className="w-full h-full object-contain scale-110"
                  />
                )}
              </div>
              <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700/30 overflow-hidden flex items-center justify-center">
                {(player.sub_style_id ||
                  player.perk_sub_style ||
                  player.perkSubStyle) && (
                  <img
                    src={
                      getRuneStyleImg(
                        player.sub_style_id ||
                          player.perk_sub_style ||
                          player.perkSubStyle,
                      )!
                    }
                    alt="Sub"
                    className="w-full h-full object-contain p-[2px]"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Nombre y KDA base */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-[11px] font-bold truncate",
                  isCurrentUser
                    ? "text-blue-500 dark:text-blue-400"
                    : "text-slate-900 dark:text-slate-100",
                )}
              >
                {player.summoner_name}
              </span>
              {badges.includes("MVP") && (
                <span className="text-[7px] font-black bg-amber-400 text-slate-900 px-1 rounded-sm">
                  MVP
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] tabular-nums">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {player.kills}/{player.deaths}/{player.assists}
              </span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-slate-500 dark:text-slate-400">
                {cs} CS
              </span>
            </div>
          </div>

          {/* Stats secundarias (Dmg/Oro) */}
          <div className="hidden min-[380px]:flex flex-col items-end justify-center px-2 border-r border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
              {(dmgToChamps / 1000).toFixed(1)}k{" "}
              <span className="text-[8px] font-normal text-slate-400">dmg</span>
            </span>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500">
              {(gold / 1000).toFixed(1)}k{" "}
              <span className="text-[8px] font-normal text-slate-400">oro</span>
            </span>
          </div>

          {/* Items ultra compactos */}
          <div className="flex gap-0.5 shrink-0 px-1">
            {[
              player.item0,
              player.item1,
              player.item2,
              player.item3,
              player.item4,
              player.item5,
            ].map((id, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-sm bg-slate-200/50 dark:bg-slate-900/50 border border-slate-300/20 dark:border-slate-700/20 overflow-hidden relative"
              >
                {id ? (
                  <Image
                    src={getItemImg(id, gameVersion)!}
                    alt="Item"
                    fill
                    sizes="16px"
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex flex-row items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 border-b border-slate-200/40 dark:border-slate-800/40 last:border-0 transition-all duration-200 bg-white/40 dark:bg-slate-900/30 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 group/row",
          isCurrentUser && isWinner && "bg-blue-500/10 dark:bg-blue-500/20",
          isCurrentUser && !isWinner && "bg-rose-500/10 dark:bg-red-500/20",
        )}
      >
        {/* SECTION 1: Avatar, Spells, Runes & Name */}
        <div className="flex items-center gap-2 sm:w-[175px] sm:shrink-0">
          <div className="flex flex-col gap-1 shrink-0">
            <div className="relative group/avatar">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover/row:border-blue-400 dark:group-hover/row:border-blue-500">
                <Image
                  src={getChampionImg(player.champion_name, gameVersion)}
                  alt={player.champion_name}
                  fill
                  sizes="40px"
                  className="object-cover"
                  unoptimized
                />
                {(player.champ_level || player.champLevel) && (
                  <div className="absolute bottom-0 right-0 bg-slate-950/90 text-[8px] sm:text-[9px] text-white px-1.5 py-0.5 font-black rounded-tl-md border-t border-l border-slate-700/50 backdrop-blur-sm">
                    {player.champ_level || player.champLevel}
                  </div>
                )}
              </div>

              {/* Rank Position Badge - Sobrepuesto en esquina superior derecha */}
              {/* Desktop version with tooltip */}
              <div className="hidden sm:block absolute -top-1 -right-1 z-10">
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          "text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg border-2 transition-all cursor-help",
                          rankPos === 1
                            ? "bg-amber-400 text-slate-900 border-amber-500"
                            : rankPos <= 3
                              ? "bg-sky-400 text-slate-900 border-sky-500"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
                        )}
                      >
                        {rankPos || "-"}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="p-3 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xl">
                      <PerformanceTooltipContent
                        score={score}
                        ranking={rankPos}
                        breakdown={breakdown}
                      />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Mobile version without tooltip */}
              <span
                className={cn(
                  "sm:hidden absolute -top-1 -right-1 z-10 text-[8px] font-black w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-lg border-2 transition-colors",
                  rankPos === 1
                    ? "bg-amber-400 text-slate-900 border-amber-500"
                    : rankPos <= 3
                      ? "bg-sky-400 text-slate-900 border-sky-500"
                      : "bg-slate-100/90 text-slate-600 dark:bg-slate-800/90 dark:text-slate-400 border-slate-200 dark:border-slate-700",
                )}
              >
                {rankPos || "-"}
              </span>
            </div>

            {/* Mobile Runes */}
            <div className="flex sm:hidden gap-1 justify-center">
              <div className="w-[16px] h-[16px] rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center shadow-sm">
                {player.keystone_id && (
                  <img
                    src={
                      perkIconById[player.keystone_id] ||
                      getPerkImg(player.keystone_id)!
                    }
                    alt="Key"
                    className="w-full h-full object-contain scale-110"
                  />
                )}
              </div>
              <div className="w-[16px] h-[16px] rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center shadow-sm">
                {(player.sub_style_id ||
                  player.perk_sub_style ||
                  player.perkSubStyle) && (
                  <img
                    src={
                      getRuneStyleImg(
                        player.sub_style_id ||
                          player.perk_sub_style ||
                          player.perkSubStyle,
                      )!
                    }
                    alt="Sub"
                    className="w-full h-full object-contain p-[3px]"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mobile Spells */}
          <div className="flex sm:hidden flex-col gap-1 shrink-0 items-center">
            {[
              player.summoner1_id || player.summoner1Id,
              player.summoner2_id || player.summoner2Id,
            ]
              .filter(Boolean)
              .map((sid, i) => (
                <div
                  key={i}
                  className="w-[16px] h-[16px] rounded border border-slate-300 dark:border-slate-700 overflow-hidden relative shadow-sm"
                >
                  <Image
                    src={getSpellImg(sid, gameVersion)!}
                    alt="Spell"
                    fill
                    sizes="16px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
          </div>

          {/* Desktop Spells & Runes (2x2 Grid) */}
          <div className="hidden sm:grid grid-cols-2 grid-rows-2 gap-1 shrink-0">
            {/* Row 1: Spell 1 + Rune 1 (Keystone) */}
            <div className="w-[18px] h-[18px] rounded border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
              {(player.summoner1_id || player.summoner1Id) && (
                <Image
                  src={
                    getSpellImg(
                      player.summoner1_id || player.summoner1Id,
                      gameVersion,
                    )!
                  }
                  alt="Spell 1"
                  width={18}
                  height={18}
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
            <div className="w-[18px] h-[18px] rounded-full bg-slate-900 border border-slate-700/50 overflow-hidden shadow-sm flex items-center justify-center">
              {player.keystone_id && (
                <img
                  src={
                    perkIconById[player.keystone_id] ||
                    getPerkImg(player.keystone_id)!
                  }
                  alt="Keystone"
                  className="w-full h-full object-contain scale-110"
                />
              )}
            </div>

            {/* Row 2: Spell 2 + Rune 2 (SubStyle) */}
            <div className="w-[18px] h-[18px] rounded border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
              {(player.summoner2_id || player.summoner2Id) && (
                <Image
                  src={
                    getSpellImg(
                      player.summoner2_id || player.summoner2Id,
                      gameVersion,
                    )!
                  }
                  alt="Spell 2"
                  width={18}
                  height={18}
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
            <div className="w-[14px] h-[14px] rounded-full bg-slate-800 border border-slate-700/30 overflow-hidden shadow-sm flex items-center justify-center self-center justify-self-center">
              {(player.sub_style_id ||
                player.perk_sub_style ||
                player.perkSubStyle) && (
                <img
                  src={
                    getRuneStyleImg(
                      player.sub_style_id ||
                        player.perk_sub_style ||
                        player.perkSubStyle,
                    )!
                  }
                  alt="SubStyle"
                  className="w-full h-full object-contain p-[2px]"
                />
              )}
            </div>
          </div>

          <div className="hidden sm:flex flex-col flex-1 min-w-0 gap-0">
            <span
              className={cn(
                "text-sm sm:text-[13px] font-medium truncate tracking-tighter sm:tracking-tight w-full",
                isCurrentUser
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-900 dark:text-white",
              )}
            >
              {player.summoner_name || "Unknown"}
            </span>

            <div className="text-[10px] sm:text-[9px] font-medium text-slate-500 dark:text-slate-400/70 truncate leading-tight">
              {player.champion_name}
            </div>

            <div className="flex items-center gap-1.5 leading-none mt-0.5">
              <span
                className={cn(
                  "text-[10px] sm:text-[9px] font-bold italic uppercase tracking-wider",
                  rankBadge && rankBadge !== "Unranked"
                    ? rankColor
                    : "text-slate-400 dark:text-slate-500",
                )}
              >
                {rankBadge && rankBadge !== "Unranked" ? rankBadge : "S/R"}
              </span>
              {badges.includes("MVP") && (
                <span className="bg-amber-400/10 text-amber-600 dark:text-amber-400 text-[9px] sm:text-[8px] font-bold px-1 rounded border border-amber-400/20">
                  MVP
                </span>
              )}
            </div>
          </div>

          {/* Mobile Name */}
          <div className="flex sm:hidden flex-col flex-1 min-w-0">
            <span
              className={cn(
                "text-xs font-semibold truncate",
                isCurrentUser
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-900 dark:text-white",
              )}
            >
              {player.summoner_name || "Unknown"}
            </span>
            <div className="text-[9px] font-medium text-slate-500 dark:text-slate-400/70 truncate">
              {player.champion_name}
            </div>
          </div>
        </div>

        {/* Mobile: KDA + Items */}
        <div className="flex sm:hidden items-center gap-2 flex-1 justify-end">
          <div className="flex flex-col items-center shrink-0">
            <div className="text-[11px] font-bold text-slate-900 dark:text-white leading-none">
              {player.kills}/{player.deaths}/{player.assists}
            </div>
            <div className="text-[9px] font-bold text-slate-500/60 mt-0.5">
              {(player.kda || 0).toFixed(2)} P/R
            </div>
            <div className="text-[9px] font-medium text-slate-500/80 mt-0.5">
              {cs} CS
            </div>
          </div>

          <div className="flex gap-1 items-center">
            <div className="grid grid-cols-3 grid-rows-2 gap-0.5">
              {[
                player.item0,
                player.item1,
                player.item2,
                player.item3,
                player.item4,
                player.item5,
              ].map((id, i) => (
                <div
                  key={i}
                  className="aspect-square w-[22px] bg-slate-200/50 dark:bg-slate-900/50 border border-slate-300/30 dark:border-slate-700/30 overflow-hidden relative shadow-inner rounded-[3px]"
                >
                  {id ? (
                    <Image
                      src={getItemImg(id, gameVersion)!}
                      alt="Item"
                      fill
                      sizes="22px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex items-center">
              <div className="aspect-square w-[22px] bg-slate-200/50 dark:bg-slate-900/50 border border-slate-300/30 dark:border-slate-700/30 overflow-hidden relative shadow-inner rounded-full ring-1 ring-amber-500/20">
                {player.item6 ? (
                  <Image
                    src={getItemImg(player.item6, gameVersion)!}
                    alt="Trinket"
                    fill
                    sizes="22px"
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              disabled={!canSave || isSaving || isSaved}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (canSave)
                  saveBuild({
                    matchId: player.match_id || matchId,
                    targetPuuid: player.puuid,
                  });
              }}
              className={cn(
                "p-1 rounded border transition-all shadow-sm flex items-center justify-center",
                isSaved
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-500",
                (!canSave || isSaving) && "opacity-40",
              )}
            >
              <BookmarkPlus className="w-3 h-3" />
            </button>
            {canSave && (
              <PlayerNoteButton
                targetPuuid={player.puuid}
                gameName={player.summoner_name}
                tagLine={""}
                championName={player.champion_name}
                gameVersion={gameVersion}
                existingNote={notes[player.puuid]}
                isOpen={isNoteOpen}
                onOpenChange={setIsNoteOpen}
                onSave={async (data) =>
                  saveNote({
                    target_puuid: player.puuid,
                    target_game_name: player.summoner_name,
                    target_tag_line: "",
                    ...data,
                  })
                }
                onDelete={async () => deleteNote(player.puuid)}
                className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 shadow-sm"
              />
            )}
          </div>
        </div>

        {/* Desktop: Stats & Items */}
        <div className="hidden sm:grid flex-1 grid-cols-[1.2fr_1.4fr_auto] items-center gap-x-10 w-full">
          <div className="col-span-2 sm:col-span-1 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-4 sm:gap-1 px-1">
            <div className="flex flex-col items-center sm:flex-row sm:gap-4 shrink-0">
              <div className="text-[14px] font-bold text-slate-900 dark:text-white leading-none tracking-tight">
                {player.kills}
                <span className="text-slate-400/40 mx-0.5">/</span>
                {player.deaths}
                <span className="text-slate-400/40 mx-0.5">/</span>
                {player.assists}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500/60 sm:mt-0.5">
                {(player.kda || 0).toFixed(2)}
              </div>
            </div>

            <div className="flex sm:grid sm:grid-rows-2 sm:grid-flow-col gap-1 items-center">
              {[
                player.item0,
                player.item1,
                player.item2,
                player.item3,
                player.item4,
                player.item5,
                player.item6,
              ].map((id, i) => (
                <div
                  key={i}
                  className={cn(
                    "aspect-square w-[26px] sm:w-[24px] bg-slate-200/50 dark:bg-slate-900/50 border border-slate-300/30 dark:border-slate-700/30 overflow-hidden relative shadow-inner transition-transform hover:scale-110 hover:z-10",
                    i === 6
                      ? "rounded-full ring-1 ring-amber-500/20 sm:row-span-2 sm:ml-1"
                      : "rounded-[4px]",
                  )}
                >
                  {id ? (
                    <Image
                      src={getItemImg(id, gameVersion)!}
                      alt="Item"
                      fill
                      sizes="28px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="flex sm:hidden items-center justify-between shrink-0 px-1">
            {/* Mobile Stats Summary */}
            <div className="flex items-center gap-2 text-[10px]">
              <div className="flex items-center gap-0.5">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {cs}
                </span>
                <span className="text-slate-500 font-medium">CS</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center gap-0.5">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {(dmgToChamps / 1000).toFixed(1)}k
                </span>
                <span className="text-slate-500 font-medium">DMG</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <div className="flex items-center gap-0.5">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {vision}
                </span>
                <span className="text-slate-500 font-medium">VIS</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center gap-0.5">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {(gold / 1000).toFixed(1)}k
                </span>
                <span className="text-slate-500 font-medium">ORO</span>
              </div>
            </div>
          </div>

          <div className="hidden sm:grid order-3 grid-cols-2 sm:col-span-1 border-l border-slate-200/40 dark:border-slate-800/40 pl-4 gap-x-6 gap-y-2">
            {[
              { val: cs, lab: "CS" },
              { val: `${(dmgToChamps / 1000).toFixed(1)}k`, lab: "DMG" },
              { val: vision, lab: "VIS" },
              { val: `${(gold / 1000).toFixed(1)}k`, lab: "ORO" },
            ].map((s, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center"
              >
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none tabular-nums">
                  {s.val}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">
                  {s.lab}
                </span>
              </div>
            ))}
          </div>

          <div className="hidden sm:flex sm:flex-col sm:order-4 items-center justify-center gap-1 sm:col-span-1 border-l border-slate-200/50 dark:border-slate-800/50 pl-2">
            <button
              type="button"
              disabled={!canSave || isSaving || isSaved}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (canSave)
                  saveBuild({
                    matchId: player.match_id || matchId,
                    targetPuuid: player.puuid,
                  });
              }}
              className={cn(
                "w-8 h-8 rounded-lg border transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center",
                isSaved
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-500 hover:border-blue-500/50",
                (!canSave || isSaving) && "opacity-40",
              )}
            >
              <BookmarkPlus className="w-4 h-4" />
            </button>
            {canSave && (
              <PlayerNoteButton
                targetPuuid={player.puuid}
                gameName={player.summoner_name}
                tagLine={""}
                championName={player.champion_name}
                gameVersion={gameVersion}
                existingNote={notes[player.puuid]}
                isOpen={isNoteOpen}
                onOpenChange={setIsNoteOpen}
                onSave={async (data) =>
                  saveNote({
                    target_puuid: player.puuid,
                    target_game_name: player.summoner_name,
                    target_tag_line: "",
                    ...data,
                  })
                }
                onDelete={async () => deleteNote(player.puuid)}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:border-amber-500/50 shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center"
              />
            )}
          </div>
        </div>
        <PlayerNoteModal
          isOpen={isNoteOpen}
          onClose={() => setIsNoteOpen(false)}
          targetPuuid={player.puuid}
          gameName={player.summoner_name}
          tagLine={""}
          championName={player.champion_name}
          gameVersion={gameVersion}
          existingNote={notes[player.puuid]}
          onSave={async (data) =>
            saveNote({
              target_puuid: player.puuid,
              target_game_name: player.summoner_name,
              target_tag_line: "",
              ...data,
            })
          }
          onDelete={async () => deleteNote(player.puuid)}
        />
      </div>
    );
  },
);

ScoreboardPlayerRow.displayName = "ScoreboardPlayerRow";
