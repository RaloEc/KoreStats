/**
 * EJEMPLO: MatchHistoryList Optimizado
 *
 * Cambios principales:
 * 1. Queries escalonadas con `enabled`
 * 2. Uso de endpoint /matches/light
 * 3. startTransition para actualizaciones no urgentes
 * 4. Carga diferida de datos secundarios
 */

"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  startTransition,
} from "react";

// Importar componente ligero en lugar del pesado
const MatchCardLite = React.lazy(() => import("./match-card/MatchCardLite"));

interface MatchHistoryListProps {
  userId?: string;
  puuid?: string;
  isOwnProfile?: boolean;
}

const INITIAL_LOAD = 5;
const MATCHES_PER_PAGE = 15;

export function MatchHistoryListOptimized({
  userId,
  puuid,
  isOwnProfile = false,
}: MatchHistoryListProps) {
  const queryClient = useQueryClient();
  const [queueFilter, setQueueFilter] = useState("all");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════
  // FASE 1: Query CRÍTICA - Datos para render inmediato
  // ═══════════════════════════════════════════════════════════
  const {
    data: matchPages,
    isLoading: isLoadingMatches,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["match-history-light", userId, queueFilter],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        userId: userId!,
        limit: String(pageParam === 0 ? INITIAL_LOAD : MATCHES_PER_PAGE),
        cursor: String(pageParam),
      });

      if (queueFilter !== "all") {
        params.set("queue", queueFilter);
      }

      const response = await fetch(`/api/riot/matches/light?${params}`);
      if (!response.ok) throw new Error("Error fetching matches");
      return response.json();
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
    // Mantener datos anteriores durante refetch (evita skeleton flash)
    placeholderData: (prev) => prev,
  });

  // ═══════════════════════════════════════════════════════════
  // FASE 2: Query SECUNDARIA - Version DDragon
  // Solo después de tener partidas para renderizar
  // ═══════════════════════════════════════════════════════════
  const { data: ddragonVersion = "15.3.1" } = useQuery({
    queryKey: ["ddragon-version"],
    queryFn: async () => {
      const res = await fetch(
        "https://ddragon.leagueoflegends.com/api/versions.json"
      );
      const versions = await res.json();
      return versions[0];
    },
    enabled: !isLoadingMatches && !!matchPages?.pages?.[0]?.matches?.length,
    staleTime: 60 * 60 * 1000, // 1 hora - raramente cambia
    gcTime: 24 * 60 * 60 * 1000, // 24 horas
  });

  // ═══════════════════════════════════════════════════════════
  // FASE 3: Query TERCIARIA - Stats de sesión
  // Solo para perfil propio, después del render inicial
  // ═══════════════════════════════════════════════════════════
  const { data: sessionStats } = useQuery({
    queryKey: ["match-session-stats"],
    queryFn: async () => {
      const params = new URLSearchParams({
        gapHours: "2",
        tzOffsetMinutes: String(new Date().getTimezoneOffset()),
      });
      const res = await fetch(`/api/riot/matches/session-stats?${params}`);
      return res.json();
    },
    enabled: isOwnProfile && !isLoadingMatches,
    staleTime: 30 * 1000, // 30 segundos
    refetchOnWindowFocus: true,
  });

  // ═══════════════════════════════════════════════════════════
  // FASE 4: Query LAZY - Linked accounts
  // Solo cuando se abre el modal de detalles
  // ═══════════════════════════════════════════════════════════
  const { data: linkedAccountsData } = useQuery({
    queryKey: ["linked-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/riot/linked-accounts");
      return res.json();
    },
    enabled: !!selectedMatchId, // Solo cuando hay modal abierto
    staleTime: 30 * 60 * 1000,
  });

  // ═══════════════════════════════════════════════════════════
  // Preparar datos para render
  // ═══════════════════════════════════════════════════════════
  const matches = useMemo(() => {
    return (matchPages?.pages ?? []).flatMap((page) => page.matches ?? []);
  }, [matchPages]);

  // Cambios de filtro con transición (no bloquea UI)
  const handleFilterChange = useCallback((newFilter: string) => {
    startTransition(() => {
      setQueueFilter(newFilter);
    });
  }, []);

  // Virtualización
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useWindowVirtualizer({
    count: matches.length,
    estimateSize: () => 80, // Altura de MatchCardLite
    overscan: 5,
  });

  // Auto-fetch cuando se acerca al final
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" }
    );

    const sentinel = document.getElementById("match-list-sentinel");
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════

  if (isLoadingMatches && matches.length === 0) {
    return <MatchHistorySkeleton count={5} />;
  }

  return (
    <div className="space-y-4">
      {/* Header con stats de hoy (solo si está disponible) */}
      {isOwnProfile && sessionStats?.success && (
        <SessionStatsHeader stats={sessionStats} />
      )}

      {/* Filtros de cola */}
      <QueueFilters
        currentFilter={queueFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Lista virtualizada */}
      <div ref={scrollContainerRef} className="w-full relative min-h-[100px]">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const match = matches[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <React.Suspense fallback={<MatchCardSkeleton />}>
                  <MatchCardLite
                    match={match}
                    version={ddragonVersion}
                    onClick={() => setSelectedMatchId(match.match_id)}
                    priority={virtualRow.index < 3}
                  />
                </React.Suspense>
              </div>
            );
          })}
        </div>

        {/* Sentinel para infinite scroll */}
        {hasNextPage && (
          <div id="match-list-sentinel" className="h-10 flex justify-center">
            {isFetchingNextPage && <LoadingSpinner />}
          </div>
        )}
      </div>

      {/* Modal cargado solo cuando se necesita */}
      {selectedMatchId && (
        <React.Suspense fallback={null}>
          <ScoreboardModalLazy
            matchId={selectedMatchId}
            onClose={() => setSelectedMatchId(null)}
            linkedAccountsMap={linkedAccountsData?.accounts}
          />
        </React.Suspense>
      )}
    </div>
  );
}

// Componentes auxiliares ligeros
function MatchHistorySkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg"
        />
      ))}
    </div>
  );
}

function MatchCardSkeleton() {
  return (
    <div className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
  );
}

function LoadingSpinner() {
  return (
    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  );
}

// Lazy load del modal pesado
const ScoreboardModalLazy = React.lazy(() => import("./ScoreboardModal"));

// Componentes simples para header y filtros (implementar según diseño actual)
function SessionStatsHeader({ stats }: { stats: any }) {
  return null; // Implementar según diseño
}

function QueueFilters({
  currentFilter,
  onFilterChange,
}: {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
}) {
  return null; // Implementar según diseño
}
