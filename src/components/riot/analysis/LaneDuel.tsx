"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Swords,
  TrendingUp,
  Skull,
  Crosshair,
  Anchor,
  ShieldAlert,
  Lightbulb,
  ShoppingBag,
  ArrowRightLeft,
  Users,
  Zap,
  Eye,
  Target,
  Trophy,
} from "lucide-react";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getChampionImg, getItemImg } from "@/lib/riot/helpers";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";

interface LaneDuelProps {
  match: any;
  timeline: any;
  focusParticipantId: number;
  opponentParticipantId?: number;
  onFocusChange?: (id: number) => void;
  onOpponentChange?: (id: number) => void;
}

const ADVANTAGE_THRESHOLD = 0.03;
const MS_IN_MINUTE = 60 * 1000;
const MAJOR_ITEM_IDS = new Set([
  6631, 6632, 6630, 6671, 6672, 6673, 3031, 3153, 3508, 6691, 6692, 6693, 6694,
  3078, 3068, 3748, 3074, 3075, 3026, 3089, 3165, 3157, 3115, 3135, 3065, 3083,
]);

const MAJOR_ITEM_NAMES: Record<number, string> = {
  6631: "Cortasendas",
  6632: "Cercenador Divino",
  6630: "Chupasangre",
  6671: "Viento Huracanado",
  6672: "Matakrakens",
  6673: "Arcoescudo Inmortal",
  3031: "Filo del Infinito",
  3153: "Rey Arruinado",
  3508: "Segador de Esencia",
  6691: "Draktharr",
  6692: "Eclipse",
  6693: "Garra del Merodeador",
  6694: "Rencor de Serylda",
  3078: "Trinidad",
  3068: "Égida de Fuego Solar",
  3748: "Hidra Titánica",
  3074: "Hidra Voraz",
  3075: "Cota de Espinas",
  3026: "Ángel Guardián",
  3089: "Sombrero Mortal de Rabadon",
  3165: "Morellonomicon",
  3157: "Reloj de Arena de Zhonya",
  3115: "Diente de Nashor",
  3135: "Bastón del Vacío",
  3065: "Rostro Espiritual",
  3083: "Warmog",
};

const DRAGON_NAMES: Record<string, string> = {
  AIR_DRAGON: "Dragón de las Nubes",
  EARTH_DRAGON: "Dragón de Montaña",
  FIRE_DRAGON: "Dragón Infernal",
  WATER_DRAGON: "Dragón del Océano",
  HEXTECH_DRAGON: "Dragón Hextech",
  CHEMTECH_DRAGON: "Dragón Tecnoquímico",
  ELDER_DRAGON: "Dragón Ancestral",
};

const DRAGON_ICONS: Record<string, string> = {
  AIR_DRAGON:
    "https://raw.communitydragon.org/latest/game/assets/characters/sru_dragon_air/hud/dragon_air_square.png",
  EARTH_DRAGON:
    "https://raw.communitydragon.org/latest/game/assets/characters/sru_dragon_earth/hud/dragon_square_earth.png",
  FIRE_DRAGON:
    "https://raw.communitydragon.org/latest/game/assets/characters/sru_dragon_fire/hud/dragon_square_fire.png",
  WATER_DRAGON:
    "https://raw.communitydragon.org/latest/game/assets/characters/sru_dragon_water/hud/dragon_square_water.png",
  HEXTECH_DRAGON:
    "https://raw.communitydragon.org/latest/game/assets/characters/sru_dragon_hextech/hud/icons2d/dragon_square_hextech.png",
  CHEMTECH_DRAGON:
    "https://raw.communitydragon.org/latest/game/assets/characters/sru_dragon_chemtech/hud/icons2d/dragon_square_chemtech.png",
  ELDER_DRAGON:
    "https://raw.communitydragon.org/latest/game/assets/characters/sru_dragon_elder/hud/dragon_square_elder.png",
  BARON_NASHOR:
    "https://raw.communitydragon.org/latest/game/assets/characters/sru_baron/hud/baron_square.png",
  RIFTHERALD:
    "https://raw.communitydragon.org/latest/game/assets/characters/sru_riftherald/hud/sruriftherald_square.png",
  VOIDGRUB:
    "https://raw.communitydragon.org/latest/game/assets/characters/sru_horde/hud/sru_voidgrub_square.png",
  ATAKHAN:
    "https://raw.communitydragon.org/latest/game/assets/characters/sru_dragon/hud/dragon_square.png", // Fallback common dragon icon for Atakhan or others
};

type Participant = {
  participantId: number;
  teamId: number;
  championName: string;
  summonerName?: string;
  riotIdGameName?: string;
  teamPosition?: string | null;
  individualPosition?: string | null;
  role?: string | null;
  lane?: string | null;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  visionScore: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  damageDealtToObjectives: number;
  damageDealtToTurrets: number;
};

type ParticipantFrame = {
  totalGold?: number;
  xp?: number;
  minionsKilled?: number;
  jungleMinionsKilled?: number;
  level?: number;
};

