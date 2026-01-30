import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SocialStats,
  FollowersResponse,
  FollowingResponse,
  FriendRequestsResponse,
  FriendsResponse,
} from "@/types/social";

// =================================================================
// HOOKS PARA SEGUIR/DEJAR DE SEGUIR
// =================================================================

export const useFollowMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetPublicId: string) => {
      const response = await fetch("/api/social/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPublicId }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Si es 409, significa que ya sigue, no es un error real
        if (response.status === 409) {
          return { already_following: true };
        }
        throw new Error(error.error || "Error al seguir usuario");
      }

      return response.json();
    },
    onMutate: async (targetPublicId) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({
        queryKey: ["social-status", targetPublicId],
      });

      // Snapshot del estado anterior
      const previousStatus = queryClient.getQueryData([
        "social-status",
        targetPublicId,
      ]);

      // Actualización optimista
      queryClient.setQueryData(
        ["social-status", targetPublicId],
        (old: any) => ({
          ...old,
          is_following: true,
        }),
      );

      return { previousStatus, targetPublicId };
    },
    onError: (err, targetPublicId, context) => {
      // Revertir cambios optimistas
      if (context?.previousStatus) {
        queryClient.setQueryData(
          ["social-status", targetPublicId],
          context.previousStatus,
        );
      }
      toast.error(err.message);
    },
    onSettled: (data, error, targetPublicId) => {
      // Siempre revalidar desde el servidor para asegurar consistencia
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["social-status", targetPublicId],
        });
        queryClient.invalidateQueries({
          queryKey: ["followers", targetPublicId],
        });
        queryClient.invalidateQueries({ queryKey: ["perfil", targetPublicId] });
      }, 100);
    },
    onSuccess: (data) => {
      if (!data?.already_following) {
        toast.success("Ahora sigues a este usuario");
      }
    },
  });
};

export const useUnfollowMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetPublicId: string) => {
      const response = await fetch(
        `/api/social/follow?targetPublicId=${targetPublicId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al dejar de seguir");
      }

      return response.json();
    },
    onMutate: async (targetPublicId) => {
      await queryClient.cancelQueries({
        queryKey: ["social-status", targetPublicId],
      });

      const previousStatus = queryClient.getQueryData([
        "social-status",
        targetPublicId,
      ]);

      queryClient.setQueryData(
        ["social-status", targetPublicId],
        (old: any) => ({
          ...old,
          is_following: false,
        }),
      );

      return { previousStatus, targetPublicId };
    },
    onError: (err, targetPublicId, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(
          ["social-status", targetPublicId],
          context.previousStatus,
        );
      }
      toast.error(err.message);
    },
    onSettled: (data, error, targetPublicId) => {
      // Siempre revalidar desde el servidor
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["social-status", targetPublicId],
        });
        queryClient.invalidateQueries({
          queryKey: ["followers", targetPublicId],
        });
        queryClient.invalidateQueries({ queryKey: ["perfil", targetPublicId] });
      }, 100);
    },
    onSuccess: () => {
      toast.success("Dejaste de seguir a este usuario");
    },
  });
};

// =================================================================
// HOOKS PARA SOLICITUDES DE AMISTAD
// =================================================================

export const useSendFriendRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetPublicId: string) => {
      const response = await fetch("/api/social/friend-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPublicId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al enviar solicitud");
      }

      const data = await response.json();
      return data;
    },
    onMutate: async (targetPublicId) => {
      await queryClient.cancelQueries({
        queryKey: ["social-stats", targetPublicId],
      });

      const previousStats = queryClient.getQueryData([
        "social-stats",
        targetPublicId,
      ]);

      queryClient.setQueryData(
        ["social-stats", targetPublicId],
        (old: SocialStats | undefined) => ({
          ...old,
          friendship_status: "pending_sent",
        }),
      );

      return { previousStats, targetPublicId };
    },
    onError: (err, targetPublicId, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(
          ["social-stats", targetPublicId],
          context.previousStats,
        );
      }
      toast.error(err.message);
    },
    onSettled: (data, error, targetPublicId) => {
      queryClient.invalidateQueries({
        queryKey: ["social-stats", targetPublicId],
      });
      queryClient.invalidateQueries({ queryKey: ["friend-requests", "sent"] });
      queryClient.invalidateQueries({
        queryKey: ["social-status", targetPublicId],
      });
    },
    onSuccess: () => {
      toast.success("Solicitud de amistad enviada");
    },
  });
};

export const useRespondFriendRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      action,
    }: {
      requestId: string;
      action: "accept" | "reject" | "cancel";
    }) => {
      const response = await fetch(`/api/social/friend-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al responder solicitud");
      }

      return response.json();
    },
    onSuccess: (data, { action }) => {
      const messages = {
        accept: "Solicitud aceptada",
        reject: "Solicitud rechazada",
        cancel: "Solicitud cancelada",
      };
      toast.success(messages[action]);
    },
    onError: (err) => {
      toast.error(err.message);
    },
    onSettled: (data, error, { action }) => {
      // Invalidar todos los queries relacionados con amistades y estado social
      // Usar un pequeño delay para asegurar que los triggers de BD se ejecuten
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
        queryClient.invalidateQueries({ queryKey: ["friends"] });
        queryClient.invalidateQueries({ queryKey: ["friends-list"] });
        queryClient.invalidateQueries({ queryKey: ["social-stats"] });
        queryClient.invalidateQueries({ queryKey: ["social-status"] }); // Invalidar TODOS los social-status
        queryClient.invalidateQueries({ queryKey: ["perfil"] }); // Invalidar TODOS los perfiles para actualizar contadores
      }, 300);
    },
  });
};

