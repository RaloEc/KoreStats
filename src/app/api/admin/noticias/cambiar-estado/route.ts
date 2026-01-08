import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/utils/supabase-service";
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
      .select("role")
      .eq("id", user.id)
      .single();

    if (perfil?.role !== "admin") {
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

    // Usar cliente de servicio para bypasear RLS
    const serviceClient = getServiceClient();

    // Actualizar estado
    const updateData: any = {
      estado,
      updated_at: new Date().toISOString(),
    };

    // Si se publica por primera vez, establecer la fecha de publicación
    if (estado === "publicada") {
      updateData.fecha_publicacion = new Date().toISOString();
    }

    const { data, error } = await serviceClient
      .from("noticias")
      .update(updateData)
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
