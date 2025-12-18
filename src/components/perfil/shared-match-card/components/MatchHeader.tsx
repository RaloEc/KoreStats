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
            <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/85 px-1.5 py-1 text-slate-900 shadow-sm shadow-slate-900/10 backdrop-blur-[2px] dark:border-white/25 dark:bg-black/40 dark:text-white">
              <RiotTierBadge tier={tier} rank={rank} size="sm" />
              <span className="text-[11px] font-semibold tracking-wide">
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

      {/* Segunda fila: nombre del campeón y ranking */}
      <div className="flex items-center justify-between gap-3 pr-1">
        <h3 className="text-2xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex items-center gap-2">
          <span className="flex flex-col leading-none">
            {sharedBy && (sharedBy.username || sharedBy.public_id) && (
              <span className="text-[11px] font-semibold text-white/80">
                {sharedBy.username ?? sharedBy.public_id}
              </span>
            )}
            <span>{championName}</span>
          </span>
          {isHidden && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-500/15 border border-amber-200/70 dark:border-amber-500/30 rounded-full px-2 py-0.5 ml-2">
              <EyeOff className="w-3 h-3" /> Oculto para ti
            </span>
          )}
        </h3>
        {rankingPosition && (
          <div
            className={`relative overflow-hidden flex items-center justify-center w-12 h-12 rounded-2xl font-bold text-xs tracking-tight border ${rankingBadgeClass}`}
          >
            <div className="flex flex-col items-center leading-tight text-slate-900 dark:text-white">
              <span className="text-[10px] uppercase font-semibold opacity-80">
                Rank
              </span>
              <span className="text-base font-semibold">
                #{rankingPosition}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tercera fila: runas y hechizos */}
      <div className="flex items-center gap-3 mt-1">
        {runesComponent}
        <div className="flex items-center gap-1">
          {summoner1Id > 0 && (
            <div className="relative w-6 h-6 rounded bg-white/15 overflow-hidden">
              <Image
                src={getSummonerSpellUrl(summoner1Id, dataVersion)}
                alt="Hechizo 1"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          {summoner2Id > 0 && (
            <div className="relative w-6 h-6 rounded bg-white/15 overflow-hidden">
              <Image
                src={getSummonerSpellUrl(summoner2Id, dataVersion)}
                alt="Hechizo 2"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
        </div>
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
