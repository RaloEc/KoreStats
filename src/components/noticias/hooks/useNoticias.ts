"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { Noticia, CategoriaNoticia } from "@/types";

// Tipos para filtros
export type FiltroNoticias = {
  busqueda?: string;
  autor?: string;
  categoria?: string;
  ordenFecha?: "asc" | "desc";
  tipo?: "recientes" | "populares" | "destacadas" | "mas-comentadas";
};

// Tipo para categorías
export type Categoria = CategoriaNoticia;

// Hook personalizado para gestionar las noticias con prefetching y optimizaciones
export function useNoticias(
  initialFiltros: FiltroNoticias = {},
  limit: number = 16,
) {
  const queryClient = useQueryClient();

  // Estado para los filtros - ahora se actualiza con initialFiltros
  const [filtros, setFiltros] = useState<FiltroNoticias>(initialFiltros);
  const [page, setPage] = useState(1);
  const pageSize = limit;

  // Actualizar filtros cuando cambien los initialFiltros
  useEffect(() => {
    setFiltros(initialFiltros);
  }, [
    initialFiltros.busqueda,
    initialFiltros.autor,
    initialFiltros.categoria,
    initialFiltros.ordenFecha,
    initialFiltros.tipo,
  ]);

  // Función para construir la URL de la API con los filtros
  const buildApiUrl = (pageParam: number = 1): string => {
    const baseUrl = "/api/noticias?";
    const params = new URLSearchParams();

    // Añadir parámetros de filtros si existen
    if (filtros.busqueda) params.append("busqueda", filtros.busqueda);
    if (filtros.autor) params.append("autor", filtros.autor);
    if (filtros.categoria) params.append("categoria", filtros.categoria);
    if (filtros.tipo) params.append("tipo", filtros.tipo);
    if (filtros.ordenFecha) params.append("ordenFecha", filtros.ordenFecha);

    // Añadir parámetros de paginación
    params.append("page", pageParam.toString());
    params.append("pageSize", pageSize.toString());

    return `${baseUrl}${params.toString()}`;
  };

  // Consulta de categorías
  const { data: categorias = [] } = useQuery({
    queryKey: ["noticias", "categorias"],
    queryFn: async () => {
      const response = await fetch("/api/noticias/categorias");

      if (!response.ok) {
        throw new Error("Error al cargar categorías");
      }

      const data = await response.json();

      if (!(data.success && Array.isArray(data.data))) {
        return [] as Categoria[];
      }

      // El API ya devuelve la estructura jerárquica correcta
      // Solo necesitamos asegurar que los tipos sean correctos
      const raices = (data.data as any[]).map((cat) => ({
        id: String(cat.id),
        nombre: cat.nombre,
        slug: cat.slug ?? String(cat.id),
        color: cat.color ?? undefined,
        icono: cat.icono ?? undefined,
        parent_id: cat.parent_id ?? null,
        subcategorias: (cat.subcategorias || []).map((sub: any) => ({
          id: String(sub.id),
          nombre: sub.nombre,
          slug: sub.slug ?? String(sub.id),
          color: sub.color ?? undefined,
          icono: sub.icono ?? undefined,
          parent_id: sub.parent_id ?? null,
          subcategorias: (sub.subcategorias || []).map((subsub: any) => ({
            id: String(subsub.id),
            nombre: subsub.nombre,
            slug: subsub.slug ?? String(subsub.id),
            color: subsub.color ?? undefined,
            icono: subsub.icono ?? undefined,
            parent_id: subsub.parent_id ?? null,
          })),
        })),
      }));

      return raices as unknown as Categoria[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Memoizar la query key para evitar re-renders innecesarios
  const queryKey = useMemo(
    () => ["noticias", "lista", filtros],
    [
      filtros.busqueda,
      filtros.autor,
      filtros.categoria,
      filtros.ordenFecha,
      filtros.tipo,
    ],
  );

  // Consulta principal de noticias con paginación infinita
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
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const url = buildApiUrl(pageParam);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Error al obtener noticias: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          // Verificar si hay más páginas
          const hasMore = result.data.length >= pageSize;

          // Devolver tanto los datos como la información de paginación
          return {
            data: result.data,
            hasMore,
            total: result.total || 0,
          };
        } else {
          throw new Error(result.message || "Error al cargar noticias");
        }
      } catch (error) {
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos para reducir peticiones
    gcTime: 10 * 60 * 1000, // 10 minutos en caché
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // Usar la información de paginación del servidor para determinar si hay más páginas
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
  });

  // Extraer todas las noticias de las páginas
  const noticias = data?.pages.flatMap((page) => page.data) || [];

  // Función para prefetch de la siguiente página
  const prefetchNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      const nextPage = (data?.pages.length || 0) + 1;
      const nextPageUrl = buildApiUrl(nextPage);

      queryClient.prefetchQuery({
        queryKey: [...queryKey, nextPage],
        queryFn: async () => {
          const response = await fetch(nextPageUrl);
          if (!response.ok) throw new Error("Error al prefetch");
          const result = await response.json();

          if (result.success) {
            return {
              data: result.data,
              hasMore: result.data.length >= pageSize,
              total: result.total || 0,
            };
          }

          return { data: [], hasMore: false, total: 0 };
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    data?.pages.length,
    buildApiUrl,
    queryClient,
    queryKey,
    pageSize,
  ]);

  // Función para cargar más noticias
  const loadMoreNoticias = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Función para actualizar filtros
  const updateFiltros = useCallback((newFiltros: FiltroNoticias) => {
    setFiltros((prev) => ({ ...prev, ...newFiltros }));
    setPage(1); // Reiniciar paginación
  }, []);

  // Función para limpiar filtros
  const clearFiltros = useCallback(() => {
    setFiltros({
      busqueda: "",
      autor: "",
      categoria: "",
      ordenFecha: "desc",
    });
    setPage(1);
  }, []);

  // Prefetch automático cuando se carga una página
  useEffect(() => {
    if (noticias.length > 0 && hasNextPage && !isFetchingNextPage) {
      // Prefetch después de un pequeño delay para no interferir con la carga actual
      const timer = setTimeout(() => {
        prefetchNextPage();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [noticias.length, hasNextPage, isFetchingNextPage, prefetchNextPage]);

  // Efecto para manejar la visibilidad de la página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Opcional: refrescar datos solo si han pasado X minutos desde la última actualización
        const lastUpdate = queryClient.getQueryState([
          "noticias",
          "lista",
          filtros,
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
  }, [filtros, queryClient, refetch]);

  return {
    noticias,
    categorias,
    filtros,
    isLoading,
    isRefetching,
    isError,
    error,
    updateFiltros,
    clearFiltros,
    loadMoreNoticias,
    hasNextPage,
    isFetchingNextPage,
  };
}
