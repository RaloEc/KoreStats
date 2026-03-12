"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePerfilUsuario } from "@/hooks/use-perfil-usuario";
import { PerfilHeader } from "@/components/perfil/PerfilHeader";
import StatusFeed from "@/components/social/StatusFeed";
import { ProfileTabs, type ProfileTab } from "@/components/perfil/ProfileTabs";
import MobileUserProfileLayout from "@/components/perfil/MobileUserProfileLayout";
import { PerfilSkeleton } from "@/components/perfil/PerfilSkeleton";
import { PerfilError } from "@/components/perfil/PerfilError";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LinkedAccountRiot } from "@/types/riot";
import { FriendsListCompact } from "@/components/social/FriendsListCompact";
import { useMatchStatusDetector } from "@/hooks/use-match-status-detector";
import type { ActiveMatchSnapshot } from "@/hooks/use-match-status-detector";
import { ProfileData } from "@/hooks/use-perfil-usuario";

// Sistema modular multi-game
import { getVisibleProfileModules } from "@/modules/registry";
import type { GameProfileModule } from "@/modules/types";

interface UserProfileClientProps {
  initialProfile?: ProfileData | null;
  initialRiotAccount?: LinkedAccountRiot | null;
  initialMatchesData?: any;
  initialStats?: any;
}

