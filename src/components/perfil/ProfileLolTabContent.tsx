"use client";

import dynamic from "next/dynamic";
import { RiotEmptyState } from "@/components/riot/RiotEmptyState";
import { SavedBuildsPanel } from "@/components/riot/SavedBuildsPanel";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import ProAccountCard from "@/components/riot/ProAccountCard";
import { RiotAccountCard } from "@/components/riot/RiotAccountCard";
import { LinkedAccountRiot } from "@/types/riot";
import { AllstarClipsGallery } from "@/components/riot/AllstarClipsGallery";

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

const AllstarClipsVerticalFeed = dynamic(
  () =>
    import("@/components/riot/AllstarClipsVerticalFeed").then(
      (mod) => mod.AllstarClipsVerticalFeed,
    ),
  {
    loading: () => (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-pulse rounded-xl bg-muted w-full h-full"></div>
      </div>
    ),
    ssr: false,
  },
);

interface ProfileLolTabContentProps {
  riotAccount: LinkedAccountRiot | null;
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

  // Fetch active match status from Riot API as fallback for public/private view
  const { data: apiActiveMatch } = useQuery({
    queryKey: ["active-match-fallback", riotAccount?.puuid],
    queryFn: async () => {
      if (!riotAccount?.puuid) return null;
      const region = riotAccount.active_shard || riotAccount.region || "la1";
      const res = await fetch(
        `/api/riot/matches/active?puuid=${riotAccount.puuid}&region=${region}`,
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!riotAccount?.puuid,
    refetchInterval: 60000, // Reintentar cada minuto
  });

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
            staticData={apiActiveMatch}
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
            staticData={apiActiveMatch}
          />
        )}

        {/* builds guardadas */}
        {!isPublicProfile && <SavedBuildsPanel />}

        <div className={isPublicProfile ? "grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 items-start" : "mt-6"}>
          {/* Main Column */}
          <div className={isPublicProfile ? "lg:col-span-2 space-y-6 min-w-0 w-full" : "space-y-6"}>
            {/* Highlights de Allstar - Only for regular users */}
            {!isPublicProfile && (
              <AllstarClipsGallery
                userId={userId}
                puuid={riotAccount.puuid}
                isOwnProfile={isOwnProfile}
                className="mb-6"
              />
            )}

            {/* If Pro, show Videos in the main area (previously in sidebar) */}
            {isPublicProfile ? (
              <AllstarClipsVerticalFeed puuid={riotAccount.puuid} />
            ) : (
              /* If Not Pro, show History here */
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
                staticActiveMatch={apiActiveMatch}
              />
            )}
          </div>

          {/* Sidebar Column (Only for Pros) */}
          {isPublicProfile && (
            <div className="lg:col-span-1 space-y-6 min-w-0 w-full">
              <MatchHistoryList
                userId={userId}
                puuid={riotAccount.puuid}
                isPublicProfile={isPublicProfile}
                riotId={
                  riotAccount.game_name
                    ? `${riotAccount.game_name}#${riotAccount.tag_line}`
                    : undefined
                }
                externalSyncPending={unifiedSyncPending}
                externalCooldownSeconds={unifiedSyncCooldown}
              />
            </div>
          )}
        </div>
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
