import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "./use-toast";

interface UnifiedSyncResult {
  accountSync: {
    success: boolean;
    error?: string;
  };
  matchesSync: {
    success: boolean;
    error?: string;
  };
}

/**
 * Hook unificado para sincronizar cuenta de Riot y historial de partidas
 * Ejecuta ambas operaciones en secuencia y coordina estados/cachés
 */
export function useUnifiedRiotSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Mutación para sincronizar cuenta + partidas
  const syncMutation = useMutation({
    mutationFn: async (): Promise<UnifiedSyncResult> => {
      const results: UnifiedSyncResult = {
        accountSync: { success: false },
        matchesSync: { success: false },
      };

      // 1. Sincronizar cuenta de Riot
      try {
        const accountResponse = await fetch("/api/riot/sync", {
          method: "POST",
        });

        if (!accountResponse.ok) {
          const errorData = await accountResponse.json();
          results.accountSync.error =
            errorData.error || "Error al sincronizar cuenta";
        } else {
          results.accountSync.success = true;
        }
      } catch (error: any) {
        results.accountSync.error = error.message || "Error desconocido";
      }

      // 2. Sincronizar historial de partidas
      try {
        const matchesResponse = await fetch("/api/riot/matches/sync", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (!matchesResponse.ok) {
          const errorData = await matchesResponse.json();
          results.matchesSync.error =
            errorData.error || "Error al sincronizar partidas";
        } else {
          results.matchesSync.success = true;
        }
      } catch (error: any) {
        results.matchesSync.error = error.message || "Error desconocido";
      }

      return results;
    },
    onSuccess: async (results) => {
      // Iniciar cooldown de 60 segundos
      setCooldownSeconds(60);

      // Limpiar cachés de ambas operaciones

      // Cachés de cuenta
      await queryClient.cancelQueries({ queryKey: ["riot-account"] });
      queryClient.removeQueries({ queryKey: ["riot-account"] });
      queryClient.invalidateQueries({ queryKey: ["riot-account"] });

      // Cachés de partidas
      await queryClient.cancelQueries({ queryKey: ["match-history"] });
      await queryClient.cancelQueries({ queryKey: ["match-history-cache"] });
      queryClient.removeQueries({ queryKey: ["match-history"] });
      queryClient.removeQueries({ queryKey: ["match-history-cache"] });
      queryClient.invalidateQueries({ queryKey: ["match-history"] });
      queryClient.invalidateQueries({ queryKey: ["match-history-cache"] });

      // Cachés de maestría
      await queryClient.cancelQueries({ queryKey: ["champion-mastery"] });
      queryClient.invalidateQueries({ queryKey: ["champion-mastery"] });

      // Mostrar toast con resultados
      const accountOk = results.accountSync.success;
      const matchesOk = results.matchesSync.success;

      if (accountOk && matchesOk) {
        toast({
          title: "Sincronización completada",
          description: "Cuenta y historial actualizados correctamente.",
        });
      } else if (accountOk && !matchesOk) {
        toast({
          title: "Sincronización parcial",
          description: `Cuenta ✓ | Historial ✗: ${results.matchesSync.error}`,
          variant: "destructive",
        });
      } else if (!accountOk && matchesOk) {
        toast({
          title: "Sincronización parcial",
          description: `Cuenta ✗: ${results.accountSync.error} | Historial ✓`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error en sincronización",
          description: `Cuenta: ${results.accountSync.error} | Historial: ${results.matchesSync.error}`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al sincronizar",
        variant: "destructive",
      });
    },
  });

  // Efecto para decrementar el cooldown cada segundo
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  return {
    sync: () => syncMutation.mutate(),
    isPending: syncMutation.isPending,
    cooldownSeconds,
    isOnCooldown: cooldownSeconds > 0,
  };
}
