import React, { useState, useEffect, useMemo, memo } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChampionCenteredSplash } from "@/components/riot/ChampionCenteredSplash";
import { analyzeMatchTags, type MatchTag } from "@/lib/riot/match-analyzer";
import { getSummonerSpellUrl } from "@/components/riot/match-card/helpers";
import { getTagInfo } from "./helpers";
import { getDeterministicSkinIdClient } from "@/lib/riot/skinsCacheClient";

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
import { MatchDetailsCollapsible } from "./components/MatchDetailsCollapsible";
import { ActivityCardMenu } from "@/components/perfil/ActivityCardMenu";

export const SharedMatchCardRefactored: React.FC<SharedMatchCardProps> = memo(
  ({
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
    priority = false,
  }) => {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [realSkinId, setRealSkinId] = useState<number | null>(null);

    // Cargar skin real desde la API
    useEffect(() => {
      const loadRealSkin = async () => {
        try {
          const skinId = await getDeterministicSkinIdClient(
            partida.matchId,
            partida.championName
          );
          setRealSkinId(skinId);
        } catch (error) {
          console.error("Error loading real skin:", error);
          // Mantener el skinId inicial si falla
        }
      };

      // Solo cargar si no tenemos un skinId específico ya
      if (!partida.skinId || partida.skinId < 11) {
        loadRealSkin();
      }
    }, [partida.matchId, partida.championName, partida.skinId]);

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

    // Calcular estadísticas - MEMOIZADO para evitar recálculos
    const teamStats = useMemo(() => calculateTeamStats(partida), [partida]);
    const playerStats = useMemo(() => calculatePlayerStats(partida), [partida]);
    const comparisons = useMemo(
      () => calculateComparisons(partida, teamStats, playerStats),
      [partida, teamStats, playerStats]
    );

    // Determinar si hay datos comparativos y equipos
    const hasComparative =
      Boolean(partida.teamTotalDamage) ||
      Boolean(partida.teamTotalGold) ||
      Boolean(partida.teamTotalKills);
    const hasTeams = Boolean(
      partida.allPlayers && partida.allPlayers.length > 0
    );
    const mobileCarouselPages =
      (hasComparative ? 1 : 0) + 1 + (hasTeams ? 1 : 0);

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

    // Calcular badges de desempeño - MEMOIZADO
    const matchTags = useMemo(
      () =>
        analyzeMatchTags({
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
          earlyLaningPhaseGoldExpAdvantage:
            partida.earlyLaningPhaseGoldExpAdvantage,
          goldDeficit: partida.goldDeficit,
        }),
      [partida, isWin, playerStats.killParticipationRatio]
    );

    const displayTags: MatchTag[] = useMemo(
      () => (matchTags.length > 0 ? matchTags : (["MVP"] as MatchTag[])),
      [matchTags]
    );

    // Usar realSkinId si está disponible, sino el skinId de partida, sino 0
    const skinId = realSkinId ?? partida.skinId ?? 0;

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
        {partida.summoner1Id > 0 &&
          getSummonerSpellUrl(partida.summoner1Id, ddragonVersion) && (
            <div className="group/spell relative w-full h-full rounded overflow-hidden bg-gradient-to-br from-white/30 to-white/10 dark:from-white/20 dark:to-white/5 border border-white/40 dark:border-white/20 shadow-sm">
              <Image
                src={getSummonerSpellUrl(partida.summoner1Id, ddragonVersion)}
                alt="Hechizo 1"
                fill
                className="object-cover"
              />
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
            </div>
          )}
        {partida.summoner2Id > 0 &&
          getSummonerSpellUrl(partida.summoner2Id, ddragonVersion) && (
            <div className="group/spell relative w-full h-full rounded overflow-hidden bg-gradient-to-br from-white/30 to-white/10 dark:from-white/20 dark:to-white/5 border border-white/40 dark:border-white/20 shadow-sm">
              <Image
                src={getSummonerSpellUrl(partida.summoner2Id, ddragonVersion)}
                alt="Hechizo 2"
                fill
                className="object-cover"
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
          }`}
          style={{ willChange: "transform" }}
        >
          {/* Borde con gradiente dinámico (estático ahora) */}
          <div className="absolute inset-0 rounded-lg p-[1px] bg-gradient-to-br from-white/40 via-white/10 to-white/40 dark:from-white/20 dark:via-white/5 dark:to-white/20 pointer-events-none" />

          <div className="relative min-h-[22rem] rounded-lg overflow-hidden">
            {/* Splash art base con tratamiento premium */}
            <div className="absolute inset-0 overflow-hidden">
              <ChampionCenteredSplash
                champion={partida.championName}
                skinId={skinId}
                className="h-full w-full object-cover scale-105"
                priority={priority}
              />
              {/* Vignette dinámico según resultado - OPTIMIZADO para mejor contraste */}
              <div
                className={`absolute inset-0 ${
                  isWin
                    ? "bg-gradient-to-b from-emerald-900/20 via-slate-100/50 to-emerald-50/98 dark:from-emerald-950/40 dark:via-black/55 dark:to-emerald-950/85"
                    : "bg-gradient-to-b from-rose-900/20 via-slate-100/50 to-rose-50/98 dark:from-rose-950/40 dark:via-black/55 dark:to-rose-950/85"
                }`}
              />
              {/* Gradiente radial para profundidad - OPTIMIZADO */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,rgba(0,0,0,0.12)_100%)] dark:bg-[radial-gradient(ellipse_at_top,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
            </div>

            {/* Contenido superpuesto - OPTIMIZADO sin backdrop-blur */}
            <div className="relative z-10 flex flex-col gap-4 p-4 sm:p-6 text-slate-950 dark:text-white">
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
              />

              {/* Items con runas/hechizos */}
              <MatchItems
                items={partida.items}
                dataVersion={ddragonVersion}
                runesComponent={runesComponent}
              />

              {/* KDA Summary - Visible solo cuando está colapsado */}
              {!isDetailsOpen && (
                <div className="flex flex-col items-center justify-center py-2 -mt-2 animate-in fade-in zoom-in duration-300">
                  {/* KDA con glassmorphism para mejor legibilidad */}
                  <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-xl px-4 py-3 border border-white/40 dark:border-white/10 shadow-lg">
                    <div className="flex items-center gap-1.5 mb-1 text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight justify-center">
                      <span>{partida.kills}</span>
                      <span className="text-slate-400 dark:text-slate-500 font-normal">
                        /
                      </span>
                      <span>{partida.deaths}</span>
                      <span className="text-slate-400 dark:text-slate-500 font-normal">
                        /
                      </span>
                      <span>{partida.assists}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                      <span
                        className={`text-sm font-bold uppercase tracking-wider ${
                          partida.kda >= 3
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {partida.kda.toFixed(2)} KDA
                      </span>
                    </div>
                  </div>

                  {displayTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                      {displayTags.map((tag) => {
                        const tagInfo = getTagInfo(tag);
                        return (
                          <Tooltip key={tag}>
                            <TooltipTrigger asChild>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-bold text-[9px] ${tagInfo.color} cursor-help border border-white/20 shadow-sm transition-transform hover:scale-105`}
                              >
                                {tagInfo.label}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-semibold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                              <p>{tagInfo.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Zona de comparativa + estadísticas + jugadores - DESPLEGABLE */}
              <MatchDetailsCollapsible
                defaultOpen={false}
                isOpen={isDetailsOpen}
                onToggle={() => setIsDetailsOpen(!isDetailsOpen)}
              >
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
                            isBetterThanAvgGold={
                              comparisons.isBetterThanAvgGold
                            }
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

                {/* Vista desktop - Carrusel (2 slides) */}
                <div className="hidden sm:block">
                  <div className="relative">
                    <div
                      ref={mobileCarouselRef}
                      className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 px-2"
                    >
                      {/* Slide 1: Comparativa + Estadísticas */}
                      <div className="snap-center w-full shrink-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {hasComparative && (
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
                              isBetterThanAvgGold={
                                comparisons.isBetterThanAvgGold
                              }
                              isBetterThanAvgVision={
                                comparisons.isBetterThanAvgVision
                              }
                              isBetterThanAvgKP={comparisons.isBetterThanAvgKP}
                              userColor={resolvedUserColor}
                            />
                          )}
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
                      </div>

                      {/* Slide 2: Jugadores (ancho completo) */}
                      {hasTeams && partida.allPlayers && (
                        <div className="snap-center w-full shrink-0">
                          <TeamPlayers
                            players={partida.allPlayers}
                            dataVersion={ddragonVersion}
                          />
                        </div>
                      )}
                    </div>

                    <CarouselDots
                      totalPages={hasTeams ? 2 : 1}
                      currentIndex={mobileCarouselIndex}
                    />
                  </div>
                </div>
              </MatchDetailsCollapsible>

              {/* Comentario */}

              <MatchComment comment={partida.comment} />

              {/* Footer acciones */}
              <MatchFooter matchId={partida.matchId} />
            </div>

            {/* Botón de opciones en esquina inferior derecha */}
            {(isOwnProfile || isAdmin) && (
              <div className="absolute bottom-4 right-4 z-20">
                <ActivityCardMenu
                  activityType="lol_match"
                  activityId={partida.matchId}
                  isOwnProfile={isOwnProfile}
                  isAdmin={isAdmin}
                  onHide={onHide}
                  onUnhide={onUnhide}
                  isHidden={isHidden}
                />
              </div>
            )}
          </div>
        </Card>
      </TooltipProvider>
    );
  }
);
