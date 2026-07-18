import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getServiceClient();
    
    // Auth and role check
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await (await createClient()).from("perfiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { weapon_record_id, stats } = body;

    if (!weapon_record_id || !stats) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // Convert internal mapped stats back to spanish keys used in DB
    const dbStats = {
      dano: Number(stats.damage) || 0,
      alcance: Number(stats.range) || 0,
      control: Number(stats.control) || 0,
      manejo: Number(stats.handling) || 0,
      estabilidad: Number(stats.stability) || 0,
      precision: Number(stats.accuracy) || 0,
      cadenciaDisparo: Number(stats.fire_rate) || 0,
      perforacionBlindaje: Number(stats.armor_penetration) || 0,
      capacidad: Number(stats.capacity) || 0,
      velocidadBoca: Number(stats.muzzle_velocity) || 0,
      sonidoDisparo: Number(stats.sound_range) || 0,
    };

    // Update weapon_stats_records
    const { error: updateError } = await supabase
      .from("weapon_stats_records")
      .update({ stats: dbStats })
      .eq("id", weapon_record_id);

    if (updateError) {
      console.error("[admin-report-update-stats] Error al actualizar stats:", updateError);
      return NextResponse.json({ error: "Error al actualizar las estadísticas" }, { status: 500 });
    }

    // Log the action
    await supabase.from("admin_logs").insert({
      admin_id: user.id,
      action: "edit_weapon_stats",
      target_type: "weapon_stats_records",
      target_id: weapon_record_id,
      details: `Stats actualizadas desde reporte ${id}`,
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin-report-update-stats] Internal Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
