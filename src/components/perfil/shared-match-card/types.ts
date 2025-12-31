export interface SharedMatchData {
  entryId: string;
  matchId: string;
  skinId?: number; // Skin ID determinístico para splash art
  championId: number;
  championName: string;
  role: string;
  lane: string;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
  totalCS: number;
  csPerMin: number;
  visionScore: number;
  damageToChampions: number;
  damageToTurrets: number;
  goldEarned: number;
  items: number[];
  summoner1Id: number;
  summoner2Id: number;
  perkPrimaryStyle: number;
  perkSubStyle: number;
  rankingPosition: number | null;
  performanceScore: number | null;
  result: "win" | "loss";
  queueId: number;
  gameDuration: number;
  gameCreation: number;
  dataVersion: string;
  tier: string | null;
  rank: string | null;
  leaguePoints: number;
  rankWins: number;
  rankLosses: number;
  comment: string | null;
  created_at: string;
  perks?: RunePerks | null;
  // Datos de equipo para comparativas
  teamTotalDamage?: number;
  teamTotalGold?: number;
  teamTotalKills?: number;
  teamAvgDamageToChampions?: number;
  teamAvgGoldEarned?: number;
  teamAvgKillParticipation?: number;
  teamAvgVisionScore?: number;
  teamAvgCsPerMin?: number;
  teamAvgDamageToTurrets?: number;
  teamAvgKda?: number;
  objectivesStolen?: number;
  // Campos extra para nuevos badges
  pentaKills?: number;
  quadraKills?: number;
  tripleKills?: number;
  doubleKills?: number;
  firstBloodKill?: boolean;
  totalTimeCCDealt?: number;
  soloKills?: number;
  turretPlatesTaken?: number;
  earlyLaningPhaseGoldExpAdvantage?: number;
  goldDeficit?: number;
  // Datos de todos los jugadores del match
  allPlayers?: Array<{
    championName: string;
    championId: number;
    summonerName: string;
    kills: number;
    deaths: number;
    assists: number;
    kda: number;
    role: string;
    team: "blue" | "red";
  }>;
}

export interface SharedMatchCardProps {
  partida: SharedMatchData;
  userColor?: string;
  sharedBy?: {
    username: string | null;
    public_id?: string | null;
    avatar_url?: string | null;
    color?: string | null;
  };
  isOwnProfile?: boolean;
  isAdmin?: boolean;
  onDelete?: (entryId: string) => Promise<void>;
  deletingId?: string | null;
  onHide?: () => void;
  onUnhide?: () => void;
  isHidden?: boolean;
  userId?: string;
  priority?: boolean; // Para optimizar carga de las primeras tarjetas
}

export type RuneSelection = {
  perk?: number;
  var1?: number;
  var2?: number;
  var3?: number;
};

export type RuneStyle = {
  description?: string;
  style?: number;
  selections?: RuneSelection[];
};

export type RunePerks = {
  styles?: RuneStyle[];
  statPerks?: {
    offense?: number;
    flex?: number;
    defense?: number;
  };
};

export type PerkJsonEntry = {
  id: number;
  name: string;
  iconPath: string;
};
