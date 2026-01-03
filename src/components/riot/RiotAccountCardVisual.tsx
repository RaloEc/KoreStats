"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LinkedAccountRiot } from "@/types/riot";
import {
  getRankEmblemUrl,
  getTierColor,
  getTierDisplayName,
  calculateWinrate,
  getWinrateColor,
} from "@/lib/riot/rank-emblems";
import { getChampionNameById } from "@/lib/riot/helpers";
import { RankAnimatedBackground } from "./RankAnimatedBackground";
import { Loader2, RefreshCw, Unlink } from "lucide-react";
import Image from "next/image";

// Diccionario de regiones
const REGION_NAMES: Record<string, string> = {
  la1: "Latinoamérica",
  la2: "Latinoamérica Sur",
  na1: "Norteamérica",
  br1: "Brasil",
  euw1: "Europa Oeste",
  eun1: "Europa Nórdica",
  kr: "Corea",
  jp1: "Japón",
  ru: "Rusia",
  oc1: "Oceanía",
  ph2: "Filipinas",
  sg2: "Singapur",
  th2: "Tailandia",
  tw2: "Taiwán",
  vn2: "Vietnam",
  tr1: "Turquía",
  me1: "Oriente Medio",
};

interface RiotAccountCardVisualProps {
  account: LinkedAccountRiot;
  userId?: string;
  isLoading?: boolean;
  isSyncing?: boolean;
  syncError?: string | null;
  onSync?: () => void;
  onUnlink?: () => void;
  cooldownSeconds?: number;
  hideSync?: boolean;
}

/**
 * Tarjeta visual mejorada para mostrar información de Riot Games
 * Diseño tipo banner horizontal con emblema, información y estadísticas
 */
