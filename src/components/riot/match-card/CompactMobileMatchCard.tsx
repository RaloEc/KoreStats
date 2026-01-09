"use client";

import Image from "next/image";
import type { Match } from "./MatchCard";
import {
  getChampionImageUrl,
  getItemImageUrl,
  getSummonerSpellUrl,
  getQueueName,
  formatDuration,
  getRuneIconUrl,
} from "./helpers";
import {
  getKeystonePerkId,
  type RunePerks,
  usePerkAssets,
} from "./RunesTooltip";
import { LPBadge } from "./LPBadge";
import {
  computeParticipantScores,
  getParticipantKey as getParticipantKeyUtil,
} from "./performance-utils";

function getRankingBadgeClass(position?: number | null) {
  if (!position) {
    return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";
  }
  if (position === 1) {
    return "bg-amber-400 text-slate-900 dark:bg-amber-300";
  }
  if (position <= 3) {
    return "bg-sky-400 text-slate-900 dark:bg-sky-300";
  }
  return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
}

interface RiotParticipant {
  puuid: string;
  perks?: RunePerks;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  champLevel?: number;
}

interface CompactMobileMatchCardProps {
  match: Match;
  version: string;
  userId?: string;
  isOwnProfile?: boolean;
  priority?: boolean;
  onSelectMatch?: (matchId: string) => void;
  onHoverMatch?: (matchId: string) => void;
}

export type { CompactMobileMatchCardProps };

/**
 * Tarjeta compacta de partida para móvil
 * Diseño inspirado en el cliente original de League of Legends
 * Muestra: Campeón + Nivel, Hechizos, Runas, KDA, Items, Stats, Duración
 */
