"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Función para calcular trends (porcentaje de cambio)
function calcularTrends(data: any) {
  const trends: any = {};

  // 1. Trend de Total Noticias (comparar mes actual vs mes anterior)
  if (data.noticias_por_mes && data.noticias_por_mes.length >= 2) {
    const mesActual = data.noticias_por_mes[0]?.cantidad || 0;
    const mesAnterior = data.noticias_por_mes[1]?.cantidad || 0;

    if (mesAnterior > 0) {
      trends.total_noticias = Math.round(
        ((mesActual - mesAnterior) / mesAnterior) * 100,
      );
    } else if (mesActual > 0) {
      trends.total_noticias = 100; // 100% si no había noticias el mes anterior
    } else {
      trends.total_noticias = 0;
    }
  }

  // 2. Trend de Total Vistas (comparar últimos 30 días vs 30-60 días atrás)
  if (
    data.vistas_ultimos_30_dias !== undefined &&
    data.vistas_30_60_dias_atras !== undefined
  ) {
    const vistasRecientes = data.vistas_ultimos_30_dias;
    const vistasAnteriores = data.vistas_30_60_dias_atras;

    if (vistasAnteriores > 0) {
      trends.total_vistas = Math.round(
        ((vistasRecientes - vistasAnteriores) / vistasAnteriores) * 100,
      );
    } else if (vistasRecientes > 0) {
      trends.total_vistas = 100; // 100% si no había vistas en el periodo anterior
    } else {
      trends.total_vistas = 0;
    }
  }

  // 3. Trend de Últimos 30 días (porcentaje del total)
  if (data.noticias_30d !== undefined && data.total_noticias) {
    const porcentajeRecientes = (data.noticias_30d / data.total_noticias) * 100;
    trends.ultimos_30_dias = Math.round(porcentajeRecientes);
  }

  // 4. Trend de Pendientes (negativo si hay pendientes)
  if (data.noticias_pendientes !== undefined) {
    trends.pendientes = data.noticias_pendientes > 0 ? -3 : 0;
  }

  return trends;
}

// Tipos para las estadísticas
export interface EstadisticasAdmin {
  total_noticias: number;
  total_vistas: number;
  total_categorias: number;
  total_autores: number;
  noticias_recientes: number;
  noticias_pendientes: number;
  noticias_por_mes: Array<{ mes: string; total: number }>;
  noticias_por_categoria: Array<{ categoria: string; total: number }>;
  noticias_por_autor: Array<{ autor: string; total: number }>;
  noticias_mas_vistas: Array<{
    id: string;
    titulo: string;
    vistas: number;
    fecha_publicacion: string;
  }>;
  // Trends calculados
  trends?: {
    total_noticias?: number;
    total_vistas?: number;
    ultimos_30_dias?: number;
    pendientes?: number;
  };
}

export interface NoticiaReciente {
  id: string;
  titulo: string;
  slug: string;
  estado: string;
  vistas: number;
  publicada_en: string | null;
  creada_en: string;
  autor: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

// Hook para obtener estadísticas con actualización en tiempo real
export function useAdminEstadisticas() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isRealTimeActive, setIsRealTimeActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Query para estadísticas
  const {
    data: estadisticas,
    isLoading,
    error,
    refetch,
  } = useQuery<EstadisticasAdmin>({
    queryKey: ["admin-estadisticas"],
    queryFn: async () => {
      const response = await fetch(
        "/api/admin/noticias/estadisticas?admin=true",
        {
          cache: "no-store", // Forzar no usar cache del navegador
        },
      );
      if (!response.ok) {
        throw new Error("Error al cargar estadísticas");
      }
      const data = await response.json();

      // Calcular trends basados en datos del mes anterior
      const trends = calcularTrends(data);

      return { ...data, trends };
    },
    staleTime: 0, // Siempre considerar datos como stale
    gcTime: 1 * 60 * 1000, // 1 minuto
    refetchOnWindowFocus: true,
    refetchInterval: 10 * 1000, // Refetch cada 10 segundos
  });

  // Configurar suscripciones en tiempo real
  useEffect(() => {
    // Función para invalidar caché y refrescar datos
    const handleRealtimeUpdate = (payload: any) => {
      setLastUpdate(new Date());

      // Invalidar caché de estadísticas
      queryClient.invalidateQueries({ queryKey: ["admin-estadisticas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-noticias-recientes"] });
    };

    // Crear canal de suscripción
    const channel = supabase
      .channel("admin-noticias-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "noticias",
        },
        handleRealtimeUpdate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categorias",
        },
        handleRealtimeUpdate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comentarios_noticias",
        },
        handleRealtimeUpdate,
      )
      .subscribe((status) => {
        setIsRealTimeActive(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    // Cleanup: desuscribirse al desmontar
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsRealTimeActive(false);
      }
    };
  }, [supabase, queryClient]);

  return {
    estadisticas,
    isLoading,
    error,
    refetch,
    isRealTimeActive,
    lastUpdate,
  };
}

// Hook para obtener noticias recientes con actualización en tiempo real
export function useNoticiasRecientes(limit: number = 5) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const {
    data: noticias,
    isLoading,
    error,
    refetch,
  } = useQuery<NoticiaReciente[]>({
    queryKey: ["admin-noticias-recientes", limit],
    queryFn: async () => {
      const response = await fetch(`/api/noticias?admin=true&limit=${limit}`);
      if (!response.ok) {
        throw new Error("Error al cargar noticias recientes");
      }
      const data = await response.json();
      return data.success ? data.data : [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  // Configurar suscripción en tiempo real para noticias
  useEffect(() => {
    const handleRealtimeUpdate = (payload: any) => {
      // Invalidar caché de noticias recientes
      queryClient.invalidateQueries({ queryKey: ["admin-noticias-recientes"] });
    };

    const channel = supabase
      .channel("admin-noticias-recientes-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "noticias",
        },
        handleRealtimeUpdate,
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, queryClient, limit]);

  return {
    noticias,
    isLoading,
    error,
    refetch,
  };
}

// Hook para obtener actividad reciente (últimas acciones)
export function useActividadReciente() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useQuery({
    queryKey: ["admin-actividad-reciente"],
    queryFn: async () => {
      // Obtener últimas noticias creadas/actualizadas
      const { data: noticias, error: errorNoticias } = await supabase
        .from("noticias")
        .select(
          "id, titulo, creada_en, actualizada_en, autor_id, perfiles(username)",
        )
        .order("actualizada_en", { ascending: false })
        .limit(10);

      if (errorNoticias) throw errorNoticias;

      return noticias || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}
