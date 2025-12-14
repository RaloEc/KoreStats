import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SaveBuildRequest = {
  matchId: string;
  targetPuuid?: string;
  participantId?: number;
  note?: string;
};

type SaveBuildResponse =
  | {
      success: true;
      buildId: string;
    }
  | {
      success: false;
      message: string;
    };

type ListBuildsResponse = {
  success: true;
  builds: SavedBuildRow[];
};

type SavedBuildRow = {
  id: string;
  user_id: string;
  match_id: string | null;
  source_puuid: string | null;
  source_summoner_name: string | null;
  champion_id: number;
  champion_name: string;
  role: string | null;
  queue_id: number | null;
  game_version: string | null;
  win: boolean | null;
  items: number[];
  perk_primary_style: number | null;
  perk_sub_style: number | null;
  keystone_perk_id: number | null;
  perks: unknown;
  summoner1_id: number | null;
  summoner2_id: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function toSafeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractKeystonePerkId(perks: unknown): number | null {
  if (!perks || typeof perks !== "object") return null;
  const perksObj = perks as Record<string, unknown>;
  const styles = perksObj.styles;
  if (!Array.isArray(styles)) return null;

  const primaryStyle =
    styles.find((style) => {
      if (!style || typeof style !== "object") return false;
      return (style as Record<string, unknown>).description === "primaryStyle";
    }) ?? styles[0];

  if (!primaryStyle || typeof primaryStyle !== "object") return null;
  const selections = (primaryStyle as Record<string, unknown>).selections;
  if (!Array.isArray(selections) || selections.length === 0) return null;

  const first = selections[0];
  if (!first || typeof first !== "object") return null;
  const perkId = toSafeNumber((first as Record<string, unknown>).perk);
  return perkId && perkId > 0 ? perkId : null;
}

function parseIntegerArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((n) => Number.isFinite(n));
}

