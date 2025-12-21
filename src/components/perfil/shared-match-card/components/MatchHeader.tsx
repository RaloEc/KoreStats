"use client";

import React from "react";
import Image from "next/image";
import { Clock, EyeOff } from "lucide-react";
import {
  getSummonerSpellUrl,
  getQueueName,
  formatDuration,
  getRelativeTime,
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
  // Runas (componente hijo)
  runesComponent: React.ReactNode;
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
  runesComponent,
}) => {
  const rankLabel = tier ? `${tier} ${rank}` : "Sin rango";
  const relativeTime = getRelativeTime(createdAt);
  const queueName = getQueueName(queueId);
  const durationLabel = formatDuration(gameDuration);

  return (
    <div className="flex flex-col gap-4">
      {/* Primera fila: resultado, rango, tiempo y menú */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] ${outcomeBgClass} ${outcomeTextClass}`}
          >
            {isVictory ? "Victoria" : "Derrota"}
          </span>
          {tier && (
            <div className="group/tier inline-flex items-center gap-2.5 rounded-full border-2 border-white/50 dark:border-white/30 bg-gradient-to-br from-white/90 via-white/80 to-white/70 dark:from-black/50 dark:via-black/40 dark:to-black/30 px-2.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-[0_6px_24px_rgba(0,0,0,0.18)] dark:hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)]">
              <RiotTierBadge tier={tier} rank={rank} size="sm" />
              <span className="text-xs font-black tracking-wide text-slate-900 dark:text-white">
                {rankLabel}
              </span>
              <LPBadge
                gameId={(() => {
                  const parts = matchId.split("_");
                  return parts.length > 1 ? parts[1] : parts[0];
                })()}
                userId={userId}
                isOwnProfile={isOwnProfile}
              />
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
            activityId={matchId}
            isOwnProfile={isOwnProfile}
            isAdmin={isAdmin}
            onHide={onHide}
            onUnhide={onUnhide}
            isHidden={isHidden}
          />
        </div>
      </div>

      {/* Segunda fila: nombre del campeón y ranking - REDISEÑADO */}
      <div className="flex items-start justify-between gap-3 pr-1">
        <h3 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
          <span className="flex flex-col leading-none">
            {sharedBy && (sharedBy.username || sharedBy.public_id) && (
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/70 dark:text-white/60 mb-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                {sharedBy.username ?? sharedBy.public_id}
              </span>
            )}
            <span className="bg-gradient-to-br from-white via-white to-white/90 dark:from-white dark:via-white dark:to-white/80 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)] dark:drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)]">
              {championName}
            </span>
          </span>
          {isHidden && (
            <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-amber-900 dark:text-amber-100 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-amber-500/10 border-2 border-amber-300/60 dark:border-amber-500/40 rounded-full px-3 py-1 shadow-lg backdrop-blur-sm">
              <EyeOff className="w-3 h-3" /> Oculto
            </span>
          )}
        </h3>

        {rankingPosition && (
          <div
            className={`relative group/rank overflow-hidden flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl font-black border-2 transition-all duration-300 hover:scale-110 ${
              rankingPosition === 1
                ? "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-300 border-amber-200 dark:from-amber-400 dark:via-yellow-300 dark:to-amber-400 dark:border-amber-300 shadow-[0_8px_32px_rgba(251,191,36,0.5)] dark:shadow-[0_8px_32px_rgba(251,191,36,0.4)]"
                : rankingPosition === 2
                ? "bg-gradient-to-br from-slate-300 via-slate-200 to-slate-300 border-slate-200 dark:from-slate-400 dark:via-slate-300 dark:to-slate-400 dark:border-slate-300 shadow-[0_8px_32px_rgba(148,163,184,0.4)] dark:shadow-[0_8px_32px_rgba(148,163,184,0.3)]"
                : rankingPosition === 3
                ? "bg-gradient-to-br from-orange-400 via-amber-600 to-orange-400 border-orange-300 dark:from-orange-500 dark:via-amber-500 dark:to-orange-500 dark:border-orange-400 shadow-[0_8px_32px_rgba(251,146,60,0.4)] dark:shadow-[0_8px_32px_rgba(251,146,60,0.3)]"
                : "bg-gradient-to-br from-white via-slate-50 to-white border-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 dark:border-slate-500 shadow-[0_6px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_6px_24px_rgba(0,0,0,0.3)]"
            }`}
          >
            {/* Brillo superior */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-2xl" />
            {/* Contenido */}
            <div className="relative flex flex-col items-center leading-none text-slate-900 dark:text-slate-900">
              <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-wider opacity-70">
                Rank
              </span>
              <span className="text-xl sm:text-2xl font-black mt-0.5">
                #{rankingPosition}
              </span>
            </div>
            {/* Efecto de brillo al hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/30 opacity-0 group-hover/rank:opacity-100 transition-opacity duration-300 rounded-2xl" />
          </div>
        )}
      </div>

      {/* Cuarta fila: tipo de cola y duración */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-white/85">
        <span className="font-medium">{queueName}</span>
        <span>•</span>
        <span>{durationLabel}</span>
      </div>
    </div>
  );
};
