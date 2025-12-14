import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const RIOT_API_KEY = process.env.RIOT_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Obtener el token de autorización
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // Verificar el token y obtener el usuario
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!RIOT_API_KEY) {
      return NextResponse.json(
        { error: "RIOT_API_KEY no configurada" },
        { status: 500 }
      );
    }

    // Obtener la cuenta Riot vinculada del usuario
    const { data: riotAccount, error: riotError } = await supabase
      .from("riot_accounts")
      .select("summoner_id, active_shard")
      .eq("user_id", user.id)
      .single();

    if (riotError || !riotAccount) {
      return NextResponse.json(
        { hasActiveMatch: false, reason: "No linked Riot account" },
        { status: 200 }
      );
    }

    if (!riotAccount.summoner_id) {
      return NextResponse.json(
        { hasActiveMatch: false, reason: "Missing summoner_id" },
        { status: 200 }
      );
    }

    const platformRegion = (riotAccount.active_shard || "la1").toLowerCase();
    const spectatorUrl = `https://${platformRegion}.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${riotAccount.summoner_id}`;

    const spectatorResponse = await fetch(spectatorUrl, {
      method: "GET",
      headers: {
        "X-Riot-Token": RIOT_API_KEY,
      },
      cache: "no-store",
    });

    // 404 = no está en partida (caso normal)
    if (spectatorResponse.status === 404) {
      return NextResponse.json(
        { hasActiveMatch: false, reason: "No active game" },
        { status: 200 }
      );
    }

    // 200 = en partida
    if (spectatorResponse.status === 200) {
      const data = await spectatorResponse.json().catch(() => null);

      return NextResponse.json(
        {
          hasActiveMatch: true,
          reason: "Active game (Spectator API)",
          gameId: data?.gameId ?? null,
          gameStartTime: data?.gameStartTime ?? null,
          gameLength: data?.gameLength ?? null,
          queueId: data?.gameQueueConfigId ?? null,
        },
        { status: 200 }
      );
    }

    // Otros errores (rate limit / permisos / etc)
    const riotErrorBody = await spectatorResponse.json().catch(() => ({}));
    console.error("[GET /api/riot/matches/active] Riot Spectator error:", {
      status: spectatorResponse.status,
      error: riotErrorBody,
    });

    return NextResponse.json(
      {
        error: "Failed to check active match",
        hasActiveMatch: false,
        reason: "Riot API error",
        riotStatus: spectatorResponse.status,
      },
      { status: 502 }
    );
  } catch (error) {
    console.error("[GET /api/riot/matches/active] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
