"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useRef, useEffect, useState } from "react";
import { usePlayerNotes, type PlayerNote } from "@/hooks/use-player-notes";
import { StickyNote, ChevronDown, ChevronUp, Users } from "lucide-react";
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
} from "@/lib/riot/helpers";
import {
  formatDuration,
  getQueueName,
} from "@/components/riot/match-card/helpers";
import { usePerkAssets } from "@/components/riot/match-card/RunesTooltip";
import useEmblaCarousel from "embla-carousel-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getFrequentTeammates, type FrequentTeammate } from "./TeammateTracker";
import { type Match } from "./match-card/MatchCard";

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
      teams: {
        team100: ActiveParticipant[];
        team200: ActiveParticipant[];
      };
    };

const ROLE_ORDER: Array<{ key: string; label: string }> = [
  { key: "TOP", label: "TOP" },
  { key: "JUNGLE", label: "JGL" },
  { key: "MIDDLE", label: "MID" },
  { key: "BOTTOM", label: "BOT" },
  { key: "UTILITY", label: "SUP" },
];

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
  roles: Array<{ key: string; label: string }>
): Map<string, ActiveParticipant> {
  const byRole = new Map<string, ActiveParticipant>();
  const leftovers: ActiveParticipant[] = [];

  // 1. Intentar asignar jugadores que tienen una posición clara (de API o por Smite)
  for (const p of participants) {
    let pos = normalizePosition(p.position);

    // Heurística de Smite (ID 11) -> JUNGLE
    if (!pos && (p.spell1Id === 11 || p.spell2Id === 11)) {
      pos = "JUNGLE";
    }

    if (pos && roles.some((r) => r.key === pos) && !byRole.has(pos)) {
      byRole.set(pos, p);
    } else {
      leftovers.push(p);
    }
  }

  // 2. Llenar los huecos restantes con los jugadores sin posición definida
  for (const role of roles) {
    if (byRole.has(role.key)) continue;
    const next = leftovers.shift();
    if (!next) break;
    byRole.set(role.key, next);
  }

  return byRole;
}

function formatElapsed(seconds: number | null): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    return "";
  }
  return formatDuration(Math.floor(seconds));
}

