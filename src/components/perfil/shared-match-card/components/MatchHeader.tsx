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
  riotIdGameName?: string;
  riotIdTagline?: string;
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
  riotIdGameName,
  riotIdTagline,
  sharedBy,
  rankingPosition,
  rankingBadgeClass,
  summoner1Id,
  summoner2Id,
  dataVersion,
  queueId,
  gameDuration,
}) => {
  const relativeTime = getRelativeTime(createdAt);
  const queueName = getQueueName(queueId);
  const durationLabel = formatDuration(gameDuration);

  const rankLabel =
    rank && rank !== "NA" ? `${tier} ${rank}` : tier || "Unranked";

  const rankStyles: Record<string, string> = {
    GOLD: "border-amber-400 bg-amber-400/10 text-amber-700 dark:text-amber-400",
    PLATINUM:
      "border-emerald-400 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
    EMERALD:
      "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400",
    DIAMOND: "border-blue-400 bg-blue-400/10 text-blue-700 dark:text-blue-400",
    MASTER:
      "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-400",
    GRANDMASTER: "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
    CHALLENGER:
      "border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    default:
      "border-slate-200 bg-slate-200/10 text-slate-700 dark:text-slate-400",
  };

  const currentRankStyle = tier
    ? rankStyles[tier.toUpperCase()] || rankStyles.default
    : rankStyles.default;

  const riotIdLabel = riotIdGameName
    ? riotIdTagline
      ? `${riotIdGameName} #${riotIdTagline}`
      : riotIdGameName
    : (sharedBy?.username ?? sharedBy?.public_id ?? "Jugador");

  return (
    <div className="flex flex-col gap-6">
      {/* Barra de Información Unificada (Full Width Glassmorphism) */}
      <div className="relative group/infobar">
        {/* El contenedor de la barra con efecto glass premium */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/40 dark:bg-black/60 backdrop-blur-md border border-white/10 shadow-lg overflow-hidden">
          {/* Brillo superior interno sutil */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Izquierda: Queue Name */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-white/90 font-unbounded whitespace-nowrap">
              {queueName}
            </span>
            {tier && (
              <div className="hidden sm:flex items-center gap-1.5 opacity-60 flex-shrink-0">
                <span className="w-1 h-1 rounded-full bg-white/40" />
                <span className="text-[9px] font-bold text-white/70 uppercase whitespace-nowrap">
                  {tier}
                </span>
              </div>
            )}
          </div>

          {/* Centro: Resultado (Focal Point) */}
          <div className="flex-[1.5] flex justify-center px-2">
            <span
              className={`text-[12px] sm:text-[14px] font-black tracking-[0.25em] drop-shadow-sm whitespace-nowrap ${outcomeTextClass}`}
            >
              {isVictory ? "VICTORIA" : "DERROTA"}
            </span>
          </div>

          {/* Derecha: Tiempo + Duración */}
          <div className="flex items-center justify-end gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-white/70 whitespace-nowrap">
              <Clock className="w-3 h-3 opacity-60 flex-shrink-0" />
              <span>{relativeTime}</span>
            </div>
            <div className="w-px h-3 bg-white/10 flex-shrink-0" />
            <div className="text-[11px] sm:text-[12px] font-black text-white px-2 py-0.5 rounded bg-white/10 whitespace-nowrap">
              {durationLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Segunda fila: avatar + nombre del campeón + ranking */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Avatar del campeón */}
          <div className="relative shrink-0">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/50 dark:border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.3)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] bg-slate-900">
              <Image
                src={getChampionImageUrl(championName, dataVersion)}
                alt={championName}
                fill
                className="object-cover"
                unoptimized
                sizes="(max-width: 640px) 64px, 80px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </div>

          {/* Nombre del Riot ID + Nombre del Campeón */}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="text-[9px] sm:text-[10px] font-bold tracking-wider text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate w-fit font-unbounded">
              {riotIdLabel}
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] font-inter">
                {championName}
              </h3>
              {isHidden && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-950 dark:text-amber-100 bg-amber-400/90 rounded-full px-2.5 py-1 shadow-lg backdrop-blur-sm">
                  <EyeOff className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Badge de ranking */}
        {rankingPosition && (
          <div
            className={`relative overflow-hidden flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl font-black shrink-0 ${rankingBadgeClass}`}
          >
            <div className="relative flex flex-col items-center leading-none text-white">
              <span className="text-[8px] uppercase font-bold tracking-widest opacity-60">
                Rank
              </span>
              <span className="text-lg sm:text-xl font-black mt-1">
                #{rankingPosition}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
