"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

// ============================================================================
// TIPOS
// ============================================================================

export interface StaticProfileData {
  perfil: {
    id: string;
    username: string;
    role: "user" | "admin" | "moderator";
    email?: string;
    avatar_url: string;
    banner_url?: string | null;
    color: string;
    bio?: string;
    ubicacion?: string;
    sitio_web?: string;
    connected_accounts?: Record<string, string>;
    activo?: boolean;
    ultimo_acceso?: string;
    created_at?: string;
    updated_at?: string;
    followers_count?: number;
    following_count?: number;
    friends_count?: number;
  };
  riotAccount: {
    id: string;
    user_id: string;
    puuid: string;
    game_name: string;
    tag_line: string;
    tier?: string | null;
    rank?: string | null;
    league_points?: number;
    wins?: number;
    losses?: number;
    summoner_level?: number;
    profile_icon_id?: number;
  } | null;
}

export interface DynamicProfileData {
  estadisticas: {
    noticias: number;
    comentarios: number;
    hilos: number;
    respuestas: number;
  };
  actividades: ActivityItem[];
  hiddenItems: string[];
}

export interface ActivityItem {
  id: string;
  type:
    | "noticia"
    | "comentario"
    | "hilo"
    | "respuesta"
    | "weapon"
    | "lol_match";
  title: string;
  preview?: string;
  timestamp: string;
  category: string;
  // Campos adicionales para partidas
  matchId?: string;
  championId?: number;
  championName?: string;
  role?: string;
  lane?: string;
  win?: boolean;
  kda?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  totalCS?: number;
  csPerMin?: number;
  visionScore?: number;
  damageToChampions?: number;
  damageToTurrets?: number;
  goldEarned?: number;
  items?: number[];
  summoner1Id?: number;
  summoner2Id?: number;
  perkPrimaryStyle?: number;
  perkSubStyle?: number;
  perks?: any;
  rankingPosition?: number | null;
  performanceScore?: number | null;
  queueId?: number;
  gameDuration?: number;
  gameCreation?: number;
  dataVersion?: string;
  tier?: string | null;
  rank?: string | null;
  leaguePoints?: number;
  rankWins?: number;
  rankLosses?: number;
  comment?: string | null;
  gifUrl?: string;
  content?: string;
}

// ============================================================================
// CONSTANTES DE CACHÉ
// ============================================================================

const CACHE_TIMES = {
  // Tier 1: Datos estáticos (30 minutos)
  static: {
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  },
  // Tier 2: Datos dinámicos (siempre frescos)
  dynamic: {
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  },
};

// ============================================================================
// FUNCIONES DE FETCH
// ============================================================================

async function fetchStaticProfileData(): Promise<StaticProfileData> {
  // Agregar timestamp para evitar cualquier cache del navegador/Next.js
  const timestamp = Date.now();
  const response = await fetch(
    `/api/perfil/initial-data?tier=static&_t=${timestamp}`,
    {
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error("Error al cargar datos estáticos del perfil");
  }
  return response.json();
}

async function fetchDynamicProfileData(
  userId: string
): Promise<DynamicProfileData> {
  const response = await fetch(
    `/api/perfil/initial-data?tier=dynamic&userId=${userId}`
  );
  if (!response.ok) {
    throw new Error("Error al cargar datos dinámicos del perfil");
  }
  return response.json();
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useProfilePageData(
  initialStaticData?: StaticProfileData | null,
  initialDynamicData?: DynamicProfileData | null
) {
  const { user, session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Tier 1: Datos estáticos (cache 30min)
  const staticQuery = useQuery({
    queryKey: ["profile", "static", user?.id],
    queryFn: fetchStaticProfileData,
    initialData: initialStaticData || undefined,
    staleTime: CACHE_TIMES.static.staleTime,
    gcTime: CACHE_TIMES.static.gcTime,
    enabled: !!user?.id && !!session,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Tier 2: Datos dinámicos (siempre frescos)
  const dynamicQuery = useQuery({
    queryKey: ["profile", "dynamic", user?.id],
    queryFn: () => fetchDynamicProfileData(user!.id),
    initialData: initialDynamicData || undefined,
    staleTime: CACHE_TIMES.dynamic.staleTime,
    gcTime: CACHE_TIMES.dynamic.gcTime,
    enabled: !!user?.id && !!session && !!staticQuery.data,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Función para invalidar caché tras guardar cambios
  const invalidateStaticCache = () => {
    queryClient.invalidateQueries({
      queryKey: ["profile", "static", user?.id],
    });
  };

  const invalidateDynamicCache = () => {
    queryClient.invalidateQueries({
      queryKey: ["profile", "dynamic", user?.id],
    });
  };

  const invalidateAllCache = () => {
    invalidateStaticCache();
    invalidateDynamicCache();
  };

  // Función para invalidar Y refetch inmediatamente (para vinculación manual)
  const invalidateAndRefetchStatic = async () => {
    console.log(
      "[useProfilePageData] Invalidando y refetching datos estáticos..."
    );

    // Resetear caché completamente (forzar nuevo fetch)
    await queryClient.resetQueries({
      queryKey: ["profile", "static", user?.id],
    });

    // Refetch explícito
    const result = await staticQuery.refetch();

    console.log("[useProfilePageData] Refetch completado:", {
      hasRiotAccount: !!result.data?.riotAccount,
      riotAccountData: result.data?.riotAccount,
    });

    return result;
  };

  return {
    // Datos
    staticData: staticQuery.data ?? null,
    dynamicData: dynamicQuery.data ?? null,

    // Estados de carga
    isAuthLoading: authLoading,
    isStaticLoading: staticQuery.isLoading,
    isDynamicLoading: dynamicQuery.isLoading,
    isFullyLoaded: !authLoading && !!staticQuery.data && !!dynamicQuery.data,

    // Errores
    staticError: staticQuery.error,
    dynamicError: dynamicQuery.error,
    hasError: !!staticQuery.error || !!dynamicQuery.error,

    // Acciones
    invalidateStaticCache,
    invalidateDynamicCache,
    invalidateAllCache,
    invalidateAndRefetchStatic,
    refetchDynamic: dynamicQuery.refetch,

    // Auth context passthrough
    user,
    session,
  };
}

export default useProfilePageData;
