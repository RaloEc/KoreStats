"use client";

import Image from "next/image";
import { Eye, Share2 } from "lucide-react";
import type { Match, MatchCardProps } from "./MatchCard";
import {
  getChampionImageUrl,
  getItemImageUrl,
  getSummonerSpellUrl,
  getQueueName,
  formatDuration,
  getRelativeTime,
  getRuneIconUrl,
} from "./helpers";
import { LPBadge } from "./LPBadge";
import { TeammateTracker } from "@/components/riot/TeammateTracker";
import { useShareMatch } from "@/hooks/use-share-match";
import { computeParticipantScores, getParticipantKey as getParticipantKeyUtil } from "./performance-utils";
import { useRunesReforged } from "@/hooks/use-runes-reforged";
import { getKeystonePerkId, RunesTooltip } from "./RunesTooltip";

interface RiotParticipant {
  teamId: number;
  puuid: string;
  championName: string;
  summonerName?: string;
  riotIdGameName?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  totalDamageDealtToChampions?: number;
  visionScore?: number;
  summoner1Id?: number;
  summoner2Id?: number;
  perks?: {
    styles: Array<{
      style: number;
    }>;
  };
  teamPosition?: string;
  individualPosition?: string;
  lane?: string;
  win?: boolean;
}

const POSITION_ALIASES: Record<string, string> = {
  MID: "MIDDLE",
  BOT: "BOTTOM",
  SUP: "SUPPORT",
  UTILITY: "SUPPORT",
};

function normalizePosition(position?: string | null): string {
  if (!position) return "";
  const upper = position.toUpperCase();
  return POSITION_ALIASES[upper] ?? upper;
}

function getParticipantLane(participant?: RiotParticipant | null): string {
  if (!participant) return "";
  return (
    normalizePosition(participant.teamPosition) ||
    normalizePosition(participant.individualPosition) ||
    normalizePosition(participant.lane)
  );
}

function calculateKda(kills = 0, deaths = 0, assists = 0): number {
  return (kills + assists) / Math.max(1, deaths);
}

function findLaneOpponent(
  participants: RiotParticipant[],
  player?: RiotParticipant | null,
): RiotParticipant | null {
  if (!player) return null;
  const playerLane = getParticipantLane(player);
  const enemyTeamId = player.teamId === 100 ? 200 : 100;
  const enemyCandidates = participants.filter((p) => p.teamId === enemyTeamId);

  if (playerLane) {
    const directMatch = enemyCandidates.find(
      (candidate) => getParticipantLane(candidate) === playerLane,
    );
    if (directMatch) return directMatch;
  }

  return enemyCandidates[0] ?? null;
}

function getRankingBadgeClass(position?: number | null) {
  if (!position) {
    return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";
  }
  if (position === 1) {
    return "bg-amber-400 text-slate-900 dark:bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.5)]";
  }
  if (position <= 3) {
    return "bg-sky-400 text-slate-900 dark:bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.5)]";
  }
  return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
}

