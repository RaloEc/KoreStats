import { NextRequest, NextResponse } from "next/server";

const RIOT_API_KEY = process.env.RIOT_API_KEY!;

/**
 * GET /api/riot/account/search
 *
 * Busca una cuenta de Riot por gameName y tagLine
 * Incluye información adicional: avatar, nivel, rango
 *
 * Query params:
 * - gameName: Nombre del jugador (requerido)
 * - tagLine: Tag del jugador (requerido)
 * - region: Región de enrutamiento (opcional, default: americas)
 * - platformRegion: Región de plataforma para stats (opcional, default: la1)
 *
 * Respuesta:
 * - 200: { puuid, gameName, tagLine, profileIconId, summonerLevel, tier, rank, leaguePoints }
 * - 400: Parámetros faltantes
 * - 404: Cuenta no encontrada
 * - 500: Error del servidor
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gameName = searchParams.get("gameName");
    const tagLine = searchParams.get("tagLine");
    const region = searchParams.get("region") || "americas";
    const platformRegion = searchParams.get("platformRegion") || "la1";

    console.log("[GET /api/riot/account/search] Buscando cuenta:", {
      gameName,
      tagLine,
      region,
      platformRegion,
    });

    // Validar parámetros requeridos
    if (!gameName || !tagLine) {
      return NextResponse.json(
        { error: "gameName y tagLine son requeridos" },
        { status: 400 }
      );
    }

    // Validar API Key
    if (!RIOT_API_KEY) {
      console.error(
        "[GET /api/riot/account/search] RIOT_API_KEY no configurada"
      );
      return NextResponse.json(
        { error: "Configuración del servidor incompleta" },
        { status: 500 }
      );
    }

    // PASO 1: Buscar cuenta por Riot ID
    const encodedGameName = encodeURIComponent(gameName);
    const encodedTagLine = encodeURIComponent(tagLine);
    const accountUrl = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodedGameName}/${encodedTagLine}`;

    console.log(
      "[GET /api/riot/account/search] Consultando Riot API:",
      accountUrl
    );

    const accountResponse = await fetch(accountUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY,
      },
    });

    if (accountResponse.status === 404) {
      console.log("[GET /api/riot/account/search] Cuenta no encontrada");
      return NextResponse.json(
        { error: "Cuenta no encontrada. Verifica el nombre y tag." },
        { status: 404 }
      );
    }

    if (!accountResponse.ok) {
      const errorData = await accountResponse.json().catch(() => ({}));
      console.error("[GET /api/riot/account/search] Error de Riot API:", {
        status: accountResponse.status,
        error: errorData,
      });
      return NextResponse.json(
        { error: "Error al buscar la cuenta" },
        { status: accountResponse.status }
      );
    }

    const accountData = await accountResponse.json();
    const puuid = accountData.puuid;

    console.log("[GET /api/riot/account/search] ✅ Cuenta encontrada:", {
      puuid,
      gameName: accountData.gameName,
      tagLine: accountData.tagLine,
    });

    // PASO 2: Obtener información del summoner (avatar, nivel)
    let summonerData = null;
    try {
      const summonerUrl = `https://${platformRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
      const summonerResponse = await fetch(summonerUrl, {
        headers: {
          "X-Riot-Token": RIOT_API_KEY,
        },
      });

      if (summonerResponse.ok) {
        summonerData = await summonerResponse.json();
        console.log("[GET /api/riot/account/search] ✅ Summoner data obtenida");
      }
    } catch (err) {
      console.warn(
        "[GET /api/riot/account/search] No se pudo obtener summoner data:",
        err
      );
    }

    // PASO 3: Obtener ranking (tier, rank, LP)
    let rankingData = null;
    if (puuid) {
      try {
        const rankingUrl = `https://${platformRegion}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
        const rankingResponse = await fetch(rankingUrl, {
          headers: {
            "X-Riot-Token": RIOT_API_KEY,
          },
          cache: "no-store",
        });

      if (rankingResponse.ok) {
        const rankings = await rankingResponse.json();
        // Buscar ranking de SoloQ
        const soloQRank = rankings.find(
          (r: any) => r.queueType === "RANKED_SOLO_5x5"
        );
        if (soloQRank) {
          rankingData = {
            tier: soloQRank.tier,
            rank: soloQRank.rank,
            leaguePoints: soloQRank.leaguePoints,
            wins: soloQRank.wins,
            losses: soloQRank.losses,
          };
          console.log(
            "[GET /api/riot/account/search] ✅ Ranking obtenido:",
            rankingData
          );
        }
      }
    } catch (err) {
      console.warn(
        "[GET /api/riot/account/search] No se pudo obtener ranking:",
        err
      );
      }
    }

    // Construir respuesta con toda la información
    return NextResponse.json({
      puuid: accountData.puuid,
      gameName: accountData.gameName,
      tagLine: accountData.tagLine,
      profileIconId: summonerData?.profileIconId || 29,
      summonerLevel: summonerData?.summonerLevel || 1,
      tier: rankingData?.tier || null,
      rank: rankingData?.rank || null,
      leaguePoints: rankingData?.leaguePoints || 0,
      wins: rankingData?.wins || 0,
      losses: rankingData?.losses || 0,
    });
  } catch (error: any) {
    console.error("[GET /api/riot/account/search] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
