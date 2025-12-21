"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
// Removed extensive Framer Motion imports that caused layout trashing on mobile lists
import { useIsMobile } from "@/components/ui/use-mobile";
import { useMatchStatusDetector } from "@/hooks/use-match-status-detector";
import type { ActiveMatchSnapshot } from "@/hooks/use-match-status-detector";
import { ActiveMatchCard } from "./ActiveMatchCard";
import { EndedMatchPreviewCard } from "./EndedMatchPreviewCard";
import {
  MatchCard,
  MobileMatchCard,
  getLatestDDragonVersion,
  FALLBACK_VERSION,
  type MatchCardProps,
} from "./match-card";
import type { Match } from "./match-card";
import {
  MatchHistoryAdBanner,
  MobileMatchHistoryAdBanner,
} from "./match-card/MatchHistoryAdBanner";
import { useAuth } from "@/context/AuthContext";
import { ScoreboardModal } from "./ScoreboardModal";

interface MatchHistoryListProps {
  userId?: string;
  puuid?: string;
  externalSyncPending?: boolean;
  externalCooldownSeconds?: number;
  hideShareButton?: boolean;
}

interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  winrate: number;
  avgKda: number;
  avgDamage: number;
  avgGold: number;
}

interface LinkedAccountEntry {
  puuid: string;
  userId: string;
  publicId: string | null;
}

interface LinkedAccountsResponse {
  accounts: LinkedAccountEntry[];
}

interface SessionStatsResponse {
  success: boolean;
  gapHours: number;
  tzOffsetMinutes: number;
  queue: string;
  session: {
    total: number;
    wins: number;
    losses: number;
    winrate: number;
    startMs: number | null;
    endMs: number | null;
    winStreak: number;
    lossStreak: number;
  };
  today: {
    total: number;
    wins: number;
    losses: number;
    winrate: number;
    startMs: number;
    endMs: number;
  };
  lastMatch: { matchId: string; gameCreation: number } | null;
}

interface MatchHistoryPage {
  success: boolean;
  matches: Match[];
  stats: PlayerStats;
  hasMore: boolean;
  nextCursor: number | null;
}

interface CachedMatchesResponse {
  matches: Match[];
  fromCache?: boolean;
}

const QUEUE_FILTERS = [
  { label: "Todos", value: "all" },
  { label: "Ranked SoloQ", value: "soloq" },
  { label: "Flex", value: "flex" },
  { label: "Normales", value: "normals" },
  { label: "ARAM", value: "aram" },
  { label: "URF", value: "urf" },
];

const INITIAL_LOAD = 5; // Primeras 5 partidas para lazy load
const MATCHES_PER_PAGE = 15; // Después, 15 por página
const DEFAULT_STATS: PlayerStats = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  winrate: 0,
  avgKda: 0,
  avgDamage: 0,
  avgGold: 0,
};

/**
 * Componente principal para mostrar historial de partidas
 */
