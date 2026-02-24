export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

/**
 * Obtiene la cuenta de Riot (PUUID) a partir del Riot ID (GameName # TagLine)
 * Usa la API Account-V1
 */
export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
  apiKey: string,
): Promise<RiotAccount | null> {
  try {
    // Usamos 'americas' como routing value por defecto para cuentas LATAM/NA/BR
    // En un sistema global real, esto debería ser configurable o probar varias regiones
    const region = "americas";

    const url = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": apiKey,
      },
      next: { revalidate: 0 }, // No caché
    });

    if (response.status === 404) {
      console.warn(
        `[getAccountByRiotId] No encontrado: ${gameName}#${tagLine}`,
      );
      return null;
    }

    if (!response.ok) {
      console.error(
        `[getAccountByRiotId] Error ${response.status}:`,
        await response.text(),
      );
      return null;
    }

    const data = await response.json();
    return {
      puuid: data.puuid,
      gameName: data.gameName,
      tagLine: data.tagLine,
    };
  } catch (error) {
    console.error("[getAccountByRiotId] Exception:", error);
    return null;
  }
}
