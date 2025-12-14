"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

type StatusType = "online" | "in-game" | "offline";

interface UseMatchStatusDetectorOptions {
  onStatusChange?: (status: StatusType) => void;
  enabled?: boolean;
}

/**
 * Hook que detecta cuando el usuario está en una partida activa
 * y notifica cambios de estado automáticamente
 */
export function useMatchStatusDetector(
  options: UseMatchStatusDetectorOptions = {}
) {
  const { enabled = true, onStatusChange } = options;
  const { user, supabase } = useAuth();
  const pollIntervalRef = useRef<NodeJS.Timeout>();
  const lastStatusRef = useRef<StatusType>("offline");

  useEffect(() => {
    if (!enabled || !user?.id) return;

    // Función para verificar si hay una partida activa
    const checkActiveMatch = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) return;

        const response = await fetch("/api/riot/matches/active", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        // 401/403: auth inválida o sesión expirada. No cambiar estado.
        if (response.status === 401 || response.status === 403) {
          return;
        }

        // Errores del servidor / rate limit / etc: no cambiar estado.
        if (!response.ok) {
          console.warn("[useMatchStatusDetector] Active match check failed", {
            status: response.status,
          });
          return;
        }

        const data = await response.json();

        // Si hay una partida activa, estado es "in-game"
        if (data.hasActiveMatch && lastStatusRef.current !== "in-game") {
          lastStatusRef.current = "in-game";
          onStatusChange?.("in-game");
        } else if (!data.hasActiveMatch && lastStatusRef.current !== "online") {
          lastStatusRef.current = "online";
          onStatusChange?.("online");
        }
      } catch (error) {
        console.error(
          "[useMatchStatusDetector] Error checking active match:",
          error
        );
      }
    };

    // Verificar inmediatamente
    checkActiveMatch();

    // Verificar cada 10 segundos
    pollIntervalRef.current = setInterval(checkActiveMatch, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [enabled, user?.id, onStatusChange]);

  return {
    lastStatus: lastStatusRef.current,
  };
}
