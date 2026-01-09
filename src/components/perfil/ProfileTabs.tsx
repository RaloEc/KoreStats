"use client";

import { Newspaper, Trophy, Users, BarChart3 } from "lucide-react";

export type ProfileTab = "posts" | "lol" | "friends" | "stats";

interface ProfileTabsProps {
  hasRiotAccount: boolean;
  currentTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  isMobile?: boolean;
}

export function ProfileTabs({
  hasRiotAccount,
  currentTab,
  onTabChange,
  isMobile = false,
}: ProfileTabsProps) {
  return (
    <div className="flex gap-2 sm:gap-4 md:gap-6 border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800 px-2 md:px-4 overflow-x-auto no-scrollbar">
      {/* Pestaña Actividad */}
      <button
        onClick={() => onTabChange("posts")}
        className={`flex items-center gap-2 pb-3 px-2 text-sm md:text-base font-medium transition-all relative border-b-2 whitespace-nowrap ${
          currentTab === "posts"
            ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-transparent"
        }`}
      >
        <Newspaper size={18} />
        <span>Actividad</span>
      </button>

      {/* Pestaña League of Legends */}
      {hasRiotAccount && (
        <button
          onClick={() => onTabChange("lol")}
          className={`flex items-center gap-2 pb-3 px-2 text-sm md:text-base font-medium transition-all relative border-b-2 whitespace-nowrap ${
            currentTab === "lol"
              ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-transparent"
          }`}
        >
          <Trophy size={18} />
          <span>League of Legends</span>
        </button>
      )}

      {/* Pestañas adicionales solo para móvil */}
      {isMobile && (
        <>
          <button
            onClick={() => onTabChange("friends")}
            className={`flex items-center gap-2 pb-3 px-2 text-sm md:text-base font-medium transition-all relative border-b-2 whitespace-nowrap ${
              currentTab === "friends"
                ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-transparent"
            }`}
          >
            <Users size={18} />
            <span>Amigos</span>
          </button>

          <button
            onClick={() => onTabChange("stats")}
            className={`flex items-center gap-2 pb-3 px-2 text-sm md:text-base font-medium transition-all relative border-b-2 whitespace-nowrap ${
              currentTab === "stats"
                ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-transparent"
            }`}
          >
            <BarChart3 size={18} />
            <span>Estadísticas</span>
          </button>
        </>
      )}
    </div>
  );
}
