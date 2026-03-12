import { createClient } from "@/lib/supabase/server";
import { getChampionNameById } from "@/lib/riot/helpers";
import { NextResponse } from "next/server";

interface ShareMatchRequest {
  matchId: string;
  comment?: string;
}

interface ShareMatchResponse {
  success: boolean;
  message: string;
  entryId?: string;
}

export async function POST(
  request: Request
): Promise<NextResponse<ShareMatchResponse>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "No autorizado" },
        { status: 401 }
      );
    }

    const body: ShareMatchRequest = await request.json();
    const { matchId, comment } = body;

    if (!matchId) {
      return NextResponse.json(
        { success: false, message: "matchId es requerido" },
        { status: 400 }
      );
    }

    const { data: linkedAccount, error: linkedError } = await supabase
      .from("linked_accounts_riot")
      .select("puuid")
      .eq("user_id", user.id)
      .single();

    if (linkedError || !linkedAccount) {
      return NextResponse.json(
        { success: false, message: "No tienes una cuenta de Riot vinculada" },
        { status: 400 }
      );
    }

    const userPuuid = linkedAccount.puuid;

    const { data: matchParticipantData, error: participantError } =
      await supabase
        .from("match_participants")
        .select(
          `
        id, match_id, champion_id, role, kills, deaths, assists, 
        vision_score, gold_earned, win,
        matches(match_id, game_creation, game_duration, queue_id, data_version)
      `
        )
        .eq("match_id", matchId)
        .eq("puuid", userPuuid)
        .single();

    if (participantError || !matchParticipantData) {
      return NextResponse.json(
        { success: false, message: "Partida no encontrada o no tienes acceso" },
        { status: 404 }
      );
    }

    const matchParticipant = matchParticipantData as any;
    const matchInfo = Array.isArray(matchParticipant.matches)
      ? matchParticipant.matches[0]
      : matchParticipant.matches;

    const { data: championData } = await supabase
      .from("riot_champions")
      .select("name")
      .eq("champion_id", matchParticipant.champion_id)
      .single();

    let championName = championData?.name;
    if (!championName) {
      try {
        const fallbackName = await getChampionNameById(
          matchParticipant.champion_id
        );
        if (fallbackName) {
          championName = fallbackName;
        }
      } catch (error) {
        // Silently fail fallback
      }
    }

    championName = championName || "Campeón desconocido";

    const { data: allParticipants } =
      await supabase
        .from("match_participants")
        .select("kills, deaths, assists, total_damage_dealt, gold_earned")
        .eq("match_id", matchId);

    const teamStats = {
      totalKills:
        allParticipants?.reduce((sum, p) => sum + (p.kills || 0), 0) || 0,
      totalDamage:
        allParticipants?.reduce(
          (sum, p) => sum + (p.total_damage_dealt || 0),
          0
        ) || 0,
      totalGold:
        allParticipants?.reduce((sum, p) => sum + (p.gold_earned || 0), 0) || 0,
    };

    const kda =
      matchParticipant.deaths > 0
        ? (
            (matchParticipant.kills + matchParticipant.assists) /
            matchParticipant.deaths
          ).toFixed(2)
        : (matchParticipant.kills + matchParticipant.assists).toFixed(2);

    const damageShare =
      teamStats.totalDamage > 0
        ? (
            (matchParticipant.total_damage_dealt / teamStats.totalDamage) *
            100
          ).toFixed(1)
        : "0";

    const metadata = {
      puuid: userPuuid,
      matchId: matchParticipant.match_id,
      championId: matchParticipant.champion_id,
      championName,
      role: matchParticipant.role,
      kda: parseFloat(kda as string),
      kills: matchParticipant.kills,
      deaths: matchParticipant.deaths,
      assists: matchParticipant.assists,
      visionScore: matchParticipant.vision_score,
      damageDealt: matchParticipant.total_damage_dealt,
      damageShare: parseFloat(damageShare as string),
      goldEarned: matchParticipant.gold_earned,
      gameCreation: matchInfo?.game_creation,
      gameDuration: matchInfo?.game_duration,
      queueId: matchInfo?.queue_id,
      dataVersion: matchInfo?.data_version,
      win: matchParticipant.win || false,
      comment: comment || null,
    };

    const { data: entry, error: insertError } = await supabase
      .from("user_activity_entries")
      .insert({
        user_id: user.id,
        type: "lol_match",
        match_id: matchId,
        metadata,
        visibility: "public",
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { success: false, message: "Esta partida ya fue compartida" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, message: "Error al compartir la partida" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Partida compartida exitosamente",
      entryId: entry?.id,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
