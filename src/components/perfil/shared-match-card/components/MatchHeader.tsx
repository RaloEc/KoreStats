"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, EyeOff } from "lucide-react";
import {
  getSummonerSpellUrl,
  getQueueName,
  formatDuration,
  getRelativeTime,
  getChampionImageUrl,
} from "@/components/riot/match-card/helpers";
import { RiotTierBadge } from "@/components/riot/RiotTierBadge";
import { LPBadge } from "@/components/riot/match-card/LPBadge";
import { ActivityCardMenu } from "@/components/perfil/ActivityCardMenu";

interface MatchHeaderProps {
  // Resultado
  isVictory: boolean;
  outcomeTextClass: string;
  outcomeBgClass: string;
  // Rango
  tier: string | null;
  rank: string | null;
  matchId: string;
  userId?: string;
  isOwnProfile?: boolean;
  lp?: number | null;
  // Tiempo
  createdAt: string;
  // Menú
  isAdmin?: boolean;
  onHide?: () => void;
  onUnhide?: () => void;
  isHidden?: boolean;
  // Información del campeón
  championName: string;
  // Información del usuario que compartió
  sharedBy?: {
    username: string | null;
    public_id?: string | null;
  };
  // Ranking
  rankingPosition: number | null;
  rankingBadgeClass: string;
  // Hechizos
  summoner1Id: number;
  summoner2Id: number;
  dataVersion: string;
  // Queue
  queueId: number;
  gameDuration: number;
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({
  isVictory,
  outcomeTextClass,
  outcomeBgClass,
  tier,
  rank,
  matchId,
  userId,
  isOwnProfile,
  lp,
  createdAt,
  isAdmin,
  onHide,
  onUnhide,
  isHidden,
  championName,
  sharedBy,
  rankingPosition,
  rankingBadgeClass,
  summoner1Id,
  summoner2Id,
  dataVersion,
  queueId,
  gameDuration,
}) => {
  const rankLabel = tier ? `${tier} ${rank}` : "Sin rango";
  const relativeTime = getRelativeTime(createdAt);
  const queueName = getQueueName(queueId);
  const durationLabel = formatDuration(gameDuration);

  // Estilos de medalla más sutiles con glassmorphism
  const rankStyles = {
    1: "bg-gradient-to-br from-amber-400/40 via-yellow-300/30 to-amber-400/40 dark:from-amber-500/30 dark:via-yellow-400/25 dark:to-amber-500/30 border-amber-300/40 dark:border-amber-400/30 shadow-[0_4px_16px_rgba(251,191,36,0.2)] dark:shadow-[0_4px_16px_rgba(251,191,36,0.15)]",
    2: "bg-gradient-to-br from-slate-300/40 via-slate-200/30 to-slate-300/40 dark:from-slate-400/30 dark:via-slate-300/25 dark:to-slate-400/30 border-slate-300/40 dark:border-slate-400/30 shadow-[0_4px_16px_rgba(148,163,184,0.2)] dark:shadow-[0_4px_16px_rgba(148,163,184,0.15)]",
    3: "bg-gradient-to-br from-orange-400/40 via-amber-600/30 to-orange-400/40 dark:from-orange-500/30 dark:via-amber-500/25 dark:to-orange-500/30 border-orange-400/40 dark:border-orange-500/30 shadow-[0_4px_16px_rgba(251,146,60,0.2)] dark:shadow-[0_4px_16px_rgba(251,146,60,0.15)]",
    default:
      "bg-gradient-to-br from-white/30 via-slate-100/20 to-white/30 dark:from-slate-600/25 dark:via-slate-500/20 dark:to-slate-600/25 border-slate-300/30 dark:border-slate-500/25 shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.12)]",
  };

  const currentRankStyle =
    rankingPosition && rankingPosition <= 3
      ? rankStyles[rankingPosition as 1 | 2 | 3]
      : rankStyles.default;

  return (
    <div className="flex flex-col gap-4">
      {/* Primera fila: resultado, rango, tiempo y menú */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full font-bold text-[11px] tracking-wide shadow-sm backdrop-blur-md border border-white/10 ${outcomeBgClass} ${outcomeTextClass}`}
          >
            {isVictory ? "VICTORIA" : "DERROTA"}
          </span>
          {tier && (
            <div className="group/tier inline-flex items-center gap-2.5 rounded-full border-2 border-white/50 dark:border-white/30 bg-gradient-to-br from-white/90 via-white/80 to-white/70 dark:from-black/50 dark:via-black/40 dark:to-black/30 px-2.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)] backdrop-blur-md">
              <RiotTierBadge tier={tier} rank={rank} size="sm" />
              <span className="text-xs font-black tracking-wide text-slate-900 dark:text-white">
                {rankLabel}
              </span>
              <LPBadge lp={lp} />
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white/50 dark:bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm border border-white/20">
            <Clock className="w-3 h-3" />
            <span>{relativeTime}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-white/40 dark:bg-black/15 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
            <span>{durationLabel}</span>
          </div>
        </div>
      </div>

      {/* Segunda fila: avatar + nombre del campeón + queue + ranking */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar del campeón */}
          <div className="relative shrink-0">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-white/50 dark:border-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.2)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] bg-gradient-to-br from-slate-800 to-slate-900">
              <Image
                src={getChampionImageUrl(championName, dataVersion)}
                alt={championName}
                fill
                className="object-cover"
                unoptimized
              />
              {/* Overlay sutil */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>

          {/* Nombre del campeón + Queue */}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {sharedBy &&
              (sharedBy.username || sharedBy.public_id) &&
              sharedBy.public_id && (
                <Link
                  href={`/perfil/${sharedBy.public_id}`}
                  className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/70 dark:text-white/60 hover:text-white dark:hover:text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] truncate transition-colors cursor-pointer w-fit"
                  onClick={(e) => e.stopPropagation()}
                >
                  {sharedBy.username ?? sharedBy.public_id}
                </Link>
              )}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-none bg-gradient-to-br from-white via-white to-white/90 dark:from-white dark:via-white dark:to-white/80 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)] dark:drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)]">
                {championName}
              </h3>
              <span className="inline-flex items-center font-medium text-[10px] sm:text-xs text-slate-800 dark:text-white/85 bg-white/30 dark:bg-black/20 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
                {queueName}
              </span>
              {isHidden && (
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-amber-900 dark:text-amber-100 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/10 border-2 border-amber-300/60 dark:border-amber-500/40 rounded-full px-3 py-1 shadow-lg backdrop-blur-sm">
                  <EyeOff className="w-3 h-3" /> Oculto
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Badge de ranking */}
        {rankingPosition && (
          <div
            className={`relative overflow-hidden flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-black border backdrop-blur-xl shrink-0 ${currentRankStyle}`}
          >
            {/* Brillo superior sutil */}
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl" />
            {/* Contenido */}
            <div className="relative flex flex-col items-center leading-none text-slate-800 dark:text-white">
              <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider opacity-60">
                Rank
              </span>
              <span className="text-base sm:text-lg font-black mt-0.5">
                #{rankingPosition}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
