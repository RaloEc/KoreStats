"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Loader2,
  RefreshCw,
  Unlink,
  ExternalLink,
  Shield,
  Trophy,
  Target,
  Flame,
  Zap,
  Activity,
  Award,
  History,
  Users,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChampionCenteredSplash } from "./ChampionCenteredSplash";
import { Badge } from "@/components/ui/badge";

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

// Mapeo de regiones para League of Graphs
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

// Helper para convertir HEX a RGB
function hexToRgb(hex: string): string | null {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}`
    : null;
}

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
  matches?: {
    full_json?: {
      info?: {
        participants: {
          puuid: string;
          teamId: number;
          riotIdGameName: string;
          riotIdTagline: string;
          profileIcon: number;
          win: boolean;
          pentaKills?: number;
          quadraKills?: number;
          tripleKills?: number;
        }[];
      };
    };
  };
}

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
  profileColor?: string;
}

// ... existing interfaces ...

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
  profileColor,
}: RiotAccountCardVisualProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(
    propUserId ?? account.user_id ?? null
  );
  const [topChampionName, setTopChampionName] = useState<string | null>(null);

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

  // Configuración de tarjetas de rango
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

  // --- Efectos de inicialización ---
  useEffect(() => {
    if (propUserId) {
      setUserId(propUserId);
    } else if (account.user_id) {
      setUserId(account.user_id);
    } else {
      const storedId = localStorage.getItem("user_id");
      if (storedId) setUserId(storedId);
    }
  }, [account.user_id, propUserId]);

  // --- Queries de Datos - OPTIMIZADAS para carga instantánea ---
  const queryClient = useQueryClient();

  // Query global para obtener PUUIDs de jugadores registrados
  const { data: linkedAccountsData } = useQuery<{
    accounts: { puuid: string; publicId: string }[];
  }>({
    queryKey: ["linked-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/riot/linked-accounts");
      if (!res.ok) return { accounts: [] };
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
  });

  const linkedAccountsMap = useMemo(() => {
    const accs = linkedAccountsData?.accounts ?? [];
    return accs.reduce<Record<string, string>>((acc, curr) => {
      if (curr.publicId) acc[curr.puuid] = curr.publicId;
      return acc;
    }, {});
  }, [linkedAccountsData]);

  // Intentar obtener datos del caché del historial de partidas (compartido)
  const cachedHistoryData = queryClient.getQueryData<any>([
    "match-history",
    userId,
    "all",
  ]);
  // ... rest of the code ...
  const cachedMatchesFromHistory =
    cachedHistoryData?.pages?.flatMap((p: any) => p.matches ?? []) ?? [];

  // 1. Maestría de Campeones - con caché agresivo
  const { data: masteryData } = useQuery({
    queryKey: ["champion-mastery", account.puuid],
    queryFn: async () => {
      if (!userId || !account.puuid) return null;
      const response = await fetch("/api/riot/champion-mastery", {
        headers: { "x-user-id": userId, "x-puuid": account.puuid },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.masteries; // Array ordenado por puntos
    },
    enabled: !!userId && !!account.puuid,
    staleTime: 1000 * 60 * 60, // 1 hora - las maestrías cambian muy poco
    gcTime: 1000 * 60 * 120, // 2 horas en memoria
    refetchOnMount: false, // No refetch si hay datos frescos
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData, // Mostrar datos anteriores mientras carga
  });

  // 2. Partidas Recientes - OPTIMIZADO: Reutiliza caché del historial
  const { data: recentMatchesData } = useQuery({
    queryKey: ["recent-matches-stats", account.puuid],
    queryFn: async () => {
      if (!userId) return null;
      // Pedimos 25 para asegurar tener 20 válidas si hay filtrado
      const response = await fetch(
        `/api/riot/matches?userId=${userId}&limit=25`
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.matches as MatchSimple[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutos - sincronizado con historial
    gcTime: 1000 * 60 * 60, // 1 hora en memoria
    refetchOnMount: false, // CLAVE: No refetch si hay datos frescos
    refetchOnWindowFocus: false,
    // CLAVE: Usa datos del caché del historial si existen, para carga instantánea
    placeholderData:
      cachedMatchesFromHistory.length > 0
        ? cachedMatchesFromHistory.slice(0, 25)
        : undefined,
  });

  // --- Procesamiento de Datos ---

  const topChampionId = masteryData?.[0]?.championId ?? null;

  // Actualizar Main Champ Name
  useEffect(() => {
    let isMounted = true;
    async function loadTopChampionName() {
      if (!topChampionId) {
        if (isMounted) setTopChampionName(null);
        return;
      }
      const championName = await getChampionNameById(topChampionId);
      if (!isMounted) return;
      setTopChampionName(championName);
    }
    loadTopChampionName();
    return () => {
      isMounted = false;
    };
  }, [topChampionId]);

  // Top 3 Maestría
  const topMastery = useMemo(() => {
    return masteryData?.slice(0, 3) || [];
  }, [masteryData]);

  // Calcular Stats de Últimas 20 Partidas
  const recentStats = useMemo(() => {
    if (!recentMatchesData || recentMatchesData.length === 0) return [];

    // Tomar las últimas 20 para stats de campeones
    const last20 = recentMatchesData.slice(0, 20);
    const champMap = new Map<
      number,
      {
        id: number;
        name: string;
        count: number;
        wins: number;
      }
    >();

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
      .sort((a, b) => b.count - a.count || b.wins - a.wins)
      .slice(0, 3); // Top 3 recientes
  }, [recentMatchesData]);

  // CALCULO: Duo Frecuente
  const frequentDuo = useMemo(() => {
    if (!recentMatchesData || recentMatchesData.length === 0 || !account.puuid)
      return null;

    const duoMap = new Map<
      string,
      {
        puuid: string;
        name: string;
        tag: string;
        icon: number;
        count: number;
        wins: number;
      }
    >();

    recentMatchesData.forEach((match) => {
      // Necesitamos el json completo
      if (!match.matches?.full_json?.info?.participants) return;

      const participants = match.matches.full_json.info.participants;
      const me = participants.find((p) => p.puuid === account.puuid);

      if (!me) return; // No debería pasar si es mi historial

      participants.forEach((p) => {
        if (p.puuid === account.puuid) return; // Soy yo
        if (p.teamId !== me.teamId) return; // Equipo enemigo

        // Es un compañero
        // Usamos PUUID como key
        const key = p.puuid;
        const current = duoMap.get(key) || {
          puuid: p.puuid,
          name: p.riotIdGameName || "Unknown",
          tag: p.riotIdTagline || "",
          icon: p.profileIcon,
          count: 0,
          wins: 0,
        };
        current.count++;
        if (me.win) current.wins++; // Si yo gané, él ganó (mismo equipo)
        duoMap.set(key, current);
      });
    });

    // Filtramos solo los que tengan al menos 2 partidas juntos para ser relevante
    const candidates = Array.from(duoMap.values()).filter((d) => d.count >= 2);

    // Ordenamos por cantidad de partidas
    candidates.sort((a, b) => b.count - a.count);

    const result = candidates.length > 0 ? candidates[0] : null;
    return result;
  }, [recentMatchesData, account.puuid]);

  // CALCULO: Racha actual
  const currentStreak = useMemo(() => {
    if (!recentMatchesData) return 0;
    let streak = 0;
    for (const m of recentMatchesData) {
      if (m.win) streak++;
      else break;
    }
    return streak;
  }, [recentMatchesData]);

  // 2. KDA promedio reciente
  const recentAvgKda = useMemo(() => {
    if (!recentMatchesData || recentMatchesData.length === 0) return 0;
    const totalKda = recentMatchesData.reduce(
      (acc, m) => acc + (m.kda || 0),
      0
    );
    return totalKda / recentMatchesData.length;
  }, [recentMatchesData]);

  // 3. NUEVO: Analizar badges más frecuentes en las partidas
  const frequentBadges = useMemo(() => {
    if (!recentMatchesData || recentMatchesData.length === 0) return [];

    const badgeCount = new Map<string, number>();

    recentMatchesData.forEach((match) => {
      // Los badges se calculan a partir de las estadísticas de la partida
      // Revisamos el JSON completo para ver qué badges aplicarían
      const fullJson = match.matches?.full_json;
      if (!fullJson?.info?.participants) return;

      const participant: any = fullJson.info.participants.find(
        (p: any) => p.puuid === account.puuid
      );
      if (!participant) return;

      // Verificar multikills
      if (participant.pentaKills > 0) {
        badgeCount.set("PentaKill", (badgeCount.get("PentaKill") || 0) + 1);
      } else if (participant.quadraKills > 0) {
        badgeCount.set("QuadraKill", (badgeCount.get("QuadraKill") || 0) + 1);
      } else if (participant.tripleKills > 0) {
        badgeCount.set("TripleKill", (badgeCount.get("TripleKill") || 0) + 1);
      }

      // Revisar farmeador (CS > 7.5 por minuto)
      const gameDurationMin = (fullJson.info as any).gameDuration / 60;
      const totalCs =
        (participant.totalMinionsKilled || 0) +
        (participant.neutralMinionsKilled || 0);
      const csPerMin = totalCs / gameDurationMin;
      if (csPerMin >= 7.5) {
        badgeCount.set("Farmeador", (badgeCount.get("Farmeador") || 0) + 1);
      }

      // MVP (KDA > 5 y alto daño)
      const kda =
        participant.deaths > 0
          ? (participant.kills + participant.assists) / participant.deaths
          : participant.kills + participant.assists;
      if (kda >= 5) {
        badgeCount.set("MVP", (badgeCount.get("MVP") || 0) + 1);
      }

      // Visionario
      const visionScorePerMin =
        (participant.visionScore || 0) / gameDurationMin;
      if (visionScorePerMin >= 1.5) {
        badgeCount.set("Visionario", (badgeCount.get("Visionario") || 0) + 1);
      }
    });

    // Convertir a array y ordenar por frecuencia
    return Array.from(badgeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // Top 3 badges
    // Solo si se repiten al menos 2 veces
  }, [recentMatchesData, account.puuid]);

  // --- NUEVO: Lógica de Carrusel para Logros ---
  const allAchievements = useMemo(() => {
    const list: React.ReactNode[] = [];

    // Estilo base minimalista
    const baseBadgeClass =
      "w-full h-full bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-2 transition-all hover:bg-slate-100 dark:hover:bg-white/10";

    // Tipografía elegante
    const labelClass =
      "text-[7px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center";
    const valueClass =
      "text-[9px] font-black text-slate-700 dark:text-slate-200 tracking-tight leading-none";
    const subClass =
      "text-[6px] font-medium text-slate-400 dark:text-slate-500";

    // 1. Racha de Victorias
    if (currentStreak >= 3) {
      list.push(
        <div key="streak" className={baseBadgeClass}>
          <div className="p-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10">
            <Flame className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col items-center">
            <span className={labelClass}>Racha</span>
            <span className={valueClass}>{currentStreak} Victorias</span>
          </div>
        </div>
      );
    }

    // 2. KDA Dominante
    if (recentAvgKda >= 3.5) {
      list.push(
        <div key="kda" className={baseBadgeClass}>
          <div className="p-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10">
            <Trophy className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex flex-col items-center">
            <span className={labelClass}>Dominante</span>
            <span className={valueClass}>KDA {recentAvgKda.toFixed(1)}</span>
          </div>
        </div>
      );
    }

    // 3. Badges Frecuentes
    const badgeConfig: Record<
      string,
      {
        icon: any;
        color: string;
        bgColor: string;
        darkColor: string;
        label: string;
      }
    > = {
      PentaKill: {
        icon: Zap,
        color: "text-rose-600",
        bgColor: "bg-rose-50",
        darkColor: "dark:text-rose-400",
        label: "Penta Kill",
      },
      QuadraKill: {
        icon: Zap,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        darkColor: "dark:text-orange-400",
        label: "Quadra Kill",
      },
      TripleKill: {
        icon: Target,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        darkColor: "dark:text-amber-400",
        label: "Triple Kill",
      },
      MVP: {
        icon: Award,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        darkColor: "dark:text-yellow-400",
        label: "MVP",
      },
      Farmeador: {
        icon: Activity,
        color: "text-teal-600",
        bgColor: "bg-teal-50",
        darkColor: "dark:text-teal-400",
        label: "Farm",
      },
      Visionario: {
        icon: Shield,
        color: "text-cyan-600",
        bgColor: "bg-cyan-50",
        darkColor: "dark:text-cyan-400",
        label: "Visión",
      },
    };

    frequentBadges.forEach(([badge, count]) => {
      const config = badgeConfig[badge];
      if (config) {
        const Icon = config.icon;
        list.push(
          <div key={badge} className={baseBadgeClass}>
            <div
              className={`p-1.5 rounded-full ${config.bgColor} dark:bg-white/5`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${config.color} ${config.darkColor}`}
              />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className={labelClass}>{config.label}</span>
              <span className={subClass}>Obtenido {count} veces</span>
            </div>
          </div>
        );
      }
    });

    // 4. Veterano
    if (account.summoner_level && account.summoner_level >= 1000) {
      list.push(
        <div key="veteran" className={baseBadgeClass}>
          <div className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10">
            <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex flex-col items-center">
            <span className={labelClass}>Estado</span>
            <span className={valueClass}>Veterano</span>
          </div>
        </div>
      );
    }

    return list;
  }, [currentStreak, recentAvgKda, frequentBadges, account.summoner_level]);

  const [achievementIndex, setAchievementIndex] = useState(0);

  useEffect(() => {
    if (allAchievements.length <= 2) return;
    const interval = setInterval(() => {
      setAchievementIndex((prev) => (prev + 2) % allAchievements.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [allAchievements.length]);

  const visibleAchievements = useMemo(() => {
    if (allAchievements.length <= 2) return allAchievements;
    return [
      allAchievements[achievementIndex % allAchievements.length],
      allAchievements[(achievementIndex + 1) % allAchievements.length],
    ];
  }, [allAchievements, achievementIndex]);

  // ... inside render ...

  // --- Render ---

  if (isLoading) {
    return (
      <div className="w-full bg-slate-100/70 dark:bg-slate-900/50 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px] border-2 border-slate-300/60 dark:border-white/5 backdrop-blur-sm">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
        <p className="text-blue-700 dark:text-blue-400/60 text-sm font-medium animate-pulse">
          Cargando perfil de invocador...
        </p>
      </div>
    );
  }

  const regionName = REGION_NAMES[account.region] || account.region;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="relative overflow-hidden rounded-3xl border-2 border-slate-200/60 dark:border-white/10 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#0a0c10] dark:to-[#0f1419] group">
        {/* Background Layer (Global Splash) */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          {topChampionName ? (
            <div className="relative w-full h-full">
              <ChampionCenteredSplash
                champion={topChampionName}
                className="opacity-15 dark:opacity-25 grayscale-[50%] dark:grayscale-[30%] scale-105 group-hover:scale-110 transition-transform duration-[2s]"
                desktopFocalOffsetY="20%"
              />
              {/* Varios gradientes para asegurar legibilidad en todas las zonas */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/95 to-slate-50/60 dark:from-[#0a0c10] dark:via-[#0a0c10]/90 dark:to-[#0a0c10]/40" />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-100/70 via-transparent to-slate-50/80 dark:from-[#0a0c10]/50 dark:via-transparent dark:to-[#0a0c10]" />
            </div>
          ) : (
            <RankAnimatedBackground
              tier={soloTier}
              className="opacity-10 dark:opacity-20"
            />
          )}
        </div>

        {/* Sync Indicator Floating */}
        <div className="absolute top-4 right-4 z-30">
          <AnimatePresence>
            {isSyncing && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-blue-500/30 dark:bg-blue-500/20 backdrop-blur-md border-2 border-blue-500/50 dark:border-blue-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg"
              >
                <Loader2
                  size={14}
                  className="text-blue-600 dark:text-blue-400 animate-spin"
                />
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                  Sincronizando
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content Grid */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8">
          {/* --- LEFT COLUMN: Identity & Ranks --- */}
          <div className="lg:col-span-5 p-6 md:p-8 flex flex-col justify-between bg-gradient-to-b from-slate-200/40 dark:from-white/5 to-transparent lg:border-r border-slate-300/60 dark:border-white/5">
            {/* 1. Account Info (Top Left) - Ultra Compact Version */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-3">
                {/* Icon - Smaller */}
                <div className="relative group/icon cursor-pointer flex-shrink-0">
                  <div
                    className="absolute inset-0 rounded-full blur-md opacity-20 group-hover/icon:opacity-40 transition-opacity duration-500"
                    style={{ backgroundColor: tierColor }}
                  />
                  <div className="relative w-14 h-14 rounded-full border-2 border-slate-300/70 dark:border-white/10 shadow-lg overflow-hidden bg-slate-200 dark:bg-slate-800 group-hover/icon:scale-105 transition-transform duration-300">
                    {account.profile_icon_id ? (
                      <Image
                        src={`https://cdn.communitydragon.org/latest/profile-icon/${account.profile_icon_id}`}
                        alt="Icon"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800" />
                    )}
                  </div>
                  {account.summoner_level && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-slate-700 dark:bg-[#0d0f17] text-white text-[8px] font-black px-1.5 py-0 rounded-full border-2 border-slate-400 dark:border-white/10 shadow-md whitespace-nowrap z-20">
                      {account.summoner_level}
                    </div>
                  )}
                </div>

                {/* Names & Region - Very Tight */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0">
                    <Badge
                      variant="outline"
                      className="bg-slate-300/70 dark:bg-white/5 border-slate-500/50 dark:border-white/10 text-slate-600 dark:text-white/40 text-[8px] uppercase font-bold tracking-tighter px-1 py-0 h-3.5"
                    >
                      {regionName}
                    </Badge>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate flex items-baseline gap-1">
                    {account.game_name}
                    <span className="text-sm font-medium text-slate-500 dark:text-white/20">
                      #{account.tag_line}
                    </span>
                  </h2>

                  {/* Winrate Mini Bar - Ultra Sharp */}
                  <div className="max-w-[140px] mt-1">
                    <div className="flex justify-between text-[8px] font-black mb-0.5 uppercase tracking-tighter">
                      <span
                        className={
                          winrate >= 50
                            ? "text-emerald-500/80"
                            : "text-rose-500/80"
                        }
                      >
                        {winrate}% WR
                      </span>
                      <span className="text-slate-400 dark:text-white/10">
                        {soloWins}W {soloLosses}L
                      </span>
                    </div>
                    <div className="h-0.5 bg-slate-300/70 dark:bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${winrateColor}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${winrate}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Rank Emblems (Left Bottom) */}
            <div className="space-y-4">
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-600 dark:text-white/30 flex items-center gap-2">
                <Trophy className="w-3 h-3" /> Clasificatorias
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {queueStats.map((queue) => (
                  <div
                    key={queue.id}
                    className="relative bg-slate-200/70 dark:bg-white/5 border-2 border-slate-300 dark:border-white/10 rounded-lg p-2 flex flex-col items-center text-center gap-1 hover:bg-slate-300/60 dark:hover:bg-white/10 transition-all group/card"
                  >
                    <div className="absolute top-1.5 right-1.5 text-[7px] font-black text-slate-400 dark:text-white/10 uppercase tracking-widest">
                      {queue.label === "Solo / Duo" ? "SOLO" : "FLEX"}
                    </div>

                    {/* Emblem Container - Tiny */}
                    <div className="relative w-20 h-20 my-0.5 flex items-center justify-center">
                      <div
                        className="absolute inset-0 rounded-full blur-xl opacity-5 group-hover/card:opacity-20 transition-opacity duration-500"
                        style={{ backgroundColor: queue.tierColor }}
                      />
                      <Image
                        src={queue.emblemUrl}
                        alt={queue.label}
                        fill
                        unoptimized
                        className="object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] group-hover/card:scale-110 transition-transform duration-500 z-10"
                      />
                    </div>

                    <div className="z-10 bg-slate-100/90 dark:bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md border border-slate-300 dark:border-white/5 w-full">
                      <div className="text-[11px] font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight truncate">
                        {queue.hasData ? queue.tierName : "Unranked"}
                        {queue.hasData && (
                          <span className="text-slate-500 dark:text-white/40 ml-1">
                            {queue.rank}
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] font-black mt-0 text-slate-600 dark:text-white/60">
                        {queue.hasData ? `${queue.lp} LP` : "0 LP"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Footer (Mobile only visible here, Desktop integrated) */}
            <div className="mt-6 flex items-center gap-3">
              {onSync && !hideSync && (
                <button
                  onClick={onSync}
                  disabled={isSyncing || cooldownSeconds > 0}
                  className="flex-1 py-2 px-3 rounded-lg bg-indigo-500/20 dark:bg-indigo-500/10 hover:bg-indigo-500/30 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-2 border-indigo-500/40 dark:border-indigo-500/20 transition-all disabled:opacity-50 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 group/btn"
                >
                  <RefreshCw
                    size={12}
                    className={
                      isSyncing
                        ? "animate-spin"
                        : "group-hover/btn:rotate-180 transition-transform duration-500"
                    }
                  />
                  {isSyncing
                    ? "..."
                    : cooldownSeconds > 0
                    ? `${cooldownSeconds}s`
                    : "Actualizar"}
                </button>
              )}
              {account.puuid && (
                <a
                  href={`https://www.leagueofgraphs.com/summoner/${
                    LOG_REGIONS[account.region] || account.region
                  }/${account.game_name?.replace(/\s+/g, "+")}-${
                    account.tag_line
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-lg bg-slate-300/60 dark:bg-white/5 hover:bg-slate-400/70 dark:hover:bg-white/10 text-slate-700 dark:text-white/60 hover:text-slate-900 dark:hover:text-white border-2 border-slate-400 dark:border-white/10 transition-all text-[10px] font-bold"
                  title="Ver en League of Graphs"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>

          {/* --- RIGHT COLUMN: Stats Grid (2x2 Compact) --- */}
          <div className="lg:col-span-7 p-6 md:p-8 flex flex-col justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {/* 1. Recent Activity (Top Left) */}
              <div className="bg-white/70 dark:bg-white/5 border-2 border-slate-300 dark:border-white/5 rounded-2xl p-4 backdrop-blur-md flex flex-col h-40">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white/40 mb-3">
                  <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Últimas 20
                </h4>
                {recentStats.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 flex-1 items-center">
                    {recentStats.map((stat) => {
                      const wr = Math.round((stat.wins / stat.count) * 100);
                      return (
                        <div
                          key={stat.id}
                          className="group/champ flex flex-col items-center gap-1"
                        >
                          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-300 dark:border-white/10 group-hover/champ:border-emerald-500 dark:group-hover/champ:border-emerald-400/50 transition-all">
                            <Image
                              src={`https://cdn.communitydragon.org/latest/champion/${stat.id}/square`}
                              alt={stat.name}
                              fill
                              unoptimized
                              className="object-cover group-hover/champ:scale-110 transition-transform duration-300"
                            />
                          </div>
                          <div
                            className={`text-[9px] font-black px-1.5 rounded-sm ${
                              wr >= 50
                                ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                : "bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400"
                            }`}
                          >
                            {wr}%
                          </div>
                          <div className="text-[8px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-tighter">
                            {stat.count}{" "}
                            {stat.count === 1 ? "Partida" : "Partidas"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                    <Zap className="w-6 h-6 mb-1" />
                    <span className="text-[9px]">Sin datos</span>
                  </div>
                )}
              </div>

              {/* 2. Top Mastery (Top Right) */}
              <div className="bg-white/70 dark:bg-white/5 border-2 border-slate-300 dark:border-white/5 rounded-2xl p-4 backdrop-blur-md flex flex-col h-40">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white/40 mb-3">
                  <Flame className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                  Maestría
                </h4>
                {topMastery.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 flex-1 items-center">
                    {topMastery.map((mastery, idx) => (
                      <div
                        key={mastery.championId}
                        className="group/mastery flex flex-col items-center gap-1"
                      >
                        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-300 dark:border-white/10 group-hover/mastery:border-orange-600 dark:group-hover/mastery:border-orange-500/50 transition-all">
                          {/* Rank Indicator */}
                          {idx === 0 && (
                            <div className="absolute top-0 right-0 w-3 h-3 bg-orange-500 rounded-full z-10 border border-black" />
                          )}
                          <Image
                            src={`https://cdn.communitydragon.org/latest/champion/${mastery.championId}/square`}
                            alt="Champ"
                            fill
                            unoptimized
                            className="object-cover group-hover/mastery:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <div className="text-[9px] font-bold text-slate-600 dark:text-white/40">
                          {(mastery.championPoints / 1000).toFixed(0)}k
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                    <Award className="w-6 h-6 mb-1" />
                    <span className="text-[9px]">Sin maestría</span>
                  </div>
                )}
              </div>

              {/* 3. Recent Achievements (Bottom Left) */}
              <div className="bg-white/70 dark:bg-white/5 border-2 border-slate-300 dark:border-white/5 rounded-2xl p-4 backdrop-blur-md flex flex-col h-32 overflow-hidden relative">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white/40 mb-3">
                  <Award className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                  Logros Recientes
                </h4>
                <div className="flex-1 overflow-hidden relative mt-1">
                  {allAchievements.length > 0 ? (
                    <motion.div
                      animate={{
                        x: [0, -1035], // Desplazamiento basado en el contenido duplicado
                      }}
                      transition={{
                        duration: 30, // Velocidad lenta y constante
                        ease: "linear",
                        repeat: Infinity,
                      }}
                      className="flex gap-2 absolute left-0"
                      style={{ width: "max-content" }}
                    >
                      {/* Renderizamos el set original y un duplicado para el bucle infinito */}
                      {allAchievements.map((achievement, idx) => (
                        <div
                          key={`orig-${idx}`}
                          className="w-[120px] h-16 shrink-0"
                        >
                          {achievement}
                        </div>
                      ))}
                      {allAchievements.map((achievement, idx) => (
                        <div
                          key={`dup-${idx}`}
                          className="w-[120px] h-16 shrink-0"
                        >
                          {achievement}
                        </div>
                      ))}
                      {/* Un tercer set para asegurar que no haya huecos en pantallas anchas */}
                      {allAchievements.map((achievement, idx) => (
                        <div
                          key={`dup2-${idx}`}
                          className="w-[120px] h-16 shrink-0"
                        >
                          {achievement}
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-white/20 text-[9px] opacity-30">
                      - Sin logros nuevos -
                    </div>
                  )}

                  {/* Gradientes laterales para suavizar la entrada/salida */}
                  <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/80 dark:from-[#0a0c10] to-transparent z-10 pointer-events-none" />
                  <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/80 dark:from-[#0a0c10] to-transparent z-10 pointer-events-none" />
                </div>
              </div>

              {/* 4. Frequent Duo (Bottom Right) */}
              <div className="bg-white/70 dark:bg-white/5 border-2 border-slate-300 dark:border-white/5 rounded-2xl p-4 backdrop-blur-md flex flex-col h-32">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white/40 mb-3">
                  <Target className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  Dúo Frecuente
                </h4>
                {frequentDuo ? (
                  (() => {
                    const linkedProfileId =
                      linkedAccountsMap[frequentDuo.puuid];

                    // Usar profileColor directamente con color-mix para soporte robusto de cualquier formato (hex, rgb, nombres)
                    const customStyle =
                      linkedProfileId && profileColor
                        ? ({
                            "--duo-color": profileColor,
                            backgroundColor: `color-mix(in srgb, var(--duo-color) 3%, transparent)`,
                            borderColor: `color-mix(in srgb, var(--duo-color) 20%, transparent)`,
                          } as React.CSSProperties)
                        : {};

                    return (
                      <div
                        onClick={() =>
                          linkedProfileId &&
                          router.push(`/perfil/${linkedProfileId}?tab=lol`)
                        }
                        style={customStyle}
                        className={`flex items-center gap-3 p-2 rounded-xl border-2 h-full transition-all ${
                          linkedProfileId
                            ? profileColor
                              ? "hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer group/duo"
                              : "bg-emerald-500/10 border-emerald-500/50 hover:bg-emerald-500/20 cursor-pointer group/duo"
                            : "bg-slate-200/60 dark:bg-white/5 border-slate-300 dark:border-white/5"
                        }`}
                      >
                        <div
                          className={`relative w-10 h-10 rounded-full border-2 overflow-hidden bg-slate-200 dark:bg-slate-800 flex-shrink-0 ${
                            linkedProfileId
                              ? "" // Border styling handled by inline style or fallback class
                              : "border-slate-300 dark:border-white/10"
                          }`}
                          style={
                            linkedProfileId && profileColor
                              ? {
                                  borderColor: `color-mix(in srgb, var(--duo-color) 40%, transparent)`,
                                }
                              : linkedProfileId
                              ? {}
                              : {}
                          }
                        >
                          <div
                            className={`absolute inset-0 border-2 rounded-full ${
                              !profileColor && linkedProfileId
                                ? "border-emerald-500"
                                : ""
                            }`}
                            style={
                              profileColor
                                ? {
                                    borderColor: `color-mix(in srgb, var(--duo-color) 40%, transparent)`,
                                  }
                                : {}
                            }
                          />
                          <Image
                            src={`https://cdn.communitydragon.org/latest/profile-icon/${frequentDuo.icon}`}
                            alt={frequentDuo.name}
                            fill
                            unoptimized
                            className="object-cover relative z-10"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-xs font-black truncate flex items-center gap-1 ${
                              linkedProfileId
                                ? "group-hover/duo:underline"
                                : "text-slate-900 dark:text-white"
                            }`}
                            style={
                              linkedProfileId && profileColor
                                ? { color: profileColor }
                                : {}
                            }
                          >
                            <span
                              className={
                                !profileColor && linkedProfileId
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : ""
                              }
                            >
                              {frequentDuo.name}
                            </span>
                            {linkedProfileId && (
                              <ExternalLink
                                size={10}
                                className={
                                  !profileColor ? "text-emerald-600" : ""
                                }
                                style={
                                  profileColor ? { color: profileColor } : {}
                                }
                              />
                            )}
                          </div>
                          <div
                            className={`text-[9px] font-medium ${
                              linkedProfileId
                                ? ""
                                : "text-slate-600 dark:text-white/30"
                            }`}
                            style={{}}
                          >
                            <span
                              className={
                                !profileColor && linkedProfileId
                                  ? "text-emerald-600/80 dark:text-emerald-400/80"
                                  : ""
                              }
                            >
                              {frequentDuo.count} partidas /{" "}
                              {Math.round(
                                (frequentDuo.wins / frequentDuo.count) * 100
                              )}
                              % WR
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-30 text-slate-500 dark:text-white/20 text-center p-2">
                    <Users className="w-6 h-6 mb-1 opacity-50" />
                    <span className="text-[9px]">
                      Juega más partidas para descubrir tu dúo frecuente
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info (Last Updated) - Bottom absolute center or right */}
        <div className="absolute bottom-3 right-6 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/10 pointer-events-none">
          Actualizado:{" "}
          {account.last_updated
            ? new Date(account.last_updated).toLocaleDateString()
            : "Nunca"}
        </div>
      </div>
    </motion.div>
  );
}
