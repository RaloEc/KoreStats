import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
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

    const { id: weapon_stats_record_id } = await params;
    const body = await request.json();
    const { reason, details } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    // Check if report already exists for this user and weapon to prevent spam
    const { data: existingReport } = await supabase
      .from("weapon_reports")
      .select("id")
      .eq("weapon_stats_record_id", weapon_stats_record_id)
      .eq("reporter_id", user.id)
      .single();
      
    if (existingReport) {
      return NextResponse.json(
        { error: "Ya has reportado esta arma anteriormente" },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from("weapon_reports")
      .insert({
        weapon_stats_record_id,
        reporter_id: user.id,
        reason,
        details: details || null,
      });

    if (insertError) {
      console.error("[weapon-report] Error al guardar reporte:", insertError);
      return NextResponse.json(
        { error: "Error al enviar el reporte." },
        { status: 500 }
      );
    }

    // 1. Obtener todos los administradores del sistema
    const { data: admins } = await supabase
      .from("perfiles")
      .select("id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      // 2. Obtener el nombre descriptivo de la build reportada
      const { data: weapon } = await supabase
        .from("weapon_stats_records")
        .select("weapon_name, description")
        .eq("id", weapon_stats_record_id)
        .single();

      const weaponLabel = weapon?.description || weapon?.weapon_name || "Arma";

      const reasonLabels: Record<string, string> = {
        inappropriate_name: "Nombre inapropiado",
        fake_code: "Código falso o inválido",
        wrong_stats: "Estadísticas troll / erróneas",
        other: "Otro motivo",
      };
      const reasonText = reasonLabels[reason] || reason;

      // 3. Crear las notificaciones para cada administrador (excluyendo al que reporta)
      const adminNotifications = admins
        .filter((admin) => admin.id !== user.id)
        .map((admin) => ({
        user_id: admin.id,
        title: "Nuevo Reporte de Arma",
        message: `Se ha reportado la build "${weaponLabel}". Motivo: ${reasonText}.`,
        type: "info",
        read: false,
        data: {
          source_type: "moderation_report",
          weapon_id: weapon_stats_record_id,
          link: "/admin/juegos/delta-force?tab=reports", // Enlace que redirige a la pestaña de reportes
        },
      }));

      if (adminNotifications.length > 0) {
        await supabase.from("notifications").insert(adminNotifications);
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[weapon-report] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
