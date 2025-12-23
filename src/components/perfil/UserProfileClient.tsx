"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePerfilUsuario } from "@/hooks/use-perfil-usuario";
import { PerfilHeader } from "@/components/perfil/PerfilHeader";
import { EstadisticasUnificadas } from "@/components/perfil/EstadisticasUnificadas";
import { FeedActividad } from "@/components/perfil/FeedActividad";
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

import { ProfileData } from "@/hooks/use-perfil-usuario";

interface UserProfileClientProps {
  initialProfile?: ProfileData | null;
  initialRiotAccount?: LinkedAccountRiot | null;
}

export default function UserProfileClient({
  initialProfile,
  initialRiotAccount,
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
    initialRiotAccount || null
  );
  const [loadingRiotAccount, setLoadingRiotAccount] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [riotUserId, setRiotUserId] = useState<string | null>(
    initialProfile?.id ?? null
  );

  // Cargar cuenta de Riot vinculada del usuario público
  useEffect(() => {
    // Si ya tenemos datos iniciales y coinciden con el ID actual, no recargar inmediatamente
    // Pero si cambia el publicId, sí.
    // Como simplificación: Si tenemos riotAccount y parece válido, omitir primera carga
    if (
      initialRiotAccount &&
      !loadingRiotAccount &&
      riotAccount === initialRiotAccount
    ) {
      // Ya tenemos datos iniciales. Podríamos validar si el publicId cambió,
      // pero en un SSR page reload, publicId es nuevo.
      return;
    }

    const loadRiotAccount = async () => {
      if (!publicId) return;
      // Evitar recarga si ya tenemos datos iniciales recientes (esto es un parche simple)
      if (initialRiotAccount && riotAccount === initialRiotAccount) return;

      setLoadingRiotAccount(true);
      try {
        const response = await fetch(
          `/api/riot/account/public?publicId=${publicId}`
        );
        if (response.ok) {
          const data = await response.json();
          console.log(
            "[UserProfilePage] Respuesta de /api/riot/account/public:",
            {
              profileId: data.profile?.id,
              profileUsername: data.profile?.username,
              gameName: data.account?.game_name,
            }
          );
          setRiotAccount(data.account);
          const extractedUserId = data.profile?.id ?? null;
          setRiotUserId(extractedUserId);
          console.log(
            "[UserProfilePage] Riot User ID establecido:",
            extractedUserId
          );
        } else {
          console.log(
            "[UserProfilePage] No hay cuenta Riot vinculada (404 o similar)"
          );
          setRiotAccount(null);
          setRiotUserId(null);
        }
      } catch (error) {
        console.error("[UserProfilePage] Error loading Riot account:", error);
        setRiotAccount(null);
        setRiotUserId(null);
      } finally {
        setLoadingRiotAccount(false);
      }
    };

    loadRiotAccount();
  }, [publicId]);

  // Mutación para sincronizar cuenta + partidas
  const syncMutation = useMutation({
    mutationFn: async () => {
      // Usar riotUserId que ya tiene el ID correcto del perfil visitado
      const targetUserId = riotUserId || profile?.id;

      if (!targetUserId) {
        console.error("[UserProfilePage] No hay userId disponible:", {
          riotUserId,
          profileId: profile?.id,
        });
        throw new Error("No hay ID de usuario disponible");
      }

      console.log("[UserProfilePage] Iniciando sincronización...");
      console.log("[UserProfilePage] Target User ID:", targetUserId);
      console.log("[UserProfilePage] Profile ID:", profile?.id);
      console.log("[UserProfilePage] Riot User ID:", riotUserId);
      console.log("[UserProfilePage] Public ID:", publicId);

      const response = await fetch("/api/riot/account/public/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: targetUserId,
        }),
      });
      console.log("[UserProfilePage] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al sincronizar");
      }

      return response.json();
    },
    onSuccess: async (data) => {
      console.log("[UserProfilePage] Sincronización exitosa:", data);
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
        `/api/riot/account/public?publicId=${publicId}`
      );
      if (newResponse.ok) {
        const newData = await newResponse.json();
        console.log(
          "[UserProfilePage] Datos de cuenta recargados:",
          newData.account
        );
        setRiotAccount(newData.account);
        setRiotUserId(newData.profile?.id ?? null);
      } else {
        console.error(
          "[UserProfilePage] Error recargando cuenta:",
          newResponse.status
        );
      }
    },
    onError: (error: any) => {
      console.error("[UserProfilePage] Error en sincronización:", error);
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
    currentUserProfile && currentUserProfile.role === "admin"
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
            {/* Columna única - Feed de actividad (antes ocupaba 2 col, ahora 3) */}
            <div className="lg:col-span-3 space-y-6 sm:space-y-8">
              {/* Feed unificado de hilos, respuestas y partidas */}
              <FeedActividad
                ultimosHilos={profile.ultimosHilos}
                ultimosPosts={profile.ultimosPosts}
                weaponStatsRecords={profile.weaponStatsRecords}
                ultimasPartidas={profile.ultimasPartidas}
                userColor={profile.color}
                isOwnProfile={Boolean(
                  user && profile && user.id === profile.id
                )}
                isAdmin={isCurrentUserAdmin}
                onMatchDeleted={() => refetch()}
                userId={profile.id}
              />
            </div>

            {/* Columna derecha - Estadísticas unificadas (Oculto por ahora) */}
            {/* 
            <div className="lg:col-span-1 space-y-6">
              <EstadisticasUnificadas
                stats={profile.stats}
                userColor={profile.color}
              />
            </div>
            */}
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
                    hideShareButton={true}
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
