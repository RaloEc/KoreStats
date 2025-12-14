import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
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
      .select("es_admin")
      .eq("id", user.id)
      .single();

    if (!perfil?.es_admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id, estado } = await request.json();

    if (!id || !estado) {
      return NextResponse.json(
        { error: "ID y estado son requeridos" },
        { status: 400 }
      );
    }

    if (!["borrador", "publicada", "programada"].includes(estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    // Actualizar estado
    const { data, error } = await supabase
      .from("noticias")
      .update({
        estado,
        // Si se publica, marcar como activa
        es_activa: estado === "publicada" ? true : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error al cambiar estado:", error);
      return NextResponse.json(
        { error: "Error al cambiar estado" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en PATCH /api/admin/noticias/cambiar-estado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
