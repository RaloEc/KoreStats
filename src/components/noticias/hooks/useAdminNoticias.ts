import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface NoticiaAdmin {
  id: string;
  titulo: string;
  resumen: string;
  contenido: string;
  imagen_url: string;
  fecha_publicacion: string;
  autor: string;
  autor_id: string;
  autor_nombre?: string;
  autor_color?: string;
  categoria_id?: string;
  categoria_nombre?: string;
  slug: string;
  vistas: number;
  destacada: boolean;
  es_activa: boolean;
  estado?: "borrador" | "publicada" | "programada";
  categorias?: {
    categoria_id: string;
    categoria: {
      nombre: string;
      slug: string;
      color: string;
    };
  }[];
}

export interface FiltrosNoticias {
  busqueda?: string;
  categoria?: string;
  estado?: "todas" | "activas" | "inactivas" | "destacadas";
  autor?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  vistasMin?: number;
  vistasMax?: number;
  ordenar?: string;
}

export interface RespuestaAdminNoticias {
  noticias: NoticiaAdmin[];
  total: number;
  pagina_actual: number;
  total_paginas: number;
  limite: number;
}

export interface EstadisticasNoticias {
  total_noticias: number;
  total_vistas: number;
  promedio_vistas: number;
  noticias_destacadas: number;
  noticias_inactivas: number;
}

// Hook para obtener noticias con paginación
export function useAdminNoticias(
  pagina: number,
  limite: number,
  filtros: FiltrosNoticias,
) {
  const lastFetchTime = useRef<number>(0);

  const query = useQuery<RespuestaAdminNoticias>({
    queryKey: ["admin-noticias", pagina, limite, filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("pagina", pagina.toString());
      params.append("limite", limite.toString());
      params.append("admin", "true");

      if (filtros.busqueda) params.append("busqueda", filtros.busqueda);
      if (filtros.categoria) params.append("categoria", filtros.categoria);
      if (filtros.ordenar) params.append("ordenar", filtros.ordenar);
      if (filtros.autor) params.append("autor", filtros.autor);
      if (filtros.fechaDesde) params.append("fecha_desde", filtros.fechaDesde);
      if (filtros.fechaHasta) params.append("fecha_hasta", filtros.fechaHasta);
      if (filtros.vistasMin !== undefined)
        params.append("vistas_min", filtros.vistasMin.toString());
      if (filtros.vistasMax !== undefined)
        params.append("vistas_max", filtros.vistasMax.toString());

      // Filtro por estado
      if (filtros.estado === "activas") params.append("es_activa", "true");
      if (filtros.estado === "inactivas") params.append("es_activa", "false");
      if (filtros.estado === "destacadas") params.append("destacada", "true");

      const respuesta = await fetch(`/api/admin/noticias?${params.toString()}`);

      if (!respuesta.ok) {
        throw new Error(`Error al cargar noticias: ${respuesta.status}`);
      }

      lastFetchTime.current = Date.now();
      return respuesta.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos (antes cacheTime)
    refetchOnWindowFocus: false,
  });

  // Detectar cuando la página vuelve a estar visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const timeSinceLastFetch = Date.now() - lastFetchTime.current;
        // Solo revalidar si han pasado más de 5 minutos
        if (timeSinceLastFetch > 5 * 60 * 1000) {
          query.refetch();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [query]);

  return query;
}

// Hook para prefetch de páginas adyacentes
export function usePrefetchAdminNoticias(
  paginaActual: number,
  limite: number,
  filtros: FiltrosNoticias,
  totalPaginas: number,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch página siguiente
    if (paginaActual < totalPaginas) {
      const params = new URLSearchParams();
      params.append("pagina", (paginaActual + 1).toString());
      params.append("limite", limite.toString());
      params.append("admin", "true");

      if (filtros.busqueda) params.append("busqueda", filtros.busqueda);
      if (filtros.categoria) params.append("categoria", filtros.categoria);
      if (filtros.ordenar) params.append("ordenar", filtros.ordenar);

      queryClient.prefetchQuery({
        queryKey: ["admin-noticias", paginaActual + 1, limite, filtros],
        queryFn: async () => {
          const respuesta = await fetch(
            `/api/admin/noticias?${params.toString()}`,
          );
          return respuesta.json();
        },
        staleTime: 2 * 60 * 1000,
      });
    }

    // Prefetch página anterior
    if (paginaActual > 1) {
      const params = new URLSearchParams();
      params.append("pagina", (paginaActual - 1).toString());
      params.append("limite", limite.toString());
      params.append("admin", "true");

      if (filtros.busqueda) params.append("busqueda", filtros.busqueda);
      if (filtros.categoria) params.append("categoria", filtros.categoria);
      if (filtros.ordenar) params.append("ordenar", filtros.ordenar);

      queryClient.prefetchQuery({
        queryKey: ["admin-noticias", paginaActual - 1, limite, filtros],
        queryFn: async () => {
          const respuesta = await fetch(
            `/api/admin/noticias?${params.toString()}`,
          );
          return respuesta.json();
        },
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [paginaActual, limite, filtros, totalPaginas, queryClient]);
}

// Hook para obtener estadísticas en tiempo real
export function useEstadisticasNoticias() {
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const query = useQuery<EstadisticasNoticias>({
    queryKey: ["admin-noticias-estadisticas"],
    queryFn: async () => {
      const respuesta = await fetch(
        "/api/admin/noticias/estadisticas?admin=true",
      );

      if (!respuesta.ok) {
        throw new Error("Error al cargar estadísticas");
      }

      return respuesta.json();
    },
    staleTime: 30 * 1000, // 30 segundos para tiempo real
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
  });

  // Configurar Supabase Realtime para escuchar cambios en noticias
  useEffect(() => {
    const supabase = createClient();

    // Suscribirse a cambios en la tabla noticias
    const channel = supabase
      .channel("admin-noticias-estadisticas-realtime")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "noticias",
        },
        (payload) => {
          // Invalidar y refetch de estadísticas cuando hay cambios
          queryClient.invalidateQueries({
            queryKey: ["admin-noticias-estadisticas"],
          });

          // También invalidar la lista de noticias
          queryClient.invalidateQueries({ queryKey: ["admin-noticias"] });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeEnabled(true);
        } else if (status === "CHANNEL_ERROR") {
          setRealtimeEnabled(false);
        } else if (status === "TIMED_OUT") {
          setRealtimeEnabled(false);
        }
      });

    // Cleanup al desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    ...query,
    realtimeEnabled,
  };
}

// Hook para eliminar noticia
export function useEliminarNoticia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const respuesta = await fetch(`/api/admin/noticias?id=${id}&admin=true`, {
        method: "DELETE",
      });

      if (!respuesta.ok) {
        throw new Error("Error al eliminar noticia");
      }

      return respuesta.json();
    },
    onSuccess: () => {
      // Invalidar todas las queries de noticias
      queryClient.invalidateQueries({ queryKey: ["admin-noticias"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-noticias-estadisticas"],
      });
    },
  });
}

