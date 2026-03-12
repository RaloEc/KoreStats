import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: games, error } = await supabase
      .from("juegos")
      .select("id, nombre, slug, icono_url")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Resolve public URLs for icons
    const resolvedGames = games.map((game) => {
      if (game.icono_url && !game.icono_url.startsWith("http")) {
        const { data: publicUrl } = supabase.storage
          .from("iconos")
          .getPublicUrl(game.icono_url);
        game.icono_url = publicUrl.publicUrl;
      }
      return game;
    });

    return NextResponse.json(resolvedGames);
  } catch (error) {
    console.error("[api/games/list] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
