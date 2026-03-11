import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/games/delta-force/vote
 * Body: { weapon_name: string, game_mode: "operations" | "warfare", vote: 1 | -1 }
 *
 * - Si el usuario ya votó igual → elimina el voto (toggle off)
 * - Si el usuario ya votó distinto → cambia el voto
 * - Si no ha votado → crea el voto
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { weapon_name, game_mode, vote } = body;

    if (!weapon_name || !game_mode || (vote !== 1 && vote !== -1)) {
      return NextResponse.json(
        { error: "weapon_name, game_mode y vote (1 o -1) son requeridos" },
        { status: 400 }
      );
    }

    const validMode = game_mode === "warfare" ? "warfare" : "operations";
    const serviceSupabase = getServiceClient();

    // Check if user already voted this weapon in this mode
    const { data: existing } = await serviceSupabase
      .from("weapon_votes")
      .select("id, vote")
      .eq("user_id", user.id)
      .eq("weapon_name", weapon_name)
      .eq("game_mode", validMode)
      .single();

    if (existing) {
      if (existing.vote === vote) {
        // Same vote → toggle off (delete)
        await serviceSupabase
          .from("weapon_votes")
          .delete()
          .eq("id", existing.id);

        return NextResponse.json({ action: "removed", vote: null });
      } else {
        // Different vote → update
        const { data: updated } = await serviceSupabase
          .from("weapon_votes")
          .update({ vote })
          .eq("id", existing.id)
          .select("vote")
          .single();

        return NextResponse.json({ action: "changed", vote: updated?.vote });
      }
    } else {
      // No vote yet → insert
      const { data: inserted } = await serviceSupabase
        .from("weapon_votes")
        .insert({ user_id: user.id, weapon_name, game_mode: validMode, vote })
        .select("vote")
        .single();

      return NextResponse.json({ action: "added", vote: inserted?.vote });
    }
  } catch (err) {
    console.error("[delta-force/vote] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * GET /api/games/delta-force/vote?mode=operations
 * Returns the current user's votes for all weapons in the given mode.
 * Used to hydrate the UI on load.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ votes: {} });
    }

    const mode = request.nextUrl.searchParams.get("mode") || "operations";
    const validMode = mode === "warfare" ? "warfare" : "operations";

    const serviceSupabase = getServiceClient();
    const { data } = await serviceSupabase
      .from("weapon_votes")
      .select("weapon_name, vote")
      .eq("user_id", user.id)
      .eq("game_mode", validMode);

    // Return as a map: { weapon_name: vote }
    const votes: Record<string, number> = {};
    (data || []).forEach((row) => {
      votes[row.weapon_name] = row.vote;
    });

    return NextResponse.json({ votes });
  } catch (err) {
    console.error("[delta-force/vote GET] Error:", err);
    return NextResponse.json({ votes: {} });
  }
}
