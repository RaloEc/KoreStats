import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * API para obtener todos los usuarios con avatares de Google
 * GET /api/perfil/check-google-avatars
 */

export async function GET(request: NextRequest) {
  try {
    // Crear cliente dentro del handler para evitar errores de build en Netlify
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[check-google-avatars] Variables de entorno faltantes");
      return NextResponse.json(
        { error: "Configuración del servidor incompleta" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(
      "[check-google-avatars] Buscando usuarios con avatares de Google..."
    );

    // Obtener todos los usuarios con avatares de Google
    const { data: users, error } = await supabase
      .from("perfiles")
      .select("id, username, avatar_url")
      .like("avatar_url", "%googleusercontent.com%");

    if (error) {
      console.error("[check-google-avatars] Error:", error);
      return NextResponse.json(
        { error: "Error al consultar la base de datos" },
        { status: 500 }
      );
    }

    console.log(
      `[check-google-avatars] Se encontraron ${users?.length || 0} usuarios`
    );

    return NextResponse.json({
      success: true,
      count: users?.length || 0,
      users: users || [],
    });
  } catch (error) {
    console.error("[check-google-avatars] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
