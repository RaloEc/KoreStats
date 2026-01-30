"use client";

import Image from "next/image";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useRef, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfileQuery, authKeys } from "@/hooks/useAuthQuery";
import useEmblaCarousel from "embla-carousel-react";
import { usePlayerNotes, type PlayerNote } from "@/hooks/use-player-notes";
import {
  StickyNote,
  ChevronDown,
  ChevronUp,
  Users,
  Eye,
  Coins,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getChampionImg,
  getSpellImg,
  getRuneStyleImg,
  getItemImg,
} from "@/lib/riot/helpers";
import {
  formatDuration,
  getQueueName,
} from "@/components/riot/match-card/helpers";
import { usePerkAssets } from "@/components/riot/match-card/RunesTooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getFrequentTeammates, type FrequentTeammate } from "./TeammateTracker";
import { type Match } from "./match-card/MatchCard";
import {
  useLiveGameRealtime,
  type LivePlayerLCU,
} from "@/hooks/use-live-game-realtime";

type SpectatorPerks = {
  perkIds: number[];
  perkStyle: number | null;
  perkSubStyle: number | null;
};

type ActiveParticipant = {
  teamId: 100 | 200;
  position: string | null;
  summonerName: string;
  puuid: string | null;
  championId: number;
  championName: string | null;
  spell1Id: number;
  spell2Id: number;
  perks: SpectatorPerks | null;
};

type ActiveMatchResponse =
  | {
      hasActiveMatch: false;
      reason: string;
    }
  | {
      hasActiveMatch: true;
      reason: string;
      gameId: number | null;
      gameStartTime: number | null;
      gameLength: number | null;
      queueId: number | null;
      mapId: number | null;
      gameMode: string | null;
      gameType: string | null;
      platformId: string | null;
      elapsedSeconds: number | null;
      phase?: string;
      teams: {
        team100: ActiveParticipant[];
        team200: ActiveParticipant[];
      };
      isApiFallback?: boolean;
    };

const PHASE_LABELS: Record<
  string,
  { label: string; color: string; ring: string }
> = {
  InProgress: {
    label: "LIVE",
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    ring: "bg-rose-500",
  },
  ChampSelect: {
    label: "SELECCIÓN",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    ring: "bg-blue-500",
  },
  Matchmaking: {
    label: "BUSCANDO",
    color:
      "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    ring: "bg-amber-500",
  },
  ReadyCheck: {
    label: "ACEPTANDO",
    color:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    ring: "bg-purple-500",
  },
  Lobby: {
    label: "SALA",
    color:
      "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
    ring: "bg-slate-400",
  },
  CheckedIntoTournament: {
    label: "CLASH",
    color:
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    ring: "bg-indigo-500",
  },
  BAN_PICK: {
    label: "SELECCIÓN",
    color:
      "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
    ring: "bg-fuchsia-500",
  },
};

const GAMEMODE_LABELS: Record<string, string> = {
  CLASSIC: "Normal",
  RANKED_SOLO_5x5: "SoloQ",
  RANKED_FLEX_SR: "Flex",
  ARAM: "ARAM",
  URF: "URF",
  ONEFORALL: "Uno para todos",
  PRACTICETOOL: "Práctica",
  TUTORIAL: "Tutorial",
  NEXUSBLITZ: "Nexus Blitz",
  ULTBOOK: "Libro de Hechizos",
  CHERRY: "Arena",
  KIWI: "ARAM",
};

function getQueueDisplayName(realtimeData: any): string | null {
  const queueDesc = realtimeData?.gameData?.gameData?.queue?.description;
  if (queueDesc && typeof queueDesc === "string") {
    if (queueDesc.includes("Solo/Dúo")) return "SoloQ";
    if (queueDesc.includes("Flex")) return "Flex";
    if (queueDesc.includes("ARAM")) return "ARAM";
    if (queueDesc.includes("Normal")) return "Normal";
    if (queueDesc.includes("Práctica")) return "Práctica";
    return queueDesc.split(" ").slice(0, 2).join(" ");
  }
  const gameMode =
    realtimeData?.liveData?.gameData?.gameMode ??
    realtimeData?.gameData?.gameMode;
  if (gameMode && GAMEMODE_LABELS[gameMode]) return GAMEMODE_LABELS[gameMode];
  const mapName = realtimeData?.gameData?.map?.name;
  if (mapName) {
    if (mapName.includes("ARAM") || mapName.includes("aleatorio"))
      return "ARAM";
    if (mapName.includes("Grieta")) return "Grieta";
  }
  return null;
}

const ROLE_ORDER: Array<{ key: string; label: string }> = [
  { key: "TOP", label: "TOP" },
  { key: "JUNGLE", label: "JGL" },
  { key: "MIDDLE", label: "MID" },
  { key: "BOTTOM", label: "BOT" },
  { key: "UTILITY", label: "SUP" },
];