interface TimelineEvent {
  type: string;
  timestamp: number;
  killerId?: number;
  victimId?: number;
  assistingParticipantIds?: number[];
  monsterType?: string;
  monsterSubType?: string;
  buildingType?: string;
  laneType?: string;
  towerType?: string;
  teamId?: number;
  killerTeamId?: number;
  participantId?: number;
  itemId?: number;
  bounty?: number;
  shutdown?: number;
  goldGranted?: number;
}

interface TimelineFrame {
  timestamp: number;
  participantFrames: Record<string, ParticipantFrame>;
  events?: TimelineEvent[];
}

type LaneEventType = "kill" | "death" | "roam" | "recall";
type LaneEventImpact = "positive" | "negative" | "neutral";

interface LaneEvent {
  minute: number;
  type: LaneEventType;
  impact: LaneEventImpact;
  comment: string; // Legacy text, kept for fallback
  // New rich data
  subject?: {
    type: "champion";
    name: string;
    championName: string;
  };
  target?: {
    type: "champion" | "objective" | "item";
    value: string | number; // championName, objectiveName, or itemId
    displayName?: string;
  };
  gold?: number;
}

interface MinuteStat {
  minute: number;
  focus: {
    gold: number;
    xp: number;
    cs: number;
    level: number;
    kills: number;
    deaths: number;
    assists: number;
  };
  opponent: {
    gold: number;
    xp: number;
    cs: number;
    level: number;
    kills: number;
    deaths: number;
    assists: number;
  };
  goldDiff: number;
  xpDiff: number;
  csDiff: number;
  diffPercent: number;
  color: "positive" | "negative" | "neutral";
  events: LaneEvent[];
}

interface KeyMoment {
  minute: number;
  type: "turnaround" | "snowball" | "throw" | "powerspike";
  title: string;
  description: string;
  icon: any;
  colorClass: string;
}

interface Tip {
  type: "warning" | "info" | "success";
  message: string;
  icon: any;
}

const normalizeMinute = (timestamp?: number, fallbackIndex = 0) => {
  if (typeof timestamp !== "number") return Math.max(1, fallbackIndex);
  return Math.max(1, Math.floor(timestamp / MS_IN_MINUTE));
};

const getParticipantFrame = (
  frame: TimelineFrame,
  participantId: number,
): ParticipantFrame | undefined => {
  const key = participantId.toString();
  return (
    frame.participantFrames?.[key] ?? frame.participantFrames?.[participantId]
  );
};

const formatObjectiveName = (event: TimelineEvent) => {
  if (event.monsterType) {
    if (event.monsterType === "DRAGON") {
      const subType = event.monsterSubType?.toUpperCase();
      return subType && DRAGON_NAMES[subType]
        ? DRAGON_NAMES[subType]
        : "Dragón";
    }
    if (event.monsterType === "RIFTHERALD") return "Heraldo";
    if (event.monsterType === "BARON_NASHOR") return "Barón Nashor";
    if (event.monsterType === "ATAKHAN") return "Atakhan";
    if (event.monsterType === "VOIDGRUB") return "Larvas del Vacío";
  }
  if (event.buildingType === "TOWER_BUILDING") {
    // Clean up tower names
    const lane = event.laneType?.split("_")[0] || "Torre";
    return `Torre ${lane}`;
  }
  if (event.buildingType === "INHIBITOR_BUILDING") {
    return "Inhibidor";
  }
  return "objetivo";
};

const isMajorPurchase = (itemId?: number) => {
  if (!itemId) return false;
  return MAJOR_ITEM_IDS.has(itemId);
};

