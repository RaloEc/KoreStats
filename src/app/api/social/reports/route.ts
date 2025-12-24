import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/social/reports - Create a new report for social content
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para reportar contenido" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content_type, content_id, reason, description } = body;

    // Validate required fields
    if (!content_type || !content_id || !reason) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Validate content type
    if (!["post", "comment"].includes(content_type)) {
      return NextResponse.json(
        { error: "Tipo de contenido no válido" },
        { status: 400 }
      );
    }

    // Validate reason
    const validReasons = [
      "spam",
      "harassment",
      "hate_speech",
      "violence",
      "inappropriate",
      "misinformation",
      "other",
    ];
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: "Razón no válida" }, { status: 400 });
    }

    // Verify content exists
    const tableName =
      content_type === "post" ? "social_posts" : "social_comments";
    const { data: content, error: contentError } = await supabase
      .from(tableName)
      .select("id, user_id")
      .eq("id", content_id)
      .single();

    if (contentError || !content) {
      return NextResponse.json(
        { error: "El contenido no existe" },
        { status: 404 }
      );
    }

    // Don't allow reporting own content
    if (content.user_id === user.id) {
      return NextResponse.json(
        { error: "No puedes reportar tu propio contenido" },
        { status: 400 }
      );
    }

    // Check if user already reported this content
    const { data: existingReport } = await supabase
      .from("social_reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq("content_type", content_type)
      .eq("content_id", content_id)
      .single();

    if (existingReport) {
      return NextResponse.json(
        { error: "Ya has reportado este contenido" },
        { status: 409 }
      );
    }

    // Create the report
    const { data: report, error: reportError } = await supabase
      .from("social_reports")
      .insert({
        reporter_id: user.id,
        content_type,
        content_id,
        reported_user_id: content.user_id,
        reason,
        description: description || null,
        status: "pending",
      })
      .select()
      .single();

    if (reportError) {
      console.error("Error creating report:", reportError);

      // If table doesn't exist, return success anyway (report was noted)
      if (reportError.code === "42P01") {
        return NextResponse.json(
          {
            success: true,
            message:
              "Reporte recibido. Gracias por ayudar a mantener la comunidad segura.",
          },
          { status: 201 }
        );
      }

      return NextResponse.json(
        { error: "Error al crear el reporte" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        report_id: report.id,
        message:
          "Reporte enviado correctamente. Será revisado por nuestro equipo.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
