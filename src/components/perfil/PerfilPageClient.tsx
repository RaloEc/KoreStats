"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfilePageData } from "@/hooks/use-profile-page-data";
import { useEditProfile } from "@/hooks/use-edit-profile";
import { useUnifiedRiotSync } from "@/hooks/use-unified-riot-sync";

// Componentes de perfil
import ProfileHeader from "@/components/perfil/profile-header";
import MobileProfileLayout from "@/components/perfil/MobileProfileLayout";
import { ProfileTabs, type ProfileTab } from "@/components/perfil/ProfileTabs";
import { ProfilePageSkeleton } from "@/components/perfil/ProfilePageSkeleton";
import { EditProfileModal } from "@/components/perfil/EditProfileModal";
import { ProfilePostsTabContent } from "@/components/perfil/ProfilePostsTabContent";
import { ProfileLolTabContent } from "@/components/perfil/ProfileLolTabContent";
import { ConnectedAccountsModal } from "@/components/perfil/ConnectedAccountsModal";

import { Card, CardBody, Button, useDisclosure } from "@nextui-org/react";

import {
  StaticProfileData,
  DynamicProfileData,
} from "@/hooks/use-profile-page-data";

interface PerfilPageClientProps {
  initialStaticData?: StaticProfileData | null;
  initialDynamicData?: DynamicProfileData | null;
}

