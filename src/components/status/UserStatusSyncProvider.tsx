"use client";

import { useEffect } from "react";
import { useUserStatusSync } from "@/hooks/use-user-status-sync";
import { useMatchStatusDetector } from "@/hooks/use-match-status-detector";

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
  const { updateStatus } = useUserStatusSync({
    enabled: true,
    autoSetOnlineOnMount: true,
    autoSetOfflineOnUnmount: true,
  });

  // Detectar cambios de partida activa
  useMatchStatusDetector({
    enabled: autoDetectMatch,
    onStatusChange: (status: StatusType) => {
      updateStatus(status);
    },
  });

  return <>{children}</>;
}
