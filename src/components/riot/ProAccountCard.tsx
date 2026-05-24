"use client";

import { useQuery } from "@tanstack/react-query";
import { LinkedAccountRiot } from "@/types/riot";
import ProAccountCardVisual from "./ProAccountCardVisual";
import { RiotAccountCardSkeleton } from "./RiotAccountCardSkeleton";
import { useUnifiedRiotSync } from "@/hooks/use-unified-riot-sync";

interface ProAccountCardProps {
  onSync?: () => void;
  initialAccount: LinkedAccountRiot;
  profileColor?: string;
  externalSyncPending?: boolean;
  externalCooldownSeconds?: number;
  staticData?: any;
}

/**
 * Tarjeta especializada para perfiles profesionales
 * Utiliza un diseño más limpio y datos inmutables desde props
 */
export default function ProAccountCard({
  onSync: propOnSync,
  initialAccount,
  profileColor,
  externalSyncPending = false,
  externalCooldownSeconds = 0,
  staticData,
}: ProAccountCardProps) {
  // Hook para sincronización unificada
  const {
    sync: unifiedSync,
    isPending: unifiedSyncPending,
    cooldownSeconds: unifiedSyncCooldown,
  } = useUnifiedRiotSync();

  const isSyncing = externalSyncPending || unifiedSyncPending;
  const currentCooldown = Math.max(
    externalCooldownSeconds,
    unifiedSyncCooldown,
  );
  const handleSync = propOnSync || unifiedSync;

  // En perfiles PRO, no intentamos fetchear la cuenta del usuario logueado
  // Usamos los datos pasados por props (initialAccount) como fuente de verdad
  const { data: riotAccount, isLoading } = useQuery({
    queryKey: ["pro-riot-account", initialAccount.puuid],
    queryFn: async () => {
      // Intentamos cargar datos frescos del servidor solo para este PUUID
      // En el futuro podríamos tener un endpoint /api/riot/account/[puuid]
      // Por ahora, asumimos que initialAccount es suficiente
      return initialAccount;
    },
    initialData: initialAccount,
    staleTime: Infinity, // Datos estáticos para este componente
  });


  if (isLoading && !riotAccount) {
    return <RiotAccountCardSkeleton />;
  }

  if (!riotAccount) return null;

  return (
    <ProAccountCardVisual
      account={riotAccount}
      isSyncing={isSyncing}
      onSync={handleSync}
      cooldownSeconds={currentCooldown}
      hideSync={false}
      profileColor={profileColor}
      staticData={staticData}
    />
  );
}