export function MatchHistoryList({
  userId: propUserId,
  puuid,
  externalSyncPending = false,
  externalCooldownSeconds = 0,
  hideShareButton = false,
}: MatchHistoryListProps = {}) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const [localUserId, setLocalUserId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<string>(
    QUEUE_FILTERS[0].value
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [lastStableMatches, setLastStableMatches] = useState<Match[]>([]);
  const [isFilterTransition, setIsFilterTransition] = useState(false);
  const lastAutoSyncAtRef = useRef<number>(0);
  const lastDetectedStatusRef = useRef<"online" | "in-game" | "offline">(
    "offline"
  );
  const lastActiveSnapshotRef = useRef<ActiveMatchSnapshot | null>(null);
  const [endedSnapshot, setEndedSnapshot] =
    useState<ActiveMatchSnapshot | null>(null);

  // Estado para controlar el modal de scoreboard centralizado
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const handleSelectMatch = useCallback((matchId: string) => {
    setSelectedMatchId(matchId);
  }, []);

  // Obtener user_id del contexto o localStorage si no se pasa por props
  useEffect(() => {
    if (!propUserId) {
      const id = localStorage.getItem("user_id");
      setLocalUserId(id);
    }
  }, [propUserId]);

  // Usar userId del contexto de autenticación si está disponible
  useEffect(() => {
    if (!propUserId && profile?.id) {
      setLocalUserId(profile.id);
    }
  }, [profile?.id, propUserId]);

  const { data: ddragonVersion = FALLBACK_VERSION } = useQuery({
    queryKey: ["ddragon-version"],
    queryFn: getLatestDDragonVersion,
    staleTime: 60 * 60 * 1000,
    initialData: FALLBACK_VERSION,
  });

  const userId = propUserId || localUserId;
  const isOwnProfile = Boolean(profile?.id && userId && profile.id === userId);

  const { data: sessionStats } = useQuery<SessionStatsResponse>({
    queryKey: ["match-session-stats"], // Sin filtro de cola - siempre mostrar todas las partidas del día
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("gapHours", "2");
      params.set("tzOffsetMinutes", String(new Date().getTimezoneOffset()));
      // NO enviamos el filtro de cola aquí - queremos ver todas las partidas del día

      console.log("🔍 [MatchHistoryList] Fetching session stats...");
      console.log(
        "  URL:",
        `/api/riot/matches/session-stats?${params.toString()}`
      );
      console.log("  tzOffsetMinutes:", new Date().getTimezoneOffset());
      console.log(
        "  Hora local actual:",
        new Date().toLocaleString("es-ES", { timeZone: "America/Bogota" })
      );

      const response = await fetch(
        `/api/riot/matches/session-stats?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("Error al obtener stats de sesión");
      }
      const data = (await response.json()) as SessionStatsResponse;

      console.log("✅ [MatchHistoryList] Session stats received:", data);

      return data;
    },
    enabled: isOwnProfile,
    staleTime: 5 * 1000, // 5 segundos - actualizar frecuentemente para reflejar nuevas partidas
    retry: false, // No reintentar si falla - es opcional
  });

  const { data: cachedMatchesData } = useQuery<CachedMatchesResponse>({
    queryKey: ["match-history-cache", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user");
      console.log(
        "[MatchHistoryList] 🔄 Fetching cached matches for userId:",
        userId
      );
      const response = await fetch(
        `/api/riot/matches/cache?userId=${encodeURIComponent(userId)}`
      );
      if (!response.ok) {
        throw new Error("Error al obtener caché de partidas");
      }
      const data = (await response.json()) as CachedMatchesResponse;
      console.log(
        "[MatchHistoryList] ✅ Cached matches received:",
        data.matches?.length || 0,
        "matches"
      );
      if (data.matches && data.matches.length > 0) {
        console.log(
          "[MatchHistoryList] 🎮 First cached match:",
          data.matches[0].match_id
        );
      }
      return data;
    },
    enabled: !!userId && queueFilter === "all",
    staleTime: 10 * 60 * 1000, // 10 minutos - las partidas no cambian
  });

  const cachedMatches = useMemo<Match[]>(() => {
    if (queueFilter !== "all") {
      return [];
    }
    return cachedMatchesData?.matches ?? [];
  }, [cachedMatchesData, queueFilter]);

  const hasCachedMatches = cachedMatches.length > 0;

  const matchHistoryQueryKey = useMemo(
    () => ["match-history", userId, queueFilter],
    [userId, queueFilter]
  );

  // Query global para obtener PUUIDs de jugadores registrados
  const { data: linkedAccountsData } = useQuery<LinkedAccountsResponse>({
    queryKey: ["linked-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/riot/linked-accounts");
      if (!res.ok) throw new Error("Error al obtener cuentas enlazadas");
      return (await res.json()) as LinkedAccountsResponse;
    },
    staleTime: 30 * 60 * 1000, // 30 minutos - raramente cambia
  });

  const linkedAccounts = linkedAccountsData?.accounts ?? [];
  const linkedAccountsMap = linkedAccounts.reduce<Record<string, string>>(
    (acc, account) => {
      if (account.publicId) {
        acc[account.puuid] = account.publicId;
      }
      return acc;
    },
    {}
  );

  // Query para obtener historial de partidas con lazy load
  const {
    data: matchPages,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<MatchHistoryPage>({
    queryKey: matchHistoryQueryKey,
    queryFn: async ({ pageParam }) => {
      if (!userId) throw new Error("No user");

      const params = new URLSearchParams();
      params.set("userId", userId);

      // Lazy load: primeras 5 partidas, después 40
      const isFirstPage = pageParam === null;
      const limit = isFirstPage ? INITIAL_LOAD : MATCHES_PER_PAGE;
      params.set("limit", limit.toString());

      if (queueFilter && queueFilter !== "all") {
        params.set("queue", queueFilter);
      }

      if (typeof pageParam === "number") {
        params.set("cursor", pageParam.toString());
      }

      const response = await fetch(`/api/riot/matches?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch matches");
      }

      const data = (await response.json()) as MatchHistoryPage;
      return data;
    },
    getNextPageParam: (lastPage) =>
      lastPage?.hasMore ? lastPage.nextCursor ?? undefined : undefined,
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutos - las partidas históricas no cambian
    gcTime: 60 * 60 * 1000, // 60 minutos en caché antes de garbage collection
    initialPageParam: null,
  });

  // Mutación para sincronizar partidas
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("No user");

      const response = await fetch("/api/riot/matches/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage =
          errorData.details || errorData.error || "Failed to sync matches";

        // Si es un error de PUUID inválido, sugerir reautenticación
        if (errorData.error?.includes("PUUID inválido")) {
          throw new Error(
            `${errorMessage}\n\nIntenta reautenticarte: /api/riot/reauth`
          );
        }

        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: async () => {
      console.log("[MatchHistoryList] SYNC SUCCESSFUL - RESETTING CACHE");

      // 1. Cancelar cualquier query en progreso para evitar race conditions
      console.log("[MatchHistoryList] Cancelando queries en progreso...");
      await queryClient.cancelQueries({ queryKey: ["match-history"] });
      await queryClient.cancelQueries({ queryKey: ["match-history-cache"] });

      // 2. Remover completamente los datos del cache (no solo setQueryData undefined)
      console.log("[MatchHistoryList] Removiendo queries del cache...");
      queryClient.removeQueries({
        queryKey: ["match-history", userId, queueFilter],
      });
      queryClient.removeQueries({ queryKey: ["match-history-cache", userId] });

      // 3. Marcar las queries como stale para forzar refetch
      console.log("[MatchHistoryList] Invalidando queries...");
      queryClient.invalidateQueries({
        queryKey: ["match-history", userId, queueFilter],
      });
      queryClient.invalidateQueries({
        queryKey: ["match-history-cache", userId],
      });
      // Invalidar también las estadísticas de sesión para actualizar el mensaje de "hoy"
      queryClient.invalidateQueries({
        queryKey: ["match-session-stats"],
      });

      console.log("[MatchHistoryList] Cache limpiado, refetching...");

      // 4. Refetch limpio - esto creará una nueva query desde cero
      const result = await refetch();
      console.log("[MatchHistoryList] Refetch completado, resultado:", result);
    },
  });

  useMatchStatusDetector({
    enabled: isOwnProfile && !externalSyncPending,
    onSnapshotChange: (snapshot) => {
      if (snapshot && snapshot.hasActiveMatch) {
        lastActiveSnapshotRef.current = snapshot;
      }
    },
    onStatusChange: (status) => {
      const prev = lastDetectedStatusRef.current;
      lastDetectedStatusRef.current = status;

      if (
        prev === "in-game" &&
        status === "online" &&
        !syncMutation.isPending &&
        externalCooldownSeconds <= 0
      ) {
        if (lastActiveSnapshotRef.current) {
          setEndedSnapshot(lastActiveSnapshotRef.current);
        }
        const now = Date.now();
        if (now - lastAutoSyncAtRef.current >= 90_000) {
          lastAutoSyncAtRef.current = now;
          syncMutation.mutate();
        }
      }
    },
  });

  useEffect(() => {
    if (!syncMutation.isPending && syncMutation.isSuccess) {
      setEndedSnapshot(null);
      lastActiveSnapshotRef.current = null;
    }
  }, [syncMutation.isPending, syncMutation.isSuccess]);

  // Lazy load: cargar más partidas automáticamente después de la carga inicial
  useEffect(() => {
    if (
      !isLoading &&
      matchPages?.pages.length === 1 &&
      hasNextPage &&
      !syncMutation.isPending
    ) {
      const timeout = setTimeout(() => {
        fetchNextPage();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [
    isLoading,
    matchPages?.pages.length,
    hasNextPage,
    fetchNextPage,
    syncMutation.isPending,
  ]);

  const pages = matchPages?.pages ?? [];
  const matches = useMemo(() => {
    const flatMatches = pages.flatMap((page) => page.matches ?? []);

    const seenKeys = new Set<string>();

    const filtered = flatMatches.filter((match) => {
      const baseKey = match.match_id ?? match.id;
      const fallbackKey = `${match.created_at ?? ""}-${
        (match as { puuid?: string }).puuid ?? match.summoner_name ?? ""
      }-${match.champion_name ?? ""}`;
      const uniqueKey = baseKey ?? fallbackKey;

      if (seenKeys.has(uniqueKey)) {
        return false;
      }

      seenKeys.add(uniqueKey);
      return true;
    });
    return filtered;
  }, [pages]);

  // Infinite scroll mejorado: cargar más partidas antes de llegar al final
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!hasNextPage || isFetchingNextPage) return;

      // Umbral aumentado a 800px para que la carga sea imperceptible
      const threshold = 800;
      const position = container.scrollTop + container.clientHeight;
      const triggerPoint = container.scrollHeight - threshold;

      if (position >= triggerPoint) {
        console.log(
          "[MatchHistoryList] 🚀 Pre-fetching next page (scroll threshold hit)"
        );
        fetchNextPage();
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Observer adicional para disparar carga apenas se asoma el final
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log(
            "[MatchHistoryList] 🚀 Pre-fetching (Intersection Observer)"
          );
          fetchNextPage();
        }
      },
      { root: scrollContainerRef.current, rootMargin: "400px" }
    );

    const sentinel = document.getElementById("match-list-sentinel");
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, matches.length]);

  const serverStats = pages[0]?.stats ?? DEFAULT_STATS;

  const userColor = profile?.color || "#3b82f6";

  const getColorWithAlpha = useCallback((color: string, alpha: number) => {
    if (!color.startsWith("#") || (color.length !== 7 && color.length !== 9)) {
      return color;
    }

    const hex = color.slice(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  useEffect(() => {
    if (!isLoading && matches.length > 0) {
      setLastStableMatches((prev) => (prev === matches ? prev : matches));
      setIsFilterTransition(false);
    }
  }, [isLoading, matches]);

  useEffect(() => {
    if (hasCachedMatches && matches.length === 0) {
      setLastStableMatches((prev) =>
        prev === cachedMatches ? prev : cachedMatches
      );
    }
  }, [hasCachedMatches, cachedMatches, matches.length]);

  const matchesToRender =
    matches.length > 0
      ? matches
      : hasCachedMatches
      ? cachedMatches
      : lastStableMatches;

  // Reintentar automáticamente cuando haya partidas en estado "processing"
  useEffect(() => {
    if (!matchesToRender || matchesToRender.length === 0) {
      return;
    }

    const hasProcessingMatches = matchesToRender.some(
      (match) => (match.matches as any)?.ingest_status === "processing"
    );

    if (hasProcessingMatches && !syncMutation.isPending && !isLoading) {
      const timeout = setTimeout(() => {
        console.log(
          "[MatchHistoryList] ♻️ Reintentando fetch por partidas en processing..."
        );
        refetch();
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [matchesToRender, syncMutation.isPending, isLoading, refetch]);

  const stats = useMemo(() => {
    const sourceMatches =
      matches.length > 0 ? matches : hasCachedMatches ? cachedMatches : null;

    if (!sourceMatches || sourceMatches.length === 0) {
      return serverStats;
    }

    const wins = sourceMatches.filter((match) => match.win).length;
    const losses = sourceMatches.length - wins;
    const avgKda =
      sourceMatches.reduce((sum, match) => sum + (match.kda ?? 0), 0) /
      sourceMatches.length;
    const avgDamage =
      sourceMatches.reduce(
        (sum, match) => sum + (match.total_damage_dealt ?? 0),
        0
      ) / sourceMatches.length;
    const avgGold =
      sourceMatches.reduce((sum, match) => sum + (match.gold_earned ?? 0), 0) /
      sourceMatches.length;

    return {
      totalGames: sourceMatches.length,
      wins,
      losses,
      winrate:
        sourceMatches.length > 0
          ? Math.round((wins / sourceMatches.length) * 100)
          : 0,
      avgKda: Math.round(avgKda * 100) / 100,
      avgDamage: Math.round(avgDamage),
      avgGold: Math.round(avgGold),
    } satisfies PlayerStats;
  }, [matches, cachedMatches, hasCachedMatches, serverStats]);

  const todayMessage = useMemo(() => {
    if (!isOwnProfile || !sessionStats?.success) return null;

    // Logging para debugging
    console.log("📊 [MatchHistoryList] Stats de Hoy:", {
      total: sessionStats.today.total,
      wins: sessionStats.today.wins,
      losses: sessionStats.today.losses,
      winrate: sessionStats.today.winrate,
      startMs: sessionStats.today.startMs,
      endMs: sessionStats.today.endMs,
      startDate: new Date(sessionStats.today.startMs).toISOString(),
      endDate: new Date(sessionStats.today.endMs).toISOString(),
    });

    const { total, wins, losses } = sessionStats.today;

    // Sin partidas jugadas
    if (total === 0) {
      return "Hoy todavía no has jugado.";
    }

    // Solo victorias
    if (losses === 0) {
      return `Hoy llevas ${wins} victoria${
        wins === 1 ? "" : "s"
      } perfectas. ¡Sigue así!`;
    }

    // Solo derrotas
    if (wins === 0) {
      return `Hoy has perdido ${losses} partida${
        losses === 1 ? "" : "s"
      }. Tómate un respiro.`;
    }

    // Hay ambas - mostrar lo que predomina
    if (wins > losses) {
      return `Hoy llevas ${wins} victoria${
        wins === 1 ? "" : "s"
      } y ${losses} derrota${losses === 1 ? "" : "s"}. ¡Vas bien!`;
    } else if (losses > wins) {
      return `Hoy llevas ${losses} derrota${
        losses === 1 ? "" : "s"
      } y ${wins} victoria${wins === 1 ? "" : "s"}. No te rindas.`;
    } else {
      // Empate
      return `Hoy llevas ${wins} victoria${
        wins === 1 ? "" : "s"
      } y ${losses} derrota${losses === 1 ? "" : "s"}. Todo equilibrado.`;
    }
  }, [isOwnProfile, sessionStats]);

  const streakMessage = useMemo(() => {
    if (!isOwnProfile || !sessionStats?.success) return null;

    // Solo mostrar mensajes de racha si se ha jugado hoy
    if (sessionStats.today.total === 0) return null;

    if (sessionStats.session.winStreak >= 2) {
      return `Estás teniendo buena racha. Llevas ${
        sessionStats.session.winStreak
      } victoria${
        sessionStats.session.winStreak === 1 ? "" : "s"
      } seguidas. Sigue así.`;
    }

    if (sessionStats.session.lossStreak >= 2) {
      return `Llevas ${sessionStats.session.lossStreak} derrota${
        sessionStats.session.lossStreak === 1 ? "" : "s"
      } seguidas. Tómate un respiro y vuelve con todo.`;
    }

    return null;
  }, [isOwnProfile, sessionStats]);

  const streakTone = useMemo(() => {
    if (!isOwnProfile || !sessionStats?.success) return null;
    // Solo mostrar badge de racha si se ha jugado hoy
    if (sessionStats.today.total === 0) return null;
    if (sessionStats.session.winStreak >= 2) return "win";
    if (sessionStats.session.lossStreak >= 2) return "loss";
    return null;
  }, [isOwnProfile, sessionStats]);

  // ...
  const shouldShowInitialSkeleton =
    isLoading &&
    pages.length === 0 &&
    lastStableMatches.length === 0 &&
    !hasCachedMatches;

  if (shouldShowInitialSkeleton) {
    return (
      <div className="space-y-4 py-2">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={`match-skeleton-${idx}`}
            className="animate-pulse rounded-xl border-l-4 border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 p-3"
          >
            <div className="flex flex-col md:grid md:grid-cols-[60px,auto,180px,90px,200px] gap-4 items-center">
              {/* Metadata Skeleton */}
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-16 rounded bg-slate-300 dark:bg-slate-700" />
                <div className="h-3 w-14 rounded bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Champion Summary Skeleton */}
              <div className="flex items-center justify-center gap-4 w-full border-r border-slate-200 dark:border-slate-800/60 pr-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-lg bg-slate-300 dark:bg-slate-700" />
                  <div className="space-y-2">
                    <div className="h-3 w-10 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-8 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="flex items-center gap-3">
                  <div className="space-y-2">
                    <div className="h-3 w-10 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-8 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="h-14 w-14 rounded-lg bg-slate-300 dark:bg-slate-700" />
                </div>
              </div>

              {/* Items Skeleton */}
              <div className="hidden md:flex items-center gap-2">
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 6 }).map((__, i) => (
                    <div
                      key={i}
                      className="h-7 w-7 rounded bg-slate-200 dark:bg-slate-800"
                    />
                  ))}
                </div>
                <div className="h-7 w-7 rounded bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Stats Skeleton */}
              <div className="hidden md:flex flex-col gap-2 items-center">
                <div className="h-4 w-8 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-6 w-12 rounded bg-slate-300 dark:bg-slate-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
        Error al cargar historial de partidas
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="p-6 text-center text-slate-400 bg-slate-900/40 border border-slate-800 rounded-xl">
        Conecta tu cuenta de Riot para ver tu historial de partidas.
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <ActiveMatchCard userId={userId || undefined} />
      {isOwnProfile && endedSnapshot ? (
        <EndedMatchPreviewCard snapshot={endedSnapshot} />
      ) : null}
      {/* Encabezado con Estadísticas y filtros */}
      <div className="flex flex-col gap-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-600 dark:text-white ">
              Historial de Partidas
            </h3>
            {isOwnProfile && sessionStats?.success ? (
              <div
                className={`mt-2 rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm backdrop-blur
                  ${
                    streakTone === "loss"
                      ? "border-rose-500/20 bg-gradient-to-r from-slate-900/40 via-slate-900/25 to-rose-500/10 text-slate-100"
                      : streakTone === "win"
                      ? "border-emerald-500/20 bg-gradient-to-r from-slate-900/40 via-slate-900/25 to-emerald-500/10 text-slate-100"
                      : "border-slate-700/50 bg-gradient-to-r from-slate-900/35 via-slate-900/25 to-slate-800/20 text-slate-100"
                  }
                `}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {streakTone ? (
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide
                        ${
                          streakTone === "loss"
                            ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
                            : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                        }
                      `}
                    >
                      {streakTone === "loss" ? "Racha" : "On fire"}
                    </span>
                  ) : null}

                  <div className="font-medium text-slate-100/95">
                    {todayMessage}
                  </div>
                </div>

                {streakMessage ? (
                  <div className="mt-1 text-slate-200/85">{streakMessage}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUEUE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setQueueFilter(filter.value);
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }
              }}
              disabled={!userId}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border
                ${
                  queueFilter === filter.value
                    ? "bg-white text-slate-900 border-white"
                    : "text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
                }
                ${!userId ? "opacity-60 cursor-not-allowed" : ""}
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Partidas */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto space-y-2 min-h-0 custom-scrollbar"
      >
        {matchesToRender.length === 0 ? (
          <div className="p-4 text-center text-slate-400">
            No hay partidas registradas
          </div>
        ) : (
          <div className="space-y-4">
            {matchesToRender.map((match: Match, idx) => (
              <div
                key={match.match_id ?? match.id ?? `match-${idx}`}
                className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards"
                style={{ animationDelay: `${idx < 5 ? idx * 50 : 0}ms` }}
              >
                {/* Publicidad móvil cada 4 partidas */}
                {isMobile && idx > 0 && idx % 4 === 0 && (
                  <div className="mb-2">
                    <MobileMatchHistoryAdBanner />
                  </div>
                )}

                {/* Match Card */}
                {isMobile ? (
                  <MobileMatchCard
                    match={match}
                    version={ddragonVersion}
                    recentMatches={matchesToRender}
                    hideShareButton={hideShareButton}
                    userId={userId}
                    isOwnProfile={isOwnProfile}
                    priority={idx < 2}
                    onSelectMatch={() =>
                      handleSelectMatch(match.match_id || match.id)
                    }
                  />
                ) : (
                  <>
                    {/* Publicidad desktop cada 6 partidas */}
                    {!isMobile && idx > 0 && idx % 6 === 0 && (
                      <div className="mb-2">
                        <MatchHistoryAdBanner />
                      </div>
                    )}
                    <MatchCard
                      match={match}
                      version={ddragonVersion}
                      linkedAccountsMap={linkedAccountsMap}
                      recentMatches={matchesToRender}
                      hideShareButton={hideShareButton}
                      userId={userId}
                      isOwnProfile={isOwnProfile}
                      priority={idx < 3}
                      onSelectMatch={() =>
                        handleSelectMatch(match.match_id || match.id)
                      }
                    />
                  </>
                )}
              </div>
            ))}
            {hasNextPage && (
              <div
                id="match-list-sentinel"
                className="h-10 w-full flex items-center justify-center py-8"
              >
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-slate-400 animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs uppercase tracking-widest font-bold">
                      Cargando más partidas...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal centralizado para mejor rendimiento */}
      {selectedMatchId && (
        <ScoreboardModal
          matchId={selectedMatchId}
          open={!!selectedMatchId}
          onOpenChange={(open) => {
            if (!open) setSelectedMatchId(null);
          }}
        />
      )}
    </div>
  );
}
