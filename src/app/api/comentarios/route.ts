import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/utils/supabase-service";
import type { Comentario } from "@/types";

// GET para obtener comentarios de una entidad específica
export async function GET(request: Request) {
  try {
    console.log("[API Comentarios] Recibiendo solicitud GET");
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get("contentType");
    const contentId = searchParams.get("contentId");
    const limite = parseInt(searchParams.get("limite") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const orden = searchParams.get("orden") || "desc"; // 'desc' por defecto
    const sortBy = searchParams.get("sortBy") || "recent"; // 'recent' o 'replies'

    console.log("[API Comentarios] Parámetros de búsqueda:", {
      contentType,
      contentId,
      limite,
      offset,
      sortBy,
    });

    // Validar parámetros requeridos
    if (!contentType || !contentId) {
      console.log("[API Comentarios] Error: Faltan parámetros requeridos");
      return NextResponse.json(
        { success: false, error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    // Obtener comentarios con información del usuario
    const supabase = getServiceClient();

    // Caso para noticias - construir árbol de comentarios directamente
    if (contentType === "noticia") {
      console.log(
        "[API Comentarios] Obteniendo comentarios para noticia:",
        contentId
      );

      // 1) Obtener IDs de comentarios principales de la noticia
      const { data: noticiaComentariosIds } = await supabase
        .from("noticias_comentarios")
        .select("comentario_id")
        .eq("noticia_id", contentId);

      const comentarioPrincipalesIds =
        noticiaComentariosIds?.map((nc) => nc.comentario_id) || [];

      if (comentarioPrincipalesIds.length === 0) {
        console.log("[API Comentarios] No hay comentarios para esta noticia");
        return NextResponse.json({
          success: true,
          comentarios: [],
          total: 0,
        });
      }

      // 2) Obtener TODOS los comentarios (principales + todas sus respuestas recursivas)
      // Usamos una función recursiva para obtener todas las respuestas
      const getAllCommentIds = async (
        parentIds: string[]
      ): Promise<string[]> => {
        if (parentIds.length === 0) return [];

        const { data: replies } = await supabase
          .from("comentarios")
          .select("id")
          .in("comentario_padre_id", parentIds)
          .or("deleted.is.null,deleted.eq.false");

        const replyIds = replies?.map((r) => r.id) || [];
        if (replyIds.length === 0) return replyIds;

        // Recursivamente obtener respuestas de respuestas
        const nestedReplyIds = await getAllCommentIds(replyIds);
        return [...replyIds, ...nestedReplyIds];
      };

      // Obtener todos los IDs de respuestas recursivamente
      const allReplyIds = await getAllCommentIds(comentarioPrincipalesIds);
      const allCommentIds = [...comentarioPrincipalesIds, ...allReplyIds];

      // Obtener todos los comentarios con sus datos completos
      const { data: todosLosComentarios, error: comentariosError } =
        await supabase
          .from("comentarios")
          .select(
            `
            id, 
            contenido, 
            created_at, 
            usuario_id, 
            comentario_padre_id, 
            gif_url,
            perfiles:usuario_id(id, username, avatar_url, role, color)
          `
          )
          .in("id", allCommentIds)
          .or("deleted.is.null,deleted.eq.false")
          .order("created_at", { ascending: orden === "asc" });

      if (comentariosError) {
        console.error(
          "[API Comentarios] Error al obtener comentarios de noticia:",
          comentariosError
        );
        return NextResponse.json(
          {
            success: false,
            error: `Error al obtener comentarios: ${comentariosError.message}`,
          },
          { status: 500 }
        );
      }

      // 3) Contar comentarios principales no eliminados
      const totalComentarios = (todosLosComentarios || []).filter(
        (c) => !c.comentario_padre_id
      ).length;

      // 4) Crear un mapa de comentarios para acceso rápido
      const comentariosMap: Record<string, any> = {};
      (todosLosComentarios || []).forEach((comentario) => {
        comentariosMap[comentario.id] = {
          id: comentario.id,
          texto: comentario.contenido,
          text: comentario.contenido,
          created_at: comentario.created_at,
          autor_id: comentario.usuario_id,
          gif_url: comentario.gif_url || null,
          autor: comentario.perfiles,
          replies: [],
        };
      });

      // 5) Construir árbol de comentarios
      const buildCommentTree = (
        comments: Record<string, any>,
        parentId: string | null
      ): any[] => {
        return Object.values(comments)
          .filter((comment) => comment.comentario_padre_id === parentId)
          .map((comment) => {
            // Buscar el comentario original para obtener comentario_padre_id
            const original = (todosLosComentarios || []).find(
              (c) => c.id === comment.id
            );
            return {
              ...comment,
              replies: buildCommentTree(comments, comment.id),
            };
          });
      };

      // Crear el mapa con comentario_padre_id incluido
      const comentariosConPadre: Record<string, any> = {};
      (todosLosComentarios || []).forEach((comentario) => {
        comentariosConPadre[comentario.id] = {
          id: comentario.id,
          texto: comentario.contenido,
          text: comentario.contenido,
          created_at: comentario.created_at,
          autor_id: comentario.usuario_id,
          gif_url: comentario.gif_url || null,
          autor: comentario.perfiles,
          comentario_padre_id: comentario.comentario_padre_id,
          replies: [],
        };
      });

      // 6) Obtener comentarios principales paginados
      const comentariosPrincipales = (todosLosComentarios || [])
        .filter((c) => !c.comentario_padre_id)
        .slice(offset, offset + limite);

      // 7) Construir árbol para comentarios principales paginados
      const buildForoCommentTree = (
        comments: any[],
        parentId: string | null
      ): any[] => {
        return comments
          .filter((comment) => comment.comentario_padre_id === parentId)
          .map((comment) => ({
            id: comment.id,
            texto: comment.contenido,
            text: comment.contenido,
            created_at: comment.created_at,
            autor_id: comment.usuario_id,
            gif_url: comment.gif_url || null,
            autor: comment.perfiles,
            replies: buildForoCommentTree(comments, comment.id),
          }));
      };

      const comentariosConReplies = comentariosPrincipales.map((comentario) => {
        return {
          id: comentario.id,
          texto: comentario.contenido,
          text: comentario.contenido,
          created_at: comentario.created_at,
          autor_id: comentario.usuario_id,
          gif_url: comentario.gif_url || null,
          autor: comentario.perfiles,
          respuestas: buildForoCommentTree(
            todosLosComentarios || [],
            comentario.id
          ),
        };
      });

      console.log(
        `[API Comentarios] Se encontraron ${comentariosConReplies.length} comentarios de un total de ${totalComentarios}`
      );

      return NextResponse.json({
        success: true,
        comentarios: comentariosConReplies,
        total: totalComentarios,
      });
    }
    // Caso especial: hilos del foro usan foro_posts como fuente de respuestas
    else if (contentType === "hilo") {
      console.log("[API Comentarios] Modo hilo: leyendo desde foro_posts");
      const ascending = orden === "asc";

      // 1) Obtener todos los posts del hilo con votos
      // Primero intentar con el campo 'deleted', si falla intentar sin filtro
      let posts, postsError;

      try {
        const result = await supabase
          .from("foro_posts")
          .select("*, votos_totales")
          .eq("hilo_id", contentId)
          .order("created_at", { ascending: true });

        posts = result.data;
        postsError = result.error;

        // Si hay posts, filtrar manualmente los que tienen deleted = true
        if (posts && !postsError) {
          console.log(
            `[API Comentarios] Total posts antes de filtrar: ${posts.length}`
          );

          // Verificar si el campo 'deleted' existe
          const hasDeletedField = posts.length > 0 && "deleted" in posts[0];
          console.log(
            `[API Comentarios] Campo 'deleted' existe: ${hasDeletedField}`
          );

          if (hasDeletedField) {
            posts = posts.filter((p) => p.deleted === false);
            console.log(
              `[API Comentarios] Posts después de filtrar deleted=false: ${posts.length}`
            );
          }
        }
      } catch (err) {
        console.error("[API Comentarios] Error al obtener posts:", err);
        postsError = err;
      }

      if (postsError) {
        console.error(
          "[API Comentarios] Error al obtener posts del foro:",
          postsError
        );
        return NextResponse.json(
          {
            success: false,
            error: `Error al obtener posts: ${postsError.message}`,
          },
          { status: 500 }
        );
      }

      // Obtener referencias a posts eliminados para verificar citas
      const { data: postsEliminados } = await supabase
        .from("foro_posts_eliminados")
        .select("id");

      // Crear un conjunto para búsquedas rápidas
      const postsEliminadosSet = new Set(
        (postsEliminados || []).map((item) => item.id)
      );

      console.log(
        `[API Comentarios] Se encontraron ${postsEliminadosSet.size} posts eliminados en la tabla de referencias`
      );
      postsEliminadosSet.forEach((id) => {
        console.log(`[API Comentarios] Post eliminado con ID: ${id}`);
      });

      // 2) Contar posts totales (usar el conteo de posts filtrados)
      const count = posts?.length || 0;
      console.log(`[API Comentarios] Total de posts a mostrar: ${count}`);

      // 3) Obtener autores de los posts
      const autorIds = posts?.map((post) => post.autor_id) || [];
      const { data: autores } = await supabase
        .from("perfiles")
        .select("id, username, avatar_url, role, color")
        .in("id", autorIds);

      // 4) Construir un mapa de posts para acceso rápido
      const postsMap: Record<string, any> = {};
      posts?.forEach((post) => {
        postsMap[post.id] = post;
      });

      // 5) Mapear posts a formato de comentarios con información de citas
      const comentariosFormateados =
        posts?.map((post) => {
          console.log(
            `[API Comentarios][Hilo] Post ${post.id} gif_url:`,
            post.gif_url || null
          );

          const autorPerfil =
            autores?.find((autor) => autor.id === post.autor_id) || null;

          // Preparar información de repliedTo para respuestas
          let repliedTo = undefined;
          if (post.post_padre_id) {
            const parentPost = postsMap[post.post_padre_id];
            const isParentDeleted = postsEliminadosSet.has(post.post_padre_id);

            console.log(
              `[API Comentarios] Verificando post padre ${post.post_padre_id} para respuesta ${post.id}:`,
              {
                existeEnPosts: !!parentPost,
                existeEnEliminados: isParentDeleted,
              }
            );

            if (parentPost) {
              // El post padre existe en la lista actual
              const parentAutor = autores?.find(
                (autor) => autor.id === parentPost.autor_id
              );
              repliedTo = {
                id: parentPost.id,
                author: parentAutor?.username || "Usuario",
                text: parentPost.contenido,
                color: parentAutor?.color || "#3b82f6",
                isEdited: !!parentPost.historial_ediciones,
                isDeleted: false,
              };
            } else if (isParentDeleted) {
              // El post padre ha sido eliminado
              console.log(
                `[API Comentarios] Post padre ${post.post_padre_id} encontrado en tabla de eliminados`
              );
              repliedTo = {
                id: post.post_padre_id,
                author: "Usuario",
                text: "Este comentario ha sido eliminado",
                color: "#6b7280",
                isEdited: false,
                isDeleted: true,
              };
            } else {
              console.log(
                `[API Comentarios] ADVERTENCIA: No se encontró el post padre ${post.post_padre_id} ni en posts ni en eliminados`
              );
            }
          }

          const replyWithGif = {
            id: post.id,
            content_type: "hilo",
            content_id: contentId,
            author_id: post.autor_id,
            text: post.contenido,
            parent_id: post.post_padre_id || null,
            created_at: post.created_at,
            updated_at: post.updated_at,
            gif_url: post.gif_url || null, // Incluir URL del GIF
            autor: autorPerfil,
            replies: [],
            repliedTo: repliedTo,
            isEdited: !!post.historial_ediciones,
            es_solucion: post.es_solucion || false, // Incluir campo de solución
            votos_totales: post.votos_totales || 0, // Incluir votos totales
          };

          console.log(
            `[API Comentarios][Hilo] Post ${post.id} (padre ${
              post.post_padre_id || "root"
            }) preparado con gif_url:`,
            replyWithGif.gif_url
          );

          return replyWithGif;
        }) || [];

      // 6) Ordenar comentarios principales según sortBy
      let comentariosPrincipales = comentariosFormateados.filter(
        (c) => !c.parent_id
      );

      // Encontrar la solución si existe
      const solucion = comentariosPrincipales.find((c) => c.es_solucion);

      // Filtrar la solución de la lista principal para no duplicarla
      if (solucion) {
        comentariosPrincipales = comentariosPrincipales.filter(
          (c) => c.id !== solucion.id
        );
      }

      if (sortBy === "replies") {
        // Contar respuestas para cada comentario
        const contarRespuestas = (commentId: string): number => {
          return comentariosFormateados.filter((c) => c.parent_id === commentId)
            .length;
        };

        // Ordenar por cantidad de respuestas (descendente)
        comentariosPrincipales = comentariosPrincipales.sort((a, b) => {
          const countA = contarRespuestas(a.id);
          const countB = contarRespuestas(b.id);
          return countB - countA;
        });
      } else if (sortBy === "votes") {
        // Ordenar por votos (descendente)
        comentariosPrincipales = comentariosPrincipales.sort((a, b) => {
          const votesA = a.votos_totales || 0;
          const votesB = b.votos_totales || 0;
          return votesB - votesA;
        });
      } else {
        // Ordenar por fecha (más recientes primero)
        comentariosPrincipales = comentariosPrincipales.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA; // Descendente
        });
      }

      // 7) Aplicar paginación después del ordenamiento
      // Si hay solución y es la primera página (offset 0), incluimos la solución al principio
      let comentariosPaginados;

      if (solucion && offset === 0) {
        // En la primera página, mostramos la solución + (limite - 1) comentarios
        comentariosPaginados = [
          solucion,
          ...comentariosPrincipales.slice(0, limite - 1),
        ];
      } else {
        // En otras páginas o si no hay solución, paginación normal
        // Ajustamos el offset si hubo solución extraída para no saltar comentarios
        const adjustedOffset = solucion ? Math.max(0, offset - 1) : offset;
        comentariosPaginados = comentariosPrincipales.slice(
          adjustedOffset,
          adjustedOffset + limite
        );
      }

      // 7) Construir árbol de comentarios para los paginados
      const buildForoCommentTree = (
        comments: any[],
        parentId: string | null
      ): any[] => {
        return comments
          .filter((comment) => comment.parent_id === parentId)
          .map((comment) => {
            // Asegurar que author_id esté presente en todos los niveles
            const commentWithReplies = {
              ...comment,
              author_id: comment.author_id, // Preservar explícitamente
              replies: buildForoCommentTree(comments, comment.id),
            };

            console.log(
              `[API Comentarios][Hilo] Reply ${comment.id} (padre ${
                parentId || "root"
              }) gif_url:`,
              commentWithReplies.gif_url || null
            );

            return commentWithReplies;
          });
      };

      // 8) Para cada comentario principal paginado, añadir sus respuestas
      const comentariosConReplies = comentariosPaginados.map((comentario) => {
        return {
          ...comentario,
          replies: buildForoCommentTree(comentariosFormateados, comentario.id),
        };
      });

      console.log(
        `[API Comentarios] Enviando ${comentariosConReplies.length} comentarios principales con sus respuestas`
      );
      return NextResponse.json({
        success: true,
        comentarios: comentariosConReplies,
        total: comentariosPrincipales.length + (solucion ? 1 : 0),
        offset,
        limite,
      });
    }

    // Obtener referencias a comentarios eliminados para verificar citas
    const { data: comentariosEliminados } = await supabase
      .from("comentarios_eliminados")
      .select("id");

    // Crear un conjunto para búsquedas rápidas
    const comentariosEliminadosSet = new Set(
      (comentariosEliminados || []).map((item) => item.id)
    );

    console.log(
      `[API Comentarios] Se encontraron ${comentariosEliminadosSet.size} comentarios eliminados en la tabla de referencias`
    );
    comentariosEliminadosSet.forEach((id) => {
      console.log(`[API Comentarios] Comentario eliminado con ID: ${id}`);
    });

    // Para otros tipos de contenido, usar la tabla comentarios
    // Función recursiva para construir árbol de comentarios
    const buildCommentTree = (
      comments: any[],
      parentId: string | null = null
    ): Comentario[] => {
      return comments
        .filter((comment) => comment.comentario_padre_id === parentId)
        .map((comment) => {
          // Si es una respuesta, buscar información del comentario padre para repliedTo
          let repliedTo = undefined;
          if (comment.comentario_padre_id) {
            // Verificar si el comentario padre existe en los comentarios actuales
            const parentComment = comments.find(
              (c) => c.id === comment.comentario_padre_id
            );

            // Verificar si el comentario padre ha sido eliminado
            const isParentDeleted = comentariosEliminadosSet.has(
              comment.comentario_padre_id
            );

            console.log(
              `[API Comentarios] Verificando comentario padre ${comment.comentario_padre_id} para respuesta ${comment.id}:`,
              {
                existeEnComentarios: !!parentComment,
                existeEnEliminados: isParentDeleted,
              }
            );

            if (parentComment) {
              // El comentario padre existe en la lista actual
              repliedTo = {
                id: parentComment.id,
                author: parentComment.perfiles?.username || "Usuario",
                text: parentComment.contenido,
                color: parentComment.perfiles?.color || "#3b82f6",
                isEdited: !!parentComment.historial_ediciones,
                isDeleted: false,
              };
            } else if (isParentDeleted) {
              // El comentario padre ha sido eliminado
              console.log(
                `[API Comentarios] Comentario padre ${comment.comentario_padre_id} encontrado en tabla de eliminados`
              );
              repliedTo = {
                id: comment.comentario_padre_id,
                author: "Usuario",
                text: "Este comentario ha sido eliminado",
                color: "#6b7280",
                isEdited: false,
                isDeleted: true,
              };
            } else {
              console.log(
                `[API Comentarios] ADVERTENCIA: No se encontró el comentario padre ${comment.comentario_padre_id} ni en comentarios ni en eliminados`
              );
            }
          }

          return {
            id: comment.id,
            content_type: comment.tipo_entidad,
            content_id: comment.entidad_id,
            author_id: comment.usuario_id,
            text: comment.contenido,
            parent_id: comment.comentario_padre_id,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            autor: comment.perfiles,
            replies: buildCommentTree(comments, comment.id),
            repliedTo: repliedTo,
            isEdited: !!comment.historial_ediciones,
          };
        })
        .sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return orden === "asc" ? dateA - dateB : dateB - dateA;
        });
    };

    // Obtener TODOS los comentarios para esta entidad (principales y respuestas)
    const { data: todosLosComentarios, error } = await supabase
      .from("comentarios")
      .select(
        `
        *,
        perfiles:usuario_id(id, username, avatar_url, role, color)
      `
      )
      .eq("tipo_entidad", contentType)
      .eq("entidad_id", contentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[API Comentarios] Error al obtener comentarios:", error);
      return NextResponse.json(
        {
          success: false,
          error: `Error al obtener comentarios: ${error.message}`,
        },
        { status: 500 }
      );
    }

    // Construir árbol de comentarios con anidamiento ilimitado
    const comentariosRaiz = buildCommentTree(todosLosComentarios || []);

    // Log para depuración
    console.log(
      `[API Comentarios] Estructura de comentarios construida con ${comentariosRaiz.length} comentarios principales`
    );

    // Verificar si hay respuestas con repliedTo
    const respuestasConRepliedTo =
      todosLosComentarios?.filter((c) => c.comentario_padre_id !== null) || [];
    console.log(
      `[API Comentarios] Hay ${respuestasConRepliedTo.length} respuestas en total`
    );

    // Aplicar paginación a comentarios principales
    const comentariosPaginados = comentariosRaiz.slice(offset, offset + limite);

    console.log(
      `[API Comentarios] Enviando ${comentariosPaginados.length} comentarios principales`
    );
    return NextResponse.json({
      success: true,
      comentarios: comentariosPaginados,
      total: comentariosRaiz.length,
      offset,
      limite,
    });
  } catch (error) {
    console.error("[API Comentarios] Error en la API de comentarios:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST para crear un nuevo comentario
// PUT para editar un comentario existente
export async function PUT(request: Request) {
  try {
    console.log("[API Comentarios] Recibiendo solicitud PUT");
    const body = await request.json();
    const { id, contenido, usuario_id } = body;

    console.log("[API Comentarios] Datos recibidos para edición:", {
      id,
      contenido: contenido?.substring(0, 20) + "...",
      usuario_id,
    });

    // Validar datos requeridos
    if (!id || !contenido || !usuario_id) {
      console.log(
        "[API Comentarios] Error: Faltan campos requeridos para edición"
      );
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Verificar que el comentario exista y pertenezca al usuario
    const { data: comentarioExistente, error: errorConsulta } = await supabase
      .from("comentarios")
      .select("id, usuario_id, historial_ediciones, contenido")
      .eq("id", id)
      .single();

    if (errorConsulta) {
      console.error(
        "[API Comentarios] Error al verificar comentario:",
        errorConsulta
      );
      return NextResponse.json(
        { success: false, error: "No se encontró el comentario" },
        { status: 404 }
      );
    }

    // Verificar que el comentario pertenezca al usuario
    if (comentarioExistente.usuario_id !== usuario_id) {
      console.error(
        "[API Comentarios] Error: Usuario no autorizado para editar este comentario"
      );
      return NextResponse.json(
        {
          success: false,
          error: "No estás autorizado para editar este comentario",
        },
        { status: 403 }
      );
    }

    // Preparar el historial de ediciones
    const fechaActual = new Date().toISOString();
    let historialActualizado;

    if (comentarioExistente.historial_ediciones) {
      // Si ya existe un historial, añadir la nueva versión
      const historialActual = comentarioExistente.historial_ediciones;
      historialActualizado = {
        original: historialActual.original,
        versiones: [
          ...historialActual.versiones,
          {
            contenido,
            fecha: fechaActual,
            version: historialActual.versiones.length + 1,
          },
        ],
      };
    } else {
      // Si es la primera edición, crear el historial
      historialActualizado = {
        original: comentarioExistente.contenido,
        versiones: [
          {
            contenido,
            fecha: fechaActual,
            version: 1,
          },
        ],
      };
    }

    // Actualizar el comentario
    const { data: comentarioActualizado, error } = await supabase
      .from("comentarios")
      .update({
        contenido,
        historial_ediciones: historialActualizado,
        updated_at: fechaActual,
      })
      .eq("id", id)
      .select(
        `
        *,
        perfiles:usuario_id(id, username, avatar_url, role, color)
      `
      )
      .single();

    if (error) {
      console.error("[API Comentarios] Error al actualizar comentario:", error);
      return NextResponse.json(
        {
          success: false,
          error: `Error al actualizar el comentario: ${error.message}`,
        },
        { status: 500 }
      );
    }

    console.log("[API Comentarios] Comentario actualizado exitosamente:", id);

    return NextResponse.json({
      success: true,
      data: comentarioActualizado,
    });
  } catch (error) {
    console.error(
      "[API Comentarios] Error en la API de edición de comentarios:",
      error
    );
    return NextResponse.json(
      { success: false, error: `Error interno del servidor: ${error}` },
      { status: 500 }
    );
  }
}

// DELETE para eliminar un comentario
export async function DELETE(request: Request) {
  try {
    console.log("[API Comentarios] Recibiendo solicitud DELETE");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const usuario_id = searchParams.get("usuario_id");

    console.log("[API Comentarios] Datos recibidos para eliminación:", {
      id,
      usuario_id,
    });

    // Validar datos requeridos
    if (!id || !usuario_id) {
      console.log(
        "[API Comentarios] Error: Faltan parámetros requeridos para eliminación"
      );
      return NextResponse.json(
        { success: false, error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Verificar que el comentario exista y pertenezca al usuario
    const { data: comentarioExistente, error: errorConsulta } = await supabase
      .from("comentarios")
      .select("id, usuario_id")
      .eq("id", id)
      .single();

    if (errorConsulta) {
      console.error(
        "[API Comentarios] Error al verificar comentario:",
        errorConsulta
      );
      return NextResponse.json(
        { success: false, error: "No se encontró el comentario" },
        { status: 404 }
      );
    }

    // Verificar que el comentario pertenezca al usuario
    if (comentarioExistente.usuario_id !== usuario_id) {
      console.error(
        "[API Comentarios] Error: Usuario no autorizado para eliminar este comentario"
      );
      return NextResponse.json(
        {
          success: false,
          error: "No estás autorizado para eliminar este comentario",
        },
        { status: 403 }
      );
    }

    // Eliminar el comentario
    const { error } = await supabase.from("comentarios").delete().eq("id", id);

    if (error) {
      console.error("[API Comentarios] Error al eliminar comentario:", error);
      return NextResponse.json(
        {
          success: false,
          error: `Error al eliminar el comentario: ${error.message}`,
        },
        { status: 500 }
      );
    }

    console.log("[API Comentarios] Comentario eliminado exitosamente:", id);
    return NextResponse.json({
      success: true,
      message: "Comentario eliminado exitosamente",
    });
  } catch (error) {
    console.error("[API Comentarios] Error al eliminar comentario:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor al eliminar el comentario",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log("[API Comentarios] Recibiendo solicitud POST");
    const body = await request.json();
    const { text, content_type, content_id, parent_id, gif_url } = body;
    // Obtener usuario autenticado
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Debes iniciar sesión para comentar" },
        { status: 401 }
      );
    }

    console.log("[API Comentarios] Datos recibidos:", {
      text: text?.substring(0, 20) + "...",
      user_id: user.id,
      content_type,
      content_id,
      gif_url: gif_url ? "presente" : "ausente",
    });

    // Validar datos requeridos - permitir comentario sin texto si hay GIF
    if ((!text || text.trim() === "") && !gif_url) {
      console.log("[API Comentarios] Error: Faltan campos requeridos");
      return NextResponse.json(
        { success: false, error: "Debes proporcionar texto o un GIF" },
        { status: 400 }
      );
    }

    if (!content_type || !content_id) {
      console.log("[API Comentarios] Error: Faltan campos requeridos");
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Insertar el comentario usando el cliente de servicio
    const serviceSupabase = getServiceClient();

    // Caso especial: si es un comentario para un hilo del foro, guardarlo en foro_posts
    if (content_type === "hilo") {
      console.log(
        "[API Comentarios] Guardando comentario de hilo en foro_posts"
      );
      const { data: postData, error: postError } = await serviceSupabase
        .from("foro_posts")
        .insert({
          contenido: text || "",
          autor_id: user.id,
          hilo_id: content_id,
          post_padre_id: null, // Los comentarios principales no tienen padre
          gif_url: gif_url || null,
        })
        .select("*")
        .single();

      if (postError) {
        console.error(
          "[API Comentarios] Error al crear post del foro:",
          postError
        );
        return NextResponse.json(
          {
            success: false,
            error: `Error al crear el comentario: ${postError.message}`,
          },
          { status: 500 }
        );
      }

      // Obtener el perfil del autor
      const { data: perfilData } = await serviceSupabase
        .from("perfiles")
        .select("id, username, avatar_url, role, color")
        .eq("id", user.id)
        .single();

      // === NOTIFICACIÓN: Comentario en hilo del foro ===
      // Obtener el autor del hilo para enviarle notificación
      const { data: hiloData } = await serviceSupabase
        .from("foro_hilos")
        .select("autor_id, titulo, slug")
        .eq("id", content_id)
        .single();

      // Enviar notificación solo si el autor del hilo no es quien comenta
      if (hiloData && hiloData.autor_id !== user.id) {
        await serviceSupabase.from("notifications").insert({
          user_id: hiloData.autor_id,
          type: "thread_comment",
          title: "Nuevo comentario en tu hilo",
          message: `${
            perfilData?.username || "Alguien"
          } ha comentado en tu hilo "${hiloData.titulo}"`,
          data: {
            hiloId: content_id,
            hiloSlug: hiloData.slug,
            hiloTitulo: hiloData.titulo,
            comentarioId: postData.id,
            fromUserId: user.id,
            fromUsername: perfilData?.username,
          },
        });
        console.log(
          "[API Comentarios] Notificación de comentario en hilo enviada a:",
          hiloData.autor_id
        );
      }

      // Formatear respuesta para compatibilidad con el frontend
      const comentarioFormateado = {
        id: postData.id,
        content_type: "hilo",
        content_id: content_id,
        author_id: user.id,
        text: postData.contenido,
        parent_id: null,
        created_at: postData.created_at,
        updated_at: postData.created_at,
        autor: perfilData,
        replies: [], // Los comentarios nuevos no tienen respuestas
      };

      console.log(
        "[API Comentarios] Post del foro creado exitosamente:",
        comentarioFormateado.id
      );
      return NextResponse.json(comentarioFormateado);
    }

    // Para otros tipos de contenido, usar la tabla comentarios
    const { data: comentarioData, error } = await serviceSupabase
      .from("comentarios")
      .insert({
        contenido: text || "",
        usuario_id: user.id,
        tipo_entidad: content_type,
        entidad_id: content_id,
        comentario_padre_id: null, // Los comentarios principales no tienen padre
        gif_url: gif_url || null,
      })
      .select(
        `
        *,
        perfiles:usuario_id(id, username, avatar_url, role, color)
      `
      )
      .single();

    if (error) {
      console.error("[API Comentarios] Error al crear comentario:", error);
      return NextResponse.json(
        {
          success: false,
          error: `Error al crear el comentario: ${error.message}`,
        },
        { status: 500 }
      );
    }

    // === NOTIFICACIÓN: Comentario en noticia ===
    // Solo enviar notificación si es un comentario en una noticia
    if (content_type === "noticia") {
      // Obtener el autor de la noticia para enviarle notificación
      const { data: noticiaData } = await serviceSupabase
        .from("noticias")
        .select("autor_id, titulo, slug")
        .eq("id", content_id)
        .single();

      // Enviar notificación solo si el autor de la noticia no es quien comenta
      if (noticiaData && noticiaData.autor_id !== user.id) {
        await serviceSupabase.from("notifications").insert({
          user_id: noticiaData.autor_id,
          type: "news_comment",
          title: "Nuevo comentario en tu noticia",
          message: `${
            comentarioData.perfiles?.username || "Alguien"
          } ha comentado en tu noticia "${noticiaData.titulo}"`,
          data: {
            noticiaId: content_id,
            noticiaSlug: noticiaData.slug,
            noticiaTitulo: noticiaData.titulo,
            comentarioId: comentarioData.id,
            fromUserId: user.id,
            fromUsername: comentarioData.perfiles?.username,
          },
        });
        console.log(
          "[API Comentarios] Notificación de comentario en noticia enviada a:",
          noticiaData.autor_id
        );
      }
    }

    // Formatear respuesta para compatibilidad con el frontend
    const comentarioFormateado = {
      id: comentarioData.id,
      content_type: comentarioData.tipo_entidad,
      content_id: comentarioData.entidad_id,
      author_id: comentarioData.usuario_id,
      text: comentarioData.contenido,
      parent_id: comentarioData.comentario_padre_id,
      created_at: comentarioData.created_at,
      updated_at: comentarioData.updated_at,
      autor: comentarioData.perfiles,
      replies: [], // Los comentarios nuevos no tienen respuestas
    };

    console.log(
      "[API Comentarios] Comentario creado exitosamente:",
      comentarioFormateado.id
    );

    return NextResponse.json(comentarioFormateado);
  } catch (error) {
    console.error("Error en API de comentarios:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
