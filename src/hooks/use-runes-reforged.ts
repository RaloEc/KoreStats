import { useState, useEffect, useCallback } from "react";
import { getLatestDDragonVersion } from "@/lib/riot/helpers";

/**
 * Hook para obtener las imágenes correctas de las runas (Keystones y secundarias)
 * usando runesReforged.json de DataDragon, siguiendo la guía oficial.
 */
export function useRunesReforged() {
  const [runesData, setRunesData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // console.log("[useRunesReforged] Hook mounted, starting fetch...");
    async function fetchRunes() {
      try {
        const version = await getLatestDDragonVersion();
        // console.log(`[useRunesReforged] Using version: ${version}`);
        const res = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${version}/data/es_ES/runesReforged.json`,
        );
        if (!res.ok) throw new Error("Failed to fetch runesReforged.json");
        const json = await res.json();
        // console.log(
        //   `[useRunesReforged] Data fetched successfully. Styles count: ${json.length}`,
        // );
        setRunesData(json);
      } catch (err) {
        console.error("[useRunesReforged] Error fetching runes:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRunes();
  }, []);

  /**
   * Obtiene la URL completa de la imagen de una runa dado su ID.
   * Busca recursivamente en runesReforged.json
   */
  const getRuneIconUrl = useCallback(
    (runeId: number): string | null => {
      // DEBUG: Ver si llega el ID y si hay datos
      if (!runesData) {
        // console.log("[useRunesReforged] No data yet for id:", runeId);
        return null;
      }
      if (!runeId) return null;

      // Ensure number comparison
      const targetId = Number(runeId);

      // 1. Recorremos todas las ramas (Styles)
      for (const style of runesData) {
        // A veces el propio style tiene un ID que coincide (runa de rama)
        if (style.id === targetId) {
          return `https://ddragon.leagueoflegends.com/cdn/img/${style.icon}`;
        }

        // 2. Recorremos los slots de cada rama
        for (const slot of style.slots) {
          // 3. Buscamos la runa específica dentro de las opciones del slot
          const rune = slot.runes.find((r: any) => r.id === targetId);

          if (rune) {
            // 4. Retornamos la URL construida
            // DataDragon: https://ddragon.leagueoflegends.com/cdn/img/perk-images/...
            return `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`;
          }
        }
      }

      console.warn(`[useRunesReforged] RUNE NOT FOUND: ${targetId}`);
      return null;
    },
    [runesData],
  );

  return { getRuneIconUrl, loading, runesData };
}
