"use client";

import { useState } from "react";
import Image from "next/image";
import { Share2 } from "lucide-react";
import { useShareMatch } from "@/hooks/use-share-match";
import { calculatePerformanceScore } from "@/lib/riot/match-analyzer";
import {
  computeParticipantScores,
  getParticipantKey as getParticipantKeyUtil,
} from "./performance-utils";
import { TeammateTracker } from "@/components/riot/TeammateTracker";
import type { Match } from "./MatchCard";
import {
  getChampionImageUrl,
  getItemImageUrl,
  getSummonerSpellUrl,
  getQueueName,
  formatDuration,
  getRelativeTime,
  getRuneIconUrl,
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
  kills?: number;
  deaths?: number;
  assists?: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  totalDamageDealtToChampions?: number;
  damageDealtToObjectives?: number;
  damageDealtToTurrets?: number;
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

interface MobileMatchCardProps {
  match: Match;
  version: string;
  recentMatches?: Match[];
  hideShareButton?: boolean;
  userId?: string;
  isOwnProfile?: boolean;
  priority?: boolean;
  onSelectMatch?: (matchId: string) => void;
  /** Callback para prefetch al tocar (móvil) */
  onHoverMatch?: (matchId: string) => void;
  linkedAccountsMap?: Record<string, string>;
}

export type { MobileMatchCardProps };

export function MobileMatchCard({
  match,
  version,
  recentMatches = [],
  hideShareButton = false,
  userId,
  isOwnProfile = false,
  priority = false,
  onSelectMatch,
  onHoverMatch,
  linkedAccountsMap = {},
}: MobileMatchCardProps) {
  const { shareMatch, isSharing, sharedMatches } = useShareMatch();

  if (!match.matches) {
    return null;
  }

  // Estado de ingesta
  const isProcessing = (match.matches as any)?.ingest_status === "processing";
  const isFailed = (match.matches as any)?.ingest_status === "failed";

  const isVictory = match.win;
  const REMAKE_DURATION_THRESHOLD = 300;
  type RemakeFlagsParticipant = {
    gameEndedInEarlySurrender?: boolean;
    teamEarlySurrendered?: boolean;
  };
  const remakeParticipants = (match.matches?.full_json?.info?.participants ??
    []) as RemakeFlagsParticipant[];
  const isRemake = Boolean(
    (match.matches?.game_duration ?? 0) < REMAKE_DURATION_THRESHOLD ||
      remakeParticipants.some(
        (participant) =>
          participant?.gameEndedInEarlySurrender ||
          participant?.teamEarlySurrendered
      )
  );
  const items = [
    match.item0,
    match.item1,
    match.item2,
    match.item3,
    match.item4,
    match.item5,
    match.item6,
  ].filter((id) => id !== 0);

  const ratioClass =
    match.kda >= 3
      ? "text-emerald-700 dark:text-emerald-300"
      : "text-rose-700 dark:text-red-300";
  const queueName = getQueueName(match.matches.queue_id);
  const resultLabel = isFailed
    ? "❌ Error"
    : isRemake
    ? "Remake"
    : isVictory
    ? "Victoria"
    : "Derrota";
  const resultBadgeClass = isProcessing
    ? "text-slate-700 dark:text-slate-200 bg-slate-100/70 dark:bg-slate-500/15 opacity-70"
    : isFailed
    ? "text-slate-700 dark:text-slate-200 bg-slate-100/70 dark:bg-slate-500/15 opacity-50"
    : isRemake
    ? "text-slate-700 dark:text-slate-200 bg-slate-100/70 dark:bg-slate-500/15"
    : isVictory
    ? "text-emerald-700 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-500/15"
    : "text-rose-700 dark:text-rose-200 bg-rose-100/80 dark:bg-rose-500/15";

  const participants = (match.matches?.full_json?.info?.participants ??
    []) as RiotParticipant[];
  const currentParticipant =
    participants.find((participant) => participant.puuid === match.puuid) ??
    null;
  const laneOpponent = findLaneOpponent(participants, currentParticipant);
  const opponentKills = laneOpponent?.kills ?? 0;
  const opponentDeaths = laneOpponent?.deaths ?? 0;
  const opponentAssists = laneOpponent?.assists ?? 0;
  const opponentKda = laneOpponent
    ? calculateKda(opponentKills, opponentDeaths, opponentAssists)
    : null;
  const opponentRatioClass =
    opponentKda !== null && opponentKda >= 3
      ? "text-emerald-700 dark:text-emerald-300"
      : "text-rose-700 dark:text-red-300";
  const playerPrimaryRune = match.perk_primary_style;
  const playerSecondaryRune = match.perk_sub_style;
  const opponentPrimaryRune = getParticipantRuneStyle(laneOpponent, 0);
  const opponentSecondaryRune = getParticipantRuneStyle(laneOpponent, 1);

  const playerKeystonePerkId = getKeystonePerkId(currentParticipant?.perks);
  const opponentKeystonePerkId = getKeystonePerkId(laneOpponent?.perks);
  const { perkIconById: playerPerkIconById, perkNameById: playerPerkNameById } =
    usePerkAssets([playerKeystonePerkId]);
  const {
    perkIconById: opponentPerkIconById,
    perkNameById: opponentPerkNameById,
  } = usePerkAssets([opponentKeystonePerkId]);

  const playerCs = currentParticipant
    ? (currentParticipant.totalMinionsKilled ?? 0) +
      (currentParticipant.neutralMinionsKilled ?? 0)
    : null;
  const csPerMinute =
    playerCs !== null && match.matches.game_duration
      ? playerCs / Math.max(1, match.matches.game_duration / 60)
      : null;

  const playerTeamParticipants = currentParticipant
    ? participants.filter(
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

  // Calcular ranking de todos los participantes para mostrar tanto el del jugador como el del oponente
  const scoreEntries = computeParticipantScores(
    participants,
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
  if (laneOpponent) {
    const opponentKey = getParticipantKeyUtil(laneOpponent);
    opponentRankingPosition = rankingPositions.get(opponentKey) ?? null;
  }

  const renderSpellIcon = (spellId?: number, alt?: string) => {
    if (!spellId) return null;
    const url = getSummonerSpellUrl(spellId, version);
    if (!url) return null;
    return (
      <div className="relative w-6 h-6 rounded border border-slate-600 overflow-hidden bg-slate-800">
        <Image
          src={url}
          alt={alt ?? "Summoner Spell"}
          fill
          sizes="24px"
          className="object-cover"
        />
      </div>
    );
  };

  const renderRuneIcon = (runeId?: number, alt?: string) => {
    if (!runeId) return null;
    return (
      <div className="relative w-6 h-6 rounded-full overflow-hidden bg-slate-900">
        <Image
          src={getRuneIconUrl(runeId)}
          alt={alt ?? "Rune"}
          fill
          sizes="24px"
          className="object-cover p-0.5"
        />
      </div>
    );
  };

  const renderKeystoneIcon = (
    perkId: number | null,
    icons: Record<number, string>,
    names: Record<number, string>
  ) => {
    if (!perkId) return null;
    const icon = icons[perkId];
    if (!icon) return null;
    return (
      <div className="relative w-6 h-6 rounded-full overflow-hidden bg-slate-900">
        <Image
          src={icon}
          alt={names[perkId] ?? "Keystone"}
          fill
          sizes="24px"
          className="object-cover p-0.5"
          unoptimized
        />
      </div>
    );
  };

  return (
    <>
      <div
        onClick={() => onSelectMatch?.(match.match_id)}
        onTouchStart={() => onHoverMatch?.(match.match_id)}
        className={`
          md:hidden w-full text-left rounded-xl p-4 border transition-all cursor-pointer shadow-sm
          ${
            isRemake
              ? "border-slate-200/80 dark:border-slate-600 bg-white/80 dark:bg-slate-500/10"
              : isVictory
              ? "border-emerald-200 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10"
              : "border-rose-200 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-500/10"
          }
        `}
      >
        {/* Encabezado compacto */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100 truncate">
              {queueName}
            </span>
            <div className="flex-1 flex flex-col items-center gap-1">
              <span
                className={`inline-flex items-center justify-center text-[11px] font-bold uppercase tracking-wide ${resultBadgeClass}`}
              >
                {resultLabel}
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
                isOwnProfile={isOwnProfile}
              />
            </div>
            <div className="flex-1 text-right text-xs">
              <p className="font-semibold text-slate-900 dark:text-slate-200">
                {formatDuration(match.matches.game_duration)}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {getRelativeTime(match.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Campeón principal vs oponente */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-0">
              <div className="flex flex-col items-center gap-1">
                <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[80px] text-center">
                  {match.champion_name}
                </p>
                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0">
                  <Image
                    src={getChampionImageUrl(match.champion_name, version)}
                    alt={match.champion_name}
                    fill
                    sizes="56px"
                    className="object-cover"
                    priority={priority}
                  />
                </div>
                <div className="flex items-center">
                  <RunesTooltip perks={currentParticipant?.perks}>
                    <div className="flex items-center">
                      {renderKeystoneIcon(
                        playerKeystonePerkId,
                        playerPerkIconById,
                        playerPerkNameById
                      ) ?? renderRuneIcon(playerPrimaryRune, "Primary Style")}
                      {renderRuneIcon(playerSecondaryRune, "Secondary Rune")}
                    </div>
                  </RunesTooltip>
                  {playerRankingPosition && playerRankingPosition > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow ${getRankingBadgeClass(
                        playerRankingPosition
                      )}`}
                      title={`Ranking global #${playerRankingPosition}`}
                    >
                      #{playerRankingPosition}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 items-center -ml-1">
                {renderSpellIcon(match.summoner1_id, "Summoner Spell 1")}
                {renderSpellIcon(match.summoner2_id, "Summoner Spell 2")}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {match.kills}/{match.deaths}/{match.assists}
              </p>
              <p className={`text-sm font-bold ${ratioClass}`}>
                {match.kda.toFixed(2)}
              </p>
            </div>
          </div>

          {laneOpponent && (
            <>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                VS
              </span>
              <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {opponentKills}/{opponentDeaths}/{opponentAssists}
                  </p>
                  <p className={`text-sm font-bold ${opponentRatioClass}`}>
                    {opponentKda?.toFixed(2) ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-0">
                  <div className="flex flex-col gap-1 items-center ml-1">
                    {renderSpellIcon(laneOpponent.summoner1Id, "Enemy Spell 1")}
                    {renderSpellIcon(laneOpponent.summoner2Id, "Enemy Spell 2")}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[80px] text-center">
                      {laneOpponent.championName}
                    </p>
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0 bg-slate-800">
                      <Image
                        src={getChampionImageUrl(
                          laneOpponent.championName,
                          version
                        )}
                        alt={laneOpponent.championName}
                        fill
                        sizes="56px"
                        className="object-cover"
                        priority={priority}
                      />
                    </div>
                    <div className="flex items-center">
                      <RunesTooltip perks={laneOpponent?.perks}>
                        <div className="flex items-center">
                          {renderKeystoneIcon(
                            opponentKeystonePerkId,
                            opponentPerkIconById,
                            opponentPerkNameById
                          ) ??
                            renderRuneIcon(
                              opponentPrimaryRune,
                              "Enemy Primary Style"
                            )}
                          {renderRuneIcon(
                            opponentSecondaryRune,
                            "Enemy Secondary Rune"
                          )}
                        </div>
                      </RunesTooltip>
                      {opponentRankingPosition &&
                        opponentRankingPosition > 0 && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow ${getRankingBadgeClass(
                              opponentRankingPosition
                            )}`}
                            title={`Ranking global #${opponentRankingPosition}`}
                          >
                            #{opponentRankingPosition}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {/* Estadísticas en grid */}
        <div className="grid grid-cols-3 gap-4 mb-3 text-center">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Daño</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {(match.total_damage_dealt / 1000).toFixed(1)}k
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Oro</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {(match.gold_earned / 1000).toFixed(1)}k
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Visión</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {match.vision_score}
            </p>
          </div>
        </div>

        {/* Hechizos */}
        {/* Objetos */}
        {items.length > 0 && (
          <div className="mb-3 flex gap-2 flex-wrap justify-center">
            {items.map((itemId, idx) => (
              <div
                key={idx}
                className="relative w-8 h-8 rounded border border-slate-200 dark:border-slate-600 overflow-hidden bg-white/70 dark:bg-slate-800"
              >
                {itemId !== 0 && (
                  <Image
                    src={getItemImageUrl(itemId, version)}
                    alt={`Item ${itemId}`}
                    fill
                    sizes="32px"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Botón Compartir + Teammates */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
          {!hideShareButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                shareMatch(match.match_id);
              }}
              disabled={isSharing || sharedMatches.includes(match.match_id)}
              className={`
                flex items-center justify-center p-2 rounded-full transition-all
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
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <TeammateTracker
            matches={recentMatches}
            currentMatch={match}
            currentPuuid={match.puuid}
            className="text-[11px]"
            showInline={true}
            linkedAccountsMap={linkedAccountsMap}
          />
        </div>
      </div>
    </>
  );
}
