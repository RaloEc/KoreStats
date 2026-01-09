"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PerfilHeader } from "@/components/perfil/PerfilHeader";
// import { FeedActividad } from "@/components/perfil/FeedActividad";
import StatusFeed from "@/components/social/StatusFeed";

import { ProfileTabs, type ProfileTab } from "@/components/perfil/ProfileTabs";
import { RiotAccountCardVisual } from "@/components/riot/RiotAccountCardVisual";
import { ChampionStatsSummary } from "@/components/riot/ChampionStatsSummary";
import { MatchHistoryList } from "@/components/riot/MatchHistoryList";
import { FriendsListCompact } from "@/components/social/FriendsListCompact";

import type { ProfileData } from "@/hooks/use-perfil-usuario";
import type { LinkedAccountRiot } from "@/types/riot";

interface MobileUserProfileLayoutProps {
  profile: ProfileData;
  riotAccount?: LinkedAccountRiot | null;
  riotUserId?: string | null;
  onSync?: () => void;
  isSyncing?: boolean;
  syncError?: string | null;
  isOwnProfile?: boolean;
}

export default function MobileUserProfileLayout({
  profile,
  riotAccount = null,
  riotUserId = null,
  onSync,
  isSyncing = false,
  syncError = null,
  isOwnProfile = false,
}: MobileUserProfileLayoutProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTabFromUrl = (searchParams.get("tab") as ProfileTab) || "posts";
  const [currentTab, setCurrentTab] = useState<ProfileTab>(activeTabFromUrl);

  useEffect(() => {
    setCurrentTab(activeTabFromUrl);
  }, [activeTabFromUrl]);

  const handleTabChange = (tab: ProfileTab) => {
    setCurrentTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="relative w-full min-h-screen bg-white dark:bg-black amoled:bg-black">
      {/* Contenido principal */}
      <div className="w-full">
        {/* Header del perfil con banner */}
        <div className="bg-white dark:bg-black amoled:bg-black">
          <PerfilHeader profile={profile} />
        </div>
        {/* Sistema de Pestañas */}
        <div className="px-4 mt-2 sticky top-0 z-20 bg-white dark:bg-black amoled:bg-black py-2 shadow-sm">
          <ProfileTabs
            hasRiotAccount={!!riotAccount}
            currentTab={currentTab}
            onTabChange={handleTabChange}
            isMobile={true}
          />
        </div>
        {/* Contenido según pestaña */}
        <div className={currentTab === "posts" ? "block" : "hidden"}>
          {/* Título de actividad */}
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-black amoled:bg-black border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800 mt-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 amoled:text-gray-100">
              Actividad
            </h2>
          </div>

          {/* Feed de actividad con scroll infinito */}
          <div className="px-4 py-6">
            <StatusFeed
              profileId={profile.id}
              profileUsername={profile.username}
              isOwnProfile={isOwnProfile}
            />
          </div>
        </div>
        <div className={currentTab === "lol" ? "block" : "hidden"}>
          <div className="px-4 py-4 pb-20 space-y-6">
            {riotAccount ? (
              <>
                <RiotAccountCardVisual
                  account={riotAccount}
                  userId={riotUserId ?? profile.id}
                  isSyncing={isSyncing}
                  syncError={syncError}
                  onSync={onSync}
                />

                <div className="grid grid-cols-1 gap-6">
                  {/* Estadísticas de campeones */}
                  {riotAccount.puuid && (
                    <ChampionStatsSummary puuid={riotAccount.puuid} />
                  )}

                  {/* Historial de partidas */}
                  {riotAccount.puuid && (
                    <MatchHistoryList
                      userId={riotUserId ?? profile.id}
                      puuid={riotAccount.puuid}
                      hideShareButton={!isOwnProfile}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400">
                  Este usuario no ha vinculado su cuenta de Riot Games.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className={currentTab === "friends" ? "block" : "hidden"}>
          <div className="px-4 py-4 pb-20">
            <FriendsListCompact
              userId={profile.id}
              userColor={profile.color}
              limit={16}
              hideHeader={true}
            />
          </div>
        </div>
        <div className={currentTab === "stats" ? "block" : "hidden"}>
          <div className="px-4 py-4 pb-20">
            {/* Aquí podríamos poner EstadisticasUnificadas pero requiere ciertos estilos */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-8 text-center border border-dashed border-gray-200 dark:border-gray-800">
              <p className="text-gray-500">
                Próximamente: Estadísticas detalladas en móvil
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
