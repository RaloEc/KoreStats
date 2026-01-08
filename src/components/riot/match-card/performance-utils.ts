import {
  calculatePerformanceScore,
  calculateDetailedPerformanceScore,
  PerformanceBreakdown,
} from "@/lib/riot/match-analyzer";

export interface PerformanceParticipant {
  teamId?: number;
  puuid?: string;
  riotIdGameName?: string;
  summonerName?: string;
  championName?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  totalDamageDealtToChampions?: number;
  visionScore?: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  teamPosition?: string | null;
  individualPosition?: string | null;
  role?: string | null;
  lane?: string | null;
  goldEarned?: number;
  objectivesStolen?: number;
  objectives_stolen?: number;
  win?: boolean;
}

interface TeamTotals {
  kills: number;
  damage: number;
  gold: number;
}

interface ParticipantAny extends PerformanceParticipant {
  [key: string]: any;
}

function buildTeamTotals(
  participants: PerformanceParticipant[]
): Record<number, TeamTotals> {
  return participants.reduce((acc, p) => {
    const participant = p as ParticipantAny;
    const teamId = participant.teamId ?? 0;
    if (!acc[teamId]) {
      acc[teamId] = { kills: 0, damage: 0, gold: 0 };
    }
    acc[teamId].kills += participant.kills ?? 0;
    acc[teamId].damage +=
      participant.totalDamageDealtToChampions ??
      participant.total_damage_dealt_to_champions ??
      0;
    acc[teamId].gold += participant.goldEarned ?? participant.gold_earned ?? 0;
    return acc;
  }, {} as Record<number, TeamTotals>);
}

function buildTeamWinMap(matchInfo?: any): Record<number, boolean> {
  const teams = matchInfo?.teams ?? [];
  return teams.reduce((acc: Record<number, boolean>, team: any) => {
    if (typeof team?.teamId === "number") {
      acc[team.teamId] = Boolean(team.win);
    }
    return acc;
  }, {});
}

export function getParticipantKey(
  participant?: PerformanceParticipant | null
): string {
  if (!participant) {
    return "unknown";
  }

  return (
    participant.puuid ||
    `${participant.teamId ?? 0}-${
      participant.riotIdGameName ??
      participant.summonerName ??
      participant.championName ??
      "player"
    }`
  );
}

function getParticipantRole(
  participant: PerformanceParticipant
): string | null {
  return (
    participant.teamPosition ??
    participant.role ??
    participant.individualPosition ??
    participant.lane ??
    null
  );
}

export interface ParticipantScoreEntry {
  participant: PerformanceParticipant;
  score: number;
  key: string;
  breakdown?: PerformanceBreakdown;
}

export function computeParticipantScores(
  participants: PerformanceParticipant[],
  gameDuration: number,
  matchInfo?: any
): ParticipantScoreEntry[] {
  const normalizedDuration = Math.max(0, gameDuration || 0);
  const teamTotals = buildTeamTotals(participants);
  const teamWinMap = buildTeamWinMap(matchInfo);

  return participants.map((p) => {
    const participant = p as ParticipantAny;
    const teamId = participant.teamId ?? 0;
    const totals = teamTotals[teamId] ?? { kills: 0, damage: 0, gold: 0 };

    const breakdown = calculateDetailedPerformanceScore({
      kills: participant.kills ?? 0,
      deaths: participant.deaths ?? 0,
      assists: participant.assists ?? 0,
      win: participant.win ?? teamWinMap[teamId] ?? false,
      gameDuration: normalizedDuration,
      goldEarned: participant.goldEarned ?? participant.gold_earned ?? 0,
      totalDamageDealtToChampions:
        participant.totalDamageDealtToChampions ??
        participant.total_damage_dealt_to_champions ??
        0,
      visionScore: participant.visionScore ?? participant.vision_score ?? 0,
      totalMinionsKilled:
        participant.totalMinionsKilled ?? participant.total_minions_killed ?? 0,
      neutralMinionsKilled:
        participant.neutralMinionsKilled ??
        participant.neutral_minions_killed ??
        0,
      role: getParticipantRole(participant),
      teamTotalKills: totals.kills,
      teamTotalDamage: totals.damage,
      teamTotalGold: totals.gold,
      objectivesStolen:
        participant.objectivesStolen ?? participant.objectives_stolen ?? 0,
    });

    return {
      participant,
      score: breakdown.total,
      key: getParticipantKey(participant),
      breakdown,
    };
  });
}
