import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Hook para escuchar cambios en tiempo real de comentarios/posts del foro
 * @param contentType - Tipo de contenido: 'hilo' o 'noticia'
 * @param contentId - ID del hilo o noticia
 */
export function useRealtimeComments(
  contentType: "hilo" | "noticia",
  contentId: string,
) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    let channel: RealtimeChannel;

    // Determinar qué tabla escuchar según el tipo de contenido
    const tableName = contentType === "hilo" ? "foro_posts" : "comentarios";
    const filterColumn = contentType === "hilo" ? "hilo_id" : "entidad_id";

    // Crear canal de subscripción
    channel = supabase
      .channel(`${tableName}:${contentId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Escuchar INSERT, UPDATE, DELETE
          schema: "public",
          table: tableName,
          filter: `${filterColumn}=eq.${contentId}`,
        },
        (payload) => {
          // Invalidar la query para que React Query recargue los datos
          const queryKey =
            contentType === "hilo"
              ? ["comentarios", "hilo", contentId]
              : ["comentarios", "noticia", contentId];

          // Si es un INSERT o DELETE, invalidar inmediatamente
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "DELETE"
          ) {
            queryClient.invalidateQueries({
              queryKey,
              refetchType: "active", // Solo refetch si la query está activa
            });
          }

          // Si es un UPDATE, solo invalidar si no es del usuario actual
          // (para evitar refetch cuando el usuario edita su propio comentario)
          if (payload.eventType === "UPDATE") {
            queryClient.invalidateQueries({
              queryKey,
              refetchType: "active",
            });
          }
        },
      )
      .subscribe((status) => {});

    // Cleanup: desuscribirse al desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentType, contentId, queryClient, supabase]);
}
