"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarX, setSidebarX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const searchParams = useSearchParams();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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

  // Manejo de drag del sidebar
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - dragStart;
    const screenWidth = window.innerWidth;

    // Si el menú está cerrado, permitir deslizar desde el borde derecho para abrir
    if (!sidebarOpen) {
      // Solo activar si se empieza desde el borde derecho (últimos 30px)
      if (dragStart > screenWidth - 30) {
        // Permitir arrastrar hacia la izquierda (abrir)
        if (diff < 0) {
          const pullDistance = Math.abs(diff);
          // Limitar la distancia máxima de arrastre
          setSidebarX(Math.min(pullDistance, 320));
        }
      }
    } else {
      // Si el menú está abierto, permitir arrastrar hacia la derecha (cerrar)
      if (diff > 0) {
        setSidebarX(diff);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (!sidebarOpen) {
      // Si se arrastró más de 100px desde el borde derecho, abrir el menú
      if (sidebarX > 100) {
        setSidebarOpen(true);
      }
    } else {
      // Si se arrastró más de 100px hacia la derecha, cerrar el menú
      if (sidebarX > 100) {
        setSidebarOpen(false);
      }
    }

    setSidebarX(0);
  };

  // Cerrar sidebar al hacer click en overlay
  const handleOverlayClick = () => {
    setSidebarOpen(false);
    setSidebarX(0);
  };

  // Cerrar sidebar con ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
        setSidebarX(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-white dark:bg-black amoled:bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Contenido principal - Feed de actividad */}
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
            currentTab={currentTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Contenido según pestaña - Renderizado condicional con display para mantener estado */}
        <div className={currentTab === "posts" ? "block" : "hidden"}>
          {/* Indicador de deslizar + Título */}
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-black amoled:bg-black border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800 mt-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 amoled:text-gray-100">
              Actividad
            </h2>
          </div>

          {/* Feed de actividad con scroll infinit */}
          <div className="px-4 py-4 pb-20">
            <StatusFeed
              profileId={perfil.id}
              profileUsername={perfil.username}
              isOwnProfile={isOwnProfile || userId === perfil.id}
            />
          </div>
        </div>

        <div className={currentTab !== "posts" ? "block" : "hidden"}>
          <div className="px-4 py-4 pb-20 space-y-6">
            {!riotAccount && isOwnProfile ? (
              <RiotEmptyState
                isOwnProfile
                onLinkClick={() => {
                  window.location.href = "/api/riot/login";
                }}
                onManualLinkSuccess={async () => {
                  // Invalidar caché de React Query para recargar datos de Riot
                  await onInvalidateCache?.();
                }}
              />
            ) : riotAccount ? (
              <>
                {/* Botón unificado de sincronización - ahora está dentro de la tarjeta */}

                <RiotAccountCardVisual
                  account={riotAccount}
                  hideSync={false}
                  onSync={unifiedSync}
                  isSyncing={unifiedSyncPending}
                  cooldownSeconds={unifiedSyncCooldown}
                />

                <div className="grid grid-cols-1 gap-6">
                  {/* Estadísticas de campeones */}
                  <ChampionStatsSummary puuid={riotAccount.puuid} />

                  {/* Builds guardadas */}
                  <SavedBuildsPanel />

                  {/* Historial de partidas */}
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
      </div>

      {/* Indicador visual fijo en la pantalla - Flecha para deslizar */}
      <div
        onClick={() => setSidebarOpen(true)}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 amoled:hover:bg-gray-900 transition-all cursor-pointer group backdrop-blur-sm bg-white/80 dark:bg-black/80 amoled:bg-black/80 shadow-lg hover:shadow-xl"
        aria-label="Deslizar para abrir panel"
        title="Desliza para abrir más opciones"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 amoled:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 amoled:group-hover:text-gray-200 transition-colors animate-pulse" />
      </div>

      {/* Overlay semitransparente */}
      {sidebarOpen && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          style={{
            opacity: sidebarOpen ? 1 : 0,
            pointerEvents: sidebarOpen ? "auto" : "none",
          }}
        />
      )}

      {/* Sidebar deslizable desde la derecha */}
      <div
        ref={sidebarRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="fixed top-0 right-0 z-40 h-screen w-80 max-w-[90vw] bg-white dark:bg-black amoled:bg-black shadow-2xl transition-transform duration-300 ease-out overflow-y-auto"
        style={{
          transform: sidebarOpen
            ? `translateX(${sidebarX}px)`
            : "translateX(100%)",
        }}
      >
        {/* Header del sidebar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 bg-white dark:bg-black amoled:bg-black border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 amoled:text-gray-100">
            Más
          </h3>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 amoled:hover:bg-gray-900 transition-colors"
            aria-label="Cerrar panel"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400 amoled:text-gray-400" />
          </button>
        </div>

        {/* Contenido del sidebar */}
        <div className="p-4 space-y-6">
          {/* Solicitudes de amistad */}
          <FriendRequestsList userColor={perfil.color} />

          {/* Lista de amigos */}
          <FriendsListCompact
            userId={userId}
            userColor={perfil.color}
            limit={6}
          />

          {/* Estadísticas */}
          <ProfileStats estadisticas={estadisticas} />

          {/* Información de membresía */}
          <MembershipInfo
            perfil={{
              created_at: perfil.created_at,
              ultimo_acceso: perfil.ultimo_acceso,
              activo: perfil.activo,
              role: perfil.role,
            }}
          />

          {/* Botón de cerrar sesión */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 amoled:border-gray-800">
            <Button
              color="danger"
              variant="light"
              startContent={<LogOut className="w-4 h-4" />}
              onPress={onSignOut}
              isLoading={isSigningOut}
              isDisabled={isSigningOut}
              className="w-full"
            >
              {isSigningOut ? "Cerrando sesión..." : "Cerrar Sesión"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