export async function GET(
  request: NextRequest
): Promise<
  NextResponse<ListBuildsResponse | { success: false; message: string }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "No autorizado" },
        { status: 401 }
      );
    }

    const championIdRaw = request.nextUrl.searchParams.get("championId");
    const limitRaw = request.nextUrl.searchParams.get("limit");

    const championId = championIdRaw ? Number(championIdRaw) : null;
    const limit = limitRaw ? Math.min(100, Math.max(1, Number(limitRaw))) : 50;

    let query = supabase
      .from("lol_saved_builds")
      .select(
        "id, user_id, match_id, source_puuid, source_summoner_name, champion_id, champion_name, role, queue_id, game_version, win, items, perk_primary_style, perk_sub_style, keystone_perk_id, perks, summoner1_id, summoner2_id, note, created_at, updated_at"
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (typeof championId === "number" && Number.isFinite(championId)) {
      query = query.eq("champion_id", championId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/riot/builds] Error:", error);
      return NextResponse.json(
        { success: false, message: "Error al cargar tus builds" },
        { status: 500 }
      );
    }

    const builds: SavedBuildRow[] = (data ?? []).map((row) => {
      const raw = row as unknown as SavedBuildRow;
      return {
        ...raw,
        items: parseIntegerArray(raw.items),
      };
    });

    return NextResponse.json({ success: true, builds });
  } catch (error) {
    console.error("[GET /api/riot/builds] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
): Promise<NextResponse<SaveBuildResponse>> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "No autorizado" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as SaveBuildRequest;

    if (!body?.matchId) {
      return NextResponse.json(
        { success: false, message: "matchId es requerido" },
        { status: 400 }
      );
    }

    const matchId = body.matchId;

    const { data: matchRow, error: matchError } = await supabase
      .from("matches")
      .select("match_id, data_version, queue_id, full_json")
      .eq("match_id", matchId)
      .single();

    if (matchError || !matchRow) {
      console.error("[Save Build] Error fetching match:", matchError);
      return NextResponse.json(
        { success: false, message: "Partida no encontrada" },
        { status: 404 }
      );
    }

    const fullJson = (matchRow as { full_json: unknown }).full_json;
    const info =
      fullJson && typeof fullJson === "object"
        ? ((fullJson as Record<string, unknown>).info as unknown)
        : null;

    const participants =
      info && typeof info === "object"
        ? ((info as Record<string, unknown>).participants as unknown) ?? null
        : null;

    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No se encontraron participantes en el match",
        },
        { status: 500 }
      );
    }

    const target = participants.find((p) => {
      if (!p || typeof p !== "object") return false;
      const obj = p as Record<string, unknown>;
      if (typeof body.targetPuuid === "string" && body.targetPuuid) {
        return obj.puuid === body.targetPuuid;
      }
      if (typeof body.participantId === "number") {
        return obj.participantId === body.participantId;
      }
      return false;
    });

    if (!target || typeof target !== "object") {
      return NextResponse.json(
        {
          success: false,
          message:
            "No se pudo identificar al jugador objetivo (puuid/participantId)",
        },
        { status: 400 }
      );
    }

    const targetObj = target as Record<string, unknown>;
    const targetPuuid =
      typeof targetObj.puuid === "string" ? targetObj.puuid : null;

    if (!targetPuuid) {
      return NextResponse.json(
        { success: false, message: "El jugador objetivo no tiene puuid" },
        { status: 500 }
      );
    }

    const { data: participantRow, error: participantError } = await supabase
      .from("match_participants")
      .select(
        "match_id, puuid, summoner_name, champion_id, champion_name, role, win, item0, item1, item2, item3, item4, item5, item6, perk_primary_style, perk_sub_style, summoner1_id, summoner2_id"
      )
      .eq("match_id", matchId)
      .eq("puuid", targetPuuid)
      .single();

    if (participantError || !participantRow) {
      console.error(
        "[Save Build] Error fetching participant:",
        participantError
      );
      return NextResponse.json(
        { success: false, message: "No se encontró el participante en BD" },
        { status: 404 }
      );
    }

    const participant = participantRow as {
      match_id: string;
      puuid: string;
      summoner_name: string | null;
      champion_id: number | null;
      champion_name: string | null;
      role: string | null;
      win: boolean | null;
      item0: number | null;
      item1: number | null;
      item2: number | null;
      item3: number | null;
      item4: number | null;
      item5: number | null;
      item6: number | null;
      perk_primary_style: number | null;
      perk_sub_style: number | null;
      summoner1_id: number | null;
      summoner2_id: number | null;
    };

    if (!participant.champion_id || !participant.champion_name) {
      return NextResponse.json(
        { success: false, message: "El participante no tiene campeón" },
        { status: 500 }
      );
    }

    const items = [
      participant.item0 ?? 0,
      participant.item1 ?? 0,
      participant.item2 ?? 0,
      participant.item3 ?? 0,
      participant.item4 ?? 0,
      participant.item5 ?? 0,
      participant.item6 ?? 0,
    ];

    const perks = targetObj.perks ?? null;
    const keystonePerkId = extractKeystonePerkId(perks);

    const gameVersion =
      info && typeof info === "object"
        ? (info as Record<string, unknown>).gameVersion
        : null;

    const resolvedGameVersion =
      typeof gameVersion === "string" && gameVersion.trim()
        ? gameVersion
        : typeof (matchRow as { data_version?: unknown }).data_version ===
          "string"
        ? ((matchRow as { data_version: string }).data_version as string)
        : null;

    const { data: insertData, error: insertError } = await supabase
      .from("lol_saved_builds")
      .insert({
        user_id: session.user.id,
        match_id: matchId,
        source_puuid: targetPuuid,
        source_summoner_name: participant.summoner_name,
        champion_id: participant.champion_id,
        champion_name: participant.champion_name,
        role: participant.role,
        queue_id: (matchRow as { queue_id: number | null }).queue_id,
        game_version: resolvedGameVersion,
        win: participant.win,
        items,
        perk_primary_style: participant.perk_primary_style,
        perk_sub_style: participant.perk_sub_style,
        keystone_perk_id: keystonePerkId,
        perks,
        summoner1_id: participant.summoner1_id,
        summoner2_id: participant.summoner2_id,
        note: body.note ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            message: "Ya guardaste esta build de esta partida",
          },
          { status: 409 }
        );
      }

      console.error("[Save Build] Insert error:", insertError);
      return NextResponse.json(
        { success: false, message: "No se pudo guardar la build" },
        { status: 500 }
      );
    }

    const buildId = (insertData as { id: string }).id;

    return NextResponse.json({ success: true, buildId });
  } catch (error) {
    console.error("[POST /api/riot/builds] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
