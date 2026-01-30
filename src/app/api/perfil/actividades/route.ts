import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { calculatePerformanceScore } from "@/lib/riot/match-analyzer";

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
        { status: 400 },
      );
    }

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Crear cliente de Supabase
    const supabase = await createClient();

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
        `,
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
          id, titulo, contenido, created_at, slug,
          categoria:foro_categorias(nombre)
        `,
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
      maxLength: number = 150,
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
      slug?: string;
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
      },
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
      slug: hilo.slug,
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
            ranking_position, performance_score, win, lp_change,
            riot_id_game_name, riot_id_tagline,
            matches(match_id, game_creation, game_duration, queue_id, data_version, full_json)
          `,
          )
          .eq("puuid", userPuuid)
          .in("match_id", uniqueMatchIds);

      if (matchParticipantsError) {
        console.warn(
          "[Perfil Actividades API] Error obteniendo match_participants",
          matchParticipantsError,
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
          rankSnapshotsError,
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
          participantNamesError,
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

    // ═════════════════════════════════════════════════════════════════════════
    // NUEVO: Obtener datos de la tabla matches DIRECTAMENTE
    // Esto asegura que tengamos el full_json incluso si falla el join con participants
    // o si el usuario cambió de cuenta/puuid
    // ═════════════════════════════════════════════════════════════════════════
    const matchesMap = new Map<string, any>();
    if (uniqueMatchIds.length > 0) {
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(
          "match_id, game_creation, game_duration, queue_id, data_version, full_json",
        )
        .in("match_id", uniqueMatchIds);

      if (matchesError) {
        console.error(
          "[Perfil Actividades API] Error fetching matches table:",
          matchesError,
        );
      } else {
        matchesData?.forEach((m) => matchesMap.set(m.match_id, m));
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
      championName: string | number,
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

      // Intentar obtener el match directo si no vino por participante
      const directMatch = matchesMap.get(partida.match_id);

      // Determinar la fuente de datos (Prioridad: Participant -> Direct Match -> Metadata)
      // Si tenemos participant DB row, usamos eso. Si no, intentamos extraer del JSON del match.
      let participantFromJSON: any = null;
      const fullJson = matchInfo?.full_json || directMatch?.full_json || null;

      const normalizeChamp = (name: string | null | undefined) => {
        if (!name) return "";
        const n = name
          .toLowerCase()
          .trim()
          .replace(/['\s.]/g, "");
        if (n === "wukong") return "monkeyking";
        return n;
      };

      if (fullJson && fullJson.info && fullJson.info.participants) {
        const jsonParticipants = fullJson.info.participants as any[];
        // Intentar encontrar al usuario en el JSON
        // 1. Por PUUID actual
        if (userPuuid) {
          participantFromJSON = jsonParticipants.find(
            (p: any) => p.puuid === userPuuid,
          );
        }

        // 2. Fallback: Por Campeón (con normalización)
        if (!participantFromJSON && metadata.championName) {
          const target = normalizeChamp(metadata.championName);
          participantFromJSON = jsonParticipants.find(
            (p: any) => normalizeChamp(p.championName) === target,
          );
        }

        // 3. Fallback: Por K/D/A (si tenemos los 3 datos en metadata)
        if (
          !participantFromJSON &&
          typeof metadata.kills === "number" &&
          typeof metadata.deaths === "number" &&
          typeof metadata.assists === "number"
        ) {
          participantFromJSON = jsonParticipants.find(
            (p: any) =>
              p.kills === metadata.kills &&
              p.deaths === metadata.deaths &&
              p.assists === metadata.assists,
          );
        }
      }

      // Consolidar datos
      const usedParticipant = participant || participantFromJSON;

      const championNameRaw =
        usedParticipant?.championName ||
        usedParticipant?.champion_name ||
        metadata.championName ||
        "Campeón desconocido";

      // Normalizar nombre del campeón para visualización si es necesario
      const championName =
        championNameRaw === "MonkeyKing" ? "Wukong" : championNameRaw;
      const championId =
        usedParticipant?.championId ||
        usedParticipant?.champion_id ||
        metadata.championId ||
        0;
      const role =
        usedParticipant?.teamPosition ||
        usedParticipant?.role ||
        metadata.role ||
        "Desconocido";
      const lane =
        usedParticipant?.lane ||
        usedParticipant?.individualPosition ||
        metadata.lane ||
        role;

      const kills = usedParticipant?.kills ?? metadata.kills ?? 0;
      const deaths = usedParticipant?.deaths ?? metadata.deaths ?? 0;
      const assists = usedParticipant?.assists ?? metadata.assists ?? 0;

      const kdaValue = (() => {
        if (typeof usedParticipant?.kda === "number")
          return usedParticipant.kda;
        if (usedParticipant?.challenges?.kda)
          return usedParticipant.challenges.kda; // a veces viene en challenges
        if (typeof metadata.kda === "number") return metadata.kda;
        return deaths > 0 ? (kills + assists) / deaths : kills + assists;
      })();

      const totalCS =
        (usedParticipant?.totalMinionsKilled ??
          usedParticipant?.total_minions_killed ??
          0) +
        (usedParticipant?.neutralMinionsKilled ??
          usedParticipant?.neutral_minions_killed ??
          0);

      const gameDurationSeconds =
        matchInfo?.game_duration ??
        directMatch?.game_duration ??
        metadata.gameDuration ??
        0;

      const csPerMin = gameDurationSeconds
        ? Number((totalCS / Math.max(gameDurationSeconds / 60, 1)).toFixed(1))
        : 0;

      // Items: Priorizar JSON/Participant -> Metadata -> Vacío
      const items = usedParticipant
        ? [
            usedParticipant.item0 ?? 0,
            usedParticipant.item1 ?? 0,
            usedParticipant.item2 ?? 0,
            usedParticipant.item3 ?? 0,
            usedParticipant.item4 ?? 0,
            usedParticipant.item5 ?? 0,
            usedParticipant.item6 ?? 0,
          ]
        : Array.isArray(metadata.items)
          ? [...metadata.items, 0, 0, 0, 0, 0, 0, 0].slice(0, 7)
          : [0, 0, 0, 0, 0, 0, 0];

      const resultWin = usedParticipant?.win ?? Boolean(metadata.win);
      const queueId =
        matchInfo?.queue_id ?? directMatch?.queue_id ?? metadata.queueId ?? 0;
      const gameDuration = gameDurationSeconds;
      const gameCreation =
        matchInfo?.game_creation ??
        directMatch?.game_creation ??
        metadata.gameCreation ??
        0;
      const dataVersion =
        matchInfo?.data_version ??
        directMatch?.data_version ??
        metadata.dataVersion ??
        "";

      // Stats complejos y equipos
      let perks = usedParticipant?.perks || null;
      // Normalizar estructura de perks si viene de DB camelCase vs snake_case
      if (!perks && usedParticipant?.perk_primary_style) {
        // Construcción manual si viene de DB flat columns y no JSON
        // (Aunque si tenemos participant DB row, solemos priorizar full_json si existe)
      }

      let teamTotalDamage = 0;
      let teamTotalGold = 0;
      let teamTotalKills = 0;
      let objectivesStolen = 0;
      let allPlayers: any[] = [];

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
      let riotIdGameName = "";
      let riotIdTagline = "";
      let teamAvgDamageToChampions = 0;
      let teamAvgGoldEarned = 0;
      let teamAvgKillParticipation = 0;
      let teamAvgVisionScore = 0;
      let teamAvgCsPerMin = 0;
      let teamAvgDamageToTurrets = 0;
      let calculatedRankingPosition: number | null = null;
      let calculatedPerformanceScore: number | null = null;

      // Función helper para nombres
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

      // Si tenemos JSON completo (ya sea del join o directo), poblamos los datos RICH
      if (fullJson?.info?.participants) {
        const jsonParticipants = fullJson.info.participants as any[];

        // Identificamos al participante en el JSON (participantDetail es el objeto de Riot)
        let participantDetail = jsonParticipants.find((p: any) => {
          // 1. Por PUUID
          if (userPuuid && p.puuid === userPuuid) return true;
          if (participant?.puuid && p.puuid === participant.puuid) return true;

          // 2. Por Champion ID (muy fiable)
          if (championId && p.championId === championId) return true;

          // 3. Por Champion Name (normalizado)
          const targetChamp = normalizeChamp(championNameRaw);
          if (targetChamp && normalizeChamp(p.championName) === targetChamp)
            return true;

          // 4. Por K/D/A
          if (
            typeof kills === "number" &&
            typeof deaths === "number" &&
            typeof assists === "number" &&
            p.kills === kills &&
            p.deaths === deaths &&
            p.assists === assists
          )
            return true;

          return false;
        });

        // Si no lo encontramos pero tenemos usedParticipant, lo usamos como último recurso
        if (!participantDetail && usedParticipant) {
          participantDetail = usedParticipant;
        }

        // Si encontramos data detallada del usuario, poblamos stats avanzados
        if (participantDetail) {
          perks = participantDetail.perks ?? perks;
          pentaKills = participantDetail.pentaKills ?? 0;
          quadraKills = participantDetail.quadraKills ?? 0;
          tripleKills = participantDetail.tripleKills ?? 0;
          doubleKills = participantDetail.doubleKills ?? 0;
          firstBloodKill = participantDetail.firstBloodKill ?? false;
          totalTimeCCDealt = participantDetail.totalTimeCCDealt ?? 0;

          const challenges = participantDetail.challenges || {};
          soloKills = challenges.soloKills ?? 0;
          turretPlatesTaken = challenges.turretPlatesTaken ?? 0;
          earlyLaningPhaseGoldExpAdvantage =
            challenges.earlyLaningPhaseGoldExpAdvantage ?? 0;
          objectivesStolen =
            participantDetail.objectivesStolen ?? objectivesStolen;

          riotIdGameName =
            participantDetail.riotIdGameName ||
            participantDetail.riot_id_game_name ||
            "";
          riotIdTagline =
            participantDetail.riotIdTagline ||
            participantDetail.riot_id_tagline ||
            "";

          // Team Stats Calculation
          const playerTeamId =
            participantDetail.teamId ?? participantDetail.team_id;

          if (playerTeamId !== undefined) {
            const teamParticipants = jsonParticipants.filter(
              (p: any) => p.teamId === playerTeamId,
            );
            const enemyParticipants = jsonParticipants.filter(
              (p: any) => p.teamId !== playerTeamId,
            );

            teamTotalDamage = teamParticipants.reduce(
              (sum: number, p: any) =>
                sum + (p.totalDamageDealtToChampions || 0),
              0,
            );
            teamTotalGold = teamParticipants.reduce(
              (sum: number, p: any) => sum + (p.goldEarned || 0),
              0,
            );
            const enemyTotalGold = enemyParticipants.reduce(
              (sum: number, p: any) => sum + (p.goldEarned || 0),
              0,
            );

            if (resultWin && enemyTotalGold > teamTotalGold) {
              goldDeficit = enemyTotalGold - teamTotalGold;
            }

            teamTotalKills = teamParticipants.reduce(
              (sum: number, p: any) => sum + (p.kills || 0),
              0,
            );

            const teamCount = Math.max(teamParticipants.length, 1);
            teamAvgDamageToChampions = teamTotalDamage / teamCount;
            teamAvgGoldEarned = teamTotalGold / teamCount;
            teamAvgKillParticipation =
              teamTotalKills > 0
                ? teamParticipants.reduce((sum: number, p: any) => {
                    const kp =
                      (((p.kills || 0) + (p.assists || 0)) / teamTotalKills) *
                      100;
                    return sum + kp;
                  }, 0) / teamCount
                : 0;

            teamAvgVisionScore =
              teamParticipants.reduce(
                (sum: number, p: any) => sum + (p.visionScore || 0),
                0,
              ) / teamCount;

            const mins = Math.max(1, gameDurationSeconds / 60);
            teamAvgCsPerMin =
              teamParticipants.reduce((sum: number, p: any) => {
                const cs =
                  (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);
                return sum + cs / mins;
              }, 0) / teamCount;

            teamAvgDamageToTurrets =
              teamParticipants.reduce(
                (sum: number, p: any) => sum + (p.damageDealtToTurrets || 0),
                0,
              ) / teamCount;

            // Ranking and performance score calculation if missing in DB
            if (
              !participant?.ranking_position ||
              !participant?.performance_score
            ) {
              const enemyTotalKills = enemyParticipants.reduce(
                (sum: number, p: any) => sum + (p.kills || 0),
                0,
              );
              const enemyTotalDamage = enemyParticipants.reduce(
                (sum: number, p: any) =>
                  sum + (p.totalDamageDealtToChampions || 0),
                0,
              );

              const scoresMap = new Map<string, number>();
              for (const p of jsonParticipants) {
                const isAlly = p.teamId === playerTeamId;
                const tk = isAlly ? teamTotalKills : enemyTotalKills;
                const td = isAlly ? teamTotalDamage : enemyTotalDamage;
                const tg = isAlly
                  ? isAlly
                    ? teamTotalGold
                    : enemyTotalGold
                  : enemyTotalGold;

                const scoreValue = calculatePerformanceScore({
                  kills: p.kills,
                  deaths: p.deaths,
                  assists: p.assists,
                  win: p.win,
                  gameDuration: gameDurationSeconds,
                  goldEarned: p.goldEarned,
                  totalDamageDealtToChampions:
                    p.totalDamageDealtToChampions ?? 0,
                  visionScore: p.visionScore ?? 0,
                  totalMinionsKilled: p.totalMinionsKilled ?? 0,
                  neutralMinionsKilled: p.neutralMinionsKilled ?? 0,
                  role:
                    p.teamPosition || p.individualPosition || p.lane || p.role,
                  teamTotalKills: tk,
                  teamTotalDamage: td,
                  teamTotalGold: tg,
                  objectivesStolen: p.objectivesStolen ?? 0,
                });
                scoresMap.set(p.puuid, scoreValue);
              }

              const sorted = Array.from(scoresMap.entries()).sort(
                (a, b) => b[1] - a[1],
              );
              const rankingMap = new Map<string, number>();
              sorted.forEach(([puuid], index) =>
                rankingMap.set(puuid, index + 1),
              );

              calculatedRankingPosition =
                rankingMap.get(participantDetail.puuid) || null;
              calculatedPerformanceScore =
                scoresMap.get(participantDetail.puuid) || null;
            }
          }
        }

        // Poblar allPlayers siempre que tengamos participants
        allPlayers = jsonParticipants.map((p: any) => ({
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
          summoner1Id: p.summoner1Id,
          summoner2Id: p.summoner2Id,
          perkPrimaryStyle: p.perks?.styles?.[0]?.style,
          perkSubStyle: p.perks?.styles?.[1]?.style,
          keystoneId: p.perks?.styles?.[0]?.selections?.[0]?.perk,
          item0: p.item0,
          item1: p.item1,
          item2: p.item2,
          item3: p.item3,
          item4: p.item4,
          item5: p.item5,
          item6: p.item6,
          totalCS: (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0),
        }));
      }

      // Fallback: Si no tenemos JSON pero tenemos participant DB row, usamos sus columnas
      if (!allPlayers.length && participant) {
        // Aquí podríamos intentar construir un "Fake" allPlayers con solo el usuario,
        // pero es mejor dejarlo vacío para no mostrar UI rota.
        // Sin embargo, aseguramos que objectivesStolen tenga valor si venía de DB
        objectivesStolen = participant.objectives_stolen || objectivesStolen;
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
        riotIdGameName:
          riotIdGameName ||
          usedParticipant?.riot_id_game_name ||
          usedParticipant?.riotIdGameName ||
          usedParticipant?.summoner_name ||
          usedParticipant?.summonerName,
        riotIdTagline:
          riotIdTagline ||
          usedParticipant?.riot_id_tagline ||
          usedParticipant?.riotIdTagline,
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
        visionScore:
          usedParticipant?.visionScore ??
          usedParticipant?.vision_score ??
          metadata.visionScore ??
          0,
        damageToChampions:
          usedParticipant?.totalDamageDealtToChampions ??
          usedParticipant?.total_damage_dealt_to_champions ??
          metadata.damageDealt ??
          0,
        damageToTurrets:
          usedParticipant?.damageDealtToTurrets ??
          usedParticipant?.damage_dealt_to_turrets ??
          0,
        goldEarned:
          usedParticipant?.goldEarned ??
          usedParticipant?.gold_earned ??
          metadata.goldEarned ??
          0,
        items,
        summoner1Id:
          usedParticipant?.summoner1Id ?? usedParticipant?.summoner1_id ?? 0,
        summoner2Id:
          usedParticipant?.summoner2Id ?? usedParticipant?.summoner2_id ?? 0,
        perkPrimaryStyle:
          usedParticipant?.perkPrimaryStyle ??
          usedParticipant?.perk_primary_style ??
          usedParticipant?.perks?.styles?.[0]?.style ??
          0,
        perkSubStyle:
          usedParticipant?.perkSubStyle ??
          usedParticipant?.perk_sub_style ??
          usedParticipant?.perks?.styles?.[1]?.style ??
          0,
        perks,
        rankingPosition:
          calculatedRankingPosition ?? participant?.ranking_position ?? null,
        performanceScore:
          calculatedPerformanceScore ?? participant?.performance_score ?? null,
        queueId,
        gameDuration,
        gameCreation,
        dataVersion,
        tier: rankSnapshot?.tier ?? null,
        rank: rankSnapshot?.rank ?? null,
        leaguePoints: rankSnapshot?.league_points ?? 0,
        lp_change: participant?.lp_change ?? metadata.lp_change ?? null,
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
      { status: 500 },
    );
  }
}
