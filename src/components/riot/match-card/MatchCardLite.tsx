"use client";

/**
 * MatchCardLite - Componente de render rápido para virtualización
 *
 * Optimizaciones:
 * - Sin cálculos de ranking (usa ranking_position de BD)
 * - Sin acceso a full_json
 * - Sin tooltips complejos
 * - Memoización agresiva
 * - Imágenes con lazy loading
 */

import React from "react";
import Image from "next/image";
import type { Match } from "./MatchCard";
import {
  getChampionImageUrl,
  getItemImageUrl,
  formatDuration,
  getRelativeTime,
  getQueueName,
} from "./helpers";

interface MatchCardLiteProps {
  match: Match;
  version: string;
  onClick?: () => void;
  onHover?: () => void;
  priority?: boolean;
}

// Badge de ranking con colores según posición
function RankingBadge({ position }: { position: number | null | undefined }) {
  if (!position || position <= 0) return null;

  const badgeClass =
    position === 1
      ? "bg-amber-400 text-slate-900"
      : position <= 3
      ? "bg-sky-400 text-slate-900"
      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200";

  return (
    <span
      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${badgeClass}`}
    >
      #{position}
    </span>
  );
}

// Componente de items compacto
function ItemsRow({
  items,
  version,
}: {
  items: (number | null)[];
  version: string;
}) {
  return (
    <div className="hidden sm:flex gap-0.5">
      {items.map((itemId, idx) =>
        itemId && itemId !== 0 ? (
          <div
            key={idx}
            className="relative w-6 h-6 rounded bg-slate-800 overflow-hidden border border-slate-700"
          >
            <Image
              src={getItemImageUrl(itemId, version)}
              alt={`Item ${itemId}`}
              fill
              sizes="24px"
              className="object-cover"
              loading="lazy"
              unoptimized
            />
          </div>
        ) : (
          <div
            key={idx}
            className="w-6 h-6 rounded bg-slate-800/40 border border-slate-700/50"
          />
        )
      )}
    </div>
  );
}

const MatchCardLiteComponent = ({
  match,
  version,
  onClick,
  onHover,
  priority = false,
}: MatchCardLiteProps) => {
  if (!match.matches) return null;

  const items = [
    match.item0,
    match.item1,
    match.item2,
    match.item3,
    match.item4,
    match.item5,
  ];

  const kdaClass =
    match.kda >= 3
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-slate-600 dark:text-slate-300";

  const borderClass = match.win ? "border-l-green-500" : "border-l-red-500";
  const bgClass = match.win
    ? "bg-green-500/5 hover:bg-green-500/10"
    : "bg-red-500/5 hover:bg-red-500/10";

  const rankingPosition =
    typeof (match as any).ranking_position === "number"
      ? (match as any).ranking_position
      : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={onHover}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      className={`
        flex items-center gap-3 p-3 rounded-lg border-l-4 
        transition-all cursor-pointer hover:shadow-md
        ${borderClass} ${bgClass}
      `}
    >
      {/* Columna 1: Campeón */}
      <div className="flex-shrink-0">
        <Image
          src={getChampionImageUrl(match.champion_name, version)}
          alt={match.champion_name}
          width={48}
          height={48}
          className="rounded-lg"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
        />
      </div>

      {/* Columna 2: KDA y metadata */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-slate-900 dark:text-white">
            {match.kills}/{match.deaths}/{match.assists}
          </span>
          <span className={`text-sm font-medium ${kdaClass}`}>
            {match.kda.toFixed(2)} KDA
          </span>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {getQueueName(match.matches.queue_id)} •{" "}
          {formatDuration(match.matches.game_duration)}
        </div>
      </div>

      {/* Columna 3: Items */}
      <ItemsRow items={items} version={version} />

      {/* Columna 4: Ranking */}
      <RankingBadge position={rankingPosition} />

      {/* Columna 5: Tiempo relativo */}
      <div className="hidden md:block text-xs text-slate-400 text-right min-w-[60px]">
        {getRelativeTime(match.created_at)}
      </div>
    </div>
  );
};

// Memoización con comparador personalizado para evitar re-renders innecesarios
export const MatchCardLite = React.memo(
  MatchCardLiteComponent,
  (prev, next) => {
    return (
      prev.match.match_id === next.match.match_id &&
      prev.version === next.version &&
      prev.priority === next.priority
    );
  }
);

export default MatchCardLite;