function sortByRoleOrder(a: ActiveParticipant, b: ActiveParticipant): number {
  const order: Record<string, number> = {
    TOP: 1,
    JUNGLE: 2,
    MIDDLE: 3,
    BOTTOM: 4,
    UTILITY: 5,
  };

  const getHeuristicScore = (p: ActiveParticipant): number => {
    const pos = normalizePosition(p.position);
    const spells = [p.spell1Id, p.spell2Id];

    // Explicit position Handling
    if (pos && order[pos]) {
      // Special case: If marked BOTTOM/UTILITY, double check with spells to differentiate ADC vs Support
      // API sometimes marks both as BOTTOM.
      if (pos === "BOTTOM") {
        if (spells.includes(3)) return 5; // Exhaust -> Suggests Support
        // Ignite usually Support if not Mid, but hard to say.
        // If we have Heal (7), it's definitely ADC (4).
      }
      return order[pos];
    }

    // Heuristics based on spells if no position
    if (spells.includes(11)) return 2; // Smite -> Jungle
    if (spells.includes(7)) return 4; // Heal -> Bot
    if (spells.includes(3)) return 5; // Exhaust -> Support (often)
    if (spells.includes(12)) return 1; // Teleport -> Top (often)
    if (spells.includes(14)) return 3; // Ignite -> Mid (default fallback for aggro)

    return 6; // Unknown
  };

  const scoreA = getHeuristicScore(a);
  const scoreB = getHeuristicScore(b);

  if (scoreA !== scoreB) return scoreA - scoreB;

  // Tie-breaker: If same score (e.g. both BOTTOM), try to push Support-like spells later
  // Exhaust (3), Ignite (14) -> Higher index (Support)
  // Heal (7), Ghost (6), Cleanse (1), Barrier (21) -> Lower index (ADC)
  const isSuppSpell = (id: number) => id === 3 || id === 14;
  const isAdcSpell = (id: number) =>
    id === 7 || id === 6 || id === 1 || id === 21;

  const spellsA = [a.spell1Id, a.spell2Id];
  const spellsB = [b.spell1Id, b.spell2Id];

  const aIsSupp = spellsA.some(isSuppSpell);
  const bIsSupp = spellsB.some(isSuppSpell);
  const aIsAdc = spellsA.some(isAdcSpell);
  const bIsAdc = spellsB.some(isAdcSpell);

  // If A looks like Supp and B like ADC, B comes first (ADC < Supp)
  if (aIsSupp && bIsAdc) return 1;
  if (aIsAdc && bIsSupp) return -1;

  return 0;
}

function normalizePosition(value: string | null): string | null {
  if (!value) return null;
  const raw = value.toUpperCase();
  if (raw === "MID") return "MIDDLE";
  if (raw === "BOT") return "BOTTOM";
  if (raw === "SUPPORT") return "UTILITY";
  return raw;
}

function pickKeystoneId(perks: SpectatorPerks | null): number | null {
  const first = perks?.perkIds?.[0];
  return typeof first === "number" && first > 0 ? first : null;
}

function assignParticipantsToRoles(
  participants: ActiveParticipant[],
  roles: Array<{ key: string; label: string }>,
): Map<string, ActiveParticipant> {
  const byRole = new Map<string, ActiveParticipant>();
  const leftovers: ActiveParticipant[] = [];

  // Sort participants first to prioritize those with roles/smite
  const sorted = [...participants].sort(sortByRoleOrder);

  for (const p of sorted) {
    let pos = normalizePosition(p.position);

    // Si no hay posición explícita (API Spectator), intentamos asignarla por hechizos
    if (!pos) {
      const spells = [p.spell1Id, p.spell2Id];
      // 1. Prioridad Absoluta: JUNGLE (Smite)
      if (spells.includes(11)) {
        pos = "JUNGLE";
      }
      // 2. Prioridad Alta: ADC (Heal) - Solo si JUNGLE no lo reclamó
      else if (spells.includes(7)) {
        if (!byRole.has("BOTTOM")) pos = "BOTTOM";
      }
      // NOTA: No asignamos UTILITY/TOP/MID aquí. Dejamos que el ordenamiento se encargue
      // de empujarlos a los huecos libres (leftovers) que se rellenan en orden (Top->Jgl->Mid->Bot->Sup).
      // Como Jgl y Bot ya están cogidos, los restantes (Top/Mid/Sup) irán a sus huecos naturales si el sort funciona.
    }

    if (pos && roles.some((r) => r.key === pos) && !byRole.has(pos)) {
      byRole.set(pos, p);
    } else {
      leftovers.push(p);
    }
  }
  for (const role of roles) {
    if (byRole.has(role.key)) continue;
    const next = leftovers.shift();
    if (!next) break;
    byRole.set(role.key, next);
  }
  return byRole;
}

function formatElapsed(seconds: number | null): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0)
    return "";
  return formatDuration(Math.floor(seconds));
}

// ... existing CompactParticipantRow and ParticipantRow ...

// Inside ActiveMatchCard component logic (search for t100 mapToPart logic)
// Updating the segment where t100/t200 is created to include sort.

const CHAMPION_NAME_FIXES: Record<string, string> = {
  "Xin Zhao": "XinZhao",
  "Dr. Mundo": "DrMundo",
  "Lee Sin": "LeeSin",
  "Master Yi": "MasterYi",
  "Maestro Yi": "MasterYi",
  "Jarvan IV": "JarvanIV",
  "Miss Fortune": "MissFortune",
  "Tahm Kench": "TahmKench",
  "Twisted Fate": "TwistedFate",
  "Aurelion Sol": "AurelionSol",
  "Kog'Maw": "KogMaw",
  "Rek'Sai": "RekSai",
  "Vel'Koz": "Velkoz",
  "Kha'Zix": "Khazix",
  "Cho'Gath": "Chogath",
  "Kai'Sa": "Kaisa",
  LeBlanc: "Leblanc",
  "Bel'Veth": "Belveth",
  "K'Sante": "KSante",
  "Nunu & Willump": "Nunu",
  "Nunu y Willump": "Nunu",
  "Renata Glasc": "Renata",
  FiddleSticks: "Fiddlesticks",
  Wukong: "MonkeyKing",
  Nunu: "Nunu",
};

