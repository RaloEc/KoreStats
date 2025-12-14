"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
import { PerfilHeader } from "@/components/perfil/PerfilHeader";
import { FeedActividad } from "@/components/perfil/FeedActividad";
import { EstadisticasUnificadas } from "@/components/perfil/EstadisticasUnificadas";
import { ProfileTabs, type ProfileTab } from "@/components/perfil/ProfileTabs";
import { RiotAccountCardVisual } from "@/components/riot/RiotAccountCardVisual";
import { ChampionStatsSummary } from "@/components/riot/ChampionStatsSummary";
import { MatchHistoryList } from "@/components/riot/MatchHistoryList";

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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarX, setSidebarX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Manejo de drag del sidebar
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!sidebarOpen) return;
    setIsDragging(true);
    setDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !sidebarOpen) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - dragStart;

    // Solo permitir arrastrar hacia la derecha (cerrar)
    if (diff > 0) {
      setSidebarX(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // Si se arrastró más de 100px, cerrar
    if (sidebarX > 100) {
      setSidebarOpen(false);
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
    <div className="relative w-full min-h-screen bg-white dark:bg-black amoled:bg-black">
      {/* Contenido principal */}
      <div className="w-full">
        {/* Header del perfil con banner */}
        <div className="bg-white dark:bg-black amoled:bg-black">
          <PerfilHeader profile={profile} />
        </div>

        {/* Sistema de Pestañas */}
        <div className="px-4 mt-2">
          <ProfileTabs
            hasRiotAccount={!!riotAccount}
            currentTab={currentTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Contenido según pestaña */}
        {currentTab === "posts" ? (
          <>
            {/* Título de actividad */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-black amoled:bg-black border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800 mt-2">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 amoled:text-gray-100">
                Actividad
              </h2>
            </div>

            {/* Feed de actividad con scroll infinito */}
            <div className="px-4 py-6">
              <FeedActividad
                ultimosHilos={profile.ultimosHilos}
                ultimosPosts={profile.ultimosPosts}
                weaponStatsRecords={profile.weaponStatsRecords}
                ultimasPartidas={profile.ultimasPartidas}
                userColor={profile.color}
                isOwnProfile={isOwnProfile}
              />
            </div>
          </>
        ) : (
          <div className="px-4 py-4 pb-20 space-y-6">
            {riotAccount ? (
              <>
                <RiotAccountCardVisual
                  account={riotAccount}
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
        )}
      </div>

      {/* Indicador visual fijo en la pantalla - Estadísticas */}
      <div
        onClick={() => setSidebarOpen(true)}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 amoled:hover:bg-gray-900 transition-all cursor-pointer group backdrop-blur-sm bg-white/80 dark:bg-black/80 amoled:bg-black/80 shadow-lg hover:shadow-xl"
        aria-label="Ver estadísticas"
        title="Ver estadísticas"
      >
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 amoled:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 amoled:group-hover:text-gray-200 transition-colors">
          Stats
        </span>
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
            Estadísticas
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
        <div className="p-4">
          <EstadisticasUnificadas
            stats={profile.stats}
            userColor={profile.color}
          />
        </div>
      </div>
    </div>
  );
}
