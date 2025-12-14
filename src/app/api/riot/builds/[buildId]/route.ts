import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type DeleteBuildResponse =
  | { success: true }
  | { success: false; message: string };

export async function DELETE(
  request: NextRequest,
  { params }: { params: { buildId: string } }
): Promise<NextResponse<DeleteBuildResponse>> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "No autorizado" },
        { status: 401 }
      );
    }

    const buildId = params.buildId;
    if (!buildId) {
      return NextResponse.json(
        { success: false, message: "buildId es requerido" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("lol_saved_builds")
      .delete()
      .eq("id", buildId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("[DELETE /api/riot/builds/[buildId]] Error:", error);
      return NextResponse.json(
        { success: false, message: "No se pudo eliminar la build" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "[DELETE /api/riot/builds/[buildId]] Unexpected error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
