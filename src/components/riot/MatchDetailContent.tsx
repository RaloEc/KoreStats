"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { MatchMapAnalysis } from "@/components/riot/MatchDeathMap";
import { MatchAnalysis } from "@/components/riot/analysis/MatchAnalysis";
import { ScoreboardTable } from "@/components/riot/ScoreboardTable";
import { MatchShareCard } from "@/components/riot/MatchShareCard";
import { createClient } from "@/lib/supabase/client";
import { toPng } from "html-to-image";
import { Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

interface MatchDetailContentProps {
  matchId: string;
}

// Helper to format duration
function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// Helper to format time ago
function formatTimeAgo(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `Hace ${days} días`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `Hace ${hours} horas`;
  return "Hace poco";
}

/**
 * Componente que renderiza el contenido detallado de una partida
 * Usado tanto en la página completa como en el modal interceptado
 */
export function MatchDetailContent({ matchId }: MatchDetailContentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [currentUserPuuid, setCurrentUserPuuid] = useState<
    string | undefined
  >();
  const shareRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (shareRef.current === null) {
      return;
    }

    try {
      const dataUrl = await toPng(shareRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `korestats-match-${matchId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al generar la imagen:", err);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadMatch = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/riot/matches/${matchId}`);
        if (!response.ok) {
          throw new Error("MATCH_NOT_FOUND");
        }

        const data = await response.json();
        if (!cancelled) {
          setMatchData(data);
        }
      } catch (err) {
        console.error("[MatchDetailContent] Error loading match:", err);
        if (!cancelled) {
          setError("Error al cargar la partida");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMatch();

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;

    const loadTimeline = async () => {
      try {
        setTimelineLoading(true);
        const response = await fetch(`/api/riot/matches/${matchId}/timeline`);
        if (!response.ok) {
          console.warn("[MatchDetailContent] Timeline no disponible");
          return;
        }
        const data = await response.json();
        if (!cancelled) {
          setTimeline(data?.timeline ?? data ?? null);
        }
      } catch (err) {
        console.error("[MatchDetailContent] Error loading timeline:", err);
      } finally {
        if (!cancelled) {
          setTimelineLoading(false);
        }
      }
    };

    loadTimeline();

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: riotAccount } = await supabase
            .from("linked_accounts_riot")
            .select("puuid")
            .eq("user_id", session.user.id)
            .single();

          if (!cancelled && riotAccount) {
            setCurrentUserPuuid(riotAccount.puuid);
          }
        }
      } catch (err) {
        console.error("[MatchDetailContent] Error obteniendo usuario:", err);
      }
    };

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-400">
        No se encontraron datos de la partida
      </div>
    );
  }

  const { match, participants } = matchData;
  const gameVersion = match.full_json?.info?.gameVersion || match.game_version;
  const mapParticipants = match.full_json?.info?.participants || [];

  const team1 = participants.filter((p: any) => p.win);
  const team2 = participants.filter((p: any) => !p.win);

  const focusParticipant = mapParticipants.find(
    (p: any) => p.puuid === currentUserPuuid
  );
  const focusTeamId =
    focusParticipant?.teamId || mapParticipants[0]?.teamId || 100;
  const highlightParticipantId = focusParticipant?.participantId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
            {match.game_mode}
            <span className="text-slate-500 text-base font-normal whitespace-nowrap">
              • {formatDuration(match.game_duration)}
            </span>
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            {formatTimeAgo(match.game_creation)} • ID: {matchId}
          </p>
        </div>

        <Button
          onClick={handleShare}
          variant="outline"
          size="sm"
          className="gap-2 ml-4 shrink-0 bg-slate-800 border-slate-700 hover:bg-slate-700"
        >
          <Share2 className="h-4 w-4" />
          <span>Compartir Stats</span>
        </Button>
      </div>

      {/* Hidden Share Card */}
      <div className="fixed left-[-9999px] top-0">
        <div ref={shareRef}>
          {focusParticipant ? (
            <MatchShareCard
              participant={focusParticipant}
              match={match}
              gameVersion={gameVersion}
            />
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scoreboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-900/50">
          <TabsTrigger value="scoreboard">Scoreboard</TabsTrigger>
          <TabsTrigger value="analysis">Análisis</TabsTrigger>
        </TabsList>

        {/* Scoreboard Tab */}
        <TabsContent value="scoreboard" className="mt-6">
          <ScoreboardTable
            participants={participants}
            currentUserPuuid={currentUserPuuid}
            gameVersion={gameVersion}
            gameDuration={match.game_duration}
          />
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="mt-6 space-y-4">
          {timelineLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando timeline...
            </div>
          )}
          <MatchAnalysis
            match={match}
            timeline={timeline}
            currentUserPuuid={currentUserPuuid}
          />
        </TabsContent>

        {/* Map Tab */}
      </Tabs>
    </div>
  );
}