// =================================================================
// HOOKS PARA BLOQUEOS
// =================================================================

export const useBlockUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetPublicId: string) => {
      const response = await fetch("/api/social/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPublicId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al bloquear usuario");
      }

      return response.json();
    },
    onMutate: async (targetPublicId) => {
      await queryClient.cancelQueries({
        queryKey: ["social-stats", targetPublicId],
      });

      const previousStats = queryClient.getQueryData([
        "social-stats",
        targetPublicId,
      ]);

      queryClient.setQueryData(
        ["social-stats", targetPublicId],
        (old: SocialStats | undefined) => ({
          ...old,
          is_blocked: true,
          is_following: false,
          friendship_status: "none",
        }),
      );

      return { previousStats, targetPublicId };
    },
    onError: (err, targetPublicId, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(
          ["social-stats", targetPublicId],
          context.previousStats,
        );
      }
      toast.error(err.message);
    },
    onSettled: (data, error, targetPublicId) => {
      queryClient.invalidateQueries({
        queryKey: ["social-stats", targetPublicId],
      });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    },
    onSuccess: () => {
      toast.success("Usuario bloqueado");
    },
  });
};

export const useUnblockUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetPublicId: string) => {
      const response = await fetch(
        `/api/social/block?targetPublicId=${targetPublicId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al desbloquear usuario");
      }

      return response.json();
    },
    onMutate: async (targetPublicId) => {
      await queryClient.cancelQueries({
        queryKey: ["social-stats", targetPublicId],
      });

      const previousStats = queryClient.getQueryData([
        "social-stats",
        targetPublicId,
      ]);

      queryClient.setQueryData(
        ["social-stats", targetPublicId],
        (old: SocialStats | undefined) => ({
          ...old,
          is_blocked: false,
        }),
      );

      return { previousStats, targetPublicId };
    },
    onError: (err, targetPublicId, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(
          ["social-stats", targetPublicId],
          context.previousStats,
        );
      }
      toast.error(err.message);
    },
    onSettled: (data, error, targetPublicId) => {
      queryClient.invalidateQueries({
        queryKey: ["social-stats", targetPublicId],
      });
    },
    onSuccess: () => {
      toast.success("Usuario desbloqueado");
    },
  });
};

// =================================================================
// HOOKS PARA CONSULTAS (QUERIES)
// =================================================================

export const useFollowers = (publicId: string, page = 1, limit = 20) => {
  return useQuery<FollowersResponse>({
    queryKey: ["followers", publicId, page, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/social/${publicId}/followers?page=${page}&limit=${limit}`,
      );
      if (!response.ok) {
        throw new Error("Error al cargar seguidores");
      }
      return response.json();
    },
    enabled: !!publicId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useFollowing = (publicId: string, page = 1, limit = 20) => {
  return useQuery<FollowingResponse>({
    queryKey: ["following", publicId, page, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/social/${publicId}/following?page=${page}&limit=${limit}`,
      );
      if (!response.ok) {
        throw new Error("Error al cargar seguidos");
      }
      return response.json();
    },
    enabled: !!publicId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useFriendRequests = (scope: "received" | "sent" = "received") => {
  return useQuery<FriendRequestsResponse>({
    queryKey: ["friend-requests", scope],
    queryFn: async () => {
      const response = await fetch(
        `/api/social/friend-requests?scope=${scope}`,
      );
      if (!response.ok) {
        throw new Error("Error al cargar solicitudes");
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 segundos (para notificaciones rápidas)
  });
};

export const useFriends = (publicId: string) => {
  return useQuery<FriendsResponse>({
    queryKey: ["friends", publicId],
    queryFn: async () => {
      const response = await fetch(`/api/social/${publicId}/friends`);
      if (!response.ok) {
        throw new Error("Error al cargar amigos");
      }
      return response.json();
    },
    enabled: !!publicId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSocialStatus = (publicId: string) => {
  return useQuery({
    queryKey: ["social-status", publicId],
    queryFn: async () => {
      const response = await fetch(`/api/social/${publicId}/status`);
      if (!response.ok) {
        throw new Error("Error al cargar estado social");
      }
      const data = await response.json();
      return data;
    },
    enabled: !!publicId,
    staleTime: 0, // Siempre fresco para cambios inmediatos
    gcTime: 5 * 60 * 1000, // Mantener en caché 5 minutos
    refetchOnWindowFocus: true, // Refetch cuando la ventana vuelve a tener foco
    refetchOnMount: true, // Refetch cuando el componente se monta
  });
};