export function RiotAccountCardVisual({
  account,
  userId: propUserId,
  isLoading = false,
  isSyncing = false,
  syncError = null,
  onSync,
  onUnlink,
  cooldownSeconds = 0,
  hideSync = false,
}: RiotAccountCardVisualProps) {
  const [userId, setUserId] = useState<string | null>(
    propUserId ?? account.user_id ?? null
  );
  const [topChampionName, setTopChampionName] = useState<string | null>(null);

  const soloTier = account.solo_tier ?? account.tier ?? "UNRANKED";
  const soloRank = account.solo_rank ?? account.rank ?? "—";
  const soloLp = account.solo_league_points ?? account.league_points ?? 0;
  const soloWins = account.solo_wins ?? account.wins ?? 0;
  const soloLosses = account.solo_losses ?? account.losses ?? 0;

  const flexTier = account.flex_tier ?? "UNRANKED";
  const flexRank = account.flex_rank ?? "—";
  const flexLp = account.flex_league_points ?? 0;
  const flexWins = account.flex_wins ?? 0;
  const flexLosses = account.flex_losses ?? 0;

  const winrate = calculateWinrate(soloWins, soloLosses);
  const winrateColor = getWinrateColor(winrate);
  const tierColor = getTierColor(soloTier);
  const tierDisplayName = getTierDisplayName(soloTier);
  const emblemUrl = getRankEmblemUrl(soloTier);

  const queueStats = [
    {
      id: "solo",
      label: "Ranked Solo/Duo",
      tier: soloTier,
      rank: soloRank,
      lp: soloLp,
      wins: soloWins,
      losses: soloLosses,
    },
    {
      id: "flex",
      label: "Ranked Flex",
      tier: flexTier,
      rank: flexRank,
      lp: flexLp,
      wins: flexWins,
      losses: flexLosses,
    },
  ].map((queue) => ({
    ...queue,
    tierName: getTierDisplayName(queue.tier),
    tierColor: getTierColor(queue.tier),
    emblemUrl: getRankEmblemUrl(queue.tier),
    winrate: calculateWinrate(queue.wins, queue.losses),
    hasData:
      queue.tier !== "UNRANKED" ||
      queue.lp > 0 ||
      queue.wins + queue.losses > 0,
  }));

  // Obtener userId desde props, cuenta o como fallback desde localStorage
  useEffect(() => {
    if (propUserId) {
      setUserId(propUserId);
      return;
    }

    if (account.user_id) {
      setUserId(account.user_id);
      return;
    }

    const storedId = localStorage.getItem("user_id");
    if (storedId) {
      setUserId(storedId);
    }
  }, [account.user_id, propUserId]);

  // Obtener maestría de campeones con caché agresivo
  const { data: masteryData } = useQuery({
    queryKey: ["champion-mastery", account.puuid],
    queryFn: async () => {
      if (!userId || !account.puuid) {
        return null;
      }

      const response = await fetch("/api/riot/champion-mastery", {
        headers: {
          "x-user-id": userId,
          "x-puuid": account.puuid,
        },
      });

      if (!response.ok) {
        console.error(
          "[RiotAccountCardVisual] Error fetching mastery:",
          response.status
        );
        return null;
      }

      const data = await response.json();
      return data.masteries;
    },
    enabled: !!userId && !!account.puuid,
    retry: 1,
    staleTime: 1000 * 60 * 30, // 30 minutos - caché más agresivo
    gcTime: 1000 * 60 * 60, // 1 hora en memoria
  });

  const topChampionId = masteryData?.[0]?.championId ?? null;
  const hasSplash = Boolean(topChampionId);

  // Obtener nombre del campeón más usado cuando cambie el ID detectado
  useEffect(() => {
    let isMounted = true;

    async function loadTopChampionName() {
      if (!topChampionId) {
        if (isMounted) {
          setTopChampionName(null);
        }
        return;
      }

      const championName = await getChampionNameById(topChampionId);

      if (!isMounted) return;

      setTopChampionName((prev) =>
        championName && prev === championName ? prev : championName
      );
    }

    loadTopChampionName();

    return () => {
      isMounted = false;
    };
  }, [topChampionId]);

  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-[#0f111a] amoled:bg-black rounded-xl p-8 flex items-center justify-center min-h-[200px] border border-gray-200 dark:border-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 dark:text-blue-400" />
      </div>
    );
  }

  const regionName = REGION_NAMES[account.region] || account.region;

  return (
    <div className="w-full">
      {/* Main Card */}
      <div
        className={`relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md ${
          hasSplash
            ? "bg-gray-900"
            : "bg-white dark:bg-[#0f111a] amoled:bg-black"
        }`}
      >
        {/* Fondo: gradiente animado según tier */}
        <RankAnimatedBackground tier={soloTier} />

        <div className="relative z-10 p-4 md:p-5 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full md:items-center">
            <div className="flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-6 flex-1 min-h-[180px]">
              {/* Left: Profile Icon */}
              <div className="relative flex-shrink-0">
                <div className="relative w-20 h-20 md:w-22 md:h-22 rounded-full border-[3px] border-white/90 dark:border-[#1a1d26] shadow-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {account.profile_icon_id ? (
                    <Image
                      src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${account.profile_icon_id}.jpg`}
                      alt="Ícono del invocador"
                      fill
                      sizes="96px"
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                      {account.game_name
                        ? account.game_name.charAt(0).toUpperCase()
                        : "?"}
                    </div>
                  )}
                </div>
                {account.summoner_level && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-bold px-3 py-0.5 rounded-full border-2 border-white dark:border-[#1a1d26] shadow-sm whitespace-nowrap">
                    Lvl {account.summoner_level}
                  </div>
                )}
              </div>

              {/* Middle: Info */}
              <div className="flex-1 text-center md:text-left space-y-3 min-w-0 w-full flex flex-col justify-center">
                <div>
                  <h3
                    className={`text-2xl font-bold truncate ${
                      topChampionName
                        ? "text-white drop-shadow-lg"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {account.game_name}
                    <span className="text-gray-400 font-normal ml-1">
                      #{account.tag_line}
                    </span>
                  </h3>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                    <span
                      className={`text-sm font-medium ${
                        topChampionName
                          ? "text-gray-200 drop-shadow"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {regionName}
                    </span>
                  </div>
                </div>

                {/* Minimalist Winrate Bar */}
                <div className="max-w-xs mx-auto md:mx-0">
                  <div
                    className={`flex justify-between text-[11px] mb-1 font-medium ${
                      topChampionName
                        ? "text-gray-200"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    <span
                      className={
                        topChampionName
                          ? winrate >= 50
                            ? "text-green-300 drop-shadow"
                            : "text-gray-200"
                          : winrate >= 50
                          ? "text-green-500"
                          : "text-gray-500"
                      }
                    >
                      Winrate {winrate}%
                    </span>
                    <span>
                      {soloWins}W - {soloLosses}L
                    </span>
                  </div>
                  <div
                    className={`h-0.5 rounded-full overflow-hidden ${
                      topChampionName
                        ? "bg-white/20 backdrop-blur-sm"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}
                  >
                    <div
                      className={`h-full ${winrateColor} rounded-full`}
                      style={{ width: `${winrate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Queue Rankings (Desktop) */}
            <div className="w-full md:max-w-xs">
              <div className="grid grid-cols-2 gap-1.5 w-full">
                {queueStats.map((queue) => (
                  <div
                    key={queue.id}
                    className="relative overflow-hidden rounded-xl bg-white/10 border border-white/15 px-2.5 py-2 flex flex-col items-center text-center gap-1.5 text-white backdrop-blur-lg"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-white/60">
                      {queue.label}
                    </div>
                    <div className="relative w-24 h-24 opacity-100">
                      <Image
                        src={queue.emblemUrl}
                        alt={`${queue.label} emblem`}
                        fill
                        sizes="96px"
                        className="object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">
                        {queue.tierName} {queue.rank}
                      </p>
                      <p className="text-[10px] text-white/70">{queue.lp} LP</p>
                    </div>
                    <div className="text-[10px] text-white/70">
                      {queue.hasData ? (
                        <span>
                          {queue.wins}V - {queue.losses}D
                        </span>
                      ) : (
                        <span className="text-white/40">Sin datos</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de última actualización sutil fuera pero cerca */}
      <div className="mt-4 px-1 flex items-center justify-between gap-2">
        <div className="text-[10px] text-gray-500 font-medium opacity-70">
          {account.last_updated
            ? new Date(account.last_updated).toLocaleDateString("es-ES", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Pendiente"}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onSync && !hideSync && (
            <button
              onClick={onSync}
              disabled={isSyncing || cooldownSeconds > 0}
              className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw
                size={12}
                className={isSyncing ? "animate-spin" : ""}
              />
              <span className="text-[11px] font-bold">
                {isSyncing
                  ? "..."
                  : cooldownSeconds > 0
                  ? `${cooldownSeconds}s`
                  : "Actualizar"}
              </span>
            </button>
          )}

          {onUnlink && (
            <button
              onClick={onUnlink}
              className="flex items-center gap-1 py-1.5 px-2 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
            >
              <Unlink size={12} />
              <span className="text-[11px] font-bold">Desvincular</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
