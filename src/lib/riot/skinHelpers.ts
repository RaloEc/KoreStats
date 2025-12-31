import crypto from "crypto";

// Cache de skins por campeón para evitar consultas repetidas
const skinsCache = new Map<string, number[]>();

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
 */
async function getChampionSkins(championName: string): Promise<number[]> {
  const normalized = normalizeChampionName(championName);

  // Verificar caché primero
  if (skinsCache.has(normalized)) {
    return skinsCache.get(normalized)!;
  }

  try {
    const response = await fetch(`/api/riot/champions/${normalized}/skins`);
    if (!response.ok) {
      console.warn(`Failed to fetch skins for ${normalized}, using default`);
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
  }
}

/**
 * Genera un skinId determinístico basado en el matchId
 * Usa los skins reales disponibles para el campeón desde la base de datos
 */
export async function getDeterministicSkinId(
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
    const hash = crypto.createHash("md5").update(matchId).digest("hex");
    const hashNum = parseInt(hash.substring(0, 8), 16);

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
  try {
    const hash = crypto.createHash("md5").update(matchId).digest("hex");
    const hashNum = parseInt(hash.substring(0, 8), 16);
    return hashNum % 11; // 0-10 para skins comunes
  } catch (e) {
    console.error("Error generating deterministic skin ID", e);
    return 0;
  }
}
