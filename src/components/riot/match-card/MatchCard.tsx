"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, Share2 } from "lucide-react";
import { useShareMatch } from "@/hooks/use-share-match";
import { calculatePerformanceScore } from "@/lib/riot/match-analyzer";
import {
  computeParticipantScores,
  getParticipantKey as getParticipantKeyUtil,
  type ParticipantScoreEntry,
} from "./performance-utils";
import { TeamPlayerList } from "./TeamPlayerList";
import { TeammateTracker } from "@/components/riot/TeammateTracker";
import {
  getChampionImageUrl,
  getItemImageUrl,
  getSummonerSpellUrl,
  getRuneIconUrl,
  getQueueName,
  formatDuration,
  getRelativeTime,
} from "./helpers";
import {
  getKeystonePerkId,
  RunesTooltip,
  type RunePerks,
  usePerkAssets,
} from "./RunesTooltip";
import { LPBadge } from "./LPBadge";

interface RiotParticipant {
  teamId: number;
  puuid: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions?: number;
  damageDealtToObjectives?: number;
  totalDamageTaken?: number;
  damageSelfMitigated?: number;
  visionScore?: number;
  wardsPlaced?: number;
  summoner1Id?: number;
  summoner2Id?: number;
  perks?: RunePerks;
  teamPosition?: string;
  individualPosition?: string;
  lane?: string;
  role?: string;
  riotIdGameName?: string;
  summonerName?: string;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  gameEndedInEarlySurrender?: boolean;
  teamEarlySurrendered?: boolean;
  damageDealtToTurrets?: number;
  goldEarned?: number;
  win?: boolean;
  objectivesStolen?: number;
}

interface PlayerSummaryData {
  championName: string;
  summoner1Id?: number;
  summoner2Id?: number;
  primaryRune?: number;
  secondaryRune?: number;
  perks?: RunePerks;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  csTotal?: number;
  csPerMinute?: number;
  label?: string;
  rankingPosition?: number | null;
}

