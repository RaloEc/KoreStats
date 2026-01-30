"use client";

import { useState, useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Comment } from "@/components/comentarios/types";

// Función para mapear comentarios de la API al tipo UI
const mapApiCommentToUI = (apiComment: any): Comment => {
  return {
    id: apiComment.id,
    author: apiComment.autor?.username || "Usuario",
    authorId: apiComment.autor_id || apiComment.autor?.id || "",
    avatarUrl: apiComment.autor?.avatar_url || "",
    timestamp: apiComment.created_at,
    text: apiComment.texto || apiComment.text, // Usar texto o text dependiendo de cuál esté disponible
    authorColor: apiComment.autor?.color || "#3b82f6", // Usar color del perfil
    gif_url: apiComment.gif_url || null,
    replies: apiComment.respuestas
      ? apiComment.respuestas.map(mapApiCommentToUI)
      : apiComment.replies
        ? apiComment.replies.map(mapApiCommentToUI)
        : [],
    isEdited: apiComment.isEdited || apiComment.editado || false,
    editedAt: apiComment.editado_en || null,
    deleted: apiComment.deleted || false,
    repliedTo: apiComment.repliedTo
      ? {
          id: apiComment.repliedTo.id,
          author: apiComment.repliedTo.author,
          text: apiComment.repliedTo.text,
          color: apiComment.repliedTo.color,
          isEdited: apiComment.repliedTo.isEdited || false,
          isDeleted: apiComment.repliedTo.isDeleted || false,
        }
      : undefined,
  };
};

export function useNoticiaComentarios(
  contentId: string,
  pageSize: number = 10,
  order: "asc" | "desc" = "desc",
) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkAuth();
  }, []);

  // Definir el tipo para la respuesta de la API
  interface ComentariosResponse {
    comentarios: any[];
    total: number;
    nextOffset: number;
  }

  // Consulta principal de comentarios con paginación infinita
  const {
    data,
    isLoading,
    isRefetching,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<ComentariosResponse>({
    queryKey: ["comentarios", "noticia", contentId],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const url = `/api/comentarios?contentType=noticia&contentId=${encodeURIComponent(
          contentId,
        )}&limite=${pageSize}&offset=${pageParam}&orden=${order}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Error al cargar comentarios");
        }

        return {
          comentarios: data.comentarios.map(mapApiCommentToUI),
          total: data.total,
          nextOffset: (pageParam as number) + pageSize,
        };
      } catch (err) {
        throw err;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (total, page) => total + page.comentarios.length,
        0 as number,
      );
      return loadedCount < lastPage.total ? lastPage.nextOffset : undefined;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false,
  });

  // Extraer todos los comentarios de las páginas
  const comentarios = data?.pages.flatMap((page) => page.comentarios) || [];
  const total = data?.pages[0]?.total || 0;

  // Función para cargar más comentarios
  const loadMoreComentarios = () => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  };

  // Manejar la adición de un nuevo comentario principal
  const handleAddComment = async (text: string, gifUrl?: string | null) => {
    if (!user) {
      setError("Debes iniciar sesión para comentar");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch("/api/comentarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          text,
          content_type: "noticia",
          content_id: contentId,
          gif_url: gifUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const newCommentData = await response.json();

      // Invalidar la caché para refetch en background (sin recargar el componente)
      queryClient.invalidateQueries({
        queryKey: ["comentarios", "noticia", contentId],
        refetchType: "active",
      });

      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al crear comentario",
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Manejar la adición de una respuesta a un comentario
  const handleAddReply = async (
    parentId: string,
    text: string,
    repliedTo?: { id: string; author: string; text: string; color?: string },
    gifUrl?: string | null,
  ) => {
    if (!user) {
      setError("Debes iniciar sesión para responder");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch("/api/comentarios/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          parent_id: parentId,
          text,
          gif_url: gifUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      // Invalidar la caché para refetch en background (sin recargar el componente)
      queryClient.invalidateQueries({
        queryKey: ["comentarios", "noticia", contentId],
        refetchType: "active",
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear respuesta");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Manejar la edición de un comentario
  const handleEditComment = async (commentId: string, newText: string) => {
    if (!user) {
      setError("Debes iniciar sesión para editar un comentario");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch("/api/comentarios/edit", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          comment_id: commentId,
          text: newText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Error al editar comentario");
      }

      // Invalidar la caché completamente y refetch inmediatamente
      await queryClient.resetQueries({
        queryKey: ["comentarios", "noticia", contentId],
      });

      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al editar comentario",
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Manejar la eliminación de un comentario
  const handleDeleteComment = async (commentId: string) => {
    if (!user) {
      setError("Debes iniciar sesión para eliminar un comentario");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Enviar la petición al servidor primero (sin actualización optimista)
      const response = await fetch(`/api/comentarios/delete?id=${commentId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Error al eliminar comentario");
      }

      // Invalidar la caché para refetch en background (sin recargar el componente)
      queryClient.invalidateQueries({
        queryKey: ["comentarios", "noticia", contentId],
        exact: true,
        refetchType: "active",
      });

      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al eliminar comentario",
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Efecto para manejar la visibilidad de la página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Refrescar datos solo si han pasado 5 minutos desde la última actualización
        const lastUpdate = queryClient.getQueryState([
          "comentarios",
          "noticia",
          contentId,
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
  }, [contentId, queryClient, refetch]);

  return {
    comentarios,
    total,
    isLoading,
    isRefetching,
    isError,
    error,
    user,
    submitting,
    loadMoreComentarios,
    hasNextPage,
    isFetchingNextPage,
    handleAddComment,
    handleAddReply,
    handleEditComment,
    handleDeleteComment,
  };
}
