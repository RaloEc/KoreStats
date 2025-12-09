"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import {
  Trophy,
  Trash2,
  ExternalLink,
  Zap,
  Shield as ShieldIcon,
  Clock,
  MoreVertical,
  Mountain,
  Route,
  Swords,
  Target,
  LifeBuoy,
  EyeOff,
} from "lucide-react";
import { ChampionCenteredSplash } from "@/components/riot/ChampionCenteredSplash";
import {
  getItemImageUrl,
  getSummonerSpellUrl,
  getRuneIconUrl,
  getQueueName,
  formatDuration,
  getRelativeTime,
} from "@/components/riot/match-card/helpers";
import { getPerkImg } from "@/lib/riot/helpers";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiotTierBadge } from "@/components/riot/RiotTierBadge";
import { ActivityCardMenu } from "@/components/perfil/ActivityCardMenu";
import type { LucideIcon } from "lucide-react";

export interface SharedMatchData {
  entryId: string;
  matchId: string;
  championId: number;
  championName: string;
  role: string;
  lane: string;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
  totalCS: number;
  csPerMin: number;
  visionScore: number;
  damageToChampions: number;
  damageToTurrets: number;
  goldEarned: number;
  items: number[];
  summoner1Id: number;
  summoner2Id: number;
  perkPrimaryStyle: number;
  perkSubStyle: number;
  rankingPosition: number | null;
  performanceScore: number | null;
  result: "win" | "loss";
  queueId: number;
  gameDuration: number;
  gameCreation: number;
  dataVersion: string;
  tier: string | null;
  rank: string | null;
  leaguePoints: number;
  rankWins: number;
  rankLosses: number;
  comment: string | null;
  created_at: string;
  perks?: RunePerks | null;
}

interface SharedMatchCardProps {
  partida: SharedMatchData;
  userColor?: string;
  isOwnProfile?: boolean;
  isAdmin?: boolean;
  onDelete?: (entryId: string) => Promise<void>;
  deletingId?: string | null;
  onHide?: () => void;
  onUnhide?: () => void;
  isHidden?: boolean;
}

type RuneSelection = {
  perk?: number;
  var1?: number;
  var2?: number;
  var3?: number;
};

const laneIconMap: Record<string, LucideIcon> = {
  TOP: Mountain,
  JG: Route,
  MID: Swords,
  ADC: Target,
  SUPP: LifeBuoy,
};

type RuneStyle = {
  description?: string;
  style?: number;
  selections?: RuneSelection[];
};

type RunePerks = {
  styles?: RuneStyle[];
  statPerks?: {
    offense?: number;
    flex?: number;
    defense?: number;
  };
};

const RUNE_STYLE_LABELS: Record<number, string> = {
  8000: "Precisión",
  8100: "Dominación",
  8200: "Brujería",
  8300: "Inspiración",
  8400: "Valor",
};

const getRuneStyleLabel = (styleId?: number) => {
  if (!styleId) return "Runas";
  return RUNE_STYLE_LABELS[styleId] ?? "Runas";
};

const normalizeRole = (value?: string) =>
  value?.toUpperCase().replace(/\s+/g, "") ?? "";

const getLaneAbbreviation = (role?: string, lane?: string): string | null => {
  const priority = [role, lane]
    .map((val, index) =>
      index === 0 ? normalizeRole(val) : normalizeRole(val)
    )
    .filter(Boolean);

  const supportRoles = new Set(["DUOSUPPORT", "SUPPORT", "SUPP", "UTILITY"]);

  if (supportRoles.has(priority[0])) return "SUPP";

  const map: Record<string, string> = {
    TOP: "TOP",
    JUNGLE: "JG",
    JUNGLER: "JG",
    JG: "JG",
    MID: "MID",
    MIDDLE: "MID",
    MIDLANE: "MID",
    BOTTOM: "ADC",
    BOT: "ADC",
    ADC: "ADC",
    DUOCARRY: "ADC",
    CARRY: "ADC",
    MARKSMAN: "ADC",
    SUPPORT: "SUPP",
    SUP: "SUPP",
    SUPP: "SUPP",
    DUOSUPPORT: "SUPP",
    UTILITY: "SUPP",
  };

  for (const value of priority) {
    if (!value) continue;
    if (supportRoles.has(value)) return "SUPP";
    if (map[value]) return map[value];
  }

  return null;
};

