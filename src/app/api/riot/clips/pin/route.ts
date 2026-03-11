import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Validate session to ensure user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { clipId, isPinned } = await request.json();

    if (!clipId || typeof isPinned !== 'boolean') {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    // Update the clip. The RLS policy "Users can update their own clips"
    // will ensure they can only update clips belonging to them.
    const { data, error } = await supabase
      .from("lol_allstar_clips")
      .update({ is_pinned: isPinned })
      .eq("id", clipId)
      .select()
      .single();

    if (error) {
      console.error("[POST /api/riot/clips/pin] Database error:", error);
      return NextResponse.json({ error: "No se pudo actualizar el clip" }, { status: 500 });
    }

    return NextResponse.json({ success: true, clip: data });

  } catch (error: any) {
    console.error("[POST /api/riot/clips/pin] Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
