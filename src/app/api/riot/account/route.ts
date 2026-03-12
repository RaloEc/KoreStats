import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/riot/account
 *
 * Obtiene la información de la cuenta de Riot vinculada del usuario autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = user.id;

    const { data: riotAccount, error: queryError } = await supabase
      .from("linked_accounts_riot")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (queryError) {
      if (queryError.code === "PGRST116") {
        return NextResponse.json(
          { error: "No hay cuenta de Riot vinculada" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Error al obtener cuenta de Riot" },
        { status: 500 }
      );
    }

    return NextResponse.json({ account: riotAccount }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/riot/account
 *
 * Desvincula la cuenta de Riot del usuario autenticado
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = user.id;

    const { error: deleteError } = await supabase
      .from("linked_accounts_riot")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Error al desvincular cuenta de Riot" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Cuenta desvinculada exitosamente" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
