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
import { cn } from "@/lib/utils";

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
  focusParticipantId: number,
) => {
  const focusPlayer = participants.find(
    (p: any) => p.participantId === focusParticipantId,
  );

  if (!focusPlayer) return null;

  const isOpponent = (p: any) => p.teamId !== focusPlayer.teamId;

  // 1. Prioridad máxima: Coincidencia exacta de posición de equipo (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)
  const focusPos = normalizePosition(focusPlayer.teamPosition);
  if (focusPos) {
    const perfectMatch = participants.find(
      (p: any) =>
        isOpponent(p) && normalizePosition(p.teamPosition) === focusPos,
    );
    if (perfectMatch) return perfectMatch.participantId;
  }

  // 2. Segunda opción: Coincidencia por posición individual
  const focusIndivPos = normalizePosition(focusPlayer.individualPosition);
  if (focusIndivPos) {
    const match = participants.find(
      (p: any) =>
        isOpponent(p) &&
        normalizePosition(p.individualPosition) === focusIndivPos,
    );
    if (match) return match.participantId;
  }

  // 3. Fallback legacy: Tokens (Menos preciso, puede mezclar ADC/SUPP si comparten carril)
  const focusTokens = getPositionTokens(focusPlayer);
  for (const token of focusTokens) {
    const opponent = participants.find((p: any) => {
      if (!isOpponent(p)) return false;
      const opponentTokens = getPositionTokens(p);
      return opponentTokens.includes(token);
    });

    if (opponent) return opponent.participantId;
  }

  // 4. Último recurso: Espejo simple (1->6, 2->7, etc)
  const mirroredParticipantId =
    focusParticipantId <= 5 ? focusParticipantId + 5 : focusParticipantId - 5;
  const mirroredOpponent = participants.find(
    (p: any) => isOpponent(p) && p.participantId === mirroredParticipantId,
  );

  if (mirroredOpponent) return mirroredOpponent.participantId;

  return participants.find((p: any) => isOpponent(p))?.participantId ?? null;
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
  const [mapSelectionId, setMapSelectionId] = useState<string>("all");

  // Normalize match data
  const matchData = match.full_json || match;
  const gameVersion = matchData?.info?.gameVersion;

  // Set initial focus player based on logged-in user or performance
  useEffect(() => {
    if (matchData.info && matchData.info.participants) {
      const participants = matchData.info.participants;

      if (currentUserPuuid) {
        const participant = participants.find(
          (p: any) => p.puuid === currentUserPuuid,
        );
        if (participant) {
          setFocusParticipantId(participant.participantId);
          return;
        }
      }

      // If no user linked or found, select the MVP (Best KDA)
      const bestPlayer = [...participants].sort((a: any, b: any) => {
        const kdaA = (a.kills + a.assists) / Math.max(1, a.deaths);
        const kdaB = (b.kills + b.assists) / Math.max(1, b.deaths);
        return kdaB - kdaA;
      })[0];

      if (bestPlayer) {
        setFocusParticipantId(bestPlayer.participantId);
      }
    }
  }, [currentUserPuuid, matchData]);

  // Update opponent when focus player changes (default to lane opponent)
  useEffect(() => {
    if (!matchData.info || !matchData.info.participants) return;

    const defaultOpponentId = findDefaultOpponentId(
      matchData.info.participants,
      focusParticipantId,
    );

    if (defaultOpponentId) {
      setOpponentParticipantId(defaultOpponentId);
    } else {
      setOpponentParticipantId(null);
    }

    // Auto-sync map with focus player
    setMapSelectionId(focusParticipantId.toString());
  }, [focusParticipantId, matchData]);

  // Handle manual focus change from LaneDuel and sync opponent
  const handleFocusChange = (id: number) => {
    setFocusParticipantId(id);
    const opponentId = findDefaultOpponentId(matchData.info.participants, id);
    if (opponentId) {
      setOpponentParticipantId(opponentId);
    }
  };

  const handleOpponentChange = (id: number) => {
    setOpponentParticipantId(id);
    // When manually changing opponent, we also sync the map focus
  };

  if (!match || !timeline) return null;

  // Safety check for info
  if (!matchData.info || !matchData.info.participants) {
    console.error("MatchAnalysis: Invalid match data structure", match);
    return null;
  }

  const participants = matchData.info.participants;
  const focusPlayer = participants.find(
    (p: any) => p.participantId === focusParticipantId,
  );
  const focusTeamId = focusPlayer?.teamId || 100;

  return (
    <div className="space-y-8">
      {/* Lane Duel (Head-to-Head with Integrated Selector) */}
      <LaneDuel
        match={matchData}
        timeline={timeline}
        focusParticipantId={focusParticipantId}
        opponentParticipantId={opponentParticipantId || undefined}
        onFocusChange={handleFocusChange}
        onOpponentChange={handleOpponentChange}
      />

      {/* Build Timeline (Individual Analysis) */}
      <BuildTimeline
        timeline={timeline}
        participantId={focusParticipantId}
        gameVersion={gameVersion}
      />

      {/* Global Analysis Separator */}
      <div className="flex items-center gap-3 pt-8 pb-2">
        <h3 className="text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.3em] shrink-0">
          Panorama Global
        </h3>
        <div className="h-px bg-gradient-to-r from-slate-200 dark:from-white/20 to-transparent flex-1" />
      </div>

      {/* Graphs */}
      <MatchGraphs timeline={timeline} focusTeamId={focusTeamId} />

      <div className="flex flex-col gap-6">
        {/* Damage Chart */}
        <DamageChart participants={participants} gameVersion={gameVersion} />
      </div>

      {/* Map Analysis */}
      <Card className="bg-white/40 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-500" />
            Análisis Táctico del Mapa
            <span className="text-xs font-normal text-slate-500 ml-auto">
              {mapSelectionId === "all"
                ? "Resumen Global"
                : `Centrado en: ${participants.find((p: any) => p.participantId.toString() === mapSelectionId)?.championName || "Cargando..."}`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <MatchMapAnalysis
            timeline={timeline}
            participants={participants}
            focusTeamId={focusTeamId}
            highlightParticipantId={
              mapSelectionId === "all" ? undefined : parseInt(mapSelectionId)
            }
            onSelectParticipant={(id) => setMapSelectionId(id)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
