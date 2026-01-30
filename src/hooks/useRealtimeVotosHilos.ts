import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

type VotoHiloPayload = {
  hilo_id: string;
  // Agrega aquí otros campos que necesites de la tabla foro_votos_hilos
  [key: string]: any;
};

type VotoHiloChangesPayload = RealtimePostgresChangesPayload<
  Record<string, any>
>;

/**
 * Hook para suscribirse a cambios en tiempo real de votos de hilos del foro
 * Actualiza automáticamente el cache de React Query cuando hay cambios
 */
export function useRealtimeVotosHilos() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupRealtimeSubscription = async () => {
      // Crear canal de Realtime para votos de hilos con configuración específica
      channel = supabase
        .channel("votos-hilos-global", {
          config: {
            broadcast: { self: true },
            presence: { key: "" },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "*", // Escuchar INSERT, UPDATE, DELETE
            schema: "public",
            table: "foro_votos_hilos",
          },
          (payload) => {
            // Obtener el hilo_id del payload de forma segura
            const newRecord = payload.new as VotoHiloPayload | null;
            const oldRecord = payload.old as VotoHiloPayload | null;
            const hiloId = newRecord?.hilo_id || oldRecord?.hilo_id;

            if (!hiloId) {
              return;
            }

            // Invalidar las queries para que se refetch cuando sea necesario
            // Usar refetchType: 'none' para evitar refetch automático que causa problemas
            queryClient.invalidateQueries({
              queryKey: ["foro", "hilos"],
              exact: false,
              refetchType: "none",
            });
          },
        )
        .subscribe((status, err) => {
          if (err) {
          }
        });
    };

    setupRealtimeSubscription();

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient, supabase]);
}
