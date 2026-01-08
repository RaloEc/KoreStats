import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de paginación
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "5");
    const userId = searchParams.get("userId");

    // Validar parámetros
    if (!userId) {
      return NextResponse.json(
        { error: "Se requiere el ID de usuario" },
        { status: 400 }
      );
    }

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Crear cliente de Supabase
    const cookieStore = cookies();
    const supabase = await createClient();

    // Verificar sesión
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log("[Perfil Actividades API] Iniciando consulta", {
      userId,
      page,
      limit,
      offset,
    });

    // Obtener actividades del usuario (sin comentarios ni respuestas)
    const [noticias, hilos, partidas] = await Promise.all([
      // Noticias creadas por el usuario
      supabase
        .from("noticias")
        .select(
          `
          id, titulo, contenido, created_at, estado, deleted_at, imagen_portada,
          categorias:noticias_categorias(categoria:categorias(nombre))
        `
        )
        .eq("autor_id", userId)
        .is("deleted_at", null)
        .neq("estado", "borrador")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),

      // Hilos creados por el usuario
      supabase
        .from("foro_hilos")
        .select(
          `
          id, titulo, contenido, created_at, 
          categoria:foro_categorias(nombre)
        `
        )
        .eq("autor_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),

      // Partidas compartidas
      supabase
        .from("user_activity_entries")
        .select("id, match_id, metadata, created_at")
        .eq("user_id", userId)
        .eq("type", "lol_match")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
    ]);

    // Función auxiliar para extraer preview de contenido
    const getContentPreview = (
      content: string,
      maxLength: number = 150
    ): string => {
      if (!content) return "";
      // Remover HTML tags
      const plainText = content.replace(/<[^>]*>/g, "");
      // Limitar longitud
      return plainText.length > maxLength
        ? plainText.substring(0, maxLength) + "..."
        : plainText;
    };

    // Definir tipos para las respuestas de Supabase
    type NoticiaItem = {
      id: number;
      titulo: string;
      contenido?: string;
      created_at: string;
      categorias?: Array<{ categoria?: { nombre?: string } }> | null;
      imagen_portada?: string | null;
    };

    type ComentarioItem = {
      id: number;
      contenido: string;
      created_at: string;
      noticia?: { titulo?: string } | null;
    };

    type HiloItem = {
      id: number;
      titulo: string;
      contenido?: string;
      created_at: string;
      categoria?: { nombre?: string } | null;
    };

    type RespuestaItem = {
      id: number;
      contenido: string;
      created_at: string;
      gif_url?: string | null;
      hilo?: { titulo?: string } | null;
    };

    type PartidaItem = {
      id: string;
      match_id: string;
      metadata: any;
      created_at: string;
    };

    const parseMetadata = (raw: any): Record<string, any> => {
      if (!raw) return {};
      if (typeof raw === "object") return raw;
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw);
        } catch (error) {
          console.warn("[Perfil Actividades API] No se pudo parsear metadata", {
            raw,
            error,
          });
          return {};
        }
      }
      return {};
    };

    // Transformar los resultados a formato ActivityItem
    console.log("[Perfil Actividades API] Noticias query result", {
      error: noticias.error,
      count: noticias.data?.length || 0,
      data: noticias.data?.map((n: any) => ({
        id: n.id,
        titulo: n.titulo,
        deleted_at: n.deleted_at,
        estado: n.estado,
      })),
    });

    const actividadesNoticias = ((noticias.data as NoticiaItem[]) || []).map(
      (noticia) => {
        // Asegurar que categorias es un array y acceder al primer elemento si existe
        const primeraCategoria =
          Array.isArray(noticia.categorias) && noticia.categorias.length > 0
            ? noticia.categorias[0]?.categoria?.nombre
            : "Noticias";

        return {
          id: `noticia-${noticia.id}`,
          type: "noticia",
          title: noticia.titulo,
          preview: getContentPreview(noticia.contenido || ""),
          timestamp: noticia.created_at,
          category: primeraCategoria,
          image: noticia.imagen_portada || null,
        };
      }
    );

    // Comentarios y respuestas eliminados para simplificar el feed
    const actividadesComentarios: any[] = [];
    const actividadesRespuestas: any[] = [];

    const actividadesHilos = ((hilos.data as HiloItem[]) || []).map((hilo) => ({
      id: `hilo-${hilo.id}`,
      type: "hilo",
      title: hilo.titulo,
      preview: getContentPreview(hilo.contenido || ""),
      content: hilo.contenido || "",
      timestamp: hilo.created_at,
      category: hilo.categoria?.nombre || "Foro",
    }));

    const partidasData = (partidas.data as PartidaItem[]) || [];
    const matchIds = partidasData.map((partida) => partida.match_id);
    const uniqueMatchIds = Array.from(new Set(matchIds));

    let userPuuid: string | null = null;
    const { data: linkedAccount, error: linkedAccountError } = await supabase
      .from("linked_accounts_riot")
      .select("puuid")
      .eq("user_id", userId)
      .maybeSingle();

    if (linkedAccountError) {
      console.warn("[Perfil Actividades API] No se pudo obtener cuenta Riot", {
        userId,
        error: linkedAccountError,
      });
    } else {
      userPuuid = linkedAccount?.puuid ?? null;
    }

    const matchParticipantsMap = new Map<string, any>();
    const rankSnapshotsMap = new Map<string, any>();
    const matchParticipantNamesByMatchId = new Map<
      string,
      Map<string, string>
    >();

    if (userPuuid && uniqueMatchIds.length > 0) {
      const { data: matchParticipants, error: matchParticipantsError } =
        await supabase
          .from("match_participants")
          .select(
            `
            match_id, champion_id, champion_name, role, lane, kills, deaths, assists, kda,
            total_minions_killed, neutral_minions_killed, vision_score,
            total_damage_dealt_to_champions, gold_earned, damage_dealt_to_turrets,
            item0, item1, item2, item3, item4, item5, item6,
            summoner1_id, summoner2_id, perk_primary_style, perk_sub_style,
            ranking_position, performance_score, win,
            matches(match_id, game_creation, game_duration, queue_id, data_version, full_json)
          `
          )
          .eq("puuid", userPuuid)
          .in("match_id", uniqueMatchIds);

      if (matchParticipantsError) {
        console.warn(
          "[Perfil Actividades API] Error obteniendo match_participants",
          matchParticipantsError
        );
      } else {
        matchParticipants?.forEach((participant) => {
          matchParticipantsMap.set(participant.match_id, participant);
        });
      }

      const { data: rankSnapshots, error: rankSnapshotsError } = await supabase
        .from("match_participant_ranks")
        .select("match_id, tier, rank, league_points, wins, losses")
        .eq("puuid", userPuuid)
        .in("match_id", uniqueMatchIds);

      if (rankSnapshotsError) {
        console.warn(
          "[Perfil Actividades API] Error obteniendo match_participant_ranks",
          rankSnapshotsError
        );
      } else {
        rankSnapshots?.forEach((rank) => {
          rankSnapshotsMap.set(rank.match_id, rank);
        });
      }

      const { data: participantNames, error: participantNamesError } =
        await supabase
          .from("match_participants")
          .select("match_id, puuid, summoner_name")
          .in("match_id", uniqueMatchIds);

      if (participantNamesError) {
        console.warn(
          "[Perfil Actividades API] Error obteniendo nombres de participantes",
          participantNamesError
        );
      } else {
        participantNames?.forEach((row: any) => {
          const matchId = row.match_id as string;
          const puuid = row.puuid as string;
          const summonerName =
            typeof row.summoner_name === "string" && row.summoner_name.trim()
              ? row.summoner_name.trim()
              : null;

          if (!matchId || !puuid || !summonerName) return;
          if (!matchParticipantNamesByMatchId.has(matchId)) {
            matchParticipantNamesByMatchId.set(matchId, new Map());
          }
          matchParticipantNamesByMatchId.get(matchId)!.set(puuid, summonerName);
        });
      }
    }

    // Obtener skins de campeones para asignación determinista
    const { data: championsData } = await supabase
      .from("lol_champions")
      .select("id, key, name, skins");

    const championSkinsMap = new Map<string, number[]>();
    championsData?.forEach((champ: any) => {
      if (champ.skins && Array.isArray(champ.skins)) {
        // Guardar por ID (Aatrox) y por Key (266) para asegurar match
        const skinNums = champ.skins
          .map((s: any) => s.num)
          .filter((n: any) => typeof n === "number");

        championSkinsMap.set(champ.id, skinNums);
        championSkinsMap.set(String(champ.key), skinNums);

        // Normalizaciones comunes
        if (champ.id === "Fiddlesticks")
          championSkinsMap.set("FiddleSticks", skinNums);
        if (champ.id === "MonkeyKing") championSkinsMap.set("Wukong", skinNums);
      }
    });

    const getDeterministicSkinId = (
      matchId: string,
      championName: string | number
    ): number => {
      const skins = championSkinsMap.get(String(championName));
      if (!skins || skins.length === 0) return 0;

      // Hash simple del matchId para obtener un índice consistente
      const hash = crypto.createHash("md5").update(matchId).digest("hex");
      const hashNum = parseInt(hash.substring(0, 8), 16);

      const index = hashNum % skins.length;
      return skins[index];
    };

    const actividadesPartidas = partidasData.map((partida) => {
      const metadata = parseMetadata(partida.metadata);
      const participant = matchParticipantsMap.get(partida.match_id);
      const rankSnapshot = rankSnapshotsMap.get(partida.match_id);

      const matchInfo = participant?.matches
        ? Array.isArray(participant.matches)
          ? participant.matches[0]
          : participant.matches
        : null;

      const championName =
        participant?.champion_name ||
        metadata.championName ||
        "Campeón desconocido";
      const championId = participant?.champion_id || metadata.championId || 0;
      const role = participant?.role || metadata.role || "Desconocido";
      const lane = participant?.lane || metadata.lane || role;

      const kills = participant?.kills ?? metadata.kills ?? 0;
      const deaths = participant?.deaths ?? metadata.deaths ?? 0;
      const assists = participant?.assists ?? metadata.assists ?? 0;
      const kdaValue =
        typeof participant?.kda === "number"
          ? participant?.kda
          : typeof metadata.kda === "number"
          ? metadata.kda
          : deaths > 0
          ? (kills + assists) / Math.max(deaths, 1)
          : kills + assists;

      const totalCS =
        (participant?.total_minions_killed ?? 0) +
        (participant?.neutral_minions_killed ?? 0);
      const gameDurationSeconds =
        matchInfo?.game_duration ?? metadata.gameDuration ?? 0;
      const csPerMin = gameDurationSeconds
        ? Number((totalCS / Math.max(gameDurationSeconds / 60, 1)).toFixed(1))
        : 0;

      const items = participant
        ? [
            participant.item0 ?? 0,
            participant.item1 ?? 0,
            participant.item2 ?? 0,
            participant.item3 ?? 0,
            participant.item4 ?? 0,
            participant.item5 ?? 0,
            participant.item6 ?? 0,
          ]
        : Array.isArray(metadata.items)
        ? [...metadata.items, 0, 0, 0, 0, 0, 0, 0].slice(0, 7)
        : [0, 0, 0, 0, 0, 0, 0];

      const resultWin = participant?.win ?? Boolean(metadata.win);
      const queueId = matchInfo?.queue_id ?? metadata.queueId ?? 0;
      const gameDuration = gameDurationSeconds;
      const gameCreation =
        matchInfo?.game_creation ?? metadata.gameCreation ?? 0;
      const dataVersion = matchInfo?.data_version ?? metadata.dataVersion ?? "";

      let perks = null;
      let teamTotalDamage = 0;
      let teamTotalGold = 0;
      let teamTotalKills = 0;
      let objectivesStolen = 0;
      let allPlayers: any[] = [];
      // Variables para nuevos badges
      let pentaKills = 0;
      let quadraKills = 0;
      let tripleKills = 0;
      let doubleKills = 0;
      let firstBloodKill = false;
      let totalTimeCCDealt = 0;
      let soloKills = 0;
      let turretPlatesTaken = 0;
      let earlyLaningPhaseGoldExpAdvantage = 0;
      let goldDeficit = 0;
      let teamAvgDamageToChampions = 0;
      let teamAvgGoldEarned = 0;
      let teamAvgKillParticipation = 0;
      let teamAvgVisionScore = 0;
      let teamAvgCsPerMin = 0;
      let teamAvgDamageToTurrets = 0;

      const getParticipantDisplayName = (p: unknown): string => {
        if (!p || typeof p !== "object") return "Jugador";
        const obj = p as Record<string, unknown>;

        const riotIdGameNameRaw = obj.riotIdGameName;
        const riotIdTaglineRaw = obj.riotIdTagline;
        const summonerNameRaw = obj.summonerName;

        const riotIdGameName =
          typeof riotIdGameNameRaw === "string" && riotIdGameNameRaw.trim()
            ? riotIdGameNameRaw.trim()
            : null;
        const riotIdTagline =
          typeof riotIdTaglineRaw === "string" && riotIdTaglineRaw.trim()
            ? riotIdTaglineRaw.trim()
            : null;
        const summonerName =
          typeof summonerNameRaw === "string" && summonerNameRaw.trim()
            ? summonerNameRaw.trim()
            : null;

        if (riotIdGameName && riotIdTagline)
          return `${riotIdGameName}#${riotIdTagline}`;
        if (riotIdGameName) return riotIdGameName;
        return summonerName ?? "Jugador";
      };

      const getDbParticipantNameFallback = (puuid: unknown): string | null => {
        const puuidValue =
          typeof puuid === "string" && puuid.trim() ? puuid.trim() : null;
        if (!puuidValue) return null;
        const byPuuid = matchParticipantNamesByMatchId.get(partida.match_id);
        return byPuuid?.get(puuidValue) ?? null;
      };

      const getParticipantPosition = (p: unknown): string => {
        if (!p || typeof p !== "object") return "Unknown";
        const obj = p as Record<string, unknown>;

        const normalize = (raw: unknown): string | null => {
          if (typeof raw !== "string") return null;
          const value = raw.trim().toUpperCase();
          if (!value) return null;
          if (value === "TOP") return "TOP";
          if (value === "JUNGLE" || value === "JG" || value === "JUN")
            return "JUNGLE";
          if (value === "MID" || value === "MIDDLE") return "MID";
          if (
            value === "BOT" ||
            value === "BOTTOM" ||
            value === "ADC" ||
            value === "CARRY" ||
            value === "DUO_CARRY"
          )
            return "BOT";
          if (
            value === "SUP" ||
            value === "SUPP" ||
            value === "SUPPORT" ||
            value === "UTILITY" ||
            value === "DUO_SUPPORT"
          )
            return "SUP";
          return null;
        };

        return (
          normalize(obj.teamPosition) ??
          normalize(obj.individualPosition) ??
          normalize(obj.lane) ??
          normalize(obj.role) ??
          "Unknown"
        );
      };

      if (matchInfo?.full_json?.info?.participants) {
        const participants = matchInfo.full_json.info.participants;
        const participantDetail = participants.find(
          (p: any) => p.puuid === (participant?.puuid || userPuuid)
        );
        perks = participantDetail?.perks ?? null;

        // Extraer stats base
        pentaKills = participantDetail?.pentaKills || 0;
        quadraKills = participantDetail?.quadraKills || 0;
        tripleKills = participantDetail?.tripleKills || 0;
        doubleKills = participantDetail?.doubleKills || 0;
        firstBloodKill = participantDetail?.firstBloodKill || false;
        totalTimeCCDealt = participantDetail?.totalTimeCCDealt || 0;

        // Extraer challenges
        const challenges = participantDetail?.challenges || {};
        soloKills = challenges.soloKills || 0;
        turretPlatesTaken = challenges.turretPlatesTaken || 0;
        earlyLaningPhaseGoldExpAdvantage =
          challenges.earlyLaningPhaseGoldExpAdvantage || 0;

        // Calcular datos de equipo
        const playerTeamId = participantDetail?.teamId;
        const teamParticipants = participants.filter(
          (p: any) => p.teamId === playerTeamId
        );
        const enemyParticipants = participants.filter(
          (p: any) => p.teamId !== playerTeamId
        );

        teamTotalDamage = teamParticipants.reduce(
          (sum: number, p: any) => sum + (p.totalDamageDealtToChampions || 0),
          0
        );
        teamTotalGold = teamParticipants.reduce(
          (sum: number, p: any) => sum + (p.goldEarned || 0),
          0
        );
        const enemyTotalGold = enemyParticipants.reduce(
          (sum: number, p: any) => sum + (p.goldEarned || 0),
          0
        );
        // Heurística simple para Remontada: Si ganamos pero tuvimos menos oro total (raro pero posible en base race)
        // O mejor: usar maxGoldAdvantage de challenges si existe? No siempre.
        // Si no hay timeline, usaremos esta heurística conservadora o 0.
        // Pero el badge de Remontada decía "4.9k behind". Eso implica max deficit.
        // challenges tiene "maxKillDeficit"? No. "12AssistStreakCount"? No.
        // Si challenges tiene "goldPerMinute", etc.
        // Voy a dejar goldDeficit como 0 por ahora a menos que ganemos con menos oro (que es una remontada épica).
        if (resultWin && enemyTotalGold > teamTotalGold) {
          goldDeficit = enemyTotalGold - teamTotalGold;
        }

        teamTotalKills = teamParticipants.reduce(
          (sum: number, p: any) => sum + (p.kills || 0),
          0
        );

        const teamCount =
          typeof teamParticipants.length === "number" &&
          teamParticipants.length > 0
            ? teamParticipants.length
            : 5;
        teamAvgDamageToChampions = teamTotalDamage / teamCount;
        teamAvgGoldEarned = teamTotalGold / teamCount;
        teamAvgKillParticipation =
          teamTotalKills > 0
            ? teamParticipants.reduce((sum: number, p: any) => {
                const kp =
                  (((p.kills || 0) + (p.assists || 0)) / teamTotalKills) * 100;
                return sum + kp;
              }, 0) / teamCount
            : 0;

        teamAvgVisionScore =
          teamParticipants.reduce(
            (sum: number, p: any) => sum + (p.visionScore || 0),
            0
          ) / teamCount;
        // gameDuration está en segundos, convertir a minutos
        const gameDurationSeconds =
          gameDuration || matchInfo?.game_duration || 0;
        const minutes = Math.max(1, gameDurationSeconds / 60);
        teamAvgCsPerMin =
          teamParticipants.reduce((sum: number, p: any) => {
            const cs =
              (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);
            return sum + cs / minutes;
          }, 0) / teamCount;
        teamAvgDamageToTurrets =
          teamParticipants.reduce(
            (sum: number, p: any) => sum + (p.damageDealtToTurrets || 0),
            0
          ) / teamCount;

        // Obtener objectives stolen del metadata si existe
        objectivesStolen =
          participant?.objectives_stolen || metadata.objectivesStolen || 0;

        // Obtener todos los jugadores del match
        allPlayers = participants.map((p: any) => ({
          championName: p.championName || "Desconocido",
          championId: p.championId || 0,
          summonerName: (() => {
            const displayName = getParticipantDisplayName(p);
            if (displayName !== "Jugador") return displayName;
            return getDbParticipantNameFallback(p.puuid) ?? "Jugador";
          })(),
          kills: p.kills || 0,
          deaths: p.deaths || 0,
          assists: p.assists || 0,
          kda:
            p.deaths > 0
              ? (p.kills + p.assists) / p.deaths
              : p.kills + p.assists,
          role: getParticipantPosition(p),
          team: p.teamId === 100 ? "blue" : "red",
          // Extraer datos de build y runas
          summoner1Id: p.summoner1Id,
          summoner2Id: p.summoner2Id,
          perkPrimaryStyle: p.perks?.styles?.[0]?.style,
          perkSubStyle: p.perks?.styles?.[1]?.style,
          item0: p.item0,
          item1: p.item1,
          item2: p.item2,
          item3: p.item3,
          item4: p.item4,
          item5: p.item5,
          item6: p.item6,
        }));
      }

      return {
        id: `lol_match-${partida.id}`,
        type: "lol_match" as const,
        title: `Partida con ${championName}`,
        preview: resultWin
          ? "Victoria en League of Legends"
          : "Derrota en League of Legends",
        timestamp: partida.created_at,
        category: "League of Legends",
        matchId: partida.match_id,
        championId,
        championName,
        skinId: getDeterministicSkinId(partida.match_id, championName),
        role,
        lane,
        win: resultWin,
        kda: Number.isFinite(kdaValue) ? Number(kdaValue) : undefined,
        kills,
        deaths,
        assists,
        totalCS,
        csPerMin,
        visionScore: participant?.vision_score ?? metadata.visionScore ?? 0,
        damageToChampions:
          participant?.total_damage_dealt_to_champions ??
          metadata.damageDealt ??
          0,
        damageToTurrets: participant?.damage_dealt_to_turrets ?? 0,
        goldEarned: participant?.gold_earned ?? metadata.goldEarned ?? 0,
        items,
        summoner1Id: participant?.summoner1_id ?? 0,
        summoner2Id: participant?.summoner2_id ?? 0,
        perkPrimaryStyle: participant?.perk_primary_style ?? 0,
        perkSubStyle: participant?.perk_sub_style ?? 0,
        perks,
        rankingPosition: participant?.ranking_position ?? null,
        performanceScore: participant?.performance_score ?? null,
        queueId,
        gameDuration,
        gameCreation,
        dataVersion,
        tier: rankSnapshot?.tier ?? null,
        rank: rankSnapshot?.rank ?? null,
        leaguePoints: rankSnapshot?.league_points ?? 0,
        rankWins: rankSnapshot?.wins ?? 0,
        rankLosses: rankSnapshot?.losses ?? 0,
        comment: metadata.comment || null,
        // Datos de equipo para comparativas
        teamTotalDamage,
        teamTotalGold,
        teamTotalKills,
        teamAvgDamageToChampions,
        teamAvgGoldEarned,
        teamAvgKillParticipation,
        teamAvgVisionScore,
        teamAvgCsPerMin,
        teamAvgDamageToTurrets,
        objectivesStolen,
        // Nuevos campos para badges
        pentaKills,
        quadraKills,
        tripleKills,
        doubleKills,
        firstBloodKill,
        totalTimeCCDealt,
        soloKills,
        turretPlatesTaken,
        earlyLaningPhaseGoldExpAdvantage,
        goldDeficit,
        // Todos los jugadores del match
        allPlayers,
      };
    });

    // Combinar todas las actividades
    const todasActividades = [
      ...actividadesNoticias,
      ...actividadesComentarios,
      ...actividadesHilos,
      ...actividadesRespuestas,
      ...actividadesPartidas,
    ];

    // Ordenar por fecha más reciente
    todasActividades.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Limitar al número solicitado
    const actividadesPaginadas = todasActividades.slice(0, limit);

    return NextResponse.json({
      items: actividadesPaginadas,
      page,
      limit,
      hasMore: todasActividades.length > limit,
    });

    // La lógica anterior era incorrecta:
    // hasMore: todasActividades.length === limit
    // Esto siempre devolvía true cuando había exactamente 'limit' actividades,
    // lo que causaba un bucle infinito de solicitudes
  } catch (error) {
    console.error("Error al obtener actividades:", error);
    return NextResponse.json(
      { error: "Error al obtener actividades" },
      { status: 500 }
    );
  }
}
