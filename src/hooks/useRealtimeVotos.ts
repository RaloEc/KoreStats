import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Hook para suscribirse a cambios en tiempo real de votos de posts/comentarios
 * Actualiza automáticamente el cache de React Query cuando hay cambios
 */
export function useRealtimeVotos(hiloId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupRealtimeSubscription = () => {
      // Crear canal de Realtime para votos de posts
      channel = supabase
        .channel(`votos-posts-hilo-${hiloId}`)
        .on(
          "postgres_changes",
          {
            event: "*", // Escuchar INSERT, UPDATE, DELETE
            schema: "public",
            table: "foro_votos_posts",
          },
          (payload) => {
            // Invalidar queries relacionadas con comentarios para refrescar los votos
            queryClient.invalidateQueries({
              queryKey: ["comentarios", hiloId],
              exact: false,
            });

            // También invalidar la query del hilo si existe
            queryClient.invalidateQueries({
              queryKey: ["hilo", hiloId],
            });
          },
        )
        .subscribe((status) => {});
    };

    setupRealtimeSubscription();

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [hiloId, queryClient, supabase]);
}
