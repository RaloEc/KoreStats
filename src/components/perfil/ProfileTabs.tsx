"use client";

import { Newspaper, Trophy, Users, BarChart3, Gamepad2, Swords } from "lucide-react";
import type { GameProfileModule } from "@/modules/types";

// Tabs del sistema base (no dependen de juegos)
export type BaseTab = "posts" | "friends" | "stats";
// Tabs dinámicos de juegos usan el slug del juego
export type ProfileTab = BaseTab | string;

interface ProfileTabsProps {
  /** Módulos de juegos que se deben mostrar como pestañas */
  gameModules?: GameProfileModule[];
  currentTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  isMobile?: boolean;
}

/**
 * Mapea el nombre de ícono de un módulo a un componente de Lucide.
 * Si no hay match, usa Gamepad2 como fallback.
 */
function getGameIcon(iconName?: string) {
  switch (iconName) {
    case "trophy":
      return Trophy;
    case "gamepad":
      return Gamepad2;
    case "swords":
      return Swords;
    default:
      return Gamepad2;
  }
}

export function ProfileTabs({
  gameModules = [],
  currentTab,
  onTabChange,
  isMobile = false,
}: ProfileTabsProps) {
  const tabButtonClass = (tabId: string) => {
    const isActive = currentTab === tabId;
    const isDelta = tabId === "delta-force";

    if (isDelta && isActive) {
      return `flex items-center gap-2 pb-3 px-2 text-sm md:text-base font-medium transition-all relative border-b-2 whitespace-nowrap text-lime-600 dark:text-lime-400 border-lime-600 dark:border-lime-400`;
    }

    return `flex items-center gap-2 pb-3 px-2 text-sm md:text-base font-medium transition-all relative border-b-2 whitespace-nowrap ${isActive
      ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-transparent"
      }`;
  };

  return (
    <div className="flex gap-2 sm:gap-4 md:gap-6 border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800 px-2 md:px-4 overflow-x-auto no-scrollbar">
      {/* Pestaña Actividad (siempre visible) */}
      <button onClick={() => onTabChange("posts")} className={tabButtonClass("posts")}>
        <Newspaper size={18} />
        <span>Actividad</span>
      </button>

      {/* Pestañas dinámicas de juegos (sistema modular) */}
      {gameModules.map((mod) => {
        const IconComponent = getGameIcon(mod.icon);
        return (
          <button
            key={mod.slug}
            onClick={() => onTabChange(mod.slug)}
            className={tabButtonClass(mod.slug)}
          >
            <IconComponent size={18} />
            <span>{mod.displayName}</span>
          </button>
        );
      })}

      {/* Pestañas adicionales solo para móvil */}
      {isMobile && (
        <>
          <button onClick={() => onTabChange("friends")} className={tabButtonClass("friends")}>
            <Users size={18} />
            <span>Amigos</span>
          </button>

          <button onClick={() => onTabChange("stats")} className={tabButtonClass("stats")}>
            <BarChart3 size={18} />
            <span>Estadísticas</span>
          </button>
        </>
      )}
    </div>
  );
}
