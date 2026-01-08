import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/utils/supabase-service";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Hacer que la ruta sea dinámica
export const dynamic = "force-dynamic";

// Función auxiliar para revalidar rutas de noticias
function revalidarRutasNoticias() {
  revalidatePath("/noticias");
  revalidatePath("/noticias/[id]", "layout");
  revalidatePath("/");
  revalidatePath("/admin/noticias");
  revalidatePath("/admin/noticias/listado");
}

// Función para verificar si el usuario es administrador
async function esAdmin(supabase: any) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return perfil?.role === "admin";
  } catch (error) {
    console.error("Error al verificar rol de administrador:", error);
    return false;
  }
}

// GET - Obtener noticias con paginación y filtros
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const serviceClient = getServiceClient();
  const searchParams = request.nextUrl.searchParams;
  const admin = searchParams.get("admin") === "true";

  // Si es una solicitud de admin, verificar permisos
  if (admin) {
    const esUsuarioAdmin = await esAdmin(supabase);
    if (!esUsuarioAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 403 }
      );
    }
  }

  try {
    // Obtener parámetros de búsqueda y paginación
    const id = searchParams.get("id");
    const pagina = parseInt(searchParams.get("pagina") || "1");
    const limite = parseInt(searchParams.get("limite") || "10");
    const busqueda = searchParams.get("busqueda");
    const categoria = searchParams.get("categoria");
    const ordenar = searchParams.get("ordenar") || "fecha_desc";
    const autor = searchParams.get("autor");
    const fechaDesde = searchParams.get("fecha_desde");
    const fechaHasta = searchParams.get("fecha_hasta");
    const vistasMin = searchParams.get("vistas_min");
    const vistasMax = searchParams.get("vistas_max");
    const esActiva = searchParams.get("es_activa");
    const destacada = searchParams.get("destacada");

    // Si se solicita una noticia específica por ID
    if (id) {
      const { data, error } = await serviceClient
        .from("noticias")
        .select(
          `
          *,
          autor:perfiles!noticias_autor_id_fkey(username, avatar_url, role),
          categorias:noticias_categorias!inner(categoria_id, categoria:categorias!inner(nombre, slug, color))
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error al obtener noticia:", error);
        return NextResponse.json(
          { error: `Error al obtener noticia: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    }

    // Calcular offset para paginación
    const offset = (pagina - 1) * limite;

    // Construir consulta base
    let query = serviceClient.from("noticias").select(
      `
        *,
        autor:perfiles!noticias_autor_id_fkey(username, avatar_url, role),
        categorias:noticias_categorias!inner(categoria_id, categoria:categorias!inner(nombre, slug, color))
      `,
      { count: "exact" }
    );

    // Aplicar filtros
    if (busqueda) {
      query = query.or(
        `titulo.ilike.%${busqueda}%,contenido.ilike.%${busqueda}%`
      );
    }

    if (categoria) {
      query = query.eq("noticias_categorias.categoria_id", categoria);
    }

    if (autor) {
      query = query.eq("autor_id", autor);
    }

    if (fechaDesde) {
      query = query.gte("fecha_publicacion", fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte("fecha_publicacion", fechaHasta);
    }

    if (vistasMin) {
      query = query.gte("vistas", parseInt(vistasMin));
    }

    if (vistasMax) {
      query = query.lte("vistas", parseInt(vistasMax));
    }

    if (esActiva !== null) {
      query = query.eq("es_activa", esActiva === "true");
    }

    if (destacada !== null) {
      query = query.eq("destacada", destacada === "true");
    }

    // Aplicar ordenamiento
    switch (ordenar) {
      case "titulo_asc":
        query = query.order("titulo", { ascending: true });
        break;
      case "titulo_desc":
        query = query.order("titulo", { ascending: false });
        break;
      case "fecha_asc":
        query = query.order("fecha_publicacion", { ascending: true });
        break;
      case "fecha_desc":
        query = query.order("fecha_publicacion", { ascending: false });
        break;
      case "vistas_asc":
        query = query.order("vistas", { ascending: true });
        break;
      case "vistas_desc":
        query = query.order("vistas", { ascending: false });
        break;
      default:
        query = query.order("fecha_publicacion", { ascending: false });
    }

    // Aplicar paginación
    query = query.range(offset, offset + limite - 1);

    // Ejecutar consulta
    const { data, error, count } = await query;

    if (error) {
      console.error("Error al obtener noticias:", error);
      return NextResponse.json(
        { error: `Error al obtener noticias: ${error.message}` },
        { status: 500 }
      );
    }

    // Procesar resultados para el formato esperado
    const noticias = data.map((noticia) => ({
      ...noticia,
      categoria_nombre: noticia.categoria?.nombre || null,
      categoria_slug: noticia.categoria?.slug || null,
      categoria_color: noticia.categoria?.color || null,
      autor_nombre: noticia.autor?.username || noticia.autor || "Anónimo",
      autor_color:
        noticia.autor?.rol === "admin"
          ? "#ef4444"
          : noticia.autor?.rol === "moderator"
          ? "#f59e0b"
          : "#3b82f6",
    }));

    // Calcular total de páginas
    const totalPaginas = count ? Math.ceil(count / limite) : 1;

    return NextResponse.json({
      noticias,
      total: count || 0,
      pagina_actual: pagina,
      total_paginas: totalPaginas,
      limite,
    });
  } catch (error: any) {
    console.error("Error al procesar la solicitud:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log("=== INICIO PROCESAMIENTO API ROUTE - CREAR NOTICIA ===");
    // Obtener los datos de la solicitud
    const data = await request.json();

    console.log("Datos recibidos en la API:", {
      titulo: data.titulo,
      contenido: data.contenido?.substring(0, 100) + "...",
      imagen_portada: data.imagen_portada,
      autor_id: data.autor_id,
      autor_nombre: data.autor_nombre,
      destacada: data.destacada,
      categoria_ids: data.categoria_ids,
      tamaño_contenido: data.contenido?.length || 0,
    });

    // Analizar contenido para detectar imágenes
    if (data.contenido) {
      console.log("Analizando contenido para detectar imágenes en la API...");

      // Usar expresiones regulares para encontrar imágenes en el HTML
      // Esta es una forma segura de analizar el HTML en el servidor sin usar document
      const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
      let match;
      let imgCount = 0;
      const imgSrcs = [];

      // Encontrar todas las coincidencias de etiquetas img
      while ((match = imgRegex.exec(data.contenido)) !== null) {
        imgCount++;
        const src = match[1]; // El primer grupo capturado es el valor del atributo src
        imgSrcs.push(src);
        console.log(
          `API - Imagen ${imgCount}: ${src?.substring(0, 100)}${
            src && src.length > 100 ? "..." : ""
          }`
        );

        // Verificar si la imagen es una URL de Supabase
        if (src && src.includes("supabase")) {
          console.log(`API - Imagen ${imgCount} es una URL de Supabase válida`);
        } else if (src && src.startsWith("blob:")) {
          console.error(
            `API - Imagen ${imgCount} es una URL de blob temporal que NO debería estar presente en este punto`
          );
        } else if (src && src.startsWith("data:")) {
          console.error(
            `API - Imagen ${imgCount} es una URL de datos que NO debería estar presente en este punto`
          );
        }
      }

      console.log(`Se encontraron ${imgCount} imágenes en el contenido`);
    }

    // Validar datos (puedes agregar más validaciones según sea necesario)
    if (!data.titulo || !data.contenido || !data.categoria_ids) {
      console.error("Validación fallida: Faltan campos requeridos");
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Obtener el cliente de servicio para saltarse las restricciones RLS
    console.log("Obteniendo cliente de servicio de Supabase...");
    const serviceClient = getServiceClient();

    if (!serviceClient) {
      console.error("No se pudo obtener el cliente de servicio de Supabase");
      return NextResponse.json(
        { error: "Error de configuración del servidor" },
        { status: 500 }
      );
    }
    console.log("Cliente de servicio obtenido correctamente");

    // Preparar datos para insertar
    const nuevaNoticia = {
      titulo: data.titulo,
      contenido: data.contenido,
      imagen_portada: data.imagen_portada || null,
      autor: data.autor_nombre || data.autor || "Anónimo", // Guardar el nombre del autor
      autor_id: data.autor_id, // Guardar el ID del usuario como referencia
      destacada: data.destacada || false,
      estado: data.estado || "borrador", // Estado: borrador o publicada
      es_activa: data.estado === "publicada" ? true : false, // Activa solo si se publica
      fecha_publicacion:
        data.estado === "publicada" ? new Date().toISOString() : null,
      fuentes: data.fuentes || (data.fuente ? [data.fuente] : []),
    };

    console.log("Datos de la noticia a crear:", {
      titulo: nuevaNoticia.titulo,
      imagen_portada: nuevaNoticia.imagen_portada,
      autor: nuevaNoticia.autor,
      destacada: nuevaNoticia.destacada,
      fecha_publicacion: nuevaNoticia.fecha_publicacion,
      tamaño_contenido: nuevaNoticia.contenido.length,
    });

    console.log("Insertando noticia en la base de datos...");
    // Insertar en la base de datos usando el cliente de servicio
    const { data: noticiaCreada, error } = await serviceClient
      .from("noticias")
      .insert([nuevaNoticia])
      .select();

    if (error) {
      console.error("Error al crear noticia:", error);
      console.log("Código de error:", error.code);
      console.log("Mensaje de error:", error.message);
      console.log("Detalles:", error.details);
      console.log("Datos recibidos:", JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: `Error al crear noticia: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("Noticia insertada correctamente en la base de datos");

    console.log("Noticia creada:", JSON.stringify(noticiaCreada, null, 2));

    // Si se creó la noticia correctamente, insertar las relaciones con categorías
    if (noticiaCreada && noticiaCreada[0]) {
      const noticiaId = noticiaCreada[0].id;

      try {
        // Crear las relaciones con las categorías seleccionadas
        const relacionesCategoria = data.categoria_ids.map(
          (categoriaId: string) => ({
            noticia_id: noticiaId,
            categoria_id: categoriaId,
          })
        );

        // Primero, eliminar cualquier relación existente para esta noticia
        const { error: errorEliminar } = await serviceClient
          .from("noticias_categorias")
          .delete()
          .eq("noticia_id", noticiaId);

        if (errorEliminar && errorEliminar.code !== "42P01") {
          console.error(
            "Error al eliminar categorías existentes:",
            errorEliminar
          );
        }

        // Insertar nuevas relaciones
        if (relacionesCategoria.length > 0) {
          const { error: errorRelaciones } = await serviceClient
            .from("noticias_categorias")
            .insert(relacionesCategoria);

          if (errorRelaciones) {
            console.error("Error al asignar categorías:", errorRelaciones);

            // Manejar casos específicos de error
            if (errorRelaciones.code === "42P01") {
              // La tabla no existe, intentar crearla
              console.log(
                "Tabla noticias_categorias no existe. Intentando crear..."
              );

              const { error: createTableError } = await serviceClient.rpc(
                "crear_tabla_noticias_categorias"
              );

              if (createTableError) {
                console.error("Error al crear tabla:", createTableError);
                return NextResponse.json(
                  {
                    error: `Error al crear tabla de relaciones: ${createTableError.message}`,
                  },
                  { status: 500 }
                );
              }

              // Reintentar insertar relaciones
              const { error: reintentarRelaciones } = await serviceClient
                .from("noticias_categorias")
                .insert(relacionesCategoria);

              if (reintentarRelaciones) {
                console.error(
                  "Error al reintentar asignar categorías:",
                  reintentarRelaciones
                );
              }
            } else if (errorRelaciones.code === "23505") {
              // Duplicado, lo ignoramos (ya hemos eliminado las relaciones previas)
              console.log(
                "Relaciones de categorías ya existían, se han actualizado."
              );
            }
          }
        }
      } catch (error) {
        console.error("Error inesperado al manejar categorías:", error);
      }

      // Revalidar todas las rutas que muestran noticias
      revalidarRutasNoticias();

      // Devolver la noticia creada independientemente del resultado de categorías
      return NextResponse.json({
        success: true,
        data: noticiaCreada[0],
        message: "Noticia creada correctamente",
      });
    } else {
      return NextResponse.json(
        { error: "No se pudo obtener el ID de la noticia creada" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();

    if (!data.id || !data.titulo || !data.contenido || !data.categoria_ids) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    // Actualizar la noticia
    const { error: updateError } = await serviceClient
      .from("noticias")
      .update({
        titulo: data.titulo,
        contenido: data.contenido,
        imagen_portada: data.imagen_portada || null,
        autor: data.autor_nombre || data.autor || "Anónimo", // Guardar el nombre del autor
        autor_id: data.autor_id, // Guardar el ID del usuario como referencia
        destacada: data.destacada || false,
        updated_at: new Date().toISOString(),
        fuentes: data.fuentes || (data.fuente ? [data.fuente] : []),
      })
      .eq("id", data.id);

    if (updateError) {
      console.error("Error al actualizar noticia:", updateError);
      return NextResponse.json(
        { error: `Error al actualizar noticia: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Actualizar categorías
    try {
      // Eliminar categorías existentes
      const { error: deleteError } = await serviceClient
        .from("noticias_categorias")
        .delete()
        .eq("noticia_id", data.id);

      if (deleteError) {
        console.error("Error al eliminar categorías existentes:", deleteError);
      }

      // Insertar nuevas categorías
      if (data.categoria_ids.length > 0) {
        const relacionesCategoria = data.categoria_ids.map(
          (categoriaId: string) => ({
            noticia_id: data.id,
            categoria_id: categoriaId,
          })
        );

        const { error: categoriaError } = await serviceClient
          .from("noticias_categorias")
          .insert(relacionesCategoria);

        if (categoriaError) {
          console.error("Error al actualizar categorías:", categoriaError);
        }
      }
    } catch (error) {
      console.error("Error al manejar categorías:", error);
    }

    // Revalidar rutas
    revalidarRutasNoticias();

    return NextResponse.json({
      success: true,
      message: "Noticia actualizada correctamente",
    });
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID de noticia no proporcionado" },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();

    // Las relaciones se eliminarán automáticamente por la restricción ON DELETE CASCADE
    // definida en la tabla noticias_categorias
    const { error } = await serviceClient
      .from("noticias")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar noticia:", error);
      return NextResponse.json(
        { error: `Error al eliminar noticia: ${error.message}` },
        { status: 500 }
      );
    }

    // Revalidar rutas
    revalidarRutasNoticias();

    return NextResponse.json({
      success: true,
      message: "Noticia eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al procesar la solicitud:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
