"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePerfilUsuario } from "@/hooks/use-perfil-usuario";
import { PerfilHeader } from "@/components/perfil/PerfilHeader";
import { EstadisticasUnificadas } from "@/components/perfil/EstadisticasUnificadas";
import StatusFeed from "@/components/social/StatusFeed";
// import { FeedActividad } from "@/components/perfil/FeedActividad"; // Deprecated
import { ProfileTabs, type ProfileTab } from "@/components/perfil/ProfileTabs";
import MobileUserProfileLayout from "@/components/perfil/MobileUserProfileLayout";
import { PerfilSkeleton } from "@/components/perfil/PerfilSkeleton";
import { PerfilError } from "@/components/perfil/PerfilError";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LinkedAccountRiot } from "@/types/riot";
import { RiotAccountCardVisual } from "@/components/riot/RiotAccountCardVisual";
import { ChampionStatsSummary } from "@/components/riot/ChampionStatsSummary";
import { MatchHistoryList } from "@/components/riot/MatchHistoryList";
import { FriendsListCompact } from "@/components/social/FriendsListCompact";

import { ProfileData } from "@/hooks/use-perfil-usuario";

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

  // Sincronizar estado local con props iniciales cuando estas cambian
  // OPTIMIZADO: No sobrescribir con null si ya tenemos datos y el usuario es el mismo
  useEffect(() => {
    // Si cambio el perfil base (navegación a otro usuario), resetear todo
    if (initialProfile?.id && initialProfile.id !== riotUserId) {
      setRiotUserId(initialProfile.id);
      if (initialRiotAccount !== undefined) {
        setRiotAccount(initialRiotAccount);
      }
      return;
    }

    // Si es el mismo usuario, solo actualizar si viene informacion valida
    // Esto evita que un re-render con initialRiotAccount=null (por SSR parcial) borre datos obtenidos via fetch client-side
    if (initialRiotAccount) {
      setRiotAccount(initialRiotAccount);
    }
  }, [initialRiotAccount, initialProfile, riotUserId]);

  // Cargar cuenta de Riot vinculada del usuario público
  useEffect(() => {
    // Si ya tenemos datos iniciales y conservamos el mismo riotUserId, no recargar
    if (
      riotAccount &&
      riotUserId &&
      (!initialProfile || initialProfile.id === riotUserId)
    ) {
      return;
    }

    const loadRiotAccount = async () => {
      if (!publicId) return;

      // Si ya tenemos una cuenta cargada para este perfil, no recargar
      if (riotAccount && riotUserId) {
        return;
      }

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
          // Solo resetear si realmente no existe (404)
          if (response.status === 404) {
            setRiotAccount(null);
            setRiotUserId(null);
          }
        }
      } catch (error) {
        // No reseteamos a null en caso de error de red para evitar parpadeos
      } finally {
        setLoadingRiotAccount(false);
      }
    };

    loadRiotAccount();
  }, [publicId]); // Solo re-ejecutar si cambia el usuario visitado

  // Mutación para sincronizar cuenta + partidas
  const syncMutation = useMutation({
    mutationFn: async () => {
      // Usar riotUserId que ya tiene el ID correcto del perfil visitado
      const targetUserId = riotUserId || profile?.id;

      if (!targetUserId) {
        throw new Error("No hay ID de usuario disponible");
      }

      const response = await fetch("/api/riot/account/public/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: targetUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al sincronizar");
      }

      return response.json();
    },
    onSuccess: async (data) => {
      setSyncError(null);

      // Invalidar queries para refrescar datos
      const targetUserId = riotUserId ?? profile?.id;
      if (targetUserId) {
        queryClient.invalidateQueries({
          queryKey: ["match-history", targetUserId],
        });
        queryClient.invalidateQueries({
          queryKey: ["match-history-cache", targetUserId],
        });
      }

      // Recargar cuenta Riot
      if (riotAccount?.puuid) {
        queryClient.invalidateQueries({
          queryKey: ["champion-mastery", riotAccount.puuid],
        });
      }

      // Pequeña pausa para asegurar que BD está actualizada
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Recargar datos de la cuenta
      const newResponse = await fetch(
        `/api/riot/account/public?publicId=${publicId}`,
      );
      if (newResponse.ok) {
        const newData = await newResponse.json();
        // IMPORTANTE: Solo actualizar si recibimos datos válidos.
        // Si el endpoint devuelve null/undefined (por error momentáneo), NO borrar la cuenta existente.
        if (newData.account) {
          setRiotAccount(newData.account);
          setRiotUserId(newData.profile?.id ?? null);
        } else {
        }
      } else {
      }
    },
    onError: (error: any) => {
      setSyncError(error.message);
    },
  });

  if (isLoading) {
    return <PerfilSkeleton />;
  }

  if (error) {
    return <PerfilError error={error} onRetry={() => refetch()} />;
  }

  if (!profile) {
    return <PerfilError error={new Error("Perfil no encontrado")} />;
  }

  const isOwnProfile = Boolean(user && profile && user.id === profile.id);

  // isAdmin debe ser true si el usuario LOGUEADO es admin, no el perfil visitado
  const isCurrentUserAdmin = Boolean(
    currentUserProfile && currentUserProfile.role === "admin",
  );

  // Layout móvil
  if (isMobile) {
    return (
      <MobileUserProfileLayout
        profile={profile}
        riotAccount={riotAccount}
        riotUserId={riotUserId ?? profile.id}
        onSync={() => syncMutation.mutate()}
        isSyncing={syncMutation.isPending}
        syncError={syncError}
        isOwnProfile={isOwnProfile}
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

        {/* Sistema de Pestañas */}
        <div className="mb-6 sm:mb-8">
          <ProfileTabs
            hasRiotAccount={!!riotAccount}
            currentTab={currentTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Contenido de Pestañas */}
        {currentTab === "posts" ? (
          // Pestaña Actividad
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Columna única - Feed de actividad (antes ocupaba 2 col, ahora 3) -> Vuelve a 2 col para mostrar sidebar */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              {/* Feed unificado de hilos, respuestas y partidas */}
              {/* Feed de estado social */}
              <StatusFeed
                profileId={profile.id}
                profileUsername={profile.username}
                isOwnProfile={isOwnProfile}
              />
            </div>

            {/* Columna derecha - Sidebar con componente de amigos */}
            <div className="lg:col-span-1 space-y-6">
              <FriendsListCompact
                userId={profile.id}
                userColor={profile.color}
                limit={8}
              />
            </div>
          </div>
        ) : (
          // Pestaña League of Legends
          <div className="space-y-6">
            {riotAccount ? (
              <>
                <RiotAccountCardVisual
                  account={riotAccount}
                  userId={riotUserId ?? profile.id}
                  isLoading={loadingRiotAccount || syncMutation.isPending}
                  isSyncing={syncMutation.isPending}
                  syncError={syncError}
                  onSync={() => syncMutation.mutate()}
                  profileColor={profile.color}
                />

                {/* Resumen de campeones */}
                {riotAccount.puuid && (
                  <ChampionStatsSummary puuid={riotAccount.puuid} limit={5} />
                )}

                {/* Historial de partidas */}
                {riotAccount.puuid && (
                  <MatchHistoryList
                    userId={riotUserId ?? profile.id}
                    puuid={riotAccount.puuid}
                    riotId={
                      riotAccount.game_name
                        ? `${riotAccount.game_name}#${riotAccount.tag_line}`
                        : undefined
                    }
                    hideShareButton={true}
                    initialMatchesData={initialMatchesData}
                    initialStats={initialStats}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  Este usuario no ha vinculado su cuenta de Riot Games.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
