import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  const supabase = await createClient();
  const publicId = params.username;

  try {
    // Obtener usuario actual (si está autenticado)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    // 1. Obtener el perfil del usuario por public_id o username como fallback
    let { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select(
        "id, username, public_id, created_at, avatar_url, banner_url, bio, color, role, followers_count, following_count, friends_count, connected_accounts"
      )
      .eq("public_id", publicId)
      .single();

    // Si no encontramos por public_id, intentar por username
    if (perfilError || !perfil) {
      console.log(
        `[Perfil API] public_id "${publicId}" no encontrado, intentando por username...`
      );
      const { data: perfilPorUsername, error: errorUsername } = await supabase
        .from("perfiles")
        .select(
          "id, username, public_id, created_at, avatar_url, banner_url, bio, color, role, followers_count, following_count, friends_count, connected_accounts"
        )
        .eq("username", publicId)
        .single();

      if (errorUsername || !perfilPorUsername) {
        console.error(
          "Error fetching profile by public_id or username:",
          perfilError,
          errorUsername
        );
        return NextResponse.json(
          { error: "Perfil no encontrado" },
          { status: 404 }
        );
      }

      perfil = perfilPorUsername;
    }

    // Obtener puuid del usuario una sola vez para reutilizarlo en consultas de partidas
    const { data: linkedAccountRiot, error: linkedAccountError } =
      await supabase
        .from("linked_accounts_riot")
        .select("puuid")
        .eq("user_id", perfil.id)
        .single();

    if (linkedAccountError && linkedAccountError.code !== "PGRST116") {
      console.warn(
        "[Perfil API] No se pudo obtener la cuenta de Riot vinculada:",
        linkedAccountError.message
      );
    }

    const userPuuid = linkedAccountRiot?.puuid || null;

    // Obtener actividades ocultas por el usuario actual (si está autenticado)
    let hiddenActivities: Set<string> = new Set();
    if (currentUser) {
      const { data: hidden } = await supabase
        .from("activity_visibility")
        .select("activity_type, activity_id")
        .eq("user_id", currentUser.id);

      if (hidden) {
        hiddenActivities = new Set(
          hidden.map((h) => `${h.activity_type}:${h.activity_id}`)
        );
      }
    }

    // 2. Obtener estadísticas de actividad (solo contenido no eliminado)
    const { count: hilosCount, error: hilosCountError } = await supabase
      .from("foro_hilos")
      .select("*", { count: "exact", head: true })
      .eq("autor_id", perfil.id)
      .is("deleted_at", null);

    const { count: postsCount, error: postsCountError } = await supabase
      .from("foro_posts")
      .select("*", { count: "exact", head: true })
      .eq("autor_id", perfil.id)
      .is("deleted_at", null);

    if (hilosCountError || postsCountError) {
      console.error("Error fetching stats:", hilosCountError, postsCountError);
      // No es un error fatal, podemos continuar
    }

    // 3. Obtener últimos hilos creados
    const { data: ultimosHilos, error: hilosError } = await supabase
      .from("foro_hilos")
      .select(
        "id, slug, titulo, contenido, created_at, vistas, foro_categorias!inner(nombre), respuestas_conteo:foro_posts(count), weapon_stats_record:weapon_stats_records!weapon_stats_id(id)"
      )
      .eq("autor_id", perfil.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5);

    if (hilosError) {
      console.error("Error fetching threads:", hilosError);
    }

    // Transformar ultimosHilos para extraer categoria_titulo y contar respuestas
    let hilosTransformados: any[] = [];
    if (ultimosHilos) {
      hilosTransformados = (ultimosHilos as any[])
        .filter((hilo: any) => !hiddenActivities.has(`forum_thread:${hilo.id}`))
        .map((hilo: any) => {
          const respuestas = Array.isArray(hilo.respuestas_conteo)
            ? hilo.respuestas_conteo[0]?.count ?? 0
            : hilo.respuestas_conteo?.count ?? 0;

          const weaponStatsRelation = Array.isArray(hilo.weapon_stats_record)
            ? hilo.weapon_stats_record[0]
            : hilo.weapon_stats_record;

          return {
            id: hilo.id,
            slug: hilo.slug,
            titulo: hilo.titulo,
            contenido: hilo.contenido,
            created_at: hilo.created_at,
            vistas: hilo.vistas ?? 0,
            respuestas: respuestas,
            hasWeaponStats: Boolean(weaponStatsRelation?.id),
            categoria_titulo: Array.isArray(hilo.foro_categorias)
              ? hilo.foro_categorias[0]?.nombre ?? "Sin categoría"
              : hilo.foro_categorias?.nombre ?? "Sin categoría",
          };
        });
    }

    // 4. Obtener últimos posts (respuestas) - solo posts no eliminados de hilos no eliminados
    const { data: ultimosPosts, error: postsError } = await supabase
      .from("foro_posts")
      .select(
        "id, contenido, gif_url, created_at, hilo_id, foro_hilos!inner(titulo, deleted_at)"
      )
      .eq("autor_id", perfil.id)
      .is("deleted_at", null)
      .is("foro_hilos.deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5);

    const limpiarHTML = (html: string) => {
      if (!html) return "";
      return html.replace(/<[^>]*>/g, "").substring(0, 100) + "...";
    };

    let postsLimpios: any[] = [];
    if (postsError) {
      console.error("Error fetching posts:", postsError);
    } else if (ultimosPosts) {
      postsLimpios = ultimosPosts
        .filter((post: any) => !hiddenActivities.has(`forum_post:${post.id}`))
        .map((post) => {
          const hilo = Array.isArray(post.foro_hilos)
            ? post.foro_hilos[0]
            : post.foro_hilos;
          return {
            id: post.id,
            contenido: limpiarHTML(post.contenido),
            created_at: post.created_at,
            hilo_id: post.hilo_id,
            hilo_titulo: hilo?.titulo ?? "Hilo desconocido",
            gif_url: post.gif_url ?? null,
          };
        });
    }

    // 5. Obtener hilos con estadísticas de armas asociadas (únicamente los que tienen vínculo y no están borrados)
    const { data: weaponStatsRecords, error: weaponStatsError } = await supabase
      .from("weapon_stats_records")
      .select(
        `
        id,
        weapon_name,
        created_at,
        stats,
        foro_hilos!inner(
          id,
          slug,
          titulo,
          created_at,
          vistas,
          deleted_at,
          foro_categorias!inner(nombre)
        )
      `
      )
      .eq("user_id", perfil.id)
      .is("foro_hilos.deleted_at", null)
      .order("created_at", { ascending: false });

    if (weaponStatsError) {
      console.error("Error fetching weapon stats records:", weaponStatsError);
    }

    console.log("[Perfil API] Weapon stats raw data:", {
      user_id: perfil.id,
      records_count: weaponStatsRecords?.length ?? 0,
      records: weaponStatsRecords,
      error: weaponStatsError,
    });

    const weaponStatsTransformadasMap = new Map<string, any>();
    for (const record of weaponStatsRecords || []) {
      console.log("[Perfil API] Processing weapon stats record:", {
        id: record.id,
        weapon_name: record.weapon_name,
        foro_hilos: record.foro_hilos,
        stats_type: typeof record.stats,
        stats_value: record.stats,
      });

      const hiloRelacion = Array.isArray(record.foro_hilos)
        ? record.foro_hilos[0]
        : record.foro_hilos;

      if (!hiloRelacion) {
        console.warn(
          "[Perfil API] No hilo relation found for weapon stats record:",
          record.id
        );
        continue;
      }

      const categoriaRelacion = Array.isArray(hiloRelacion.foro_categorias)
        ? hiloRelacion.foro_categorias[0]
        : hiloRelacion.foro_categorias;

      let statsNormalizadas = record.stats;
      if (typeof statsNormalizadas === "string") {
        try {
          statsNormalizadas = JSON.parse(statsNormalizadas);
        } catch (error) {
          console.warn(
            "[Perfil API] No se pudieron parsear las stats de arma",
            error
          );
          statsNormalizadas = null;
        }
      }

      const clave = `${hiloRelacion.id}`;
      if (!weaponStatsTransformadasMap.has(clave)) {
        console.log("[Perfil API] Adding weapon stats to map:", {
          key: clave,
          weapon_name: record.weapon_name,
          hilo_titulo: hiloRelacion.titulo,
          stats_keys: statsNormalizadas ? Object.keys(statsNormalizadas) : [],
        });

        weaponStatsTransformadasMap.set(clave, {
          id: record.id,
          weapon_name: record.weapon_name,
          created_at: record.created_at,
          stats: statsNormalizadas,
          hilo: {
            id: hiloRelacion.id,
            slug: hiloRelacion.slug,
            titulo: hiloRelacion.titulo,
            created_at: hiloRelacion.created_at,
            vistas: hiloRelacion.vistas ?? 0,
            categoria_titulo: categoriaRelacion?.nombre ?? "Sin categoría",
          },
        });
      }
    }

    const weaponStatsTransformadas = Array.from(
      weaponStatsTransformadasMap.values()
    );
    console.log("[Perfil API] Final weapon stats transformed:", {
      total_count: weaponStatsTransformadas.length,
      records: weaponStatsTransformadas.map((r) => ({
        id: r.id,
        weapon_name: r.weapon_name,
        hilo_titulo: r.hilo.titulo,
      })),
    });

    // 6. Obtener últimas partidas compartidas (sin paginación, solo últimas 5)
    const { data: ultimasPartidas, error: partidasError } = await supabase
      .from("user_activity_entries")
      .select("id, match_id, metadata, created_at")
      .eq("user_id", perfil.id)
      .eq("type", "lol_match")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5);

    if (partidasError) {
      console.error("Error fetching shared matches:", partidasError);
    }

    const matchParticipantNamesByMatchId = new Map<
      string,
      Map<string, string>
    >();

    const ultimasPartidasMatchIds = (ultimasPartidas ?? [])
      .map((e: any) => e.match_id)
      .filter((id: unknown): id is string => typeof id === "string" && !!id);

    const uniqueUltimasPartidasMatchIds = Array.from(
      new Set(ultimasPartidasMatchIds)
    );

    if (uniqueUltimasPartidasMatchIds.length > 0) {
      const { data: participantNames, error: participantNamesError } =
        await supabase
          .from("match_participants")
          .select("match_id, puuid, summoner_name")
          .in("match_id", uniqueUltimasPartidasMatchIds);

      if (participantNamesError) {
        console.warn(
          "[Perfil API] Error obteniendo nombres de participantes",
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

    // Mapear partidas compartidas - traer datos completos desde match_participants si es necesario
    let partidasTransformadas: any[] = [];
    if (ultimasPartidas) {
      for (const entry of ultimasPartidas.filter(
        (e: any) => !hiddenActivities.has(`lol_match:${e.match_id}`)
      )) {
        const metadata = entry.metadata || {};

        let matchParticipant: any = null;
        let matchRecord: any = null;

        // Usar puuid del metadata como fallback si no hay cuenta Riot vinculada
        const effectivePuuid = userPuuid || metadata.puuid;

        console.log("[Perfil API] Procesando partida:", {
          entryId: entry.id,
          matchId: entry.match_id,
          userPuuid: userPuuid ? `${userPuuid.slice(0, 20)}...` : null,
          metadataPuuid: metadata.puuid
            ? `${String(metadata.puuid).slice(0, 20)}...`
            : null,
          effectivePuuid: effectivePuuid
            ? `${String(effectivePuuid).slice(0, 20)}...`
            : null,
        });

        if (effectivePuuid) {
          const { data, error: matchError } = await supabase
            .from("match_participants")
            .select(
              `
              id, puuid, champion_id, champion_name, role, lane, kills, deaths, assists, kda,
              total_minions_killed, neutral_minions_killed, vision_score,
              total_damage_dealt_to_champions, gold_earned, damage_dealt_to_turrets,
              item0, item1, item2, item3, item4, item5, item6,
              summoner1_id, summoner2_id, perk_primary_style, perk_sub_style,
              ranking_position, performance_score, win,
              matches(match_id, game_creation, game_duration, queue_id, data_version, full_json)
            `
            )
            .eq("match_id", entry.match_id)
            .eq("puuid", effectivePuuid)
            .single();

          if (matchError) {
            console.error("[Perfil API] Error obteniendo match_participant:", {
              matchId: entry.match_id,
              puuid: String(effectivePuuid).slice(0, 20) + "...",
              error: matchError.message,
              code: matchError.code,
            });
          } else {
            console.log("[Perfil API] match_participant encontrado:", {
              matchId: entry.match_id,
              hasData: !!data,
              items: data
                ? [
                    data.item0,
                    data.item1,
                    data.item2,
                    data.item3,
                    data.item4,
                    data.item5,
                    data.item6,
                  ]
                : null,
              performanceScore: data?.performance_score,
            });
          }

          matchParticipant = data;
          matchRecord = matchParticipant?.matches
            ? Array.isArray(matchParticipant.matches)
              ? matchParticipant.matches[0]
              : matchParticipant.matches
            : null;
        } else {
          console.warn(
            "[Perfil API] No hay puuid disponible (ni de linked_accounts_riot ni del metadata)"
          );
        }

        const matchInfo = matchRecord || null;

        // Calcular CS/min
        const gameDurationMinutes = (matchInfo?.game_duration || 0) / 60;
        const totalCS =
          (matchParticipant?.total_minions_killed || 0) +
          (matchParticipant?.neutral_minions_killed || 0);
        const csPerMin =
          gameDurationMinutes > 0
            ? (totalCS / gameDurationMinutes).toFixed(1)
            : "0";

        // Obtener ranking si existe
        let rankSnapshot: any = null;
        if (userPuuid) {
          const { data } = await supabase
            .from("match_participant_ranks")
            .select("tier, rank, league_points, wins, losses")
            .eq("match_id", entry.match_id)
            .eq("puuid", userPuuid)
            .single();
          rankSnapshot = data;
        }

        let perks = null;
        let teamTotalDamage = 0;
        let teamTotalGold = 0;
        let teamTotalKills = 0;
        let objectivesStolen = 0;
        let teamAvgDamageToChampions = 0;
        let teamAvgGoldEarned = 0;
        let teamAvgKillParticipation = 0;
        let teamAvgVisionScore = 0;
        let teamAvgCsPerMin = 0;
        let teamAvgDamageToTurrets = 0;
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

        const getDbParticipantNameFallback = (
          puuid: unknown
        ): string | null => {
          const puuidValue =
            typeof puuid === "string" && puuid.trim() ? puuid.trim() : null;
          if (!puuidValue) return null;
          const byPuuid = matchParticipantNamesByMatchId.get(entry.match_id);
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

        if (matchRecord?.full_json?.info?.participants) {
          const participants = matchRecord.full_json.info.participants;
          const participantDetail = participants.find(
            (participant: any) =>
              participant.puuid === (matchParticipant?.puuid || userPuuid)
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
          if (teamTotalGold < enemyTotalGold) {
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
                    (((p.kills || 0) + (p.assists || 0)) / teamTotalKills) *
                    100;
                  return sum + kp;
                }, 0) / teamCount
              : 0;

          teamAvgVisionScore =
            teamParticipants.reduce(
              (sum: number, p: any) => sum + (p.visionScore || 0),
              0
            ) / teamCount;
          // gameDurationMinutes ya está en minutos, no dividir entre 60 nuevamente
          const minutes = Math.max(1, gameDurationMinutes);
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
            matchParticipant?.objectives_stolen ||
            metadata.objectivesStolen ||
            0;

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

          // Todos los jugadores del match
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
          }));
        }

        partidasTransformadas.push({
          id: entry.id,
          matchId: entry.match_id,
          championId: matchParticipant?.champion_id || metadata.championId,
          championName:
            matchParticipant?.champion_name ||
            metadata.championName ||
            "Desconocido",
          role: matchParticipant?.role || metadata.role || "Unknown",
          lane: matchParticipant?.lane || "Unknown",
          kda: matchParticipant?.kda || metadata.kda || 0,
          kills: matchParticipant?.kills || metadata.kills || 0,
          deaths: matchParticipant?.deaths || metadata.deaths || 0,
          assists: matchParticipant?.assists || metadata.assists || 0,
          totalCS,
          csPerMin: parseFloat(csPerMin),
          visionScore:
            matchParticipant?.vision_score || metadata.visionScore || 0,
          damageToChampions:
            matchParticipant?.total_damage_dealt_to_champions || 0,
          damageToTurrets: matchParticipant?.damage_dealt_to_turrets || 0,
          goldEarned: matchParticipant?.gold_earned || metadata.goldEarned || 0,
          items: [
            matchParticipant?.item0 || 0,
            matchParticipant?.item1 || 0,
            matchParticipant?.item2 || 0,
            matchParticipant?.item3 || 0,
            matchParticipant?.item4 || 0,
            matchParticipant?.item5 || 0,
            matchParticipant?.item6 || 0,
          ],
          summoner1Id: matchParticipant?.summoner1_id || 0,
          summoner2Id: matchParticipant?.summoner2_id || 0,
          perkPrimaryStyle: matchParticipant?.perk_primary_style || 0,
          perkSubStyle: matchParticipant?.perk_sub_style || 0,
          perks,
          rankingPosition: matchParticipant?.ranking_position || null,
          performanceScore: matchParticipant?.performance_score || null,
          result: matchParticipant?.win ?? metadata.win ? "win" : "loss",
          queueId: matchInfo?.queue_id || metadata.queueId || 0,
          gameDuration: matchInfo?.game_duration || metadata.gameDuration || 0,
          gameCreation: matchInfo?.game_creation || metadata.gameCreation || 0,
          dataVersion: matchInfo?.data_version || metadata.dataVersion || "0",
          tier: rankSnapshot?.tier || null,
          rank: rankSnapshot?.rank || null,
          leaguePoints: rankSnapshot?.league_points || 0,
          rankWins: rankSnapshot?.wins || 0,
          rankLosses: rankSnapshot?.losses || 0,
          comment: metadata.comment || null,
          created_at: entry.created_at,
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
          allPlayers,
        });
      }
    }

    const publicProfile = {
      ...perfil,
      stats: {
        hilos: hilosCount ?? 0,
        posts: postsCount ?? 0,
      },
      ultimosHilos: hilosTransformados,
      ultimosPosts: postsLimpios,
      weaponStatsRecords: weaponStatsTransformadas,
      ultimasPartidas: partidasTransformadas,
    };

    return NextResponse.json(publicProfile);
  } catch (error) {
    console.error("Unexpected error fetching profile:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
