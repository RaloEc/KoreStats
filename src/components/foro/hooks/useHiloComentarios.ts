"use client";

import { useState, useEffect } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Comment } from "@/components/comentarios/types";

type ComentariosUser = User & {
  username?: string | null;
  avatar_url?: string | null;
  color?: string | null;
};

// Función para mapear comentarios de la API al tipo UI
const mapApiCommentToUI = (apiComment: any): Comment => {
  const authorId = apiComment.author_id || apiComment.autor?.id || "";

  return {
    id: apiComment.id,
    author: apiComment.autor?.username || "Usuario",
    authorId: authorId,
    avatarUrl: apiComment.autor?.avatar_url || "",
    timestamp: apiComment.created_at,
    text: apiComment.text || apiComment.contenido || "",
    authorColor: apiComment.autor?.color || "#3b82f6",
    replies: apiComment.replies
      ? apiComment.replies.map(mapApiCommentToUI)
      : [],
    isEdited: apiComment.isEdited || apiComment.editado || false,
    editedAt: apiComment.editedAt || apiComment.editado_en || null,
    deleted: apiComment.deleted || false,
    isSolution: apiComment.es_solucion || false, // Mapear campo de solución del foro
    votos_totales: apiComment.votos_totales || 0, // Mapear votos totales
    gif_url: apiComment.gif_url || null, // Mapear URL del GIF
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

export function useHiloComentarios(
  hiloId: string,
  pageSize: number = 20,
  order: "asc" | "desc" = "asc",
  sortBy: "recent" | "replies" | "votes" = "recent",
  initialUser?: ComentariosUser | null
) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<ComentariosUser | null>(
    typeof initialUser === "undefined" ? null : initialUser
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar autenticación al cargar
  useEffect(() => {
    if (typeof initialUser !== "undefined") {
      setUser(initialUser ?? null);
      return;
    }

    let isMounted = true;

    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (isMounted) {
        setUser((session?.user as ComentariosUser) ?? null);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [initialUser]);

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
    queryKey: ["comentarios", "hilo", hiloId, sortBy],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const url = `/api/comentarios?contentType=hilo&contentId=${encodeURIComponent(
          hiloId
        )}&limite=${pageSize}&offset=${pageParam}&orden=${order}&sortBy=${sortBy}`;

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
        console.error("Error al cargar comentarios del hilo:", err);
        throw err;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (total, page) => total + page.comentarios.length,
        0 as number
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
          content_type: "hilo",
          content_id: hiloId,
          gif_url: gifUrl || null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const newCommentData = await response.json();

      // Solo invalidar sin forzar recarga completa
      queryClient.invalidateQueries({
        queryKey: ["comentarios", "hilo", hiloId],
        refetchType: "none", // No refetch automático
      });

      // Refetch en background
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: ["comentarios", "hilo", hiloId],
        });
      }, 100);

      return true;
    } catch (err) {
      console.error("Error al crear comentario:", err);
      setError(
        err instanceof Error ? err.message : "Error al crear comentario"
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
    gifUrl?: string | null
  ) => {
    if (!user) {
      setError("Debes iniciar sesión para responder");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Crear respuesta optimista
      const optimisticReply: Comment = {
        id: `temp-${Date.now()}`, // ID temporal
        author: user.username || "Usuario",
        authorId: user.id,
        avatarUrl: user.avatar_url || "",
        timestamp: new Date().toISOString(),
        text: text,
        authorColor: user.color || "#3b82f6",
        gif_url: gifUrl || null,
        replies: [],
        isEdited: false,
        isSolution: false,
        repliedTo: repliedTo,
      };

      // Actualización optimista: añadir la respuesta inmediatamente a la UI
      queryClient.setQueryData(["comentarios", "hilo", hiloId], (old: any) => {
        if (!old) return old;

        // Función para añadir la respuesta al comentario padre
        const addReplyToComment = (comments: Comment[]): Comment[] => {
          return comments.map((comment) => {
            if (comment.id === parentId) {
              // Encontramos el comentario padre, añadimos la respuesta
              return {
                ...comment,
                replies: [...(comment.replies || []), optimisticReply],
              };
            } else if (comment.replies && comment.replies.length > 0) {
              // Buscar recursivamente en las respuestas
              return {
                ...comment,
                replies: addReplyToComment(comment.replies),
              };
            }
            return comment;
          });
        };

        // Actualizar todas las páginas
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            comentarios: addReplyToComment(page.comentarios),
          })),
        };
      });

      // Enviar al servidor
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
        // Revertir la actualización optimista en caso de error
        await queryClient.invalidateQueries({
          queryKey: ["comentarios", "hilo", hiloId],
        });
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      console.log("[useHiloComentarios] Respuesta creada exitosamente:", data);

      // Reemplazar la respuesta temporal con la real del servidor
      queryClient.setQueryData(["comentarios", "hilo", hiloId], (old: any) => {
        if (!old) return old;

        const replaceOptimisticReply = (comments: Comment[]): Comment[] => {
          return comments.map((comment) => {
            if (comment.id === parentId) {
              return {
                ...comment,
                replies:
                  comment.replies?.map((reply) =>
                    reply.id === optimisticReply.id
                      ? { ...reply, id: data.id } // Reemplazar con ID real
                      : reply
                  ) || [],
              };
            } else if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: replaceOptimisticReply(comment.replies),
              };
            }
            return comment;
          });
        };

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            comentarios: replaceOptimisticReply(page.comentarios),
          })),
        };
      });

      return true;
    } catch (err) {
      console.error("Error al crear respuesta:", err);
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

      console.log("[useHiloComentarios] Comentario editado exitosamente");

      // Resetear completamente la query para forzar recarga desde cero
      await queryClient.resetQueries({
        queryKey: ["comentarios", "hilo", hiloId],
      });

      return true;
    } catch (err) {
      console.error("Error al editar comentario:", err);
      setError(
        err instanceof Error ? err.message : "Error al editar comentario"
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

      // Guardar el estado anterior para poder revertir si falla
      const previousData = queryClient.getQueryData([
        "comentarios",
        "hilo",
        hiloId,
      ]);

      // Actualización optimista: eliminar el comentario inmediatamente
      queryClient.setQueryData(["comentarios", "hilo", hiloId], (old: any) => {
        if (!old) return old;

        // Función recursiva para eliminar el comentario
        const removeComment = (comments: Comment[]): Comment[] => {
          return comments
            .filter((comment) => comment.id !== commentId)
            .map((comment) => {
              if (comment.replies && comment.replies.length > 0) {
                // Buscar recursivamente en las respuestas
                return {
                  ...comment,
                  replies: removeComment(comment.replies),
                };
              }
              return comment;
            });
        };

        // Actualizar todas las páginas
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            comentarios: removeComment(page.comentarios),
            total: page.total - 1, // Decrementar el total
          })),
        };
      });

      // Enviar la petición al servidor
      const response = await fetch(`/api/comentarios/delete?id=${commentId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Revertir la actualización optimista
        queryClient.setQueryData(["comentarios", "hilo", hiloId], previousData);
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        // Revertir la actualización optimista
        queryClient.setQueryData(["comentarios", "hilo", hiloId], previousData);
        throw new Error(data.error || "Error al eliminar comentario");
      }

      console.log("[useHiloComentarios] Comentario eliminado exitosamente");

      // Invalidar en background para sincronizar con el servidor
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["comentarios", "hilo", hiloId],
          refetchType: "none",
        });
      }, 500);

      return true;
    } catch (err) {
      console.error("Error al eliminar comentario:", err);
      setError(
        err instanceof Error ? err.message : "Error al eliminar comentario"
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Marcar/desmarcar comentario como solución (funcionalidad específica del foro)
  const handleMarkSolution = async (commentId: string) => {
    if (!user) {
      setError("Debes iniciar sesión para marcar una solución");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const supabase = createClient();

      // Verificar si el comentario ya es solución
      const { data: currentPost } = await supabase
        .from("foro_posts")
        .select("es_solucion")
        .eq("id", commentId)
        .single();

      const isSolution = currentPost?.es_solucion || false;

      if (isSolution) {
        // Si ya es solución, desmarcarlo
        const { error: updateError } = await supabase
          .from("foro_posts")
          .update({ es_solucion: false })
          .eq("id", commentId);

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        // Si no es solución, primero desmarcar cualquier solución anterior
        await supabase
          .from("foro_posts")
          .update({ es_solucion: false })
          .eq("hilo_id", hiloId)
          .eq("es_solucion", true);

        // Marcar el nuevo post como solución
        const { error: updateError } = await supabase
          .from("foro_posts")
          .update({ es_solucion: true })
          .eq("id", commentId);

        if (updateError) {
          throw new Error(updateError.message);
        }
      }

      // Solo invalidar sin forzar recarga completa
      queryClient.invalidateQueries({
        queryKey: ["comentarios", "hilo", hiloId],
        refetchType: "none",
      });

      // Refetch en background
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: ["comentarios", "hilo", hiloId],
        });
      }, 100);

      return true;
    } catch (err) {
      console.error("Error al marcar/desmarcar solución:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al marcar/desmarcar solución"
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
          "hilo",
          hiloId,
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
  }, [hiloId, queryClient, refetch]);

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
    handleMarkSolution, // Funcionalidad específica del foro
  };
}
