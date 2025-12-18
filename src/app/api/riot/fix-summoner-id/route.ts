import { NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    // Obtener sesión del usuario
    const authClient = await createClient();
    const {
      data: { session },
    } = await authClient.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = getServiceClient();
    const RIOT_API_KEY = process.env.RIOT_API_KEY;

    if (!RIOT_API_KEY) {
      return NextResponse.json(
        { error: "RIOT_API_KEY no configurada" },
        { status: 500 }
      );
    }

    // Obtener cuenta de Riot
    const { data: riotAccount, error: accountError } = await supabase
      .from("linked_accounts_riot")
      .select("puuid, active_shard, summoner_id")
      .eq("user_id", session.user.id)
      .single();

    if (accountError || !riotAccount) {
      return NextResponse.json(
        { error: "No hay cuenta de Riot vinculada" },
        { status: 404 }
      );
    }

    if (!riotAccount.puuid) {
      return NextResponse.json(
        { error: "PUUID no encontrado" },
        { status: 400 }
      );
    }

    const platformRegion = (riotAccount.active_shard || "la1").toLowerCase();

    // Obtener summoner_id desde la API de Riot
    const url = `https://${platformRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${riotAccount.puuid}`;
    console.log("[fix-summoner-id] Fetching from:", url);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Riot-Token": RIOT_API_KEY,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[fix-summoner-id] Riot API error:", res.status);
      return NextResponse.json(
        {
          error: "Error al obtener datos de Riot",
          status: res.status,
        },
        { status: 500 }
      );
    }

    const body = (await res.json()) as {
      id?: string;
      name?: string;
      summonerLevel?: number;
    };

    if (!body.id) {
      return NextResponse.json(
        { error: "summoner_id no encontrado en respuesta de Riot" },
        { status: 500 }
      );
    }

    // Actualizar en la base de datos
    const { error: updateError } = await supabase
      .from("linked_accounts_riot")
      .update({ summoner_id: body.id })
      .eq("user_id", session.user.id);

    if (updateError) {
      console.error("[fix-summoner-id] Error updating DB:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar base de datos" },
        { status: 500 }
      );
    }

    console.log("[fix-summoner-id] Successfully updated summoner_id");

    return NextResponse.json({
      success: true,
      summoner_id: body.id,
      summoner_name: body.name,
      summoner_level: body.summonerLevel,
    });
  } catch (error) {
    console.error("[fix-summoner-id] Unexpected error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