export const SharedMatchCard = ({
  partida,
  userColor = "#3b82f6",
  isOwnProfile = false,
  isAdmin = false,
  onDelete,
  deletingId,
  onHide,
  onUnhide,
  isHidden = false,
}: SharedMatchCardProps) => {
  const isWin = partida.result === "win";
  const isVictory = isWin;
  const outcomeTextClass = isVictory
    ? "text-emerald-700 dark:text-emerald-200"
    : "text-rose-700 dark:text-rose-200";
  const outcomeBgClass = isVictory
    ? "bg-emerald-100/80 dark:bg-emerald-500/15"
    : "bg-rose-100/80 dark:bg-rose-500/15";

  const colorStyle = {
    "--user-color": userColor,
  } as React.CSSProperties;

  const queueName = getQueueName(partida.queueId);
  const durationLabel = formatDuration(partida.gameDuration);
  const relativeTime = getRelativeTime(partida.created_at);
  const ddragonVersion = partida.dataVersion || "14.23.1";

  const rankLabel = partida.tier
    ? `${partida.tier} ${partida.rank}`
    : "Sin rango";

  const laneAbbreviation = getLaneAbbreviation(partida.role, partida.lane);
  const laneIconKey = laneAbbreviation?.toUpperCase();
  const LaneIcon = laneIconKey ? laneIconMap[laneIconKey] : null;

  const rankingBadgeClass =
    partida.rankingPosition && partida.rankingPosition <= 3
      ? "border-white/30 bg-white/20 text-slate-900 dark:text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-[2px] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent after:content-[''] after:absolute after:top-0 after:left-0 after:w-px after:h-full after:bg-gradient-to-b after:from-white/70 after:via-transparent after:to-white/30"
      : "border-white/60 bg-white/80 text-slate-900 dark:text-white shadow-[0_6px_20px_rgba(15,23,42,0.15)] backdrop-blur-[2px] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent after:content-[''] after:absolute after:top-0 after:left-0 after:w-px after:h-full after:bg-gradient-to-b after:from-white/60 after:via-transparent after:to-white/25 dark:bg-white/10 dark:text-white";

  const runeStyles = partida.perks?.styles ?? [];
  const primaryStyle =
    runeStyles.find((style) => style.description === "primaryStyle") ??
    runeStyles.find((style) => style.style === partida.perkPrimaryStyle);
  const secondaryStyle =
    runeStyles.find((style) => style.description === "subStyle") ??
    runeStyles.find((style) => style.style === partida.perkSubStyle);
  const statPerks = partida.perks?.statPerks;

  const hasDetailedRunes = Boolean(
    (primaryStyle?.selections && primaryStyle.selections.length > 0) ||
      (secondaryStyle?.selections && secondaryStyle.selections.length > 0) ||
      statPerks?.offense ||
      statPerks?.flex ||
      statPerks?.defense
  );

  const renderRuneSelections = (style?: RuneStyle) => {
    if (!style?.selections?.length) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {style.selections.map((selection, index) => {
          const icon = getPerkImg(selection.perk ?? null);
          const key = `${style.style}-${selection.perk ?? index}`;
          return (
            <div
              key={key}
              className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-900/60 border border-white/10"
            >
              {icon ? (
                <Image
                  src={icon}
                  alt="Runa seleccionada"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-slate-800" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderShardIcons = () => {
    if (!statPerks) return null;
    const shards = [
      statPerks.offense,
      statPerks.flex,
      statPerks.defense,
    ].filter(Boolean);
    if (shards.length === 0) return null;
    return (
      <div className="flex items-center gap-2 mt-2">
        {shards.map((shardId, index) => {
          const icon = getPerkImg(shardId ?? null);
          const key = `shard-${shardId ?? index}`;
          return (
            <div
              key={key}
              className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-900/60 border border-white/10"
            >
              {icon ? (
                <Image
                  src={icon}
                  alt="Fragmento"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-slate-800" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const RuneTooltipContent = () => {
    if (!hasDetailedRunes) return null;
    return (
      <div className="space-y-3 text-xs">
        {primaryStyle && (
          <div>
            <p className="text-[11px] uppercase font-semibold text-muted-foreground">
              Primaria • {getRuneStyleLabel(primaryStyle.style)}
            </p>
            {renderRuneSelections(primaryStyle)}
          </div>
        )}
        {secondaryStyle && (
          <div>
            <p className="text-[11px] uppercase font-semibold text-muted-foreground">
              Secundaria • {getRuneStyleLabel(secondaryStyle.style)}
            </p>
            {renderRuneSelections(secondaryStyle)}
          </div>
        )}
        {renderShardIcons() && (
          <div>
            <p className="text-[11px] uppercase font-semibold text-muted-foreground">
              Fragmentos
            </p>
            {renderShardIcons()}
          </div>
        )}
      </div>
    );
  };

  const runeIcons = (
    <div className="flex items-center gap-1">
      {partida.perkPrimaryStyle > 0 && (
        <div className="relative w-6 h-6 rounded-full overflow-hidden">
          <Image
            src={getRuneIconUrl(partida.perkPrimaryStyle)}
            alt="Runa primaria"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      {partida.perkSubStyle > 0 && (
        <div className="relative w-5 h-5 rounded-full overflow-hidden">
          <Image
            src={getRuneIconUrl(partida.perkSubStyle)}
            alt="Runa secundaria"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
    </div>
  );

  const runeIconsWithTooltip = hasDetailedRunes ? (
    <Tooltip>
      <TooltipTrigger asChild>{runeIcons}</TooltipTrigger>
      <TooltipContent className="w-64 p-3">
        <RuneTooltipContent />
      </TooltipContent>
    </Tooltip>
  ) : (
    runeIcons
  );

  // Calcular color del performance score
  const getScoreColor = (score: number | null) => {
    if (!score) return "text-slate-400";
    if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 75) return "text-blue-600 dark:text-blue-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 45) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Card
        className={`transition-shadow hover:shadow-xl border-none bg-white/70 dark:bg-slate-950/60 overflow-hidden ${
          isHidden ? "opacity-60" : ""
        }`}
      >
        <div className="relative min-h-[22rem]">
          {/* Splash art base */}
          <div className="absolute inset-0 overflow-hidden">
            <ChampionCenteredSplash
              championName={partida.championName}
              skinId={0}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/50 to-white/5 dark:from-black/20 dark:via-black/60 dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/0 to-white/10 dark:from-black/35 dark:via-black/35 dark:to-black/55" />
          </div>

          {/* Contenido superpuesto */}
          <div className="relative z-10 flex flex-col gap-4 p-4 sm:p-6 text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] ${outcomeBgClass} ${outcomeTextClass}`}
                  >
                    {isVictory ? "Victoria" : "Derrota"}
                  </span>
                  {partida.tier && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/85 px-1.5 py-1 text-slate-900 shadow-sm shadow-slate-900/10 backdrop-blur-[2px] dark:border-white/25 dark:bg-black/40 dark:text-white">
                      <RiotTierBadge
                        tier={partida.tier}
                        rank={partida.rank}
                        size="sm"
                      />
                      <span className="text-[11px] font-semibold tracking-wide">
                        {rankLabel}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm">
                    <Clock className="w-3 h-3" />
                    <span>{relativeTime}</span>
                  </div>
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
              </div>

              <div className="flex items-center justify-between gap-3 pr-1">
                <h3 className="text-2xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex items-center gap-2">
                  <span>{partida.championName}</span>
                  {isHidden && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-500/15 border border-amber-200/70 dark:border-amber-500/30 rounded-full px-2 py-0.5 ml-2">
                      <EyeOff className="w-3 h-3" /> Oculto para ti
                    </span>
                  )}
                </h3>
                {partida.rankingPosition && (
                  <div
                    className={`relative overflow-hidden flex items-center justify-center w-12 h-12 rounded-2xl font-bold text-xs tracking-tight border ${rankingBadgeClass}`}
                  >
                    <div className="flex flex-col items-center leading-tight text-slate-900 dark:text-white">
                      <span className="text-[10px] uppercase font-semibold opacity-80">
                        Rank
                      </span>
                      <span className="text-base font-semibold">
                        #{partida.rankingPosition}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1">
                {runeIconsWithTooltip}
                <div className="flex items-center gap-1">
                  {partida.summoner1Id > 0 && (
                    <div className="relative w-6 h-6 rounded bg-white/15 overflow-hidden">
                      <Image
                        src={getSummonerSpellUrl(
                          partida.summoner1Id,
                          ddragonVersion
                        )}
                        alt="Hechizo 1"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  {partida.summoner2Id > 0 && (
                    <div className="relative w-6 h-6 rounded bg-white/15 overflow-hidden">
                      <Image
                        src={getSummonerSpellUrl(
                          partida.summoner2Id,
                          ddragonVersion
                        )}
                        alt="Hechizo 2"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-white/85">
                <span className="font-medium">{queueName}</span>
                <span>•</span>
                <span>{durationLabel}</span>
              </div>
            </div>

            {/* Build + stats */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="space-y-2 shrink-0 flex flex-col items-center">
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-2">
                  {partida.items.slice(0, 6).map((itemId, idx) => (
                    <div
                      key={idx}
                      className="relative w-9 h-9 rounded border border-slate-200/80 overflow-hidden bg-white/95 shadow-sm dark:border-white/20 dark:bg-white/10"
                    >
                      {itemId > 0 && (
                        <Image
                          src={getItemImageUrl(itemId, ddragonVersion)}
                          alt={`Item ${itemId}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  {
                    label: "KDA",
                    value: `${partida.kills}/${partida.deaths}/${partida.assists}`,
                    sub: `${partida.kda.toFixed(2)} ratio`,
                    accentClass: outcomeTextClass,
                    longSub: true,
                  },
                  {
                    label: "CS",
                    value: partida.totalCS.toString(),
                    sub: `${partida.csPerMin.toFixed(1)}/min`,
                  },
                  {
                    label: "Visión",
                    value: partida.visionScore.toString(),
                  },
                  {
                    label: "Score",
                    value: partida.performanceScore
                      ? partida.performanceScore.toFixed(0)
                      : "-",
                    accentClass: getScoreColor(partida.performanceScore),
                  },
                  {
                    label: "Daño",
                    value: `${(partida.damageToChampions / 1000).toFixed(1)}k`,
                    sub: "champ",
                  },
                  {
                    label: "Oro",
                    value: `${(partida.goldEarned / 1000).toFixed(1)}k`,
                    sub: "total",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`relative overflow-hidden rounded-xl border border-white/40 bg-white/65 px-1.5 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md dark:bg-white/10 dark:border-white/20 ${
                      stat.longSub ? "col-span-1" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-wide text-slate-700 dark:text-white/60">
                      <span className="font-bold">{stat.label}</span>
                      {stat.sub && (
                        <span className="text-[9px] text-slate-600 dark:text-white/50 font-semibold">
                          {stat.sub}
                        </span>
                      )}
                    </div>
                    <div
                      className={`mt-1 text-sm sm:text-base font-semibold leading-tight ${
                        stat.accentClass ?? "text-slate-900 dark:text-white"
                      }`}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comentario */}
            {partida.comment && (
              <div className="bg-white/90 border border-slate-200 rounded p-3 text-sm text-slate-800 italic shadow-sm dark:bg-white/10 dark:border-white/20 dark:text-white/90">
                "{partida.comment}"
              </div>
            )}

            {/* Footer acciones */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={`/match/${partida.matchId}`}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-slate-900/20 transition hover:bg-slate-800 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
              >
                Abrir análisis
                <ExternalLink className="w-4 h-4" />
              </Link>
              <div className="ml-auto flex items-center">
                {isOwnProfile && onDelete && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-600 hover:bg-slate-900/5 dark:text-white/80 dark:hover:bg-white/10"
                        aria-label="Acciones de la partida"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        disabled={deletingId === partida.entryId}
                        className="text-red-600 focus:text-red-600"
                        onSelect={(event) => {
                          event.preventDefault();
                          onDelete(partida.entryId);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                        {deletingId === partida.entryId
                          ? "Eliminando..."
                          : "Eliminar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
};