export default function UserProfileClient({
  initialProfile,
  initialRiotAccount,
  initialMatchesData,
  initialStats,
}: UserProfileClientProps) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const publicId = params.username as string;
  const isMobile = useIsMobile(1024);
  const activeTabFromUrl = (searchParams.get("tab") as ProfileTab) || "posts";
  const [currentTab, setCurrentTab] = useState<ProfileTab>(activeTabFromUrl);
  const queryClient = useQueryClient();
  const { user, profile: currentUserProfile } = useAuth();

  useEffect(() => {
    setCurrentTab(activeTabFromUrl);
  }, [activeTabFromUrl]);

  const handleTabChange = (tab: ProfileTab) => {
    setCurrentTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`);
  };

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = usePerfilUsuario(publicId, initialProfile);

  const [riotAccount, setRiotAccount] = useState<LinkedAccountRiot | null>(
    initialRiotAccount || null,
  );
  const [loadingRiotAccount, setLoadingRiotAccount] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [riotUserId, setRiotUserId] = useState<string | null>(
    initialProfile?.id ?? null,
  );

  const [activeMatchSnapshot, setActiveMatchSnapshot] =
    useState<ActiveMatchSnapshot | null>(null);

  // Sincronizar estado local con props iniciales cuando estas cambian
  useEffect(() => {
    if (initialProfile?.id && initialProfile.id !== riotUserId) {
      setRiotUserId(initialProfile.id);
      if (initialRiotAccount !== undefined) {
        setRiotAccount(initialRiotAccount);
      }
      return;
    }

    if (initialRiotAccount) {
      setRiotAccount(initialRiotAccount);
    }
  }, [initialRiotAccount, initialProfile, riotUserId]);

  // Cargar cuenta de Riot vinculada del usuario público
  useEffect(() => {
    if (
      riotAccount &&
      riotUserId &&
      (!initialProfile || initialProfile.id === riotUserId)
    ) {
      return;
    }

    const loadRiotAccount = async () => {
      if (!publicId) return;
      if (riotAccount && riotUserId) return;

      setLoadingRiotAccount(true);
      try {
        const response = await fetch(
          `/api/riot/account/public?publicId=${publicId}&_t=${Date.now()}`,
        );
        if (response.ok) {
          const data = await response.json();
          setRiotAccount(data.account);
          setRiotUserId(data.profile?.id ?? null);
        } else {
          if (response.status === 404) {
            setRiotAccount(null);
            setRiotUserId(null);
          }
        }
      } catch {
        // No reseteamos a null en caso de error de red para evitar parpadeos
      } finally {
        setLoadingRiotAccount(false);
      }
    };

    loadRiotAccount();
  }, [publicId]);

  const isOwnProfile = Boolean(user && profile && user.id === profile.id);

  // Detector de partida activa para el dueño del perfil
  useMatchStatusDetector({
    enabled: isOwnProfile && !!riotAccount,
    onSnapshotChange: (snapshot) => {
      if (snapshot && snapshot.hasActiveMatch) {
        setActiveMatchSnapshot(snapshot);
      } else {
        setActiveMatchSnapshot(null);
      }
    },
  });

  // Mutación para sincronizar cuenta + partidas (LoL)
  const syncMutation = useMutation({
    mutationFn: async () => {
      const targetUserId = riotUserId || profile?.id;
      if (!targetUserId) throw new Error("No hay ID de usuario disponible");

      const response = await fetch("/api/riot/account/public/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al sincronizar");
      }

      return response.json();
    },
    onSuccess: async () => {
      setSyncError(null);

      const targetUserId = riotUserId ?? profile?.id;
      if (targetUserId) {
        await queryClient.resetQueries({ queryKey: ["match-history"], exact: false });
        await queryClient.resetQueries({ queryKey: ["match-history-cache"], exact: false });
        await queryClient.invalidateQueries({ queryKey: ["match-history"], exact: false });
        await queryClient.invalidateQueries({ queryKey: ["match-history-cache"], exact: false });
      }
      if (riotAccount?.puuid) {
        await queryClient.invalidateQueries({ queryKey: ["champion-mastery"], exact: false });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const newResponse = await fetch(`/api/riot/account/public?publicId=${publicId}`);
      if (newResponse.ok) {
        const newData = await newResponse.json();
        if (newData.account) {
          setRiotAccount(newData.account);
          setRiotUserId(newData.profile?.id ?? null);
        }
      }
    },
    onError: (error: any) => {
      setSyncError(error.message);
    },
  });

  // ============================================================================
  // SISTEMA MODULAR: Determinar tabs visibles de juegos (Optimizado)
  // ============================================================================
  const linkedGameSlugs = useMemo(() => {
    const slugs: string[] = [];
    if (riotAccount) slugs.push("league-of-legends");
    if (profile?.weaponStatsRecords && profile.weaponStatsRecords.length > 0) {
      slugs.push("delta-force");
    }
    return slugs;
  }, [riotAccount, profile?.weaponStatsRecords]);

  const visibleGameModules: GameProfileModule[] = useMemo(() => {
    if (!profile) return [];
    return getVisibleProfileModules({
      connectedAccounts: profile.connected_accounts,
      isOwnProfile,
      linkedGameSlugs,
    });
  }, [profile, isOwnProfile, linkedGameSlugs]);

  const handleInvalidateCache = useCallback(async () => {
    const targetUserId = riotUserId ?? profile?.id;
    if (targetUserId) {
      await queryClient.resetQueries({ queryKey: ["match-history"], exact: false });
      await queryClient.resetQueries({ queryKey: ["match-history-cache"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["match-history"], exact: false });
      await queryClient.invalidateQueries({ queryKey: ["match-history-cache"], exact: false });
    }
    if (riotAccount?.puuid) {
      await queryClient.invalidateQueries({ queryKey: ["champion-mastery"], exact: false });
    }
  }, [queryClient, riotUserId, profile?.id, riotAccount?.puuid]);

  /**
   * Obtiene los datos de cuenta de juego para un módulo dado.
   */
  const getGameAccountData = (moduleSlug: string): unknown => {
    switch (moduleSlug) {
      case "league-of-legends":
        return riotAccount;
      default:
        return null;
    }
  };

  if (isLoading) return <PerfilSkeleton />;
  if (error) return <PerfilError error={error} onRetry={() => refetch()} />;
  if (!profile) return <PerfilError error={new Error("Perfil no encontrado")} />;

  // ============================================================================
  // Determinar módulo activo (Optimizado)
  // ============================================================================
  const activeGameModule = useMemo(() => {
    const isBaseTab = ["posts", "friends", "stats"].includes(currentTab);
    return !isBaseTab ? visibleGameModules.find((m) => m.slug === currentTab) : null;
  }, [currentTab, visibleGameModules]);

  /** Props genéricas para el módulo activo - Estabilizadas */
  const activeModuleProps = useMemo(() => {
    if (!activeGameModule) return null;
    return {
      userId: riotUserId ?? profile.id,
      isOwnProfile,
      gameAccountData: getGameAccountData(activeGameModule.slug),
      onInvalidateCache: handleInvalidateCache,
      onSync: () => syncMutation.mutate(),
      profileColor: profile.color,
      syncPending: syncMutation.isPending,
      syncCooldown: 0,
      isPublicProfile: false,
      activeMatchSnapshot,
    };
  }, [
    activeGameModule,
    riotUserId,
    profile.id,
    profile.color,
    isOwnProfile,
    handleInvalidateCache,
    syncMutation.isPending,
    activeMatchSnapshot,
  ]);

  // Layout móvil
  if (isMobile) {
    return (
      <MobileUserProfileLayout
        profile={profile}
        riotUserId={riotUserId ?? profile.id}
        isSyncing={syncMutation.isPending}
        syncError={syncError}
        isOwnProfile={isOwnProfile}
        staticActiveMatch={activeMatchSnapshot}
        gameModules={visibleGameModules}
        getGameAccountData={getGameAccountData}
        onInvalidateCache={handleInvalidateCache}
        onSync={() => syncMutation.mutate()}
      />
    );
  }

  // Layout desktop
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto py-6 sm:py-8 px-3 sm:px-4 max-w-6xl">
        {/* Cabecera del Perfil */}
        <div className="mb-6 sm:mb-8">
          <PerfilHeader profile={profile} riotAccount={riotAccount} />
        </div>

        {/* Sistema de Pestañas (modular) */}
        <div className="mb-6 sm:mb-8">
          <ProfileTabs
            gameModules={visibleGameModules}
            currentTab={currentTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Contenido de Pestañas */}
        <div className="mt-8">
          {currentTab === "posts" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                <StatusFeed
                  profileId={profile.id}
                  profileUsername={profile.username}
                  isOwnProfile={isOwnProfile}
                />
              </div>
              <div className="lg:col-span-1 space-y-6">
                <FriendsListCompact
                  userId={profile.id}
                  userColor={profile.color}
                  limit={8}
                />
              </div>
            </div>
          )}

          {activeGameModule && activeModuleProps && (
            <div className="space-y-6">
              {/* Encabezado de cuenta del módulo (ej: tarjeta de account Riot) */}
              {activeGameModule.renderAccountHeader?.(activeModuleProps)}
              {/* Contenido principal del módulo */}
              {activeGameModule.renderProfileTab(activeModuleProps)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
