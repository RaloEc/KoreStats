/**
 * Cache global para los datos de runas (perks) de Community Dragon
 * Evita que cada tarjeta haga su propia llamada HTTP
 */

interface PerkEntry {
  id: number;
  name: string;
  iconPath: string;
}

interface PerksCache {
  data: Record<number, { icon: string; name: string }> | null;
  promise: Promise<Record<number, { icon: string; name: string }>> | null;
  loaded: boolean;
}

// Cache singleton
const cache: PerksCache = {
  data: null,
  promise: null,
  loaded: false,
};

const PERKS_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perks.json";

/**
 * Convierte el path de Community Dragon a URL usable
 */
function iconPathToUrl(iconPath: string): string {
  if (!iconPath) return "";
  // Formato: /lol-game-data/assets/v1/perk-images/Styles/...
  // DataDragon espera: https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/...
  const cleaned = iconPath.replace("/lol-game-data/assets/v1/", "");
  return `https://ddragon.leagueoflegends.com/cdn/img/${cleaned}`;
}

/**
 * Valida si una entrada del JSON es un perk válido
 */
function isPerkJsonEntry(entry: unknown): entry is PerkEntry {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof (entry as PerkEntry).id === "number" &&
    typeof (entry as PerkEntry).iconPath === "string" &&
    typeof (entry as PerkEntry).name === "string"
  );
}

/**
 * Carga todos los perks una sola vez y los almacena en el cache global
 * Múltiples llamadas concurrentes comparten la misma promesa
 */
async function loadPerksData(): Promise<
  Record<number, { icon: string; name: string }>
> {
  // Ya está cargado
  if (cache.data) {
    return cache.data;
  }

  // Ya hay una carga en progreso, esperarla
  if (cache.promise) {
    return cache.promise;
  }

  // Iniciar carga
  cache.promise = (async () => {
    try {
      const response = await fetch(PERKS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch perks: ${response.status}`);
      }

      const raw: unknown = await response.json();
      if (!Array.isArray(raw)) {
        throw new Error("Perks data is not an array");
      }

      const result: Record<number, { icon: string; name: string }> = {};

      for (const entry of raw) {
        if (!isPerkJsonEntry(entry)) continue;
        const url = iconPathToUrl(entry.iconPath);
        if (!url) continue;
        result[entry.id] = { icon: url, name: entry.name };
      }

      cache.data = result;
      cache.loaded = true;
      return result;
    } catch (error) {
      console.error("Error loading perks cache:", error);
      cache.data = {};
      cache.loaded = true;
      return {};
    }
  })();

  return cache.promise;
}

/**
 * Obtiene los iconos y nombres de los perks solicitados
 * Usa el cache global para evitar múltiples peticiones HTTP
 */
export async function getPerkDataBatch(
  perkIds: number[]
): Promise<{ icons: Record<number, string>; names: Record<number, string> }> {
  if (perkIds.length === 0) {
    return { icons: {}, names: {} };
  }

  const allPerks = await loadPerksData();
  const icons: Record<number, string> = {};
  const names: Record<number, string> = {};

  for (const id of perkIds) {
    const perk = allPerks[id];
    if (perk) {
      icons[id] = perk.icon;
      names[id] = perk.name;
    }
  }

  return { icons, names };
}

/**
 * Verifica si el cache ya está cargado (para uso sincrónico)
 */
export function isPerksLoaded(): boolean {
  return cache.loaded;
}

/**
 * Obtiene datos de un perk específico si ya están en cache
 * Retorna undefined si el cache no está cargado
 */
export function getPerkFromCacheSync(
  perkId: number
): { icon: string; name: string } | undefined {
  if (!cache.data) return undefined;
  return cache.data[perkId];
}

/**
 * Pre-carga el cache (útil al inicio de la app)
 */
export function preloadPerksCache(): void {
  if (!cache.loaded && !cache.promise) {
    loadPerksData();
  }
}
