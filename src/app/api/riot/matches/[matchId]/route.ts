import { NextRequest, NextResponse } from "next/server";
import { getMatchById } from "@/lib/riot/matches";

export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required" },
        { status: 400 }
      );
    }

    const data = await getMatchById(matchId);

    if (!data) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Las partidas terminadas son inmutables, cachear agresivamente
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[GET /api/riot/matches/[matchId]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch match data" },
      { status: 500 }
    );
  }
}
