"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PerfilHeader } from "@/components/perfil/PerfilHeader";
import StatusFeed from "@/components/social/StatusFeed";
import { ProfileTabs, type ProfileTab } from "@/components/perfil/ProfileTabs";
import { FriendsListCompact } from "@/components/social/FriendsListCompact";

import type { ProfileData } from "@/hooks/use-perfil-usuario";
import type { GameProfileModule } from "@/modules/types";

interface MobileUserProfileLayoutProps {
  profile: ProfileData;
  riotUserId?: string | null;
  isSyncing?: boolean;
  syncError?: string | null;
  isOwnProfile?: boolean;
  staticActiveMatch?: any;
  onSync?: () => void;
  // Sistema modular multi-game
  gameModules?: GameProfileModule[];
  getGameAccountData?: (slug: string) => unknown;
  onInvalidateCache?: () => Promise<unknown>;
}

export default function MobileUserProfileLayout({
  profile,
  riotUserId = null,
  isSyncing = false,
  syncError = null,
  isOwnProfile = false,
  staticActiveMatch = null,
  onSync,
  gameModules = [],
  getGameAccountData,
  onInvalidateCache,
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

  // Determinar módulo activo
  const isBaseTab = ["posts", "friends", "stats"].includes(currentTab);
  const activeGameModule = !isBaseTab
    ? gameModules.find((m) => m.slug === currentTab)
    : null;

  /** Props genéricas para el módulo activo - Estabilizadas */
  const activeModuleProps = useMemo(() => {
    if (!activeGameModule) return null;
    return {
      userId: riotUserId ?? profile.id,
      isOwnProfile,
      gameAccountData: getGameAccountData
        ? getGameAccountData(activeGameModule.slug)
        : null,
      onInvalidateCache: onInvalidateCache || (async () => { }),
      onSync,
      profileColor: profile.color,
      syncPending: isSyncing,
      syncCooldown: 0,
      isPublicProfile: !isOwnProfile,
      activeMatchSnapshot: staticActiveMatch,
    };
  }, [
    activeGameModule,
    riotUserId,
    profile.id,
    profile.color,
    isOwnProfile,
    getGameAccountData,
    onInvalidateCache,
    onSync,
    isSyncing,
    staticActiveMatch,
  ]);

  return (
    <div className="relative w-full min-h-screen bg-white dark:bg-black amoled:bg-black">
      <div className="w-full">
        {/* Header del perfil con banner */}
        <div className="bg-white dark:bg-black amoled:bg-black">
          <PerfilHeader profile={profile} />
        </div>

        {/* Sistema de Pestañas (sticky, modular) */}
        <div className="px-4 mt-2 sticky top-0 z-20 bg-white dark:bg-black amoled:bg-black py-2 shadow-sm">
          <ProfileTabs
            gameModules={gameModules}
            currentTab={currentTab}
            onTabChange={handleTabChange}
            isMobile={true}
          />
        </div>

        {/* Pestaña Actividad */}
        {currentTab === "posts" && (
          <>
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-black amoled:bg-black border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800 mt-2">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 amoled:text-gray-100">
                Actividad
              </h2>
            </div>
            <div className="px-4 py-6">
              <StatusFeed
                profileId={profile.id}
                profileUsername={profile.username}
                isOwnProfile={isOwnProfile}
              />
            </div>
          </>
        )}

        {/* Módulo de juego activo */}
        {activeGameModule && activeModuleProps && (
          <div className="px-4 py-4 pb-20 space-y-4">
            {/* Encabezado de cuenta del módulo (ej: tarjeta Riot) */}
            {activeGameModule.renderAccountHeader?.(activeModuleProps)}
            {/* Contenido principal del módulo */}
            {activeGameModule.renderProfileTab(activeModuleProps)}
          </div>
        )}

        {/* Amigos */}
        {currentTab === "friends" && (
          <div className="px-4 py-4 pb-20">
            <FriendsListCompact
              userId={profile.id}
              userColor={profile.color}
              limit={16}
              hideHeader={true}
            />
          </div>
        )}

        {/* Stats (próximamente) */}
        <div className={currentTab === "stats" ? "block" : "hidden"}>
          <div className="px-4 py-4 pb-20">
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