export function MatchCardPro({
  match,
  version,
  linkedAccountsMap = {},
  recentMatches = [],
  hideShareButton = false,
  userId,
  isOwnProfile = false,
  priority = false,
  onSelectMatch,
  onHoverMatch,
}: MatchCardProps) {
  const { shareMatch, isSharing, sharedMatches } = useShareMatch();
  const { getRuneIconUrl: fetchRuneIconUrl } = useRunesReforged();

  if (!match.matches) return null;

  const isVictory = match.win;
  const isProcessing = (match.matches as any)?.ingest_status === "processing";
  const isFailed = (match.matches as any)?.ingest_status === "failed";

  const REMAKE_DURATION_THRESHOLD = 300;
  const isRemake = Boolean((match.matches?.game_duration ?? 0) < REMAKE_DURATION_THRESHOLD);

  const cardStateClasses = isRemake
    ? "border-l-slate-400 dark:border-l-slate-500 bg-slate-100/50 dark:bg-slate-500/5 hover:bg-slate-200/50 dark:hover:bg-slate-500/10"
    : isVictory
      ? "border-l-emerald-600 dark:border-l-green-500 bg-emerald-50/50 dark:bg-green-500/5 hover:bg-emerald-100/50 dark:hover:bg-green-500/10"
      : "border-l-rose-600 dark:border-l-red-500 bg-rose-50/50 dark:bg-red-500/5 hover:bg-rose-100/50 dark:hover:bg-red-500/10";

  const resultLabel = isFailed ? "Error" : isRemake ? "Remake" : isVictory ? "Victoria" : "Derrota";
  const resultColorClass = isVictory
    ? "text-emerald-700 dark:text-green-500"
    : isRemake
      ? "text-slate-600 dark:text-slate-400"
      : "text-rose-700 dark:text-red-500";

  // Participants logic
  let participants = (match.matches?.full_json?.info?.participants ?? []) as RiotParticipant[];
  if (participants.length === 0 && match.matches.match_participants) {
    participants = match.matches.match_participants.map((p: any, idx: number) => ({
      puuid: p.puuid,
      championName: p.champion_name,
      summonerName: p.summoner_name || p.riotIdGameName,
      riotIdGameName: p.riotIdGameName,
      teamId: p.team_id || (idx < 5 ? 100 : 200),
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      totalMinionsKilled: p.total_minions_killed,
      neutralMinionsKilled: p.neutral_minions_killed,
      teamPosition: p.team_position,
      individualPosition: p.team_position,
      lane: p.lane,
      summoner1Id: p.summoner1_id,
      summoner2Id: p.summoner2_id,
      perks: {
        styles: [
          { style: p.perk_primary_style },
          { style: p.perk_sub_style },
        ],
      },
      win: p.win,
    }));
  }

  const player = participants.find(p => p.puuid === match.puuid) || null;
  const opponent = findLaneOpponent(participants, player);

  // Ranking logic
  const scoreEntries = computeParticipantScores(participants, match.matches.game_duration, match.matches.full_json?.info);
  const sortedByScore = [...scoreEntries].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const rankingPositions = new Map<string, number>();
  sortedByScore.forEach((entry, index) => {
    rankingPositions.set(entry.key, index + 1);
  });

  const playerRanking = rankingPositions.get(getParticipantKeyUtil(player)) || null;
  const opponentRanking = rankingPositions.get(getParticipantKeyUtil(opponent)) || null;

  const playerKdaRatio = player ? calculateKda(player.kills, player.deaths, player.assists) : match.kda;
  const opponentKdaRatio = opponent ? calculateKda(opponent.kills, opponent.deaths, opponent.assists) : 0;

  const playerCsTotal = player ? (player.totalMinionsKilled || 0) + (player.neutralMinionsKilled || 0) : 0;
  const playerCsPerMin = playerCsTotal / Math.max(1, match.matches.game_duration / 60);

  const opponentCsTotal = opponent ? (opponent.totalMinionsKilled || 0) + (opponent.neutralMinionsKilled || 0) : 0;
  const opponentCsPerMin = opponentCsTotal / Math.max(1, match.matches.game_duration / 60);

  const playerKeystoneId = getKeystonePerkId(player?.perks as any);
  const opponentKeystoneId = getKeystonePerkId(opponent?.perks as any);

  const items = [
    match.item0, match.item1, match.item2,
    match.item3, match.item4, match.item5,
    match.item6
  ].filter(id => id && id !== 0);

  const renderSummonerSpell = (spellId?: number) => {
    if (!spellId) return null;
    const url = getSummonerSpellUrl(spellId, version);
    if (!url) return null;
    return (
      <div className="relative w-5 h-5 rounded border border-slate-700/50 overflow-hidden bg-slate-800">
        <Image src={url} alt="Spell" fill sizes="20px" className="object-cover" />
      </div>
    );
  };

  const renderRuneIcon = (runeId?: number, keystoneId?: number) => {
    const url = keystoneId ? fetchRuneIconUrl(keystoneId) : (runeId ? getRuneIconUrl(runeId) : null);
    if (!url) return null;
    return (
      <div className="relative w-5 h-5 rounded-full overflow-hidden bg-slate-900 border border-slate-800/50">
        <Image src={url} alt="Rune" fill sizes="20px" className="object-cover p-0.5" unoptimized={!!keystoneId} />
      </div>
    );
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectMatch?.(match.match_id)}
      onMouseEnter={() => onHoverMatch?.(match.match_id)}
      className={`
        w-full flex flex-col p-3 rounded-xl border-l-4 transition-all hover:shadow-md cursor-pointer border border-slate-200 dark:border-transparent
        ${cardStateClasses} ${isProcessing ? "opacity-70" : ""} ${isFailed ? "opacity-50" : ""}
      `}
    >
      {/* Top Header: Queue, Time, Share */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black uppercase tracking-wider ${resultColorClass}`}>
            {resultLabel}
          </span>
          <span className="text-[10px] text-slate-700 dark:text-slate-400 font-bold">
            {getQueueName(match.matches.queue_id)} • {getRelativeTime(match.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-500">
            {formatDuration(match.matches.game_duration)}
          </span>
          {!hideShareButton && (
            <button
              onClick={(e) => { e.stopPropagation(); shareMatch(match.match_id); }}
              className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-500 transition-colors"
              disabled={isSharing || sharedMatches.includes(match.match_id)}
            >
              <Share2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main VS Container */}
      <div className="flex items-center justify-between gap-2 mb-4 bg-white/40 dark:bg-black/20 p-2 rounded-lg border border-slate-200/50 dark:border-transparent">

        {/* PLAYER SIDE */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1 items-center">
            <span className="text-[9px] font-black text-slate-800 dark:text-slate-100 truncate max-w-[50px] leading-tight mb-0.5" title={match.summoner_name}>
              {match.summoner_name}
            </span>
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-sm">
              <Image
                src={getChampionImageUrl(match.champion_name, version)}
                alt={match.champion_name}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div className="flex gap-1 mt-0.5">
              {renderSummonerSpell(match.summoner1_id)}
              {renderSummonerSpell(match.summoner2_id)}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex flex-col">
              {renderRuneIcon(player?.perks?.styles[0]?.style, playerKeystoneId)}
              {renderRuneIcon(player?.perks?.styles[1]?.style)}
            </div>
            {playerRanking && (
              <div className={`text-[9px] font-black px-1 rounded-full text-center shadow-sm ${getRankingBadgeClass(playerRanking)}`}>
                #{playerRanking}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center ml-1">
            <span className="text-xs font-black text-slate-900 dark:text-white leading-none mt-1">
              {match.kills} / {match.deaths} / {match.assists}
            </span>
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 mt-0.5">{playerKdaRatio.toFixed(2)}</span>
            <div className="mt-1 flex flex-col items-center leading-none">
              <span className="text-[11px] font-black text-slate-900 dark:text-white">{playerCsTotal} CS</span>
              <span className="text-[9px] font-black text-slate-600 dark:text-slate-500">{playerCsPerMin.toFixed(1)}/m</span>
            </div>
          </div>
        </div>

        {/* VS SEPARATOR */}
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-600/50">VS</div>

        {/* OPPONENT SIDE */}
        <div className="flex items-center gap-2">

          <div className="flex flex-col items-center mr-1">
            <span className="text-xs font-black text-slate-900 dark:text-white leading-none mt-1">
              {opponent?.kills || 0} / {opponent?.deaths || 0} / {opponent?.assists || 0}
            </span>
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 mt-0.5">{opponentKdaRatio.toFixed(2)}</span>
            <div className="mt-1 flex flex-col items-center leading-none">
              <span className="text-[11px] font-black text-white">{opponentCsTotal} CS</span>
              <span className="text-[9px] font-black text-slate-600 dark:text-slate-500">{opponentCsPerMin.toFixed(1)}/m</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex flex-col">
              {renderRuneIcon(opponent?.perks?.styles[0]?.style, opponentKeystoneId)}
              {renderRuneIcon(opponent?.perks?.styles[1]?.style)}
            </div>
            {opponentRanking && (
              <div className={`text-[9px] font-black px-1 rounded-full text-center shadow-sm ${getRankingBadgeClass(opponentRanking)}`}>
                #{opponentRanking}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 items-center">
            <span className="text-[9px] font-black text-slate-800 dark:text-slate-100 truncate max-w-[50px] leading-tight mb-0.5" title={opponent?.summonerName || opponent?.riotIdGameName || "Rival"}>
              {opponent?.summonerName || opponent?.riotIdGameName || "Rival"}
            </span>
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-sm">
              {opponent && (
                <Image
                  src={getChampionImageUrl(opponent.championName, version)}
                  alt={opponent.championName}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex gap-1 mt-0.5">
              {renderSummonerSpell(opponent?.summoner1Id)}
              {renderSummonerSpell(opponent?.summoner2Id)}
            </div>
          </div>
        </div>

      </div>

      {/* Footer: Items Centered */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5 justify-center flex-wrap">
          {items.map((itemId, idx) => (
            <div key={idx} className="relative w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 overflow-hidden shadow-sm">
              <Image
                src={getItemImageUrl(itemId, version)}
                alt="Item"
                fill
                sizes="32px"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between w-full pt-2 border-t border-slate-300 dark:border-slate-800/50">
          <LPBadge lp={match.lp_change} className="scale-90 origin-left" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-400">
              <Eye className="w-3.5 h-3.5" />
              <span>{match.vision_score}</span>
            </div>
            <TeammateTracker
              matches={recentMatches}
              currentMatch={match}
              currentPuuid={match.puuid}
              className="text-[10px] font-bold text-slate-700 dark:text-slate-400"
              linkedAccountsMap={linkedAccountsMap}
              showInline
            />
          </div>
        </div>
      </div>
    </div>
  );
}