interface PlayerSummaryProps {
  data: PlayerSummaryData;
  version: string;
  reverse?: boolean;
  priority?: boolean;
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

function getRankingBadgeClass(position?: number | null) {
  if (!position) {
    return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";
  }
  if (position === 1) {
    return "bg-amber-400 text-slate-900 dark:bg-amber-300";
  }
  if (position <= 3) {
    return "bg-sky-400 text-slate-900 dark:bg-sky-300";
  }
  return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
}

function getParticipantRuneStyle(
  participant: RiotParticipant | null | undefined,
  index: number
): number | undefined {
  return participant?.perks?.styles?.[index]?.style;
}

interface TeamTotals {
  kills: number;
  damage: number;
  gold: number;
}

function buildTeamTotals(
  participants: RiotParticipant[]
): Record<number, TeamTotals> {
  return participants.reduce((acc, participant) => {
    const teamId = participant.teamId ?? 0;
    if (!acc[teamId]) {
      acc[teamId] = { kills: 0, damage: 0, gold: 0 };
    }
    acc[teamId].kills += participant.kills ?? 0;
    acc[teamId].damage += participant.totalDamageDealtToChampions ?? 0;
    acc[teamId].gold += participant.goldEarned ?? 0;
    return acc;
  }, {} as Record<number, TeamTotals>);
}

function buildTeamWinMap(matchInfo: any): Record<number, boolean> {
  const teams = matchInfo?.teams ?? [];
  return teams.reduce((acc: Record<number, boolean>, team: any) => {
    if (typeof team?.teamId === "number") {
      acc[team.teamId] = Boolean(team.win);
    }
    return acc;
  }, {});
}

function getParticipantKey(participant?: RiotParticipant | null): string {
  if (!participant) {
    return "unknown";
  }
  return (
    participant.puuid ||
    `${participant.teamId}-${
      participant.riotIdGameName ??
      participant.summonerName ??
      participant.championName
    }`
  );
}

function getParticipantPerformanceScore(
  participant: RiotParticipant,
  gameDuration: number,
  teamTotals: Record<number, TeamTotals>,
  teamWinMap: Record<number, boolean>
): number {
  const teamId = participant.teamId ?? 0;
  const totals = teamTotals[teamId] ?? { kills: 0, damage: 0, gold: 0 };

  return calculatePerformanceScore({
    kills: participant.kills ?? 0,
    deaths: participant.deaths ?? 0,
    assists: participant.assists ?? 0,
    win: participant.win ?? teamWinMap[teamId] ?? false,
    gameDuration,
    goldEarned: participant.goldEarned ?? 0,
    totalDamageDealtToChampions: participant.totalDamageDealtToChampions ?? 0,
    visionScore: participant.visionScore ?? 0,
    totalMinionsKilled: participant.totalMinionsKilled ?? 0,
    neutralMinionsKilled: participant.neutralMinionsKilled ?? 0,
    role:
      participant.teamPosition ?? participant.role ?? participant.lane ?? null,
    teamTotalKills: totals.kills,
    teamTotalDamage: totals.damage,
    teamTotalGold: totals.gold,
    objectivesStolen: participant.objectivesStolen ?? 0,
  });
}

function findLaneOpponent(
  participants: RiotParticipant[],
  player?: RiotParticipant | null
): RiotParticipant | null {
  if (!player) return null;
  const playerLane = getParticipantLane(player);
  const enemyTeamId = player.teamId === 100 ? 200 : 100;
  const enemyCandidates = participants.filter((p) => p.teamId === enemyTeamId);

  if (playerLane) {
    const directMatch = enemyCandidates.find(
      (candidate) => getParticipantLane(candidate) === playerLane
    );
    if (directMatch) return directMatch;
  }

  return enemyCandidates[0] ?? null;
}

function PlayerSummarySection({
  data,
  version,
  reverse = false,
  priority = false,
}: PlayerSummaryProps) {
  const keystonePerkId = getKeystonePerkId(data.perks);
  const { perkIconById, perkNameById } = usePerkAssets([keystonePerkId]);

  const avatarBlock = (
    <div className="flex flex-col items-center gap-1.5 w-[72px]">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-600 bg-slate-800">
        <Image
          src={getChampionImageUrl(data.championName, version)}
          alt={data.championName}
          fill
          sizes="64px"
          className="object-cover"
          priority={priority}
        />
      </div>

      {(data.summoner1Id || data.summoner2Id) && (
        <div className="flex gap-1">
          {data.summoner1Id && (
            <div className="relative w-7 h-7 rounded border border-slate-600 overflow-hidden bg-slate-800">
              {getSummonerSpellUrl(data.summoner1Id, version) && (
                <Image
                  src={getSummonerSpellUrl(data.summoner1Id, version)}
                  alt="Spell 1"
                  fill
                  sizes="28px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
          )}
          {data.summoner2Id && (
            <div className="relative w-7 h-7 rounded border border-slate-600 overflow-hidden bg-slate-800">
              {getSummonerSpellUrl(data.summoner2Id, version) && (
                <Image
                  src={getSummonerSpellUrl(data.summoner2Id, version)}
                  alt="Spell 2"
                  fill
                  sizes="28px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const runeBlock = (
    <div className={`flex flex-col gap-1.5 ${reverse ? "items-end" : ""}`}>
      <RunesTooltip perks={data.perks}>
        <div className={`flex flex-col gap-1.5 ${reverse ? "items-end" : ""}`}>
          {keystonePerkId && perkIconById[keystonePerkId] ? (
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-900">
              <Image
                src={perkIconById[keystonePerkId]}
                alt={perkNameById[keystonePerkId] ?? "Keystone"}
                fill
                sizes="28px"
                className="object-cover p-0.5"
                unoptimized
              />
            </div>
          ) : data.primaryRune ? (
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-900">
              <Image
                src={getRuneIconUrl(data.primaryRune)}
                alt="Primary Style"
                fill
                sizes="28px"
                className="object-cover p-0.5"
                unoptimized
              />
            </div>
          ) : null}

          {data.secondaryRune && (
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-900">
              <Image
                src={getRuneIconUrl(data.secondaryRune)}
                alt="Secondary Style"
                fill
                sizes="28px"
                className="object-cover p-0.5"
                unoptimized
              />
            </div>
          )}
        </div>
      </RunesTooltip>
      {typeof data.rankingPosition === "number" && data.rankingPosition > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow ${getRankingBadgeClass(
            data.rankingPosition
          )}`}
          title={`Ranking global #${data.rankingPosition}`}
        >
          #{data.rankingPosition}
        </span>
      )}
    </div>
  );

  const statsBlock = (
    <div
      className={`flex flex-col gap-1 w-[80px] flex-shrink-0 ${
        reverse ? "items-center text-center" : "items-center text-center"
      }`}
    >
      {data.label && (
        <span className="text-[10px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
          {data.label}
        </span>
      )}
      <div className="text-sm font-bold text-slate-600 dark:text-slate-100">
        {data.kills} / {data.deaths} / {data.assists}
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-400 text-center">
        {data.kda.toFixed(2)}
      </div>
      {typeof data.csTotal === "number" && (
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-100 text-center">
          {data.csTotal} CS
        </div>
      )}
      {typeof data.csPerMinute === "number" && (
        <div className="text-[11px] text-slate-600 dark:text-slate-400 text-center">
          {data.csPerMinute.toFixed(1)} CS/min
        </div>
      )}
    </div>
  );

  return (
    <div className="flex itemsolver gap-3">
      {reverse ? (
        <>
          {statsBlock}
          {runeBlock}
          {avatarBlock}
        </>
      ) : (
        <>
          {avatarBlock}
          {runeBlock}
          {statsBlock}
        </>
      )}
    </div>
  );
}

export interface Match {
  id: string;
  match_id: string;
  summoner_name: string;
  champion_id: number;
  champion_name: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  total_damage_dealt: number;
  gold_earned: number;
  vision_score: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  summoner1_id?: number;
  summoner2_id?: number;
  perk_primary_style?: number;
  perk_sub_style?: number;
  lane: string;
  role: string;
  created_at: string;
  puuid: string;
  objectives_stolen?: number;
  matches: {
    match_id: string;
    game_creation: number;
    game_duration: number;
    game_mode: string;
    queue_id: number;
    full_json?: any;
  };
}

interface MatchCardProps {
  match: Match;
  version: string;
  linkedAccountsMap?: Record<string, string>;
  recentMatches?: Match[];
  hideShareButton?: boolean;
  userId?: string;
  isOwnProfile?: boolean;
  priority?: boolean;
  onSelectMatch?: (matchId: string) => void;
}

export type { MatchCardProps };

export function MatchCard({
  match,
  version,
  linkedAccountsMap = {},
  recentMatches = [],
  hideShareButton = false,
  userId,
  isOwnProfile = false,
  priority = false,
  onSelectMatch,
}: MatchCardProps) {
  const { shareMatch, isSharing, sharedMatches } = useShareMatch();

  // Validar que match.matches existe
  if (!match.matches) {
    return null;
  }

  // Estado de ingesta: si está en 'processing', mostrar indicador
  const isProcessing = (match.matches as any)?.ingest_status === "processing";
  const isFailed = (match.matches as any)?.ingest_status === "failed";

  const isVictory = match.win;
  const REMAKE_DURATION_THRESHOLD = 300; // 5 minutos
  const participants = (match.matches?.full_json?.info?.participants ??
    []) as RiotParticipant[];
  const isRemake = Boolean(
    (match.matches?.game_duration ?? 0) < REMAKE_DURATION_THRESHOLD ||
      participants.some(
        (participant) =>
          participant?.gameEndedInEarlySurrender ||
          participant?.teamEarlySurrendered
      )
  );
  const coreItems = [
    match.item0,
    match.item1,
    match.item2,
    match.item3,
    match.item4,
    match.item5,
  ].map((id) => (id && id !== 0 ? id : null));

  const trinketItem = match.item6 && match.item6 !== 0 ? match.item6 : null;

  // Datos de jugadores
  const allParticipants = (match.matches?.full_json?.info?.participants ??
    []) as RiotParticipant[];
  const team1 = allParticipants
    .filter((p: any) => p.teamId === 100)
    .slice(0, 5);
  const team2 = allParticipants
    .filter((p: any) => p.teamId === 200)
    .slice(0, 5);

  const currentParticipant =
    allParticipants.find((p) => p.puuid === match.puuid) ?? null;
  const laneOpponentParticipant = findLaneOpponent(
    allParticipants,
    currentParticipant
  );

  const playerCs = currentParticipant
    ? (currentParticipant.totalMinionsKilled ?? 0) +
      (currentParticipant.neutralMinionsKilled ?? 0)
    : null;
  const csPerMinute =
    playerCs !== null && match.matches.game_duration
      ? playerCs / Math.max(1, match.matches.game_duration / 60)
      : null;

  const opponentCs = laneOpponentParticipant
    ? (laneOpponentParticipant.totalMinionsKilled ?? 0) +
      (laneOpponentParticipant.neutralMinionsKilled ?? 0)
    : null;
  const opponentCsPerMinute =
    opponentCs !== null && match.matches.game_duration
      ? opponentCs / Math.max(1, match.matches.game_duration / 60)
      : null;

  const playerTeamParticipants = currentParticipant
    ? allParticipants.filter(
        (participant) => participant.teamId === currentParticipant.teamId
      )
    : [];

  const teamKills = playerTeamParticipants.reduce(
    (sum, participant) => sum + (participant.kills ?? 0),
    0
  );

  const killParticipation =
    currentParticipant && teamKills > 0
      ? ((currentParticipant.kills ?? 0) + (currentParticipant.assists ?? 0)) /
        teamKills
      : null;

  const teamDamageToChampions = playerTeamParticipants.reduce(
    (sum, participant) => sum + (participant.totalDamageDealtToChampions ?? 0),
    0
  );

  const teamDamageShare =
    currentParticipant && teamDamageToChampions > 0
      ? (currentParticipant.totalDamageDealtToChampions ?? 0) /
        teamDamageToChampions
      : null;

  const playerVisionScore =
    currentParticipant?.visionScore ?? match.vision_score ?? undefined;

  // Usar ranking y performance score del servidor (persistidos en BD)
  // IMPORTANTE: No recalcular localmente para mantener consistencia con scoreboards
  let playerRankingPosition =
    typeof (match as any).ranking_position === "number" &&
    (match as any).ranking_position > 0
      ? (match as any).ranking_position
      : null;
  let playerScore =
    typeof (match as any).performance_score === "number"
      ? (match as any).performance_score
      : 0;

  // Fallback: recalcular SOLO si ambos están ausentes (datos muy antiguos)
  if (playerRankingPosition === null && playerScore === 0) {
    const scoreEntries = computeParticipantScores(
      allParticipants,
      match.matches.game_duration,
      match.matches.full_json?.info
    );

    const sortedByScore = [...scoreEntries].sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0)
    );
    const rankingPositions = new Map<string, number>();
    sortedByScore.forEach((entry, index) => {
      rankingPositions.set(entry.key, index + 1);
    });
    const playerKey = currentParticipant
      ? getParticipantKeyUtil(currentParticipant)
      : null;
    const playerScoreEntry = playerKey
      ? scoreEntries.find((entry) => entry.key === playerKey)
      : null;
    playerRankingPosition = playerKey
      ? rankingPositions.get(playerKey) ?? null
      : null;
    playerScore = playerScoreEntry?.score ?? 0;

    if (
      !playerRankingPosition &&
      playerScoreEntry &&
      sortedByScore.length > 0 &&
      typeof sortedByScore[0]?.score === "number" &&
      Math.abs(playerScoreEntry.score - (sortedByScore[0]?.score ?? 0)) < 0.01
    ) {
      playerRankingPosition = 1;
    }
  }

  const playerSummary: PlayerSummaryData = {
    championName: match.champion_name,
    summoner1Id: match.summoner1_id,
    summoner2Id: match.summoner2_id,
    primaryRune: match.perk_primary_style,
    secondaryRune: match.perk_sub_style,
    perks: currentParticipant?.perks,
    kills: match.kills,
    deaths: match.deaths,
    assists: match.assists,
    kda: match.kda,
    csTotal: playerCs ?? undefined,
    csPerMinute: csPerMinute ?? undefined,
    label: "Tú",
    rankingPosition: playerRankingPosition,
  };

  const opponentSummary: PlayerSummaryData | null = laneOpponentParticipant
    ? {
        championName: laneOpponentParticipant.championName,
        summoner1Id: laneOpponentParticipant.summoner1Id,
        summoner2Id: laneOpponentParticipant.summoner2Id,
        primaryRune: getParticipantRuneStyle(laneOpponentParticipant, 0),
        secondaryRune: getParticipantRuneStyle(laneOpponentParticipant, 1),
        perks: laneOpponentParticipant.perks,
        kills: laneOpponentParticipant.kills ?? 0,
        deaths: laneOpponentParticipant.deaths ?? 0,
        assists: laneOpponentParticipant.assists ?? 0,
        kda: calculateKda(
          laneOpponentParticipant.kills,
          laneOpponentParticipant.deaths,
          laneOpponentParticipant.assists
        ),
        csTotal: opponentCs ?? undefined,
        csPerMinute: opponentCsPerMinute ?? undefined,
        label: "Rival",
      }
    : null;

  const cardStateClasses = isRemake
    ? "border-l-slate-500 bg-slate-500/5 hover:bg-slate-500/10"
    : isVictory
    ? "border-l-green-500 bg-green-500/5 hover:bg-green-500/10"
    : "border-l-red-500 bg-red-500/5 hover:bg-red-500/10";

  const outcomeTextClass = isRemake
    ? "text-slate-600 dark:text-slate-400"
    : isVictory
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";

  const outcomeLabel = isRemake ? "Remake" : isVictory ? "Victoria" : "Derrota";
  const statusLabel = isFailed ? "❌ Error" : outcomeLabel;

  return (
    <div className="block">
      {/* 
        Al hacer click, abre un modal con el scoreboard
        Desde el modal se puede navegar a la página completa con análisis
      */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectMatch?.(match.match_id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onSelectMatch?.(match.match_id);
          }
        }}
        className={`
          hidden md:grid grid-cols-[60px,auto,180px,90px,200px] items-center gap-3 p-3 rounded-lg border-l-4 transition-all hover:shadow-lg hover:border-l-8 cursor-pointer
          ${isProcessing ? "opacity-70" : ""} ${
          isFailed ? "opacity-50" : ""
        } ${cardStateClasses}
        `}
      >
        {/* 1. Metadata */}
        <div className="flex flex-col gap-1 text-[11px]">
          <span
            className={`uppercase tracking-wide font-semibold ${outcomeTextClass}`}
          >
            {statusLabel}
          </span>
          <LPBadge
            gameId={(() => {
              // Extraer solo el número del gameId
              // El match_id puede venir como "LA2_1676038425" o "1676038425"
              const parts = match.match_id.split("_");
              const gameIdStr = parts.length > 1 ? parts[1] : parts[0];
              return gameIdStr;
            })()}
            userId={userId}
            queueId={match.matches.queue_id}
            isOwnProfile={isOwnProfile}
          />
          <span className="text-sm font-bold text-slate-600 dark:text-white leading-tight">
            {getQueueName(match.matches.queue_id)}
          </span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {formatDuration(match.matches.game_duration)}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {getRelativeTime(match.created_at)}
          </span>
        </div>

        {/* 2. Champion summaries */}
        <div className="flex items-stretch gap-4 pr-4 border-r border-slate-800/60">
          <div className="flex-[0.9] min-w-0">
            <PlayerSummarySection
              data={playerSummary}
              version={version}
              priority={priority}
            />
          </div>
          {opponentSummary && (
            <>
              <div className="flex flex-col items-center justify-center px-0">
                <span className="text-xs font-semibold text-slate-500 tracking-widest">
                  VS
                </span>
              </div>
              <div className="flex-[1] min-w-0">
                <PlayerSummarySection
                  data={opponentSummary}
                  version={version}
                  reverse
                  priority={priority}
                />
              </div>
            </>
          )}
        </div>

        {/* 3. Items */}
        <div className="flex items-center gap-2 pl-4">
          <div className="grid grid-cols-3 grid-rows-2 gap-1">
            {coreItems.map((itemId, idx) => (
              <div
                key={idx}
                className={`relative w-7 h-7 rounded overflow-hidden ${
                  itemId
                    ? "border border-slate-600 bg-slate-800"
                    : "border border-slate-300 bg-slate-200/70 dark:border-slate-600 dark:bg-slate-800/40"
                }`}
              >
                {itemId && (
                  <Image
                    src={getItemImageUrl(itemId, version)}
                    alt={`Item ${itemId}`}
                    fill
                    sizes="28px"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center">
            <div
              className={`relative w-7 h-7 rounded overflow-hidden ${
                trinketItem
                  ? "border border-slate-600 bg-slate-800"
                  : "border border-slate-300 bg-slate-200/70 dark:border-slate-600 dark:bg-slate-800/40"
              }`}
            >
              {trinketItem && (
                <Image
                  src={getItemImageUrl(trinketItem, version)}
                  alt={`Item ${trinketItem}`}
                  fill
                  sizes="28px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
          </div>
        </div>

        {/* 4. Stats & Share */}
        <div className="flex flex-col items-center gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
            <Eye
              className="w-4 h-4 text-slate-500 dark:text-slate-400"
              aria-hidden="true"
            />
            <span>{match.vision_score}</span>
          </div>
          {!hideShareButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                shareMatch(match.match_id);
              }}
              disabled={isSharing || sharedMatches.includes(match.match_id)}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all
                ${
                  sharedMatches.includes(match.match_id)
                    ? "bg-green-500/20 text-green-600 dark:text-green-400 cursor-default"
                    : "bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
                }
              `}
              title={
                sharedMatches.includes(match.match_id)
                  ? "Compartida"
                  : "Compartir en Activity"
              }
            >
              <Share2 className="w-3 h-3" />
              <span className="hidden sm:inline">
                {sharedMatches.includes(match.match_id)
                  ? "Compartida"
                  : "Compartir"}
              </span>
            </button>
          )}
          <TeammateTracker
            matches={recentMatches}
            currentMatch={match}
            currentPuuid={match.puuid}
            className="text-[11px]"
          />
        </div>

        {/* 5. Teams (HORIZONTAL - lado a lado) */}
        <div className="flex gap-2">
          {team1.length > 0 && (
            <div className="flex-1">
              <TeamPlayerList
                players={team1}
                currentPuuid={match.puuid}
                version={version}
                linkedAccountsMap={linkedAccountsMap}
              />
            </div>
          )}
          {team2.length > 0 && (
            <div className="flex-1">
              <TeamPlayerList
                players={team2}
                currentPuuid={match.puuid}
                version={version}
                linkedAccountsMap={linkedAccountsMap}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
