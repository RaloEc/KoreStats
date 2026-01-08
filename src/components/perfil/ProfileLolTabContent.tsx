"use client";

import dynamic from "next/dynamic";
import { RiotAccountCard } from "@/components/riot/RiotAccountCard";
import { RiotEmptyState } from "@/components/riot/RiotEmptyState";
import { ChampionStatsSummary } from "@/components/riot/ChampionStatsSummary";
import { SavedBuildsPanel } from "@/components/riot/SavedBuildsPanel";
import { useToast } from "@/hooks/use-toast";

// Dynamic import para MatchHistoryList
const MatchHistoryList = dynamic(
  () =>
    import("@/components/riot/MatchHistoryList").then(
      (mod) => mod.MatchHistoryList
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
          />
        ))}
      </div>
    ),
  }
);

interface RiotAccountData {
  id: string;
  user_id: string;
  game_name: string;
  tag_line: string;
  puuid: string;
  summoner_id?: string;
  profile_icon_id?: number;
  summoner_level?: number;
  tier?: string;
  rank?: string;
  lp?: number;
  wins?: number;
  losses?: number;
  region?: string;
  last_match_sync?: string;
  last_rank_sync?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProfileLolTabContentProps {
  riotAccount: RiotAccountData | null;
  userId: string;
  isOwnProfile: boolean;
  unifiedSyncPending: boolean;
  unifiedSyncCooldown: number;
  onInvalidateCache: () => Promise<unknown>;
}

export function ProfileLolTabContent({
  riotAccount,
  userId,
  isOwnProfile,
  unifiedSyncPending,
  unifiedSyncCooldown,
  onInvalidateCache,
}: ProfileLolTabContentProps) {
  const { toast } = useToast();

  const handleUnlink = async () => {
    const confirmed = window.confirm(
      "¿Estás seguro de que deseas desvincular tu cuenta de Riot Games? Se eliminarán todos los datos asociados."
    );
    if (!confirmed) return;

    try {
      const response = await fetch("/api/riot/account/unlink", {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al desvincular la cuenta");
      }

      toast({
        title: "Cuenta desvinculada",
        description:
          "Tu cuenta de Riot Games ha sido desvinculada exitosamente",
      });

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
        <RiotAccountCard
          useVisualDesign={true}
          externalSyncPending={unifiedSyncPending}
          externalCooldownSeconds={unifiedSyncCooldown}
          onUnlink={handleUnlink}
        />

        {/* Resumen de campeones */}
        {riotAccount.puuid && (
          <ChampionStatsSummary puuid={riotAccount.puuid} limit={5} />
        )}

        {/* Builds guardadas */}
        <SavedBuildsPanel />

        {/* Historial de partidas */}
        <MatchHistoryList
          userId={userId}
          externalSyncPending={unifiedSyncPending}
          externalCooldownSeconds={unifiedSyncCooldown}
        />
      </>
    );
  }

  // CTA para vincular Riot cuando es su propio perfil
  if (isOwnProfile) {
    return (
      <RiotEmptyState
        isOwnProfile
        onLinkClick={() => {
          window.location.href = "/api/riot/login";
        }}
        onManualLinkSuccess={async () => {
          await onInvalidateCache();
        }}
      />
    );
  }

  return null;
}