const extractLaneEvents = (
  frames: TimelineFrame[],
  focusId: number,
  opponentId: number,
  participantsMap: Map<number, Participant>,
): LaneEvent[] => {
  const events: LaneEvent[] = [];

  frames.forEach((frame, index) => {
    (frame.events ?? []).forEach((event) => {
      const minute = normalizeMinute(event.timestamp, index);

      const pushEvent = (data: Omit<LaneEvent, "minute">) => {
        events.push({ minute, ...data });
      };

      if (event.type === "CHAMPION_KILL") {
        const gold = event.bounty ?? event.shutdown ?? event.goldGranted ?? 300;
        const victimPart = participantsMap.get(event.victimId ?? 0);
        const killerPart = participantsMap.get(event.killerId ?? 0);
        const focusPart = participantsMap.get(focusId);
        const opponentPart = participantsMap.get(opponentId);

        const victimName = victimPart?.championName ?? "Rival";
        const killerName = killerPart?.championName ?? "Rival";
        const focusName = focusPart?.championName ?? "Tú";
        const opponentName = opponentPart?.championName ?? "Rival";

        if (event.killerId === focusId) {
          pushEvent({
            type: "kill",
            impact: "positive",
            comment: `Asesinaste a ${victimName}`,
            subject: {
              type: "champion",
              name: killerPart?.summonerName || killerName,
              championName: killerName,
            },
            target: {
              type: "champion",
              value: victimName,
              displayName: victimName,
            },
            gold,
          });
        } else if (event.assistingParticipantIds?.includes(focusId)) {
          pushEvent({
            type: "kill",
            impact: "positive",
            comment: `Asististe contra ${victimName}`,
            subject: {
              type: "champion",
              name: focusPart?.summonerName || focusName,
              championName: focusName,
            },
            target: {
              type: "champion",
              value: victimName,
              displayName: victimName,
            },
            gold,
          });
        } else if (event.killerId === opponentId) {
          // Rival kills someone else
          pushEvent({
            type: "kill",
            impact: "negative",
            comment: `${killerName} asesinó a ${victimName}`,
            subject: {
              type: "champion",
              name: killerPart?.summonerName || killerName,
              championName: killerName,
            },
            target: {
              type: "champion",
              value: victimName,
              displayName: victimName,
            },
            gold,
          });
        } else if (event.assistingParticipantIds?.includes(opponentId)) {
          // Rival assists killing someone else
          pushEvent({
            type: "kill",
            impact: "negative",
            comment: `${opponentName} asistió contra ${victimName}`,
            subject: {
              type: "champion",
              name: opponentPart?.summonerName || opponentName,
              championName: opponentName,
            },
            target: {
              type: "champion",
              value: victimName,
              displayName: victimName,
            },
            gold,
          });
        } else if (event.victimId === focusId) {
          pushEvent({
            type: "death",
            impact: "negative",
            comment: `Moriste ante ${killerName}`,
            subject: {
              type: "champion",
              name: killerPart?.summonerName || killerName,
              championName: killerName,
            },
            target: {
              type: "champion",
              value: victimName,
              displayName: "Ti",
            },
          });
        } else if (event.victimId === opponentId) {
          // Rival died to someone else
          pushEvent({
            type: "kill",
            impact: "positive",
            comment: `El rival (${victimName}) murió`,
            subject: {
              type: "champion",
              name: killerPart?.summonerName || killerName,
              championName: killerName,
            },
            target: {
              type: "champion",
              value: victimName,
              displayName: "Rival",
            },
          });
        }
      }

      if (
        event.type === "ELITE_MONSTER_KILL" ||
        event.type === "BUILDING_KILL"
      ) {
        const objectiveName = formatObjectiveName(event);
        const killerPart = participantsMap.get(event.killerId ?? 0);
        const killerName = killerPart?.championName ?? "Equipo";

        // Identify objective type key for icon
        let objectiveKey = "";
        if (event.monsterType === "DRAGON")
          objectiveKey = event.monsterSubType?.toUpperCase() || "AIR_DRAGON";
        else if (event.monsterType) objectiveKey = event.monsterType;

        const involvedFocus =
          event.killerId === focusId ||
          event.assistingParticipantIds?.includes(focusId);
        const involvedOpponent =
          event.killerId === opponentId ||
          event.assistingParticipantIds?.includes(opponentId);

        if (involvedFocus) {
          pushEvent({
            type: "roam",
            impact: "positive",
            comment: `Aseguraron ${objectiveName}`,
            subject: {
              type: "champion",
              name: killerPart?.summonerName || killerName,
              championName: killerName,
            },
            target: {
              type: "objective",
              value: objectiveKey, // Use key for icon lookup
              displayName: objectiveName,
            },
          });
        } else if (involvedOpponent) {
          pushEvent({
            type: "roam",
            impact: "negative",
            comment: `${killerName} aseguró ${objectiveName}`,
            subject: {
              type: "champion",
              name: killerPart?.summonerName || killerName,
              championName: killerName,
            },
            target: {
              type: "objective",
              value: objectiveKey, // Use key for icon lookup
              displayName: objectiveName,
            },
          });
        }
      }

      if (event.type === "ITEM_PURCHASED" && isMajorPurchase(event.itemId)) {
        const itemName = MAJOR_ITEM_NAMES[event.itemId!] || "Objeto Mítico";

        if (event.participantId === focusId) {
          pushEvent({
            type: "recall",
            impact: "positive",
            comment: `Compraste ${itemName}`,
            target: {
              type: "item",
              value: event.itemId!,
            },
          });
        } else if (event.participantId === opponentId) {
          pushEvent({
            type: "recall",
            impact: "negative",
            comment: `Rival compró ${itemName}`,
            target: {
              type: "item",
              value: event.itemId!,
            },
          });
        }
      }
    });
  });

  return events;
};

const formatSigned = (value: number, suffix = "") =>
  `${value > 0 ? "+" : ""}${value.toLocaleString()}${suffix}`;

