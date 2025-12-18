import React from "react";
import type { RuneStyle } from "../types";
import { toSafeNumber, isPerkJsonEntry, iconPathToUrl } from "../helpers";

export const useRuneIcons = (
  primaryStyle?: RuneStyle,
  secondaryStyle?: RuneStyle,
  statPerks?: {
    offense?: number;
    flex?: number;
    defense?: number;
  }
) => {
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

  return { perkIconById, perkNameById };
};
