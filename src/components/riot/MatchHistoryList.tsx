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
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import React from "react";
import { useIsMobile } from "@/components/ui/use-mobile";
import {
  MatchCard,
  MobileMatchCard,
  getLatestDDragonVersion,
  FALLBACK_VERSION,
} from "./match-card";
import type { Match } from "./match-card";
import {
  MatchHistoryAdBanner,
  MobileMatchHistoryAdBanner,
} from "./match-card/MatchHistoryAdBanner";
import { useAuth } from "@/context/AuthContext";

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

      console.log(
        "[MatchHistoryList] 📡 Fetching page - isFirstPage:",
        isFirstPage,
        "limit:",
        limit,
        "cursor:",
        pageParam,
        "url:",
        `/api/riot/matches?${params.toString()}`
      );

      const response = await fetch(`/api/riot/matches?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch matches");
      }

      const data = (await response.json()) as MatchHistoryPage;
      console.log(
        "[MatchHistoryList] 📥 Page received - matches:",
        data.matches?.length || 0,
        "hasMore:",
        data.hasMore,
        "nextCursor:",
        data.nextCursor
      );
      if (data.matches && data.matches.length > 0) {
        console.log(
          "[MatchHistoryList] 🎮 First match in page:",
          data.matches[0].match_id,
          "game_creation:",
          data.matches[0].matches?.game_creation
        );
      }
      return data;
    },
    getNextPageParam: (lastPage) =>
      lastPage?.hasMore ? lastPage.nextCursor ?? undefined : undefined,
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutos - las partidas históricas no cambian
    gcTime: 60 * 60 * 1000, // 60 minutos en caché antes de garbage collection
    initialPageParam: null,
  });

  // Infinite scroll: cargar más partidas al hacer scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      if (!hasNextPage || isFetchingNextPage) {
        return;
      }

      const threshold = 200;
      const position = container.scrollTop + container.clientHeight;
      const triggerPoint = container.scrollHeight - threshold;

      if (position >= triggerPoint) {
        fetchNextPage();
      }
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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

      console.log("[MatchHistoryList] Cache limpiado, refetching...");

      // 4. Refetch limpio - esto creará una nueva query desde cero
      const result = await refetch();
      console.log("[MatchHistoryList] Refetch completado, resultado:", result);
    },
  });

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

  // Renderizado condicional debe estar después de todos los hooks
  const shouldShowInitialSkeleton =
    isLoading &&
    pages.length === 0 &&
    lastStableMatches.length === 0 &&
    !hasCachedMatches;

  if (shouldShowInitialSkeleton) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={`match-skeleton-${idx}`}
            className="animate-pulse rounded-xl border border-slate-800/70 bg-slate-900/40 p-4"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-slate-800/80" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-slate-800/80" />
                  <div className="h-3 w-1/4 rounded bg-slate-800/70" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((__, itemIdx) => (
                  <div
                    key={`match-skeleton-item-${idx}-${itemIdx}`}
                    className="h-5 rounded bg-slate-800/60"
                  />
                ))}
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
      {/* Encabezado con Estadísticas y filtros */}
      <div className="flex flex-col gap-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-600 dark:text-white ">
              Historial de Partidas
            </h3>
            <p className="text-sm text-slate-400">
              {stats.totalGames} partidas • {stats.wins}V {stats.losses}D •
              {stats.winrate}% WR
            </p>
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
          matchesToRender.map((match: Match, idx) => (
            <React.Fragment
              key={
                match.match_id ??
                match.id ??
                match.matches?.match_id ??
                `${match.puuid ?? "match"}-${idx}`
              }
            >
              {/* Banner de anuncio cada 7 partidas (después de la 7, 14, 21...) */}
              {idx > 0 && idx % 7 === 0 && (
                <div
                  className="match-card-appear"
                  style={{ animationDelay: `${Math.min(idx, 5) * 80}ms` }}
                >
                  {isMobile ? (
                    <MobileMatchHistoryAdBanner />
                  ) : (
                    <MatchHistoryAdBanner />
                  )}
                </div>
              )}
              <div
                className="match-card-appear space-y-2"
                style={{ animationDelay: `${Math.min(idx, 5) * 80}ms` }}
              >
                {isMobile ? (
                  <MobileMatchCard
                    match={match}
                    version={ddragonVersion}
                    recentMatches={matchesToRender}
                    hideShareButton={hideShareButton}
                  />
                ) : (
                  <MatchCard
                    match={match}
                    version={ddragonVersion}
                    linkedAccountsMap={linkedAccountsMap}
                    recentMatches={matchesToRender}
                    hideShareButton={hideShareButton}
                  />
                )}
              </div>
            </React.Fragment>
          ))
        )}
        <div className="h-1" />
      </div>

      {isFetchingNextPage && (
        <div className="flex items-center justify-center text-slate-400 text-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando más partidas...
        </div>
      )}

      {hasNextPage && !isFetchingNextPage && matches.length > 0 && (
        <div className="flex justify-center">
          <Button onClick={() => fetchNextPage()} variant="outline" size="sm">
            Cargar más partidas
          </Button>
        </div>
      )}
    </div>
  );
}
