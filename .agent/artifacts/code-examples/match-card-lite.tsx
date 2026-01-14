/**
 * EJEMPLO: MatchCardLite - Componente de render rápido
 *
 * Características:
 * - Sin cálculos de ranking (usa ranking_position de BD)
 * - Sin acceso a full_json
 * - Sin tooltips complejos
 * - Imágenes optimizadas con lazy loading
 * - Memoización agresiva
 */

"use client";

import React from "react";
import Image from "next/image";

interface MatchLite {
  match_id: string;
  champion_name: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  ranking_position?: number | null;
  vision_score?: number;
  total_damage_dealt?: number;
  gold_earned?: number;
  matches: {
    game_duration: number;
    game_creation: number;
    queue_id: number;
  };
}

interface MatchCardLiteProps {
  match: MatchLite;
  version: string;
  onClick?: () => void;
  priority?: boolean;
}

// Helpers inline para evitar imports
const getChampionUrl = (name: string, version: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${name}.png`;

const getItemUrl = (id: number, version: string) =>
  id
    ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${id}.png`
    : null;

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Hace menos de 1h";
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
};

const QUEUE_NAMES: Record<number, string> = {
  420: "Ranked Solo",
  440: "Ranked Flex",
  400: "Normal",
  450: "ARAM",
  900: "URF",
};

const MatchCardLiteComponent = ({
  match,
  version,
  onClick,
  priority = false,
}: MatchCardLiteProps) => {
  const items = [
    match.item0,
    match.item1,
    match.item2,
    match.item3,
    match.item4,
    match.item5,
  ].filter((id) => id && id !== 0);

  const kdaClass = match.kda >= 3 ? "text-emerald-600" : "text-slate-600";
  const borderClass = match.win ? "border-l-green-500" : "border-l-red-500";
  const bgClass = match.win ? "bg-green-500/5" : "bg-red-500/5";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      className={`
        flex items-center gap-3 p-3 rounded-lg border-l-4 
        transition-colors cursor-pointer
        hover:shadow-md
        ${borderClass} ${bgClass}
      `}
    >
      {/* Columna 1: Campeón */}
      <div className="flex-shrink-0">
        <Image
          src={getChampionUrl(match.champion_name, version)}
          alt={match.champion_name}
          width={48}
          height={48}
          className="rounded-lg"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
        />
      </div>

      {/* Columna 2: KDA */}
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
          {QUEUE_NAMES[match.matches.queue_id] || "Partida"} •{" "}
          {formatDuration(match.matches.game_duration)}
        </div>
      </div>

      {/* Columna 3: Items (solo los primeros 6) */}
      <div className="hidden sm:flex gap-0.5">
        {items.slice(0, 6).map((itemId, idx) => {
          const url = getItemUrl(itemId, version);
          return url ? (
            <div
              key={idx}
              className="relative w-6 h-6 rounded bg-slate-800 overflow-hidden"
            >
              <Image
                src={url}
                alt={`Item ${itemId}`}
                fill
                sizes="24px"
                className="object-cover"
                loading="lazy"
              />
            </div>
          ) : null;
        })}
      </div>

      {/* Columna 4: Ranking (si existe) */}
      {match.ranking_position && match.ranking_position > 0 && (
        <div
          className={`
            flex-shrink-0 w-8 h-8 rounded-full 
            flex items-center justify-center
            text-xs font-bold
            ${
              match.ranking_position === 1
                ? "bg-amber-400 text-slate-900"
                : match.ranking_position <= 3
                ? "bg-sky-400 text-slate-900"
                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            }
          `}
        >
          #{match.ranking_position}
        </div>
      )}

      {/* Columna 5: Tiempo relativo */}
      <div className="hidden md:block text-xs text-slate-400 text-right min-w-[60px]">
        {getRelativeTime(match.matches.game_creation)}
      </div>
    </div>
  );
};

// Memoización con comparador personalizado
export const MatchCardLite = React.memo(
  MatchCardLiteComponent,
  (prev, next) => {
    // Solo re-renderizar si cambian datos visuales críticos
    return (
      prev.match.match_id === next.match.match_id &&
      prev.version === next.version &&
      prev.priority === next.priority
    );
  }
);

export default MatchCardLite;
