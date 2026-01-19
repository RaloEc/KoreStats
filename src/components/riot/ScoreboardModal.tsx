"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScoreboardModalTable } from "@/components/riot/ScoreboardModalTable";
import {
  getQueueName,
  formatDuration,
  getRelativeTime,
} from "@/components/riot/match-card/helpers";
import { useMatchDetails } from "@/hooks/useMatchDetails";

interface ScoreboardModalProps {
  matchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mapa de PUUID a publicId para evitar fetch duplicado */
  linkedAccountsMap?: Record<string, string>;
  /** PUUID del usuario actual para evitar fetch de auth */
  currentUserPuuid?: string;
}

/**
 * Modal que muestra únicamente el scoreboard de una partida
 * OPTIMIZADO: Usa React Query para cachear datos y acepta props pre-cargadas
 */
export function ScoreboardModal({
  matchId,
  open,
  onOpenChange,
  linkedAccountsMap = {},
  currentUserPuuid,
}: ScoreboardModalProps) {
  const router = useRouter();

  // Usar React Query con caché automático - solo fetch cuando está abierto
  const {
    data: matchData,
    isLoading: loading,
    error,
  } = useMatchDetails(matchId, {
    enabled: open && Boolean(matchId),
  });

  const handleViewAnalysis = () => {
    onOpenChange(false);
    // Use window.location for faster immediate navigation on heavy pages
    window.location.href = `/match/${matchId}`;
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Memoizar datos derivados para evitar recálculos
  const { match, participants, headerInfo } = useMemo(() => {
    if (!matchData) {
      return { match: null, participants: [], headerInfo: null };
    }

    const m = matchData.match as any;
    const p = matchData.participants as any[];

    const gameVersion = m?.full_json?.info?.gameVersion || m?.game_version;

    const queueId =
      m?.queue_id ||
      m?.full_json?.queueId ||
      m?.matches?.queue_id ||
      m?.matches?.queueId ||
      m?.queueId;

    const durationSeconds =
      m?.game_duration ||
      m?.matches?.game_duration ||
      m?.full_json?.info?.gameDuration ||
      0;

    const createdAtRaw =
      m?.created_at || m?.full_json?.info?.gameCreation || null;
    const createdAtIso = createdAtRaw
      ? typeof createdAtRaw === "number"
        ? new Date(createdAtRaw).toISOString()
        : createdAtRaw
      : null;

    const headerQueueLabel = queueId ? getQueueName(queueId) : "";
    const headerTitle = headerQueueLabel || m?.game_mode || "Partida";
    const headerDuration = formatDuration(durationSeconds);
    const headerRelativeTime = createdAtIso
      ? getRelativeTime(createdAtIso)
      : undefined;
    const headerMatchId = m?.match_id || m?.matches?.match_id || matchId;

    return {
      match: m,
      participants: p,
      headerInfo: {
        gameVersion,
        durationSeconds,
        headerTitle,
        headerDuration,
        headerRelativeTime,
        headerMatchId,
      },
    };
  }, [matchData, matchId]);

  const errorMessage = error?.message || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[98vw] lg:w-[1100px] xl:max-w-[1500px] 2xl:max-w-[1680px] bg-white text-slate-900 border-slate-200 dark:bg-black dark:text-white dark:border-slate-800 max-h-[90vh] p-0 flex flex-col rounded-2xl overflow-hidden focus-visible:outline-none"
      >
        <div className="sr-only">
          <DialogTitle>Scoreboard de la partida</DialogTitle>
          <DialogDescription>
            Estadísticas detalladas de ambos equipos.
          </DialogDescription>
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 px-2 py-0 sm:px-6 overflow-hidden">
            {!loading && !errorMessage && match && headerInfo && (
              <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-slate-800 py-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                  {headerInfo.headerTitle}
                  <span className="text-slate-500 text-sm font-normal">
                    • {headerInfo.headerDuration}
                  </span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm flex flex-wrap items-center gap-2">
                  {headerInfo.headerRelativeTime}
                </p>
              </div>
            )}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            )}

            {errorMessage && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {errorMessage}
              </div>
            )}

            {!loading && !errorMessage && matchData && headerInfo && (
              <ScoreboardModalTable
                matchId={matchId}
                participants={participants}
                currentUserPuuid={currentUserPuuid}
                gameVersion={headerInfo.gameVersion}
                gameDuration={headerInfo.durationSeconds}
                matchInfo={match?.full_json?.info}
                linkedAccountsMap={linkedAccountsMap}
              />
            )}
          </div>

          {!loading && !errorMessage && matchData && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center justify-end border-slate-200 dark:border-slate-800 px-4 mb-2 sm:px-6 bg-white dark:bg-black w-full">
              <Button
                variant="outline"
                onClick={handleClose}
                className="h-8 px-3 text-xs border-slate-600 hover:bg-slate-800"
              >
                Cerrar
              </Button>
              <Button
                onClick={handleViewAnalysis}
                className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
              >
                Ver análisis
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
