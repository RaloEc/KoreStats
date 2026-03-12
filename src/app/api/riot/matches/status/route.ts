import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { isInGame, gameId } = body;

    if (typeof isInGame !== "boolean") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { error } = await supabase
      .from("linked_accounts_riot")
      .update({
        is_in_game: isInGame,
        last_known_game_id: gameId || null,
        last_active_check: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