function CompactParticipantRow({
  participant,
  side,
  perkIconById,
  note,
  isFrequent,
  liveStats,
}: {
  participant: ActiveParticipant | null;
  side: "blue" | "red";
  perkIconById: Record<number, string>;
  note?: PlayerNote;
  isFrequent?: boolean;
  liveStats?: LivePlayerLCU;
}) {
  if (!participant) {
    return (
      <div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 p-1 dark:border-slate-800/60 dark:bg-slate-900/30 h-[34px]">
        <div className="aspect-square h-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800/60" />
      </div>
    );
  }

  const fixedName = participant.championName
    ? CHAMPION_NAME_FIXES[participant.championName] || participant.championName
    : null;
  const championImg = fixedName ? getChampionImg(fixedName) : null;
  const spell1 = getSpellImg(participant.spell1Id);
  const spell2 = getSpellImg(participant.spell2Id);
  const nameColor =
    side === "blue"
      ? "text-sky-700 dark:text-sky-300"
      : "text-rose-700 dark:text-rose-300";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded border p-1 transition-all relative overflow-hidden h-[38px]",
        isFrequent
          ? "border-emerald-500/30 bg-emerald-50/30 dark:border-emerald-500/30 dark:bg-emerald-500/5 ring-1 ring-emerald-500/10"
          : "border-slate-200 bg-white dark:border-slate-800/60 dark:bg-slate-900/30",
      )}
    >
      {liveStats?.isDead && (
        <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10 pointer-events-none z-0" />
      )}
      <div className="relative h-[28px] w-[28px] flex-shrink-0 overflow-hidden rounded-[4px]">
        {championImg ? (
          <>
            <Image
              src={championImg}
              alt={fixedName ?? "Champion"}
              fill
              sizes="28px"
              className={cn("object-cover", liveStats?.isDead && "grayscale")}
            />
            {liveStats?.isDead && liveStats.respawnTimer > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white font-bold text-[10px]">
                {Math.ceil(liveStats.respawnTimer)}
              </div>
            )}
            {liveStats && !liveStats.isDead && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[6px] text-white text-center font-medium leading-none py-px">
                {liveStats.level}
              </div>
            )}
          </>
        ) : (
          <div className="h-full w-full bg-slate-200 dark:bg-slate-800" />
        )}
      </div>
      <div className="min-w-0 flex-1 z-10 flex items-center justify-between">
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1">
            <div className={`truncate text-[11px] font-bold ${nameColor}`}>
              {participant.summonerName}
            </div>
            {isFrequent && (
              <Users
                size={10}
                className="text-emerald-500 dark:text-emerald-400 opacity-80"
              />
            )}
          </div>
          {!liveStats ? (
            <div className="truncate text-[9px] text-slate-500 dark:text-slate-400 leading-none">
              {fixedName ?? `Champ ${participant.championId}`}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[9px] font-medium leading-none text-slate-500 dark:text-slate-400">
              <span className="text-slate-900 dark:text-slate-200">
                {liveStats.kills}/{liveStats.deaths}/{liveStats.assists}
              </span>
              <span className="opacity-50">•</span>
              <span>{liveStats.creepScore} CS</span>
              {liveStats.currentGold !== undefined &&
                Number(liveStats.currentGold) > 0 && (
                  <>
                    <span className="opacity-50">•</span>
                    <span className="text-amber-600 dark:text-amber-500">
                      {(Number(liveStats.currentGold) / 1000).toFixed(1)}k
                    </span>
                  </>
                )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 pl-1">
          {liveStats?.items && (
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const itemId = liveStats.items![idx] || 0;
                return (
                  <div
                    key={`item-c-${idx}`}
                    className="relative w-4 h-4 rounded-sm overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50"
                  >
                    {itemId > 0 && (
                      <Image
                        src={getItemImg(itemId) || ""}
                        alt="I"
                        fill
                        sizes="16px"
                        className="object-cover"
                      />
                    )}
                  </div>
                );
              })}
              <div className="w-px h-3 bg-slate-300 dark:bg-slate-700 mx-0.5" />
              <div className="relative w-4 h-4 rounded-sm overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50">
                {(liveStats.items[6] || 0) > 0 && (
                  <Image
                    src={getItemImg(liveStats.items[6]) || ""}
                    alt="T"
                    fill
                    sizes="16px"
                    className="object-cover"
                  />
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-px">
            {spell1 && (
              <Image
                src={spell1}
                alt="S1"
                width={14}
                height={14}
                className="rounded-[2px]"
              />
            )}
            {spell2 && (
              <Image
                src={spell2}
                alt="S2"
                width={14}
                height={14}
                className="rounded-[2px]"
              />
            )}
          </div>
        </div>
      </div>
      {note && (
        <div className="absolute top-0 right-0 p-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        </div>
      )}
    </div>
  );
}

function ParticipantRow({
  participant,
  side,
  perkIconById,
  note,
  isFrequent,
  liveStats,
}: {
  participant: ActiveParticipant | null;
  side: "blue" | "red";
  perkIconById: Record<number, string>;
  note?: PlayerNote;
  isFrequent?: boolean;
  liveStats?: LivePlayerLCU;
}) {
  if (!participant) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800/60 dark:bg-slate-900/30">
        <div className="h-9 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-6 w-full rounded bg-slate-100 dark:bg-slate-800/60" />
      </div>
    );
  }
  const fixedName = participant.championName
    ? CHAMPION_NAME_FIXES[participant.championName] || participant.championName
    : null;

  let championImg = fixedName ? getChampionImg(fixedName) : null;

  // Fallback: Si no hay nombre pero hay ID, usar CommunityDragon
  if (!championImg && participant.championId > 0) {
    championImg = `https://cdn.communitydragon.org/latest/champion/${participant.championId}/square`;
  }

  const spell1 = getSpellImg(participant.spell1Id);
  const spell2 = getSpellImg(participant.spell2Id);
  const keystoneId = pickKeystoneId(participant.perks);
  const keystoneIcon = keystoneId ? perkIconById[keystoneId] : undefined;
  const secondaryStyleIcon = participant.perks?.perkSubStyle
    ? getRuneStyleImg(participant.perks.perkSubStyle)
    : null;
  const nameColor =
    side === "blue"
      ? "text-sky-700 dark:text-sky-200"
      : "text-rose-700 dark:text-rose-200";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border p-2 transition-all relative overflow-hidden",
        isFrequent
          ? "border-emerald-500/30 bg-emerald-50/30 dark:border-emerald-500/30 dark:bg-emerald-500/5 ring-1 ring-emerald-500/10"
          : "border-slate-200 bg-white dark:border-slate-800/60 dark:bg-slate-900/30",
      )}
    >
      {liveStats?.isDead && (
        <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10 pointer-events-none z-0" />
      )}
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
        {championImg ? (
          <>
            <Image
              src={championImg}
              alt={fixedName ?? "Champion"}
              fill
              sizes="40px"
              className={cn("object-cover", liveStats?.isDead && "grayscale")}
              unoptimized={championImg.startsWith("http")} // Optimización para CDragon
            />
            {liveStats?.isDead && liveStats.respawnTimer > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white font-bold text-xs">
                {Math.ceil(liveStats.respawnTimer)}
              </div>
            )}
            {liveStats && !liveStats.isDead && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white text-center font-medium">
                Lvl {liveStats.level}
              </div>
            )}
          </>
        ) : (
          <div className="h-full w-full bg-slate-200 dark:bg-slate-800" />
        )}
      </div>
      <div className="min-w-0 flex-1 z-10">
        <div className="flex items-center gap-1.5">
          <div className={`truncate text-xs font-semibold ${nameColor}`}>
            {participant.summonerName}
          </div>
          {isFrequent && (
            <Users
              size={12}
              className="text-emerald-500 dark:text-emerald-400 opacity-80"
            />
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-[11px] text-slate-600 dark:text-slate-400">
            {fixedName ?? `Champ ${participant.championId}`}
          </div>
          {liveStats && (
            <div className="flex items-center gap-2 text-[10px] font-medium leading-none">
              <span className="text-slate-900 dark:text-slate-200">
                {liveStats.kills}/{liveStats.deaths}/{liveStats.assists}
              </span>
              <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
              <span className="text-slate-500 dark:text-slate-400">
                {liveStats.creepScore} CS
              </span>
              <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                <Eye size={10} className="opacity-70" />
                {liveStats.wardScore?.toFixed(0) || 0}
              </span>
              {liveStats.currentGold !== undefined &&
                Number(liveStats.currentGold) > 0 && (
                  <>
                    <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <Coins size={10} className="opacity-80" />
                      {(Number(liveStats.currentGold) / 1000).toFixed(1)}k
                    </span>
                  </>
                )}
            </div>
          )}
        </div>
        {liveStats?.items && (
          <div className="flex items-center mt-1.5">
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const itemId = liveStats.items![idx] || 0;
                return (
                  <div
                    key={`item-${idx}`}
                    className="relative w-6 h-6 rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800/50"
                  >
                    {itemId > 0 && (
                      <Image
                        src={getItemImg(itemId) || ""}
                        alt="Item"
                        fill
                        sizes="24px"
                        className="object-cover"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-2" />
            <div className="relative w-6 h-6 rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800/50">
              {(liveStats.items[6] || 0) > 0 && (
                <Image
                  src={getItemImg(liveStats.items[6]) || ""}
                  alt="Trinket"
                  fill
                  sizes="24px"
                  className="object-cover"
                />
              )}
            </div>
          </div>
        )}
      </div>
      {note && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <StickyNote size={14} />
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[200px] p-3 shadow-xl border-slate-200 dark:border-slate-800"
            >
              <div className="space-y-2">
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Nota personal
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {note.note}
                </p>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col gap-0.5">
          {spell1 && (
            <Image
              src={spell1}
              alt="S1"
              width={22}
              height={22}
              className="rounded"
            />
          )}
          {spell2 && (
            <Image
              src={spell2}
              alt="S2"
              width={22}
              height={22}
              className="rounded"
            />
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {keystoneIcon && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 dark:bg-transparent">
              <Image
                src={keystoneIcon}
                alt="K"
                width={24}
                height={24}
                className="rounded"
              />
            </div>
          )}
          {secondaryStyleIcon && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 dark:bg-transparent">
              <Image
                src={secondaryStyleIcon}
                alt="S"
                width={24}
                height={24}
                className="rounded"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActiveMatchCard({
  userId,
  recentMatches = [],
  puuid: currentPuuid,
  riotId,
}: {
  userId?: string;
  recentMatches?: Match[];
  puuid?: string | null;
  riotId?: string;
}) {
  const { user, profile: contextProfile } = useAuth();
  const { data: profile } = useProfileQuery(user?.id);
  const activeProfile = profile || contextProfile;
  const queryClient = useQueryClient();
  const wasInGameRef = useRef<boolean>(false);
  const isMobile = useIsMobile();

  const viewMode =
    activeProfile?.settings?.mobile_match_view_mode || "carousel";

  const displayMode = useMemo(() => {
    if (!isMobile) return "grid"; // Siempre cuadrícula en escritorio
    if (viewMode === "list") return "list"; // Lista en móvil
    return "carousel"; // Carrusel en móvil
  }, [isMobile, viewMode]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    active: displayMode === "carousel",
    align: "start",
    loop: false,
  });

  useEffect(() => {
    if (emblaApi && displayMode === "carousel") {
      emblaApi.reInit();
    }
  }, [emblaApi, displayMode]);

  const { getNote } = usePlayerNotes();
  const [isExpanded, setIsExpanded] = useState(false);

  const { gameData: realtimeData, isConnected } = useLiveGameRealtime(
    currentPuuid,
    riotId,
    userId,
  );

  const getParticipantLiveStats = (
    summonerName: string,
    championName: string | null,
  ): LivePlayerLCU | undefined => {
    if ((realtimeData as any).isApiFallback) return undefined;

    // Función de normalización robusta
    const normalize = (s: string | null | undefined) => {
      if (!s) return "";
      return s
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "") // Quitar espacios
        .replace(/[^a-z0-9]/g, ""); // Solo alfanumérico
    };

    const targetName = normalize(summonerName);
    const targetChamp = championName ? normalize(championName) : "";

    // Buscar la mejor coincidencia
    let bestMatch: LivePlayerLCU | undefined;
    let maxScore = 0;

    // Use the same source priority as the participant list creation
    const candidates =
      (realtimeData as any).liveData?.allPlayers || realtimeData.livePlayers;

    if (!candidates || !Array.isArray(candidates)) return undefined;

    for (const p of candidates) {
      let score = 0;
      const pName = normalize(p.summonerName);
      const pRiotIdName = normalize(
        p.riotIdGameName || p.riotId?.split("#")[0],
      );
      const pRiotIdFull = normalize(
        p.riotId || `${p.riotIdGameName || ""}#${p.riotIdTagline || ""}`,
      );
      const pChamp = normalize(p.championName);

      // 1. Coincidencia de Campeón (Muy fuerte si existe)
      if (targetChamp && pChamp) {
        if (pChamp === targetChamp) score += 10;
        // Fixes específicos
        else if (targetChamp.includes(pChamp) || pChamp.includes(targetChamp))
          score += 5;
        else if (
          (targetChamp === "wukong" && pChamp === "monkeyking") ||
          (targetChamp === "monkeyking" && pChamp === "wukong")
        )
          score += 10;
        else if (targetChamp === "zaahen" || pChamp === "zaahen") score += 5; // Posible fix para Ambessa
      }

      // 2. Coincidencia de Nombre
      if (pName === targetName) score += 20;
      else if (pRiotIdName === targetName) score += 20;
      else if (pRiotIdFull.includes(targetName)) score += 15;
      else if (targetName.includes(pName) && pName.length > 3) score += 10;

      if (score > maxScore) {
        maxScore = score;
        bestMatch = p;
      }
    }

    // Umbral mínimo para aceptar match (al menos nombre parcial o campeón exacto)
    if (maxScore >= 10 && bestMatch) {
      // Asegurar items
      // Asegurar items
      let cleanItems: number[] = new Array(7).fill(0);
      if (Array.isArray(bestMatch.items)) {
        bestMatch.items.forEach((it: any) => {
          if (typeof it === "object" && it !== null && "itemID" in it) {
            // Si tiene slot válido, usarlo
            if (typeof it.slot === "number" && it.slot >= 0 && it.slot < 7) {
              cleanItems[it.slot] = it.itemID;
            } else {
              // Si no tiene slot (o es inválido), poner en el primer hueco libre
              const firstFree = cleanItems.findIndex((id) => id === 0);
              if (firstFree !== -1) cleanItems[firstFree] = it.itemID;
            }
          } else if (typeof it === "number") {
            // Si es solo un número (ID), poner en hueco libre
            const firstFree = cleanItems.findIndex((id) => id === 0);
            if (firstFree !== -1) cleanItems[firstFree] = it;
          }
        });
      }

      // Priorizar 'scores' si existe para evitar leer ceros de propiedades planas mal inicializadas
      const s = bestMatch.scores;

      // Intentar obtener oro del activePlayer si coincide
      let gold = bestMatch.currentGold;
      const activeData = (realtimeData as any).liveData?.activePlayer;
      if (activeData && activeData.summonerName === bestMatch.summonerName) {
        gold = activeData.currentGold;
      }

      return {
        ...bestMatch,
        kills: s?.kills ?? bestMatch.kills ?? 0,
        deaths: s?.deaths ?? bestMatch.deaths ?? 0,
        assists: s?.assists ?? bestMatch.assists ?? 0,
        creepScore: s?.creepScore ?? bestMatch.creepScore ?? 0,
        wardScore: s?.wardScore ?? bestMatch.wardScore ?? 0,
        currentGold: gold,
        items: cleanItems,
      };
    }
    return undefined;
  };

  const frequentTeammatePuuids = useMemo(() => {
    if (!recentMatches.length || !currentPuuid) return new Set<string>();
    return new Set(
      getFrequentTeammates(recentMatches, currentPuuid)
        .filter((t) => t.gamesTogether >= 2)
        .map((t) => t.puuid),
    );
  }, [recentMatches, currentPuuid]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const resp = await fetch("/api/riot/matches/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!resp.ok) throw new Error("Sync failed");
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-history"] });
      queryClient.invalidateQueries({ queryKey: ["active-match"] });
    },
  });

  const data: ActiveMatchResponse | undefined = useMemo(() => {
    if (
      !realtimeData ||
      !realtimeData.phase ||
      realtimeData.phase === "None" ||
      realtimeData.phase === "EndOfGame" ||
      realtimeData.phase === "WaitingForStats" ||
      realtimeData.phase === "PreEndOfGame" ||
      realtimeData.phase === "TerminatedInError"
    )
      return { hasActiveMatch: false, reason: "No data" };

    const mapToPart = (p: any): ActiveParticipant => ({
      teamId: p.teamId === 100 || p.team === "ORDER" ? 100 : 200,
      position: p.position === "" || p.position === "NONE" ? null : p.position,
      summonerName: p.summonerName || p.riotIdGameName || "Unknown",
      puuid: p.puuid || null,
      championId: p.championId || 0,
      championName: p.championName,
      spell1Id: 0,
      spell2Id: 0,
      perks: p.perks
        ? {
            perkIds: p.perks.perkIds,
            perkStyle: 0, // No se usa visualmente en ParticipantRow
            perkSubStyle: p.perks.perkSubStyle,
          }
        : p.runes
          ? {
              perkIds: [p.runes.keystone.id],
              perkStyle: p.runes.primaryRuneTree.id,
              perkSubStyle: p.runes.secondaryRuneTree.id,
            }
          : null,
    });

    const allP =
      (realtimeData as any).liveData?.allPlayers || realtimeData.livePlayers;

    // Detectar si tenemos datos de Champ Select (LCU structure)
    const champSelectData = realtimeData as any;
    const hasChampSelectData =
      Array.isArray(champSelectData.myTeam) &&
      Array.isArray(champSelectData.theirTeam);
    const isChampSelectPhase =
      realtimeData.phase === "ChampSelect" || realtimeData.phase === "BAN_PICK";

    let t100: ActiveParticipant[] = [];
    let t200: ActiveParticipant[] = [];

    if (hasChampSelectData && isChampSelectPhase) {
      // Mapeo específico para Champ Select
      const mapCS = (p: any, teamId: 100 | 200): ActiveParticipant => ({
        teamId,
        position: p.assignedPosition || null,
        summonerName: p.summonerName || (teamId === 200 ? "Enemigo" : ""), // Ocultar nombres enemigos si no están
        puuid: p.puuid || null,
        championId: p.championId || p.championPickIntent || 0,
        championName: null, // Se resolverá por ID en la vista
        spell1Id: p.spell1Id || 0,
        spell2Id: p.spell2Id || 0,
        perks: null, // Runas no disponibles aún
      });

      // Asumimos que myTeam es siempre el equipo aliado (podemos pintarlo como Azul/100 para consistencia visual o intentar detectar el lado)
      // LCU asigna myTeam siempre a "bottom" o "local". Vamos a asignarlo a Team 100 (Blue) por defecto para la vista,
      // o intentar inferir el side si tuvisemos mapSide. Por simplicidad visual: 100 = My Team, 200 = Their Team.
      // OJO: ActiveMatchCard pinta 100 a la izq y 200 a la derecha.

      // NOTA: En Champ Select (especialmente ARAM o Blind), el orden de roles puede no existir o ser confuso.
      // Es mejor NO ordenar por rol en esta fase para evitar ocultar gente si 'sortByRoleOrder' falla.
      // Simplemente mostramos el orden del array de la LCU.
      t100 = champSelectData.myTeam.map((p: any) => mapCS(p, 100));
      t200 = champSelectData.theirTeam.map((p: any) => mapCS(p, 200));
    } else if (allP && Array.isArray(allP)) {
      t100 = allP
        .filter((p: any) => p.team === "ORDER" || p.teamId === 100)
        .map(mapToPart)
        .sort(sortByRoleOrder);
      t200 = allP
        .filter((p: any) => p.team === "CHAOS" || p.teamId === 200)
        .map(mapToPart)
        .sort(sortByRoleOrder);
    }

    const time =
      (realtimeData as any).liveData?.gameData?.gameTime ??
      realtimeData.gameData?.gameTime ??
      0;

    // Timer de Champ Select
    const csTime = champSelectData.timer?.adjustedTimeLeftInPhase
      ? champSelectData.timer.adjustedTimeLeftInPhase / 1000
      : 0;

    const displayTime = isChampSelectPhase && csTime > 0 ? csTime : time;

    return {
      hasActiveMatch: true,
      reason: "Live",
      gameId: null,
      gameStartTime: null,
      gameLength: displayTime,
      queueId: null,
      mapId: 0,
      gameMode: "",
      gameType: null,
      platformId: null,
      elapsedSeconds: displayTime,
      phase: realtimeData.phase,
      teams: { team100: t100, team200: t200 },
      isApiFallback: (realtimeData as any).isApiFallback,
    };
  }, [realtimeData]);

  const hasMatch = data?.hasActiveMatch === true;
  const currentPhase = data?.hasActiveMatch ? data.phase : undefined;
  const phaseConfig = currentPhase ? PHASE_LABELS[currentPhase] : null;

  // Si estamos en fallback de API, sobreescribir la etiqueta y color
  const effectivePhaseConfig =
    hasMatch && data?.isApiFallback
      ? {
          label: "EN JUEGO (API)",
          color:
            "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
          ring: "bg-orange-500",
        }
      : phaseConfig;

  // Debug effect removed

  const allKeystones = useMemo(() => {
    if (!hasMatch || !data || !data.hasActiveMatch) return [];
    const ids: number[] = [];
    [...data.teams.team100, ...data.teams.team200].forEach((p) => {
      const k = pickKeystoneId(p.perks);
      if (k && !ids.includes(k)) ids.push(k);
    });
    return ids;
  }, [data, hasMatch]);

  const { perkIconById } = usePerkAssets(allKeystones);
  const team100ByPos = useMemo(
    () =>
      hasMatch && data?.hasActiveMatch
        ? assignParticipantsToRoles(data.teams.team100, ROLE_ORDER)
        : new Map<string, ActiveParticipant>(),
    [data, hasMatch],
  );
  const team200ByPos = useMemo(
    () =>
      hasMatch && data?.hasActiveMatch
        ? assignParticipantsToRoles(data.teams.team200, ROLE_ORDER)
        : new Map<string, ActiveParticipant>(),
    [data, hasMatch],
  );

  useEffect(() => {
    if (wasInGameRef.current && !hasMatch) {
      const t = setTimeout(() => syncMutation.mutate(), 5000);
      return () => clearTimeout(t);
    }
    wasInGameRef.current = hasMatch;
  }, [hasMatch, syncMutation]);

  const stats = useMemo(() => {
    if (!realtimeData) return { b: 0, r: 0, f: "0:00", q: "" };
    let b = 0,
      r = 0;
    const allP =
      (realtimeData as any).liveData?.allPlayers ||
      realtimeData.livePlayers ||
      [];
    allP.forEach((p: any) => {
      const k = p.scores?.kills ?? p.kills ?? 0;
      if (p.team === "ORDER" || p.teamId === 100) b += k;
      else r += k;
    });
    const t =
      (realtimeData as any).liveData?.gameData?.gameTime ??
      realtimeData.gameData?.gameTime ??
      0;
    return {
      b,
      r,
      f: `${Math.floor(t / 60)}:${Math.floor(t % 60)
        .toString()
        .padStart(2, "0")}`,
      q: getQueueDisplayName(realtimeData) || "",
    };
  }, [realtimeData]);

  if (!hasMatch || !data || !data.hasActiveMatch) return null;

  const timerText = formatElapsed(data.elapsedSeconds);
  const isWait =
    currentPhase === "Matchmaking" ||
    currentPhase === "ReadyCheck" ||
    currentPhase === "Lobby" ||
    currentPhase === "CheckedIntoTournament";

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40 transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors rounded-t-xl text-left"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                effectivePhaseConfig?.ring || "bg-emerald-400",
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                effectivePhaseConfig?.ring || "bg-emerald-500",
              )}
            />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Partida en vivo</span>
              {effectivePhaseConfig && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    effectivePhaseConfig.color,
                  )}
                >
                  {effectivePhaseConfig.label}
                </span>
              )}
              {isConnected && currentPhase === "InProgress" && (
                <div className="flex items-center gap-2 ml-2 px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-md text-xs font-mono">
                  {stats.q && (
                    <>
                      <span className="text-slate-700 dark:text-slate-300">
                        {stats.q}
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span className="text-sky-600 font-bold">{stats.b}</span>
                  <span>-</span>
                  <span className="text-rose-600 font-bold">{stats.r}</span>
                  <span className="ml-1.5 pl-1.5 border-l border-slate-300 dark:border-white/10">
                    {stats.f}
                  </span>
                </div>
              )}
            </div>
            {!isConnected && (
              <div className="text-xs text-slate-600 dark:text-slate-400">
                En partida{timerText ? ` • ${timerText}` : ""}
              </div>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={20} className="text-slate-400" />
        ) : (
          <ChevronDown size={20} className="text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/40">
          {isWait ? (
            <div className="mt-3 flex flex-col items-center justify-center py-8">
              <div className="relative mb-4">
                <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/30 w-12 h-12" />
                <div
                  className={cn(
                    "relative w-12 h-12 rounded-full flex items-center justify-center",
                    currentPhase === "Matchmaking"
                      ? "bg-amber-100"
                      : "bg-purple-100",
                  )}
                >
                  <Loader2 size={24} className="animate-spin text-amber-600" />
                </div>
              </div>
              <p className="text-sm font-medium">
                {currentPhase === "Matchmaking"
                  ? "Buscando partida..."
                  : currentPhase === "CheckedIntoTournament"
                    ? "Esperando torneo Clash..."
                    : "Partida encontrada!"}
              </p>
            </div>
          ) : (
            <div className="mt-3">
              {displayMode === "carousel" ? (
                <div className="overflow-hidden" ref={emblaRef}>
                  <div
                    className="flex touch-pan-y"
                    style={{ display: "flex", flexDirection: "row" }}
                  >
                    <div
                      className="min-w-0 space-y-1 px-1"
                      style={{
                        flex: "0 0 100%",
                        flexShrink: 0,
                        flexBasis: "100%",
                      }}
                    >
                      <div className="text-xs font-semibold text-sky-700 mb-2 px-1">
                        Equipo azul
                      </div>
                      {ROLE_ORDER.map((r) => (
                        <ParticipantRow
                          key={r.key}
                          participant={team100ByPos.get(r.key) || null}
                          side="blue"
                          perkIconById={perkIconById}
                          isFrequent={
                            team100ByPos.get(r.key)?.puuid
                              ? frequentTeammatePuuids.has(
                                  team100ByPos.get(r.key)!.puuid!,
                                )
                              : false
                          }
                          note={
                            team100ByPos.get(r.key)?.puuid
                              ? getNote(team100ByPos.get(r.key)!.puuid!)
                              : undefined
                          }
                          liveStats={
                            team100ByPos.get(r.key)
                              ? getParticipantLiveStats(
                                  team100ByPos.get(r.key)!.summonerName,
                                  team100ByPos.get(r.key)!.championName,
                                )
                              : undefined
                          }
                        />
                      ))}
                    </div>
                    <div
                      className="min-w-0 space-y-1 px-1"
                      style={{
                        flex: "0 0 100%",
                        flexShrink: 0,
                        flexBasis: "100%",
                      }}
                    >
                      <div className="text-xs font-semibold text-rose-700 mb-2 px-1">
                        Equipo rojo
                      </div>
                      {ROLE_ORDER.map((r) => (
                        <ParticipantRow
                          key={r.key}
                          participant={team200ByPos.get(r.key) || null}
                          side="red"
                          perkIconById={perkIconById}
                          isFrequent={
                            team200ByPos.get(r.key)?.puuid
                              ? frequentTeammatePuuids.has(
                                  team200ByPos.get(r.key)!.puuid!,
                                )
                              : false
                          }
                          note={
                            team200ByPos.get(r.key)?.puuid
                              ? getNote(team200ByPos.get(r.key)!.puuid!)
                              : undefined
                          }
                          liveStats={
                            team200ByPos.get(r.key)
                              ? getParticipantLiveStats(
                                  team200ByPos.get(r.key)!.summonerName,
                                  team200ByPos.get(r.key)!.championName,
                                )
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-center gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  </div>
                </div>
              ) : displayMode === "list" ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900/20 p-2 rounded-lg space-y-1">
                    <div className="text-xs font-bold text-sky-700 mb-2">
                      Equipo Azul
                    </div>
                    {ROLE_ORDER.map((r) => (
                      <CompactParticipantRow
                        key={r.key}
                        participant={team100ByPos.get(r.key) || null}
                        side="blue"
                        perkIconById={perkIconById}
                        isFrequent={
                          team100ByPos.get(r.key)?.puuid
                            ? frequentTeammatePuuids.has(
                                team100ByPos.get(r.key)!.puuid!,
                              )
                            : false
                        }
                        note={
                          team100ByPos.get(r.key)?.puuid
                            ? getNote(team100ByPos.get(r.key)!.puuid!)
                            : undefined
                        }
                        liveStats={
                          team100ByPos.get(r.key)
                            ? getParticipantLiveStats(
                                team100ByPos.get(r.key)!.summonerName,
                                team100ByPos.get(r.key)!.championName,
                              )
                            : undefined
                        }
                      />
                    ))}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/20 p-2 rounded-lg space-y-1">
                    <div className="text-xs font-bold text-rose-700 mb-2">
                      Equipo Rojo
                    </div>
                    {ROLE_ORDER.map((r) => (
                      <CompactParticipantRow
                        key={r.key}
                        participant={team200ByPos.get(r.key) || null}
                        side="red"
                        perkIconById={perkIconById}
                        isFrequent={
                          team200ByPos.get(r.key)?.puuid
                            ? frequentTeammatePuuids.has(
                                team200ByPos.get(r.key)!.puuid!,
                              )
                            : false
                        }
                        note={
                          team200ByPos.get(r.key)?.puuid
                            ? getNote(team200ByPos.get(r.key)!.puuid!)
                            : undefined
                        }
                        liveStats={
                          team200ByPos.get(r.key)
                            ? getParticipantLiveStats(
                                team200ByPos.get(r.key)!.summonerName,
                                team200ByPos.get(r.key)!.championName,
                              )
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-sky-700 mb-2 px-1">
                      Equipo azul
                    </div>
                    {/* Si estamos en Champ Select / BAN_PICK, iteramos directamente sobre el array t100/t200 en lugar de usar ROLE_ORDER 
                        porque en modos como ARAM no hay roles definidos y se perderían jugadores. */}
                    {(currentPhase === "ChampSelect" ||
                    currentPhase === "BAN_PICK"
                      ? data.teams.team100
                      : ROLE_ORDER
                    ).map((r, idx) => {
                      const p =
                        currentPhase === "ChampSelect" ||
                        currentPhase === "BAN_PICK"
                          ? (r as ActiveParticipant)
                          : team100ByPos.get((r as any).key);
                      const key =
                        currentPhase === "ChampSelect" ||
                        currentPhase === "BAN_PICK"
                          ? idx
                          : (r as any).key;

                      return (
                        <ParticipantRow
                          key={key}
                          participant={p || null}
                          side="blue"
                          perkIconById={perkIconById}
                          isFrequent={
                            p?.puuid
                              ? frequentTeammatePuuids.has(p.puuid)
                              : false
                          }
                          note={p?.puuid ? getNote(p.puuid) : undefined}
                          liveStats={
                            p
                              ? getParticipantLiveStats(
                                  p.summonerName,
                                  p.championName,
                                )
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-rose-700 mb-2 px-1">
                      Equipo rojo
                    </div>
                    {/* Misma lógica para equipo rojo */}
                    {(currentPhase === "ChampSelect" ||
                    currentPhase === "BAN_PICK"
                      ? data.teams.team200
                      : ROLE_ORDER
                    ).map((r, idx) => {
                      const p =
                        currentPhase === "ChampSelect" ||
                        currentPhase === "BAN_PICK"
                          ? (r as ActiveParticipant)
                          : team200ByPos.get((r as any).key);
                      const key =
                        currentPhase === "ChampSelect" ||
                        currentPhase === "BAN_PICK"
                          ? idx
                          : (r as any).key;

                      return (
                        <ParticipantRow
                          key={key}
                          participant={p || null}
                          side="red"
                          perkIconById={perkIconById}
                          isFrequent={
                            p?.puuid
                              ? frequentTeammatePuuids.has(p.puuid)
                              : false
                          }
                          note={p?.puuid ? getNote(p.puuid) : undefined}
                          liveStats={
                            p
                              ? getParticipantLiveStats(
                                  p.summonerName,
                                  p.championName,
                                )
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
