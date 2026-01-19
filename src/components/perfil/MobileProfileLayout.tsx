"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, X, Users } from "lucide-react";
import { Button, Card, CardBody } from "@nextui-org/react";
// import UserActivityFeedContainer from "./UserActivityFeedContainer";
import StatusFeed from "@/components/social/StatusFeed";
import ProfileHeader from "./profile-header";
import { FriendRequestsList } from "@/components/social/FriendRequestsList";
import { FriendsListCompact } from "@/components/social/FriendsListCompact";
import ProfileStats from "./profile-stats";
import MembershipInfo from "./membership-info";
import { LogOut } from "lucide-react";
import { ProfileTabs, type ProfileTab } from "./ProfileTabs";
import { RiotEmptyState } from "@/components/riot/RiotEmptyState";
import { RiotAccountCardVisual } from "@/components/riot/RiotAccountCardVisual";
import { MatchHistoryList } from "@/components/riot/MatchHistoryList";
import { RiotTierBadge } from "@/components/riot/RiotTierBadge";
import { ChampionStatsSummary } from "@/components/riot/ChampionStatsSummary";
import { UnifiedRiotSyncButton } from "@/components/riot/UnifiedRiotSyncButton";
import { useUnifiedRiotSync } from "@/hooks/use-unified-riot-sync";
import { SavedBuildsPanel } from "@/components/riot/SavedBuildsPanel";

interface MobileProfileLayoutProps {
  fetchActivities: (page: number, limit: number) => Promise<any[]>;
  estadisticas: {
    noticias: number;
    comentarios: number;
    hilos: number;
    respuestas: number;
  };
  perfil: {
    id: string;
    username: string;
    color: string;
    role: "user" | "admin" | "moderator";
    avatar_url: string;
    banner_url?: string | null;
    created_at?: string;
    ultimo_acceso?: string;
    activo?: boolean;
    followers_count?: number;
    following_count?: number;
    friends_count?: number;
    connected_accounts?: Record<string, string>;
  };
  userId?: string;
  onSignOut: () => void;
  isSigningOut: boolean;
  onEditClick?: () => void;
  riotAccount?: any;
  onInvalidateCache?: () => Promise<any> | void;
}

export default function MobileProfileLayout({
  fetchActivities,
  estadisticas,
  perfil,
  userId,
  onSignOut,
  isSigningOut,
  onEditClick,
  riotAccount,
  onInvalidateCache,
}: MobileProfileLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const isOwnProfile = userId === perfil.id;

  // Hook para sincronización unificada de Riot
  const {
    sync: unifiedSync,
    isPending: unifiedSyncPending,
    cooldownSeconds: unifiedSyncCooldown,
  } = useUnifiedRiotSync();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-white dark:bg-black amoled:bg-black">
      {/* Contenido principal */}
      <div className="w-full h-full overflow-y-auto">
        {/* Header del perfil con banner */}
        <div className="bg-white dark:bg-black amoled:bg-black">
          <ProfileHeader
            perfil={{
              id: perfil.id,
              username: perfil.username,
              role: perfil.role,
              avatar_url: perfil.avatar_url,
              color: perfil.color,
              banner_url: perfil.banner_url || undefined,
              followers_count: perfil.followers_count ?? 0,
              following_count: perfil.following_count ?? 0,
              friends_count: perfil.friends_count ?? 0,
              connected_accounts: perfil.connected_accounts || {},
            }}
            onEditClick={onEditClick}
            riotTier={riotAccount?.tier}
            riotRank={riotAccount?.rank}
            riotAccount={riotAccount}
          />
        </div>

        {/* Sistema de Pestañas */}
        <div className="px-4 mt-2 sticky top-0 z-20 bg-white dark:bg-black amoled:bg-black py-2 shadow-sm">
          <ProfileTabs
            hasRiotAccount={!!riotAccount}
            isOwnProfile={isOwnProfile}
            currentTab={currentTab}
            onTabChange={handleTabChange}
            isMobile={true}
          />
        </div>

        {/* Contenido según pestaña */}
        <div className={currentTab === "posts" ? "block" : "hidden"}>
          {/* Título de sección */}
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-black amoled:bg-black border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800 mt-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 amoled:text-gray-100">
              Actividad Reciente
            </h2>
          </div>

          {/* Feed de actividad */}
          <div className="px-4 py-4 pb-24">
            <StatusFeed
              profileId={perfil.id}
              profileUsername={perfil.username}
              isOwnProfile={isOwnProfile || userId === perfil.id}
            />
          </div>
        </div>

        {/* Pestaña League of Legends */}
        <div className={currentTab === "lol" ? "block" : "hidden"}>
          <div className="px-4 py-4 pb-24 space-y-6">
            {!riotAccount && isOwnProfile ? (
              <RiotEmptyState
                isOwnProfile
                onLinkClick={() => {
                  window.location.href = "/api/riot/login";
                }}
                onManualLinkSuccess={async () => {
                  await onInvalidateCache?.();
                }}
              />
            ) : riotAccount ? (
              <>
                <RiotAccountCardVisual
                  account={riotAccount}
                  hideSync={false}
                  onSync={unifiedSync}
                  isSyncing={unifiedSyncPending}
                  cooldownSeconds={unifiedSyncCooldown}
                  profileColor={perfil.color}
                />

                <div className="grid grid-cols-1 gap-6">
                  <ChampionStatsSummary puuid={riotAccount.puuid} />
                  <SavedBuildsPanel />
                  <div>
                    <MatchHistoryList
                      userId={perfil.id}
                      puuid={riotAccount.puuid}
                      externalSyncPending={unifiedSyncPending}
                      externalCooldownSeconds={unifiedSyncCooldown}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">
                  Este usuario no ha vinculado su cuenta de Riot Games.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pestaña Amigos */}
        <div className={currentTab === "friends" ? "block" : "hidden"}>
          <div className="px-4 py-4 pb-24 space-y-6">
            {/* Solicitudes de amistad */}
            <FriendRequestsList userColor={perfil.color} hideHeader={true} />

            {/* Lista de amigos */}
            <FriendsListCompact
              userId={userId}
              userColor={perfil.color}
              limit={16}
              hideHeader={true}
            />
          </div>
        </div>

        {/* Pestaña Estadísticas */}
        <div className={currentTab === "stats" ? "block" : "hidden"}>
          <div className="px-4 py-4 pb-24">
            <ProfileStats estadisticas={estadisticas} />
          </div>
        </div>
      </div>
    </div>
  );
}
