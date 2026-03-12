import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/riot/account/refresh
 *
 * Refresca la información de la cuenta de Riot vinculada
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const accessToken = body.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token no proporcionado" },
        { status: 400 }
      );
    }

    const playerResponse = await fetch(
      "https://americas.api.riotgames.com/riot/account/v1/accounts/me",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const playerData = await playerResponse.json();

    if (!playerResponse.ok) {
      return NextResponse.json(
        { error: "Error al obtener información del jugador" },
        { status: 500 }
      );
    }

    const puuid = playerData.puuid;
    const gameName = playerData.game_name;
    const tagLine = playerData.tag_line;

    const { error: updateError } = await supabase
      .from("linked_accounts_riot")
      .update({
        puuid,
        game_name: gameName,
        tag_line: tagLine,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Error al actualizar cuenta de Riot" },
        { status: 500 }
      );
    }

    // --- Registro en Allstar (Partner API) ---
    // Aseguramos que el jugador esté registrado en Allstar al refrescar
    const allstarApiKey = process.env.ALLSTAR_SERVER_API_KEY;
    const allstarProjectId = process.env.ALLSTAR_PROJECT_ID;
    let allstarRegistered = false;

    if (allstarApiKey && allstarProjectId) {
      try {
        await fetch(`https://api.allstar.gg/v1/players`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${allstarApiKey}`,
            "Content-Type": "application/json",
            "X-Allstar-Project-ID": allstarProjectId,
          },
          body: JSON.stringify({
            external_id: `riot:${puuid}`,
            game: "league_of_legends",
            game_account_id: `riot:${puuid}`,
            project_id: allstarProjectId
          })
        });
        allstarRegistered = true;
      } catch (err) {
        // Fallo silencioso en el refresh para no bloquear la experiencia del usuario
      }
    }

    return NextResponse.json(
      {
        message: "Cuenta actualizada exitosamente" + (allstarRegistered ? " y sincronizada con Allstar" : ""),
        account: {
          puuid,
          gameName,
          tagLine,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
