"use client";

import React from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChampionCenteredSplash } from "@/components/riot/ChampionCenteredSplash";
import { analyzeMatchTags, type MatchTag } from "@/lib/riot/match-analyzer";

// Import types and helpers from the modular structure
import type { SharedMatchCardProps } from "./types";
import { useRuneIcons } from "./hooks/useRuneIcons";
import { useMobileCarousel } from "./hooks/useMobileCarousel";
import {
  calculateTeamStats,
  calculatePlayerStats,
  calculateComparisons,
} from "./utils/calculations";

// Import components
import { MatchHeader } from "./components/MatchHeader";
import { MatchItems } from "./components/MatchItems";
import { MatchRunes } from "./components/MatchRunes";
import { MatchStats } from "./components/MatchStats";
import { TeamComparison } from "./components/TeamComparison";
import { TeamPlayers } from "./components/TeamPlayers";
import { MatchFooter } from "./components/MatchFooter";
import { MatchComment } from "./components/MatchComment";
import { CarouselDots } from "./components/CarouselDots";

export const SharedMatchCardRefactored: React.FC<SharedMatchCardProps> = ({
  partida,
  userColor,
  sharedBy,
  isAdmin,
  isOwnProfile,
  isHidden,
  onHide,
  onUnhide,
  onDelete,
  deletingId,
  userId,
}) => {
  // Extraer estilos de runas
  const runeStyles = partida.perks?.styles ?? [];
  const primaryStyle =
    runeStyles.find((style) => style.description === "primaryStyle") ??
    runeStyles.find((style) => style.style === partida.perkPrimaryStyle);
  const secondaryStyle =
    runeStyles.find((style) => style.description === "subStyle") ??
    runeStyles.find((style) => style.style === partida.perkSubStyle);
  const statPerks = partida.perks?.statPerks;

  // Hooks personalizados
  const { perkIconById, perkNameById } = useRuneIcons(
    primaryStyle,
    secondaryStyle,
    statPerks
  );

  // Calcular estadísticas
  const teamStats = calculateTeamStats(partida);
  const playerStats = calculatePlayerStats(partida);
  const comparisons = calculateComparisons(partida, teamStats, playerStats);

  // Determinar si hay datos comparativos y equipos
  const hasComparative =
    Boolean(partida.teamTotalDamage) ||
    Boolean(partida.teamTotalGold) ||
    Boolean(partida.teamTotalKills);
  const hasTeams = Boolean(partida.allPlayers && partida.allPlayers.length > 0);
  const mobileCarouselPages = (hasComparative ? 1 : 0) + 1 + (hasTeams ? 1 : 0);

  // Hook para el carrusel móvil
  const { mobileCarouselRef, mobileCarouselIndex } =
    useMobileCarousel(mobileCarouselPages);

  // Variables de estilo
  const isWin = partida.result === "win";
  const outcomeTextClass = isWin
    ? "text-emerald-700 dark:text-emerald-200"
    : "text-rose-700 dark:text-rose-200";
  const outcomeBgClass = isWin
    ? "bg-emerald-100/80 dark:bg-emerald-500/15"
    : "bg-rose-100/80 dark:bg-rose-500/15";

  const resolvedUserColor =
    typeof userColor === "string" && userColor.trim()
      ? userColor.trim()
      : "#3b82f6";

  const ddragonVersion = partida.dataVersion || "14.23.1";

  const rankingBadgeClass =
    partida.rankingPosition && partida.rankingPosition <= 3
      ? "border-white/30 bg-white/20 text-slate-900 dark:text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-[2px] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent after:content-[''] after:absolute after:top-0 after:left-0 after:w-px after:h-full after:bg-gradient-to-b after:from-white/70 after:via-transparent after:to-white/30"
      : "border-white/60 bg-white/80 text-slate-900 dark:text-white shadow-[0_6px_20px_rgba(15,23,42,0.15)] backdrop-blur-[2px] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent after:content-[''] after:absolute after:top-0 after:left-0 after:w-px after:h-full after:bg-gradient-to-b after:from-white/60 after:via-transparent after:to-white/25 dark:bg-white/10 dark:text-white";

  // Calcular badges de desempeño
  const matchTags = analyzeMatchTags({
    kills: partida.kills,
    deaths: partida.deaths,
    assists: partida.assists,
    win: isWin,
    gameDuration: partida.gameDuration,
    goldEarned: partida.goldEarned,
    csPerMinute: partida.csPerMin,
    totalDamageDealtToChampions: partida.damageToChampions,
    damageToTurrets: partida.damageToTurrets,
    visionScore: partida.visionScore,
    teamDamageShare: partida.teamTotalDamage
      ? partida.damageToChampions / partida.teamTotalDamage
      : undefined,
    killParticipation: playerStats.killParticipationRatio,
    objectivesStolen: partida.objectivesStolen,
    role: partida.role,
    teamTotalKills: partida.teamTotalKills,
    teamTotalDamage: partida.teamTotalDamage,
    teamTotalGold: partida.teamTotalGold,
    pentaKills: partida.pentaKills,
    quadraKills: partida.quadraKills,
    tripleKills: partida.tripleKills,
    doubleKills: partida.doubleKills,
    firstBloodKill: partida.firstBloodKill,
    totalTimeCCDealt: partida.totalTimeCCDealt,
    soloKills: partida.soloKills,
    turretPlatesTaken: partida.turretPlatesTaken,
    earlyLaningPhaseGoldExpAdvantage: partida.earlyLaningPhaseGoldExpAdvantage,
    goldDeficit: partida.goldDeficit,
  });

  const displayTags: MatchTag[] =
    matchTags.length > 0 ? matchTags : (["MVP"] as MatchTag[]);

  // Componente de runas
  const runesOnly = (
    <MatchRunes
      primaryStyle={primaryStyle}
      secondaryStyle={secondaryStyle}
      statPerks={statPerks}
      perkPrimaryStyle={partida.perkPrimaryStyle}
      perkSubStyle={partida.perkSubStyle}
      perkIconById={perkIconById}
      perkNameById={perkNameById}
    />
  );

  // Grid 2x2 completo: runas + hechizos
  const runesComponent = (
    <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-10 h-10">
      {/* Fila 1: Runas */}
      {runesOnly}

      {/* Fila 2: Hechizos */}
      {partida.summoner1Id > 0 && (
        <div className="group/spell relative w-full h-full rounded overflow-hidden bg-gradient-to-br from-white/30 to-white/10 dark:from-white/20 dark:to-white/5 border border-white/40 dark:border-white/20 shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md">
          <Image
            src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/spell/SummonerSpell${partida.summoner1Id}.png`}
            alt="Hechizo 1"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      )}
      {partida.summoner2Id > 0 && (
        <div className="group/spell relative w-full h-full rounded overflow-hidden bg-gradient-to-br from-white/30 to-white/10 dark:from-white/20 dark:to-white/5 border border-white/40 dark:border-white/20 shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md">
          <Image
            src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/spell/SummonerSpell${partida.summoner2Id}.png`}
            alt="Hechizo 2"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Card
        className={`group relative transition-all duration-500 border-none overflow-hidden ${
          isHidden ? "opacity-60" : ""
        } ${
          isWin
            ? "hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.4)] dark:hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.3)]"
            : "hover:shadow-[0_20px_60px_-15px_rgba(244,63,94,0.4)] dark:hover:shadow-[0_20px_60px_-15px_rgba(244,63,94,0.3)]"
        }`}
      >
        {/* Borde con gradiente dinámico */}
        <div className="absolute inset-0 rounded-lg p-[1px] bg-gradient-to-br from-white/40 via-white/10 to-white/40 dark:from-white/20 dark:via-white/5 dark:to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="relative min-h-[22rem] rounded-lg overflow-hidden backdrop-blur-[1px]">
          {/* Splash art base con tratamiento premium */}
          <div className="absolute inset-0 overflow-hidden">
            <ChampionCenteredSplash
              champion={partida.championName}
              skinId={0}
              className="h-full w-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700"
            />
            {/* Vignette dinámico según resultado */}
            <div
              className={`absolute inset-0 ${
                isWin
                  ? "bg-gradient-to-b from-emerald-900/5 via-white/60 to-emerald-50/80 dark:from-emerald-950/30 dark:via-black/70 dark:to-emerald-950/40"
                  : "bg-gradient-to-b from-rose-900/5 via-white/60 to-rose-50/80 dark:from-rose-950/30 dark:via-black/70 dark:to-rose-950/40"
              }`}
            />
            {/* Gradiente radial para profundidad */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,transparent_0%,rgba(0,0,0,0.15)_100%)] dark:bg-[radial-gradient(ellipse_at_top_right,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
            {/* Overlay de glassmorphism */}
            <div className="absolute inset-0 backdrop-blur-[0.5px] bg-white/5 dark:bg-black/10" />
          </div>

          {/* Contenido superpuesto con glassmorphism */}
          <div className="relative z-10 flex flex-col gap-4 p-4 sm:p-6 text-slate-900 dark:text-white backdrop-blur-sm">
            {/* Header */}
            <MatchHeader
              isVictory={isWin}
              outcomeTextClass={outcomeTextClass}
              outcomeBgClass={outcomeBgClass}
              tier={partida.tier}
              rank={partida.rank}
              matchId={partida.matchId}
              userId={userId}
              isOwnProfile={isOwnProfile}
              createdAt={partida.created_at}
              isAdmin={isAdmin}
              onHide={onHide}
              onUnhide={onUnhide}
              isHidden={isHidden}
              championName={partida.championName}
              sharedBy={sharedBy}
              rankingPosition={partida.rankingPosition}
              rankingBadgeClass={rankingBadgeClass}
              summoner1Id={partida.summoner1Id}
              summoner2Id={partida.summoner2Id}
              dataVersion={ddragonVersion}
              queueId={partida.queueId}
              gameDuration={partida.gameDuration}
              runesComponent={runesComponent}
            />

            {/* Items con runas/hechizos */}
            <MatchItems
              items={partida.items}
              dataVersion={ddragonVersion}
              runesComponent={runesComponent}
            />

            {/* Zona de comparativa + estadísticas + jugadores */}
            <div className="mt-3">
              {/* Vista móvil - Carrusel */}
              <div className="sm:hidden">
                <div className="relative">
                  <div
                    ref={mobileCarouselRef}
                    className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-2"
                  >
                    {hasComparative && (
                      <div className="snap-center w-[88%] shrink-0">
                        <TeamComparison
                          damageToChampions={partida.damageToChampions}
                          goldEarned={partida.goldEarned}
                          visionScore={partida.visionScore}
                          killParticipation={playerStats.killParticipation}
                          teamAvgDamageToChampions={
                            teamStats.teamAvgDamageToChampions
                          }
                          teamAvgGoldEarned={teamStats.teamAvgGoldEarned}
                          teamAvgVisionScore={teamStats.teamAvgVisionScore}
                          teamAvgKillParticipation={
                            teamStats.teamAvgKillParticipation
                          }
                          teamTotalDamage={partida.teamTotalDamage}
                          teamTotalGold={partida.teamTotalGold}
                          teamTotalKills={partida.teamTotalKills}
                          isBetterThanAvgDamage={
                            comparisons.isBetterThanAvgDamage
                          }
                          isBetterThanAvgGold={comparisons.isBetterThanAvgGold}
                          isBetterThanAvgVision={
                            comparisons.isBetterThanAvgVision
                          }
                          isBetterThanAvgKP={comparisons.isBetterThanAvgKP}
                          userColor={resolvedUserColor}
                        />
                      </div>
                    )}

                    <div className="snap-center w-[88%] shrink-0">
                      <MatchStats
                        kills={partida.kills}
                        deaths={partida.deaths}
                        assists={partida.assists}
                        kda={partida.kda}
                        totalCS={partida.totalCS}
                        csPerMin={partida.csPerMin}
                        visionScore={partida.visionScore}
                        damageToChampions={partida.damageToChampions}
                        goldEarned={partida.goldEarned}
                        damageToTurrets={partida.damageToTurrets}
                        outcomeTextClass={outcomeTextClass}
                        displayTags={displayTags}
                      />
                    </div>

                    {hasTeams && partida.allPlayers && (
                      <div className="snap-center w-[88%] shrink-0">
                        <TeamPlayers
                          players={partida.allPlayers}
                          dataVersion={ddragonVersion}
                        />
                      </div>
                    )}
                  </div>

                  <CarouselDots
                    totalPages={mobileCarouselPages}
                    currentIndex={mobileCarouselIndex}
                  />
                </div>
              </div>

              {/* Vista desktop - Grid */}
              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-12 gap-4">
                {hasComparative && (
                  <div className="sm:col-span-4">
                    <TeamComparison
                      damageToChampions={partida.damageToChampions}
                      goldEarned={partida.goldEarned}
                      visionScore={partida.visionScore}
                      killParticipation={playerStats.killParticipation}
                      teamAvgDamageToChampions={
                        teamStats.teamAvgDamageToChampions
                      }
                      teamAvgGoldEarned={teamStats.teamAvgGoldEarned}
                      teamAvgVisionScore={teamStats.teamAvgVisionScore}
                      teamAvgKillParticipation={
                        teamStats.teamAvgKillParticipation
                      }
                      teamTotalDamage={partida.teamTotalDamage}
                      teamTotalGold={partida.teamTotalGold}
                      teamTotalKills={partida.teamTotalKills}
                      isBetterThanAvgDamage={comparisons.isBetterThanAvgDamage}
                      isBetterThanAvgGold={comparisons.isBetterThanAvgGold}
                      isBetterThanAvgVision={comparisons.isBetterThanAvgVision}
                      isBetterThanAvgKP={comparisons.isBetterThanAvgKP}
                      userColor={resolvedUserColor}
                    />
                  </div>
                )}

                <div
                  className={hasComparative ? "sm:col-span-4" : "sm:col-span-6"}
                >
                  <MatchStats
                    kills={partida.kills}
                    deaths={partida.deaths}
                    assists={partida.assists}
                    kda={partida.kda}
                    totalCS={partida.totalCS}
                    csPerMin={partida.csPerMin}
                    visionScore={partida.visionScore}
                    damageToChampions={partida.damageToChampions}
                    goldEarned={partida.goldEarned}
                    damageToTurrets={partida.damageToTurrets}
                    outcomeTextClass={outcomeTextClass}
                    displayTags={displayTags}
                  />
                </div>

                {hasTeams && partida.allPlayers && (
                  <div
                    className={
                      hasComparative ? "sm:col-span-4" : "sm:col-span-6"
                    }
                  >
                    <TeamPlayers
                      players={partida.allPlayers}
                      dataVersion={ddragonVersion}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Comentario */}
            <MatchComment comment={partida.comment} />

            {/* Footer acciones */}
            <MatchFooter matchId={partida.matchId} />
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
};
