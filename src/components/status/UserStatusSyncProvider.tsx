"use client";

import { useEffect, useCallback } from "react";
import { useUserStatusSync } from "@/hooks/use-user-status-sync";
import { useMatchStatusDetector } from "@/hooks/use-match-status-detector";
import { useAuth } from "@/context/AuthContext";

type StatusType = "online" | "in-game" | "offline";

interface UserStatusSyncProviderProps {
  children: React.ReactNode;
  autoDetectMatch?: boolean;
}

/**
 * Componente que sincroniza automáticamente el estado del usuario
 * - Establece "online" al montar
 * - Detecta partidas activas y cambia a "in-game"
 * - Establece "offline" al desmontar
 */
export function UserStatusSyncProvider({
  children,
  autoDetectMatch = true,
}: UserStatusSyncProviderProps) {
  const { user } = useAuth();

  useEffect(() => {
    console.log("[UserStatusSyncProvider] Component mounted/updated", {
      autoDetectMatch,
      userId: user?.id,
    });
  }, [autoDetectMatch, user?.id]);

  const { updateStatus } = useUserStatusSync({
    enabled: true,
    autoSetOnlineOnMount: true,
    autoSetOfflineOnUnmount: true,
  });

  // Callback estable para evitar re-renders innecesarios
  const handleStatusChange = useCallback(
    (status: StatusType) => {
      console.log("[UserStatusSyncProvider] Status change detected:", status);
      updateStatus(status);
    },
    [updateStatus]
  );

  // Detectar cambios de partida activa
  useMatchStatusDetector({
    enabled: autoDetectMatch && !!user?.id,
    onStatusChange: handleStatusChange,
  });

  return <>{children}</>;
}
