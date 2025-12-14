"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// =====================================================
// Tipos de datos
// =====================================================

export interface NoticiaReciente {
  id: string;
  titulo: string;
  slug: string;
  estado: string;
  vistas: number;
  publicada_en: string | null;
  creada_en: string;
  imagen_portada: string | null;
  categoria_id: string | null;
  categoria_nombre: string | null;
  categoria_color: string | null;
  autor_id: string | null;
  autor_username: string | null;
  autor_avatar: string | null;
  // Campos adicionales de la RPC
  [key: string]: any;
}

export interface NoticiaMasVista extends NoticiaReciente {
  tendencia: number;
}

export interface NoticiasDashboardData {
  recientes: NoticiaReciente[];
  mas_vistas: NoticiaMasVista[];
  timestamp: string;
}

export interface UseNoticiasDashboardOptions {
  limiteRecientes?: number;
  limiteVistas?: number;
  incluirBorradores?: boolean;
  diasAtras?: number;
  enableRealtime?: boolean;
  refetchInterval?: number | false;
}

export interface UseNoticiasDashboardReturn {
  data: NoticiasDashboardData | undefined;
  recientes: NoticiaReciente[];
  masVistas: NoticiaMasVista[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isRealTimeActive: boolean;
  lastUpdate: Date | null;
  prefetchNoticia: (id: string) => Promise<void>;
}

// =====================================================
// Hook principal
// =====================================================

export function useNoticiasDashboard(
  options: UseNoticiasDashboardOptions = {}
): UseNoticiasDashboardReturn {
  const {
    limiteRecientes = 5,
    limiteVistas = 5,
    incluirBorradores = true,
    diasAtras = 30,
    enableRealtime = true,
    refetchInterval = false,
  } = options;

  const queryClient = useQueryClient();
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isRealTimeActive, setIsRealTimeActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Query principal usando la función RPC optimizada
  const { data, isLoading, isError, error, refetch } =
    useQuery<NoticiasDashboardData>({
      queryKey: [
        "noticias-dashboard",
        limiteRecientes,
        limiteVistas,
        incluirBorradores,
        diasAtras,
      ],
      queryFn: async () => {
        const startTime = performance.now();

        try {
          // Llamar a la función RPC unificada
          const { data, error } = await supabase.rpc(
            "obtener_noticias_dashboard",
            {
              limite_recientes: limiteRecientes,
              limite_vistas: limiteVistas,
              incluir_borradores: incluirBorradores,
              dias_atras: diasAtras,
            }
          );

          if (error) {
            console.error("❌ Error al obtener noticias del dashboard:", error);
            throw error;
          }

          const endTime = performance.now();
          const duration = endTime - startTime;

          // Métricas de rendimiento
          console.log(
            `⚡ Noticias dashboard cargadas en ${duration.toFixed(2)}ms`
          );

          // Enviar métrica de rendimiento
          if (typeof window !== "undefined" && (window as any).gtag) {
            (window as any).gtag("event", "timing_complete", {
              name: "load_noticias_dashboard",
              value: Math.round(duration),
              event_category: "Performance",
            });
          }

          return data as NoticiasDashboardData;
        } catch (err) {
          console.error("❌ Error en queryFn:", err);
          throw err;
        }
      },
      staleTime: 2 * 60 * 1000, // 2 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
      refetchOnWindowFocus: true,
      refetchInterval,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

  // Configurar suscripciones en tiempo real
  useEffect(() => {
    if (!enableRealtime) return;

    const handleRealtimeUpdate = (payload: any) => {
      console.log("📡 Cambio detectado en noticias:", payload);
      setLastUpdate(new Date());

      // Invalidar caché
      queryClient.invalidateQueries({
        queryKey: ["noticias-dashboard"],
      });

      // Enviar evento de actualización
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "realtime_update", {
          event_category: "Dashboard",
          event_label: "noticias",
        });
      }
    };

    // Crear canal de suscripción
    const channel = supabase
      .channel("noticias-dashboard-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "noticias",
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        console.log("📡 Estado de suscripción:", status);
        setIsRealTimeActive(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsRealTimeActive(false);
      }
    };
  }, [supabase, queryClient, enableRealtime]);

  // Función para prefetch de noticia individual
  const prefetchNoticia = useCallback(
    async (id: string) => {
      await queryClient.prefetchQuery({
        queryKey: ["noticia", id],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("noticias")
            .select("*")
            .eq("id", id)
            .single();

          if (error) throw error;
          return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
      });
    },
    [queryClient, supabase]
  );

  return {
    data,
    recientes: data?.recientes || [],
    masVistas: data?.mas_vistas || [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    isRealTimeActive,
    lastUpdate,
    prefetchNoticia,
  };
}

// =====================================================
// Hook para búsqueda y filtrado en el cliente
// =====================================================

export interface UseFiltrarNoticiasOptions {
  noticias: NoticiaReciente[];
  searchTerm?: string;
  estado?: string;
  categoriaId?: string;
  sortBy?: "fecha" | "vistas" | "titulo";
  sortOrder?: "asc" | "desc";
}

export function useFiltrarNoticias({
  noticias,
  searchTerm = "",
  estado,
  categoriaId,
  sortBy = "fecha",
  sortOrder = "desc",
}: UseFiltrarNoticiasOptions) {
  const [filteredNoticias, setFilteredNoticias] =
    useState<NoticiaReciente[]>(noticias);

  useEffect(() => {
    let resultado = [...noticias];

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const termLower = searchTerm.toLowerCase();
      resultado = resultado.filter(
        (noticia) =>
          noticia.titulo.toLowerCase().includes(termLower) ||
          noticia.slug.toLowerCase().includes(termLower)
      );
    }

    // Filtrar por estado
    if (estado) {
      resultado = resultado.filter((noticia) => noticia.estado === estado);
    }

    // Filtrar por categoría
    if (categoriaId) {
      resultado = resultado.filter(
        (noticia) => noticia.categoria_id === categoriaId
      );
    }

    // Ordenar
    resultado.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "fecha":
          comparison =
            new Date(a.creada_en).getTime() - new Date(b.creada_en).getTime();
          break;
        case "vistas":
          comparison = a.vistas - b.vistas;
          break;
        case "titulo":
          comparison = a.titulo.localeCompare(b.titulo);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredNoticias(resultado);
  }, [noticias, searchTerm, estado, categoriaId, sortBy, sortOrder]);

  return filteredNoticias;
}

// =====================================================
// Hook para métricas de rendimiento
// =====================================================

export function usePerformanceMetrics(componentName: string) {
  const mountTimeRef = useRef<number>(performance.now());
  const renderCountRef = useRef<number>(0);

  useEffect(() => {
    renderCountRef.current += 1;

    // Registrar tiempo de montaje en el primer render
    if (renderCountRef.current === 1) {
      const mountDuration = performance.now() - mountTimeRef.current;
      console.log(
        `⏱️ ${componentName} montado en ${mountDuration.toFixed(2)}ms`
      );

      // Enviar métrica
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "component_mount", {
          event_category: "Performance",
          event_label: componentName,
          value: Math.round(mountDuration),
        });
      }
    }
  });

  // Registrar tiempo de desmontaje
  useEffect(() => {
    return () => {
      console.log(
        `🔄 ${componentName} renderizado ${renderCountRef.current} veces`
      );

      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "component_renders", {
          event_category: "Performance",
          event_label: componentName,
          value: renderCountRef.current,
        });
      }
    };
  }, [componentName]);

  return {
    renderCount: renderCountRef.current,
  };
}
