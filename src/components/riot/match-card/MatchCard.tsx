"use client";

import { MatchCardServer } from "./MatchCardServer";

export interface Match {
  id: string;
  match_id: string;
  summoner_name: string;
  champion_id: number;
  champion_name: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  total_damage_dealt: number;
  gold_earned: number;
  vision_score: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  summoner1_id?: number;
  summoner2_id?: number;
  perk_primary_style?: number;
  perk_sub_style?: number;
  lane: string;
  role: string;
  created_at: string;
  puuid: string;
  objectives_stolen?: number;
  lp_change?: number; // Added for LP tracking
  matches: {
    match_id: string;
    game_creation: number;
    game_duration: number;
    game_mode: string;
    queue_id: number;
    full_json?: any;
    ingest_status?: string;
    match_participants?: any[];
  };
}

export interface MatchCardProps {
  match: Match;
  version: string;
  linkedAccountsMap?: Record<string, string>;
  recentMatches?: Match[];
  hideShareButton?: boolean;
  userId?: string;
  isOwnProfile?: boolean;
  priority?: boolean;
  onSelectMatch?: (matchId: string) => void;
  /** Callback para prefetch al hover */
  onHoverMatch?: (matchId: string) => void;
}

interface RiotParticipant {
  gameEndedInEarlySurrender?: boolean;
  teamEarlySurrendered?: boolean;
}

export function MatchCard({
  match,
  version,
  linkedAccountsMap = {},
  recentMatches = [],
  hideShareButton = false,
  userId,
  isOwnProfile = false,
  priority = false,
  onSelectMatch,
  onHoverMatch,
}: MatchCardProps) {
  // Validar que match.matches existe
  if (!match.matches) {
    return null;
  }

  // Estado de ingesta: si está en 'processing', mostrar indicador
  const isProcessing = (match.matches as any)?.ingest_status === "processing";
  const isFailed = (match.matches as any)?.ingest_status === "failed";

  const isVictory = match.win;
  const REMAKE_DURATION_THRESHOLD = 300; // 5 minutos
  const participantsJson = (match.matches?.full_json?.info?.participants ??
    []) as RiotParticipant[];
  const isRemake = Boolean(
    (match.matches?.game_duration ?? 0) < REMAKE_DURATION_THRESHOLD ||
    participantsJson.some(
      (participant) =>
        participant?.gameEndedInEarlySurrender ||
        participant?.teamEarlySurrendered,
    ),
  );

  const cardStateClasses = isRemake
    ? "border-l-slate-500 bg-slate-500/5 hover:bg-slate-500/10"
    : isVictory
      ? "border-l-green-500 bg-green-500/5 hover:bg-green-500/10"
      : "border-l-red-500 bg-red-500/5 hover:bg-red-500/10";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectMatch?.(match.match_id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelectMatch?.(match.match_id);
        }
      }}
      onMouseEnter={() => onHoverMatch?.(match.match_id)}
      className={`
          hidden md:grid grid-cols-[60px,auto,180px,90px,200px] items-center gap-3 p-3 rounded-lg border-l-4 transition-all hover:shadow-lg hover:border-l-8 cursor-pointer
          ${isProcessing ? "opacity-70" : ""} ${
            isFailed ? "opacity-50" : ""
          } ${cardStateClasses}
        `}
    >
      <MatchCardServer
        match={match}
        version={version}
        linkedAccountsMap={linkedAccountsMap}
        recentMatches={recentMatches}
        hideShareButton={hideShareButton}
        userId={userId}
        isOwnProfile={isOwnProfile}
        priority={priority}
      />
    </div>
  );
}
