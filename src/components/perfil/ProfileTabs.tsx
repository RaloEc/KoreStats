"use client";

import { Newspaper, Trophy } from "lucide-react";

export type ProfileTab = "posts" | "lol";

interface ProfileTabsProps {
  hasRiotAccount: boolean;
  currentTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export function ProfileTabs({
  hasRiotAccount,
  currentTab,
  onTabChange,
}: ProfileTabsProps) {
  return (
    <div className="flex gap-4 md:gap-6 border-b border-gray-200 dark:border-gray-800 amoled:border-gray-800 px-2 md:px-4">
      {/* Pestaña Actividad */}
      <button
        onClick={() => onTabChange("posts")}
        className={`flex items-center gap-2 pb-3 px-2 text-sm md:text-base font-medium transition-all relative ${
          currentTab === "posts"
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
      >
        <Newspaper size={18} />
        <span>Actividad</span>
        {currentTab === "posts" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
        )}
      </button>

      {/* Pestaña League of Legends */}
      <button
        onClick={() => onTabChange("lol")}
        className={`flex items-center gap-2 pb-3 px-2 text-sm md:text-base font-medium transition-all relative ${
          currentTab === "lol"
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
      >
        <Trophy size={18} />
        <span>League of Legends</span>
        {currentTab === "lol" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
        )}
      </button>
    </div>
  );
}
