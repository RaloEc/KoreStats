"use client";

import React, { useState, useEffect } from "react";
import { LaneDuel } from "./LaneDuel";
import { MatchGraphs } from "./MatchGraphs";
import { BuildTimeline } from "./BuildTimeline";
import { DamageChart } from "./DamageChart";
import { MatchMapAnalysis } from "@/components/riot/MatchDeathMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { getChampionImg } from "@/lib/riot/helpers";
import { ArrowRightLeft, Eye } from "lucide-react";

interface MatchAnalysisProps {
  match: any;
  timeline: any;
  currentUserPuuid?: string;
}

const normalizePosition = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (!normalized || normalized === "NONE" || normalized === "INVALID") {
    return null;
  }
  return normalized;
};

const getPositionTokens = (participant: any): string[] => {
  return [
    normalizePosition(participant.teamPosition),
    normalizePosition(participant.individualPosition),
    normalizePosition(participant.role),
    normalizePosition(participant.lane),
  ].filter(Boolean) as string[];
};

const findDefaultOpponentId = (
  participants: any[],
  focusParticipantId: number
) => {
  const focusPlayer = participants.find(
    (p: any) => p.participantId === focusParticipantId
  );

  if (!focusPlayer) return null;

  const isOpponent = (p: any) => p.teamId !== focusPlayer.teamId;
  const focusTokens = getPositionTokens(focusPlayer);

  for (const token of focusTokens) {
    const opponent = participants.find((p: any) => {
      if (!isOpponent(p)) return false;
      const opponentTokens = getPositionTokens(p);
      return opponentTokens.includes(token);
    });

    if (opponent) {
      return opponent.participantId;
    }
  }

  const mirroredParticipantId =
    focusParticipantId <= 5 ? focusParticipantId + 5 : focusParticipantId - 5;

  const mirroredOpponent = participants.find(
    (p: any) => isOpponent(p) && p.participantId === mirroredParticipantId
  );

  if (mirroredOpponent) {
    return mirroredOpponent.participantId;
  }

  const fallbackOpponent = participants.find((p: any) => isOpponent(p));

  return fallbackOpponent?.participantId ?? null;
};

export function MatchAnalysis({
  match,
  timeline,
  currentUserPuuid,
}: MatchAnalysisProps) {
  const [focusParticipantId, setFocusParticipantId] = useState<number>(1);
  const [opponentParticipantId, setOpponentParticipantId] = useState<
    number | null
  >(null);

  // Normalize match data
  const matchData = match.full_json || match;
  const gameVersion = matchData?.info?.gameVersion;

  // Set initial focus player based on logged-in user
  useEffect(() => {
    if (currentUserPuuid && matchData.info && matchData.info.participants) {
      const participant = matchData.info.participants.find(
        (p: any) => p.puuid === currentUserPuuid
      );
      if (participant) {
        setFocusParticipantId(participant.participantId);
      }
    }
  }, [currentUserPuuid, matchData]);

  // Update opponent when focus player changes (default to lane opponent)
  useEffect(() => {
    if (!matchData.info || !matchData.info.participants) return;

    const defaultOpponentId = findDefaultOpponentId(
      matchData.info.participants,
      focusParticipantId
    );

    if (defaultOpponentId) {
      setOpponentParticipantId(defaultOpponentId);
    } else {
      setOpponentParticipantId(null);
    }
  }, [focusParticipantId, matchData]);

  if (!match || !timeline) return null;

  // Safety check for info
  if (!matchData.info || !matchData.info.participants) {
    console.error("MatchAnalysis: Invalid match data structure", match);
    return null;
  }

  const participants = matchData.info.participants;
  const focusPlayer = participants.find(
    (p: any) => p.participantId === focusParticipantId
  );
  const focusTeamId = focusPlayer?.teamId || 100;

  return (
    <div className="space-y-8">
      {/* Player Selectors */}
      <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Analizar a:
          </span>
          <Select
            value={focusParticipantId.toString()}
            onValueChange={(val) => setFocusParticipantId(parseInt(val))}
          >
            <SelectTrigger className="w-[240px] bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              <SelectValue placeholder="Seleccionar Jugador" />
            </SelectTrigger>
            <SelectContent>
              {participants.map((p: any) => (
                <SelectItem
                  key={p.participantId}
                  value={p.participantId.toString()}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                      <Image
                        src={getChampionImg(p.championName, gameVersion)}
                        alt={p.championName}
                        fill
                        sizes="24px"
                        className="object-cover"
                      />
                    </div>
                    <span className="font-medium">{p.championName}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ArrowRightLeft className="w-4 h-4 text-slate-400 dark:text-slate-600 hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            vs
          </span>
          <Select
            value={opponentParticipantId?.toString() || ""}
            onValueChange={(val) => setOpponentParticipantId(parseInt(val))}
          >
            <SelectTrigger className="w-[240px] bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              <SelectValue placeholder="Seleccionar Oponente" />
            </SelectTrigger>
            <SelectContent>
              {participants.map((p: any) => (
                <SelectItem
                  key={p.participantId}
                  value={p.participantId.toString()}
                  disabled={p.participantId === focusParticipantId}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                      <Image
                        src={getChampionImg(p.championName, gameVersion)}
                        alt={p.championName}
                        fill
                        sizes="24px"
                        className="object-cover"
                      />
                    </div>
                    <span className="font-medium">{p.championName}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lane Duel (Head-to-Head) */}
      <LaneDuel
        match={matchData}
        timeline={timeline}
        focusParticipantId={focusParticipantId}
        opponentParticipantId={opponentParticipantId || undefined}
      />

      {/* Graphs */}
      <MatchGraphs timeline={timeline} focusTeamId={focusTeamId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Build Timeline */}
        <BuildTimeline
          timeline={timeline}
          participantId={focusParticipantId}
          gameVersion={gameVersion}
        />

        {/* Damage Chart */}
        <DamageChart
          participants={participants}
          teamId={focusPlayer?.teamId || 100}
        />
      </div>

      {/* Map Analysis */}
      <Card className="bg-white/40 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-500" />
            Análisis Táctico del Mapa
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <MatchMapAnalysis
            timeline={timeline}
            participants={participants}
            focusTeamId={focusTeamId}
            highlightParticipantId={focusParticipantId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
