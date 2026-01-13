"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Notification } from "@/types/database";

export const useNotifications = () => {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // 1. Cargar notificaciones iniciales
  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  // 2. Suscribirse a cambios en tiempo real (INSERT)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-realtime:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;

          // Disparar toast
          toast(newNotification.title, {
            description: newNotification.message,
            action: {
              label: "Ver",
              onClick: () => {
                // Lógica de navegación
              },
            },
          });

          // Actualización optimista del caché
          queryClient.setQueryData(
            ["notifications", user.id],
            (oldData: Notification[] = []) => {
              return [newNotification, ...oldData];
            }
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          queryClient.setQueryData(
            ["notifications", user.id],
            (oldData: Notification[] = []) =>
              oldData.filter((n) => n.id !== deletedId)
          );
        }
      )
      .subscribe((status) => {});

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, queryClient]);

  // 3. Exponer función markAsRead
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", user?.id); // Seguridad extra

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  // Función para marcar todas como leídas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  // 4. Mutación para eliminar notificación
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", user?.id);

      if (error) throw error;
      return notificationId;
    },
    onMutate: async (notificationId) => {
      // Cancelar cualquier refetch saliente para que no sobrescriba nuestra actualización optimista
      await queryClient.cancelQueries({
        queryKey: ["notifications", user?.id],
      });

      // Guardar el estado anterior
      const previousNotifications = queryClient.getQueryData<Notification[]>([
        "notifications",
        user?.id,
      ]);

      // Actualizar el caché de forma optimista
      if (previousNotifications) {
        queryClient.setQueryData(
          ["notifications", user?.id],
          previousNotifications.filter((n) => n.id !== notificationId)
        );
      }

      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      console.error("❌ [useNotifications] Error al eliminar:", err);
      // Revertir al estado anterior si falla
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications", user?.id],
          context.previousNotifications
        );
      }
      toast.error("No se pudo eliminar la notificación");
    },
    onSettled: () => {
      // Invalidar siempre para asegurar sincronización con el servidor
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
  };
};
