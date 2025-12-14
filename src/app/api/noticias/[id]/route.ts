import { NextResponse } from "next/server";
import { getServiceClient } from "@/utils/supabase-service";
import { revalidatePath } from "next/cache";
import { Noticia } from "@/types";

export const dynamic = "force-dynamic"; // Forzar modo dinámico, sin caché
export const revalidate = 0; // No usar caché

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log("=== INICIO API ROUTE - OBTENER NOTICIA INDIVIDUAL ===");
    const id = params.id;
    console.log(`Solicitando noticia con ID: ${id}`);

    if (!id) {
      console.error("Error: ID de noticia no proporcionado");
      return NextResponse.json(
        { error: "ID de noticia no proporcionado" },
        { status: 400 }
      );
    }

    // Obtener el cliente de servicio para saltarse las restricciones RLS
    console.log("Obteniendo cliente de servicio de Supabase...");
    const serviceClient = getServiceClient();

    if (!serviceClient) {
      console.error(
        "Error: No se pudo obtener el cliente de servicio de Supabase"
      );
      return NextResponse.json(
        { error: "Error de configuración del servidor" },
        { status: 500 }
      );
    }
    console.log("Cliente de servicio obtenido correctamente");

    // Obtener la noticia desde Supabase
    console.log(`Consultando noticia con ID ${id} en Supabase...`);
    const { data: noticia, error } = await serviceClient
      .from("noticias")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error al obtener noticia:", error);
      console.log("Código de error:", error.code);
      console.log("Mensaje de error:", error.message);
      console.log("Detalles:", error.details);
      return NextResponse.json(
        { error: `Error al obtener noticia: ${error.message}` },
        { status: 500 }
      );
    }

    if (!noticia) {
      console.error(`No se encontró ninguna noticia con ID ${id}`);
      return NextResponse.json(
        { error: "Noticia no encontrada" },
        { status: 404 }
      );
    }

    // Incrementar contador de vistas (no bloqueante)
    try {
      const { data: nuevasVistas, error: errorVistas } =
        await serviceClient.rpc("incrementar_vista_noticia", {
          noticia_id: id,
        });
      if (errorVistas) {
        console.warn(
          "No se pudo incrementar vistas de la noticia:",
          errorVistas.message
        );
      } else {
        console.log("Vistas de noticia incrementadas. Total:", nuevasVistas);
      }
    } catch (e: any) {
      console.warn(
        "Fallo al llamar RPC incrementar_vista_noticia:",
        e?.message || e
      );
    }

    console.log("Noticia encontrada:", {
      id: noticia.id,
      titulo: noticia.titulo,
      fecha: noticia.fecha_publicacion,
      autor_id: noticia.autor_id || noticia.autor,
      tiene_imagen_portada: !!noticia.imagen_portada,
      longitud_contenido:
        typeof noticia.contenido === "string" ? noticia.contenido.length : 0,
    });

    // Verificar imagen de portada
    if (noticia.imagen_portada && typeof noticia.imagen_portada === "string") {
      console.log(`Imagen de portada encontrada: ${noticia.imagen_portada}`);
      try {
        new URL(noticia.imagen_portada);
        console.log("URL de imagen de portada válida");
      } catch (error) {
        console.error("URL de imagen de portada inválida:", error);
      }
    } else {
      console.log("La noticia no tiene imagen de portada");
    }

    // Analizar contenido para detectar imágenes - Esto solo funciona en el navegador, no en el servidor
    // En el servidor Next.js no tenemos acceso a document, por lo que comentamos este código
    /*
    if (noticia.contenido) {
      console.log('Analizando contenido para detectar imágenes en la API...');
      // Este código solo funciona en el navegador, no en el servidor
    }
    */

    // En su lugar, hacemos un análisis simple de cadenas para buscar imágenes
    if (noticia.contenido && typeof noticia.contenido === "string") {
      console.log(
        "Analizando contenido para detectar imágenes en la API (análisis de cadenas)..."
      );

      // Contar cuántas etiquetas img hay en el contenido
      const imgTagCount = (noticia.contenido.match(/<img[^>]+>/g) || []).length;
      console.log(
        `Se encontraron aproximadamente ${imgTagCount} etiquetas de imagen en el contenido`
      );

      // Buscar URLs de Supabase en el contenido
      const supabaseUrlCount = (
        noticia.contenido.match(/supabase\.co\/storage\/v1\/object\/public/g) ||
        []
      ).length;
      console.log(
        `Se encontraron aproximadamente ${supabaseUrlCount} URLs de Supabase en el contenido`
      );

      // Buscar URLs de blob en el contenido
      const blobUrlCount = (noticia.contenido.match(/blob:/g) || []).length;
      if (blobUrlCount > 0) {
        console.error(
          `Se encontraron ${blobUrlCount} URLs de blob en el contenido, lo cual no debería ocurrir`
        );
      }

      // Buscar URLs de datos en el contenido
      const dataUrlCount = (noticia.contenido.match(/data:image/g) || [])
        .length;
      if (dataUrlCount > 0) {
        console.error(
          `Se encontraron ${dataUrlCount} URLs de datos en el contenido, lo cual no debería ocurrir`
        );
      }
    }

    // Obtener las categorías de la noticia
    let categorias = [];

    // Obtener las relaciones de categorías para esta noticia
    const { data: relaciones, error: errorRelaciones } = await serviceClient
      .from("noticias_categorias")
      .select("categoria_id")
      .eq("noticia_id", id);

    if (!errorRelaciones && relaciones && relaciones.length > 0) {
      const categoriaIds = relaciones.map((rel) => rel.categoria_id);

      const { data: categoriasData, error: errorCategorias } =
        await serviceClient
          .from("categorias")
          .select("id, nombre")
          .in("id", categoriaIds);

      if (!errorCategorias && categoriasData) {
        categorias = categoriasData;
      }
    }

    // Buscar perfil del autor si existe
    let autorNombre = "Desconocido";
    let autorColor = "#3b82f6"; // Color azul por defecto
    let autorAvatar = null; // URL de la imagen de perfil del autor
    let autorRol = "user"; // Rol por defecto
    let autorPublicId: string | null = null; // Public ID para links al perfil

    // Determinar el ID del autor (puede estar en autor_id o en autor si es UUID)
    let autorId = null;

    // Verificar si tenemos autor_id o si autor es un UUID
    if (noticia.autor_id && typeof noticia.autor_id === "string") {
      autorId = noticia.autor_id;
      console.log(`Usando autor_id: ${autorId}`);
    } else if (typeof noticia.autor === "string") {
      // Verificar si autor es un UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(noticia.autor.trim())) {
        autorId = noticia.autor.trim();
        console.log(`Autor parece ser un UUID: ${autorId}`);
        console.log(
          "IMPORTANTE: Esta noticia tiene el UUID en el campo autor en lugar de autor_id"
        );
      } else {
        console.log(
          `No se encontró un ID válido. Autor original: ${noticia.autor}`
        );
      }
    } else {
      console.log(
        `No se encontró un ID válido. Autor es de tipo: ${typeof noticia.autor}`
      );
    }

    // Si tenemos un ID de autor, buscar su perfil
    if (autorId) {
      // Primero buscamos en la tabla perfiles
      const { data: perfil, error: errorPerfil } = await serviceClient
        .from("perfiles")
        .select("username, role, color, avatar_url, public_id")
        .eq("id", autorId)
        .single();

      if (errorPerfil) {
        console.error(
          `Error al buscar perfil para ID ${autorId}:`,
          errorPerfil
        );
      }

      // Si no encontramos avatar_url en perfiles, buscar en auth.users
      if (perfil && (!perfil.avatar_url || perfil.avatar_url.trim() === "")) {
        try {
          // Buscar en la tabla auth.users para obtener user_metadata
          const { data: authUser, error: authError } = await serviceClient
            .from("users")
            .select("raw_user_meta_data")
            .eq("id", autorId)
            .single();

          if (authError) {
            console.error(
              `Error al buscar en auth.users para ID ${autorId}:`,
              authError
            );
          } else if (authUser && authUser.raw_user_meta_data) {
            // Extraer avatar_url o picture de user_metadata
            const metadata = authUser.raw_user_meta_data;
            if (metadata.avatar_url || metadata.picture) {
              console.log(
                "Encontrado avatar en auth.users:",
                metadata.avatar_url || metadata.picture
              );
              // Actualizar el perfil con esta información
              perfil.avatar_url = metadata.avatar_url || metadata.picture;
            }
          }
        } catch (authLookupError) {
          console.error("Error al buscar en auth.users:", authLookupError);
        }
      }

      if (perfil) {
        console.log(`Perfil encontrado para ID ${autorId}:`, perfil);
        console.log(`Username del perfil: ${perfil.username}`);
        console.log(`Tipo de username: ${typeof perfil.username}`);
        console.log(`Avatar URL del perfil: ${perfil.avatar_url}`);
        console.log(`Tipo de avatar_url: ${typeof perfil.avatar_url}`);
        console.log(`Rol del perfil: ${perfil.role}`);

        // Guardar el rol del autor
        if (perfil.role) {
          autorRol = perfil.role;
          console.log(`Rol del autor establecido a: ${autorRol}`);
        }

        // Guardar el public_id para links al perfil
        if (perfil.public_id) {
          autorPublicId = perfil.public_id;
          console.log(`Public ID del autor: ${autorPublicId}`);
        }

        // Usar el username del perfil, no el campo 'autor' de la noticia
        if (
          perfil.username &&
          typeof perfil.username === "string" &&
          perfil.username.trim().length > 0
        ) {
          autorNombre = perfil.username.trim();
          console.log(`Usando username del perfil: ${autorNombre}`);
        } else {
          autorNombre = "Usuario";
          console.log("Username vacío o inválido, usando fallback: Usuario");
        }

        // Guardar URL de avatar si existe
        if (
          perfil.avatar_url &&
          typeof perfil.avatar_url === "string" &&
          perfil.avatar_url.trim().length > 0
        ) {
          autorAvatar = perfil.avatar_url.trim();
          console.log(`Avatar encontrado en perfil: ${autorAvatar}`);
        } else {
          console.log(
            "No se encontró avatar_url válido en el perfil, se generará uno automáticamente"
          );
        }

        // Usar color personalizado si existe
        if (perfil.color && typeof perfil.color === "string") {
          autorColor = perfil.color;
          console.log(`Color personalizado encontrado: ${autorColor}`);
        } else {
          // Asignar color según el rol si no hay color personalizado
          console.log(`Rol del perfil: ${perfil.role}`);
          if (perfil.role === "admin") {
            autorColor = "#ef4444"; // Rojo para administradores
            console.log("Color establecido a rojo para admin");
          } else if (perfil.role === "moderator") {
            autorColor = "#f59e0b"; // Ámbar para moderadores
            console.log("Color establecido a ámbar para moderador");
          } else {
            autorColor = "#3b82f6"; // Azul para usuarios normales
            console.log("Color establecido a azul para usuario normal");
          }
        }
        console.log(`Color final del autor: ${autorColor}`);
      } else {
        console.log(`No se encontró perfil para ID ${autorId}`);
      }
    }
    // Si no tenemos ID pero tenemos un valor en 'autor'
    else if (
      typeof noticia.autor === "string" &&
      noticia.autor.trim().length > 0
    ) {
      const valorAutor = noticia.autor.trim();
      if (valorAutor.includes("@")) {
        const correo = valorAutor;
        // Usar la parte del correo antes del @ como nombre de usuario
        const nombreUsuario = correo.split("@")[0];
        console.log(
          `Usando parte del correo como nombre de usuario: ${nombreUsuario}`
        );
        autorNombre = nombreUsuario;
      } else if (valorAutor === "Desconocido") {
        // Caso especial para autor 'Desconocido'
        console.log(
          "Autor marcado como Desconocido, aplicando estilo especial"
        );
        autorNombre = "Desconocido";
        autorColor = "#6b7280"; // Gris para autor desconocido
      } else {
        // Usar directamente el valor almacenado en 'autor' como nombre público
        console.log(
          `Usando texto de 'autor' como nombre público: ${valorAutor}`
        );
        autorNombre = valorAutor;
      }
    }

    // Depurar información del autor antes de devolverla
    console.log("=== INFORMACIÓN DEL AUTOR QUE SE VA A DEVOLVER ===");
    console.log("autor_nombre:", autorNombre);
    console.log("autor_color:", autorColor);
    console.log("autor_avatar:", autorAvatar);

    // Generar URL de avatar para autores sin imagen de perfil
    if (!autorAvatar) {
      // Si el autor es Desconocido o no tiene avatar, generar un avatar con DiceBear
      // Usar el nombre del autor como semilla para generar un avatar consistente
      const seed = autorNombre || "desconocido";

      // Usar DiceBear para generar un avatar (compatible con CORS)
      // Opciones: https://www.dicebear.com/styles
      autorAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        seed
      )}&backgroundColor=${
        autorColor?.replace("#", "") || "6b7280"
      }&fontSize=50&bold=true`;
      console.log(
        `Generando avatar con semilla "${seed}" y color ${
          autorColor?.replace("#", "") || "6b7280"
        }`
      );
      console.log("URL de avatar generado:", autorAvatar);
    }

    // Devolver la noticia con sus categorías y datos del autor
    const responseData = {
      ...noticia,
      // Asegurar que imagen_url siempre esté presente, usando imagen_portada como fallback
      imagen_url: noticia.imagen_url || noticia.imagen_portada || null,
      categorias: categorias || [],
      autor_nombre: autorNombre || noticia.autor || "Desconocido",
      autor_color: autorColor || "#6b7280", // Gris por defecto
      autor_avatar: autorAvatar || null,
      autor_rol: autorRol,
      autor_public_id: autorPublicId,
    };

    // Logs adicionales para depuración
    console.log("=== DATOS FINALES DEL AUTOR ===");
    console.log("autor_nombre final:", responseData.autor_nombre);
    console.log("autor_color final:", responseData.autor_color);
    console.log("autor_avatar final:", responseData.autor_avatar);
    console.log("autor_rol final:", responseData.autor_rol);

    console.log("autor_avatar en la respuesta:", responseData.autor_avatar);

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