export default function PerfilPageClient({
  initialStaticData,
  initialDynamicData,
}: PerfilPageClientProps) {
  const router = useRouter();
  const {
    user,
    profile,
    signOut,
    loading: authLoading,
    session,
    refreshProfile,
    refreshAuth,
  } = useAuth();
  const { toast } = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isMobile = useIsMobile(1024);
  const searchParams = useSearchParams();

  // ========================================================================
  // HOOK UNIFICADO CON CACHÉ - Reemplaza múltiples useEffect
  // ========================================================================
  const {
    staticData,
    dynamicData,
    isFullyLoaded,
    isAuthLoading,
    invalidateStaticCache,
    invalidateAndRefetchStatic,
  } = useProfilePageData(initialStaticData, initialDynamicData);

  // Estados locales para UI
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);

  // Hook para sincronización unificada de Riot
  const {
    isPending: unifiedSyncPending,
    cooldownSeconds: unifiedSyncCooldown,
  } = useUnifiedRiotSync();

  // Datos derivados del hook unificado (con caché)
  const perfil = staticData?.perfil ?? null;
  const riotAccount = staticData?.riotAccount ?? null;
  const estadisticas = dynamicData?.estadisticas ?? {
    noticias: 0,
    comentarios: 0,
    hilos: 0,
    respuestas: 0,
  };

  // Hook para edición de perfil
  const { editData, setEditData, isSaving, error, handleSave } = useEditProfile(
    {
      perfil,
      isOpen,
      onClose,
      invalidateStaticCache,
      refreshProfile,
      refreshAuth,
    }
  );

  const isOwnProfile = user?.id === perfil?.id;

  // Lee el tab activo desde la URL inicialmente
  const initialTab = (searchParams.get("tab") as ProfileTab) || "posts";
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);

  // Sincronizar URL silenciosamente cuando cambia el tab
  useEffect(() => {
    const currentTab = new URLSearchParams(window.location.search).get("tab");
    if (currentTab !== activeTab) {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", activeTab);
      window.history.replaceState(null, "", `?${params.toString()}`);
    }
  }, [activeTab]);

  // Estado para controlar si ya se visitó la pestaña de LoL (Lazy Mounting)
  const [lolTabVisited, setLolTabVisited] = useState(activeTab === "lol");

  useEffect(() => {
    if (activeTab === "lol" && !lolTabVisited) {
      setLolTabVisited(true);
    }
  }, [activeTab, lolTabVisited]);

  // ========================================================================
  // EFECTO: Redirección si no hay sesión
  // ========================================================================
  useEffect(() => {
    if (!isAuthLoading && !session) {
      router.push("/login");
    }
  }, [isAuthLoading, session, router]);

  // Función para cargar actividades con paginación
  const fetchActividades = useCallback(
    async (page: number, limit: number) => {
      if (!user) return [];

      try {
        const response = await fetch(
          `/api/perfil/actividades?userId=${user.id}&page=${page}&limit=${limit}`
        );

        if (!response.ok) {
          throw new Error("Error al cargar actividades");
        }

        const data = await response.json();
        return data.items || [];
      } catch (error) {
        console.error("Error al cargar actividades:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las actividades recientes.",
        });
        return [];
      }
    },
    [user, toast]
  );

  const handleSignOut = async () => {
    if (isSigningOut) return;

    console.log("[Perfil] Iniciando proceso de cierre de sesión...");
    setIsSigningOut(true);

    try {
      console.log(
        "[Perfil] Intentando cierre de sesión con el contexto de autenticación..."
      );
      await signOut();
      console.log("[Perfil] Cierre de sesión exitoso con el contexto");
      console.log("[Perfil] Redirigiendo a la página principal...");
      window.location.href = "/";
      return;
    } catch (error) {
      console.error("[Perfil] Error en cierre de sesión con contexto:", error);

      try {
        console.log(
          "[Perfil] Intentando cierre de sesión con instancia directa..."
        );
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.auth.signOut();
        console.log("[Perfil] Cierre de sesión exitoso con instancia directa");
      } catch (innerError) {
        console.error(
          "[Perfil] Error en cierre de sesión con instancia directa:",
          innerError
        );
      } finally {
        console.log("[Perfil] Forzando recarga de la página...");
        window.location.href = "/";
      }
    } finally {
      console.log("[Perfil] Limpiando estado de carga...");
      setIsSigningOut(false);
    }
  };

  // ========================================================================
  // RENDER: Skeleton mientras cargan TODOS los datos
  // ========================================================================
  if (!isFullyLoaded) {
    return <ProfilePageSkeleton />;
  }

  // Error state
  if (!perfil) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md bg-white dark:bg-black amoled:bg-black">
          <CardBody className="text-center">
            <p>No se pudo cargar el perfil</p>
            <Button onClick={() => router.push("/")} className="mt-4">
              Volver al inicio
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Layout móvil
  if (isMobile) {
    return (
      <>
        <MobileProfileLayout
          fetchActivities={fetchActividades}
          estadisticas={estadisticas}
          perfil={{
            id: perfil.id,
            username: perfil.username,
            color: perfil.color,
            role: perfil.role,
            avatar_url: perfil.avatar_url,
            banner_url: perfil.banner_url,
            created_at: perfil.created_at,
            ultimo_acceso: perfil.ultimo_acceso,
            activo: perfil.activo,
            followers_count: (profile as any)?.followers_count ?? 0,
            following_count: (profile as any)?.following_count ?? 0,
            friends_count: (profile as any)?.friends_count ?? 0,
            connected_accounts:
              editData.connected_accounts ||
              (profile as any)?.connected_accounts ||
              {},
          }}
          userId={user?.id}
          onSignOut={handleSignOut}
          isSigningOut={isSigningOut}
          onEditClick={onOpen}
          riotAccount={riotAccount}
          onInvalidateCache={invalidateAndRefetchStatic}
        />

        {/* Modal de edición */}
        <EditProfileModal
          isOpen={isOpen}
          onClose={onClose}
          editData={editData}
          setEditData={setEditData}
          perfilId={perfil.id}
          currentUsername={perfil.username ?? ""}
          userId={user?.id}
          error={error}
          isSaving={isSaving}
          onSave={handleSave}
          isMobile={true}
        />
      </>
    );
  }

  // Layout desktop
  return (
    <div className="min-h-screen bg-white dark:bg-black amoled:bg-black">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header del perfil */}
        <div className="mb-8">
          <ProfileHeader
            perfil={{
              id: perfil.id,
              username: perfil.username,
              role: perfil.role,
              avatar_url: perfil.avatar_url,
              color: perfil.color,
              banner_url: perfil.banner_url || undefined,
              followers_count: (profile as any)?.followers_count ?? 0,
              following_count: (profile as any)?.following_count ?? 0,
              friends_count: (profile as any)?.friends_count ?? 0,
              connected_accounts: (profile as any)?.connected_accounts || {},
            }}
            riotTier={riotAccount?.tier}
            riotRank={riotAccount?.rank}
            riotAccount={riotAccount}
            onEditClick={onOpen}
          />
        </div>

        {/* Biografía */}
        {perfil.bio && (
          <div className="mb-8">
            <Card className="bg-white dark:bg-black amoled:bg-black">
              <CardBody className="p-6">
                <p className="text-gray-700 dark:text-gray-300 amoled:text-gray-300 leading-relaxed text-center text-lg">
                  "{perfil.bio}"
                </p>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Sistema de Pestañas */}
        <ProfileTabs
          hasRiotAccount={!!riotAccount}
          currentTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Contenido de Pestañas con Persistencia (KeepMounted) */}

        {/* Pestaña Actividad */}
        <div className={activeTab === "posts" ? "block mt-8" : "hidden mt-8"}>
          <ProfilePostsTabContent
            perfilId={perfil.id}
            perfilUsername={perfil.username}
            perfilColor={perfil.color}
            userId={user?.id}
            estadisticas={estadisticas}
          />
        </div>

        {/* Pestaña League of Legends - Lazy Mounted + Keep Alive */}
        {(activeTab === "lol" || lolTabVisited) && (
          <div
            className={
              activeTab === "lol"
                ? "block mt-8 space-y-6"
                : "hidden mt-8 space-y-6"
            }
          >
            <ProfileLolTabContent
              riotAccount={riotAccount}
              userId={perfil.id}
              isOwnProfile={isOwnProfile}
              unifiedSyncPending={unifiedSyncPending}
              unifiedSyncCooldown={unifiedSyncCooldown}
              onInvalidateCache={invalidateAndRefetchStatic}
            />
          </div>
        )}
      </div>

      {/* Modal de edición */}
      <EditProfileModal
        isOpen={isOpen}
        onClose={onClose}
        editData={editData}
        setEditData={setEditData}
        perfilId={perfil.id}
        currentUsername={perfil.username ?? ""}
        userId={user?.id}
        error={error}
        isSaving={isSaving}
        onSave={handleSave}
        isMobile={false}
      />

      {/* Modal de gestión de cuentas conectadas */}
      <ConnectedAccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        userId={perfil?.id || ""}
        onSave={async () => {
          invalidateStaticCache();
          await refreshProfile();
        }}
      />
    </div>
  );
}
