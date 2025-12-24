"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCheckUsername } from "@/hooks/use-check-username";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfilePageData } from "@/hooks/use-profile-page-data";
import ImageUploader from "@/components/ImageUploader";
import ProfileHeader from "@/components/perfil/profile-header";
import { BannerUploader } from "@/components/perfil/BannerUploader";
import ProfileStats from "@/components/perfil/profile-stats";
import Link from "next/link";
// import UserActivityFeed from "@/components/perfil/UserActivityFeed";
// import UserActivityFeedContainer from "@/components/perfil/UserActivityFeedContainer";
import StatusFeed from "@/components/social/StatusFeed";
import MembershipInfo from "@/components/perfil/membership-info";
import MobileProfileLayout from "@/components/perfil/MobileProfileLayout";
import { FriendRequestsList } from "@/components/social/FriendRequestsList";
import { FriendsListCompact } from "@/components/social/FriendsListCompact";
import { ConnectedAccountsModal } from "@/components/perfil/ConnectedAccountsModal";
import { ConnectedAccountsForm } from "@/components/perfil/ConnectedAccountsForm";
import { ProfileTabs } from "@/components/perfil/ProfileTabs";
import { RiotAccountCard } from "@/components/riot/RiotAccountCard";
import { MatchHistoryList } from "@/components/riot/MatchHistoryList";
import { RiotEmptyState } from "@/components/riot/RiotEmptyState";
import { RiotTierBadge } from "@/components/riot/RiotTierBadge";
import { ChampionStatsSummary } from "@/components/riot/ChampionStatsSummary";
import { UnifiedRiotSyncButton } from "@/components/riot/UnifiedRiotSyncButton";
import { useUnifiedRiotSync } from "@/hooks/use-unified-riot-sync";
import { SavedBuildsPanel } from "@/components/riot/SavedBuildsPanel";
import { ProfilePageSkeleton } from "@/components/perfil/ProfilePageSkeleton";
import {
  Card,
  CardBody,
  Button,
  Input,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,
  Divider,
} from "@nextui-org/react";
import { LogOut, X, Check, AlertCircle, Loader } from "lucide-react";

