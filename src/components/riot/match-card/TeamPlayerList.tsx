"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { getChampionImageUrl } from "./helpers";

interface TeamPlayerListProps {
  players: any[];
  currentPuuid: string;
  version: string;
  linkedAccountsMap?: Record<string, string>;
  disableLinks?: boolean;
}

export function TeamPlayerList({
  players,
  currentPuuid,
  version,
  linkedAccountsMap = {},
  disableLinks = false,
}: TeamPlayerListProps) {
  const router = useRouter();

  const handleProfileNavigation = useCallback(
    (profileUserId: string) => {
      router.push(`/perfil/${profileUserId}?tab=lol`);
    },
    [router],
  );

  return (
    <div className="flex flex-col gap-0.5">
      {players.map((player: any, idx: number) => {
        const isCurrentPlayer = player.puuid === currentPuuid;
        const profileUserId = linkedAccountsMap[player.puuid];
        const hasProfile = Boolean(profileUserId);

        const linkedHighlightClasses =
          hasProfile && !isCurrentPlayer
            ? "border border-emerald-500/30 bg-emerald-500/5"
            : "";

        const content = (
          <div
            className={`flex items-center gap-1 px-1 py-0.5 rounded transition-colors ${
              isCurrentPlayer
                ? "bg-blue-500/30 font-semibold"
                : hasProfile
                  ? "hover:bg-white/10 cursor-pointer"
                  : ""
            } ${linkedHighlightClasses}`}
          >
            <div className="relative w-4 h-4 rounded overflow-hidden flex-shrink-0 border border-slate-700">
              <Image
                src={getChampionImageUrl(player.championName, version)}
                alt={player.championName}
                fill
                sizes="16px"
                className="object-cover"
              />
            </div>
            <span
              className={`text-[10px] truncate max-w-[70px] ${
                isCurrentPlayer
                  ? "text-blue-600 dark:text-blue-200"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {player.riotIdGameName || player.summonerName || "Unknown"}
            </span>
          </div>
        );

        if (profileUserId && !disableLinks) {
          return (
            <div
              key={`${player.puuid}-${idx}`}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.metaKey || e.ctrlKey) {
                  window.open(`/perfil/${profileUserId}?tab=lol`, "_blank");
                  return;
                }
                handleProfileNavigation(profileUserId);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") {
                  return;
                }
                e.preventDefault();
                e.stopPropagation();
                handleProfileNavigation(profileUserId);
              }}
              className="block w-full text-left bg-transparent border-0 p-0"
            >
              {content}
            </div>
          );
        }

        return <div key={`${player.puuid}-${idx}`}>{content}</div>;
      })}
    </div>
  );
}
