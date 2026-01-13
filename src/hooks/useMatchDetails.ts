import { useQuery, type QueryClient } from "@tanstack/react-query";

export interface MatchDetailsResponse {
  match: Record<string, unknown>;
  participants: Record<string, unknown>[];
}

async function fetchMatchDetails(
  matchId: string
): Promise<MatchDetailsResponse> {
  const response = await fetch(`/api/riot/matches/${matchId}`);

  if (response.status === 404) {
    throw new Error("Partida no encontrada");
  }

  if (!response.ok) {
    throw new Error("Error al cargar los detalles de la partida");
  }

  return (await response.json()) as MatchDetailsResponse;
}

interface UseMatchDetailsOptions {
  enabled?: boolean;
}

export function useMatchDetails(
  matchId: string,
  options?: UseMatchDetailsOptions
) {
  return useQuery<MatchDetailsResponse, Error>({
    queryKey: ["match-details", matchId],
    queryFn: () => fetchMatchDetails(matchId),
    enabled: Boolean(matchId) && (options?.enabled ?? true),
    // OPTIMIZACIÓN: Las partidas terminadas son inmutables, cachear agresivamente
    staleTime: 30 * 60 * 1000, // 30 minutos - los datos de partida no cambian
    gcTime: 60 * 60 * 1000, // 1 hora en memoria
    refetchOnMount: false, // No refetch si ya hay datos frescos
    refetchOnWindowFocus: false, // Evitar refetches al cambiar de pestaña
    // OPTIMIZACIÓN: Mostrar datos anteriores mientras se revalida (evita spinner flash)
    placeholderData: (previousData) => previousData,
    retry: (failureCount, error) => {
      if (error.message === "Partida no encontrada") {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export async function prefetchMatchDetails(
  queryClient: QueryClient,
  matchId: string
) {
  if (!matchId) {
    return;
  }

  await queryClient.ensureQueryData({
    queryKey: ["match-details", matchId],
    queryFn: () => fetchMatchDetails(matchId),
    staleTime: 5 * 60 * 1000,
  });
}
