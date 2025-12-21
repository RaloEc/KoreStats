"use client";

import { useState, useEffect } from "react";
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
import { createClient } from "@/lib/supabase/client";

interface ScoreboardModalProps {
  matchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LinkedAccountEntry {
  puuid: string;
  publicId: string | null;
}

interface LinkedAccountsResponse {
  accounts: LinkedAccountEntry[];
}

/**
 * Modal que muestra únicamente el scoreboard de una partida
 * Con botones para ver análisis completo o cerrar
 */
export function ScoreboardModal({
  matchId,
  open,
  onOpenChange,
}: ScoreboardModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [currentUserPuuid, setCurrentUserPuuid] = useState<
    string | undefined
  >();
  const [linkedAccountsMap, setLinkedAccountsMap] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!open) return;

    const loadMatchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener datos de la partida desde la API
        const response = await fetch(`/api/riot/matches/${matchId}`);
        if (!response.ok) {
          setError("Partida no encontrada");
          return;
        }

        const data = await response.json();
        setMatchData(data);

        // Obtener PUUID del usuario actual
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

          if (riotAccount) {
            setCurrentUserPuuid(riotAccount.puuid);
          }
        }
      } catch (err) {
        console.error("[ScoreboardModal] Error loading match:", err);
        setError("Error al cargar los detalles de la partida");
      } finally {
        setLoading(false);
      }
    };

    loadMatchData();
  }, [matchId, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;

    const fetchLinkedAccounts = async () => {
      try {
        const response = await fetch("/api/riot/linked-accounts");
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as LinkedAccountsResponse;
        if (!isMounted) {
          return;
        }

        const map = data.accounts.reduce<Record<string, string>>(
          (acc, account) => {
            if (account.publicId) {
              acc[account.puuid] = account.publicId;
            }
            return acc;
          },
          {}
        );

        setLinkedAccountsMap(map);
      } catch (linkedAccountsError) {
        console.error(
          "[ScoreboardModal] Error fetching linked accounts:",
          linkedAccountsError
        );
      }
    };

    fetchLinkedAccounts();

    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleViewAnalysis = () => {
    onOpenChange(false);
    // Use window.location for faster immediate navigation on heavy pages
    window.location.href = `/match/${matchId}`;
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Removed conditional null return to allow immediate rendering of the dialog
  // This ensures the modal opens immediately with a spinner instead of waiting for data fetch
  // if (!matchData && !loading && !error) {
  //   return null;
  // }

  const { match, participants } = matchData || {};
  const gameVersion =
    match?.full_json?.info?.gameVersion || match?.game_version;

  const queueId =
    match?.queue_id ||
    match?.full_json?.queueId ||
    match?.matches?.queue_id ||
    match?.matches?.queueId ||
    match?.queueId ||
    match?.matches?.queue_id;

  const durationSeconds =
    match?.game_duration ||
    match?.matches?.game_duration ||
    match?.full_json?.info?.gameDuration ||
    0;

  const createdAtRaw =
    match?.created_at || match?.full_json?.info?.gameCreation || null;
  const createdAtIso = createdAtRaw
    ? typeof createdAtRaw === "number"
      ? new Date(createdAtRaw).toISOString()
      : createdAtRaw
    : null;

  const headerQueueLabel = queueId ? getQueueName(queueId) : "";
  const headerTitle = match?.game_mode || headerQueueLabel || "Partida";
  const headerDuration = formatDuration(durationSeconds);
  const headerRelativeTime = createdAtIso
    ? getRelativeTime(createdAtIso)
    : undefined;
  const headerMatchId = match?.match_id || match?.matches?.match_id || matchId;

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
            {!loading && !error && match && (
              <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-slate-800 py-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                  {headerTitle}
                  <span className="text-slate-500 text-sm font-normal">
                    • {headerDuration}
                  </span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm flex flex-wrap items-center gap-2">
                  {headerRelativeTime}
                  <span className="text-slate-700 dark:text-slate-600">|</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    ID: {headerMatchId}
                  </span>
                </p>
              </div>
            )}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {!loading && !error && matchData && (
              <ScoreboardModalTable
                matchId={matchId}
                participants={participants}
                currentUserPuuid={currentUserPuuid}
                gameVersion={gameVersion}
                gameDuration={durationSeconds}
                matchInfo={match?.full_json?.info}
                linkedAccountsMap={linkedAccountsMap}
              />
            )}
          </div>

          {!loading && !error && matchData && (
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
