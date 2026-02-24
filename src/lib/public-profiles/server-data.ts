import { getServiceClient } from "@/lib/supabase/server";
import { PublicProfile } from "@/types/public-profile";

export interface PublicProfileFull extends PublicProfile {
  summoner: {
    summoner_name: string;
    game_name?: string;
    tag_line?: string;
    summoner_level: number;
    profile_icon_id: number;
    tier: string | null;
    rank: string | null;
    league_points: number;
    wins: number;
    losses: number;
    updated_at: string;
  } | null;
  most_played_champion?: string | null;
}

export async function getPublicProfileBySlug(
  slug: string,
): Promise<PublicProfileFull | null> {
  const supabase = getServiceClient();

  // Intentar búsqueda exacta primero
  const sanitizedSlug = slug.toLowerCase().trim().replace(/\s+/g, "-");

  const { data, error } = await supabase
    .from("public_profiles")
    .select(
      `
      *,
      summoner:summoners (
        summoner_name,
        game_name,
        tag_line,
        summoner_level,
        profile_icon_id,
        tier,
        rank,
        league_points,
        wins,
        losses,
        updated_at
      )
    `,
    )
    .or(`slug.eq.${slug},slug.eq.${sanitizedSlug}`)
    .maybeSingle();

  if (error) {
    console.error(
      `[getPublicProfileBySlug] Error fetching slug "${slug}":`,
      error,
    );
    return null;
  }

  if (!data) {
    console.warn(`[getPublicProfileBySlug] No data found for slug "${slug}"`);
    return null;
  }

  const profile = data as unknown as PublicProfileFull;

  // Obtener el campeón más jugado en las últimas 50 partidas
  try {
    const { data: champData, error: champError } = await supabase
      .from("match_participants")
      .select("champion_name")
      .eq("puuid", profile.puuid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!champError && champData && champData.length > 0) {
      // Contar frecuencias
      const counts: Record<string, number> = {};
      champData.forEach((row) => {
        counts[row.champion_name] = (counts[row.champion_name] || 0) + 1;
      });

      // Encontrar el máximo
      let maxVal = 0;
      let mostPlayed = null;
      for (const [name, count] of Object.entries(counts)) {
        if (count > maxVal) {
          maxVal = count;
          mostPlayed = name;
        }
      }
      profile.most_played_champion = mostPlayed;
    }
  } catch (e) {
    console.error(
      "[getPublicProfileBySlug] Error calculating most played champ:",
      e,
    );
  }

  return profile;
}
