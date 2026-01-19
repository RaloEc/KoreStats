"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

type StatusType = "online" | "in-game" | "offline";

type SpectatorPerks = {
  perkIds: number[];
  perkStyle: number | null;
  perkSubStyle: number | null;
};

type ActiveParticipant = {
  teamId: 100 | 200;
  position: string | null;
  summonerName: string;
  championId: number;
  championName: string | null;
  spell1Id: number;
  spell2Id: number;
  perks: SpectatorPerks | null;
};

export type ActiveMatchSnapshot =
  | {
      hasActiveMatch: false;
      reason?: string;
    }
  | {
      hasActiveMatch: true;
      reason?: string;
      gameId?: number | null;
      gameStartTime?: number | null;
      gameLength?: number | null;
      queueId?: number | null;
      platformId?: string | null;
      elapsedSeconds?: number | null;
      teams?: {
        team100: ActiveParticipant[];
        team200: ActiveParticipant[];
      };
    };

interface UseMatchStatusDetectorOptions {
  onStatusChange?: (status: StatusType) => void;
  onSnapshotChange?: (snapshot: ActiveMatchSnapshot | null) => void;
  enabled?: boolean;
}

/**
 * Hook que detecta cuando el usuario está en una partida activa
 * y notifica cambios de estado automáticamente
 */
export function useMatchStatusDetector(
  options: UseMatchStatusDetectorOptions = {},
) {
  const { enabled = true, onStatusChange, onSnapshotChange } = options;
  const { user, session } = useAuth();
  const pollIntervalRef = useRef<NodeJS.Timeout>();
  const lastStatusRef = useRef<StatusType>("offline");
  const lastSnapshotRef = useRef<ActiveMatchSnapshot | null>(null);
  const lastErrorLogAtRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !user?.id) {
      return;
    }

    // AbortController para cancelar peticiones pendientes al desmontar/actualizar
    const abortController = new AbortController();

    // Función para verificar si hay una partida activa
    const checkActiveMatch = async () => {
      if (abortController.signal.aborted) return;

      try {
        // Usar la sesión del contexto en lugar de llamar getSession()
        if (!session?.access_token || abortController.signal.aborted) return;

        const debugParam =
          process.env.NODE_ENV !== "production" ? "?debug=1" : "";

        const response = await fetch(`/api/riot/matches/active${debugParam}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          signal: abortController.signal,
        });

        // 401/403: auth inválida o sesión expirada. No cambiar estado.
        if (response.status === 401 || response.status === 403) {
          return;
        }

        // Errores del servidor / rate limit / etc: no cambiar estado.
        if (!response.ok) {
          const now = Date.now();
          if (now - lastErrorLogAtRef.current > 30_000) {
            lastErrorLogAtRef.current = now;
            console.warn("[useMatchStatusDetector] Active match check failed", {
              status: response.status,
            });
          }
          return;
        }

        const data = await response.json();

        if (abortController.signal.aborted) return;

        // Si Riot falla (rate limit / error temporal) o no se pudo resolver summoner_id,
        // NO cambies estado ni snapshot.
        if (
          !data?.hasActiveMatch &&
          (data?.reason === "Riot API error" ||
            data?.reason === "Missing summoner_id")
        ) {
          const now = Date.now();
          if (now - lastErrorLogAtRef.current > 30_000) {
            lastErrorLogAtRef.current = now;
            console.warn(
              "[useMatchStatusDetector] Riot API error - skipping status update",
              {
                reason: data?.reason,
                riotStatus: data?.riotStatus,
              },
            );
          }
          return;
        }

        lastSnapshotRef.current = data as ActiveMatchSnapshot;
        onSnapshotChange?.(lastSnapshotRef.current);

        // Si hay una partida activa, estado es "in-game"
        if (data.hasActiveMatch && lastStatusRef.current !== "in-game") {
          // Encolar snapshot PRE-GAME
          if (data.hasActiveMatch && data.gameId) {
            fetch("/api/riot/lp/snapshot", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                type: "pre_game",
                gameId: data.gameId,
                priority: 1, // Alta prioridad
              }),
            }).catch((err) => {
              console.error(
                "[useMatchStatusDetector] Error queueing pre-game snapshot:",
                err,
              );
            });
          }

          // Notificar al servidor que estamos en partida
          fetch("/api/riot/matches/status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              isInGame: true,
              gameId: data.gameId || null,
            }),
          }).catch((err) =>
            console.error(
              "[useMatchStatusDetector] Error updating server status:",
              err,
            ),
          );

          lastStatusRef.current = "in-game";
          onStatusChange?.("in-game");
        } else if (
          !data.hasActiveMatch &&
          lastStatusRef.current === "in-game"
        ) {
          // Encolar snapshot POST-GAME y sincronización con delay
          // Riot tarda ~20-30 segundos en actualizar LP y hacer disponible la partida
          const lastGameId =
            lastSnapshotRef.current && "gameId" in lastSnapshotRef.current
              ? lastSnapshotRef.current.gameId
              : null;

          if (lastGameId) {
            setTimeout(() => {
              fetch("/api/riot/lp/snapshot", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  type: "post_game",
                  gameId: lastGameId,
                  priority: 2, // Máxima prioridad
                }),
              }).catch((err) => {
                console.error(
                  "[useMatchStatusDetector] Error queueing post-game snapshot:",
                  err,
                );
              });

              fetch("/api/riot/matches/sync", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
              }).catch((err) => {
                console.error(
                  "[useMatchStatusDetector] Error auto-syncing matches:",
                  err,
                );
              });
            }, 30000); // 30 segundos de delay
          }

          // Notificar al servidor que la partida terminó
          fetch("/api/riot/matches/status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              isInGame: false,
              gameId: null,
            }),
          }).catch((err) =>
            console.error(
              "[useMatchStatusDetector] Error updating server status:",
              err,
            ),
          );

          lastStatusRef.current = "online";
          onStatusChange?.("online");
        } else if (
          !data.hasActiveMatch &&
          lastStatusRef.current !== "online" &&
          lastStatusRef.current !== "in-game"
        ) {
          lastStatusRef.current = "online";
          onStatusChange?.("online");
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          // Ignorar errores por cancelación
          return;
        }
        console.error(
          "[useMatchStatusDetector] Error checking active match:",
          error,
        );
      }
    };

    // Verificar inmediatamente
    void checkActiveMatch();

    // Verificar cada 10 segundos
    pollIntervalRef.current = setInterval(checkActiveMatch, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      abortController.abort();
    };
  }, [enabled, user?.id, onStatusChange, onSnapshotChange, session]);

  return {
    lastStatus: lastStatusRef.current,
    lastSnapshot: lastSnapshotRef.current,
  };
}
