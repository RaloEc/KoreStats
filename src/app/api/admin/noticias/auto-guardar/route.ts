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

    const { id, titulo, contenido, imagen_portada, categoria_ids, destacada } =
      await request.json();

    // Validar campos mínimos
    if (!titulo || !contenido || !categoria_ids || categoria_ids.length === 0) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
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
          imagen_portada: imagen_portada || null,
          destacada: destacada || false,
          estado: "borrador", // Asegurar que sigue siendo borrador
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("autor_id", user.id) // Verificar que el usuario es el autor
        .select()
        .single();

      if (error) {
        console.error("Error al actualizar borrador:", error);
        return NextResponse.json(
          { error: "Error al actualizar borrador" },
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
          imagen_portada: imagen_portada || null,
          autor_id: user.id,
          autor: user.email || "Admin",
          destacada: destacada || false,
          estado: "borrador", // Nuevo borrador
          es_activa: false, // No activo hasta que se publique
          vistas: 0,
          slug: titulo
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),
          fecha_publicacion: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error al crear borrador:", error);
        return NextResponse.json(
          { error: "Error al crear borrador" },
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
