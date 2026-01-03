import React from "react";
import type { RuneStyle } from "../types";
import { toSafeNumber } from "../helpers";
import {
  getPerkDataBatch,
  getPerkFromCacheSync,
  isPerksLoaded,
} from "@/lib/riot/perksCache";

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

  // Memoizar los IDs necesarios para evitar recálculos
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

      // Verificar si ya tenemos todos los datos del cache sincrónico
      if (isPerksLoaded()) {
        const newIcons: Record<number, string> = {};
        const newNames: Record<number, string> = {};
        let needsUpdate = false;

        for (const id of perkIdsNeeded) {
          if (!perkIconById[id]) {
            const cached = getPerkFromCacheSync(id);
            if (cached) {
              newIcons[id] = cached.icon;
              newNames[id] = cached.name;
              needsUpdate = true;
            }
          }
        }

        if (needsUpdate && !cancelled) {
          setPerkIconById((prev) => ({ ...prev, ...newIcons }));
          setPerkNameById((prev) => ({ ...prev, ...newNames }));
        }
        return;
      }

      // Cache no está cargado, usar la función async
      try {
        const { icons, names } = await getPerkDataBatch(perkIdsNeeded);

        if (cancelled) return;

        setPerkIconById((prev) => ({ ...prev, ...icons }));
        setPerkNameById((prev) => ({ ...prev, ...names }));
      } catch {
        // Silencioso: si falla, solo no mostramos iconos
      }
    };

    void loadPerkIcons();

    return () => {
      cancelled = true;
    };
  }, [perkIdsNeeded]); // Removido perkIconById de las dependencias para evitar loops

  return { perkIconById, perkNameById };
};