const formatPercent = (value: number) =>
  `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

// --- NEW CHART COMPONENT ---

const CustomTooltip = ({ active, payload, label, gameVersion }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as MinuteStat;
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 p-3 rounded-xl shadow-2xl text-xs backdrop-blur-md min-w-[200px] z-50">
        <p className="font-bold mb-2 border-b border-slate-100 dark:border-slate-700/50 pb-2 text-slate-500 dark:text-slate-300 uppercase tracking-tight">
          Minuto {label}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 items-center mb-3">
          <span className="text-amber-600 dark:text-amber-400 font-semibold uppercase text-[10px]">
            Oro
          </span>
          <span
            className={cn(
              "font-mono font-bold text-sm",
              data.goldDiff > 0
                ? "text-emerald-600 dark:text-green-400"
                : data.goldDiff < 0
                  ? "text-rose-600 dark:text-red-400"
                  : "text-slate-500 dark:text-slate-400",
            )}
          >
            {formatSigned(data.goldDiff)}
          </span>

          <span className="text-blue-600 dark:text-blue-400 font-semibold uppercase text-[10px]">
            XP
          </span>
          <span
            className={cn(
              "font-mono font-bold text-sm",
              data.xpDiff > 0
                ? "text-blue-600 dark:text-blue-300"
                : data.xpDiff < 0
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 dark:text-slate-400",
            )}
          >
            {formatSigned(data.xpDiff)}
          </span>

          <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
            CS
          </span>
          <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-200">
            {formatSigned(data.csDiff)}
          </span>

          <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
            KDA
          </span>
          <div className="flex gap-2 items-center">
            <span className="font-mono font-bold text-xs text-blue-500 dark:text-blue-400">
              {data.focus?.kills}/{data.focus?.deaths}/{data.focus?.assists}
            </span>
            <span className="text-[10px] text-slate-400">vs</span>
            <span className="font-mono font-bold text-xs text-rose-500 dark:text-rose-400">
              {data.opponent?.kills}/{data.opponent?.deaths}/
              {data.opponent?.assists}
            </span>
          </div>
        </div>

        {/* Events List */}
        {data.events.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
            {data.events.slice(0, 4).map((e, i) => (
              <div
                key={i}
                className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50"
              >
                {/* Event Icon/Marker */}
                <div
                  className={cn(
                    "w-1 h-8 rounded-full shrink-0",
                    e.impact === "positive" ? "bg-emerald-500" : "bg-rose-500",
                  )}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {/* Subject Icon (Killer/Source) */}
                    {e.subject?.type === "champion" && (
                      <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm">
                        <Image
                          src={
                            getChampionImg(
                              e.subject.championName,
                              gameVersion,
                            ) || ""
                          }
                          alt={e.subject.championName}
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                    )}

                    {/* Action Icon */}
                    {e.type === "kill" && (
                      <Swords className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    )}
                    {e.type === "death" && (
                      <Skull className="w-3 h-3 text-rose-500" />
                    )}
                    {e.type === "roam" && (
                      <Crosshair className="w-3 h-3 text-amber-500" />
                    )}
                    {e.type === "recall" && (
                      <Anchor className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                    )}

                    {/* Target Icon (Victim/Item/Objective) */}
                    {e.target?.type === "champion" && (
                      <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-slate-600 grayscale brightness-90 bg-white dark:bg-slate-900 shadow-sm">
                        <Image
                          src={
                            getChampionImg(
                              e.target.value as string,
                              gameVersion,
                            ) || ""
                          }
                          alt={String(e.target.value)}
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    {e.target?.type === "item" && (
                      <div className="relative w-6 h-6 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm">
                        <Image
                          src={
                            getItemImg(Number(e.target.value), gameVersion) ||
                            ""
                          }
                          alt="Item"
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    {e.target?.type === "objective" && (
                      <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm p-0.5 flex items-center justify-center">
                        {DRAGON_ICONS[String(e.target.value)] ? (
                          <Image
                            src={DRAGON_ICONS[String(e.target.value)]}
                            alt={e.target.displayName || "Objetivo"}
                            fill
                            sizes="24px"
                            className="object-contain"
                          />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Text Description */}
                  <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 leading-tight line-clamp-2">
                    {e.comment}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};

const LaneDuelChart = ({ stats }: { stats: MinuteStat[] }) => {
  return (
    <div className="w-full h-[200px] sm:h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={stats}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
            vertical={false}
            opacity={0.3}
          />
          <XAxis
            dataKey="minute"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            interval={Math.ceil(stats.length / 5)}
          />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="goldDiff"
            stroke="#000"
            strokeWidth={0}
            fill="url(#splitColor)"
          />
          {/* We plot two areas to handle dynamic painting based on value? 
              Simplified strategy: Just use an SVG gradient offset logic if we want perfect split, 
              but usually single Area with 'gradientOffset' logic is best.
              For now, let's stick to a simple gradient or conditional coloring.
              Actually, Recharts needs the gradient offset calculation for perfect 0-split.
              Let's do standard Green for everything and rely on the tooltip for clarity, 
              OR use a calculated offset. 
              Let's try a simpler approach: Just one stroke line, and dots.
             */}
          <Area
            type="monotone"
            dataKey="goldDiff"
            stroke="#cbd5e1"
            strokeWidth={2}
            fill="url(#splitColor)"
            className="drop-shadow-sm"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export function LaneDuel({
  match,
  timeline,
  focusParticipantId,
  opponentParticipantId,
  onFocusChange,
  onOpponentChange,
}: LaneDuelProps) {
  const participants = match.info.participants as Participant[];
  const gameVersion = match.info.gameVersion;

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const ROLE_ORDER: Record<string, number> = {
    TOP: 0,
    JUNGLE: 1,
    MIDDLE: 2,
    BOTTOM: 3,
    UTILITY: 4,
  };

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      // Sort by team first
      if (a.teamId !== b.teamId) return a.teamId - b.teamId;
      // Then by role order
      const orderA = ROLE_ORDER[a.teamPosition || ""] ?? 99;
      const orderB = ROLE_ORDER[b.teamPosition || ""] ?? 99;
      return orderA - orderB;
    });
  }, [participants]);

  const blueTeam = sortedParticipants.filter((p) => p.teamId === 100);
  const redTeam = sortedParticipants.filter((p) => p.teamId === 200);

  const duelData = useMemo(() => {
    if (!match || !timeline) return null;

    const focusPlayer = participants.find(
      (p) => p.participantId === focusParticipantId,
    );
    if (!focusPlayer) return null;

    const opponent = participants.find(
      (p) => p.participantId === (opponentParticipantId ?? 0),
    );
    if (!opponent) return null;

    const frames = (timeline.info?.frames ?? []) as TimelineFrame[];
    if (!frames.length) return null;

    const participantMap = new Map<number, Participant>();
    participants.forEach((p) => participantMap.set(p.participantId, p));

    const minuteStats: MinuteStat[] = [];

    // Running KDA counters
    let focusK = 0,
      focusD = 0,
      focusA = 0;
    let oppK = 0,
      oppD = 0,
      oppA = 0;

    for (let minute = 1; minute < frames.length; minute++) {
      const frame = frames[minute];
      if (!frame || !frame.participantFrames) continue;

      const focusFrame = getParticipantFrame(frame, focusPlayer.participantId);
      const opponentFrame = getParticipantFrame(frame, opponent.participantId);
      if (!focusFrame || !opponentFrame) continue;

      // Update KDA based on events in this frame
      if (frame.events) {
        frame.events.forEach((event) => {
          if (event.type === "CHAMPION_KILL") {
            // Focus Player updates
            if (event.killerId === focusPlayer.participantId) focusK++;
            if (event.victimId === focusPlayer.participantId) focusD++;
            if (
              event.assistingParticipantIds?.includes(focusPlayer.participantId)
            )
              focusA++;

            // Opponent updates
            if (event.killerId === opponent.participantId) oppK++;
            if (event.victimId === opponent.participantId) oppD++;
            if (event.assistingParticipantIds?.includes(opponent.participantId))
              oppA++;
          }
        });
      }

      const focusCs =
        (focusFrame.minionsKilled ?? 0) + (focusFrame.jungleMinionsKilled ?? 0);
      const opponentCs =
        (opponentFrame.minionsKilled ?? 0) +
        (opponentFrame.jungleMinionsKilled ?? 0);

      const focusGold = focusFrame.totalGold ?? 0;
      const opponentGold = opponentFrame.totalGold ?? 0;
      const focusXp = focusFrame.xp ?? 0;
      const opponentXp = opponentFrame.xp ?? 0;

      const goldDiff = focusGold - opponentGold;
      const xpDiff = focusXp - opponentXp;
      const csDiff = focusCs - opponentCs;

      const goldPercent = opponentGold ? goldDiff / opponentGold : 0;
      const xpPercent = opponentXp ? xpDiff / opponentXp : 0;
      const csPercent = opponentCs ? csDiff / opponentCs : 0;
      const diffPercent = (goldPercent + xpPercent + csPercent) / 3;

      minuteStats.push({
        minute,
        focus: {
          gold: focusGold,
          xp: focusXp,
          cs: focusCs,
          level: focusFrame.level ?? 1,
          kills: focusK,
          deaths: focusD,
          assists: focusA,
        },
        opponent: {
          gold: opponentGold,
          xp: opponentXp,
          cs: opponentCs,
          level: opponentFrame.level ?? 1,
          kills: oppK,
          deaths: oppD,
          assists: oppA,
        },
        goldDiff,
        xpDiff,
        csDiff,
        diffPercent,
        color:
          diffPercent > ADVANTAGE_THRESHOLD
            ? "positive"
            : diffPercent < -ADVANTAGE_THRESHOLD
              ? "negative"
              : "neutral",
        events: [],
      });
    }

    if (!minuteStats.length) {
      return {
        focusPlayer,
        opponent,
        minuteStats,
      };
    }

    const events = extractLaneEvents(
      frames,
      focusPlayer.participantId,
      opponent.participantId,
      participantMap,
    );

    const statsByMinute = new Map<number, MinuteStat>(
      minuteStats.map((stat) => [stat.minute, stat]),
    );
    const lastMinute = minuteStats[minuteStats.length - 1].minute;

    events.forEach((event) => {
      const target =
        statsByMinute.get(event.minute) ||
        statsByMinute.get(event.minute - 1) ||
        statsByMinute.get(Math.min(lastMinute, event.minute + 1));
      if (target) {
        target.events.push(event);
      }
    });

    const minute15Snapshot =
      minuteStats.find((stat) => stat.minute >= 15) ??
      minuteStats[minuteStats.length - 1];

    const latestSnapshot = minuteStats[minuteStats.length - 1];

    const isAlly = focusPlayer.teamId === opponent.teamId;

    // --- Advanced Analysis: Key Moments ---
    const keyMoments: KeyMoment[] = [];
    const tips: Tip[] = [];

    if (!isAlly) {
      // Duel Mode: Detect Swing Points
      for (let i = 1; i < minuteStats.length; i++) {
        const prev = minuteStats[i - 1];
        const curr = minuteStats[i];
        const leadReversal =
          Math.sign(prev.goldDiff) !== Math.sign(curr.goldDiff) &&
          Math.abs(curr.goldDiff) > 500;

        if (leadReversal) {
          const isFocusLeadNow = curr.goldDiff > 0;
          keyMoments.push({
            minute: curr.minute,
            type: "turnaround",
            title: isFocusLeadNow ? "¡Remontada!" : "Pérdida de Ventaja",
            description: isFocusLeadNow
              ? "Revertiste la desventaja y tomaste el control."
              : "El rival logró darle la vuelta a la línea.",
            icon: ArrowRightLeft,
            colorClass: isFocusLeadNow ? "text-emerald-500" : "text-rose-500",
          });
          continue;
        }

        const diffChange = curr.goldDiff - prev.goldDiff;
        if (Math.abs(diffChange) > 1000) {
          const isPositiveSwing = diffChange > 0;
          keyMoments.push({
            minute: curr.minute,
            type: isPositiveSwing ? "snowball" : "throw",
            title: isPositiveSwing ? "Aceleración" : "Caída Abrupta",
            description: isPositiveSwing
              ? "Incrementaste drásticamente tu ventaja."
              : "Perdiste mucho terreno en poco tiempo.",
            icon: TrendingUp,
            colorClass: isPositiveSwing ? "text-emerald-500" : "text-rose-500",
          });
        }
      }
    } else {
      // Ally Mode: Cooperation & Contribution
      const focusKP =
        ((focusPlayer.kills + focusPlayer.assists) /
          (match.info.teams.find((t: any) => t.teamId === focusPlayer.teamId)
            ?.objectives.champion.kills || 1)) *
        100;
      const oppKP =
        ((opponent.kills + opponent.assists) /
          (match.info.teams.find((t: any) => t.teamId === opponent.teamId)
            ?.objectives.champion.kills || 1)) *
        100;

      if (Math.abs(focusKP - oppKP) < 15 && focusKP > 40) {
        keyMoments.push({
          minute: 0,
          type: "powerspike",
          title: "Sinergia de Equipo",
          description:
            "Ambos mantienen un nivel similar de participación en kills. Trabajo conjunto sólido.",
          icon: Users,
          colorClass: "text-indigo-500",
        });
      }

      const focusEf =
        (focusPlayer.totalDamageDealtToChampions || 0) /
        (focusPlayer.goldEarned || 1);
      const oppEf =
        (opponent.totalDamageDealtToChampions || 0) /
        (opponent.goldEarned || 1);

      if (focusEf > oppEf * 1.3) {
        tips.push({
          type: "success",
          message:
            "Estás optimizando tu economía mejor que tu aliado, generando más daño por cada moneda de oro.",
          icon: Zap,
        });
      }
    }

    // C. Power Spikes (Independent)
    events.forEach((e) => {
      // Solo considerar compras del jugador analizado (impacto positivo)
      if (e.target?.type === "item" && e.impact === "positive") {
        const purchaseMinute = e.minute;
        const nextEvents = events.filter(
          (ev) =>
            ev.minute > purchaseMinute &&
            ev.minute <= purchaseMinute + 2 &&
            ev.type === "kill" &&
            ev.subject?.championName === focusPlayer.championName,
        );

        if (nextEvents.length > 0) {
          keyMoments.push({
            minute: purchaseMinute,
            type: "powerspike",
            title: "Power Spike",
            description: `Aprovechaste ${
              MAJOR_ITEM_NAMES[Number(e.target.value)] || "tu compra"
            } para conseguir una eliminación.`,
            icon: ShoppingBag,
            colorClass: "text-amber-500",
          });
        }
      }
    });

    // 2. Automated Tips (Enhanced Analysis)
    const gameMinutes = match.info.gameDuration / 60;

    if (!isAlly) {
      // Lane-specific tips
      const myDeaths = events.filter((e) => e.type === "death").length;
      if (myDeaths > 4 && latestSnapshot.minute < 15) {
        tips.push({
          type: "warning",
          message: `Prioriza defensa: Has muerto ${myDeaths} veces en fase temprana. Evita sobre-extenderte sin visión de la jungla enemiga.`,
          icon: ShieldAlert,
        });
      }

      if (latestSnapshot.xpDiff > 500 && latestSnapshot.goldDiff < -500) {
        tips.push({
          type: "info",
          message:
            "Eficiencia de recursos: Vas ganando en nivel (XP) pero pierdes en oro. Tu 'last-hit' a súbditos necesita mejorar para igualar la compra de equipo.",
          icon: Lightbulb,
        });
      }

      if (latestSnapshot.goldDiff > 2500 && gameMinutes > 15) {
        tips.push({
          type: "success",
          message:
            "Líder de línea: Tienes una ventaja masiva. Considera moverte (Roaming) para ayudar a otras líneas y forzar objetivos globales.",
          icon: Trophy,
        });
      }
    }

    // Global performance tips
    const csPerMin =
      (focusPlayer.totalMinionsKilled + focusPlayer.neutralMinionsKilled) /
      gameMinutes;
    if (csPerMin < 5 && gameMinutes > 10) {
      tips.push({
        type: "warning",
        message: `Farming bajo (${csPerMin.toFixed(
          1,
        )} CS/min). En League of Legends, el oro de los súbditos es la fuente más estable de poder. Practica el last-hit.`,
        icon: Target,
      });
    }

    if (focusPlayer.visionScore < gameMinutes * 0.7 && gameMinutes > 12) {
      tips.push({
        type: "info",
        message: `Mejora tu visión: Tu puntuación de visión (${focusPlayer.visionScore}) es baja para el tiempo de partida. El uso constante de Wards previene muertes innecesarias.`,
        icon: Eye,
      });
    }

    if (focusPlayer.damageDealtToObjectives < 1000 && gameMinutes > 20) {
      tips.push({
        type: "warning",
        message: `Participación en objetivos: Has aportado poco daño (${focusPlayer.damageDealtToObjectives.toLocaleString()}) a torres y monstruos épicos. Los objetivos ganan partidas, no solo las kills.`,
        icon: Swords,
      });
    }

    // Sort by minute first
    keyMoments.sort((a, b) => a.minute - b.minute);

    // Deduplicate by type to avoid repetitive cards
    const uniqueMomentsMap = new Map();
    keyMoments.forEach((item) => {
      if (!uniqueMomentsMap.has(item.type)) {
        uniqueMomentsMap.set(item.type, item);
      }
    });

    const uniqueMoments = Array.from(uniqueMomentsMap.values()).slice(0, 3);

    return {
      focusPlayer,
      opponent,
      minuteStats,
      minute15Snapshot,
      latestSnapshot,
      keyMoments: uniqueMoments,
      tips: tips.slice(0, 2),
      isAlly,
    };
  }, [
    match,
    timeline,
    focusParticipantId,
    opponentParticipantId,
    participants,
  ]);

  if (!duelData) return null;

  const {
    focusPlayer,
    opponent,
    minuteStats,
    minute15Snapshot,
    latestSnapshot,
    keyMoments,
    tips,
    isAlly,
  } = duelData;

  // Calculate Gradient Offset for the Chart
  // We want the area above 0 to be green, below 0 to be red
  const gradientOffset = () => {
    const dataMax = Math.max(...minuteStats.map((i) => i.goldDiff));
    const dataMin = Math.min(...minuteStats.map((i) => i.goldDiff));

    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;

    return dataMax / (dataMax - dataMin);
  };

  const off = gradientOffset();

  if (!isMounted) {
    return (
      <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
        <div className="h-[400px]" />
      </Card>
    );
  }

  return (
    <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Integrated Champion Selector Bar */}
      <div className="flex flex-row items-center justify-center gap-4 sm:gap-8 py-3 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-200/50 dark:border-white/5">
        {/* Blue Team Selection */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {blueTeam.map((p: any) => {
            const isFocus = focusParticipantId === p.participantId;
            const isOpponent = opponentParticipantId === p.participantId;

            return (
              <button
                key={p.participantId}
                onClick={() => onFocusChange?.(p.participantId)}
                className={cn(
                  "relative w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all duration-300 hover:scale-110 outline-none focus:outline-none focus-visible:outline-none",
                  isFocus
                    ? "ring-2 ring-indigo-500 scale-110 z-10 shadow-[0_0_15px_rgba(99,102,241,0.6)]"
                    : isOpponent
                      ? "scale-105 opacity-100 z-0 grayscale-0"
                      : "opacity-30 grayscale hover:grayscale-0 hover:opacity-100",
                )}
              >
                <div className="absolute inset-0 rounded-full overflow-hidden border border-slate-200 dark:border-white/10">
                  <Image
                    src={getChampionImg(p.championName, gameVersion)}
                    alt={p.championName}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 rotate-12 mx-2 opacity-50" />

        {/* Red Team Selection */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {redTeam.map((p: any) => {
            const isFocus = focusParticipantId === p.participantId;
            const isOpponent = opponentParticipantId === p.participantId;

            return (
              <button
                key={p.participantId}
                onClick={() => onFocusChange?.(p.participantId)}
                className={cn(
                  "relative w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all duration-300 hover:scale-110 outline-none focus:outline-none focus-visible:outline-none",
                  isFocus
                    ? "ring-2 ring-indigo-500 scale-110 z-10 shadow-[0_0_15px_rgba(99,102,241,0.6)]"
                    : isOpponent
                      ? "scale-105 opacity-100 z-0 grayscale-0"
                      : "opacity-30 grayscale hover:grayscale-0 hover:opacity-100",
                )}
              >
                <div className="absolute inset-0 rounded-full overflow-hidden border border-slate-200 dark:border-white/10">
                  <Image
                    src={getChampionImg(p.championName, gameVersion)}
                    alt={p.championName}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <CardHeader className="pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Swords className="w-5 h-5 text-indigo-500" />
            <span>Fase de Líneas</span>
          </CardTitle>
          <div
            className={cn(
              "px-2 py-1 rounded text-xs font-bold uppercase",
              isAlly
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                : latestSnapshot.goldDiff > 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
            )}
          >
            {isAlly
              ? "Sinergia de Equipo"
              : latestSnapshot.goldDiff > 0
                ? "Ganada"
                : "Perdida"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-8">
          {/* LEFT COLUMN: Head-to-Head & Chart */}
          <div className="space-y-6">
            {/* 1. Header VS */}
            <div className="flex items-center justify-between px-2 sm:px-6">
              {/* Focus Player */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 border-emerald-500/30 shadow-lg relative">
                    <Image
                      src={getChampionImg(
                        focusPlayer.championName,
                        gameVersion,
                      )}
                      alt={focusPlayer.championName}
                      fill
                      sizes="80px"
                      className="object-cover transform scale-110"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shadow">
                    {minuteStats[minuteStats.length - 1]?.focus.level}
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate max-w-[100px]">
                    {focusPlayer.riotIdGameName || focusPlayer.summonerName}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                    {focusPlayer.championName}
                  </p>
                  <p className="text-[10px] font-mono font-bold text-indigo-500 dark:text-indigo-400 mt-0.5">
                    {focusPlayer.kills} / {focusPlayer.deaths} /{" "}
                    {focusPlayer.assists}
                  </p>
                </div>
              </div>

              {/* VS Divider */}
              <div className="flex flex-col items-center gap-1">
                {isAlly ? (
                  <Users className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1" />
                ) : (
                  <span className="text-2xl font-black text-slate-200 dark:text-slate-700 italic">
                    VS
                  </span>
                )}
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest text-center">
                  {isAlly ? "Contribución" : "Gold Diff"}
                </span>
              </div>

              {/* Opponent */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 border-rose-500/30 shadow-lg grayscale-[0.3] relative">
                    <Image
                      src={getChampionImg(opponent.championName, gameVersion)}
                      alt={opponent.championName}
                      fill
                      sizes="80px"
                      className="object-cover transform scale-110"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shadow">
                    {minuteStats[minuteStats.length - 1]?.opponent.level}
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate max-w-[100px]">
                    {opponent.riotIdGameName || opponent.summonerName}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                    {opponent.championName}
                  </p>
                  <p className="text-[10px] font-mono font-bold text-rose-500 dark:text-rose-400 mt-0.5">
                    {opponent.kills} / {opponent.deaths} / {opponent.assists}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Main Chart */}
            <div className="relative w-full h-[240px] bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-slate-200 dark:border-slate-800 p-2">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={200}
                minHeight={200}
              >
                <AreaChart
                  data={minuteStats}
                  margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset={off}
                        stopColor="#10b981"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset={off}
                        stopColor="#f43f5e"
                        stopOpacity={0.3}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#64748b"
                    opacity={0.1}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="minute"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <Tooltip
                    content={<CustomTooltip gameVersion={gameVersion} />}
                    wrapperStyle={{ zIndex: 1000 }}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="#94a3b8"
                    strokeDasharray="3 3"
                    opacity={0.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="goldDiff"
                    stroke="#64748b"
                    strokeWidth={2}
                    fill="url(#splitColor)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
              {/* Overlay Label */}
              <div className="absolute top-2 left-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded shadow-sm backdrop-blur-sm">
                Ventaja de Oro (Duelo)
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Analysis Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-200/50 dark:border-slate-800/50 pt-6">
            {/* Col 1: Key Moments */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Anchor className="w-4 h-4 text-indigo-500" />
                Momentos Clave
              </h4>

              <div className="space-y-3">
                {keyMoments.length > 0 ? (
                  keyMoments.map((moment, idx) => {
                    const Icon = moment.icon;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-lg border flex gap-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50",
                          moment.colorClass.includes("emerald")
                            ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/10"
                            : moment.colorClass.includes("rose")
                              ? "bg-rose-50/50 border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/10"
                              : "bg-amber-50/50 border-amber-100 dark:bg-amber-500/5 dark:border-amber-500/10",
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 p-1.5 rounded-full h-fit bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm",
                            moment.colorClass,
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-wider bg-white/50 dark:bg-slate-900/50 px-1.5 rounded",
                                moment.colorClass,
                              )}
                            >
                              Min {moment.minute}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              {moment.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                            {moment.description}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-slate-500 text-center py-4 italic">
                    No se detectaron momentos críticos inusuales.
                  </div>
                )}
              </div>
            </div>

            {/* Col 2: Tips & Stats */}
            <div className="space-y-4">
              {/* TIPS SECTION */}
              {tips.length > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3 text-yellow-500" />
                    Recomendaciones
                  </h4>
                  {tips.map((tip, i) => (
                    <div
                      key={i}
                      className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700"
                    >
                      <span className="mt-0.5 text-yellow-500">•</span>
                      <span>{tip.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {minute15Snapshot && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex gap-3">
                  <div className="mt-0.5 p-1.5 rounded-full h-fit bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    <Crosshair className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                      Minuto 15 · Early Game
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs mt-1">
                      <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px]">Oro</span>
                        <span
                          className={cn(
                            "font-mono font-medium",
                            minute15Snapshot.goldDiff > 0
                              ? "text-emerald-600"
                              : "text-rose-500",
                          )}
                        >
                          {formatSigned(minute15Snapshot.goldDiff)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px]">CS</span>
                        <span
                          className={cn(
                            "font-mono font-medium",
                            minute15Snapshot.csDiff > 0
                              ? "text-emerald-600"
                              : "text-rose-500",
                          )}
                        >
                          {formatSigned(minute15Snapshot.csDiff)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px]">XP</span>
                        <span
                          className={cn(
                            "font-mono font-medium",
                            minute15Snapshot.xpDiff > 0
                              ? "text-emerald-600"
                              : "text-rose-500",
                          )}
                        >
                          {formatSigned(minute15Snapshot.xpDiff)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Legend */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Tu Ventaja</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Ventaja Rival</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
