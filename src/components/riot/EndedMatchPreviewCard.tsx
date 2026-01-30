"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
import type { ActiveMatchSnapshot } from "@/hooks/use-match-status-detector";

type SpectatorPerks = {
  perkIds: number[];
  perkStyle: number | null;
  perkSubStyle: number | null;
};

type ActiveParticipant = {
  teamId: 100 | 200;
  position: string | null;
  summonerName: string;
  championId: number;
  championName: string | null;
  spell1Id: number;
  spell2Id: number;
  perks: SpectatorPerks | null;
};

type EndedSnapshot = Extract<ActiveMatchSnapshot, { hasActiveMatch: true }>;

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

function formatElapsed(seconds: number | null | undefined): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    return "";
  }
  return formatDuration(Math.floor(seconds));
}

function assignParticipantsToRoles(
  participants: ActiveParticipant[],
  roles: Array<{ key: string; label: string }>,
): Map<string, ActiveParticipant> {
  const byRole = new Map<string, ActiveParticipant>();
  const leftovers: ActiveParticipant[] = [];

  for (const p of participants) {
    const pos = normalizePosition(p.position);
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

function ParticipantRow({
  participant,
  side,
  perkIconById,
}: {
  participant: ActiveParticipant | null;
  side: "blue" | "red";
  perkIconById: Record<number, string>;
}) {
  if (!participant) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/60 bg-slate-900/30 px-2 py-1">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="h-7 w-7 flex-shrink-0 rounded bg-slate-800" />
          <div className="min-w-0 flex-1">
            <div className="h-3 w-28 rounded bg-slate-800/80" />
            <div className="mt-1 h-3 w-20 rounded bg-slate-800/60" />
          </div>
        </div>
        <div className="h-4 w-20 rounded bg-slate-800/40" />
      </div>
    );
  }

  const championName = participant.championName;
  const championImg = championName ? getChampionImg(championName) : null;
  const spell1 = getSpellImg(participant.spell1Id);
  const spell2 = getSpellImg(participant.spell2Id);

  const keystoneId = pickKeystoneId(participant.perks);
  const keystoneIcon = keystoneId ? perkIconById[keystoneId] : undefined;
  const styleIcon = getRuneStyleImg(participant.perks?.perkStyle ?? null);
  const subStyleIcon = getRuneStyleImg(participant.perks?.perkSubStyle ?? null);

  const hasSpells = Boolean(spell1 || spell2);
  const hasRunes = Boolean(keystoneIcon || styleIcon || subStyleIcon);

  const nameColor = side === "blue" ? "text-sky-200" : "text-rose-200";

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/60 bg-slate-900/30 px-2 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded">
          {championImg ? (
            <Image
              src={championImg}
              alt={championName ?? "Champion"}
              fill
              sizes="28px"
            />
          ) : (
            <div className="h-full w-full bg-slate-800" />
          )}
        </div>

        <div className="min-w-0">
          <div className={`truncate text-xs font-semibold ${nameColor}`}>
            {participant.summonerName}
          </div>
          <div className="truncate text-[11px] text-slate-400">
            {championName ?? `Champ ${participant.championId}`}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {spell1 ? (
          <Image
            src={spell1}
            alt="Spell 1"
            width={16}
            height={16}
            className="rounded"
          />
        ) : null}
        {spell2 ? (
          <Image
            src={spell2}
            alt="Spell 2"
            width={16}
            height={16}
            className="rounded"
          />
        ) : null}
        {hasSpells && hasRunes ? (
          <div className="mx-1 h-4 w-px bg-slate-700/60" />
        ) : null}
        {keystoneIcon ? (
          <Image
            src={keystoneIcon}
            alt="Runa"
            width={16}
            height={16}
            className="rounded"
          />
        ) : null}
        {styleIcon ? (
          <Image
            src={styleIcon}
            alt="Estilo"
            width={16}
            height={16}
            className="rounded"
          />
        ) : null}
        {subStyleIcon ? (
          <Image
            src={subStyleIcon}
            alt="Sub estilo"
            width={16}
            height={16}
            className="rounded"
          />
        ) : null}
      </div>
    </div>
  );
}

function isEndedSnapshot(
  snapshot: ActiveMatchSnapshot,
): snapshot is EndedSnapshot {
  return snapshot.hasActiveMatch === true;
}

export function EndedMatchPreviewCard({
  snapshot,
}: {
  snapshot: ActiveMatchSnapshot;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isEndedSnapshot(snapshot)) return null;
  const teams = snapshot.teams;
  if (!teams) return null;

  const allKeystones = useMemo(() => {
    const ids: number[] = [];
    const all = [...teams.team100, ...teams.team200];
    for (const p of all) {
      const keystone = pickKeystoneId(p.perks);
      if (keystone && !ids.includes(keystone)) ids.push(keystone);
    }
    return ids;
  }, [teams.team100, teams.team200]);

  const { perkIconById } = usePerkAssets(allKeystones);

  const team100ByPos = useMemo(() => {
    return assignParticipantsToRoles(teams.team100, ROLE_ORDER);
  }, [teams.team100]);

  const team200ByPos = useMemo(() => {
    return assignParticipantsToRoles(teams.team200, ROLE_ORDER);
  }, [teams.team200]);

  const queueLabel =
    typeof snapshot.queueId === "number"
      ? getQueueName(snapshot.queueId)
      : "Partida";
  const timer = formatElapsed(snapshot.elapsedSeconds);

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-amber-500/5 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Sincronizando Partida Finalizada...
            </div>
            <div className="text-xs text-slate-400">
              {queueLabel}
              {timer ? ` • ${timer}` : ""}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <div className="text-slate-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </div>
        ) : (
          <div className="text-slate-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-amber-500/10">
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-sky-300">
                Equipo azul
              </div>
              {ROLE_ORDER.map((role) => (
                <ParticipantRow
                  key={`blue-ended-${role.key}`}
                  participant={team100ByPos.get(role.key) ?? null}
                  side="blue"
                  perkIconById={perkIconById}
                />
              ))}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-rose-300">
                Equipo rojo
              </div>
              {ROLE_ORDER.map((role) => (
                <ParticipantRow
                  key={`red-ended-${role.key}`}
                  participant={team200ByPos.get(role.key) ?? null}
                  side="red"
                  perkIconById={perkIconById}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
