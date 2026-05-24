import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const puuid = searchParams.get("puuid");
    const matchId = searchParams.get("matchId");

    if (!userId && !puuid && !matchId) {
      return NextResponse.json({ error: "Missing userId, puuid, or matchId" }, { status: 400 });
    }

    const supabase = getServiceClient();
    
    let query = supabase
      .from("lol_allstar_clips")
      .select("*")
      .order("created_at", { ascending: false });

    if (matchId) {
      query = query.eq("match_id", matchId);
    } else if (puuid) {
      query = query.eq("riot_puuid", puuid);
    } else if (userId && userId !== "public") {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/riot/clips] Error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ clips: data || [] });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
