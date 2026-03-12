import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Verification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("perfiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const { action, weapon_record_id } = await request.json();

    if (!["dismiss", "delete_weapon"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "delete_weapon") {
      // Borrar arma: Al borrarla, por el ON DELETE CASCADE del schema, 
      // se borrarán todos los reportes asociados a ella automáticamente.
      // Pero primero debemos desvincularla de hilos del foro (si existe esa tabla)
      
      await supabase
        .from("foro_hilos")
        .update({ weapon_stats_id: null })
        .eq("weapon_stats_id", weapon_record_id);

      const { error: delError } = await supabase
        .from("weapon_stats_records")
        .delete()
        .eq("id", weapon_record_id);

      if (delError) {
        console.error("[report-action] Delete Error:", delError);
        return NextResponse.json({ error: "No se pudo eliminar el arma" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Arma eliminada y reportes resueltos." });
    } else if (action === "dismiss") {
      // Ignorar reporte (marcar como dismissed)
      const { error } = await supabase
        .from("weapon_reports")
        .update({ status: "dismissed", resolved_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) {
        return NextResponse.json({ error: "No se pudo descartar el reporte" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Reporte descartado." });
    }

    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  } catch (err) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
