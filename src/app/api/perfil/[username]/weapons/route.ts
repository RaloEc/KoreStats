import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/perfil/[username]/weapons
 *
 * Obtiene los registros de análisis de armas de un usuario.
 * Acepta username, public_id o UUID directo como parámetro.
 * Se usa en la pestaña de perfil de Delta Force.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: identifier } = await params;
    const supabase = await createClient();

    let userId: string | null = null;

    // Detectar si es un UUID directo
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier
      );

    if (isUUID) {
      // Es un UUID, usarlo directamente
      userId = identifier;
    } else {
      // Buscar por public_id primero, luego por username
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("id")
        .eq("public_id", identifier)
        .single();

      if (perfil) {
        userId = perfil.id;
      } else {
        const { data: perfilByUsername } = await supabase
          .from("perfiles")
          .select("id")
          .eq("username", identifier)
          .single();

        if (perfilByUsername) {
          userId = perfilByUsername.id;
        }
      }
    }

    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    // Obtener weapon_stats_records del usuario que tengan share_code (completados)
    const { data: records, error: recordsError } = await supabase
      .from("weapon_stats_records")
      .select("id, weapon_name, stats, created_at, share_code, description, game_mode, patch_version")
      .eq("user_id", userId)
      .not("share_code", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (recordsError) {
      console.error("[weapons]", recordsError);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(records || []);
  } catch (error) {
    console.error("[weapons] Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
