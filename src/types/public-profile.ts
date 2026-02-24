export interface PublicProfile {
  id: string;
  puuid: string;
  slug: string;
  display_name: string;
  category: "pro_player" | "streamer" | "high_elo";
  region: string;
  main_role: "TOP" | "JUNGLE" | "MID" | "BOTTOM" | "SUPPORT" | null;
  team_name: string | null;
  avatar_url: string | null;
  social_links: SocialLinks;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface SocialLinks {
  twitter?: string;
  twitch?: string;
  youtube?: string;
  instagram?: string;
  tiktok?: string;
  discord?: string;
  website?: string;
  [key: string]: string | undefined;
}

// Tipo para insertar un nuevo perfil (omitimos campos autogenerados)
export interface PublicProfileInsert {
  puuid: string;
  slug: string;
  display_name: string;
  category: "pro_player" | "streamer" | "high_elo";
  region?: string;
  main_role?: "TOP" | "JUNGLE" | "MID" | "BOTTOM" | "SUPPORT" | null;
  team_name?: string | null;
  avatar_url?: string | null;
  social_links?: SocialLinks;
  is_active?: boolean;
  is_featured?: boolean;
  created_by?: string | null;
}

// Tipo para actualizar (todos opcionales)
export type PublicProfileUpdate = Partial<PublicProfileInsert>;
