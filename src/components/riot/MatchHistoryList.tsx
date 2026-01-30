"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { InfiniteData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, LayoutGrid, LayoutList } from "lucide-react";
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
  CompactMobileMatchCard,
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
import { prefetchMatchDetails } from "@/hooks/useMatchDetails";

// Memoize Match Cards for performance in virtual lists
const MemoizedMatchCard = React.memo(MatchCard);
const MemoizedMobileMatchCard = React.memo(MobileMatchCard);
const MemoizedCompactMobileMatchCard = React.memo(CompactMobileMatchCard);

// Tipo para el modo de vista móvil
type MobileViewMode = "full" | "compact";

interface MatchHistoryListProps {
  userId?: string;
  puuid?: string;
  riotId?: string;
  externalSyncPending?: boolean;
  externalCooldownSeconds?: number;
  hideShareButton?: boolean;
  initialMatchesData?: any;
  initialStats?: any;
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
  { label: "SoloQ", value: "soloq" },
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
  riotId,
  externalSyncPending = false,
  externalCooldownSeconds = 0,
  hideShareButton = false,
  initialMatchesData,
  initialStats,
}: MatchHistoryListProps = {}) {
  const queryClient = useQueryClient();
  const { profile, loading, session } = useAuth();
  const isMobile = useIsMobile();
  const [localUserId, setLocalUserId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<string>(
    QUEUE_FILTERS[0].value,
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [lastStableMatches, setLastStableMatches] = useState<Match[]>([]);
  const [isFilterTransition, setIsFilterTransition] = useState(false);
  const lastAutoSyncAtRef = useRef<number>(0);
  const lastDetectedStatusRef = useRef<"online" | "in-game" | "offline">(
    "offline",
  );
  const lastActiveSnapshotRef = useRef<ActiveMatchSnapshot | null>(null);
  const [endedSnapshot, setEndedSnapshot] =
    useState<ActiveMatchSnapshot | null>(null);

  // Estado para el modo de vista móvil (full o compact)
  // Leer preferencia guardada del localStorage
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("match-history-view-mode");
      if (saved === "compact" || saved === "full") {
        return saved;
      }
    }
    return "full";
  });

  // Guardar preferencia cuando cambie
  useEffect(() => {
    localStorage.setItem("match-history-view-mode", mobileViewMode);
  }, [mobileViewMode]);

  // Estado para controlar el modal de scoreboard centralizado
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const handleSelectMatch = useCallback((matchId: string) => {
    setSelectedMatchId(matchId);
  }, []);

  // Prefetch al hover para cargar datos antes del clic
  const handlePrefetchMatch = useCallback(
    (matchId: string) => {
      prefetchMatchDetails(queryClient, matchId);
    },
    [queryClient],
  );

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

  // OPTIMIZADO: Solo cargar versión DDragon cuando ya tenemos partidas
  // Esto evita una request extra en el primer render
  const { data: ddragonVersion = FALLBACK_VERSION } = useQuery({
    queryKey: ["ddragon-version"],
    queryFn: getLatestDDragonVersion,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000, // 24 horas - casi nunca cambia
    initialData: FALLBACK_VERSION,
    // ESCALONAMIENTO: No bloquear el primer render
    enabled: true, // Se carga pero con baja prioridad por el initialData
  });

  const userId = propUserId || localUserId;
  const isOwnProfile = Boolean(profile?.id && userId && profile.id === userId);

  // Query de caché optimizada: siempre habilitada para mostrar contenido instantáneo
  const { data: cachedMatchesData, isFetching: isFetchingCache } =
    useQuery<CachedMatchesResponse>({
      queryKey: ["match-history-cache", userId],
      queryFn: async () => {
        if (!userId) throw new Error("No user");

        const response = await fetch(
          `/api/riot/matches/cache?userId=${encodeURIComponent(userId)}`,
        );
        if (!response.ok) {
          throw new Error("Error al obtener caché de partidas");
        }
        const data = (await response.json()) as CachedMatchesResponse;

        return data;
      },
      enabled: !!userId, // Siempre habilitada para cualquier filtro
      staleTime: 30 * 60 * 1000, // 30 minutos - el caché es muy estable
      gcTime: 60 * 60 * 1000, // 1 hora en memoria
      refetchOnMount: false, // No refetch si hay datos frescos
      refetchOnWindowFocus: false, // El caché no necesita actualizarse al focus
    });

  // El caché ahora se usa para cualquier filtro - se filtra localmente si es necesario
  const cachedMatches = useMemo<Match[]>(() => {
    const matches = cachedMatchesData?.matches ?? [];
    // Para "all" retornamos todo, para otros filtros el caché igual ayuda visualmente
    return matches;
  }, [cachedMatchesData]);

  const hasCachedMatches = cachedMatches.length > 0;

  // OPTIMIZADO: Session stats es secundario - solo cargar después de tener datos
  // y solo para el perfil propio
  const { data: sessionStats } = useQuery<SessionStatsResponse>({
    queryKey: ["match-session-stats"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("gapHours", "2");
      params.set("tzOffsetMinutes", String(new Date().getTimezoneOffset()));

      const response = await fetch(
        `/api/riot/matches/session-stats?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Error al obtener stats de sesión");
      }
      return (await response.json()) as SessionStatsResponse;
    },
    // ESCALONAMIENTO: Solo después de tener datos en caché y solo si es perfil propio
    // CRÍTICO: Esperar a que la autenticación termine de cargar para evitar rate limits
    enabled: isOwnProfile && hasCachedMatches && !loading && !!session,
    staleTime: 30 * 1000, // 30 segundos - no tan frecuente
    retry: false,
  });

  const matchHistoryQueryKey = useMemo(
    () => ["match-history", userId, queueFilter],
    [userId, queueFilter],
  );

  // OPTIMIZADO: Linked accounts es terciario - solo cargar cuando se necesite
  // Usamos hasCachedMatches como indicador de que hay datos para mostrar
  const { data: linkedAccountsData } = useQuery<LinkedAccountsResponse>({
    queryKey: ["linked-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/riot/linked-accounts");
      if (!res.ok) throw new Error("Error al obtener cuentas enlazadas");
      return (await res.json()) as LinkedAccountsResponse;
    },
    // ESCALONAMIENTO: Solo después de tener partidas en caché o cuando hay modal abierto
    enabled: hasCachedMatches || !!selectedMatchId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const linkedAccounts = linkedAccountsData?.accounts ?? [];
  const linkedAccountsMap = linkedAccounts.reduce<Record<string, string>>(
    (acc, account) => {
      if (account.publicId) {
        acc[account.puuid] = account.publicId;
      }
      return acc;
    },
    {},
  );

  // Query para obtener historial de partidas con lazy load - OPTIMIZADA
  const {
    data: matchPages,
    isLoading,
    isFetching, // Nuevo: para saber si está actualizando en background
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

      // Lazy load: primeras 5 partidas, después 15
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
      lastPage?.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos para datos frescos
    gcTime: 60 * 60 * 1000, // 60 minutos en caché antes de garbage collection
    initialPageParam: null,
    // OPTIMIZACIÓN: Mostrar datos anteriores mientras se refetch (evita skeleton flash)
    placeholderData: (previousData) => previousData,
    // OPTIMIZACIÓN: Solo refetch si los datos son stale, no en cada mount
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    initialData:
      initialMatchesData && (!queueFilter || queueFilter === "all")
        ? {
            pages: [
              {
                ...initialMatchesData,
                stats: initialStats || DEFAULT_STATS,
              },
            ],
            pageParams: [null],
          }
        : undefined,
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
            `${errorMessage}\n\nIntenta reautenticarte: /api/riot/reauth`,
          );
        }

        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: async () => {
      // 1. Cancelar cualquier query en progreso para evitar race conditions

      await queryClient.cancelQueries({ queryKey: ["match-history"] });
      await queryClient.cancelQueries({ queryKey: ["match-history-cache"] });

      // 2. Remover completamente los datos del cache (no solo setQueryData undefined)

      queryClient.removeQueries({
        queryKey: ["match-history", userId, queueFilter],
      });
      queryClient.removeQueries({ queryKey: ["match-history-cache", userId] });

      // 3. Marcar las queries como stale para forzar refetch

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

      // 4. Refetch limpio - esto creará una nueva query desde cero
      const result = await refetch();
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

  // Observer adicional para disparar carga apenas se asoma el final
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { root: scrollContainerRef.current, rootMargin: "400px" },
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
        prev === cachedMatches ? prev : cachedMatches,
      );
    }
  }, [hasCachedMatches, cachedMatches, matches.length]);

  const matchesToRender =
    matches.length > 0
      ? matches
      : hasCachedMatches
        ? cachedMatches
        : lastStableMatches;

  const [listOffset, setListOffset] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (scrollContainerRef.current) {
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        setListOffset(rect.top + scrollTop);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [matchesToRender.length]);

  // Initialize Virtualizer for Window Scroll
  // La altura estimada varía según el modo de vista móvil
  const mobileRowHeight = mobileViewMode === "compact" ? 80 : 320;
  const rowVirtualizer = useWindowVirtualizer({
    count: matchesToRender.length,
    estimateSize: (index) => (isMobile ? mobileRowHeight : 160),
    overscan: 5,
    scrollMargin: listOffset,
  });

  // Forzar re-medición cuando cambia el modo de vista móvil
  useEffect(() => {
    if (isMobile) {
      // Forzar re-cálculo de tamaños cuando cambia el modo
      rowVirtualizer.measure();
    }
  }, [mobileViewMode, isMobile, rowVirtualizer]);

  // Reintentar automáticamente cuando haya partidas en estado "processing"
  useEffect(() => {
    if (!matchesToRender || matchesToRender.length === 0) {
      return;
    }

    const hasProcessingMatches = matchesToRender.some(
      (match) => (match.matches as any)?.ingest_status === "processing",
    );

    if (hasProcessingMatches && !syncMutation.isPending && !isLoading) {
      const timeout = setTimeout(() => {
        refetch();
      }, 15000); // Aumentado de 5s a 15s para ser menos agresivo

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
        0,
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

  // OPTIMIZADO: Solo mostrar skeleton si no hay NINGÚN dato disponible
  // Esto permite mostrar datos del caché o datos anteriores mientras se actualiza
  const shouldShowInitialSkeleton =
    isLoading &&
    !isFetching && // Si está fetching pero hay datos previos, no mostrar skeleton
    pages.length === 0 &&
    lastStableMatches.length === 0 &&
    !hasCachedMatches;

  // Indicador de actualización en background (cuando hay datos pero se está refrescando)
  // No mostramos el indicador si solo estamos cargando la siguiente página (paginación)
  const isRefreshingInBackground =
    (isFetching &&
      !isFetchingNextPage &&
      !isLoading &&
      (matchesToRender.length > 0 || hasCachedMatches)) ||
    syncMutation.isPending;

  // ELIMINADO: Early returns que bloqueaban la visualización de la partida en vivo
  // Ahora manejamos los estados (skeleton, error, vacío) dentro del return principal

  return (
    <div className="space-y-4">
      <ActiveMatchCard
        userId={userId || undefined}
        recentMatches={matchesToRender}
        puuid={puuid}
        riotId={riotId}
      />

      {isOwnProfile && endedSnapshot ? (
        <EndedMatchPreviewCard snapshot={endedSnapshot} />
      ) : null}

      {/* --- Switch de Estados Principales --- */}
      {error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          Error al cargar historial de partidas
        </div>
      ) : !userId && !isLoading ? (
        <div className="p-6 text-center text-slate-400 bg-slate-900/40 border border-slate-800 rounded-xl">
          Conecta tu cuenta de Riot para ver tu historial de partidas.
        </div>
      ) : shouldShowInitialSkeleton ? (
        <div className="space-y-4 py-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={`match-skeleton-${idx}`}
              className="animate-pulse rounded-xl border-l-4 border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 p-3"
            >
              <div className="flex flex-col md:grid md:grid-cols-[60px,auto,180px,90px,200px] gap-4 items-center">
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-16 rounded bg-slate-300 dark:bg-slate-700" />
                </div>
                <div className="flex items-center justify-center gap-4 w-full border-r border-slate-200 dark:border-slate-800/60 pr-4">
                  <div className="h-14 w-14 rounded-lg bg-slate-300 dark:bg-slate-700" />
                  <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="h-14 w-14 rounded-lg bg-slate-300 dark:bg-slate-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Encabezado con Estadísticas y filtros */}
          <div className="flex flex-col gap-3 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-600 dark:text-white">
                    Historial de Partidas
                  </h3>
                </div>
                {isOwnProfile && sessionStats?.success ? (
                  <div
                    className={`mt-2 rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-sm
                      ${
                        streakTone === "loss"
                          ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100"
                          : streakTone === "win"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100"
                            : "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700/50 dark:bg-slate-800/40 dark:text-slate-100"
                      }
                    `}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {streakTone ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide
                            ${
                              streakTone === "loss"
                                ? "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-200"
                                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                            }
                          `}
                        >
                          {streakTone === "loss" ? "Racha" : "On fire"}
                        </span>
                      ) : null}
                      <div className="font-medium opacity-90">
                        {todayMessage}
                      </div>
                    </div>
                    {streakMessage ? (
                      <div className="mt-1 opacity-80">{streakMessage}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Toggle de vista para móvil */}
            {isMobile && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Vista:
                </span>
                <button
                  onClick={() =>
                    setMobileViewMode(
                      mobileViewMode === "full" ? "compact" : "full",
                    )
                  }
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700
                    text-slate-700 dark:text-slate-200
                  `}
                >
                  {mobileViewMode === "full" ? (
                    <>
                      <LayoutList className="w-3.5 h-3.5" />
                      <span>Compacta</span>
                    </>
                  ) : (
                    <>
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Completa</span>
                    </>
                  )}
                </button>
              </div>
            )}

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

          {/* Lista de Partidas Virtualizada */}
          <div
            ref={scrollContainerRef}
            className="w-full relative min-h-[100px]"
          >
            {matchesToRender.length === 0 && !isLoading ? (
              <div className="p-4 text-center text-slate-400">
                No hay partidas registradas
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const match = matchesToRender[virtualRow.index];
                  const idx = virtualRow.index;
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      className="absolute top-0 left-0 w-full"
                      style={{
                        transform: `translateY(${virtualRow.start - listOffset}px)`,
                      }}
                    >
                      <div className="pb-2">
                        {isMobile &&
                          idx > 0 &&
                          idx % (mobileViewMode === "compact" ? 12 : 5) ===
                            0 && (
                            <div className="mb-2">
                              <MobileMatchHistoryAdBanner />
                            </div>
                          )}
                        {!isMobile && idx > 0 && idx % 6 === 0 && (
                          <div className="mb-2">
                            <MatchHistoryAdBanner />
                          </div>
                        )}
                        {isMobile ? (
                          mobileViewMode === "compact" ? (
                            <MemoizedCompactMobileMatchCard
                              match={match}
                              version={ddragonVersion}
                              userId={userId}
                              isOwnProfile={isOwnProfile}
                              priority={idx < 3}
                              onSelectMatch={handleSelectMatch}
                              onHoverMatch={handlePrefetchMatch}
                            />
                          ) : (
                            <MemoizedMobileMatchCard
                              match={match}
                              version={ddragonVersion}
                              recentMatches={matchesToRender}
                              hideShareButton={hideShareButton}
                              userId={userId}
                              isOwnProfile={isOwnProfile}
                              priority={idx < 2}
                              onSelectMatch={handleSelectMatch}
                              onHoverMatch={handlePrefetchMatch}
                              linkedAccountsMap={linkedAccountsMap}
                            />
                          )
                        ) : (
                          <MemoizedMatchCard
                            match={match}
                            version={ddragonVersion}
                            linkedAccountsMap={linkedAccountsMap}
                            recentMatches={matchesToRender}
                            hideShareButton={hideShareButton}
                            userId={userId}
                            isOwnProfile={isOwnProfile}
                            priority={idx < 3}
                            onSelectMatch={handleSelectMatch}
                            onHoverMatch={handlePrefetchMatch}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hasNextPage && (
              <div
                id="match-list-sentinel"
                className="h-10 w-full flex items-center justify-center py-8 bg-transparent"
              >
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-slate-400 animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs uppercase tracking-widest font-bold">
                      Cargando más...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal centralizado para mejor rendimiento */}
      {selectedMatchId && (
        <ScoreboardModal
          matchId={selectedMatchId}
          open={!!selectedMatchId}
          onOpenChange={(open) => {
            if (!open) setSelectedMatchId(null);
          }}
          linkedAccountsMap={linkedAccountsMap}
        />
      )}
    </div>
  );
}
