"use client";

import React from "react";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type RuneSelection = {
  perk?: number | string;
};

export type RuneStyle = {
  description?: string;
  style?: number;
  selections?: RuneSelection[];
};

export type StatPerks = {
  offense?: number | string;
  flex?: number | string;
  defense?: number | string;
};

export type RunePerks = {
  styles?: RuneStyle[];
  statPerks?: StatPerks;
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

export const getKeystonePerkId = (perks?: RunePerks | null): number | null => {
  const runeStyles = perks?.styles ?? [];
  const primaryStyle =
    runeStyles.find((style) => style.description === "primaryStyle") ??
    runeStyles[0];

  const firstSelection = primaryStyle?.selections?.[0];
  const perkId = toSafeNumber(firstSelection?.perk);
  return perkId && perkId > 0 ? perkId : null;
};

type PerkAssetsApiResponse =
  | {
      success: true;
      icons: Record<number, string>;
      names: Record<number, string>;
    }
  | {
      success: false;
      message: string;
    };

let perkIconCache: Record<number, string> = {};
let perkNameCache: Record<number, string> = {};
let queuedPerkIds = new Set<number>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushPromise: Promise<void> | null = null;

async function fetchPerkAssets(ids: number[]): Promise<void> {
  const unique: number[] = [];
  for (const id of ids) {
    if (typeof id !== "number" || id <= 0) continue;
    if (!unique.includes(id)) unique.push(id);
  }

  const missing = unique.filter(
    (id) => !perkIconCache[id] || !perkNameCache[id]
  );
  if (missing.length === 0) return;

  const params = new URLSearchParams();
  params.set("ids", missing.join(","));

  const res = await fetch(`/api/riot/perk-assets?${params.toString()}`);
  if (!res.ok) return;

  const data = (await res.json()) as PerkAssetsApiResponse;
  if (data.success !== true) return;

  perkIconCache = { ...perkIconCache, ...data.icons };
  perkNameCache = { ...perkNameCache, ...data.names };
}

function queuePerkAssetsFetch(ids: number[]): Promise<void> {
  for (const id of ids) {
    if (typeof id === "number" && id > 0) queuedPerkIds.add(id);
  }

  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = new Promise((resolve) => {
    if (flushTimer) {
      clearTimeout(flushTimer);
    }

    flushTimer = setTimeout(() => {
      const idsToFetch = Array.from(queuedPerkIds);
      queuedPerkIds = new Set<number>();
      flushTimer = null;

      void fetchPerkAssets(idsToFetch).finally(() => {
        flushPromise = null;
        resolve();
      });
    }, 50);
  });

  return flushPromise;
}

export function usePerkAssets(perkIds: Array<number | null | undefined>): {
  perkIconById: Record<number, string>;
  perkNameById: Record<number, string>;
} {
  // Estabilizar la entrada: convertir a string para comparar por valor y no por referencia
  const stableIdsKey = React.useMemo(() => {
    const ids = perkIds
      .filter((id): id is number => typeof id === "number" && id > 0)
      .sort((a, b) => a - b);
    const unique = Array.from(new Set(ids));
    return unique.join(",");
  }, [perkIds]);

  const normalizedIds = React.useMemo(
    () => (stableIdsKey ? stableIdsKey.split(",").map(Number) : []),
    [stableIdsKey]
  );

  const [perkIconById, setPerkIconById] = React.useState<
    Record<number, string>
  >(() => {
    const initial: Record<number, string> = {};
    for (const id of normalizedIds) {
      const icon = perkIconCache[id];
      if (icon) initial[id] = icon;
    }
    return initial;
  });

  const [perkNameById, setPerkNameById] = React.useState<
    Record<number, string>
  >(() => {
    const initial: Record<number, string> = {};
    for (const id of normalizedIds) {
      const name = perkNameCache[id];
      if (name) initial[id] = name;
    }
    return initial;
  });

  React.useEffect(() => {
    if (normalizedIds.length === 0) return;

    const syncFromCache = () => {
      setPerkIconById((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of normalizedIds) {
          const cached = perkIconCache[id];
          if (cached && next[id] !== cached) {
            next[id] = cached;
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      setPerkNameById((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of normalizedIds) {
          const cached = perkNameCache[id];
          if (cached && next[id] !== cached) {
            next[id] = cached;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };

    syncFromCache();

    void queuePerkAssetsFetch(normalizedIds).then(() => {
      syncFromCache();
    });
  }, [normalizedIds]);

  return { perkIconById, perkNameById };
}

const getRuneStyleLabel = (styleId?: number) => {
  if (!styleId) return "Runas";
  const labels: Record<number, string> = {
    8000: "Precisión",
    8100: "Dominación",
    8200: "Brujería",
    8300: "Inspiración",
    8400: "Valor",
  };
  return labels[styleId] ?? "Runas";
};

export function RunesTooltip({
  perks,
  children,
}: {
  perks?: RunePerks | null;
  children: React.ReactNode;
}) {
  const runeStyles = perks?.styles ?? [];

  const primaryStyle =
    runeStyles.find((style) => style.description === "primaryStyle") ??
    runeStyles[0];

  const secondaryStyle =
    runeStyles.find((style) => style.description === "subStyle") ??
    runeStyles[1];

  const statPerks = perks?.statPerks;

  const perkIdsNeeded = React.useMemo(() => {
    const ids = new Set<number>();

    for (const selection of primaryStyle?.selections ?? []) {
      const perkId = toSafeNumber(selection.perk);
      if (perkId && perkId > 0) ids.add(perkId);
    }

    for (const selection of secondaryStyle?.selections ?? []) {
      const perkId = toSafeNumber(selection.perk);
      if (perkId && perkId > 0) ids.add(perkId);
    }

    const offenseId = toSafeNumber(statPerks?.offense);
    const flexId = toSafeNumber(statPerks?.flex);
    const defenseId = toSafeNumber(statPerks?.defense);

    if (offenseId) ids.add(offenseId);
    if (flexId) ids.add(flexId);
    if (defenseId) ids.add(defenseId);

    return Array.from(ids);
  }, [primaryStyle?.selections, secondaryStyle?.selections, statPerks]);

  const { perkIconById, perkNameById } = usePerkAssets(perkIdsNeeded);

  const hasDetailedRunes = Boolean(
    (primaryStyle?.selections && primaryStyle.selections.length > 0) ||
      (secondaryStyle?.selections && secondaryStyle.selections.length > 0) ||
      statPerks?.offense ||
      statPerks?.flex ||
      statPerks?.defense
  );

  const renderRuneSelections = (style?: RuneStyle) => {
    if (!style?.selections?.length) return null;
    const styleId = toSafeNumber(style.style);

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {style.selections.map((selection, index) => {
          const perkId = toSafeNumber(selection.perk);
          const icon = typeof perkId === "number" ? perkIconById[perkId] : null;
          const perkName =
            typeof perkId === "number" ? perkNameById[perkId] : null;
          const key = `${styleId ?? "x"}-${perkId ?? "x"}-${index}`;

          return (
            <div
              key={key}
              className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-900/60 border border-white/10"
            >
              {icon ? (
                <Image
                  src={icon}
                  alt={perkName ?? "Runa"}
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
          const icon = perkIconById[shardId];
          const perkName = perkNameById[shardId];
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

  const tooltipContent = (
    <div className="space-y-3 text-xs">
      {primaryStyle && (
        <div>
          <p className="text-[11px] uppercase font-semibold text-muted-foreground">
            Primaria •{" "}
            {getRuneStyleLabel(toSafeNumber(primaryStyle.style) ?? undefined)}
          </p>
          {renderRuneSelections(primaryStyle)}
        </div>
      )}
      {secondaryStyle && (
        <div>
          <p className="text-[11px] uppercase font-semibold text-muted-foreground">
            Secundaria •{" "}
            {getRuneStyleLabel(toSafeNumber(secondaryStyle.style) ?? undefined)}
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

  if (!hasDetailedRunes) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className="w-64 p-3">{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
