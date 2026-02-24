"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinkedAccountRiot } from "@/types/riot";
import { useLiveGameRealtime } from "@/hooks/use-live-game-realtime";
import { usePlayerLiveStatus } from "@/hooks/use-player-live-status";
import {
  getRankEmblemUrl,
  getTierColor,
  getTierDisplayName,
  calculateWinrate,
  getWinrateColor,
} from "@/lib/riot/rank-emblems";
import { getChampionNameById } from "@/lib/riot/helpers";
import { RankAnimatedBackground } from "./RankAnimatedBackground";
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  Trophy,
  Target,
  Flame,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChampionCenteredSplash } from "./ChampionCenteredSplash";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveGameBanner } from "./LiveGameBanner";

// Diccionario de regiones
const REGION_NAMES: Record<string, string> = {
  la1: "LAN",
  la2: "LAS",
  na1: "NA",
  br1: "BR",
  euw1: "EUW",
  eun1: "EUNE",
  kr: "KR",
  jp1: "JP",
  ru: "RU",
  oc1: "OCE",
  ph2: "PH",
  sg2: "SG",
  th2: "TH",
  tw2: "TW",
  vn2: "VN",
  tr1: "TR",
  me1: "ME",
};

const LOG_REGIONS: Record<string, string> = {
  la1: "lan",
  la2: "las",
  na1: "na",
  br1: "br",
  euw1: "euw",
  eun1: "eune",
  kr: "kr",
  jp1: "jp",
  tr1: "tr",
  ru: "ru",
  oc1: "oce",
  ph2: "ph",
  sg2: "sg",
  th2: "th",
  tw2: "tw",
  vn2: "vn",
};

const PHASE_LABELS: Record<
  string,
  { label: string; color: string; textColor: string }