export function CompactMobileMatchCard({
  match,
  version,
  userId,
  isOwnProfile = false,
  priority = false,
  onSelectMatch,
  onHoverMatch,
}: CompactMobileMatchCardProps) {
  if (!match.matches) {
    return null;
  }

  // Estado de ingesta
  const isProcessing = (match.matches as any)?.ingest_status === "processing";
  const isFailed = (match.matches as any)?.ingest_status === "failed";

  const isVictory = match.win;
  const REMAKE_DURATION_THRESHOLD = 300;
  type RemakeFlagsParticipant = {
    gameEndedInEarlySurrender?: boolean;
    teamEarlySurrendered?: boolean;
  };
  const remakeParticipants = (match.matches?.full_json?.info?.participants ??
    []) as RemakeFlagsParticipant[];
  const isRemake = Boolean(
    (match.matches?.game_duration ?? 0) < REMAKE_DURATION_THRESHOLD ||
      remakeParticipants.some(
        (participant) =>
          participant?.gameEndedInEarlySurrender ||
          participant?.teamEarlySurrendered
      )
  );

  // Items (todos los 7)
  const items = [
    match.item0,
    match.item1,
    match.item2,
    match.item3,
    match.item4,
    match.item5,
    match.item6, // Trinket
  ];

  // Obtener participante actual para runas
  const participants = (match.matches?.full_json?.info?.participants ??
    []) as RiotParticipant[];
  const currentParticipant =
    participants.find((p) => p.puuid === match.puuid) ?? null;

  // Runas
  const playerPrimaryRune = match.perk_primary_style;
  const playerSecondaryRune = match.perk_sub_style;
  const playerKeystonePerkId = getKeystonePerkId(currentParticipant?.perks);
  const { perkIconById, perkNameById } = usePerkAssets([playerKeystonePerkId]);

  // Calcular ranking del jugador
  const scoreEntries = computeParticipantScores(
    participants,
    match.matches.game_duration,
    match.matches.full_json?.info
  );

  const sortedByScore = [...scoreEntries].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );
  const rankingPositions = new Map<string, number>();
  sortedByScore.forEach((entry, index) => {
    rankingPositions.set(entry.key, index + 1);
  });

  // Usar ranking del servidor (persistido en BD) si existe, sino usar el calculado
  let playerRankingPosition =
    typeof (match as any).ranking_position === "number" &&
    (match as any).ranking_position > 0
      ? (match as any).ranking_position
      : null;

  // Fallback: usar ranking calculado si no está en BD
  if (playerRankingPosition === null) {
    const playerKey = currentParticipant
      ? getParticipantKeyUtil(currentParticipant)
      : null;
    playerRankingPosition = playerKey
      ? rankingPositions.get(playerKey) ?? null
      : null;
  }

  // Queue name
  const queueName = getQueueName(match.matches.queue_id);

  // Resultado
  const resultLabel = isFailed
    ? "Error"
    : isRemake
    ? "Remake"
    : isVictory
    ? "VICTORIA"
    : "DERROTA";

  // Colores según resultado
  const borderAccent = isRemake
    ? "border-l-slate-400"
    : isVictory
    ? "border-l-emerald-500"
    : "border-l-rose-500";

  const bgClass = isRemake
    ? "bg-slate-100 dark:bg-zinc-900"
    : isVictory
    ? "bg-emerald-50 dark:bg-zinc-900"
    : "bg-rose-50 dark:bg-zinc-900";

  const resultClass = isRemake
    ? "text-slate-400 dark:text-slate-500"
    : isVictory
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";

  // Render helpers
  const renderSpellIcon = (spellId?: number, size: string = "w-4 h-4") => {
    if (!spellId) return <div className={`${size} bg-slate-800 rounded`} />;
    const url = getSummonerSpellUrl(spellId, version);
    if (!url) return <div className={`${size} bg-slate-800 rounded`} />;
    return (
      <div className={`relative ${size} rounded overflow-hidden`}>
        <Image
          src={url}
          alt="Spell"
          fill
          sizes="16px"
          className="object-cover"
        />
      </div>
    );
  };

  const renderKeystoneIcon = () => {
    if (playerKeystonePerkId && perkIconById[playerKeystonePerkId]) {
      return (
        <div className="relative w-5 h-5 rounded-full overflow-hidden bg-slate-900">
          <Image
            src={perkIconById[playerKeystonePerkId]}
            alt={perkNameById[playerKeystonePerkId] ?? "Keystone"}
            fill
            sizes="20px"
            className="object-cover"
            unoptimized
          />
        </div>
      );
    }
    // Fallback al estilo primario
    if (playerPrimaryRune) {
      return (
        <div className="relative w-5 h-5 rounded-full overflow-hidden bg-slate-900">
          <Image
            src={getRuneIconUrl(playerPrimaryRune)}
            alt="Primary Rune"
            fill
            sizes="20px"
            className="object-cover p-0.5"
          />
        </div>
      );
    }
    return <div className="w-5 h-5 rounded-full bg-slate-800" />;
  };

  const renderSecondaryRune = () => {
    if (!playerSecondaryRune) {
      return <div className="w-4 h-4 rounded-full bg-slate-800" />;
    }
    return (
      <div className="relative w-4 h-4 rounded-full overflow-hidden bg-slate-900">
        <Image
          src={getRuneIconUrl(playerSecondaryRune)}
          alt="Secondary Rune"
          fill
          sizes="16px"
          className="object-cover p-0.5"
        />
      </div>
    );
  };

  return (
    <div
      onClick={() => onSelectMatch?.(match.match_id)}
      onTouchStart={() => onHoverMatch?.(match.match_id)}
      className={`
        md:hidden w-full rounded-lg border-l-4 ${borderAccent} 
        ${bgClass} 
        px-3 py-2 cursor-pointer transition-all relative
        hover:brightness-110 active:scale-[0.99]
      `}
    >
      <div className="flex items-center gap-2">
        {/* Grupo Izquierdo: Campeón, Spells, Runas */}
        <div className="flex gap-1 flex-shrink-0 mr-1">
          {/* Columna: Campeón + Spells */}
          <div className="flex flex-col items-center gap-0.5">
            {/* Campeón con nivel */}
            <div className="relative">
              <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-slate-700">
                <Image
                  src={getChampionImageUrl(match.champion_name, version)}
                  alt={match.champion_name}
                  fill
                  sizes="44px"
                  className="object-cover scale-110"
                  priority={priority}
                />
              </div>
              {/* Badge de nivel - ajustado para no estorbar a los spells */}
              <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-600 rounded-full w-4 h-4 flex items-center justify-center z-10">
                <span className="text-[8px] font-bold text-slate-200">
                  {currentParticipant?.champLevel ?? 18}
                </span>
              </div>
            </div>

            {/* Hechizos de invocador (horizontal debajo) */}
            <div className="flex gap-0.5 -mt-1 relative z-0">
              {renderSpellIcon(match.summoner1_id, "w-3.5 h-3.5")}
              {renderSpellIcon(match.summoner2_id, "w-3.5 h-3.5")}
            </div>
          </div>

          {/* Runas (vertical a la derecha del campeón) */}
          <div className="flex flex-col gap-0.5 mt-0.5 items-center">
            {renderKeystoneIcon()}
            {renderSecondaryRune()}
            {playerRankingPosition && playerRankingPosition > 0 && (
              <span
                className={`text-[8px] font-bold px-1 py-0.5 rounded-full shadow mt-0.5 ${getRankingBadgeClass(
                  playerRankingPosition
                )}`}
                title={`Ranking global #${playerRankingPosition}`}
              >
                #{playerRankingPosition}
              </span>
            )}
          </div>
        </div>

        {/* Info central + Items (Centrado) */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 ml-0 items-center justify-center">
          {/* Fila Superior: Info + KDA */}
          <div className="flex flex-col items-center gap-0.5">
            <span
              className={`text-[10px] uppercase font-black tracking-wider leading-none ${resultClass}`}
            >
              {resultLabel}
            </span>

            <div className="flex items-baseline gap-1.5 leading-none mt-0.5">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {match.kills}/{match.deaths}/{match.assists}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {(currentParticipant?.totalMinionsKilled ?? 0) +
                  (currentParticipant?.neutralMinionsKilled ?? 0)}
                cs
              </span>
            </div>
          </div>

          {/* Fila Inferior: Items (Compactos) */}
          <div className="flex items-center justify-center gap-0.5">
            {items.slice(0, 6).map((itemId, idx) => (
              <div
                key={idx}
                className="relative w-5 h-5 rounded-sm overflow-hidden bg-slate-800/80 border border-slate-700/30"
              >
                {itemId !== 0 && (
                  <Image
                    src={getItemImageUrl(itemId, version)}
                    alt={`Item ${itemId}`}
                    fill
                    sizes="20px"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>
            ))}

            {/* Divisor */}
            <div className="w-px h-3 bg-slate-400/30 mx-0.5" />

            {/* Trinket */}
            <div className="relative w-5 h-5 rounded-full overflow-hidden bg-slate-800/80 border border-slate-700/30">
              {items[6] !== 0 && (
                <Image
                  src={getItemImageUrl(items[6], version)}
                  alt="Trinket"
                  fill
                  sizes="20px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
          </div>
        </div>

        {/* Stats finales */}
        <div className="flex flex-col items-end gap-0 flex-shrink-0 ml-1">
          {/* Queue Absoluta */}
          <span className="absolute top-1.5 right-2 text-[9px] font-bold text-slate-500/80 uppercase tracking-tight">
            {queueName}
          </span>

          {/* Espaciador para no solapar con Queue */}
          <div className="mt-3 flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-medium">
              {formatDuration(match.matches.game_duration)}
            </span>
            <span className="text-[9px] text-amber-500 font-bold">
              {(match.gold_earned / 1000).toFixed(1)}k
            </span>
          </div>

          <div className="mt-0.5">
            <LPBadge
              gameId={(() => {
                const parts = match.match_id.split("_");
                const gameIdStr = parts.length > 1 ? parts[1] : parts[0];
                return gameIdStr;
              })()}
              userId={userId}
              isOwnProfile={isOwnProfile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
