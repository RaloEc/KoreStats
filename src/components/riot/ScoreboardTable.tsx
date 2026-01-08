"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  PerformanceBreakdown,
  calculateDetailedPerformanceScore,
} from "@/lib/riot/match-analyzer";
import { useSaveBuild } from "@/hooks/use-save-build";
import { usePlayerNotes } from "@/hooks/use-player-notes";
import { usePerkAssets } from "./match-card/RunesTooltip";
import { ScoreboardPlayerRow } from "./ScoreboardPlayerRow";

interface ScoreboardTableProps {
  participants: any[];
  currentUserPuuid?: string;
  gameVersion?: string;
  gameDuration?: number;
  matchInfo?: any;
}

// Helper functions
const getParticipantKey = (player: any) =>
  player.puuid ?? `${player.match_id}-${player.summoner_id ?? player.id}`;

const getValue = (p: any, key: string, altKey?: string) =>
  p[key] ?? (altKey ? p[altKey] : 0) ?? 0;

export function ScoreboardTable({
  participants,
  currentUserPuuid,
  gameVersion,
  gameDuration,
  matchInfo,
}: ScoreboardTableProps) {
  const { saveBuild, isSaving, savedBuildKeys } = useSaveBuild();
  const { notes, saveNote, deleteNote } = usePlayerNotes();

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

  const {
    rankingMap,
    scoreMap,
    breakdownMap,
    team1,
    team2,
    team1Kills,
    team2Kills,
    team1Gold,
    team2Gold,
  } = useMemo(() => {
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

    const rawParticipants = matchInfo?.full_json?.info?.participants || [];
    const enhancedParticipants = participants.map((p: any) => {
      const raw = rawParticipants.find(
        (rp: any) =>
          rp.puuid === p.puuid ||
          (rp.summonerName === p.summoner_name && rp.teamId === p.team_id)
      );

      return {
        ...p,
        keystone_id:
          raw?.perks?.styles?.[0]?.selections?.[0]?.perk ?? p.keystone_id,
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

    const scoreEntries = participants.map((player) => {
      const isWin = player.win;
      const teamTotalKills = isWin ? t1Kills : t2Kills;
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

      const breakdown = calculateDetailedPerformanceScore({
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
        teamTotalGold: isWin ? t1Gold : t2Gold,
        objectivesStolen: 0,
      });

      return {
        key: getParticipantKey(player),
        score: breakdown.total,
        breakdown,
      };
    });

    const rankingMap = new Map<string, number>();
    const scoreMap = new Map<string, number>();
    const breakdownMap = new Map<string, PerformanceBreakdown>();

    const sortedByScore = [...scoreEntries].sort((a, b) => b.score - a.score);
    sortedByScore.forEach((entry, index) => {
      rankingMap.set(entry.key, index + 1);
      scoreMap.set(entry.key, entry.score);
      if (entry.breakdown) breakdownMap.set(entry.key, entry.breakdown);
    });

    return {
      rankingMap,
      scoreMap,
      breakdownMap,
      team1: team1P,
      team2: team2P,
      team1Kills: t1Kills,
      team2Kills: t2Kills,
      team1Gold: t1Gold,
      team2Gold: t2Gold,
    };
  }, [participants, defaultDuration, matchInfo]);

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
          "px-4 py-3 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm",
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
        {teamPlayers.map((player) => {
          const key = getParticipantKey(player);
          const breakdown = breakdownMap?.get(key);
          const score = scoreMap?.get(key) ?? 0;
          const rankPos = rankingMap?.get(key) ?? 0;

          return (
            <ScoreboardPlayerRow
              key={key}
              player={player}
              isCurrentUser={player.puuid === currentUserPuuid}
              isWinner={player.win}
              matchId={
                player.match_id || matchInfo?.game_id || matchInfo?.match_id
              }
              gameVersion={gameVersion || ""}
              rankPos={rankPos}
              breakdown={breakdown}
              score={score}
              savedBuildKeys={savedBuildKeys}
              isSaving={isSaving}
              saveBuild={saveBuild}
              notes={notes}
              saveNote={saveNote}
              deleteNote={deleteNote}
              perkIconById={perkIconById}
            />
          );
        })}
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