interface PerfilCompleto {
  id: string;
  username: string;
  role: "user" | "admin" | "moderator";
  email?: string;
  avatar_url: string;
  banner_url?: string | null;
  color: string;
  bio?: string;
  ubicacion?: string;
  sitio_web?: string;
  connected_accounts?: Record<string, string>;
  activo?: boolean;
  ultimo_acceso?: string;
  created_at?: string;
  updated_at?: string;
}

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

  // Estados locales para UI (no para datos)
  const [isSaving, setSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Estados para el modal de edición
  const [editData, setEditData] = useState({
    username: "",
    bio: "",
    color: "#64748B",
    avatar_url: "",
    banner_url: "" as string | null,
    connected_accounts: {} as Record<string, string>,
  });

  const isOwnProfile = user?.id === perfil?.id;

  // Lee el tab activo desde la URL inicialmente
  const initialTab = (searchParams.get("tab") as "posts" | "lol") || "posts";

  // Estado local para control inmediato de la UI (sin esperar a router.replace)
  const [activeTab, setActiveTab] = useState<"posts" | "lol">(initialTab);

  // Sincronizar URL silenciosamente cuando cambia el tab (sin re-render de Next.js)
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

  const syncEditDataWithPerfil = useCallback((perfilData: PerfilCompleto) => {
    // Parsear connected_accounts si es string JSON
    let connectedAccounts: Record<string, string> = {};
    const rawConnectedAccounts = perfilData.connected_accounts;
    if (rawConnectedAccounts) {
      if (typeof rawConnectedAccounts === "string") {
        try {
          connectedAccounts = JSON.parse(rawConnectedAccounts);
        } catch (e) {
          console.error("Error parsing connected_accounts:", e);
          connectedAccounts = {};
        }
      } else if (typeof rawConnectedAccounts === "object") {
        connectedAccounts = rawConnectedAccounts;
      }
    }

    setEditData({
      username: perfilData.username || "",
      bio: perfilData.bio || "",
      color: perfilData.color,
      avatar_url: perfilData.avatar_url,
      banner_url: perfilData.banner_url || "",
      connected_accounts: connectedAccounts,
    });
  }, []);

  // Validación de username
  const usernameCheck = useCheckUsername(editData.username, user?.id);

  const normalizedCurrentUsername = useMemo(
    () => (perfil?.username ?? "").trim(),
    [perfil?.username]
  );
  const normalizedEditUsername = useMemo(
    () => editData.username.trim(),
    [editData.username]
  );
  const usernameChanged = normalizedEditUsername !== normalizedCurrentUsername;
  const hasUsernameValue = normalizedEditUsername.length > 0;
  const shouldShowAvailability = usernameChanged && hasUsernameValue;

  // ========================================================================
  // EFECTO: Redirección si no hay sesión
  // ========================================================================
  useEffect(() => {
    if (!isAuthLoading && !session) {
      router.push("/login");
    }
  }, [isAuthLoading, session, router]);

  // ========================================================================
  // EFECTO: Sincronizar datos de edición cuando se abre el modal
  // ========================================================================
  useEffect(() => {
    if (isOpen && perfil) {
      syncEditDataWithPerfil(perfil as PerfilCompleto);
      setError(null);
    }
  }, [isOpen, perfil, syncEditDataWithPerfil]);

  // NOTA: Los useEffect de cargar estadísticas y cuenta Riot fueron eliminados
  // Ahora se obtienen del hook unificado useProfilePageData con caché

  // NOTA: cargarEstadisticas fue eliminada - ahora viene del hook unificado

  // Función para obtener el nombre del color
  const getColorName = (hex: string): string => {
    const colors: Record<string, string> = {
      "#4F46E5": "Azul",
      "#10B981": "Verde",
      "#EF4444": "Rojo",
      "#F59E0B": "Amarillo",
      "#8B5CF6": "Violeta",
      "#06B6D4": "Turquesa",
      "#F97316": "Naranja",
      "#EC4899": "Rosa",
      "#64748B": "Gris azulado",
    };
    return colors[hex] || "Personalizado";
  };

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

  const handleSave = async () => {
    if (!perfil) return;

    setSaving(true);
    setError(null);

    try {
      // Guardar datos actuales para actualización inmediata
      const datosActualizados = {
        username: editData.username,
        bio: editData.bio,
        color: editData.color,
        avatar_url: editData.avatar_url,
        banner_url: editData.banner_url,
        connected_accounts: editData.connected_accounts,
      };

      // Cerrar el modal inmediatamente
      onClose();

      // Enviar datos al servidor
      const response = await fetch("/api/perfil/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: perfil.id,
          ...datosActualizados,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar perfil");
      }

      // Invalidar caché para forzar recarga de datos actualizados
      invalidateStaticCache();

      // También actualizamos el contexto de autenticación
      await refreshProfile();
      await refreshAuth();

      // Mostrar notificación de éxito
      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado correctamente.",
      });
    } catch (error) {
      console.error("Error:", error);
      setError("Error al actualizar el perfil");
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return; // Evitar múltiples clics

    console.log("[Perfil] Iniciando proceso de cierre de sesión...");
    setIsSigningOut(true);

    try {
      // 1. Intentar con el signOut del contexto de autenticación
      console.log(
        "[Perfil] Intentando cierre de sesión con el contexto de autenticación..."
      );
      await signOut();
      console.log("[Perfil] Cierre de sesión exitoso con el contexto");

      // 2. Redirigir y forzar recarga para limpiar todo el estado
      console.log("[Perfil] Redirigiendo a la página principal...");
      window.location.href = "/";
      return; // Salir de la función para evitar ejecutar el código restante
    } catch (error) {
      console.error("[Perfil] Error en cierre de sesión con contexto:", error);

      // 3. Si falla, intentar con una instancia directa de Supabase
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
        // 4. En cualquier caso, forzar recarga para asegurar limpieza
        console.log("[Perfil] Forzando recarga de la página...");
        window.location.href = "/";
      }
    } finally {
      // 5. Asegurarse de que el estado se limpie
      console.log("[Perfil] Limpiando estado de carga...");
      setIsSigningOut(false);
    }
  };

  // ========================================================================
  // RENDER: Skeleton mientras cargan TODOS los datos (elimina carga escalonada)
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

        {/* Modal de edición - Renderizado fuera del layout móvil para evitar z-index issues */}
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          size="2xl"
          scrollBehavior="inside"
          className="max-h-[90vh] z-50"
          backdrop="blur"
          classNames={{
            base: "bg-white dark:bg-black amoled:bg-black z-50",
            header:
              "border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800",
            body: "bg-white dark:bg-black amoled:bg-black",
            footer:
              "bg-white dark:bg-black amoled:bg-black border-t border-gray-200 dark:border-gray-800 amoled:border-gray-800",
            backdrop: "backdrop-blur-sm bg-black/10 z-40",
          }}
        >
          <ModalContent>
            <ModalHeader className="sticky top-0 z-10 bg-white dark:bg-black amoled:bg-black border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 amoled:text-gray-100">
                Editar Perfil
              </h2>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 amoled:text-gray-400 amoled:hover:text-gray-200"
              >
                <X size={20} />
              </Button>
            </ModalHeader>
            <ModalBody className="overflow-y-auto max-h-[60vh] bg-white dark:bg-black amoled:bg-black">
              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 amoled:bg-red-900/20 border border-red-300 dark:border-red-800 amoled:border-red-800 text-red-700 dark:text-red-300 amoled:text-red-300 rounded-lg">
                  {error}
                </div>
              )}

              {/* Sección de imagen de perfil */}
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200 amoled:text-gray-200">
                  Imagen de perfil
                </h3>
                <ImageUploader
                  currentImageUrl={editData.avatar_url}
                  userId={perfil?.id || ""}
                  onImageUploaded={(url) =>
                    setEditData((prev) => ({ ...prev, avatar_url: url }))
                  }
                  className="mb-2"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 amoled:text-gray-400 mt-1">
                  Sube una imagen de perfil (máx. 2MB)
                </p>
              </div>

              {/* Sección de banner de perfil */}
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200 amoled:text-gray-200">
                  Banner de perfil
                </h3>
                <BannerUploader
                  variant="compact"
                  userId={perfil.id}
                  currentBanner={editData.banner_url || perfil.banner_url || ""}
                  onUpload={(url) => {
                    setEditData((prev) => ({ ...prev, banner_url: url }));
                    // El banner se guarda al dar "Guardar Cambios"
                  }}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 amoled:text-gray-400 mt-1">
                  Sube una imagen de banner (máx. 5MB). Relación recomendada 4:1
                  (1920x480).
                </p>
              </div>

              <Divider className="my-4" />

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    label="Nombre de usuario"
                    value={editData.username}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    placeholder="Tu nombre de usuario"
                    isInvalid={
                      shouldShowAvailability &&
                      usernameCheck.available === false
                    }
                    color={
                      shouldShowAvailability
                        ? usernameCheck.available === true
                          ? "success"
                          : usernameCheck.available === false
                          ? "danger"
                          : "default"
                        : "default"
                    }
                    endContent={
                      shouldShowAvailability && (
                        <div className="flex items-center gap-2">
                          {usernameCheck.loading && (
                            <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                          )}
                          {!usernameCheck.loading &&
                            usernameCheck.available === true && (
                              <Check className="w-4 h-4 text-green-500" />
                            )}
                          {!usernameCheck.loading &&
                            usernameCheck.available === false && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                        </div>
                      )
                    }
                  />
                </div>
                {shouldShowAvailability && (
                  <div className="text-sm">
                    {usernameCheck.loading && (
                      <p className="text-gray-500 dark:text-gray-400">
                        Verificando disponibilidad...
                      </p>
                    )}
                    {!usernameCheck.loading &&
                      usernameCheck.available === true && (
                        <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          {usernameCheck.message || "Username disponible"}
                        </p>
                      )}
                    {!usernameCheck.loading &&
                      usernameCheck.available === false && (
                        <p className="text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {usernameCheck.error || "Username no disponible"}
                        </p>
                      )}
                  </div>
                )}
              </div>

              <Textarea
                label="Biografía"
                value={editData.bio}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="Cuéntanos sobre ti..."
                maxRows={4}
              />

              {/* Sección de cuentas conectadas - Temporalmente oculto */}
              {/* <Divider className="my-4" />

              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 amoled:text-gray-200">
                  Cuentas Conectadas
                </h3>
                <ConnectedAccountsForm
                  accounts={editData.connected_accounts || {}}
                  onChange={(accounts) =>
                    setEditData((prev) => ({
                      ...prev,
                      connected_accounts: accounts,
                    }))
                  }
                />
              </div> */}

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-white/50 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/80 dark:border-gray-700/70">
                  <div
                    className="w-10 h-10 rounded-lg shadow-sm transition-all duration-200"
                    style={{
                      backgroundColor: editData.color,
                      transform: "translateY(-1px)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {getColorName(editData.color)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {editData.color.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Paleta de colores */}
                <div className="p-2 bg-white/30 dark:bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/60">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      "#4F46E5", // Azul
                      "#10B981", // Verde
                      "#EF4444", // Rojo
                      "#F59E0B", // Amarillo
                      "#8B5CF6", // Violeta
                      "#06B6D4", // Turquesa
                      "#F97316", // Naranja
                      "#EC4899", // Rosa
                    ].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setEditData((prev) => ({ ...prev, color }))
                        }
                        className={`relative w-full aspect-square rounded-lg transition-all duration-200 flex items-center justify-center
                          ${
                            editData.color === color
                              ? "ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-gray-800 scale-105 shadow-sm"
                              : "hover:shadow-sm hover:scale-105"
                          }
                          after:absolute after:inset-0 after:rounded-lg after:transition-all after:duration-200
                          ${
                            editData.color === color
                              ? "after:bg-white/10"
                              : "hover:after:bg-black/5 dark:hover:after:bg-white/5"
                          }
                        `}
                        style={{ backgroundColor: color }}
                        title={getColorName(color)}
                        aria-label={`Seleccionar color ${getColorName(color)}`}
                      >
                        {editData.color === color && (
                          <svg
                            className="w-4 h-4 text-white drop-shadow-md"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                variant="light"
                onPress={onClose}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                color="primary"
                onPress={handleSave}
                isLoading={isSaving}
                isDisabled={
                  isSaving ||
                  (usernameChanged && usernameCheck.available !== true)
                }
              >
                Guardar Cambios
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
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

        {/* Pestaña Actividad - Siempre montada pero ocultable */}
        <div className={activeTab === "posts" ? "block mt-8" : "hidden mt-8"}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna izquierda - Feed de actividad */}
            <div className="lg:col-span-2">
              {/*
                Aseguramos detectar el rol admin aunque venga en mayúsculas/minúsculas mezcladas.
                Esto permite que el menú muestre la opción de eliminar cuando el usuario es admin.
              */}
              <StatusFeed
                profileId={perfil.id}
                profileUsername={perfil.username}
                isOwnProfile={true}
              />
            </div>

            {/* Columna derecha - Información de membresía */}
            <div className="lg:col-span-1 space-y-6">
              {/* Solicitudes de amistad */}
              <FriendRequestsList userColor={perfil.color} />

              {/* Lista de amigos */}
              <FriendsListCompact
                userId={user?.id}
                userColor={perfil.color}
                limit={8}
              />

              {/* Estadísticas */}
              <ProfileStats estadisticas={estadisticas} />

              <MembershipInfo
                perfil={{
                  created_at: perfil.created_at,
                  ultimo_acceso: perfil.ultimo_acceso,
                  activo: perfil.activo,
                  role: perfil.role,
                }}
              />

              {/* Botón de cerrar sesión */}
              <Card className="bg-white dark:bg-black amoled:bg-black">
                <CardBody>
                  <Button
                    color="danger"
                    variant="light"
                    startContent={<LogOut className="w-4 h-4" />}
                    onPress={handleSignOut}
                    isLoading={isSigningOut}
                    isDisabled={isSigningOut}
                    className="w-full"
                  >
                    {isSigningOut ? "Cerrando sesión..." : "Cerrar Sesión"}
                  </Button>
                </CardBody>
              </Card>
            </div>
          </div>
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
            {riotAccount ? (
              <>
                {/* Botón unificado de sincronización - solo visible en desktop */}
                <div className="hidden lg:flex justify-end">
                  <UnifiedRiotSyncButton
                    userColor={perfil?.color}
                    showLabel={true}
                  />
                </div>

                {/* Tarjeta de cuenta de Riot */}
                <RiotAccountCard
                  useVisualDesign={true}
                  externalSyncPending={unifiedSyncPending}
                  externalCooldownSeconds={unifiedSyncCooldown}
                  onUnlink={async () => {
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
                        throw new Error(
                          error.error || "Error al desvincular la cuenta"
                        );
                      }

                      toast({
                        title: "Cuenta desvinculada",
                        description:
                          "Tu cuenta de Riot Games ha sido desvinculada exitosamente",
                      });

                      await invalidateAndRefetchStatic();
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description:
                          error.message || "No se pudo desvincular la cuenta",
                        variant: "destructive",
                      });
                    }
                  }}
                />

                {/* Resumen de campeones */}
                {riotAccount.puuid && (
                  <ChampionStatsSummary puuid={riotAccount.puuid} limit={5} />
                )}

                {/* Builds guardadas */}
                <SavedBuildsPanel />

                {/* Historial de partidas */}
                <MatchHistoryList
                  userId={perfil.id}
                  externalSyncPending={unifiedSyncPending}
                  externalCooldownSeconds={unifiedSyncCooldown}
                />
              </>
            ) : (
              // CTA para vincular Riot cuando es su propio perfil
              isOwnProfile && (
                <RiotEmptyState
                  isOwnProfile
                  onLinkClick={() => {
                    window.location.href = "/api/riot/login";
                  }}
                  onManualLinkSuccess={async () => {
                    // Invalidar caché Y refetch inmediatamente
                    await invalidateAndRefetchStatic();
                  }}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Modal de edición con scroll */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        scrollBehavior="inside"
        className="max-h-[90vh] z-50"
        backdrop="blur"
        classNames={{
          base: "bg-white dark:bg-black amoled:bg-black z-50",
          header:
            "border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800",
          body: "bg-white dark:bg-black amoled:bg-black",
          footer:
            "bg-white dark:bg-black amoled:bg-black border-t border-gray-200 dark:border-gray-800 amoled:border-gray-800",
          backdrop: "backdrop-blur-sm bg-black/10 z-40",
        }}
      >
        <ModalContent>
          <ModalHeader className="sticky top-0 z-10 bg-white dark:bg-black amoled:bg-black border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 amoled:text-gray-100">
              Editar Perfil
            </h2>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 amoled:text-gray-400 amoled:hover:text-gray-200"
            >
              <X size={20} />
            </Button>
          </ModalHeader>
          <ModalBody className="overflow-y-auto max-h-[60vh] bg-white dark:bg-black amoled:bg-black">
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 amoled:bg-red-900/20 border border-red-300 dark:border-red-800 amoled:border-red-800 text-red-700 dark:text-red-300 amoled:text-red-300 rounded-lg">
                {error}
              </div>
            )}

            {/* Sección de imagen de perfil */}
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200 amoled:text-gray-200">
                Imagen de perfil
              </h3>
              <ImageUploader
                currentImageUrl={editData.avatar_url}
                userId={perfil?.id || ""}
                onImageUploaded={(url) =>
                  setEditData((prev) => ({ ...prev, avatar_url: url }))
                }
                className="mb-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 amoled:text-gray-400 mt-1">
                Sube una imagen de perfil (máx. 2MB)
              </p>
            </div>

            {/* Sección de banner de perfil */}
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200 amoled:text-gray-200">
                Banner de perfil
              </h3>
              <BannerUploader
                variant="compact"
                userId={perfil.id}
                currentBanner={editData.banner_url || perfil.banner_url || ""}
                onUpload={(url) => {
                  setEditData((prev) => ({ ...prev, banner_url: url }));
                  // El banner se guarda al dar "Guardar Cambios"
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 amoled:text-gray-400 mt-1">
                Sube una imagen de banner (máx. 5MB). Relación recomendada 4:1
                (1920x480).
              </p>
            </div>

            <Divider className="my-4" />

            <div className="space-y-2">
              <div className="relative">
                <Input
                  label="Nombre de usuario"
                  value={editData.username}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="Tu nombre de usuario"
                  isInvalid={
                    shouldShowAvailability && usernameCheck.available === false
                  }
                  color={
                    shouldShowAvailability
                      ? usernameCheck.available === true
                        ? "success"
                        : usernameCheck.available === false
                        ? "danger"
                        : "default"
                      : "default"
                  }
                  endContent={
                    shouldShowAvailability && (
                      <div className="flex items-center gap-2">
                        {usernameCheck.loading && (
                          <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                        )}
                        {!usernameCheck.loading &&
                          usernameCheck.available === true && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                        {!usernameCheck.loading &&
                          usernameCheck.available === false && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                      </div>
                    )
                  }
                />
              </div>
              {shouldShowAvailability && (
                <div className="text-sm">
                  {usernameCheck.loading && (
                    <p className="text-gray-500 dark:text-gray-400">
                      Verificando disponibilidad...
                    </p>
                  )}
                  {!usernameCheck.loading &&
                    usernameCheck.available === true && (
                      <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        {usernameCheck.message || "Username disponible"}
                      </p>
                    )}
                  {!usernameCheck.loading &&
                    usernameCheck.available === false && (
                      <p className="text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {usernameCheck.error || "Username no disponible"}
                      </p>
                    )}
                </div>
              )}
            </div>

            <Textarea
              label="Biografía"
              value={editData.bio}
              onChange={(e) =>
                setEditData((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="Cuéntanos sobre ti..."
              maxRows={4}
            />

            {/* Sección de cuentas conectadas - Temporalmente oculto */}
            {/* <Divider className="my-4" />

            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 amoled:text-gray-200">
                Cuentas Conectadas
              </h3>
              <ConnectedAccountsForm
                accounts={editData.connected_accounts || {}}
                onChange={(accounts) =>
                  setEditData((prev) => ({
                    ...prev,
                    connected_accounts: accounts,
                  }))
                }
              />
            </div> */}

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-white/50 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/80 dark:border-gray-700/70">
                <div
                  className="w-10 h-10 rounded-lg shadow-sm transition-all duration-200"
                  style={{
                    backgroundColor: editData.color,
                    transform: "translateY(-1px)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {getColorName(editData.color)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {editData.color.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Paleta de colores */}
              <div className="p-2 bg-white/30 dark:bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/60">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    "#4F46E5", // Azul
                    "#10B981", // Verde
                    "#EF4444", // Rojo
                    "#F59E0B", // Amarillo
                    "#8B5CF6", // Violeta
                    "#06B6D4", // Turquesa
                    "#F97316", // Naranja
                    "#EC4899", // Rosa
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setEditData((prev) => ({ ...prev, color }))
                      }
                      className={`relative w-full aspect-square rounded-lg transition-all duration-200 flex items-center justify-center
                        ${
                          editData.color === color
                            ? "ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-gray-800 scale-105 shadow-sm"
                            : "hover:shadow-sm hover:scale-105"
                        }
                        after:absolute after:inset-0 after:rounded-lg after:transition-all after:duration-200
                        ${
                          editData.color === color
                            ? "after:bg-white/10"
                            : "hover:after:bg-black/5 dark:hover:after:bg-white/5"
                        }
                      `}
                      style={{ backgroundColor: color }}
                      title={getColorName(color)}
                      aria-label={`Seleccionar color ${getColorName(color)}`}
                    >
                      {editData.color === color && (
                        <svg
                          className="w-4 h-4 text-white drop-shadow-md"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              color="primary"
              onPress={handleSave}
              isLoading={isSaving}
              isDisabled={
                isSaving ||
                (usernameChanged && usernameCheck.available !== true)
              }
            >
              Guardar Cambios
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de gestión de cuentas conectadas */}
      <ConnectedAccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        userId={perfil?.id || ""}
        onSave={async () => {
          // Invalidar caché para refrescar los datos
          invalidateStaticCache();
          await refreshProfile();
        }}
      />
    </div>
  );
}
