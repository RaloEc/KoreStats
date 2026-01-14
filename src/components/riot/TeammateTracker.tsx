"use client";

import { useMemo } from "react";
import { Users, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Match } from "./match-card/MatchCard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RiotParticipant {
  puuid: string;
  teamId: number;
  riotIdGameName?: string;
  summonerName?: string;
}

export interface FrequentTeammate {
  puuid: string;
  name: string;
  gamesTogether: number;
}

export function getFrequentTeammates(
  matches: Match[],
  currentPuuid: string
): FrequentTeammate[] {
  if (!Array.isArray(matches) || !currentPuuid) {
    return [];
  }

  const teammateMap = new Map<string, FrequentTeammate>();
  const recentMatches = matches.slice(0, 50);

  for (const match of recentMatches) {
    const participants =
      ((match.matches?.full_json?.info?.participants ??
        []) as RiotParticipant[]) || [];

    const currentParticipant = participants.find(
      (participant) => participant.puuid === currentPuuid
    );

    if (!currentParticipant) {
      continue;
    }

    const teammates = participants.filter(
      (participant) =>
        participant.teamId === currentParticipant.teamId &&
        participant.puuid !== currentPuuid
    );

    for (const teammate of teammates) {
      const displayName =
        teammate.riotIdGameName ||
        teammate.summonerName ||
        "Jugador desconocido";

      const existing = teammateMap.get(teammate.puuid);

      if (existing) {
        existing.gamesTogether += 1;
      } else {
        teammateMap.set(teammate.puuid, {
          puuid: teammate.puuid,
          name: displayName,
          gamesTogether: 1,
        });
      }
    }
  }

  return Array.from(teammateMap.values()).sort(
    (a, b) => b.gamesTogether - a.gamesTogether
  );
}

interface TeammateTrackerProps {
  matches: Match[];
  currentMatch?: Match;
  currentPuuid: string;
  minGames?: number;
  className?: string;
  showInline?: boolean;
  linkedAccountsMap?: Record<string, string>;
}

export function TeammateTracker({
  matches,
  currentMatch,
  currentPuuid,
  minGames = 2,
  className = "",
  showInline = false,
  linkedAccountsMap = {},
}: TeammateTrackerProps) {
  const teammates = useMemo(() => {
    const allFrequentTeammates = getFrequentTeammates(
      matches,
      currentPuuid
    ).filter((teammate) => teammate.gamesTogether >= minGames);

    // Si hay currentMatch, filtrar solo los que están en esa partida
    if (currentMatch) {
      const currentMatchParticipants = (currentMatch.matches?.full_json?.info
        ?.participants ?? []) as RiotParticipant[];
      const currentPlayer = currentMatchParticipants.find(
        (p) => p.puuid === currentPuuid
      );

      if (currentPlayer) {
        // Solo compañeros del mismo equipo en esta partida
        const currentMatchTeammatePuuids = new Set(
          currentMatchParticipants
            .filter(
              (p) =>
                p.teamId === currentPlayer.teamId && p.puuid !== currentPuuid
            )
            .map((p) => p.puuid)
        );

        return allFrequentTeammates.filter((t) =>
          currentMatchTeammatePuuids.has(t.puuid)
        );
      }
    }

    return allFrequentTeammates;
  }, [matches, currentMatch, currentPuuid, minGames]);

  if (teammates.length === 0) {
    return null;
  }

  const renderTeammateName = (teammate: FrequentTeammate) => {
    const linkedProfileId = linkedAccountsMap[teammate.puuid];

    if (linkedProfileId) {
      return (
        <Link
          href={`/perfil/${linkedProfileId}?tab=lol`}
          className="cursor-pointer text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium inline-flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
          title="Ver perfil de la comunidad"
        >
          {teammate.name}
          <ExternalLink className="w-3 h-3 opacity-70" />
        </Link>
      );
    }
    return teammate.name;
  };

  // Modo inline: mostrar jugadores directamente sin tooltip (para móvil)
  if (showInline) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Users
          className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0"
          aria-hidden="true"
        />
        <div className="flex flex-wrap gap-1">
          {teammates.slice(0, 3).map((teammate, index) => (
            <span
              key={teammate.puuid}
              className="text-slate-600 dark:text-slate-300 flex items-center gap-1"
            >
              {renderTeammateName(teammate)}
              {index < Math.min(teammates.length, 3) - 1 && ","}
            </span>
          ))}
          {teammates.length > 3 && (
            <span className="text-slate-400 dark:text-slate-500">
              +{teammates.length - 3}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Modo tooltip: comportamiento original (para desktop)
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`flex items-center justify-center rounded-full p-1.5 text-slate-900 dark:text-slate-200 transition-colors hover:text-black dark:hover:text-white ${className}`}
            onClick={(e) => e.stopPropagation()} // Evitar click en la carta
          >
            <Users
              className={`h-4 w-4 ${
                teammates.some((t) => linkedAccountsMap[t.puuid])
                  ? "text-emerald-500 dark:text-emerald-400"
                  : ""
              }`}
              aria-hidden="true"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-white/95 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/60 text-slate-800 dark:text-slate-100 backdrop-blur-sm z-50 pointer-events-auto">
          <div className="flex flex-col gap-1 text-xs text-center">
            {teammates.map((teammate) => (
              <div key={teammate.puuid} className="flex justify-center">
                <span className="text-slate-700 dark:text-slate-200">
                  {renderTeammateName(teammate)}
                </span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
