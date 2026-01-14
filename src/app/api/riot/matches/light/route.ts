/**
 * API Route optimizada para historial de partidas LIGERO
 * GET /api/riot/matches/light
 *
 * Diferencias con /api/riot/matches:
 * - NO envía full_json (reduce payload ~90%)
 * - Solo campos necesarios para render visual
 * - Cache headers optimizados
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const QUEUE_FILTERS: Record<string, number[]> = {
  normals: [400, 430],
  soloq: [420],
  flex: [440],
  aram: [450],
  urf: [900],
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId es requerido" },
        { status: 400 }
      );
    }

    // Obtener PUUID del usuario
    const { data: riotAccount, error: accountError } = await supabase
      .from("linked_accounts_riot")
      .select("puuid")
      .eq("user_id", userId)
      .single();

    if (accountError || !riotAccount?.puuid) {
      return NextResponse.json(
        { error: "No hay cuenta Riot vinculada" },
        { status: 404 }
      );
    }

    // Parsear parámetros
    const limitParam = searchParams.get("limit");
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;
    const limit = Math.min(Math.max(1, parsedLimit), MAX_LIMIT);

    const cursorParam = searchParams.get("cursor");
    const cursor = cursorParam ? parseInt(cursorParam, 10) : 0;

    const queueParam = searchParams.get("queue")?.toLowerCase();
    const queueIds = queueParam ? QUEUE_FILTERS[queueParam] : undefined;

    // Query LIGERA - Sin full_json
    let query = supabase
      .from("match_participants")
      .select(
        `
        match_id,
        champion_name,
        champion_id,
        win,
        kills,
        deaths,
        assists,
        kda,
        total_damage_dealt,
        gold_earned,
        vision_score,
        item0,
        item1,
        item2,
        item3,
        item4,
        item5,
        item6,
        summoner1_id,
        summoner2_id,
        perk_primary_style,
        perk_sub_style,
        ranking_position,
        lane,
        puuid,
        summoner_name,
        matches!inner(
          match_id,
          game_creation,
          game_duration,
          game_mode,
          queue_id,
          ingest_status
        )
      `
      )
      .eq("puuid", riotAccount.puuid)
      .order("game_creation", { foreignTable: "matches", ascending: false })
      .range(cursor, cursor + limit);

    // Filtrar por cola si se especifica
    if (queueIds && queueIds.length > 0) {
      query = query.in("matches.queue_id", queueIds);
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error("[matches/light] Error:", error);
      return NextResponse.json(
        { error: "Error al obtener partidas" },
        { status: 500 }
      );
    }

    // Transformar al formato esperado por el cliente
    const formattedMatches = (matches || []).map((m: any) => ({
      id: m.match_id,
      match_id: m.match_id,
      champion_name: m.champion_name,
      champion_id: m.champion_id,
      win: m.win,
      kills: m.kills,
      deaths: m.deaths,
      assists: m.assists,
      kda: m.kda,
      total_damage_dealt: m.total_damage_dealt,
      gold_earned: m.gold_earned,
      vision_score: m.vision_score,
      item0: m.item0,
      item1: m.item1,
      item2: m.item2,
      item3: m.item3,
      item4: m.item4,
      item5: m.item5,
      item6: m.item6,
      summoner1_id: m.summoner1_id,
      summoner2_id: m.summoner2_id,
      perk_primary_style: m.perk_primary_style,
      perk_sub_style: m.perk_sub_style,
      ranking_position: m.ranking_position,
      lane: m.lane,
      puuid: m.puuid,
      summoner_name: m.summoner_name,
      matches: m.matches,
      created_at: new Date(m.matches.game_creation).toISOString(),
    }));

    const hasMore = (matches?.length || 0) > limit;
    const nextCursor = hasMore ? cursor + limit : null;

    return NextResponse.json(
      {
        success: true,
        matches: formattedMatches.slice(0, limit),
        hasMore,
        nextCursor,
      },
      {
        headers: {
          // Cache en CDN por 1 minuto, stale-while-revalidate por 5 minutos
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.error("[matches/light] Error:", error.message);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
