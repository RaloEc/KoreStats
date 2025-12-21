"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  getChampionImg,
  getItemImg,
  getSpellImg,
  getRuneStyleImg,
} from "@/lib/riot/helpers";
import { formatRankBadge, getTierColor } from "@/lib/riot/league";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  computeParticipantScores,
  getParticipantKey as getParticipantKeyUtil,
} from "@/components/riot/match-card/performance-utils";
import { useSaveBuild } from "@/hooks/use-save-build";
import { BookmarkPlus } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface ScoreboardModalTableProps {
  matchId: string;
  participants: any[];
  currentUserPuuid?: string;
  gameVersion?: string;
  gameDuration?: number;
  matchInfo?: any;
  linkedAccountsMap?: Record<string, string>;
}

export function ScoreboardModalTable({
  matchId,
  participants,
  currentUserPuuid,
  gameVersion,
  gameDuration = 0,
  matchInfo,
  linkedAccountsMap = {},
}: ScoreboardModalTableProps) {
  const mobileCarouselRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const { saveBuild, isSaving, savedBuildKeys } = useSaveBuild();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Calcular scores y rankings solo cuando cambian las props
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
  } = React.useMemo(() => {
    const scoreEntries = computeParticipantScores(
      participants,
      gameDuration,
      matchInfo
    );

    const fallbackScoreMap = new Map<string, number>();
    scoreEntries.forEach((entry) => {
      fallbackScoreMap.set(entry.key, entry.score ?? 0);
    });

    const sortedByScore = [...scoreEntries].sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0)
    );

    const fallbackRankingMap = new Map<string, number>();
    sortedByScore.forEach((entry, index) => {
      fallbackRankingMap.set(entry.key, index + 1);
    });

    const rankingMap = new Map<string, number>();
    const scoreMap = new Map<string, number>();

    participants.forEach((player) => {
      const playerKey = getParticipantKeyUtil(player);
      const persistedRank =
        typeof player.ranking_position === "number" &&
        player.ranking_position > 0
          ? player.ranking_position
          : null;
      const persistedScore =
        typeof player.performance_score === "number"
          ? player.performance_score
          : null;

      const fallbackRank = fallbackRankingMap.get(playerKey) ?? null;
      const fallbackScore = fallbackScoreMap.get(playerKey) ?? null;

      rankingMap.set(playerKey, persistedRank ?? fallbackRank ?? 0);
      scoreMap.set(playerKey, persistedScore ?? fallbackScore ?? 0);
    });

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

    const team1 = sortByLane(participants.filter((p: any) => p.win));
    const team2 = sortByLane(participants.filter((p: any) => !p.win));

    const team1Kills = team1.reduce((acc: number, p: any) => acc + p.kills, 0);
    const team2Kills = team2.reduce((acc: number, p: any) => acc + p.kills, 0);
    const team1Gold = team1.reduce(
      (acc: number, p: any) => acc + p.gold_earned,
      0
    );
    const team2Gold = team2.reduce(
      (acc: number, p: any) => acc + p.gold_earned,
      0
    );

    const maxDamage = Math.max(
      ...participants.map((p: any) => p.total_damage_dealt)
    );

    return {
      rankingMap,
      scoreMap,
      team1,
      team2,
      maxDamage,
      team1Kills,
      team2Kills,
      team1Gold,
      team2Gold,
    };
  }, [participants, gameDuration, matchInfo]);

  const PlayerRow = React.memo(
    ({
      player,
      isCurrentUser,
      isWinner,
      matchId,
      rankingMap,
      scoreMap,
      linkedAccountsMap,
      gameVersion,
      maxDamage,
      savedBuildKeys,
      isSaving,
      saveBuild,
    }: any) => {
      // Obtener key del participante y su ranking
      const router = useRouter();
      const playerKey = getParticipantKeyUtil(player);
      const rankingPosition = rankingMap.get(playerKey) ?? 0;
      const playerScore = scoreMap.get(playerKey) ?? 0;
      const badges: string[] = [];
      if (rankingPosition === 1) badges.push("MVP");

      const rankingBadgeClass = (() => {
        if (!rankingPosition)
          return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";
        if (rankingPosition === 1)
          return "bg-amber-400 text-slate-900 dark:bg-amber-300";
        if (rankingPosition <= 3)
          return "bg-sky-400 text-slate-900 dark:bg-sky-300";
        return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
      })();

      const displayName =
        player.riotIdGameName && player.riotIdTagLine
          ? player.riotIdGameName
          : player.summoner_name;
      const profileUserId = player.puuid
        ? linkedAccountsMap[player.puuid]
        : undefined;
      const hasProfile = Boolean(profileUserId);

      const kdaColor =
        player.kills > player.deaths
          ? "text-emerald-700 dark:text-emerald-300"
          : player.deaths > player.kills
          ? "text-rose-700 dark:text-red-300"
          : "text-slate-700 dark:text-slate-300";

      const kdaRatioColor =
        player.deaths === 0
          ? "text-emerald-700 dark:text-emerald-300"
          : player.kda >= 4
          ? "text-emerald-700 dark:text-emerald-300"
          : player.kda >= 2
          ? "text-amber-600 dark:text-yellow-300"
          : "text-rose-700 dark:text-red-300";

      const divisionMap: Record<string, string> = {
        TOP: "Top",
        JUNGLE: "Jg",
        MIDDLE: "Mid",
        BOTTOM: "ADC",
        UTILITY: "Sup",
      };

      const savedKey = `${matchId}:${player.puuid ?? ""}`;
      const isSaved = savedBuildKeys.includes(savedKey);
      const canSave = Boolean(
        matchId && typeof player.puuid === "string" && player.puuid
      );
      const rawLane = (player.lane || player.teamPosition || "").toUpperCase();
      const division = divisionMap[rawLane] ?? null;

      const totalLaneCS =
        (player.total_minions_killed ?? player.totalMinionsKilled ?? 0) +
        (player.neutral_minions_killed ?? player.neutralMinionsKilled ?? 0);
      const visionScore = player.vision_score ?? player.visionScore ?? 0;

      const tier = player.tier ?? null;
      const rank = player.rank ?? null;
      const rankBadge = formatRankBadge(tier, rank);
      const rankColor = getTierColor(tier);

      const navigateToProfile = (
        event: React.MouseEvent | React.KeyboardEvent
      ) => {
        if (!profileUserId) return;
        event.preventDefault();
        event.stopPropagation();

        const url = `/perfil/${profileUserId}?tab=lol`;
        if (
          "metaKey" in event &&
          (event.metaKey || (event as React.MouseEvent).ctrlKey)
        ) {
          window.open(url, "_blank");
          return;
        }
        router.push(url);
      };

      const rowContent = (
        <div
          className={`flex items-center gap-1.5 lg:gap-2 px-2 py-1.5 lg:px-3 lg:py-2 border-b border-slate-200/70 dark:border-slate-800/40 last:border-0 transition-colors group rounded-none ${
            isCurrentUser
              ? isWinner
                ? "bg-blue-50/80 dark:bg-blue-500/10"
                : "bg-rose-50/80 dark:bg-red-500/10"
              : hasProfile
              ? "bg-white/80 dark:bg-transparent hover:bg-emerald-50/70 dark:hover:bg-emerald-500/10 cursor-pointer"
              : "bg-white/80 dark:bg-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
          }`}
        >
          {/* Champion Avatar + Spells */}
          <div className="flex items-start gap-2 flex-shrink-0">
            <div className="relative flex flex-col items-center gap-1">
              <div className="relative w-8 h-8 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl overflow-hidden border-[1.5px] lg:border-2 border-slate-200 dark:border-slate-700 group-hover:border-blue-200 dark:group-hover:border-slate-500 transition-colors shadow-sm">
                <Image
                  src={getChampionImg(player.champion_name, gameVersion)}
                  alt={player.champion_name}
                  fill
                  sizes="(max-width: 1024px) 32px, 48px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex gap-1">
                {player.summoner1_id &&
                  getSpellImg(player.summoner1_id, gameVersion) && (
                    <div className="w-3.5 h-3.5 lg:w-5 lg:h-5 rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 flex-shrink-0">
                      <Image
                        src={getSpellImg(player.summoner1_id, gameVersion)!}
                        alt="Spell 1"
                        width={20}
                        height={20}
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                {player.summoner2_id &&
                  getSpellImg(player.summoner2_id, gameVersion) && (
                    <div className="w-3.5 h-3.5 lg:w-5 lg:h-5 rounded overflow-hidden border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 flex-shrink-0">
                      <Image
                        src={getSpellImg(player.summoner2_id, gameVersion)!}
                        alt="Spell 2"
                        width={20}
                        height={20}
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
              </div>
            </div>

            {/* Runes */}
            <div className="flex flex-col items-center gap-0.5 mt-0.5">
              {(() => {
                const primarySrc = getRuneStyleImg(
                  player.perk_primary_style || null
                );
                const secondarySrc = getRuneStyleImg(
                  player.perk_sub_style || null
                );

                return (
                  <>
                    {primarySrc && (
                      <div className="w-3.5 h-3.5 lg:w-5 lg:h-5 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          src={primarySrc}
                          alt="Primary Rune"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {secondarySrc && (
                      <div className="w-3.5 h-3.5 lg:w-5 lg:h-5 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          src={secondarySrc}
                          alt="Secondary Rune"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <span
                      className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow ${rankingBadgeClass}`}
                      title={
                        playerScore
                          ? `Posición #${
                              rankingPosition || "-"
                            } · Score ${playerScore.toFixed(1)}`
                          : "Posición no disponible"
                      }
                    >
                      #{rankingPosition || "-"}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-0.5">
              <span
                className={`font-semibold text-xs lg:text-sm ${
                  isCurrentUser
                    ? isWinner
                      ? "text-blue-600 dark:text-blue-300"
                      : "text-rose-600 dark:text-red-300"
                    : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {displayName}
              </span>
              <div className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 truncate">
                {player.champion_name}
              </div>
              <div className="flex items-center gap-2">
                {rankBadge && rankBadge !== "Unranked" ? (
                  <span
                    className={`text-[10px] lg:text-xs font-bold ${rankColor} whitespace-nowrap`}
                  >
                    {rankBadge}
                  </span>
                ) : division ? (
                  <span className="text-[10px] lg:text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-md font-semibold border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                    {division}
                  </span>
                ) : null}
                {badges.includes("MVP") && (
                  <span className="inline-flex items-center px-1.5 py-0.5 lg:px-2 lg:py-0.5 rounded-full bg-amber-100 dark:bg-amber-200/85 text-slate-900 dark:text-slate-950 text-[9px] lg:text-[10px] font-bold">
                    MVP
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KDA */}
          <div className="flex flex-col items-end justify-end gap-0.5 min-w-fit mt-0.5 lg:mt-4">
            <div
              className={`font-bold text-[10px] lg:text-xs ${kdaColor} text-right`}
            >
              {player.kills}/{player.deaths}/{player.assists}
            </div>
            <div
              className={`text-[9px] lg:text-[11px] font-semibold ${kdaRatioColor}`}
            >
              {player.kda.toFixed(2)}
            </div>
          </div>

          {/* Items */}
          <div className="flex items-center gap-2">
            <div className="grid grid-cols-3 gap-0.5">
              {[
                player.item0,
                player.item1,
                player.item2,
                player.item3,
                player.item4,
                player.item5,
              ].map((item, i) => (
                <div
                  key={i}
                  className="w-4 h-4 lg:w-6 lg:h-6 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative overflow-hidden hover:border-blue-200 dark:hover:border-slate-500 transition-colors"
                >
                  {item !== 0 && (
                    <Image
                      src={getItemImg(item, gameVersion)!}
                      alt="Item"
                      fill
                      sizes="(max-width: 1024px) 16px, 24px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="w-4 h-4 lg:w-6 lg:h-6 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative overflow-hidden flex items-center justify-center hover:border-blue-200 dark:hover:border-slate-500 transition-colors">
              {player.item6 !== 0 && (
                <Image
                  src={getItemImg(player.item6, gameVersion)!}
                  alt="Trinket"
                  fill
                  sizes="(max-width: 1024px) 16px, 24px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
          </div>

          {/* Stats Grid - oculto en móvil */}
          <div className="hidden lg:grid grid-cols-2 gap-x-2 gap-y-1 min-w-[10px]">
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-[11px] font-semibold text-slate-900 dark:text-white">
                {totalLaneCS.toFixed(0)}
              </div>
              <div className="text-[10px] text-slate-500">CS</div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-[11px] font-semibold text-slate-900 dark:text-white">
                {visionScore.toFixed(0)}
              </div>
              <div className="text-[10px] text-slate-500">VIS</div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-[11px] font-semibold text-slate-900 dark:text-white">
                {(player.total_damage_dealt / 1000).toFixed(1)}k
              </div>
              <div className="text-[10px] text-slate-500">DMG</div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-[11px] font-semibold text-slate-900 dark:text-white">
                {(player.gold_earned / 1000).toFixed(1)}k
              </div>
              <div className="text-[10px] text-slate-500">ORO</div>
            </div>
          </div>

          {/* Guardar build */}
          <button
            type="button"
            disabled={!canSave || isSaving || isSaved}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!canSave) return;
              void saveBuild({
                matchId,
                targetPuuid: player.puuid as string,
              });
            }}
            className={`ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold border transition-colors ${
              isSaved
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-200 dark:hover:bg-slate-800/40"
            } ${!canSave || isSaving ? "opacity-60 cursor-not-allowed" : ""}`}
            title={
              isSaved
                ? "Build guardada"
                : "Guardar items y runas de este jugador"
            }
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      );

      if (!hasProfile) {
        return rowContent;
      }

      return (
        <div
          role="button"
          tabIndex={0}
          onClick={navigateToProfile}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              navigateToProfile(event);
            }
          }}
          className="w-full text-left bg-transparent border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 cursor-pointer block"
        >
          {rowContent}
        </div>
      );
    }
  );

  return (
    <div className="space-y-4">
      {isDesktop ? (
        <div className="hidden lg:grid lg:grid-cols-2 gap-4 my-4">
          <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/30 shadow-sm">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-500/20 dark:to-blue-500/5 border-b border-slate-200/80 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
                <h3 className="text-sm font-bold text-blue-600 dark:text-blue-300 uppercase tracking-wider">
                  Victoria
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-400">K:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {team1Kills}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-400">O:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {(team1Gold / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>
            </div>

            <div>
              {team1.map((p: any) => (
                <PlayerRow
                  key={p.puuid}
                  player={p}
                  isCurrentUser={p.puuid === currentUserPuuid}
                  isWinner={true}
                  matchId={matchId}
                  rankingMap={rankingMap}
                  scoreMap={scoreMap}
                  linkedAccountsMap={linkedAccountsMap}
                  gameVersion={gameVersion}
                  maxDamage={maxDamage}
                  savedBuildKeys={savedBuildKeys}
                  isSaving={isSaving}
                  saveBuild={saveBuild}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/30 shadow-sm">
            <div className="bg-gradient-to-r from-rose-50 to-rose-100 dark:from-red-500/20 dark:to-red-500/5 border-b border-slate-200/80 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-red-500 rounded-full" />
                <h3 className="text-sm font-bold text-rose-600 dark:text-red-300 uppercase tracking-wider">
                  Derrota
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-400">K:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {team2Kills}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-400">O:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {(team2Gold / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>
            </div>

            <div>
              {team2.map((p: any) => (
                <PlayerRow
                  key={p.puuid}
                  player={p}
                  isCurrentUser={p.puuid === currentUserPuuid}
                  isWinner={false}
                  matchId={matchId}
                  rankingMap={rankingMap}
                  scoreMap={scoreMap}
                  linkedAccountsMap={linkedAccountsMap}
                  gameVersion={gameVersion}
                  maxDamage={maxDamage}
                  savedBuildKeys={savedBuildKeys}
                  isSaving={isSaving}
                  saveBuild={saveBuild}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="lg:hidden">
          {/* <div className="flex items-center justify-between mb-3 px-1 text-[11px] uppercase tracking-wide text-slate-400">
            <span>Desliza para ver ambos equipos</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => scrollMobileCarousel("prev")}
                className="rounded-full border border-slate-700 bg-slate-900/80 p-2 text-slate-200 hover:bg-slate-800 transition-colors"
                aria-label="Equipo anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollMobileCarousel("next")}
                className="rounded-full border border-slate-700 bg-slate-900/80 p-2 text-slate-200 hover:bg-slate-800 transition-colors"
                aria-label="Siguiente equipo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div> */}

          <div
            ref={mobileCarouselRef}
            className="flex gap-4 overflow-x-auto snap-x pb-2 -mx-2 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth touch-pan-x"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="min-w-[92%] snap-start">
              <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/30 shadow-sm">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-500/20 dark:to-blue-500/5 border-b border-slate-200/80 dark:border-slate-800 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-blue-500 rounded-full" />
                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-300 uppercase tracking-wider">
                      Victoria
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 dark:text-slate-400">
                        Kills:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {team1Kills}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 dark:text-slate-400">
                        Oro:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {(team1Gold / 1000).toFixed(1)}k
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  {team1.map((p) => (
                    <PlayerRow
                      key={p.puuid}
                      player={p}
                      isCurrentUser={p.puuid === currentUserPuuid}
                      isWinner={true}
                      matchId={matchId}
                      rankingMap={rankingMap}
                      scoreMap={scoreMap}
                      linkedAccountsMap={linkedAccountsMap}
                      gameVersion={gameVersion}
                      maxDamage={maxDamage}
                      savedBuildKeys={savedBuildKeys}
                      isSaving={isSaving}
                      saveBuild={saveBuild}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-[92%] snap-center">
              <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/30 shadow-sm">
                <div className="bg-gradient-to-r from-rose-50 to-rose-100 dark:from-red-500/20 dark:to-red-500/5 border-b border-slate-200/80 dark:border-slate-800 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-red-500 rounded-full" />
                    <h3 className="text-sm font-bold text-rose-600 dark:text-red-300 uppercase tracking-wider">
                      Derrota
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 dark:text-slate-400">
                        Kills:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {team2Kills}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 dark:text-slate-400">
                        Oro:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {(team2Gold / 1000).toFixed(1)}k
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  {team2.map((p) => (
                    <PlayerRow
                      key={p.puuid}
                      player={p}
                      isCurrentUser={p.puuid === currentUserPuuid}
                      isWinner={false}
                      matchId={matchId}
                      rankingMap={rankingMap}
                      scoreMap={scoreMap}
                      linkedAccountsMap={linkedAccountsMap}
                      gameVersion={gameVersion}
                      maxDamage={maxDamage}
                      savedBuildKeys={savedBuildKeys}
                      isSaving={isSaving}
                      saveBuild={saveBuild}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
