import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/riot/account/public?publicId=username
 *
 * Obtiene la información de la cuenta de Riot vinculada de un usuario público
 * Busca por public_id del perfil del usuario
 *
 * Query params:
 * - publicId: public_id del usuario (requerido)
 *
 * Respuesta:
 * - 200: Información de la cuenta de Riot
 * - 400: publicId no proporcionado
 * - 404: No hay cuenta de Riot vinculada o usuario no encontrado
 * - 500: Error interno del servidor
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[GET /api/riot/account/public] Iniciando...");

    // Obtener publicId del query param
    const publicId = request.nextUrl.searchParams.get("publicId");

    if (!publicId) {
      console.error("[GET /api/riot/account/public] publicId no proporcionado");
      return NextResponse.json(
        { error: "publicId es requerido" },
        { status: 400 }
      );
    }

    console.log(
      "[GET /api/riot/account/public] Buscando perfil con publicId:",
      publicId
    );

    const supabase = getServiceClient();

    // 1. Obtener el perfil del usuario por public_id o username como fallback
    let { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select("id, public_id, username")
      .eq("public_id", publicId)
      .single();

    // Si no encontramos por public_id, intentar por username
    if (perfilError || !perfil) {
      console.log(
        `[GET /api/riot/account/public] public_id "${publicId}" no encontrado, intentando por username...`
      );
      const { data: perfilPorUsername, error: errorUsername } = await supabase
        .from("perfiles")
        .select("id, public_id, username")
        .eq("username", publicId)
        .single();

      if (errorUsername || !perfilPorUsername) {
        console.log(
          "[GET /api/riot/account/public] Perfil no encontrado ni por public_id ni por username:",
          publicId
        );
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      perfil = perfilPorUsername;
    }

    console.log("[GET /api/riot/account/public] Perfil encontrado:", {
      id: perfil.id,
      username: perfil.username,
    });

    // 2. Obtener cuenta de Riot vinculada del usuario
    const { data: riotAccount, error: queryError } = await supabase
      .from("linked_accounts_riot")
      .select("*")
      .eq("user_id", perfil.id)
      .single();

    if (queryError) {
      if (queryError.code === "PGRST116") {
        // No hay resultados
        console.log(
          "[GET /api/riot/account/public] No hay cuenta de Riot vinculada para usuario:",
          perfil.id
        );
        return NextResponse.json(
          { error: "Este usuario no ha vinculado su cuenta de Riot Games" },
          { status: 404 }
        );
      }

      console.error(
        "[GET /api/riot/account/public] Error en query:",
        queryError
      );
      return NextResponse.json(
        { error: "Error al obtener cuenta de Riot" },
        { status: 500 }
      );
    }

    console.log(
      "[GET /api/riot/account/public] ✅ Cuenta encontrada (COMPLETA):",
      {
        id: riotAccount.id,
        user_id: riotAccount.user_id,
        gameName: riotAccount.game_name,
        tagLine: riotAccount.tag_line,
        soloTier: riotAccount.solo_tier,
        soloRank: riotAccount.solo_rank,
        soloLp: riotAccount.solo_league_points,
        soloWins: riotAccount.solo_wins,
        soloLosses: riotAccount.solo_losses,
        flexTier: riotAccount.flex_tier,
        flexRank: riotAccount.flex_rank,
        flexLp: riotAccount.flex_league_points,
        flexWins: riotAccount.flex_wins,
        flexLosses: riotAccount.flex_losses,
        lastUpdated: riotAccount.last_updated,
      }
    );

    return NextResponse.json(
      { account: riotAccount, profile: perfil },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[GET /api/riot/account/public] Error inesperado:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
