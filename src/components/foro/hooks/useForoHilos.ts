"use client";

import { useState, useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
  useMutation,
} from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

// Tipos locales
type CategoriaDb = {
  id: string;
  nombre: string;
  slug?: string;
  color?: string | null;
  parent_id?: string | null;
  orden?: number;
  subcategorias?: Categoria[];
};

export type Categoria = CategoriaDb & {
  subcategorias?: Categoria[];
  hilos?: { count: number }[];
};

type HiloDb = {
  id: string;
  titulo: string;
  contenido: string;
  autor_id: string;
  created_at: string;
  updated_at: string;
  ultimo_post_at?: string | null;
  vistas: number;
  deleted_at?: string | null;
};

export type Hilo = HiloDb & {
  slug: string | null;
  perfiles: {
    username: string;
    public_id: string | null;
    rol: string;
    avatar_url: string | null;
    color: string | null;
  } | null;
  foro_categorias: {
    nombre: string;
    color?: string | null;
    parent_id?: string | null;
    nivel?: number | null;
  } | null;
  votos_conteo: number;
  respuestas_conteo: number;
  voto_usuario?: number | null;
  weapon_stats_record?: {
    id: string;
    weapon_name: string | null;
    stats: any;
  } | null;
};

export type TabKey =
  | "recientes"
  | "populares"
  | "sin_respuesta"
  | "siguiendo"
  | "mios";
export type TimeRange = "24h" | "7d";

// Props para el hook
interface UseForoHilosProps {
  initialCategorias?: Categoria[];
}

// Hook personalizado para gestionar los hilos del foro
export function useForoHilos({
  initialCategorias = [],
}: UseForoHilosProps = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>("recientes");
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");

  // Usar categorías precargadas, no hacer fetch duplicado
  const categorias = initialCategorias;

  // Función para obtener token de autenticación
  const getAuthToken = async () => {
    const {
      data: { session },
    } = await (await import("@/lib/supabase/client"))
      .createClient()
      .auth.getSession();
    return session?.access_token;
  };

  // Consulta principal de hilos usando la API
  const {
    data,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["foro", "hilos", activeTab, timeRange, user?.id],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        tab: activeTab,
        timeRange: timeRange,
        page: pageParam.toString(),
      });

      // Para pestañas que requieren autenticación, añadir token
      if ((activeTab === "siguiendo" || activeTab === "mios") && user) {
        const token = await getAuthToken();
        if (token) {
          params.append("token", token);
        }
      }

      const response = await fetch(`/api/foro/hilos?${params.toString()}`);

      if (!response.ok) {
        throw new Error("No se pudieron cargar los hilos.");
      }

      const data = await response.json();
      return data.hilos || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // Si la última página tiene menos elementos que el tamaño de página,
      // significa que no hay más páginas
      const pageSize = 10;
      return lastPage.length < pageSize ? undefined : allPages.length + 1;
    },
  });

  // Extraer todos los hilos de las páginas
  const hilos = data?.pages.flat() || [];

  // Mutación para votar
  const voteMutation = useMutation({
    mutationFn: async ({
      hiloId,
      valorVoto,
    }: {
      hiloId: string;
      valorVoto: 1 | -1;
    }) => {
      if (!user) {
        throw new Error("Debes iniciar sesión para votar.");
      }

      const token = await getAuthToken();
      if (!token) {
        throw new Error("No se pudo obtener el token de autenticación.");
      }

      const response = await fetch("/api/foro/votar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hiloId, valorVoto }),
      });

      if (!response.ok) {
        throw new Error("Error al procesar el voto.");
      }

      return response.json();
    },
    onMutate: async ({ hiloId, valorVoto }) => {
      // Cancelar cualquier query en progreso
      await queryClient.cancelQueries({
        queryKey: ["foro", "hilos", activeTab, timeRange, user?.id],
      });

      // Snapshot del valor anterior
      const previousData = queryClient.getQueryData([
        "foro",
        "hilos",
        activeTab,
        timeRange,
        user?.id,
      ]);

      // Optimistic update
      queryClient.setQueryData(
        ["foro", "hilos", activeTab, timeRange, user?.id],
        (oldData: any) => {
          if (!oldData || !oldData.pages) return { pages: [], pageParams: [] };

          const newPages = oldData.pages.map((page: Hilo[]) =>
            page.map((hilo) => {
              if (hilo.id !== hiloId) return hilo;

              const votoPrevio = hilo.voto_usuario || 0;
              const nuevoVoto = votoPrevio === valorVoto ? 0 : valorVoto;
              const votosConteoPrevio = hilo.votos_conteo || 0;
              const nuevoConteo = votosConteoPrevio - votoPrevio + nuevoVoto;

              return {
                ...hilo,
                voto_usuario: nuevoVoto,
                votos_conteo: nuevoConteo,
              };
            }),
          );

          return {
            ...oldData,
            pages: newPages,
          };
        },
      );

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Revertir el cambio optimista en caso de error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["foro", "hilos", activeTab, timeRange, user?.id],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      // Refrescar los datos para asegurar consistencia
      queryClient.invalidateQueries({
        queryKey: ["foro", "hilos", activeTab, timeRange, user?.id],
      });
    },
  });

  // Función para manejar votos
  const handleVote = async (hiloId: string, valorVoto: 1 | -1) => {
    if (!user) {
      alert("Debes iniciar sesión para votar.");
      return;
    }

    voteMutation.mutate({ hiloId, valorVoto });
  };

  // Función para eliminar un hilo del caché
  const handleDeleteHilo = (hiloId: string) => {
    queryClient.setQueryData(
      ["foro", "hilos", activeTab, timeRange, user?.id],
      (oldData: any) => {
        if (!oldData || !oldData.pages) return { pages: [], pageParams: [] };

        const newPages = oldData.pages.map((page: Hilo[]) =>
          page.filter((hilo) => hilo.id !== hiloId),
        );

        return {
          ...oldData,
          pages: newPages,
        };
      },
    );
  };

  // Función para cargar más hilos
  const loadMoreHilos = () => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  };

  // Efecto para manejar el cambio de pestaña o rango de tiempo
  useEffect(() => {
    // Reiniciar la consulta cuando cambia la pestaña o el rango de tiempo
    refetch();
  }, [activeTab, timeRange, refetch]);

  // Efecto para manejar la visibilidad de la página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Opcional: refrescar datos solo si han pasado X minutos desde la última actualización
        const lastUpdate = queryClient.getQueryState([
          "foro",
          "hilos",
          activeTab,
          timeRange,
          user?.id,
        ])?.dataUpdatedAt;
        const now = Date.now();

        if (lastUpdate && now - lastUpdate > 5 * 60 * 1000) {
          // 5 minutos
          refetch();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeTab, timeRange, user?.id, queryClient, refetch]);

  return {
    hilos,
    categorias,
    isLoading,
    isRefetching,
    isError,
    error,
    activeTab,
    setActiveTab,
    timeRange,
    setTimeRange,
    handleVote,
    handleDeleteHilo,
    loadMoreHilos,
    hasNextPage,
    isFetchingNextPage,
    isVoting: voteMutation.isPending,
  };
}
