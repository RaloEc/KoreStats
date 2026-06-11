import { Perfil } from './index';

export type JoinPolicy = 'open' | 'apply' | 'invite_only';
export type ClanRole = 'leader' | 'officer' | 'member';
export type ClanGame = 'league_of_legends' | 'delta_force';
export type ApplicationType = 'application' | 'invitation';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface ClanRequirements {
  min_rank?: string;
  min_kda?: number;
  difficulty?: 'easy' | 'normal' | 'hard';
  [key: string]: any;
}

export interface Clan {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  game: ClanGame;
  discord_url: string | null;
  join_policy: JoinPolicy;
  require_exclusive: boolean;
  requirements: ClanRequirements;
  logo_url: string | null;
  banner_url: string | null;
  owner_id: string;
  created_at: string;
  role_names?: {
    leader: string;
    officer: string;
    member: string;
  };
  
  // Relaciones opcionales (unidas en queries)
  owner?: Perfil;
  members_count?: number;
}

export interface ClanMember {
  id: string;
  clan_id: string;
  user_id: string;
  role: ClanRole;
  joined_at: string;
  
  // Relaciones opcionales
  perfil?: Perfil;
  clan?: Clan;
}

export interface ClanApplication {
  id: string;
  clan_id: string;
  user_id: string;
  type: ApplicationType;
  status: ApplicationStatus;
  message: string | null;
  created_at: string;
  
  // Relaciones opcionales
  perfil?: Perfil;
  clan?: Clan;
}
