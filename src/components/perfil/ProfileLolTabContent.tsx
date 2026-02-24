"use client";

import dynamic from "next/dynamic";
import { RiotEmptyState } from "@/components/riot/RiotEmptyState";
import { SavedBuildsPanel } from "@/components/riot/SavedBuildsPanel";
import { useToast } from "@/hooks/use-toast";
import ProAccountCard from "@/components/riot/ProAccountCard";
import { RiotAccountCard } from "@/components/riot/RiotAccountCard";
import { LinkedAccountRiot } from "@/types/riot";

// Dynamic import para evitar problemas de inicialización/circularidad
const MatchHistoryList = dynamic(
  () =>
    import("@/components/riot/MatchHistoryList").then(
      (mod) => mod.MatchHistoryList,
    ),
  {
    loading: () => (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
    ssr: false,
  },
);

interface ProfileLolTabContentProps {
  riotAccount: LinkedAccountRiot;
  userId: string;
  isOwnProfile?: boolean;
  unifiedSyncPending?: boolean;
  unifiedSyncCooldown?: number;
  onInvalidateCache: () => Promise<unknown>;
  profileColor?: string;
  showChampionStats?: boolean;
  isPublicProfile?: boolean;
}

export default function ProfileLolTabContent({
  riotAccount,
  userId,
  isOwnProfile = false,
  unifiedSyncPending = false,
  unifiedSyncCooldown = 0,
  onInvalidateCache,
  profileColor,
  showChampionStats = false,
  isPublicProfile = false,
}: ProfileLolTabContentProps) {
  const { toast } = useToast();

  const handleUnlink = async () => {
    try {
      const response = await fetch("/api/riot/unlink", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Error al desvincular la cuenta");
      }

      toast({
        title: "Cuenta desvinculada",
        description:
          "Tu cuenta de Riot Games ha sido desvinculada correctamente.",
      });

      // Recargar datos
      await onInvalidateCache();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo desvincular la cuenta",
        variant: "destructive",
      });
    }
  };

  if (riotAccount) {
    return (
      <>
        {/* Tarjeta de cuenta de Riot */}
        {isPublicProfile ? (
          <ProAccountCard
            initialAccount={riotAccount}
            onSync={onInvalidateCache}
            externalSyncPending={unifiedSyncPending}
            externalCooldownSeconds={unifiedSyncCooldown}
            profileColor={profileColor}
          />
        ) : (
          <RiotAccountCard
            useVisualDesign={true}
            externalSyncPending={unifiedSyncPending}
            externalCooldownSeconds={unifiedSyncCooldown}
            onUnlink={isOwnProfile ? handleUnlink : undefined}
            initialAccount={riotAccount}
            profileColor={profileColor}
            isPublicProfile={isPublicProfile}
          />
        )}

        {/* builds guardadas */}
        {!isPublicProfile && <SavedBuildsPanel />}

        {/* Historial de partidas */}
        <MatchHistoryList
          userId={userId}
          puuid={riotAccount.puuid}
          riotId={
            riotAccount.game_name
              ? `${riotAccount.game_name}#${riotAccount.tag_line}`
              : undefined
          }
          externalSyncPending={unifiedSyncPending}
          externalCooldownSeconds={unifiedSyncCooldown}
        />
      </>
    );
  }

  // CTA para vincular Riot cuando es su propio perfil
  if (isOwnProfile) {
    return <RiotEmptyState isOwnProfile={true} />;
  }

  return (
    <div className="bg-muted/30 rounded-lg p-8 text-center border-2 border-dashed">
      <p className="text-muted-foreground">
        Este usuario no ha vinculado su cuenta de Riot Games.
      </p>
    </div>
  );
}
