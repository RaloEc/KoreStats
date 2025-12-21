import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/riot/account/unlink
 * Desvincula la cuenta de Riot Games del usuario actual
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    console.log(
      "[DELETE /api/riot/account/unlink] Desvinculando cuenta para usuario:",
      user.id
    );

    // Eliminar la cuenta vinculada
    const { error: deleteError } = await supabase
      .from("linked_accounts_riot")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error(
        "[DELETE /api/riot/account/unlink] Error al desvincular:",
        deleteError
      );
      return NextResponse.json(
        { error: "Error al desvincular la cuenta" },
        { status: 500 }
      );
    }

    console.log(
      "[DELETE /api/riot/account/unlink] Cuenta desvinculada exitosamente"
    );

    return NextResponse.json({
      success: true,
      message: "Cuenta de Riot Games desvinculada exitosamente",
    });
  } catch (error: any) {
    console.error("[DELETE /api/riot/account/unlink] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error al desvincular la cuenta" },
      { status: 500 }
    );
  }
}
