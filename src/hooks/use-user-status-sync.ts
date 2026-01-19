"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

type StatusType = "online" | "in-game" | "offline";

interface UseUserStatusSyncOptions {
  enabled?: boolean;
  autoSetOnlineOnMount?: boolean;
  autoSetOfflineOnUnmount?: boolean;
}

export function useUserStatusSync(options: UseUserStatusSyncOptions = {}) {
  const {
    enabled = true,
    autoSetOnlineOnMount = true,
    autoSetOfflineOnUnmount = true,
  } = options;

  const { user, session } = useAuth();
  const statusTimeoutRef = useRef<NodeJS.Timeout>();
  const lastStatusRef = useRef<StatusType>("offline");

  // Función para actualizar el estado - usa la sesión del contexto
  const updateStatus = useCallback(
    async (status: StatusType) => {
      if (!user?.id || !enabled) return;

      try {
        // Usar la sesión del contexto en lugar de llamar getSession()
        if (!session?.access_token) {
          // No loguear warning, es normal si no hay sesión activa
          return;
        }

        const response = await fetch("/api/user/status", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          console.error(
            "[useUserStatusSync] Failed to update status:",
            response.statusText,
          );
          return;
        }

        lastStatusRef.current = status;
      } catch (error) {
        console.error("[useUserStatusSync] Error updating status:", error);
      }
    },
    [user?.id, enabled, session],
  );

  // Al montar el componente, establecer estado como "online"
  useEffect(() => {
    if (!enabled || !user?.id) return;

    if (autoSetOnlineOnMount) {
      updateStatus("online");
    }

    // Limpiar timeout anterior si existe
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }

    // Al desmontar, establecer estado como "offline"
    return () => {
      if (autoSetOfflineOnUnmount && lastStatusRef.current !== "offline") {
        // Usar setTimeout para permitir que la actualización se envíe antes de desmontar
        statusTimeoutRef.current = setTimeout(() => {
          updateStatus("offline");
        }, 100);
      }
    };
  }, [
    enabled,
    user?.id,
    autoSetOnlineOnMount,
    autoSetOfflineOnUnmount,
    updateStatus,
  ]);

  return {
    updateStatus,
    currentStatus: lastStatusRef.current,
  };
}
