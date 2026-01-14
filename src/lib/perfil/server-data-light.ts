/**
 * Funciones SSR LIGERAS para la página de perfil
 *
 * Estas funciones están optimizadas para minimizar el TTFB:
 * - Menos queries (2 en lugar de 9)
 * - Solo campos esenciales
 * - Sin datos de historial (se cargan en cliente)
 */

import { createClient } from "@/lib/supabase/server";
import type { ProfileData } from "@/hooks/use-perfil-usuario";
import type { LinkedAccountRiot } from "@/types/riot";

/**
 * Tipo reducido de perfil para SSR ligero
 */
export interface ProfileLight {
  id: string;
  username: string;
  public_id: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  color: string | null;
  role: "user" | "admin" | "moderator";
  followers_count: number;
  following_count: number;
  friends_count: number;
}

/**
 * Tipo reducido de cuenta Riot para SSR ligero
 */
export interface RiotAccountLight {
  puuid: string;
  game_name: string | null;
  tag_line: string | null;
  solo_tier: string | null;
  solo_division: string | null;
  solo_lp: number | null;
  flex_tier: string | null;
  flex_division: string | null;
  profile_icon_id: number | null;
  region: string | null;
}

/**
 * Obtiene datos MÍNIMOS del perfil para SSR
 * Solo 2 queries en lugar de 9
 *
 * Tiempo estimado: 100-300ms (vs 1-3s del método completo)
 */
export async function getProfileInitialDataLight(username: string): Promise<{
  profile: ProfileLight | null;
  riotAccount: RiotAccountLight | null;
}> {
  try {
    const supabase = await createClient();

    // Query 1: Solo campos esenciales del perfil
    let { data: profile, error: profileError } = await supabase
      .from("perfiles")
      .select(
        `
        id,
        username,
        public_id,
        avatar_url,
        banner_url,
        bio,
        color,
        role,
        followers_count,
        following_count,
        friends_count
      `
      )
      .eq("public_id", username)
      .single();

    // Si no encuentra por public_id, buscar por username
    if (profileError || !profile) {
      const { data: profileByUsername } = await supabase
        .from("perfiles")
        .select(
          `
          id,
          username,
          public_id,
          avatar_url,
          banner_url,
          bio,
          color,
          role,
          followers_count,
          following_count,
          friends_count
        `
        )
        .eq("username", username)
        .single();

      profile = profileByUsername;
    }

    if (!profile) {
      return { profile: null, riotAccount: null };
    }

    // Query 2: Solo datos básicos de Riot
    const { data: riotAccount } = await supabase
      .from("linked_accounts_riot")
      .select(
        `
        puuid,
        game_name,
        tag_line,
        solo_tier,
        solo_division,
        solo_lp,
        flex_tier,
        flex_division,
        profile_icon_id,
        region
      `
      )
      .eq("user_id", profile.id)
      .single();

    return {
      profile: profile as ProfileLight,
      riotAccount: riotAccount as RiotAccountLight | null,
    };
  } catch (error) {
    console.error("[getProfileInitialDataLight] Error:", error);
    return { profile: null, riotAccount: null };
  }
}

/**
 * Obtiene solo el perfil sin cuenta Riot
 * Para metadata de SEO
 */
export async function getProfileForMetadata(
  username: string
): Promise<{
  username: string;
  bio: string | null;
  avatar_url: string | null;
} | null> {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("perfiles")
      .select("username, bio, avatar_url")
      .or(`public_id.eq.${username},username.eq.${username}`)
      .single();

    return data;
  } catch (error) {
    console.error("[getProfileForMetadata] Error:", error);
    return null;
  }
}
