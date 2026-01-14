import Image from "next/image";
import { Eye } from "lucide-react";
import { calculatePerformanceScore } from "@/lib/riot/match-analyzer";
import {
  computeParticipantScores,
  getParticipantKey as getParticipantKeyUtil,
} from "./performance-utils";
import { TeamPlayerList } from "./TeamPlayerList";
import { TeammateTracker } from "@/components/riot/TeammateTracker";
import {
  getItemImageUrl,
  formatDuration,
  getRelativeTime,
  getQueueName,
} from "./helpers";
import { LPBadge } from "./LPBadge";
import { MatchCardShareButton } from "./MatchCardShareButton";
import { PlayerSummaryClient } from "./PlayerSummaryClient";

// Duplicated interfaces/types to avoid circular imports or just re-declare
// Ideally move these to a types file, but for now inline is safe.
import type { MatchCardProps } from "./MatchCard";
import type { RunePerks } from "./RunesTooltip";

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

function getParticipantRuneStyle(
  participant: RiotParticipant | null | undefined,
  index: number
): number | undefined {
  return participant?.perks?.styles?.[index]?.style;
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

export function MatchCardServer({
  match,
  version,
  linkedAccountsMap = {},
  recentMatches = [],
  hideShareButton = false,
  userId,
  isOwnProfile = false,
  priority = false,
}: MatchCardProps) {
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

  // Calcular ranking de todos los participantes para mostrar tanto el del jugador como el del oponente
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

  // Usar ranking del servidor (persistido en BD) si existe, sino usar el calculado
  let playerRankingPosition =
    typeof (match as any).ranking_position === "number" &&
    (match as any).ranking_position > 0
      ? (match as any).ranking_position
      : null;

  // Fallback: usar ranking calculado si no está en BD
  if (playerRankingPosition === null) {
    const playerKey = currentParticipant
      ? getParticipantKeyUtil(currentParticipant)
      : null;
    playerRankingPosition = playerKey
      ? rankingPositions.get(playerKey) ?? null
      : null;
  }

  // Calcular ranking del oponente
  let opponentRankingPosition: number | null = null;
  if (laneOpponentParticipant) {
    const opponentKey = getParticipantKeyUtil(laneOpponentParticipant);
    opponentRankingPosition = rankingPositions.get(opponentKey) ?? null;
  }

  const playerSummary = {
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

  const opponentSummary = laneOpponentParticipant
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
        rankingPosition: opponentRankingPosition,
      }
    : null;

  const outcomeTextClass = isRemake
    ? "text-slate-600 dark:text-slate-400"
    : isVictory
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";

  const outcomeLabel = isRemake ? "Remake" : isVictory ? "Victoria" : "Derrota";
  const statusLabel = isFailed ? "❌ Error" : outcomeLabel;

  return (
    <>
      {/* 1. Metadata */}
      <div className="flex flex-col gap-1 text-[11px]">
        <span
          className={`uppercase tracking-wide font-semibold ${outcomeTextClass}`}
        >
          {statusLabel}
        </span>
        <LPBadge
          gameId={(() => {
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
          <PlayerSummaryClient
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
              <PlayerSummaryClient
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
        {!hideShareButton && <MatchCardShareButton matchId={match.match_id} />}
        <TeammateTracker
          matches={recentMatches}
          currentMatch={match}
          currentPuuid={match.puuid}
          className="text-[11px]"
          linkedAccountsMap={linkedAccountsMap}
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
    </>
  );
}
