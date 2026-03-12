import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";
import { syncRiotStats } from "@/lib/riot/sync";

const RIOT_API_KEY = process.env.RIOT_API_KEY!;
const DEFAULT_PLATFORM_REGION = "la1";

const UNRANKED_RANK = {
  tier: "UNRANKED",
  rank: null,
  leaguePoints: 0,
  wins: 0,
  losses: 0,
};

/**
 * POST /api/riot/account/link-manual
 *
 * Vincula manualmente una cuenta de Riot sin OAuth
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user?.id) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para vincular tu cuenta" },
        { status: 401 }
      );
    }

    const userId = user.id;

    const body = await request.json();
    const { puuid, gameName, tagLine, region = DEFAULT_PLATFORM_REGION } = body;

    if (!puuid || !gameName || !tagLine) {
      return NextResponse.json(
        { error: "puuid, gameName y tagLine son requeridos" },
        { status: 400 }
      );
    }

    const serviceClient = getServiceClient();
    const { data: existingAccount, error: checkError } = await serviceClient
      .from("linked_accounts_riot")
      .select("user_id, game_name, tag_line")
      .eq("puuid", puuid)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      return NextResponse.json(
        { error: "Error al verificar la cuenta" },
        { status: 500 }
      );
    }

    if (existingAccount && existingAccount.user_id !== userId) {
      return NextResponse.json(
        {
          error: `Esta cuenta de Riot (${existingAccount.game_name}#${existingAccount.tag_line}) ya está vinculada a otro usuario`,
        },
        { status: 409 }
      );
    }

    const syncResult = await syncRiotStats(puuid, RIOT_API_KEY, region);

    let statsData = {
      activeShard: region,
      summonerId: null as string | null,
      summonerLevel: 1,
      profileIconId: 0,
      soloRank: { ...UNRANKED_RANK },
      flexRank: { ...UNRANKED_RANK },
    };

    if (syncResult.success && syncResult.data) {
      statsData = syncResult.data;
    }

    const soloRank = statsData.soloRank || { ...UNRANKED_RANK };
    const flexRank = statsData.flexRank || { ...UNRANKED_RANK };

    const { error: upsertError } = await serviceClient
      .from("linked_accounts_riot")
      .upsert(
        {
          user_id: userId,
          puuid,
          game_name: gameName,
          tag_line: tagLine,
          region,
          active_shard: statsData.activeShard,
          summoner_id: statsData.summonerId,
          summoner_level: statsData.summonerLevel,
          profile_icon_id: statsData.profileIconId,
          solo_tier: soloRank.tier,
          solo_rank: soloRank.rank,
          solo_league_points: soloRank.leaguePoints,
          solo_wins: soloRank.wins,
          solo_losses: soloRank.losses,
          flex_tier: flexRank.tier,
          flex_rank: flexRank.rank,
          flex_league_points: flexRank.leaguePoints,
          flex_wins: flexRank.wins,
          flex_losses: flexRank.losses,
          access_token: null,
          refresh_token: null,
          updated_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
          ignoreDuplicates: false,
        }
      );

    if (upsertError) {
      return NextResponse.json(
        { error: "Error al guardar la cuenta vinculada" },
        { status: 500 }
      );
    }

    // --- Registro en Allstar (Partner API) ---
    // Registramos al jugador para que Allstar empiece a trackearlo y enviarnos webhooks
    const allstarApiKey = process.env.ALLSTAR_SERVER_API_KEY;
    const allstarProjectId = process.env.ALLSTAR_PROJECT_ID;
    let allstarRegistered = false;

    if (allstarApiKey && allstarProjectId) {
      try {
        console.log(`[Allstar Registration] Registrando jugador riot:${puuid} en Allstar...`);
        const allstarResponse = await fetch(`https://api.allstar.gg/v1/players`, {
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

        if (allstarResponse.ok) {
          allstarRegistered = true;
          console.log(`[Allstar Registration] ✅ Jugador registrado exitosamente.`);
        } else {
          const errText = await allstarResponse.text();
          console.warn(`[Allstar Registration] ⚠️ No se pudo registrar en Allstar: ${errText.substring(0, 100)}`);
        }
      } catch (err: any) {
        console.error(`[Allstar Registration] 💥 Error de conexión con Allstar:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cuenta vinculada exitosamente" + (allstarRegistered ? " y registrada en Allstar" : ""),
      account: {
        puuid,
        gameName,
        tagLine,
        region,
        summonerLevel: statsData.summonerLevel,
        profileIconId: statsData.profileIconId,
        soloTier: soloRank.tier,
        soloRank: soloRank.rank,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
