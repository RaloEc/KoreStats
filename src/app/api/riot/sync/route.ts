import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncRiotStats, getRoutingRegionFromShard } from "@/lib/riot/sync";

const UNRANKED_RANK = {
  tier: "UNRANKED",
  rank: null,
  leaguePoints: 0,
  wins: 0,
  losses: 0,
};

/**
 * POST /api/riot/sync
 *
 * Sincroniza manualmente las estadísticas de Riot del usuario autenticado
 *
 * Respuesta:
 * - 200: Estadísticas sincronizadas exitosamente
 * - 404: No hay cuenta de Riot vinculada
 * - 401: Usuario no autenticado
 * - 500: Error interno del servidor
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[POST /api/riot/sync] Iniciando sincronización manual...");

    // Obtener sesión del usuario autenticado
    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user?.id) {
      console.error(
        "[POST /api/riot/sync] Usuario no autenticado:",
        sessionError
      );
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = session.user.id;
    console.log("[POST /api/riot/sync] Usuario:", userId);

    // Obtener cuenta de Riot vinculada
    const { data: riotAccount, error: queryError } = await supabase
      .from("linked_accounts_riot")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (queryError || !riotAccount) {
      console.error(
        "[POST /api/riot/sync] No hay cuenta de Riot vinculada:",
        queryError
      );
      return NextResponse.json(
        { error: "No hay cuenta de Riot vinculada" },
        { status: 404 }
      );
    }

    const { puuid, region } = riotAccount;
    console.log("[POST /api/riot/sync] Cuenta Riot encontrada", {
      puuid,
      region,
      lastUpdated: riotAccount.last_updated,
    });

    // Sincronizar estadísticas
    console.log(
      "[POST /api/riot/sync] Sincronizando estadísticas para PUUID:",
      puuid
    );

    const platformId = (region || "na1").toLowerCase();
    console.log(
      "[POST /api/riot/sync] Usando platformId (región almacenada)",
      platformId
    );
    const syncResult = await syncRiotStats(
      puuid,
      process.env.RIOT_API_KEY || "",
      platformId
    );

    if (!syncResult.success) {
      console.error(
        "[POST /api/riot/sync] Error al sincronizar:",
        syncResult.error
      );
      return NextResponse.json(
        {
          error: "Error al sincronizar estadísticas",
          details: syncResult.error,
        },
        { status: 500 }
      );
    }

    const statsData = syncResult.data || {
      activeShard: platformId,
      summonerId: riotAccount.summoner_id,
      summonerLevel: riotAccount.summoner_level ?? 0,
      profileIconId: riotAccount.profile_icon_id ?? 0,
      soloRank: { ...UNRANKED_RANK },
      flexRank: { ...UNRANKED_RANK },
    };

    const soloRank = statsData.soloRank || { ...UNRANKED_RANK };
    const flexRank = statsData.flexRank || { ...UNRANKED_RANK };

    console.log("[POST /api/riot/sync] Datos recibidos de Riot", {
      solo: soloRank,
      flex: flexRank,
      level: statsData.summonerLevel,
    });

    // Obtener gameName y tagLine actualizados desde Riot Account API
    console.log("[POST /api/riot/sync] Obteniendo gameName y tagLine...");
    let gameName = riotAccount.game_name;
    let tagLine = riotAccount.tag_line;

    try {
      const routingRegion = getRoutingRegionFromShard(platformId);
      const accountUrl = `https://${routingRegion}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`;

      console.log("[POST /api/riot/sync] Consultando Account API:", accountUrl);

      const accountResponse = await fetch(accountUrl, {
        method: "GET",
        headers: {
          "X-Riot-Token": process.env.RIOT_API_KEY || "",
        },
      });

      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        gameName = accountData.gameName;
        tagLine = accountData.tagLine;
        console.log("[POST /api/riot/sync] ✅ Nombre actualizado:", {
          gameName,
          tagLine,
        });
      } else {
        console.warn(
          "[POST /api/riot/sync] No se pudo obtener gameName/tagLine, usando valores existentes"
        );
      }
    } catch (error) {
      console.error(
        "[POST /api/riot/sync] Error al obtener gameName/tagLine:",
        error
      );
      // Continuar con los valores existentes
    }

    // Actualizar base de datos
    console.log("[POST /api/riot/sync] Actualizando base de datos...");
    console.log("[POST /api/riot/sync] Datos a guardar:", {
      game_name: gameName,
      tag_line: tagLine,
      summoner_id: statsData.summonerId,
      summoner_level: statsData.summonerLevel,
    });

    const { error: updateError } = await supabase
      .from("linked_accounts_riot")
      .update({
        game_name: gameName,
        tag_line: tagLine,
        active_shard: statsData.activeShard,
        summoner_id: statsData.summonerId,
        profile_icon_id: statsData.profileIconId,
        summoner_level: statsData.summonerLevel,
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
        last_updated: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("[POST /api/riot/sync] Error al actualizar:", updateError);
      return NextResponse.json(
        {
          error: "Error al guardar estadísticas",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    console.log(
      "[POST /api/riot/sync] ✅ Estadísticas sincronizadas exitosamente"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Estadísticas sincronizadas exitosamente",
        data: statsData,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[POST /api/riot/sync] Error inesperado:", error);

    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
