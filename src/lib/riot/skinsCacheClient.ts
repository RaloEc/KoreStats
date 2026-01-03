/**
 * Cache global para los skins de campeones
 * Evita que cada tarjeta haga su propia llamada HTTP a la API de skins
 */

// Cache singleton para skins por campeón
const skinsCache = new Map<string, number[]>();
const pendingRequests = new Map<string, Promise<number[]>>();

/**
 * Normaliza el nombre del campeón para que coincida con la DB
 */
function normalizeChampionName(name: string): string {
  const specialNames: Record<string, string> = {
    FiddleSticks: "Fiddlesticks",
    Wukong: "MonkeyKing",
  };
  return specialNames[name] || name;
}

/**
 * Obtiene los skins disponibles para un campeón desde la API
 * Usa cache para evitar llamadas duplicadas
 */
async function getChampionSkins(championName: string): Promise<number[]> {
  const normalized = normalizeChampionName(championName);

  // Verificar caché primero
  if (skinsCache.has(normalized)) {
    return skinsCache.get(normalized)!;
  }

  // Si ya hay una petición en progreso para este campeón, esperarla
  if (pendingRequests.has(normalized)) {
    return pendingRequests.get(normalized)!;
  }

  // Crear nueva petición
  const request = (async () => {
    try {
      const response = await fetch(`/api/riot/champions/${normalized}/skins`);
      if (!response.ok) {
        return [0];
      }

      const data = await response.json();
      const skins = data.skins || [0];

      // Guardar en caché
      skinsCache.set(normalized, skins);

      return skins;
    } catch (error) {
      console.error(`Error fetching skins for ${normalized}:`, error);
      return [0];
    } finally {
      // Limpiar la petición pendiente
      pendingRequests.delete(normalized);
    }
  })();

  pendingRequests.set(normalized, request);
  return request;
}

/**
 * Genera un hash simple de un string (no criptográfico, solo para determinismo)
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convertir a entero de 32 bits
  }
  return Math.abs(hash);
}

/**
 * Genera un skinId determinístico basado en el matchId
 * Usa los skins reales disponibles para el campeón desde la base de datos
 * VERSION CLIENT-SIDE: sin dependencia de crypto de Node.js
 */
export async function getDeterministicSkinIdClient(
  matchId: string,
  championName: string
): Promise<number> {
  try {
    // Obtener skins disponibles para este campeón
    const availableSkins = await getChampionSkins(championName);

    if (availableSkins.length === 0) {
      return 0;
    }

    // Generar hash determinístico del matchId
    const hashNum = simpleHash(matchId);

    // Seleccionar un skin del array disponible
    return availableSkins[hashNum % availableSkins.length];
  } catch (e) {
    console.error("Error generating deterministic skin ID", e);
    return 0;
  }
}

/**
 * Versión sincrónica que usa un rango limitado (para fallback)
 */
export function getDeterministicSkinIdSync(matchId: string): number {
  const hashNum = simpleHash(matchId);
  return hashNum % 11; // 0-10 para skins comunes
}

/**
 * Obtiene un skin del cache si ya está disponible
 * Retorna undefined si no está en cache
 */
export function getSkinFromCacheSync(
  championName: string
): number[] | undefined {
  const normalized = normalizeChampionName(championName);
  return skinsCache.get(normalized);
}

/**
 * Pre-carga skins para una lista de campeones
 */
export function preloadChampionSkins(championNames: string[]): void {
  for (const name of championNames) {
    getChampionSkins(name); // Fire and forget
  }
}