function ParticipantRow({
  participant,
  side,
  perkIconById,
  note,
  isFrequent,
}: {
  participant: ActiveParticipant | null;
  side: "blue" | "red";
  perkIconById: Record<number, string>;
  note?: PlayerNote;
  isFrequent?: boolean;
}) {
  if (!participant) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800/60 dark:bg-slate-900/30">
        <div className="h-9 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-6 w-full rounded bg-slate-100 dark:bg-slate-800/60" />
      </div>
    );
  }

  const championName = participant.championName;
  const championImg = championName ? getChampionImg(championName) : null;
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
        "flex items-center gap-2 rounded-lg border p-2 transition-all",
        isFrequent
          ? "border-emerald-500/30 bg-emerald-50/30 dark:border-emerald-500/30 dark:bg-emerald-500/5 ring-1 ring-emerald-500/10"
          : "border-slate-200 bg-white dark:border-slate-800/60 dark:bg-slate-900/30"
      )}
    >
      {/* Champion Image */}
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded">
        {championImg ? (
          <Image
            src={championImg}
            alt={championName ?? "Champion"}
            fill
            sizes="40px"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-slate-200 dark:bg-slate-800" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className={`truncate text-xs font-semibold ${nameColor}`}>
            {participant.summonerName}
          </div>
          {isFrequent && (
            <div className="flex-shrink-0">
              <Users
                size={12}
                className="text-emerald-500 dark:text-emerald-400 opacity-80"
              />
            </div>
          )}
        </div>
        <div className="truncate text-[11px] text-slate-600 dark:text-slate-400">
          {championName ?? `Champ ${participant.championId}`}
        </div>
      </div>

      {note && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-6 w-6 items-center justify-center rounded bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <StickyNote size={14} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] p-3">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Nota personal
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {note.note}
                </p>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
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

      {/* Spells & Runes */}
      <div className="flex items-center gap-1.5">
        {/* Summoner Spells */}
        <div className="flex flex-col gap-0.5">
          {spell1 && (
            <Image
              src={spell1}
              alt="Spell 1"
              width={22}
              height={22}
              className="rounded"
            />
          )}
          {spell2 && (
            <Image
              src={spell2}
              alt="Spell 2"
              width={22}
              height={22}
              className="rounded"
            />
          )}
        </div>

        {/* Runes: Keystone and Secondary Style */}
        <div className="flex flex-col gap-0.5">
          {keystoneIcon && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 dark:bg-transparent">
              <Image
                src={keystoneIcon}
                alt="Keystone"
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
                alt="Runa secundaria"
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
}: {
  userId?: string;
  recentMatches?: Match[];
  puuid?: string | null;
}) {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const wasInGameRef = useRef<boolean>(false);
  const isMobile = useIsMobile();
  const [emblaRef] = useEmblaCarousel({ active: isMobile, align: "start" });
  const { getNote } = usePlayerNotes();
  const [isExpanded, setIsExpanded] = useState(false);

  // Calcular compañeros frecuentes si tenemos historial y puuid
  const frequentTeammatePuuids = useMemo(() => {
    if (!recentMatches.length || !currentPuuid) return new Set<string>();
    const frequent = getFrequentTeammates(recentMatches, currentPuuid);
    // Consideramos frecuente si ha jugado al menos 2 partidas juntos (mismo default que TeammateTracker)
    return new Set(
      frequent.filter((t) => t.gamesTogether >= 2).map((t) => t.puuid)
    );
  }, [recentMatches, currentPuuid]);

  // Mutación para sincronizar historial
  const syncMutation = useMutation({
    mutationFn: async () => {
      console.log("[ActiveMatchCard] 🔄 Auto-syncing match history...");
      const response = await fetch("/api/riot/matches/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Si hay userId explícito (perfil público), lo enviamos.
        // Si no, el endpoint usará la sesión del usuario.
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to auto-sync");
      }
      return response.json();
    },
    onSuccess: () => {
      console.log("[ActiveMatchCard] ✅ Auto-sync successful");
      // Invalidar queries para que el historial se actualice
      queryClient.invalidateQueries({ queryKey: ["match-history"] });
      queryClient.invalidateQueries({ queryKey: ["match-history-cache"] });
      // También invalidamos active-match por si acaso, aunque ya sabemos que terminó
      queryClient.invalidateQueries({ queryKey: ["active-match"] });
    },
    onError: (err) => {
      console.error("[ActiveMatchCard] ❌ Auto-sync failed:", err);
    },
  });

  const { data, isLoading } = useQuery<ActiveMatchResponse>({
    queryKey: ["active-match", userId || "local"],
    queryFn: async () => {
      console.log("[ActiveMatchCard] 🟡 Starting fetch. userId prop:", userId);

      const debugParam =
        process.env.NODE_ENV !== "production" ? "&debug=1" : "";

      let url = "/api/riot/matches/active";
      const headers: HeadersInit = {};

      if (userId) {
        // Perfil público: no requerimos autenticación
        url += `?userId=${userId}${debugParam}`;
      } else {
        // Perfil propio: requerimos autenticación
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          return { hasActiveMatch: false, reason: "No session" };
        }

        headers["Authorization"] = `Bearer ${session.access_token}`;
        if (debugParam) {
          url += `?debug=1`;
        }
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        return { hasActiveMatch: false, reason: "Request failed" };
      }

      const data = (await response.json()) as ActiveMatchResponse;
      return data;
    },
    refetchInterval: 10_000,
    staleTime: 8_000,
  });

  const hasMatch = data?.hasActiveMatch === true;

  const allKeystones = useMemo(() => {
    if (!hasMatch) return [];
    const ids: number[] = [];
    const all = [...data.teams.team100, ...data.teams.team200];
    for (const p of all) {
      const keystone = pickKeystoneId(p.perks);
      if (keystone && !ids.includes(keystone)) ids.push(keystone);
    }
    return ids;
  }, [data, hasMatch]);

  const { perkIconById } = usePerkAssets(allKeystones);

  const team100ByPos = useMemo(() => {
    if (!hasMatch) return new Map<string, ActiveParticipant>();
    return assignParticipantsToRoles(data.teams.team100, ROLE_ORDER);
  }, [data, hasMatch]);

  const team200ByPos = useMemo(() => {
    if (!hasMatch) return new Map<string, ActiveParticipant>();
    return assignParticipantsToRoles(data.teams.team200, ROLE_ORDER);
  }, [data, hasMatch]);

  // Detectar fin de partida y sincronizar
  useEffect(() => {
    // Si antes estábamos en partida (true) y ahora no (false)
    if (wasInGameRef.current && !hasMatch) {
      console.log(
        "[ActiveMatchCard] 🏁 Match ended detected! Scheduling sync in 5s..."
      );

      // Esperar un poco para asegurar que Riot API tenga los datos (Spectator vs Match-V5)
      const timer = setTimeout(() => {
        syncMutation.mutate();
      }, 5000); // 5 segundos de espera prudencial

      return () => clearTimeout(timer);
    }

    // Actualizar ref
    wasInGameRef.current = hasMatch;
  }, [hasMatch, syncMutation]);

  if (isLoading && !data) {
    return null;
  }

  if (!hasMatch) {
    return null;
  }

  const queueLabel =
    typeof data.queueId === "number"
      ? getQueueName(data.queueId)
      : "En partida";
  const timer = formatElapsed(data.elapsedSeconds);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40 dark:shadow-none transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Partida en vivo
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                LIVE
              </span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {queueLabel}
              {timer ? ` • ${timer}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            {data.platformId ?? ""}
          </div>
          {isExpanded ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/40">
          <div
            className={cn(
              "mt-3",
              isMobile ? "overflow-hidden" : "grid gap-3 md:grid-cols-2"
            )}
            ref={emblaRef}
          >
            <div className={cn(isMobile ? "flex touch-pan-y" : "contents")}>
              {/* Slide/Column 1: Blue Team */}
              <div
                className={cn("space-y-1", isMobile && "min-w-full pl-1 pr-4")}
              >
                <div className="text-xs font-semibold text-sky-700 dark:text-sky-300 mb-2 px-1">
                  Equipo azul
                </div>
                {ROLE_ORDER.map((role) => {
                  const p = team100ByPos.get(role.key) ?? null;
                  return (
                    <ParticipantRow
                      key={`blue-${role.key}`}
                      participant={p}
                      side="blue"
                      perkIconById={perkIconById}
                      isFrequent={
                        p?.puuid ? frequentTeammatePuuids.has(p.puuid) : false
                      }
                      note={p?.puuid ? getNote(p.puuid) : undefined}
                    />
                  );
                })}
              </div>

              {/* Slide/Column 2: Red Team */}
              <div
                className={cn("space-y-1", isMobile && "min-w-full pl-4 pr-1")}
              >
                <div className="text-xs font-semibold text-rose-700 dark:text-rose-300 mb-2 px-1">
                  Equipo rojo
                </div>
                {ROLE_ORDER.map((role) => {
                  const p = team200ByPos.get(role.key) ?? null;
                  return (
                    <ParticipantRow
                      key={`red-${role.key}`}
                      participant={p}
                      side="red"
                      perkIconById={perkIconById}
                      isFrequent={
                        p?.puuid ? frequentTeammatePuuids.has(p.puuid) : false
                      }
                      note={p?.puuid ? getNote(p.puuid) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
