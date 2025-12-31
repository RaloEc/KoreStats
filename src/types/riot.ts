/**
 * Tipos TypeScript para integración con Riot Games API
 */

/**
 * Información de una cuenta de Riot vinculada a un usuario
 */
export interface LinkedAccountRiot {
  id: string;
  user_id: string;
  puuid: string;
  game_name: string;
  tag_line: string;
  region: string;
  access_token: string | null;
  refresh_token: string | null;
  profile_icon_id: number | null;
  summoner_level: number | null;
  active_shard: string | null;
  summoner_id: string | null;
  tier: string | null;
  rank: string | null;
  league_points: number | null;
  wins: number | null;
  losses: number | null;
  solo_tier?: string | null;
  solo_rank?: string | null;
  solo_league_points?: number | null;
  solo_wins?: number | null;
  solo_losses?: number | null;
  flex_tier?: string | null;
  flex_rank?: string | null;
  flex_league_points?: number | null;
  flex_wins?: number | null;
  flex_losses?: number | null;
  created_at: string;
  updated_at: string;
  last_updated: string | null;
}

/**
 * Información de una partida
 */
export interface Match {
  match_id: string;
  data_version: string;
  game_creation: number;
  game_duration: number;
  game_mode: string;
  queue_id: number;
  full_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Rendimiento de un jugador en una partida
 */
export interface MatchParticipant {
  id: string;
  match_id: string;
  puuid: string;
  summoner_name: string;
  champion_id: number;
  champion_name: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  total_damage_dealt: number;
  gold_earned: number;
  vision_score: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  perk_primary_style: number;
  perk_sub_style: number;
  lane: string;
  role: string;
  created_at: string;
}

/**
 * Estadísticas agregadas de un jugador
 */
export interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  winrate: number;
  avgKda: number;
  avgDamage: number;
  avgGold: number;
}

/**
 * Respuesta de OAuth token de Riot
 */
export interface RiotTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Información del jugador de Riot
 */
export interface RiotPlayerInfo {
  puuid: string;
  game_name: string;
  tag_line: string;
}

/**
 * Respuesta de la API de Riot para obtener información de la cuenta
 */
export interface RiotAccountResponse {
  puuid: string;
  game_name: string;
  tag_line: string;
}

/**
 * Información del invocador de League of Legends
 */
export interface RiotSummonerInfo {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

/**
 * Información de rango del invocador
 */
export interface RiotRankInfo {
  summonerId: string;
  queueType: "RANKED_SOLO_5x5" | "RANKED_FLEX_SR" | "RANKED_FLEX_TT";
  tier:
    | "IRON"
    | "BRONZE"
    | "SILVER"
    | "GOLD"
    | "PLATINUM"
    | "DIAMOND"
    | "MASTER"
    | "GRANDMASTER"
    | "CHALLENGER";
  rank: "I" | "II" | "III" | "IV";
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

/**
 * Respuesta de error de Riot API
 */
export interface RiotErrorResponse {
  status: {
    status_code: number;
    message: string;
  };
}

/**
 * Regiones disponibles en Riot Games
 */
export type RiotRegion =
  | "la1" // Latinoamérica
  | "la2" // Latinoamérica 2
  | "br1" // Brasil
  | "na1" // Norteamérica
  | "euw1" // Europa Occidental
  | "eun1" // Europa Nórdica
  | "kr" // Corea
  | "ru" // Rusia
  | "tr1" // Turquía
  | "jp1" // Japón
  | "vn2" // Vietnam
  | "ph2" // Filipinas
  | "sg2" // Singapur
  | "th2"; // Tailandia

/**
 * Mapeo de regiones de plataforma a regiones de enrutamiento
 */
export const PLATFORM_TO_ROUTING_REGION: Record<RiotRegion, string> = {
  la1: "americas",
  la2: "americas",
  br1: "americas",
  na1: "americas",
  euw1: "europe",
  eun1: "europe",
  kr: "asia",
  ru: "europe",
  tr1: "europe",
  jp1: "asia",
  vn2: "sea",
  ph2: "sea",
  sg2: "sea",
  th2: "sea",
};

/**
 * Información de una skin de campeón
 */
export interface ChampionSkin {
  id: string;
  num: number;
  name: string;
  chromas: boolean;
}

/**
 * Información completa de un campeón (Data Dragon championFull.json)
 */
export interface ChampionFullData {
  id: string; // "Aatrox"
  key: string; // "266"
  name: string;
  title: string;
  image: {
    full: string;
    sprite: string;
    group: string;
    x: number;
    y: number;
    w: number;
    h: number;
  };
  skins: ChampionSkin[];
  lore: string;
  blurb: string;
  allytips: string[];
  enemytips: string[];
  tags: string[];
  partype: string;
  info: {
    attack: number;
    defense: number;
    magic: number;
    difficulty: number;
  };
  stats: Record<string, number>;
  spells: any[]; // Se puede detallar más si es necesario
  passive: {
    name: string;
    description: string;
    image: {
      full: string;
      sprite: string;
      group: string;
      x: number;
      y: number;
      w: number;
      h: number;
    };
  };
  recommended: any[];
}

/**
 * Estructura de la tabla lol_champions en DB
 */
export interface ChampionDB {
  id: string; // "Aatrox"
  key: number; // 266
  name: string;
  title: string | null;
  skins: ChampionSkin[];
  full_data: ChampionFullData;
  version: string | null;
  updated_at: string;
}
