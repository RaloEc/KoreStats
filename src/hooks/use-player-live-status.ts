"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Cliente Supabase para Realtime
const supabase = createClient();

// Después de 5 minutos sin actualizar = offline
const OFFLINE_THRESHOLD_MINUTES = 5;

// Traducción de fases al español
const PHASE_TRANSLATIONS: Record<string, string> = {
  None: "Menú Principal",
  Lobby: "En el Lobby",
  Matchmaking: "Buscando Partida",
  ReadyCheck: "¡Partida Encontrada!",
  ChampSelect: "Selección de Campeones",
  InProgress: "En Partida",
  EndOfGame: "Pantalla de Resultados",
};

export interface PlayerLiveStatus {
  /** true si el programa actualizó datos hace menos de 2 min */
  isOnline: boolean;
  /** Fase actual: "Lobby", "InProgress", "ChampSelect", etc. */
  phase: string | null;
  /** Fase traducida al español */
  phaseLabel: string | null;
  /** Última vez que el programa envió datos */
  lastSeen: Date | null;
  /** Tiempo en minutos desde la última actualización */
  minutesAgo: number | null;
  /** Todos los datos crudos (jugadores, ranked, etc.) */
  data: any | null;
  /** Si está cargando */
  isLoading: boolean;
}

/**
 * Hook para detectar si un jugador tiene el programa abierto (online)
 * o cerrado (offline) basado en las actualizaciones de la tabla live_game_states.
 *
 * @param puuid - El PUUID del jugador a monitorear
 * @returns PlayerLiveStatus con isOnline, phase, lastSeen, etc.
 */
export function usePlayerLiveStatus(
  puuid: string | null | undefined,
): PlayerLiveStatus {
  // DEBUG: Verificar si el hook se monta
  useEffect(() => {
    console.log("[usePlayerLiveStatus] Hook mounted with PUUID:", puuid);
  }, [puuid]);

  const [status, setStatus] = useState<PlayerLiveStatus>({
    isOnline: false,
    phase: null,
    phaseLabel: null,
    lastSeen: null,
    minutesAgo: null,
    data: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!puuid) {
      setStatus((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const liveId = `live-${puuid}`;

    // Función para calcular si está online
    const calculateStatus = (record: any): PlayerLiveStatus => {
      if (!record) {
        return {
          isOnline: false,
          phase: null,
          phaseLabel: null,
          lastSeen: null,
          minutesAgo: null,
          data: null,
          isLoading: false,
        };
      }

      // Asegurar parsing correcto de fecha UTC
      const dateStr = record.updated_at;
      const updatedAt = new Date(dateStr);
      const now = Date.now();
      const diffMs = now - updatedAt.getTime();
      const diffMinutes = diffMs / 60000;

      const phase = record.data?.phase || null;
      const isOnline = diffMinutes < OFFLINE_THRESHOLD_MINUTES;

      // DEBUG LOGS - Para diagnosticar el problema de tiempo
      console.log(`[Status Debug] Online: ${isOnline}`, {
        serverTime: dateStr,
        parsedTime: updatedAt.toLocaleString(),
        localTime: new Date(now).toLocaleString(),
        diffMinutes: diffMinutes.toFixed(2),
        threshold: OFFLINE_THRESHOLD_MINUTES,
      });

      // DEBUG: Ver por qué falla el cálculo
      if (
        diffMinutes > OFFLINE_THRESHOLD_MINUTES ||
        diffMinutes < -OFFLINE_THRESHOLD_MINUTES
      ) {
        console.warn("[Status Debug] Offline Reason:", {
          serverTime: dateStr,
          localTime: new Date(now).toISOString(),
          diffMinutes,
          threshold: OFFLINE_THRESHOLD_MINUTES,
        });
      }

      return {
        isOnline: diffMinutes < OFFLINE_THRESHOLD_MINUTES && diffMinutes > -60, // Aceptar hasta 1 hora en futuro por si acaso error de zona horaria loca
        phase,
        phaseLabel: phase ? PHASE_TRANSLATIONS[phase] || phase : null,
        lastSeen: updatedAt,
        minutesAgo: Math.round(diffMinutes),
        data: record.data,
        isLoading: false,
      };
    };

    // Función para obtener datos frescos
    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("live_game_states")
          .select("*")
          .eq("id", liveId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching live status:", error);
          return;
        }

        // console.log("Live status fetch:", data); // Debug
        setStatus(calculateStatus(data));
      } catch (err) {
        console.error("Error in fetchStatus:", err);
      }
    };

    // 1. Fetch inicial
    fetchStatus();

    // 2. Polling cada 10 segundos (Respaldo robusto si falla Realtime)
    const pollingInterval = setInterval(fetchStatus, 10000);

    // 3. Suscripción en tiempo real (Para actualizaciones instantáneas)
    const channel = supabase
      .channel(`player-status-${puuid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_game_states",
          filter: `id=eq.${liveId}`,
        },
        (payload) => {
          console.log("Realtime update received:", payload.new);
          setStatus(calculateStatus(payload.new));
        },
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    // 4. Intervalo local para actualizar el contador de "hace X minutos"
    // Solo actualiza la UI localmente, no llama a la BD
    const localCheckInterval = setInterval(() => {
      setStatus((prev) => {
        if (!prev.lastSeen) return prev;
        const diffMinutes = (Date.now() - prev.lastSeen.getTime()) / 60000;
        // Solo cambiar estado si cruza el umbral
        const isNowOnline = diffMinutes < OFFLINE_THRESHOLD_MINUTES;

        if (
          prev.isOnline !== isNowOnline ||
          prev.minutesAgo !== Math.round(diffMinutes)
        ) {
          return {
            ...prev,
            isOnline: isNowOnline,
            minutesAgo: Math.round(diffMinutes),
          };
        }
        return prev;
      });
    }, 5000); // Chequear cada 5s localmente

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
      clearInterval(localCheckInterval);
    };
  }, [puuid]);

  return status;
}

/**
 * Traducir una fase al español
 */
export function translatePhase(phase: string | null): string {
  if (!phase) return "Desconocido";
  return PHASE_TRANSLATIONS[phase] || phase;
}