// Hook para actualizar estado de noticia (campos booleanos: es_activa, destacada)
export function useActualizarEstadoNoticia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      campo,
      valor,
    }: {
      id: string;
      campo: string;
      valor: boolean;
    }) => {
      const respuesta = await fetch(`/api/admin/noticias/estado?admin=true`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, campo, valor }),
      });

      if (!respuesta.ok) {
        throw new Error("Error al actualizar estado");
      }

      return respuesta.json();
    },
    onMutate: async ({ id, campo, valor }) => {
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ["admin-noticias"] });

      // Snapshot del estado anterior
      const previousData = queryClient.getQueriesData({
        queryKey: ["admin-noticias"],
      });

      // Actualización optimista
      queryClient.setQueriesData<RespuestaAdminNoticias>(
        { queryKey: ["admin-noticias"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            noticias: old.noticias.map((noticia) =>
              noticia.id === id ? { ...noticia, [campo]: valor } : noticia,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Revertir en caso de error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-noticias"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-noticias-estadisticas"],
      });
    },
  });
}

// Hook para cambiar el estado de publicación (borrador, publicada, programada)
export function useCambiarEstadoPublicacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      nuevoEstado,
    }: {
      id: string;
      nuevoEstado: "borrador" | "publicada" | "programada";
    }) => {
      const respuesta = await fetch(
        `/api/admin/noticias/cambiar-estado?admin=true`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, estado: nuevoEstado }),
        },
      );

      if (!respuesta.ok) {
        throw new Error("Error al cambiar estado de publicación");
      }

      return respuesta.json();
    },
    onMutate: async ({ id, nuevoEstado }) => {
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ["admin-noticias"] });

      // Snapshot del estado anterior
      const previousData = queryClient.getQueriesData({
        queryKey: ["admin-noticias"],
      });

      // Actualización optimista
      queryClient.setQueriesData<RespuestaAdminNoticias>(
        { queryKey: ["admin-noticias"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            noticias: old.noticias.map((noticia) =>
              noticia.id === id ? { ...noticia, estado: nuevoEstado } : noticia,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Revertir en caso de error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-noticias"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-noticias-estadisticas"],
      });
    },
  });
}

// Hook para acciones masivas
export function useAccionesMasivas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      accion,
      valor,
    }: {
      ids: string[];
      accion:
        | "eliminar"
        | "activar"
        | "desactivar"
        | "destacar"
        | "quitar_destacada";
      valor?: boolean;
    }) => {
      const respuesta = await fetch(`/api/admin/noticias/masivas?admin=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids, accion, valor }),
      });

      if (!respuesta.ok) {
        throw new Error("Error al ejecutar acción masiva");
      }

      return respuesta.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-noticias"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-noticias-estadisticas"],
      });
    },
  });
}
