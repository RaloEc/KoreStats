import { SupabaseClient } from "@supabase/supabase-js";

export async function processMatchesForProfile(
  supabase: SupabaseClient,
  partidasData: any[],
  userPuuid: string | null | undefined,
  isOwner: boolean,
  hiddenActivities: Set<string>,
) {
  const filteredPartidas = partidasData.filter(
    (e: any) => isOwner || !hiddenActivities.has(`lol_match:${e.match_id}`),
  );

  const matchIds = filteredPartidas.map((partida: any) => partida.match_id);
  const uniqueMatchIds = Array.from(new Set(matchIds));

  const matchParticipantsMap = new Map<string, any>();
  const rankSnapshotsMap = new Map<string, any>();
  const matchParticipantNamesByMatchId = new Map<string, Map<string, string>>();

  if (uniqueMatchIds.length > 0) {
    // 1. Fetch Participant Names
    const { data: participantNames } = await supabase
      .from("match_participants")
      .select("match_id, puuid, summoner_name")
      .in("match_id", uniqueMatchIds);

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

    // 2. Fetch Match Details if we have userPuuid
    // Note: If userPuuid is missing, we rely on Metadata, but we can't query match_participants efficiently without puuid
    // unless we query by match_id ONLY, but that returns 10 rows per match.
    // The route.ts logic queried by (match_id, puuid).
    // Here we will try to query by match_id and filter in memory if puuid is missing? No, too expensive.
    // We will stick to the route.ts logic: if userPuuid exists, query.

    // HOWEVER, userPuuid might be different per match if fetched from metadata...
    // But bulk query requires a single `in` clause or complex logic.
    // route.ts iterates and queries individually!
    // "for (const entry of filteredPartidas) { ... await supabase ... }"
    // That's N+1 queries. But given limit=5, it's fine.
    // server-data.ts should probably do the same for consistency.
  }

  const partidasTransformadas: any[] = [];

  for (const entry of filteredPartidas) {
    const metadata = entry.metadata || {};
    let matchParticipant: any = null;
    let matchRecord: any = null;

    // Determine PUUID
    const effectivePuuid = userPuuid || metadata.puuid;

    if (effectivePuuid) {
      const { data } = await supabase
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
          `,
        )
        .eq("match_id", entry.match_id)
        .eq("puuid", effectivePuuid)
        .single();

      matchParticipant = data;
      matchRecord = matchParticipant?.matches
        ? Array.isArray(matchParticipant.matches)
          ? matchParticipant.matches[0]
          : matchParticipant.matches
        : null;
    }

    const matchInfo = matchRecord || null;

    // ... Calculations ...
    // Copying calculations from route.ts
    const gameDurationMinutes = (matchInfo?.game_duration || 0) / 60;
    const totalCS =
      (matchParticipant?.total_minions_killed || 0) +
      (matchParticipant?.neutral_minions_killed || 0);
    const csPerMin =
      gameDurationMinutes > 0
        ? (totalCS / gameDurationMinutes).toFixed(1)
        : "0";

    // Rank Snapshot
    let rankSnapshot: any = null;
    if (effectivePuuid) {
      const { data } = await supabase
        .from("match_participant_ranks")
        .select("tier, rank, league_points, wins, losses")
        .eq("match_id", entry.match_id)
        .eq("puuid", effectivePuuid)
        .single();
      rankSnapshot = data;
    }

    // Helper functions
    const getDbParticipantNameFallback = (puuid: unknown): string | null => {
      const puuidValue =
        typeof puuid === "string" && puuid.trim() ? puuid.trim() : null;
      if (!puuidValue) return null;
      const byPuuid = matchParticipantNamesByMatchId.get(entry.match_id);
      return byPuuid?.get(puuidValue) ?? null;
    };

    const getParticipantPosition = (p: unknown): string => {
      if (!p || typeof p !== "object") return "Unknown";
      const obj = p as Record<string, unknown>;
      const normalize = (val: unknown) => {
        if (typeof val !== "string") return null;
        const v = val.trim().toUpperCase();
        if (!v) return null;
        if (v === "TOP") return "TOP";
        if (["JUNGLE", "JG", "JUN"].includes(v)) return "JUNGLE";
        if (["MID", "MIDDLE"].includes(v)) return "MID";
        if (["BOT", "BOTTOM", "ADC", "CARRY", "DUO_CARRY"].includes(v))
          return "BOT";
        if (["SUP", "SUPP", "SUPPORT", "UTILITY", "DUO_SUPPORT"].includes(v))
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

    if (matchRecord?.full_json?.info?.participants) {
      const participants = matchRecord.full_json.info.participants;
      // Note: matchParticipant might be null if we fetched via metadata but match record exists? Unlikely if matchRecord comes from participant relations.
      // But if fetching logic changed...
      // We rely on effectivePuuid
      const participantDetail = participants.find(
        (participant: any) =>
          participant.puuid === (matchParticipant?.puuid || effectivePuuid),
      );
      perks = participantDetail?.perks ?? null;

      pentaKills = participantDetail?.pentaKills || 0;
      quadraKills = participantDetail?.quadraKills || 0;
      tripleKills = participantDetail?.tripleKills || 0;
      doubleKills = participantDetail?.doubleKills || 0;
      firstBloodKill = participantDetail?.firstBloodKill || false;
      totalTimeCCDealt = participantDetail?.totalTimeCCDealt || 0;

      const challenges = participantDetail?.challenges || {};
      soloKills = challenges.soloKills || 0;
      turretPlatesTaken = challenges.turretPlatesTaken || 0;
      earlyLaningPhaseGoldExpAdvantage =
        challenges.earlyLaningPhaseGoldExpAdvantage || 0;

      const playerTeamId = participantDetail?.teamId;
      const teamParticipants = participants.filter(
        (p: any) => p.teamId === playerTeamId,
      );
      const enemyParticipants = participants.filter(
        (p: any) => p.teamId !== playerTeamId,
      );

      teamTotalDamage = teamParticipants.reduce(
        (sum: number, p: any) => sum + (p.totalDamageDealtToChampions || 0),
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
      if ((participantDetail?.win ?? false) && teamTotalGold < enemyTotalGold) {
        goldDeficit = enemyTotalGold - teamTotalGold;
      }

      teamTotalKills = teamParticipants.reduce(
        (sum: number, p: any) => sum + (p.kills || 0),
        0,
      );

      const teamCount = teamParticipants.length || 5;
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
          0,
        ) / teamCount;
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
          0,
        ) / teamCount;

      objectivesStolen =
        matchParticipant?.objectives_stolen || metadata.objectivesStolen || 0;

      const getParticipantDisplayName = (p: unknown): string => {
        if (!p || typeof p !== "object") return "Jugador";
        const obj = p as Record<string, unknown>;
        const riotIdGameName =
          typeof obj.riotIdGameName === "string"
            ? obj.riotIdGameName.trim()
            : null;
        const riotIdTagline =
          typeof obj.riotIdTagline === "string"
            ? obj.riotIdTagline.trim()
            : null;
        const summonerName =
          typeof obj.summonerName === "string" ? obj.summonerName.trim() : null;

        if (riotIdGameName && riotIdTagline)
          return `${riotIdGameName}#${riotIdTagline}`;
        if (riotIdGameName) return riotIdGameName;
        return summonerName ?? "Jugador";
      };

      allPlayers = participants.map((p: any) => ({
        championName: p.championName || "Desconocido",
        championId: p.championId || 0,
        summonerName: (() => {
          const dn = getParticipantDisplayName(p);
          if (dn !== "Jugador") return dn;
          return getDbParticipantNameFallback(p.puuid) ?? "Jugador";
        })(),
        kills: p.kills || 0,
        deaths: p.deaths || 0,
        assists: p.assists || 0,
        kda:
          p.deaths > 0 ? (p.kills + p.assists) / p.deaths : p.kills + p.assists,
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
      visionScore: matchParticipant?.vision_score || metadata.visionScore || 0,
      damageToChampions: matchParticipant?.total_damage_dealt_to_champions || 0,
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
      result: (matchParticipant?.win ?? metadata.win) ? "win" : "loss",
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

  return partidasTransformadas;
}
