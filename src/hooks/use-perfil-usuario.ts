"use client";

import { useQuery } from "@tanstack/react-query";

export interface ProfileData {
  id: string;
  username: string;
  public_id: string;
  created_at: string;
  avatar_url: string;
  banner_url: string | null;
  bio: string;
  color: string;
  role: string;
  followers_count: number;
  following_count: number;
  friends_count: number;
  connected_accounts?: Record<string, string>;
  stats: {
    hilos: number;
    posts: number;
    promedio_respuestas_por_hilo?: number;
    categoria_favorita?: string | null;
    ultima_actividad?: string | null;
  };
  ultimosHilos: {
    id: string;
    slug?: string;
    titulo: string;
    contenido: string;
    created_at: string;
    categoria_titulo: string;
    vistas: number;
    respuestas: number;
    hasWeaponStats: boolean;
  }[];
  ultimosPosts: {
    id: string;
    contenido: string;
    created_at: string;
    hilo_id: string;
    hilo_titulo: string;
    gif_url?: string | null;
  }[];
  weaponStatsRecords: Array<{
    id: string;
    weapon_name: string | null;
    created_at: string;
    stats: Record<string, number> | null;
    hilo: {
      id: string;
      slug: string | null;
      titulo: string;
      created_at: string;
      vistas: number;
      categoria_titulo: string;
    };
  }>;
  ultimasPartidas?: Array<{
    id: string;
    matchId: string;
    championId: number;
    championName: string;
    role: string;
    lane: string;
    kda: number;
    kills: number;
    deaths: number;
    assists: number;
    totalCS: number;
    csPerMin: number;
    visionScore: number;
    damageToChampions: number;
    damageToTurrets: number;
    goldEarned: number;
    items: number[];
    summoner1Id: number;
    summoner2Id: number;
    perkPrimaryStyle: number;
    perkSubStyle: number;
    rankingPosition: number | null;
    performanceScore: number | null;
    result: "win" | "loss";
    queueId: number;
    gameDuration: number;
    gameCreation: number;
    dataVersion: string;
    tier: string | null;
    rank: string | null;
    leaguePoints: number;
    rankWins: number;
    rankLosses: number;
    comment: string | null;
    created_at: string;
    perks?: any;
  }>;
}

const fetchPerfilUsuario = async (publicId: string): Promise<ProfileData> => {
  const response = await fetch(`/api/perfil/${publicId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Perfil no encontrado");
    }
    throw new Error("Error al cargar el perfil");
  }

  return response.json();
};

export const usePerfilUsuario = (
  publicId: string,
  initialData?: ProfileData | null
) => {
  return useQuery<ProfileData, Error>({
    queryKey: ["perfil", publicId],
    queryFn: () => fetchPerfilUsuario(publicId),
    enabled: !!publicId,
    initialData: initialData || undefined,
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 60 minutos
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