> = {
  InProgress: {
    label: "EN PARTIDA",
    color: "bg-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  ChampSelect: {
    label: "SELECCIÓN",
    color: "bg-blue-500",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  Matchmaking: {
    label: "BUSCANDO",
    color: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  ReadyCheck: {
    label: "ACEPTANDO",
    color: "bg-purple-500",
    textColor: "text-purple-600 dark:text-purple-400",
  },
  Lobby: {
    label: "SALA",
    color: "bg-slate-400",
    textColor: "text-slate-600 dark:text-slate-400",
  },
};

interface MatchSimple {
  match_id: string;
  game_creation: number;
  game_duration: number;
  game_mode: string;
  queue_id: number;
  champion_id: number;
  champion_name: string;
  win: boolean;
  kda?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  lane?: string;
  role?: string;
  total_minions_killed?: number;
  neutral_minions_killed?: number;
  vision_score?: number;
  total_damage_dealt_to_champions?: number;
  matches?: {
    game_duration: number;
    game_creation: number;
    queue_id: number;
  };
}

interface ProAccountCardVisualProps {
  account: LinkedAccountRiot;
  userId?: string;
  isLoading?: boolean;
  isSyncing?: boolean;
  syncError?: string | null;
  onSync?: () => void;
  cooldownSeconds?: number;
  hideSync?: boolean;
  profileColor?: string;
  staticData?: any;
}

export default function ProAccountCardVisual({
  account,
  userId: propUserId,
  isLoading = false,
  isSyncing = false,
  syncError = null,
  onSync,
  cooldownSeconds = 0,
  hideSync = false,
  profileColor,
  staticData,
}: ProAccountCardVisualProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { gameData: realtimeData, isStale: isRealtimeStale } =
    useLiveGameRealtime(isMounted ? account.puuid : undefined);
  const playerStatus = usePlayerLiveStatus(
    isMounted ? account.puuid : undefined,
  );

  const rawPhase = realtimeData?.phase;

  // Si no hay phase en realtimeData, pero si en staticData (Riot API fallback)
  const phase =
    rawPhase && rawPhase !== "None" && rawPhase !== "EndOfGame"
      ? rawPhase
      : staticData?.hasActiveMatch
        ? staticData.phase || "InProgress"
        : rawPhase;

  const phaseConfig = phase ? PHASE_LABELS[phase] : null;

  const [userId, setUserId] = useState<string | null>(
    propUserId ?? account.user_id ?? "00000000-0000-0000-0000-000000000000",
  );
  const [topChampionName, setTopChampionName] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // --- Datos de Rango ---
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

  const queueStats = [
    {
      id: "solo",
      label: "Solo / Duo",
      icon: <Target className="w-3 h-3" />,
      tier: soloTier,
      rank: soloRank,
      lp: soloLp,
      wins: soloWins,
      losses: soloLosses,
    },
    {
      id: "flex",
      label: "Flex",
      icon: <Trophy className="w-3 h-3" />,
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

  // Queries
  const { data: masteryData } = useQuery({
    queryKey: ["champion-mastery", account.puuid],
    queryFn: async () => {
      const response = await fetch("/api/riot/champion-mastery", {
        headers: {
          "x-user-id": userId || "00000000-0000-0000-0000-000000000000",
          "x-puuid": account.puuid,
          "x-region": account.active_shard || account.region || "la1",
        },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.masteries;
    },
    enabled: !!account.puuid,
    staleTime: 1000 * 60 * 60,
  });

  const { data: recentMatchesData } = useQuery({
    queryKey: ["recent-matches-stats", account.puuid],
    queryFn: async () => {
      const response = await fetch(
        `/api/riot/matches?puuid=${account.puuid}&limit=20&summary=true`,
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.matches as MatchSimple[];
    },
    enabled: !!account.puuid,
    staleTime: 1000 * 60 * 10,
  });

  const topChampionId = masteryData?.[0]?.championId ?? null;

  useEffect(() => {
    if (topChampionId) {
      getChampionNameById(topChampionId).then((name) =>
        setTopChampionName(name),
      );
    }
  }, [topChampionId]);

  const topMastery = useMemo(
    () => masteryData?.slice(0, 3) || [],
    [masteryData],
  );

  const recentStats = useMemo(() => {
    if (!recentMatchesData || recentMatchesData.length === 0) return [];
    const last20 = recentMatchesData.slice(0, 20);
    const champMap = new Map<number, any>();
    last20.forEach((m) => {
      if (!m.champion_id) return;
      const current = champMap.get(m.champion_id) || {
        id: m.champion_id,
        name: m.champion_name,
        count: 0,
        wins: 0,
      };
      current.count++;
      if (m.win) current.wins++;
      champMap.set(m.champion_id, current);
    });
    return Array.from(champMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [recentMatchesData]);

  // --- NUEVOS CALCULOS ---

  // 1. Roles Preferidos
  const roleStats = useMemo(() => {
    if (!recentMatchesData || recentMatchesData.length === 0) return [];

    const roleCounts = new Map<string, { count: number; wins: number }>();
    let validGames = 0;

    recentMatchesData.forEach((m) => {
      let role = "UNKNOWN";

      // Mapeo simple de lane -> role
      if (m.lane === "JUNGLE") role = "JUNGLE";
      else if (m.lane === "TOP") role = "TOP";
      else if (m.lane === "MIDDLE" || m.lane === "MID") role = "MIDDLE";
      else if (m.lane === "BOTTOM" || m.lane === "BOT") {
        // Distinguir ADC vs Support
        role =
          m.role === "DUO_SUPPORT" || m.role === "SUPPORT"
            ? "UTILITY"
            : "BOTTOM";
      }

      if (role === "UNKNOWN") return; // Skip unknown

      const current = roleCounts.get(role) || { count: 0, wins: 0 };

      current.count++;
      if (m.win) current.wins++;
      roleCounts.set(role, current);
      validGames++;
    });

    if (validGames === 0) return [];

    return Array.from(roleCounts.entries())
      .map(([role, stats]) => ({
        role,
        count: stats.count,
        percentage: Math.round((stats.count / validGames) * 100),
        winrate: Math.round((stats.wins / stats.count) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 2); // Top 2 roles
  }, [recentMatchesData]);

  // 1.5. Partida en Vivo (Mini)
  const currentPlayerInGame = useMemo(() => {
    // 1. Intentar con realtimeData (más rico en detalles)
    if (realtimeData?.livePlayers && realtimeData.livePlayers.length > 0) {
      const targetPuuid = account.puuid;
      const targetName = account.game_name?.toLowerCase();

      return realtimeData.livePlayers.find(
        (p) =>
          (p.puuid && p.puuid === targetPuuid) ||
          (p.summonerName && p.summonerName.toLowerCase() === targetName) ||
          (p.riotId && p.riotId.toLowerCase() === targetName),
      );
    }

    // 2. Fallback a staticData (Riot API)
    if (staticData?.hasActiveMatch && staticData.teams) {
      const allPlayers = [
        ...(staticData.teams.team100 || []),
        ...(staticData.teams.team200 || []),
      ];
      const targetPuuid = account.puuid;
      const targetName = account.game_name?.toLowerCase();

      return allPlayers.find(
        (p: any) =>
          (p.puuid && p.puuid === targetPuuid) ||
          (p.summonerName && p.summonerName.toLowerCase() === targetName),
      );
    }

    return null;
  }, [realtimeData, account, staticData]);

  // Calcular datos adicionales de la partida en vivo
  const liveGameData = useMemo(() => {
    if (!currentPlayerInGame) return null;

    // Si los datos de realtime están estancados, priorizar staticData para duracion
    const useStaticFallback = isRealtimeStale && staticData?.hasActiveMatch;

    // Obtener duración del juego (usar staticData si realtime está estancado)
    const gameDuration = useStaticFallback
      ? (staticData?.elapsedSeconds ?? 0)
      : (realtimeData?.gameData?.gameTime ?? staticData?.elapsedSeconds ?? 0);

    // Obtener nombre de la cola
    const getQueueName = () => {
      // Intentar obtener de realtimeData primero (si no está estancado)
      if (!useStaticFallback) {
        const queueDesc = (realtimeData?.gameData as any)?.queue?.description;
        if (queueDesc && typeof queueDesc === "string") {
          if (queueDesc.includes("Solo/Dúo")) return "Solo/Dúo";
          if (queueDesc.includes("Flex")) return "Flex 5:5";
          if (queueDesc.includes("ARAM")) return "ARAM";
          if (queueDesc.includes("Normal")) return "Normal";
          return queueDesc;
        }
      }

      // Fallback a gameMode (de staticData si está estancado)
      const gameMode = useStaticFallback
        ? staticData?.gameMode
        : (realtimeData?.gameData?.gameMode ?? staticData?.gameMode);
      if (gameMode === "ARAM") return "ARAM";
      if (gameMode === "CLASSIC") return "Normal";

      return null;
    };

    // Calcular score del equipo (solo si realtime no está estancado)
    const teamScore =
      !useStaticFallback && realtimeData?.livePlayers
        ? {
            blue: realtimeData.livePlayers
              .filter((p) => p.teamId === 100)
              .reduce((sum, p) => sum + (p.kills || 0), 0),
            red: realtimeData.livePlayers
              .filter((p) => p.teamId === 200)
              .reduce((sum, p) => sum + (p.kills || 0), 0),
          }
        : undefined;

    return {
      championName: currentPlayerInGame.championName,
      championId: currentPlayerInGame.championId,
      kills: currentPlayerInGame.kills || 0,
      deaths: currentPlayerInGame.deaths || 0,
      assists: currentPlayerInGame.assists || 0,
      queueName: getQueueName(),
      gameDuration,
      teamScore,
      teamId: currentPlayerInGame.teamId,
      phase,
      isStale: isRealtimeStale, // Indicar si los datos están estancados
      isApiFallback: !realtimeData && !!staticData?.hasActiveMatch,
    };
  }, [currentPlayerInGame, realtimeData, staticData, phase, isRealtimeStale]);

  // 2. Estadísticas Promedio (Farming, Vision, DPM)
  const averageStats = useMemo(() => {
    if (!recentMatchesData || recentMatchesData.length === 0) return null;

    let totalCsPerMin = 0;
    let totalVisionPerMin = 0;
    let totalKda = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let count = 0;

    recentMatchesData.forEach((m) => {
      const duration = m.matches?.game_duration || m.game_duration || 0;
      const durationMin = duration / 60;
      if (durationMin < 5) return; // Ignorar remakes muy cortos

      const cs =
        (m.total_minions_killed || 0) + (m.neutral_minions_killed || 0);
      const vision = m.vision_score || 0;

      totalCsPerMin += cs / durationMin;
      totalVisionPerMin += vision / durationMin;

      // Calcular KDA de esta partida
      const kills = m.kills || 0;
      const deaths = m.deaths === 0 ? 1 : m.deaths || 1; // Evitar división por cero
      const assists = m.assists || 0;
      const kda = (kills + assists) / deaths;

      totalKda += kda;
      totalKills += kills;
      totalDeaths += m.deaths || 0;
      totalAssists += assists;
      count++;
    });

    if (count === 0) return null;

    return {
      csPerMin: (totalCsPerMin / count).toFixed(1),
      visionPerMin: (totalVisionPerMin / count).toFixed(1),
      kda: (totalKda / count).toFixed(2),
      avgKills: (totalKills / count).toFixed(1),
      avgDeaths: (totalDeaths / count).toFixed(1),
      avgAssists: (totalAssists / count).toFixed(1),
    };
  }, [recentMatchesData]);

  if (isLoading)
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  const regionName = REGION_NAMES[account.region] || account.region;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="relative overflow-hidden rounded-3xl border-2 border-slate-200/60 dark:border-white/10 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#0a0c10] dark:to-[#0f1419] group shadow-xl">
        {/* Banner Splash (Fondo Común) */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          {topChampionName ? (
            <div className="relative w-full h-full">
              <ChampionCenteredSplash
                champion={topChampionName}
                className="opacity-15 dark:opacity-25 grayscale-[50%] scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/95 to-slate-50/60 dark:from-[#0a0c10] dark:via-[#0a0c10]/90 dark:to-[#0a0c10]/40" />
            </div>
          ) : (
            <RankAnimatedBackground
              tier={soloTier}
              className="opacity-10 dark:opacity-20"
            />
          )}
        </div>

        {/* --- MOBILE HEADER (Visible only on small screens) --- */}
        <div
          className={`lg:hidden relative z-20 p-4 flex items-center justify-between ${
            isExpanded
              ? "border-b border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-black/20"
              : ""
          } backdrop-blur-sm transition-colors duration-300`}
        >
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-slate-300 dark:border-white/10 overflow-hidden shadow-sm">
                <Image
                  src={`https://cdn.communitydragon.org/latest/profile-icon/${account.profile_icon_id}`}
                  alt="Icon"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10 shadow-sm">
                {account.summoner_level}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-0.5">
                <Badge
                  variant="outline"
                  className="h-4 px-1 text-[9px] font-bold uppercase tracking-wider border-slate-300 dark:border-white/20 text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-black/20 rounded-sm"
                >
                  {regionName}
                </Badge>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-none flex items-center gap-1">
                {account.game_name}
                <span className="text-slate-400 dark:text-slate-500 font-medium text-sm">
                  {account.tag_line}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-10 w-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>
            {!isExpanded && (
              <span className="text-[8px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest">
                {account.last_updated
                  ? new Date(account.last_updated).toLocaleDateString()
                  : ""}
              </span>
            )}
          </div>
        </div>

        {/* Live Game Banner - Visible en todas las pantallas cuando hay partida */}
        {liveGameData && phase && phase !== "None" && phase !== "EndOfGame" && (
          <div className="relative z-20 px-4 pt-3 pb-2">
            <LiveGameBanner {...liveGameData} />
          </div>
        )}

        {/* --- MAIN CONTENT (Collapsible on mobile, always visible on desktop) --- */}
        <div
          className={`
          relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-0 transition-all duration-300 ease-in-out
          ${isExpanded ? "block" : "hidden lg:grid"}
        `}
        >
          {/* Left Column: Identidad y Rangos */}
          <div className="lg:col-span-5 lg:row-span-2 p-4 lg:p-6 lg:border-r border-slate-200 dark:border-white/5 bg-gradient-to-b from-white/5 to-transparent flex flex-col h-full justify-between">
            {/* Top Content (Header + Ranks) */}
            <div className="flex flex-col gap-6 flex-1 min-h-0">
              {/* Desktop Header (Hidden on Mobile) */}
              <div className="hidden lg:flex justify-between items-start">
                <div className="flex items-center gap-5">
                  {/* Profile Icon with Level Badge */}
                  <div className="relative flex-shrink-0">
                    <div className="relative w-16 h-16 rounded-full border-2 border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl ring-4 ring-slate-100/50 dark:ring-white/5">
                      <Image
                        src={`https://cdn.communitydragon.org/latest/profile-icon/${account.profile_icon_id}`}
                        alt="Icon"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg z-10 whitespace-nowrap leading-none">
                      {account.summoner_level}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className="uppercase font-bold text-[9px] px-1.5 h-4 tracking-widest border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5"
                      >
                        {regionName}
                      </Badge>
                    </div>

                    {/* Name & Hashtag */}
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-unbounded leading-none flex items-baseline gap-1">
                        {account.game_name ||
                          (account as any).summoner_name ||
                          "Unknown"}
                        <span className="text-base font-medium text-slate-400 dark:text-white/20">
                          #
                          {(
                            account.tag_line ||
                            (account as any).tagLine ||
                            (account as any).tag_line ||
                            "RIOT"
                          )
                            .toString()
                            .replace("#", "")}
                        </span>
                      </h2>
                    </div>

                    {/* Winrate Bar Section */}
                    <div className="mt-2.5 w-full max-w-[180px]">
                      <div className="flex justify-between items-end mb-1">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider ${winrate >= 50 ? "text-emerald-500" : "text-rose-500"}`}
                        >
                          {winrate}% WR
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest">
                          {soloWins}W {soloLosses}L
                        </span>
                      </div>
                      <div className="h-1 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${winrate >= 50 ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: `${winrate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clasificatorias (Takes remaining space) */}
              <div className="flex-1 min-h-0 mt-4 pb-4">
                <div className="grid grid-cols-2 gap-4 h-full">
                  {queueStats.map((queue) => (
                    <div
                      key={queue.id}
                      className="relative bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center group/card transition-all hover:bg-white/80 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-sm h-full"
                    >
                      <div className="absolute top-3 right-3 text-[9px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest">
                        {queue.label === "Solo / Duo" ? "SOLO" : "FLEX"}
                      </div>
                      <div className="relative w-24 h-24 my-auto transition-transform group-hover/card:scale-110 duration-300">
                        <Image
                          src={queue.emblemUrl}
                          alt={queue.label}
                          fill
                          unoptimized
                          className="object-contain drop-shadow-2xl"
                        />
                      </div>
                      <div className="text-center w-full mt-auto pb-1">
                        <div className="text-lg font-black text-slate-800 dark:text-white capitalize leading-tight mb-1">
                          {queue.tierName.charAt(0).toUpperCase() +
                            queue.tierName.slice(1).toLowerCase()}{" "}
                          <span className="text-slate-500 dark:text-white/60 font-medium">
                            {queue.rank}
                          </span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs font-bold opacity-80">
                          <span className="text-slate-600 dark:text-white/50">
                            {queue.hasData ? `${queue.lp} LP` : "—"}
                          </span>
                          {queue.hasData && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-white/20" />
                              <span
                                className={`${
                                  queue.winrate >= 50
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {queue.winrate}% WR
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions (Pinned to Bottom) */}
            <div className="mt-auto flex gap-3 flex-shrink-0">
              {onSync && !hideSync && (
                <Button
                  onClick={onSync}
                  disabled={isSyncing || cooldownSeconds > 0}
                  className="flex-1 h-10 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-600/20 font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-none"
                >
                  {isSyncing ? (
                    <Loader2 className="animate-spin w-3.5 h-3.5" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-2">
                    {isSyncing
                      ? "..."
                      : cooldownSeconds > 0
                        ? `${cooldownSeconds}s`
                        : "Actualizar"}
                  </span>
                </Button>
              )}
              {account.puuid && (
                <a
                  href={`https://www.leagueofgraphs.com/summoner/${LOG_REGIONS[account.region] || account.region}/${account.game_name?.replace(/\s+/g, "+")}-${account.tag_line}`}
                  target="_blank"
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-slate-500 dark:text-white/40"
                >
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
          </div>

          {/* Right Column: Stats Grid */}
          <div className="lg:col-span-7 p-4 lg:p-6 flex flex-col justify-center h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {/* 1. Rendimiento Promedio (Top Priority) */}
              <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col h-full justify-between">
                <h4 className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-slate-500 dark:text-white/30 mb-2 capitalize">
                  <Zap className="w-3.5 h-3.5" /> Promedio
                </h4>

                {averageStats ? (
                  <div className="flex-1 flex items-center">
                    <div className="w-full flex items-center justify-between bg-slate-500/5 rounded-xl px-4 py-3 border border-slate-200/50 dark:border-white/5">
                      {/* KDA Block */}
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {averageStats.avgKills}
                            <span className="text-slate-300 dark:text-white/20 mx-0.5">
                              /
                            </span>
                            {averageStats.avgDeaths}
                            <span className="text-slate-300 dark:text-white/20 mx-0.5">
                              /
                            </span>
                            {averageStats.avgAssists}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">
                          {averageStats.kda} KDA
                        </span>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-2" />

                      {/* CS/Min Block */}
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                          {averageStats.csPerMin}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">
                          CS/Min
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400">
                    Sin datos
                  </div>
                )}
              </div>

              {/* 2. Roles Preferidos */}
              <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col h-full justify-between">
                <h4 className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-slate-500 dark:text-white/30 mb-2 capitalize">
                  <Target className="w-3.5 h-3.5" /> Roles
                </h4>
                <div className="flex-1 flex flex-col justify-center space-y-3">
                  {roleStats.length > 0 ? (
                    roleStats.map((role) => (
                      <div key={role.role} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center p-1.5 flex-shrink-0">
                          <Image
                            src={`https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/svg/position-${
                              role.role === "UTILITY"
                                ? "support"
                                : role.role.toLowerCase()
                            }.svg`}
                            alt={role.role}
                            width={24}
                            height={24}
                            className="opacity-60 dark:opacity-80 invert dark:invert-0"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-slate-700 dark:text-white uppercase tracking-wider truncate">
                              {role.role === "UTILITY" ? "SUPPORT" : role.role}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-white/50">
                              {role.winrate}% WR
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${role.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400">
                      Sin datos
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Últimas 20 */}
              <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col h-full justify-between">
                <h4 className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-slate-500 dark:text-white/30 mb-2 capitalize">
                  <Activity className="w-3.5 h-3.5" /> Recientes
                </h4>
                <div className="flex-1 flex items-center justify-around gap-2">
                  {recentStats.map((stat) => (
                    <div
                      key={stat.id}
                      className="flex flex-col items-center gap-2 group/champ"
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-white/10 ring-2 ring-transparent group-hover/champ:ring-blue-500/30 transition-all">
                        <Image
                          src={`https://cdn.communitydragon.org/latest/champion/${stat.id}/square`}
                          alt={stat.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div
                        className={`text-[9px] font-black rounded-md px-1.5 py-0.5 ${Math.round((stat.wins / stat.count) * 100) >= 50 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}
                      >
                        {Math.round((stat.wins / stat.count) * 100)}%
                      </div>
                    </div>
                  ))}
                  {recentStats.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400">
                      Sin datos
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Maestría */}
              <div className="bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col h-full justify-between">
                <h4 className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-slate-500 dark:text-white/30 mb-2 capitalize">
                  <Flame className="w-3.5 h-3.5" /> Maestría
                </h4>
                <div className="flex-1 flex items-center justify-around gap-2">
                  {topMastery.map((mastery) => (
                    <div
                      key={mastery.championId}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-white/10 grayscale-[30%] hover:grayscale-0 transition-all">
                        <Image
                          src={`https://cdn.communitydragon.org/latest/champion/${mastery.championId}/square`}
                          alt="Champ"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="text-[9px] font-bold text-slate-600 dark:text-white/60">
                        {(mastery.championPoints / 1000).toFixed(0)}k
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info (Updated Time) - Aligned to Right Column */}
          <div className="lg:col-start-6 lg:col-span-7 px-4 lg:px-6 pb-0.5 flex justify-end items-end">
            <div className="text-[9px] font-bold text-slate-400 dark:text-white/10 uppercase tracking-[0.2em]">
              SINC:{" "}
              {account.last_updated
                ? new Date(account.last_updated).toLocaleDateString()
                : "N/A"}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
