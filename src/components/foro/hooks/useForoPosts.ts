import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  ForoPostConAutor,
  CreatePostData,
  UpdatePostData,
} from "@/types/foro";

/**
 * Hook para obtener los posts de un hilo
 */
export function useForoPosts(hiloId: string) {
  return useQuery({
    queryKey: ["foro-posts", hiloId],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("foro_posts_con_perfil")
        .select("*")
        .eq("hilo_id", hiloId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      // Mapear los datos para asegurar que la estructura sea consistente
      const posts = (data || []).map((post) => ({
        ...post,
        autor: {
          id: post.autor_id,
          username: post.username,
          avatar_url: post.avatar_url,
          role: post.role,
          color: post.color,
        },
      }));

      return posts as ForoPostConAutor[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos (antes cacheTime)
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Hook para crear un nuevo post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePostData) => {
      const supabase = createClient();

      // Obtener el ID del usuario autenticado
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Debes iniciar sesión para publicar");
      }

      // Insertar el post con el autor_id
      const { data: newPost, error } = await supabase
        .from("foro_posts")
        .insert([
          {
            contenido: data.contenido,
            hilo_id: data.hilo_id,
            post_padre_id: data.post_padre_id || null,
            autor_id: user.id, // Asegurarse de incluir el autor_id
          },
        ])
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Obtener el perfil del autor
      const { data: perfil, error: perfilError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", newPost.autor_id)
        .single();

      if (perfilError) {
      }

      // Crear el objeto de respuesta con la estructura correcta
      const postConAutor: ForoPostConAutor = {
        ...newPost,
        autor: {
          id: newPost.autor_id,
          username: perfil?.username || "Usuario",
          avatar_url: perfil?.avatar_url || null,
          role: perfil?.role,
          color: perfil?.color,
        },
        username: perfil?.username,
        avatar_url: perfil?.avatar_url,
        role: perfil?.role,
        color: perfil?.color,
      };

      return postConAutor;
    },
    onSuccess: (_, variables) => {
      // Invalidar la query de posts del hilo
      queryClient.invalidateQueries({
        queryKey: ["foro-posts", variables.hilo_id],
      });
    },
  });
}

/**
 * Hook para actualizar un post existente
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      data,
    }: {
      postId: string;
      data: UpdatePostData;
    }) => {
      const supabase = createClient();

      // Obtener el post actual para el historial
      const { data: currentPost } = await supabase
        .from("foro_posts")
        .select("contenido, historial_ediciones")
        .eq("id", postId)
        .single();

      // Crear nuevo historial
      const nuevoHistorial = [
        ...(currentPost?.historial_ediciones || []),
        {
          contenido: currentPost?.contenido || "",
          editado_en: new Date().toISOString(),
          editado_por: "current_user", // TODO: obtener del contexto de auth
        },
      ];

      // Primero actualizamos el post
      const { error: updateError } = await supabase
        .from("foro_posts")
        .update({
          contenido: data.contenido,
          editado: true,
          editado_en: new Date().toISOString(),
          historial_ediciones: nuevoHistorial,
        })
        .eq("id", postId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Luego obtenemos el post actualizado con los datos del perfil
      const { data: updatedPost, error } = await supabase
        .from("foro_posts_con_perfil")
        .select("*")
        .eq("id", postId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Mapear los datos para asegurar que la estructura sea consistente
      const postConAutor = {
        ...updatedPost,
        autor: {
          id: updatedPost.autor_id,
          username: updatedPost.username,
          avatar_url: updatedPost.avatar_url,
          role: updatedPost.role,
          color: updatedPost.color,
        },
      };

      if (error) {
        throw new Error(error.message);
      }

      return updatedPost as ForoPostConAutor;
    },
    onSuccess: (data) => {
      // Invalidar la query de posts del hilo
      queryClient.invalidateQueries({
        queryKey: ["foro-posts", data.hilo_id],
      });
    },
  });
}

/**
 * Hook para eliminar un post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const supabase = createClient();

      // Primero obtener el hilo_id antes de eliminar
      const { data: post } = await supabase
        .from("foro_posts")
        .select("hilo_id")
        .eq("id", postId)
        .single();

      const { error } = await supabase
        .from("foro_posts")
        .delete()
        .eq("id", postId);

      if (error) {
        throw new Error(error.message);
      }

      return { postId, hiloId: post?.hilo_id };
    },
    onSuccess: (data) => {
      if (data.hiloId) {
        // Invalidar la query de posts del hilo
        queryClient.invalidateQueries({
          queryKey: ["foro-posts", data.hiloId],
        });
      }
    },
  });
}

/**
 * Hook para marcar un post como solución
 */
export function useMarkSolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hiloId,
      postId,
    }: {
      hiloId: string;
      postId: string;
    }) => {
      const supabase = createClient();

      // Primero desmarcar cualquier solución anterior
      await supabase
        .from("foro_posts")
        .update({ es_solucion: false })
        .eq("hilo_id", hiloId)
        .eq("es_solucion", true);

      // Marcar el nuevo post como solución
      const { data, error } = await supabase
        .from("foro_posts")
        .update({ es_solucion: true })
        .eq("id", postId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidar la query de posts del hilo
      queryClient.invalidateQueries({
        queryKey: ["foro-posts", variables.hiloId],
      });
    },
  });
}

/**
 * Hook para obtener el conteo de posts de un hilo
 */
export function usePostsCount(hiloId: string) {
  return useQuery({
    queryKey: ["foro-posts-count", hiloId],
    queryFn: async () => {
      const supabase = createClient();

      const { count, error } = await supabase
        .from("foro_posts")
        .select("*", { count: "exact", head: true })
        .eq("hilo_id", hiloId);

      if (error) {
        throw new Error(error.message);
      }

      return count || 0;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
