export interface SummonerDTO {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

/**
 * Obtiene datos del invocador (Summoner-V4) usando PUUID
 * Necesario para obtener profileIconId y summonerLevel
 */
export async function getSummonerByPuuid(
  puuid: string,
  platformRegion: string, // ej: "la1"
  apiKey: string,
): Promise<SummonerDTO | null> {
  try {
    const url = `https://${platformRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;

    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": apiKey,
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error(
        `[getSummonerByPuuid] Error ${response.status}:`,
        await response.text(),
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[getSummonerByPuuid] Exception for ${puuid}:`, error);
    return null;
  }
}
