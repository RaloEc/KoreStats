"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import {
  Trophy,
  Trash2,
  ExternalLink,
  Zap,
  Shield as ShieldIcon,
  Clock,
  MoreVertical,
  Mountain,
  Route,
  Swords,
  Target,
  LifeBuoy,
  EyeOff,
  TrendingUp,
  Flame,
} from "lucide-react";
import { ChampionCenteredSplash } from "@/components/riot/ChampionCenteredSplash";
import {
  getItemImageUrl,
  getSummonerSpellUrl,
  getRuneIconUrl,
  getQueueName,
  formatDuration,
  getRelativeTime,
  getChampionImageUrl,
} from "@/components/riot/match-card/helpers";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiotTierBadge } from "@/components/riot/RiotTierBadge";
import { ActivityCardMenu } from "@/components/perfil/ActivityCardMenu";
import { analyzeMatchTags, type MatchTag } from "@/lib/riot/match-analyzer";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

export interface SharedMatchData {
  entryId: string;
  matchId: string;
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

interface SharedMatchCardProps {
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
}

type RuneSelection = {
  perk?: number;
  var1?: number;
  var2?: number;
  var3?: number;
};

const toSafeNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const laneIconMap: Record<string, LucideIcon> = {
  TOP: Mountain,
  JG: Route,
  MID: Swords,
  ADC: Target,
  SUPP: LifeBuoy,
};

type RuneStyle = {
  description?: string;
  style?: number;
  selections?: RuneSelection[];
};

type RunePerks = {
  styles?: RuneStyle[];
  statPerks?: {
    offense?: number;
    flex?: number;
    defense?: number;
  };
};

const RUNE_STYLE_LABELS: Record<number, string> = {
  8000: "Precisión",
  8100: "Dominación",
  8200: "Brujería",
  8300: "Inspiración",
  8400: "Valor",
};

const getRuneStyleLabel = (styleId?: number) => {
  if (!styleId) return "Runas";
  return RUNE_STYLE_LABELS[styleId] ?? "Runas";
};

const normalizeRole = (value?: string) =>
  value?.toUpperCase().replace(/\s+/g, "") ?? "";

const getLaneAbbreviation = (role?: string, lane?: string): string | null => {
  const priority = [role, lane]
    .map((val, index) =>
      index === 0 ? normalizeRole(val) : normalizeRole(val)
    )
    .filter(Boolean);

  const supportRoles = new Set(["DUOSUPPORT", "SUPPORT", "SUPP", "UTILITY"]);

  if (supportRoles.has(priority[0])) return "SUPP";

  const map: Record<string, string> = {
    TOP: "TOP",
    JUNGLE: "JG",
    JUNGLER: "JG",
    JG: "JG",
    MID: "MID",
    MIDDLE: "MID",
    MIDLANE: "MID",
    BOTTOM: "ADC",
    BOT: "ADC",
    ADC: "ADC",
    DUOCARRY: "ADC",
    CARRY: "ADC",
    MARKSMAN: "ADC",
    SUPPORT: "SUPP",
    SUP: "SUPP",
    SUPP: "SUPP",
    DUOSUPPORT: "SUPP",
    UTILITY: "SUPP",
  };

  for (const value of priority) {
    if (!value) continue;
    if (supportRoles.has(value)) return "SUPP";
    if (map[value]) return map[value];
  }

  return null;
};

// Función para obtener información de badge
const getTagInfo = (tag: MatchTag) => {
  const tagInfoMap: Record<MatchTag, { color: string; label: string }> = {
    MVP: {
      color:
        "bg-amber-100 dark:bg-amber-200/85 text-slate-900 dark:text-slate-950",
      label: "MVP",
    },
    Stomper: {
      color:
        "bg-rose-100 dark:bg-rose-200/80 text-slate-900 dark:text-slate-950",
      label: "Stomper",
    },
    Muralla: {
      color:
        "bg-slate-200 dark:bg-slate-300/80 text-slate-900 dark:text-slate-950",
      label: "Muralla",
    },
    Farmeador: {
      color:
        "bg-amber-200 dark:bg-amber-200/85 text-slate-900 dark:text-slate-950",
      label: "Farmeador",
    },
    Visionario: {
      color:
        "bg-emerald-100 dark:bg-emerald-200/85 text-slate-900 dark:text-slate-950",
      label: "Visionario",
    },
    Objetivos: {
      color:
        "bg-blue-100 dark:bg-blue-200/85 text-slate-900 dark:text-slate-950",
      label: "Objetivos",
    },
    Implacable: {
      color:
        "bg-purple-100 dark:bg-fuchsia-200/85 text-slate-900 dark:text-slate-950",
      label: "Implacable",
    },
    Titan: {
      color:
        "bg-orange-100 dark:bg-orange-200/85 text-slate-900 dark:text-slate-950",
      label: "Titan",
    },
    Demoledor: {
      color:
        "bg-amber-100 dark:bg-amber-200/85 text-slate-900 dark:text-slate-950",
      label: "Demoledor",
    },
    KS: {
      color:
        "bg-pink-100 dark:bg-pink-200/85 text-slate-900 dark:text-slate-950",
      label: "KS",
    },
    Sacrificado: {
      color:
        "bg-slate-200 dark:bg-slate-200/85 text-slate-900 dark:text-slate-950",
      label: "Sacrificado",
    },
    Ladron: {
      color: "bg-red-100 dark:bg-red-200/85 text-slate-900 dark:text-slate-950",
      label: "Ladron",
    },
    Desafortunado: {
      color:
        "bg-slate-100 dark:bg-slate-200/80 text-slate-900 dark:text-slate-950",
      label: "Desafortunado",
    },
    DiosDelCS: {
      color:
        "bg-yellow-100 dark:bg-yellow-200/85 text-slate-900 dark:text-slate-950",
      label: "Dios del CS",
    },
    SoloKill: {
      color: "bg-red-100 dark:bg-red-200/85 text-slate-900 dark:text-slate-950",
      label: "Solo Kill",
    },
    Remontada: {
      color:
        "bg-blue-100 dark:bg-blue-200/85 text-slate-900 dark:text-slate-950",
      label: "Remontada",
    },
    Destructor: {
      color:
        "bg-orange-200 dark:bg-orange-300/85 text-slate-900 dark:text-slate-950",
      label: "Destructor",
    },
    FuriaTemprana: {
      color:
        "bg-rose-200 dark:bg-rose-300/85 text-slate-900 dark:text-slate-950",
      label: "Furia Temprana",
    },
    MaestroDeCC: {
      color:
        "bg-purple-200 dark:bg-purple-300/85 text-slate-900 dark:text-slate-950",
      label: "Maestro de CC",
    },
    Duelista: {
      color: "bg-red-200 dark:bg-red-300/85 text-slate-900 dark:text-slate-950",
      label: "Duelista",
    },
    PrimeraSangre: {
      color:
        "bg-rose-100 dark:bg-rose-200/85 text-slate-900 dark:text-slate-950",
      label: "Primera Sangre",
    },
    PentaKill: {
      color:
        "bg-red-500 text-white dark:bg-red-600 dark:text-white font-bold animate-pulse",
      label: "PENTA KILL",
    },
    QuadraKill: {
      color: "bg-red-400 text-white dark:bg-red-500 dark:text-white font-bold",
      label: "QUADRA KILL",
    },
    TripleKill: {
      color:
        "bg-orange-400 text-white dark:bg-orange-500 dark:text-white font-bold",
      label: "TRIPLE KILL",
    },
    DobleKill: {
      color:
        "bg-amber-400 text-white dark:bg-amber-500 dark:text-white font-bold",
      label: "DOBLE KILL",
    },
  };

  return tagInfoMap[tag] || { color: "bg-gray-100", label: tag };
};

export const SharedMatchCard: React.FC<SharedMatchCardProps> = ({
  partida,
  userColor,
  sharedBy,
  isAdmin,
  isOwnProfile,
  isHidden,
  onHide,
  onUnhide,
  onDelete,
  deletingId,
}) => {
  const mobileCarouselRef = React.useRef<HTMLDivElement | null>(null);
  const [mobileCarouselIndex, setMobileCarouselIndex] = React.useState(0);

  const isWin = partida.result === "win";
  const isVictory = isWin;
  const outcomeTextClass = isVictory
    ? "text-emerald-700 dark:text-emerald-200"
    : "text-rose-700 dark:text-rose-200";
  const outcomeBgClass = isVictory
    ? "bg-emerald-100/80 dark:bg-emerald-500/15"
    : "bg-rose-100/80 dark:bg-rose-500/15";

  const colorStyle = {
    "--user-color": userColor,
  } as React.CSSProperties;

  const queueName = getQueueName(partida.queueId);
  const durationLabel = formatDuration(partida.gameDuration);
  const relativeTime = getRelativeTime(partida.created_at);
  const ddragonVersion = partida.dataVersion || "14.23.1";

  const rankLabel = partida.tier
    ? `${partida.tier} ${partida.rank}`
    : "Sin rango";

  const laneAbbreviation = getLaneAbbreviation(partida.role, partida.lane);
  const laneIconKey = laneAbbreviation?.toUpperCase();
  const LaneIcon = laneIconKey ? laneIconMap[laneIconKey] : null;

  const rankingBadgeClass =
    partida.rankingPosition && partida.rankingPosition <= 3
      ? "border-white/30 bg-white/20 text-slate-900 dark:text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-[2px] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent after:content-[''] after:absolute after:top-0 after:left-0 after:w-px after:h-full after:bg-gradient-to-b after:from-white/70 after:via-transparent after:to-white/30"
      : "border-white/60 bg-white/80 text-slate-900 dark:text-white shadow-[0_6px_20px_rgba(15,23,42,0.15)] backdrop-blur-[2px] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent after:content-[''] after:absolute after:top-0 after:left-0 after:w-px after:h-full after:bg-gradient-to-b after:from-white/60 after:via-transparent after:to-white/25 dark:bg-white/10 dark:text-white";

  const runeStyles = partida.perks?.styles ?? [];
  const primaryStyle =
    runeStyles.find((style) => style.description === "primaryStyle") ??
    runeStyles.find((style) => style.style === partida.perkPrimaryStyle);
  const secondaryStyle =
    runeStyles.find((style) => style.description === "subStyle") ??
    runeStyles.find((style) => style.style === partida.perkSubStyle);
  const statPerks = partida.perks?.statPerks;

  type PerkJsonEntry = {
    id: number;
    name: string;
    iconPath: string;
  };

  const isPerkJsonEntry = (value: unknown): value is PerkJsonEntry => {
    if (!value || typeof value !== "object") return false;
    const obj = value as Record<string, unknown>;
    return (
      typeof obj.id === "number" &&
      typeof obj.name === "string" &&
      typeof obj.iconPath === "string"
    );
  };

  const iconPathToUrl = (iconPath: string): string | null => {
    // Ejemplo iconPath: "/lol-game-data/assets/v1/perk-images/Styles/Domination/Electrocute/Electrocute.png"
    const prefix = "/lol-game-data/assets/";
    if (!iconPath.startsWith(prefix)) return null;
    const relative = iconPath.slice(prefix.length).toLowerCase();
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/${relative}`;
  };

  const [perkIconById, setPerkIconById] = React.useState<
    Record<number, string>
  >({});
  const [perkNameById, setPerkNameById] = React.useState<
    Record<number, string>
  >({});

  const perkIdsNeeded = React.useMemo(() => {
    const ids = new Set<number>();
    for (const selection of primaryStyle?.selections ?? []) {
      const perkId = toSafeNumber(selection.perk);
      if (perkId && perkId > 0) {
        ids.add(perkId);
      }
    }
    for (const selection of secondaryStyle?.selections ?? []) {
      const perkId = toSafeNumber(selection.perk);
      if (perkId && perkId > 0) {
        ids.add(perkId);
      }
    }
    const offenseId = toSafeNumber(statPerks?.offense);
    const flexId = toSafeNumber(statPerks?.flex);
    const defenseId = toSafeNumber(statPerks?.defense);
    if (offenseId) ids.add(offenseId);
    if (flexId) ids.add(flexId);
    if (defenseId) ids.add(defenseId);
    return Array.from(ids);
  }, [primaryStyle?.selections, secondaryStyle?.selections, statPerks]);

  React.useEffect(() => {
    let cancelled = false;

    const loadPerkIcons = async () => {
      if (perkIdsNeeded.length === 0) return;
      const missing = perkIdsNeeded.some((id) => !perkIconById[id]);
      if (!missing) return;

      try {
        const response = await fetch(
          "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perks.json"
        );
        if (!response.ok) return;

        const raw: unknown = await response.json();
        if (!Array.isArray(raw)) return;

        const neededSet = new Set(perkIdsNeeded);
        const nextIcons: Record<number, string> = {};
        const nextNames: Record<number, string> = {};

        for (const entry of raw) {
          if (!isPerkJsonEntry(entry)) continue;
          if (!neededSet.has(entry.id)) continue;
          const url = iconPathToUrl(entry.iconPath);
          if (!url) continue;
          nextIcons[entry.id] = url;
          nextNames[entry.id] = entry.name;
        }

        if (cancelled) return;
        setPerkIconById((prev) => ({ ...prev, ...nextIcons }));
        setPerkNameById((prev) => ({ ...prev, ...nextNames }));
      } catch {
        // Silencioso: si falla, solo no mostramos iconos.
      }
    };

    void loadPerkIcons();

    return () => {
      cancelled = true;
    };
  }, [perkIdsNeeded, perkIconById]);

  const hasDetailedRunes = Boolean(
    (primaryStyle?.selections && primaryStyle.selections.length > 0) ||
      (secondaryStyle?.selections && secondaryStyle.selections.length > 0) ||
      statPerks?.offense ||
      statPerks?.flex ||
      statPerks?.defense
  );

  const renderRuneSelections = (style?: RuneStyle) => {
    if (!style?.selections?.length) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {style.selections.map((selection, index) => {
          const perkId = toSafeNumber(selection.perk);
          const icon =
            typeof perkId === "number" ? perkIconById[perkId] : undefined;
          const perkName =
            typeof perkId === "number" ? perkNameById[perkId] : undefined;
          const key = `${style.style}-${perkId ?? "x"}-${index}`;
          return (
            <div
              key={key}
              className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-900/60 border border-white/10"
            >
              {icon ? (
                <Image
                  src={icon}
                  alt={perkName ?? "Runa seleccionada"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-slate-800" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderShardIcons = () => {
    if (!statPerks) return null;
    const shards = [
      toSafeNumber(statPerks.offense),
      toSafeNumber(statPerks.flex),
      toSafeNumber(statPerks.defense),
    ].filter((value): value is number => typeof value === "number");
    if (shards.length === 0) return null;
    return (
      <div className="flex items-center gap-2 mt-2">
        {shards.map((shardId, index) => {
          const icon =
            typeof shardId === "number" ? perkIconById[shardId] : undefined;
          const perkName =
            typeof shardId === "number" ? perkNameById[shardId] : undefined;
          const key = `shard-${shardId}-${index}`;
          return (
            <div
              key={key}
              className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-900/60 border border-white/10"
            >
              {icon ? (
                <Image
                  src={icon}
                  alt={perkName ?? "Fragmento"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-slate-800" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const RuneTooltipContent = () => {
    if (!hasDetailedRunes) return null;
    return (
      <div className="space-y-3 text-xs">
        {primaryStyle && (
          <div>
            <p className="text-[11px] uppercase font-semibold text-muted-foreground">
              Primaria • {getRuneStyleLabel(primaryStyle.style)}
            </p>
            {renderRuneSelections(primaryStyle)}
          </div>
        )}
        {secondaryStyle && (
          <div>
            <p className="text-[11px] uppercase font-semibold text-muted-foreground">
              Secundaria • {getRuneStyleLabel(secondaryStyle.style)}
            </p>
            {renderRuneSelections(secondaryStyle)}
          </div>
        )}
        {renderShardIcons() && (
          <div>
            <p className="text-[11px] uppercase font-semibold text-muted-foreground">
              Fragmentos
            </p>
            {renderShardIcons()}
          </div>
        )}
      </div>
    );
  };

  const keystonePerkId = toSafeNumber(primaryStyle?.selections?.[0]?.perk);
  const keystoneIcon =
    typeof keystonePerkId === "number" ? perkIconById[keystonePerkId] : null;
  const keystoneName =
    typeof keystonePerkId === "number" ? perkNameById[keystonePerkId] : null;

  const runeIcons = (
    <div className="flex items-center gap-1">
      {keystoneIcon ? (
        <div className="relative w-6 h-6 rounded-full overflow-hidden">
          <Image
            src={keystoneIcon}
            alt={keystoneName ?? "Keystone"}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        partida.perkPrimaryStyle > 0 && (
          <div className="relative w-6 h-6 rounded-full overflow-hidden">
            <Image
              src={getRuneIconUrl(partida.perkPrimaryStyle)}
              alt="Estilo primario"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )
      )}
      {partida.perkSubStyle > 0 && (
        <div className="relative w-5 h-5 rounded-full overflow-hidden">
          <Image
            src={getRuneIconUrl(partida.perkSubStyle)}
            alt="Estilo secundario"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
    </div>
  );

  const runeIconsWithTooltip = hasDetailedRunes ? (
    <Tooltip>
      <TooltipTrigger asChild>{runeIcons}</TooltipTrigger>
      <TooltipContent className="w-64 p-3">
        <RuneTooltipContent />
      </TooltipContent>
    </Tooltip>
  ) : (
    runeIcons
  );

  // Calcular color del performance score
  const getScoreColor = (score: number | null) => {
    if (!score) return "text-slate-400";
    if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 75) return "text-blue-600 dark:text-blue-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 45) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  // Calcular comparativas vs equipo
  const damageShare = partida.teamTotalDamage
    ? (partida.damageToChampions / partida.teamTotalDamage) * 100
    : 0;
  const goldShare = partida.teamTotalGold
    ? (partida.goldEarned / partida.teamTotalGold) * 100
    : 0;
  const killParticipation = partida.teamTotalKills
    ? ((partida.kills + partida.assists) / partida.teamTotalKills) * 100
    : 0;
  const killParticipationRatio =
    partida.teamTotalKills && partida.teamTotalKills > 0
      ? (partida.kills + partida.assists) / partida.teamTotalKills
      : undefined;

  // Calcular badges de desempeño
  const matchTags = analyzeMatchTags({
    kills: partida.kills,
    deaths: partida.deaths,
    assists: partida.assists,
    win: isWin,
    gameDuration: partida.gameDuration,
    goldEarned: partida.goldEarned,
    csPerMinute: partida.csPerMin,
    totalDamageDealtToChampions: partida.damageToChampions,
    damageToTurrets: partida.damageToTurrets,
    visionScore: partida.visionScore,
    teamDamageShare: partida.teamTotalDamage
      ? partida.damageToChampions / partida.teamTotalDamage
      : undefined,
    killParticipation: killParticipationRatio,
    objectivesStolen: partida.objectivesStolen,
    role: partida.role,
    teamTotalKills: partida.teamTotalKills,
    teamTotalDamage: partida.teamTotalDamage,
    teamTotalGold: partida.teamTotalGold,
    // Nuevos campos para badges
    pentaKills: partida.pentaKills,
    quadraKills: partida.quadraKills,
    tripleKills: partida.tripleKills,
    doubleKills: partida.doubleKills,
    firstBloodKill: partida.firstBloodKill,
    totalTimeCCDealt: partida.totalTimeCCDealt,
    soloKills: partida.soloKills,
    turretPlatesTaken: partida.turretPlatesTaken,
    earlyLaningPhaseGoldExpAdvantage: partida.earlyLaningPhaseGoldExpAdvantage,
    goldDeficit: partida.goldDeficit,
  });

  // Fallback de badges si no hay ninguno
  const displayTags =
    matchTags.length > 0 ? matchTags : (["MVP"] as MatchTag[]);

  const teamAvgDamageToChampions =
    typeof partida.teamAvgDamageToChampions === "number" &&
    Number.isFinite(partida.teamAvgDamageToChampions)
      ? partida.teamAvgDamageToChampions
      : partida.teamTotalDamage
      ? partida.teamTotalDamage / 5
      : 0;
  const teamAvgGoldEarned =
    typeof partida.teamAvgGoldEarned === "number" &&
    Number.isFinite(partida.teamAvgGoldEarned)
      ? partida.teamAvgGoldEarned
      : partida.teamTotalGold
      ? partida.teamTotalGold / 5
      : 0;
  const teamAvgKillParticipation =
    typeof partida.teamAvgKillParticipation === "number" &&
    Number.isFinite(partida.teamAvgKillParticipation)
      ? partida.teamAvgKillParticipation
      : 0;
  const teamAvgVisionScore =
    typeof partida.teamAvgVisionScore === "number" &&
    Number.isFinite(partida.teamAvgVisionScore)
      ? partida.teamAvgVisionScore
      : 0;
  const teamAvgCsPerMin =
    typeof partida.teamAvgCsPerMin === "number" &&
    Number.isFinite(partida.teamAvgCsPerMin)
      ? partida.teamAvgCsPerMin
      : 0;
  const teamAvgDamageToTurrets =
    typeof partida.teamAvgDamageToTurrets === "number" &&
    Number.isFinite(partida.teamAvgDamageToTurrets)
      ? partida.teamAvgDamageToTurrets
      : 0;

  const isBetterThanAvgDamage =
    teamAvgDamageToChampions > 0
      ? partida.damageToChampions > teamAvgDamageToChampions
      : false;
  const isBetterThanAvgGold =
    teamAvgGoldEarned > 0 ? partida.goldEarned > teamAvgGoldEarned : false;
  const isBetterThanAvgKP =
    teamAvgKillParticipation > 0
      ? killParticipation > teamAvgKillParticipation
      : false;
  const isBetterThanAvgVision =
    teamAvgVisionScore > 0 ? partida.visionScore > teamAvgVisionScore : false;
  const isBetterThanAvgCs =
    teamAvgCsPerMin > 0 ? partida.csPerMin > teamAvgCsPerMin : false;
  const isBetterThanAvgTurrets =
    teamAvgDamageToTurrets > 0
      ? partida.damageToTurrets > teamAvgDamageToTurrets
      : false;

  const resolvedUserColor =
    typeof userColor === "string" && userColor.trim()
      ? userColor.trim()
      : "#3b82f6";
  const userColorStyle = { "--user-color": resolvedUserColor } as CSSProperties;

  const renderComparativeBullet = (params: {
    label: string;
    valueLabel: string;
    value: number;
    avg: number;
    avgLabel?: string;
    deltaLabel?: string;
    isBetter: boolean;
  }) => {
    const max = params.avg > 0 ? params.avg * 2 : Math.max(params.value, 1);
    const valuePct =
      max > 0 ? Math.max(0, Math.min(100, (params.value / max) * 100)) : 0;
    const avgPct =
      params.avg > 0 && max > 0
        ? Math.max(0, Math.min(100, (params.avg / max) * 100))
        : 0;

    return (
      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold text-slate-800 dark:text-white/85">
            {params.label}
          </span>
          <div className="flex items-baseline gap-2">
            {params.deltaLabel && (
              <span
                className="text-[10px] font-semibold"
                style={{
                  color: resolvedUserColor,
                  opacity: params.isBetter ? 1 : 0.7,
                }}
              >
                {params.deltaLabel}
              </span>
            )}
            <span
              className="text-[11px] font-bold"
              style={{
                color: resolvedUserColor,
                opacity: params.isBetter ? 1 : 0.85,
              }}
            >
              {params.valueLabel}
            </span>
          </div>
        </div>

        <div className="relative h-2.5 rounded-full bg-white/35 dark:bg-white/10 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-slate-800/40 dark:bg-white/35"
            style={{ width: `${Math.max(2, valuePct)}%` }}
          />
          <div
            className="absolute -top-0.5 h-3.5 w-[2px] rounded-full bg-white/80 dark:bg-white/60"
            style={{ left: `calc(${avgPct}% - 1px)` }}
          />
          <div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-white/70 shadow"
            style={{
              left: `calc(${valuePct}% - 5px)`,
              backgroundColor: resolvedUserColor,
              opacity: params.isBetter ? 1 : 0.55,
            }}
          />
        </div>

        {params.avg > 0 && (
          <div className="text-[10px] text-slate-600 dark:text-white/50">
            Promedio equipo: {params.avgLabel ?? params.avg.toFixed(0)}
          </div>
        )}
      </div>
    );
  };

  const hasComparative =
    Boolean(partida.teamTotalDamage) ||
    Boolean(partida.teamTotalGold) ||
    Boolean(partida.teamTotalKills);
  const hasTeams = Boolean(partida.allPlayers && partida.allPlayers.length > 0);
  const mobileCarouselPages = (hasComparative ? 1 : 0) + 1 + (hasTeams ? 1 : 0);

  React.useEffect(() => {
    const el = mobileCarouselRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const children = Array.from(el.children) as HTMLElement[];
        if (children.length === 0) return;

        const scrollLeft = el.scrollLeft;
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (let i = 0; i < children.length; i += 1) {
          const distance = Math.abs(children[i].offsetLeft - scrollLeft);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
          }
        }

        setMobileCarouselIndex(bestIndex);
      });
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", onScroll);
    };
  }, [mobileCarouselPages]);

  return (
    <TooltipProvider delayDuration={150}>
      <Card
        className={`transition-shadow hover:shadow-xl border-none bg-white/70 dark:bg-slate-950/60 overflow-hidden ${
          isHidden ? "opacity-60" : ""
        }`}
      >
        <div className="relative min-h-[22rem]">
          {/* Splash art base */}
          <div className="absolute inset-0 overflow-hidden">
            <ChampionCenteredSplash
              championName={partida.championName}
              skinId={0}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/50 to-white/5 dark:from-black/20 dark:via-black/60 dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/0 to-white/10 dark:from-black/35 dark:via-black/35 dark:to-black/55" />
          </div>

          {/* Contenido superpuesto */}
          <div className="relative z-10 flex flex-col gap-4 p-4 sm:p-6 text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] ${outcomeBgClass} ${outcomeTextClass}`}
                  >
                    {isVictory ? "Victoria" : "Derrota"}
                  </span>
                  {partida.tier && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/85 px-1.5 py-1 text-slate-900 shadow-sm shadow-slate-900/10 backdrop-blur-[2px] dark:border-white/25 dark:bg-black/40 dark:text-white">
                      <RiotTierBadge
                        tier={partida.tier}
                        rank={partida.rank}
                        size="sm"
                      />
                      <span className="text-[11px] font-semibold tracking-wide">
                        {rankLabel}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm">
                    <Clock className="w-3 h-3" />
                    <span>{relativeTime}</span>
                  </div>
                  <ActivityCardMenu
                    activityType="lol_match"
                    activityId={partida.matchId}
                    isOwnProfile={isOwnProfile}
                    isAdmin={isAdmin}
                    onHide={onHide}
                    onUnhide={onUnhide}
                    isHidden={isHidden}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pr-1">
                <h3 className="text-2xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex items-center gap-2">
                  <span className="flex flex-col leading-none">
                    {sharedBy && (sharedBy.username || sharedBy.public_id) && (
                      <span className="text-[11px] font-semibold text-white/80">
                        {sharedBy.username ?? sharedBy.public_id}
                      </span>
                    )}
                    <span>{partida.championName}</span>
                  </span>
                  {isHidden && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-500/15 border border-amber-200/70 dark:border-amber-500/30 rounded-full px-2 py-0.5 ml-2">
                      <EyeOff className="w-3 h-3" /> Oculto para ti
                    </span>
                  )}
                </h3>
                {partida.rankingPosition && (
                  <div
                    className={`relative overflow-hidden flex items-center justify-center w-12 h-12 rounded-2xl font-bold text-xs tracking-tight border ${rankingBadgeClass}`}
                  >
                    <div className="flex flex-col items-center leading-tight text-slate-900 dark:text-white">
                      <span className="text-[10px] uppercase font-semibold opacity-80">
                        Rank
                      </span>
                      <span className="text-base font-semibold">
                        #{partida.rankingPosition}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1">
                {runeIconsWithTooltip}
                <div className="flex items-center gap-1">
                  {partida.summoner1Id > 0 && (
                    <div className="relative w-6 h-6 rounded bg-white/15 overflow-hidden">
                      <Image
                        src={getSummonerSpellUrl(
                          partida.summoner1Id,
                          ddragonVersion
                        )}
                        alt="Hechizo 1"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  {partida.summoner2Id > 0 && (
                    <div className="relative w-6 h-6 rounded bg-white/15 overflow-hidden">
                      <Image
                        src={getSummonerSpellUrl(
                          partida.summoner2Id,
                          ddragonVersion
                        )}
                        alt="Hechizo 2"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-white/85">
                <span className="font-medium">{queueName}</span>
                <span>•</span>
                <span>{durationLabel}</span>
              </div>
            </div>

            {/* Items centrados en una sola línea */}
            <div className="flex justify-center flex-wrap gap-2 mt-2">
              {partida.items.slice(0, 6).map((itemId, idx) => (
                <div
                  key={idx}
                  className="relative w-10 h-10 rounded border border-slate-200/80 overflow-hidden bg-white/95 shadow-sm dark:border-white/20 dark:bg-white/10"
                >
                  {itemId > 0 && (
                    <Image
                      src={getItemImageUrl(itemId, ddragonVersion)}
                      alt={`Item ${itemId}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Zona de comparativa + estadísticas + jugadores */}
            <div className="mt-3">
              <div className="sm:hidden">
                <div className="relative">
                  <div
                    ref={mobileCarouselRef}
                    className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-2"
                  >
                    {hasComparative && (
                      <div className="snap-center w-[88%] shrink-0">
                        <div className="space-y-3 p-3 rounded-xl border border-slate-200/60 bg-white dark:border-white/10 dark:bg-slate-950">
                          <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-white/70 tracking-wide">
                            Comparativa vs Equipo
                          </h4>

                          {partida.teamTotalDamage &&
                            renderComparativeBullet({
                              label: "Daño a Campeones",
                              valueLabel: `${(
                                partida.damageToChampions / 1000
                              ).toFixed(1)}k`,
                              value: partida.damageToChampions,
                              avg: teamAvgDamageToChampions,
                              avgLabel: `${(
                                teamAvgDamageToChampions / 1000
                              ).toFixed(1)}k`,
                              deltaLabel:
                                teamAvgDamageToChampions > 0
                                  ? (() => {
                                      const delta =
                                        (partida.damageToChampions /
                                          teamAvgDamageToChampions -
                                          1) *
                                        100;
                                      const sign = delta >= 0 ? "+" : "";
                                      return `${sign}${delta.toFixed(0)}%`;
                                    })()
                                  : undefined,
                              isBetter: isBetterThanAvgDamage,
                            })}

                          {partida.teamTotalKills &&
                            teamAvgKillParticipation > 0 &&
                            renderComparativeBullet({
                              label: "Participación en Kills",
                              valueLabel: `${killParticipation.toFixed(0)}%`,
                              value: killParticipation,
                              avg: teamAvgKillParticipation,
                              avgLabel: `${teamAvgKillParticipation.toFixed(
                                0
                              )}%`,
                              deltaLabel: (() => {
                                const delta =
                                  killParticipation - teamAvgKillParticipation;
                                const sign = delta >= 0 ? "+" : "";
                                return `${sign}${delta.toFixed(0)}pp`;
                              })(),
                              isBetter: isBetterThanAvgKP,
                            })}

                          {partida.teamTotalGold &&
                            renderComparativeBullet({
                              label: "Oro",
                              valueLabel: `${(
                                partida.goldEarned / 1000
                              ).toFixed(1)}k`,
                              value: partida.goldEarned,
                              avg: teamAvgGoldEarned,
                              avgLabel: `${(teamAvgGoldEarned / 1000).toFixed(
                                1
                              )}k`,
                              deltaLabel:
                                teamAvgGoldEarned > 0
                                  ? (() => {
                                      const delta =
                                        (partida.goldEarned /
                                          teamAvgGoldEarned -
                                          1) *
                                        100;
                                      const sign = delta >= 0 ? "+" : "";
                                      return `${sign}${delta.toFixed(0)}%`;
                                    })()
                                  : undefined,
                              isBetter: isBetterThanAvgGold,
                            })}

                          {teamAvgVisionScore > 0 &&
                            renderComparativeBullet({
                              label: "Visión",
                              valueLabel: `${partida.visionScore}`,
                              value: partida.visionScore,
                              avg: teamAvgVisionScore,
                              avgLabel: `${teamAvgVisionScore.toFixed(0)}`,
                              deltaLabel: (() => {
                                const delta =
                                  (partida.visionScore / teamAvgVisionScore -
                                    1) *
                                  100;
                                const sign = delta >= 0 ? "+" : "";
                                return `${sign}${delta.toFixed(0)}%`;
                              })(),
                              isBetter: isBetterThanAvgVision,
                            })}

                          {teamAvgCsPerMin > 0 &&
                            renderComparativeBullet({
                              label: "CS/min",
                              valueLabel: `${partida.csPerMin.toFixed(1)}/m`,
                              value: partida.csPerMin,
                              avg: teamAvgCsPerMin,
                              avgLabel: `${teamAvgCsPerMin.toFixed(1)}/m`,
                              deltaLabel: (() => {
                                const delta =
                                  (partida.csPerMin / teamAvgCsPerMin - 1) *
                                  100;
                                const sign = delta >= 0 ? "+" : "";
                                return `${sign}${delta.toFixed(0)}%`;
                              })(),
                              isBetter: isBetterThanAvgCs,
                            })}

                          {teamAvgDamageToTurrets > 0 &&
                            renderComparativeBullet({
                              label: "Daño a torres",
                              valueLabel: `${(
                                partida.damageToTurrets / 1000
                              ).toFixed(1)}k`,
                              value: partida.damageToTurrets,
                              avg: teamAvgDamageToTurrets,
                              avgLabel: `${(
                                teamAvgDamageToTurrets / 1000
                              ).toFixed(1)}k`,
                              deltaLabel: (() => {
                                const delta =
                                  (partida.damageToTurrets /
                                    teamAvgDamageToTurrets -
                                    1) *
                                  100;
                                const sign = delta >= 0 ? "+" : "";
                                return `${sign}${delta.toFixed(0)}%`;
                              })(),
                              isBetter: isBetterThanAvgTurrets,
                            })}
                        </div>
                      </div>
                    )}

                    <div className="snap-center w-[88%] shrink-0">
                      <div className="p-3 rounded-xl border border-slate-200/60 bg-white dark:border-white/10 dark:bg-slate-950">
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            {
                              label: "KDA",
                              value: `${partida.kills}/${partida.deaths}/${partida.assists}`,
                              sub: `${partida.kda.toFixed(2)}`,
                              accentClass: outcomeTextClass,
                            },
                            {
                              label: "CS",
                              value: partida.totalCS.toString(),
                              sub: `${partida.csPerMin.toFixed(1)}/m`,
                            },
                            {
                              label: "Visión avanzada",
                              value: partida.visionScore.toString(),
                              sub: "score",
                            },
                            {
                              label: "Daño",
                              value: `${(
                                partida.damageToChampions / 1000
                              ).toFixed(1)}k`,
                              sub: "champ",
                            },
                            {
                              label: "Oro",
                              value: `${(partida.goldEarned / 1000).toFixed(
                                1
                              )}k`,
                              sub: "total",
                            },
                            {
                              label: "Torres",
                              value: `${(
                                partida.damageToTurrets / 1000
                              ).toFixed(1)}k`,
                              sub: "dmg",
                            },
                          ].map((stat) => (
                            <div
                              key={stat.label}
                              className="relative overflow-hidden rounded-lg border border-slate-200/60 bg-white px-1.5 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-slate-950"
                            >
                              <div className="text-[8px] uppercase tracking-tight text-slate-700 dark:text-white/60 font-bold">
                                {stat.label}
                              </div>
                              <div
                                className={`mt-0.5 text-xs font-semibold leading-tight ${
                                  stat.accentClass ??
                                  "text-slate-900 dark:text-white"
                                }`}
                              >
                                {stat.value}
                              </div>
                              {stat.sub && (
                                <div className="text-[7px] text-slate-600 dark:text-white/50 font-semibold">
                                  {stat.sub}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {displayTags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 justify-center">
                            {displayTags.map((tag) => {
                              const tagInfo = getTagInfo(tag);
                              return (
                                <Tooltip key={tag}>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded-full font-semibold text-[10px] sm:text-[11px] ${tagInfo.color} cursor-help`}
                                    >
                                      {tagInfo.label}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    <p>{tagInfo.label}</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {hasTeams && (
                      <div className="snap-center w-[88%] shrink-0">
                        <div className="p-3 rounded-xl border border-slate-200/60 bg-white dark:border-white/10 dark:bg-slate-950">
                          <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-white/70 tracking-wide mb-2">
                            Equipos
                          </h4>
                          {(() => {
                            const rolePriority: Record<string, number> = {
                              TOP: 1,
                              JG: 2,
                              JUN: 2,
                              JUNGLE: 2,
                              MID: 3,
                              MIDDLE: 3,
                              ADC: 4,
                              BOT: 4,
                              BOTTOM: 4,
                              CARRY: 4,
                              DUO_CARRY: 4,
                              SUP: 5,
                              SUPP: 5,
                              SUPPORT: 5,
                              UTILITY: 5,
                              DUO_SUPPORT: 5,
                            };
                            const normalizeRole = (raw: unknown): string => {
                              if (typeof raw !== "string") return "";
                              const value = raw.trim().toUpperCase();
                              if (!value) return "";
                              if (
                                value === "JUNGLE" ||
                                value === "JG" ||
                                value === "JUN"
                              )
                                return "JUNGLE";
                              if (value === "MID" || value === "MIDDLE")
                                return "MID";
                              if (
                                value === "BOT" ||
                                value === "BOTTOM" ||
                                value === "ADC" ||
                                value === "CARRY" ||
                                value === "DUO_CARRY"
                              )
                                return "BOT";
                              if (
                                value === "SUP" ||
                                value === "SUPP" ||
                                value === "SUPPORT" ||
                                value === "UTILITY" ||
                                value === "DUO_SUPPORT"
                              )
                                return "SUP";
                              if (value === "TOP") return "TOP";
                              return value;
                            };
                            const sortByRole = (a: any, b: any) =>
                              (rolePriority[normalizeRole(a.role)] || 99) -
                              (rolePriority[normalizeRole(b.role)] || 99);
                            const blue = partida.allPlayers
                              .filter((p) => p.team === "blue")
                              .sort(sortByRole);
                            const red = partida.allPlayers
                              .filter((p) => p.team === "red")
                              .sort(sortByRole);

                            const renderPlayer = (
                              player: (typeof partida.allPlayers)[number],
                              idx: number
                            ) => {
                              const champKey =
                                player.championName === "FiddleSticks"
                                  ? "Fiddlesticks"
                                  : player.championName.replace(/\s+/g, "");
                              return (
                                <div
                                  key={`${player.team}-${idx}`}
                                  className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60"
                                >
                                  <div className="relative w-6 h-6 rounded overflow-hidden bg-white/70 dark:bg-white/15 shrink-0">
                                    <Image
                                      src={getChampionImageUrl(
                                        champKey,
                                        ddragonVersion
                                      )}
                                      alt={player.championName}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="text-[10px] font-bold text-slate-900 dark:text-white truncate cursor-help">
                                          {player.summonerName}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        {player.summonerName}
                                      </TooltipContent>
                                    </Tooltip>
                                    <div className="text-[9px] text-slate-700 dark:text-white/70 truncate">
                                      {player.championName}
                                    </div>
                                    <div className="text-[8px] text-slate-600 dark:text-white/60">
                                      {player.kills}/{player.deaths}/
                                      {player.assists}
                                    </div>
                                  </div>
                                </div>
                              );
                            };

                            return (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  {blue.map((p, idx) => renderPlayer(p, idx))}
                                </div>
                                <div className="space-y-1.5">
                                  {red.map((p, idx) => renderPlayer(p, idx))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {mobileCarouselPages > 1 && (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      {Array.from({ length: mobileCarouselPages }).map(
                        (_, idx) => (
                          <span
                            key={idx}
                            className={`h-1.5 w-1.5 rounded-full transition-colors ${
                              idx === mobileCarouselIndex
                                ? "bg-slate-900/80 dark:bg-white/80"
                                : "bg-slate-500/30 dark:bg-white/20"
                            }`}
                          />
                        )
                      )}
                    </div>
                  )}

                  {mobileCarouselPages > 1 && null}
                </div>
              </div>

              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-12 gap-4">
                {(partida.teamTotalDamage ||
                  partida.teamTotalGold ||
                  partida.teamTotalKills) && (
                  <div className="sm:col-span-4 space-y-3 p-3 rounded-xl border border-slate-200/60 bg-white dark:border-white/10 dark:bg-slate-950">
                    <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-white/70 tracking-wide">
                      Comparativa vs Equipo
                    </h4>

                    {partida.teamTotalDamage &&
                      renderComparativeBullet({
                        label: "Daño a Campeones",
                        valueLabel: `${(
                          partida.damageToChampions / 1000
                        ).toFixed(1)}k`,
                        value: partida.damageToChampions,
                        avg: teamAvgDamageToChampions,
                        avgLabel: `${(teamAvgDamageToChampions / 1000).toFixed(
                          1
                        )}k`,
                        deltaLabel:
                          teamAvgDamageToChampions > 0
                            ? `${(
                                (partida.damageToChampions /
                                  teamAvgDamageToChampions -
                                  1) *
                                100
                              ).toFixed(0)}%`
                            : undefined,
                        isBetter: isBetterThanAvgDamage,
                      })}

                    {partida.teamTotalKills &&
                      teamAvgKillParticipation > 0 &&
                      renderComparativeBullet({
                        label: "Participación en Kills",
                        valueLabel: `${killParticipation.toFixed(0)}%`,
                        value: killParticipation,
                        avg: teamAvgKillParticipation,
                        avgLabel: `${teamAvgKillParticipation.toFixed(0)}%`,
                        deltaLabel: `${(
                          killParticipation - teamAvgKillParticipation
                        ).toFixed(0)}pp`,
                        isBetter: isBetterThanAvgKP,
                      })}

                    {partida.teamTotalGold &&
                      renderComparativeBullet({
                        label: "Oro",
                        valueLabel: `${(partida.goldEarned / 1000).toFixed(
                          1
                        )}k`,
                        value: partida.goldEarned,
                        avg: teamAvgGoldEarned,
                        avgLabel: `${(teamAvgGoldEarned / 1000).toFixed(1)}k`,
                        deltaLabel:
                          teamAvgGoldEarned > 0
                            ? `${(
                                (partida.goldEarned / teamAvgGoldEarned - 1) *
                                100
                              ).toFixed(0)}%`
                            : undefined,
                        isBetter: isBetterThanAvgGold,
                      })}

                    {teamAvgVisionScore > 0 &&
                      renderComparativeBullet({
                        label: "Visión",
                        valueLabel: `${partida.visionScore}`,
                        value: partida.visionScore,
                        avg: teamAvgVisionScore,
                        avgLabel: `${teamAvgVisionScore.toFixed(0)}`,
                        deltaLabel: (() => {
                          const delta =
                            (partida.visionScore / teamAvgVisionScore - 1) *
                            100;
                          const sign = delta >= 0 ? "+" : "";
                          return `${sign}${delta.toFixed(0)}%`;
                        })(),
                        isBetter: isBetterThanAvgVision,
                      })}

                    {teamAvgCsPerMin > 0 &&
                      renderComparativeBullet({
                        label: "CS/min",
                        valueLabel: `${partida.csPerMin.toFixed(1)}/m`,
                        value: partida.csPerMin,
                        avg: teamAvgCsPerMin,
                        avgLabel: `${teamAvgCsPerMin.toFixed(1)}/m`,
                        deltaLabel: (() => {
                          const delta =
                            (partida.csPerMin / teamAvgCsPerMin - 1) * 100;
                          const sign = delta >= 0 ? "+" : "";
                          return `${sign}${delta.toFixed(0)}%`;
                        })(),
                        isBetter: isBetterThanAvgCs,
                      })}

                    {teamAvgDamageToTurrets > 0 &&
                      renderComparativeBullet({
                        label: "Daño a torres",
                        valueLabel: `${(partida.damageToTurrets / 1000).toFixed(
                          1
                        )}k`,
                        value: partida.damageToTurrets,
                        avg: teamAvgDamageToTurrets,
                        avgLabel: `${(teamAvgDamageToTurrets / 1000).toFixed(
                          1
                        )}k`,
                        deltaLabel: (() => {
                          const delta =
                            (partida.damageToTurrets / teamAvgDamageToTurrets -
                              1) *
                            100;
                          const sign = delta >= 0 ? "+" : "";
                          return `${sign}${delta.toFixed(0)}%`;
                        })(),
                        isBetter: isBetterThanAvgTurrets,
                      })}
                  </div>
                )}

                <div className="sm:col-span-4">
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      {
                        label: "KDA",
                        value: `${partida.kills}/${partida.deaths}/${partida.assists}`,
                        sub: `${partida.kda.toFixed(2)}`,
                        accentClass: outcomeTextClass,
                      },
                      {
                        label: "CS",
                        value: partida.totalCS.toString(),
                        sub: `${partida.csPerMin.toFixed(1)}/m`,
                      },
                      {
                        label: "Visión avanzada",
                        value: partida.visionScore.toString(),
                        sub: "score",
                      },
                      {
                        label: "Daño",
                        value: `${(partida.damageToChampions / 1000).toFixed(
                          1
                        )}k`,
                        sub: "champ",
                      },
                      {
                        label: "Oro",
                        value: `${(partida.goldEarned / 1000).toFixed(1)}k`,
                        sub: "total",
                      },
                      {
                        label: "Torres",
                        value: `${(partida.damageToTurrets / 1000).toFixed(
                          1
                        )}k`,
                        sub: "dmg",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="relative overflow-hidden rounded-lg border border-slate-200/60 bg-white px-1.5 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-slate-950"
                      >
                        <div className="text-[8px] uppercase tracking-tight text-slate-700 dark:text-white/60 font-bold">
                          {stat.label}
                        </div>
                        <div
                          className={`mt-0.5 text-xs font-semibold leading-tight ${
                            stat.accentClass ?? "text-slate-900 dark:text-white"
                          }`}
                        >
                          {stat.value}
                        </div>
                        {stat.sub && (
                          <div className="text-[7px] text-slate-600 dark:text-white/50 font-semibold">
                            {stat.sub}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {displayTags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 justify-center">
                      {displayTags.map((tag) => {
                        const tagInfo = getTagInfo(tag);
                        return (
                          <Tooltip key={tag}>
                            <TooltipTrigger asChild>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full font-semibold text-[10px] sm:text-[11px] ${tagInfo.color} cursor-help`}
                              >
                                {tagInfo.label}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              <p>{tagInfo.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}
                </div>

                {partida.allPlayers && partida.allPlayers.length > 0 && (
                  <div className="sm:col-span-4 p-3 rounded-xl border border-slate-200/60 bg-white dark:border-white/10 dark:bg-slate-950">
                    <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-white/70 tracking-wide mb-2">
                      Equipos
                    </h4>
                    {(() => {
                      const rolePriority: Record<string, number> = {
                        TOP: 1,
                        JG: 2,
                        JUN: 2,
                        JUNGLE: 2,
                        MID: 3,
                        MIDDLE: 3,
                        ADC: 4,
                        BOT: 4,
                        BOTTOM: 4,
                        CARRY: 4,
                        DUO_CARRY: 4,
                        SUP: 5,
                        SUPP: 5,
                        SUPPORT: 5,
                        UTILITY: 5,
                        DUO_SUPPORT: 5,
                      };
                      const normalizeRole = (raw: unknown): string => {
                        if (typeof raw !== "string") return "";
                        const value = raw.trim().toUpperCase();
                        if (!value) return "";
                        if (
                          value === "JUNGLE" ||
                          value === "JG" ||
                          value === "JUN"
                        )
                          return "JUNGLE";
                        if (value === "MID" || value === "MIDDLE") return "MID";
                        if (
                          value === "BOT" ||
                          value === "BOTTOM" ||
                          value === "ADC" ||
                          value === "CARRY" ||
                          value === "DUO_CARRY"
                        )
                          return "BOT";
                        if (
                          value === "SUP" ||
                          value === "SUPP" ||
                          value === "SUPPORT" ||
                          value === "UTILITY" ||
                          value === "DUO_SUPPORT"
                        )
                          return "SUP";
                        if (value === "TOP") return "TOP";
                        return value;
                      };
                      const sortByRole = (a: any, b: any) =>
                        (rolePriority[normalizeRole(a.role)] || 99) -
                        (rolePriority[normalizeRole(b.role)] || 99);
                      const blue = partida.allPlayers
                        .filter((p) => p.team === "blue")
                        .sort(sortByRole);
                      const red = partida.allPlayers
                        .filter((p) => p.team === "red")
                        .sort(sortByRole);

                      const renderPlayer = (
                        player: (typeof partida.allPlayers)[number],
                        idx: number
                      ) => {
                        const champKey =
                          player.championName === "FiddleSticks"
                            ? "Fiddlesticks"
                            : player.championName.replace(/\s+/g, "");
                        return (
                          <div
                            key={`${player.team}-${idx}`}
                            className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60"
                          >
                            <div className="relative w-6 h-6 rounded overflow-hidden bg-white/70 dark:bg-white/15 shrink-0">
                              <Image
                                src={getChampionImageUrl(
                                  champKey,
                                  ddragonVersion
                                )}
                                alt={player.championName}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div className="min-w-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-[10px] font-bold text-slate-900 dark:text-white truncate cursor-help">
                                    {player.summonerName}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  {player.summonerName}
                                </TooltipContent>
                              </Tooltip>
                              <div className="text-[9px] text-slate-700 dark:text-white/70 truncate">
                                {player.championName}
                              </div>
                              <div className="text-[8px] text-slate-600 dark:text-white/60">
                                {player.kills}/{player.deaths}/{player.assists}
                              </div>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            {blue.map((p, idx) => renderPlayer(p, idx))}
                          </div>
                          <div className="space-y-1.5">
                            {red.map((p, idx) => renderPlayer(p, idx))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Comentario */}
            {partida.comment && (
              <div className="bg-white/90 border border-slate-200 rounded p-3 text-sm text-slate-800 italic shadow-sm dark:bg-white/10 dark:border-white/20 dark:text-white/90">
                "{partida.comment}"
              </div>
            )}

            {/* Footer acciones */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={`/match/${partida.matchId}`}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-slate-900/20 transition hover:bg-slate-800 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
              >
                Abrir análisis
                <ExternalLink className="w-4 h-4" />
              </Link>
              <div className="ml-auto flex items-center">
                {isOwnProfile && onDelete && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-600 hover:bg-slate-900/5 dark:text-white/80 dark:hover:bg-white/10"
                        aria-label="Acciones de la partida"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        disabled={deletingId === partida.entryId}
                        className="text-red-600 focus:text-red-600"
                        onSelect={(event) => {
                          event.preventDefault();
                          onDelete(partida.entryId);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                        {deletingId === partida.entryId
                          ? "Eliminando..."
                          : "Eliminar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
};
