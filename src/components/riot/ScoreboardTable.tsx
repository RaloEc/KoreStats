"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  getChampionImg,
  getItemImg,
  getSpellImg,
  getRuneStyleImg,
  getPerkImg,
} from "@/lib/riot/helpers";
import { formatRankBadge, getTierColor } from "@/lib/riot/league";
import { calculatePerformanceScore } from "@/lib/riot/match-analyzer";
import { BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSaveBuild } from "@/hooks/use-save-build";
import { usePlayerNotes } from "@/hooks/use-player-notes";
import { PlayerNoteButton } from "./PlayerNoteButton";
import { usePerkAssets } from "./match-card/RunesTooltip";

interface ScoreboardTableProps {
  participants: any[];
  currentUserPuuid?: string;
  gameVersion?: string;
  gameDuration?: number;
  matchInfo?: any;
}

export function ScoreboardTable({
  participants,
  currentUserPuuid,
  gameVersion,
  gameDuration,
  matchInfo,
}: ScoreboardTableProps) {
  const { saveBuild, isSaving, savedBuildKeys } = useSaveBuild();
  const { notes, saveNote, deleteNote } = usePlayerNotes();
  const router = useRouter();

  const defaultDuration = gameDuration || 1800;

  // Extract all keystone IDs for the hook
  const allKeystoneIds = useMemo(() => {
    const rawParticipants = matchInfo?.full_json?.info?.participants || [];
    return participants
      .map((p: any) => {
        const raw = rawParticipants.find(
          (rp: any) =>
            rp.puuid === p.puuid ||
            (rp.summonerName === p.summoner_name && rp.teamId === p.team_id)
        );
        return raw?.perks?.styles?.[0]?.selections?.[0]?.perk || p.keystone_id;
      })
      .filter(Boolean);
  }, [participants, matchInfo]);

  const { perkIconById } = usePerkAssets(allKeystoneIds);

  // --- Local Helper Functions (Inlined to avoid circular deps) ---

  const getParticipantKey = (player: any) =>
    player.puuid ?? `${player.match_id}-${player.summoner_id ?? player.id}`;

  const getValue = (p: any, key: string, altKey?: string) =>
    p[key] ?? (altKey ? p[altKey] : 0) ?? 0;

  // --- Calculations ---
  const {
    rankingMap,
    scoreMap,
    team1,
    team2,
    maxDamage,
    team1Kills,
    team2Kills,
    team1Gold,
    team2Gold,
    maxTaken,
    maxVision,
  } = useMemo(() => {
    // Basic lane order
    const laneOrder: Record<string, number> = {
      TOP: 0,
      JUNGLE: 1,
      MIDDLE: 2,
      BOTTOM: 3,
      UTILITY: 4,
    };
    const sortByLane = (players: any[]) => {
      return [...players].sort((a, b) => {
        const laneA = (a.lane || a.teamPosition || "").toUpperCase();
        const laneB = (b.lane || b.teamPosition || "").toUpperCase();
        return (laneOrder[laneA] ?? 999) - (laneOrder[laneB] ?? 999);
      });
    };

    // Split teams first to calculate team totals
    // Map the raw participants from full_json to get extra data like runes (keystone)
    const rawParticipants = matchInfo?.full_json?.info?.participants || [];
    const enhancedParticipants = participants.map((p: any) => {
      const raw = rawParticipants.find(
        (rp: any) =>
          rp.puuid === p.puuid ||
          (rp.summonerName === p.summoner_name && rp.teamId === p.team_id)
      );

      return {
        ...p,
        // Keystone is the first selection of the first style
        keystone_id:
          raw?.perks?.styles?.[0]?.selections?.[0]?.perk ?? p.keystone_id,
        // The styles are already in the DB but let's be sure
        primary_style_id:
          raw?.perks?.styles?.[0]?.style ?? p.perk_primary_style,
        sub_style_id: raw?.perks?.styles?.[1]?.style ?? p.perk_sub_style,
      };
    });

    const team1P = sortByLane(enhancedParticipants.filter((p: any) => p.win));
    const team2P = sortByLane(enhancedParticipants.filter((p: any) => !p.win));

    const t1Kills = team1P.reduce((acc: number, p: any) => acc + p.kills, 0);
    const t2Kills = team2P.reduce((acc: number, p: any) => acc + p.kills, 0);
    const t1Gold = team1P.reduce(
      (acc: number, p: any) => acc + getValue(p, "gold_earned", "goldEarned"),
      0
    );
    const t2Gold = team2P.reduce(
      (acc: number, p: any) => acc + getValue(p, "gold_earned", "goldEarned"),
      0
    );

    // Compute Scores
    const scoreEntries = participants.map((player) => {
      const isWin = player.win;
      const teamTotalKills = isWin ? t1Kills : t2Kills;
      const teamTotalGold = isWin ? t1Gold : t2Gold;

      // Let's simpler calculate team damage:
      const teamP = isWin ? team1P : team2P;
      const teamTotalDamage = teamP.reduce(
        (acc, p) =>
          acc +
          getValue(
            p,
            "total_damage_dealt_to_champions",
            "totalDamageDealtToChampions"
          ),
        0
      );

      const score = calculatePerformanceScore({
        kills: player.kills,
        deaths: player.deaths,
        assists: player.assists,
        win: player.win,
        gameDuration: defaultDuration,
        goldEarned: getValue(player, "gold_earned", "goldEarned"),
        totalDamageDealtToChampions: getValue(
          player,
          "total_damage_dealt_to_champions",
          "totalDamageDealtToChampions"
        ),
        visionScore: getValue(player, "vision_score", "visionScore"),
        totalMinionsKilled: getValue(
          player,
          "total_minions_killed",
          "totalMinionsKilled"
        ),
        neutralMinionsKilled: getValue(
          player,
          "neutral_minions_killed",
          "neutralMinionsKilled"
        ),
        role: player.role || player.lane,
        teamTotalKills,
        teamTotalDamage,
        teamTotalGold,
        objectivesStolen: 0,
      });

      return { key: getParticipantKey(player), score };
    });

    // Update participants with enhanced ones
    const finalParticipants = enhancedParticipants;

    // Create Maps
    const rankingMap = new Map<string, number>();
    const scoreMap = new Map<string, number>();

    const sortedByScore = [...scoreEntries].sort((a, b) => b.score - a.score);
    sortedByScore.forEach((entry, index) => {
      rankingMap.set(entry.key, index + 1);
      scoreMap.set(entry.key, entry.score);
    });

    const maxDmg = Math.max(
      ...finalParticipants.map((p: any) =>
        getValue(
          p,
          "total_damage_dealt_to_champions",
          "totalDamageDealtToChampions"
        )
      )
    );
    const maxTkn = Math.max(
      ...finalParticipants.map((p: any) =>
        getValue(p, "total_damage_taken", "totalDamageTaken")
      )
    );
    const maxVis = Math.max(
      ...finalParticipants.map((p: any) =>
        getValue(p, "vision_score", "visionScore")
      )
    );

    return {
      rankingMap,
      scoreMap,
      team1: team1P,
      team2: team2P,
      maxDamage: maxDmg,
      maxTaken: maxTkn,
      maxVision: maxVis,
      team1Kills: t1Kills,
      team2Kills: t2Kills,
      team1Gold: t1Gold,
      team2Gold: t2Gold,
    };
  }, [participants, defaultDuration, matchInfo]);

  const PlayerRow = ({
    player,
    isCurrentUser,
    isWinner,
    matchId,
  }: {
    player: any;
    isCurrentUser: boolean;
    isWinner: boolean;
    matchId: string;
  }) => {
    const key = getParticipantKey(player);
    const rankPos = rankingMap.get(key) ?? 0;

    // Stats
    const cs =
      (player.total_minions_killed ?? player.totalMinionsKilled ?? 0) +
      (player.neutral_minions_killed ?? player.neutralMinionsKilled ?? 0);

    const dmgToChamps = getValue(
      player,
      "total_damage_dealt_to_champions",
      "totalDamageDealtToChampions"
    );
    const dmgTaken = getValue(player, "total_damage_taken", "totalDamageTaken");
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
      matchId && typeof player.puuid === "string" && player.puuid
    );

    return (
      <div
        className={cn(
          "flex flex-row items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2.5 border-b border-slate-200/60 dark:border-slate-800/60 last:border-0 transition-all duration-200 bg-white/50 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 group/row",
          isCurrentUser && isWinner && "bg-blue-50/70 dark:bg-blue-500/10",
          isCurrentUser && !isWinner && "bg-rose-50/70 dark:bg-red-500/10"
        )}
      >
        {/* SECTION 1: Avatar, Spells, Runes & Name */}
        <div className="flex items-center gap-2 sm:w-[175px] sm:shrink-0">
          {/* Mobile: Avatar + Runas debajo | Desktop: Avatar + Spells debajo */}
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
            </div>

            {/* Desktop Spells (Hidden on Mobile) */}
            <div className="hidden sm:flex justify-between gap-1">
              {[
                player.summoner1_id || player.summoner1Id,
                player.summoner2_id || player.summoner2Id,
              ]
                .filter(Boolean)
                .map((sid, i) => (
                  <div
                    key={i}
                    className="w-[18px] h-[18px] rounded border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm"
                  >
                    <Image
                      src={getSpellImg(sid, gameVersion)!}
                      alt="Spell"
                      width={18}
                      height={18}
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
            </div>

            {/* Mobile Runes (Hidden on Desktop) */}
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
                          player.perkSubStyle
                      )!
                    }
                    alt="Sub"
                    className="w-full h-full object-contain p-[3px]"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mobile Spells (Hidden on Desktop) - A la derecha del avatar */}
          <div className="flex sm:hidden flex-col gap-1 shrink-0">
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

          {/* Desktop Runes (Hidden on Mobile) */}
          <div className="hidden sm:flex flex-col gap-1 justify-center shrink-0">
            {player.keystone_id && (
              <div className="w-[18px] h-[18px] rounded-full bg-slate-900 border border-slate-700/50 overflow-hidden shadow-sm flex items-center justify-center">
                <img
                  src={
                    perkIconById[player.keystone_id] ||
                    getPerkImg(player.keystone_id)!
                  }
                  alt="Keystone"
                  className="w-full h-full object-contain scale-110"
                />
              </div>
            )}
            {(player.sub_style_id ||
              player.perk_sub_style ||
              player.perkSubStyle) && (
              <div className="w-[14px] h-[14px] rounded-full bg-slate-800 border border-slate-700/30 self-center overflow-hidden shadow-sm">
                <img
                  src={
                    getRuneStyleImg(
                      player.sub_style_id ||
                        player.perk_sub_style ||
                        player.perkSubStyle
                    )!
                  }
                  alt="SubStyle"
                  className="w-full h-full object-contain p-[2px]"
                />
              </div>
            )}
          </div>

          <div className="hidden sm:flex flex-col flex-1 min-w-0 gap-0">
            {/* Player Name */}
            <span
              className={cn(
                "text-sm sm:text-[13px] font-medium truncate tracking-tighter sm:tracking-tight w-full",
                isCurrentUser
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-900 dark:text-white"
              )}
            >
              {player.summoner_name || "Unknown"}
            </span>

            {/* Champion Name */}
            <div className="text-[10px] sm:text-[9px] font-medium text-slate-500 dark:text-slate-400/70 truncate leading-tight">
              {player.champion_name}
            </div>

            {/* Rank / MVP (Below) */}
            <div className="flex items-center gap-1.5 leading-none mt-0.5">
              <span
                className={cn(
                  "text-[10px] sm:text-[9px] font-bold italic uppercase tracking-wider",
                  rankBadge && rankBadge !== "Unranked"
                    ? rankColor
                    : "text-slate-400 dark:text-slate-500"
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

          {/* Mobile: Player Name */}
          <div className="flex sm:hidden flex-col flex-1 min-w-0">
            <span
              className={cn(
                "text-xs font-semibold truncate",
                isCurrentUser
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-900 dark:text-white"
              )}
            >
              {player.summoner_name || "Unknown"}
            </span>
            <div className="text-[9px] font-medium text-slate-500 dark:text-slate-400/70 truncate">
              {player.champion_name}
            </div>
          </div>
        </div>

        {/* Mobile: KDA + Items in same row */}
        <div className="flex sm:hidden items-center gap-2 flex-1 justify-end">
          {/* KDA */}
          <div className="flex flex-col items-end shrink-0">
            <div className="text-[11px] font-bold text-slate-900 dark:text-white leading-none">
              {player.kills}/{player.deaths}/{player.assists}
            </div>
            <div className="text-[9px] font-bold text-slate-500/60">
              {(player.kda || 0).toFixed(2)}
            </div>
          </div>

          {/* Items */}
          <div className="flex gap-1 items-center">
            {/* 6 items principales en grid 3x2 */}
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

            {/* Ward/Trinket separado */}
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

          {/* Actions */}
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
                (!canSave || isSaving) && "opacity-40"
              )}
            >
              <BookmarkPlus className="w-3 h-3" />
            </button>
            {canSave && (
              <PlayerNoteButton
                targetPuuid={player.puuid}
                gameName={player.summoner_name}
                tagLine={""}
                existingNote={notes[player.puuid]}
                onSave={(data) =>
                  saveNote({
                    target_puuid: player.puuid,
                    target_game_name: player.summoner_name,
                    target_tag_line: "",
                    ...data,
                  })
                }
                onDelete={() => deleteNote(player.puuid)}
                className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 shadow-sm"
              />
            )}
          </div>
        </div>

        {/* Desktop: SECTION 2 - Body containing stats & items */}
        <div className="hidden sm:grid flex-1 grid-cols-[1.2fr_1.4fr_auto] items-center gap-x-10 w-full">
          {/* Combined KDA and Items Column */}
          <div className="col-span-2 sm:col-span-1 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-4 sm:gap-1 px-1">
            {/* KDA row */}
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

            {/* Items Grid (Single row mobile, two rows desktop) */}
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
                      : "rounded-[4px]"
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

          {/* Mobile Stats Summary */}
          <div className="flex sm:hidden items-center justify-between shrink-0 px-1">
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

          {/* Desktop Stats Summary */}
          <div className="hidden sm:grid order-3 grid-cols-2 sm:col-span-1 border-l border-slate-200/40 dark:border-slate-800/40 pl-6 gap-x-10 gap-y-3">
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

          {/* Rank Position (Mobile) */}
          <div className="flex sm:hidden flex-col items-end gap-1 shrink-0 px-2">
            <span
              className={cn(
                "shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border shadow-sm",
                rankPos === 1
                  ? "bg-amber-400 text-slate-900 border-amber-500"
                  : rankPos <= 3
                  ? "bg-sky-400 text-slate-900 border-sky-500"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              )}
            >
              #{rankPos || "-"}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
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
                  (!canSave || isSaving) && "opacity-40"
                )}
              >
                <BookmarkPlus className="w-3 h-3" />
              </button>
              {canSave && (
                <PlayerNoteButton
                  targetPuuid={player.puuid}
                  gameName={player.summoner_name}
                  tagLine={""}
                  existingNote={notes[player.puuid]}
                  onSave={(data) =>
                    saveNote({
                      target_puuid: player.puuid,
                      target_game_name: player.summoner_name,
                      target_tag_line: "",
                      ...data,
                    })
                  }
                  onDelete={() => deleteNote(player.puuid)}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 shadow-sm"
                />
              )}
            </div>
          </div>

          {/* Desktop Actions */}
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
                (!canSave || isSaving) && "opacity-40"
              )}
            >
              <BookmarkPlus className="w-4 h-4" />
            </button>
            {canSave && (
              <PlayerNoteButton
                targetPuuid={player.puuid}
                gameName={player.summoner_name}
                tagLine={""}
                existingNote={notes[player.puuid]}
                onSave={(data) =>
                  saveNote({
                    target_puuid: player.puuid,
                    target_game_name: player.summoner_name,
                    target_tag_line: "",
                    ...data,
                  })
                }
                onDelete={() => deleteNote(player.puuid)}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:border-amber-500/50 shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center"
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const TeamBlock = ({
    teamPlayers,
    isWin,
  }: {
    teamPlayers: any[];
    isWin: boolean;
  }) => (
    <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-black/20 shadow-xl backdrop-blur-sm transition-all duration-300">
      <div
        className={cn(
          "px-4 py-3 flex items-center justify-between border-b border-slate-200/8/0 dark:border-slate-800/80 shadow-sm",
          isWin
            ? "bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-l-4 border-l-blue-500"
            : "bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-l-4 border-l-rose-500"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm",
              isWin ? "bg-blue-500 text-white" : "bg-rose-500 text-white"
            )}
          >
            {isWin ? "Victoria" : "Derrota"}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-sm font-black text-slate-900 dark:text-white leading-none tracking-tight">
              {isWin ? team1Kills : team2Kills}
            </span>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              KILLS
            </span>
          </div>
          <div className="w-px h-8 bg-slate-200/60 dark:bg-slate-800/60" />
          <div className="flex flex-col items-center">
            <span className="text-sm font-black text-amber-500 dark:text-amber-400 leading-none tracking-tight">
              {((isWin ? team1Gold : team2Gold) / 1000).toFixed(1)}k
            </span>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              ORO
            </span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
        {teamPlayers.map((player) => (
          <PlayerRow
            key={getParticipantKey(player)}
            player={player}
            isCurrentUser={player.puuid === currentUserPuuid}
            isWinner={player.win}
            matchId={
              player.match_id || matchInfo?.game_id || matchInfo?.match_id
            }
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Team 1 */}
        <TeamBlock teamPlayers={team1} isWin={true} />
        {/* Team 2 */}
        <TeamBlock teamPlayers={team2} isWin={false} />
      </div>
      <div className="flex justify-center pt-2">
        <p className="text-[10px] text-slate-400 italic">
          Mostrando estadísticas avanzadas para{" "}
          {gameVersion
            ? `Parche ${gameVersion.split(".").slice(0, 2).join(".")}`
            : "la partida"}
        </p>
      </div>
    </div>
  );
}
