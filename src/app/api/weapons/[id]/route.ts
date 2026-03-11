import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 1. Intentar desvincular de los hilos del foro.
    // Lo hacemos con un try/catch o revisando el error porque si la columna 'stats_deleted' 
    // no existe en la BD, el update fallará y bloqueará el borrado.
    const { error: updateError } = await supabase
      .from("foro_hilos")
      .update({ 
        weapon_stats_id: null,
        stats_deleted: true 
      })
      .eq("weapon_stats_id", id);

    if (updateError) {
      console.warn("[DELETE /api/weapons] Error al marcar stats_deleted (posible columna faltante), reintentando solo desvinculación:", updateError);
      
      // Reintento básico sin la columna extra para asegurar que el FK no bloquee el borrado
      await supabase
        .from("foro_hilos")
        .update({ weapon_stats_id: null })
        .eq("weapon_stats_id", id);
    }

    // 2. Borrar el registro definitivo
    const { error } = await supabase
      .from("weapon_stats_records")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[DELETE /api/weapons/[id]] Error final de borrado:", error);
      return NextResponse.json(
        { error: "Failed to delete weapon record", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { description } = body;

    const { error } = await supabase
      .from("weapon_stats_records")
      .update({ description: description || null })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update weapon record" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
