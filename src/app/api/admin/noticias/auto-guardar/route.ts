import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/utils/supabase-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar que sea admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verificar rol admin
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (perfil?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Usar cliente de servicio para bypasear RLS
    const serviceClient = getServiceClient();

    const {
      id,
      titulo,
      contenido,
      imagen_portada,
      categoria_ids,
      destacada,
      fuentes,
      fuente,
    } = await request.json();

    // Validar campos mínimos (Solo título es requerido para guardar borrador)
    if (!titulo) {
      return NextResponse.json(
        { error: "El título es requerido para guardar el borrador" },
        { status: 400 }
      );
    }

    let noticia;

    if (id) {
      // Actualizar borrador existente
      const { data, error } = await serviceClient
        .from("noticias")
        .update({
          titulo,
          contenido,
          imagen_portada: imagen_portada || null, // Revertido a imagen_portada porque la DB parece usar eso
          estado: "borrador",
          updated_at: new Date().toISOString(), // Revertido a updated_at por si acaso
        })
        .eq("id", id)
        .eq("autor_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error al actualizar borrador:", error);
        return NextResponse.json(
          { error: "Error al actualizar borrador: " + error.message },
          { status: 500 }
        );
      }

      noticia = data;

      // Actualizar categorías
      if (categoria_ids && categoria_ids.length > 0) {
        // Eliminar categorías anteriores
        await serviceClient
          .from("noticias_categorias")
          .delete()
          .eq("noticia_id", id);

        // Agregar nuevas categorías
        const categoriasData = categoria_ids.map((cat_id: string) => ({
          noticia_id: id,
          categoria_id: cat_id,
        }));

        const { error: errorCategorias } = await serviceClient
          .from("noticias_categorias")
          .insert(categoriasData);

        if (errorCategorias) {
          console.error("Error al actualizar categorías:", errorCategorias);
        }
      }
    } else {
      // Crear nuevo borrador
      const { data, error } = await serviceClient
        .from("noticias")
        .insert({
          titulo,
          contenido,
          imagen_portada: imagen_portada || null, // Revertido
          autor_id: user.id,
          estado: "borrador",
          vistas: 0,
          slug: titulo
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),
          // fecha_publicacion: null, // Comentado por si acaso no existe
        })
        .select()
        .single();

      if (error) {
        console.error("Error al crear borrador:", error);
        return NextResponse.json(
          { error: "Error al crear borrador: " + error.message },
          { status: 500 }
        );
      }

      noticia = data;

      // Agregar categorías
      if (categoria_ids && categoria_ids.length > 0) {
        const categoriasData = categoria_ids.map((cat_id: string) => ({
          noticia_id: noticia.id,
          categoria_id: cat_id,
        }));

        const { error: errorCategorias } = await serviceClient
          .from("noticias_categorias")
          .insert(categoriasData);

        if (errorCategorias) {
          console.error("Error al agregar categorías:", errorCategorias);
        }
      }
    }

    return NextResponse.json({
      id: noticia.id,
      titulo: noticia.titulo,
      estado: noticia.estado,
    });
  } catch (error) {
    console.error("Error en POST /api/admin/noticias/auto-guardar:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
