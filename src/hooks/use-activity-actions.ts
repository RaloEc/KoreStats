import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { feedCacheManager } from "@/lib/cache/feedCache";

interface ActivityActionOptions {
  activityType: string;
  activityId: string;
}

export function useActivityActions() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const hideActivity = async (options: ActivityActionOptions) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user-activity/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al ocultar actividad");
      }

      toast.success("Actividad ocultada");
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unhideActivity = async (options: ActivityActionOptions) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user-activity/unhide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al mostrar actividad");
      }

      toast.success("Actividad mostrada");
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteActivity = async (options: ActivityActionOptions) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user-activity/admin-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al eliminar actividad");
      }

      toast.success("Actividad eliminada");

      // Invalidar cachés para que la actividad desaparezca inmediatamente
      queryClient.invalidateQueries({ queryKey: ["perfil"] });
      queryClient.invalidateQueries({ queryKey: ["perfil", "actividades"] });

      // Invalidar caché del feed personalizado
      if (user?.id) {
        feedCacheManager.invalidate(user.id);
      }

      // Disparar evento personalizado para que el feed recargue
      window.dispatchEvent(
        new CustomEvent("activityDeleted", {
          detail: {
            activityType: options.activityType,
            activityId: options.activityId,
          },
        })
      );

      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    hideActivity,
    unhideActivity,
    deleteActivity,
    isLoading,
  };
}
