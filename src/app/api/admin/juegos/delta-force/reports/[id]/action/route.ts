import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

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
    const { action, weapon_record_id, reason, details } = await request.json();

    if (!["dismiss", "delete_weapon"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "delete_weapon") {
      const supabaseAdmin = getServiceClient();

      // 1. Obtener datos de la build antes de eliminarla
      const { data: weapon } = await supabaseAdmin
        .from("weapon_stats_records")
        .select("*")
        .eq("id", weapon_record_id)
        .single();

      const reasonLabels: Record<string, string> = {
        inappropriate_name: "Nombre inapropiado",
        fake_code: "Código falso o inválido",
        wrong_stats: "Estadísticas troll / erróneas",
        other: "Otro motivo",
      };
      const reasonText = reasonLabels[reason] || reason || "Motivo no especificado";

      // 2. Guardar registro en admin_logs para auditoría
      await supabaseAdmin.from("admin_logs").insert({
        admin_id: user.id,
        accion: "delete_weapon_build",
        usuario_afectado_id: weapon?.user_id || null,
        detalles: {
          weapon_id: weapon_record_id,
          weapon_name: weapon?.weapon_name,
          description: weapon?.description,
          share_code: weapon?.share_code,
          stats: weapon?.stats,
          game_mode: weapon?.game_mode,
          deleted_by: user.id,
          reason: reasonText,
          details: details || "",
        },
        ip_address: request.headers.get("x-forwarded-for") || "",
        user_agent: request.headers.get("user-agent") || "",
      });

      // 3. Enviar notificación al creador de la build si existe
      if (weapon?.user_id) {
        const notifyMsg = `Tu build "${weapon.description || weapon.weapon_name}" para Delta Force ha sido eliminada por moderación. Motivo: ${reasonText}${details ? ` (${details})` : ""}.`;
        await supabaseAdmin.from("notifications").insert({
          user_id: weapon.user_id,
          title: "Build eliminada por moderación",
          message: notifyMsg,
          type: "info",
          read: false,
          data: {
            source_type: "moderation",
            weapon_name: weapon.weapon_name,
            reason: reason,
            details: details,
          },
        });
      }

      // 4. Borrar arma
      await supabaseAdmin
        .from("foro_hilos")
        .update({ weapon_stats_id: null })
        .eq("weapon_stats_id", weapon_record_id);

      const { error: delError } = await supabaseAdmin
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
