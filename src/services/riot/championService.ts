import { getServiceClient } from "@/lib/supabase";
import { ChampionDB, ChampionFullData } from "@/types/riot";
import { getLatestDDragonVersion } from "@/lib/riot/helpers";

export const championService = {
  /**
   * Obtiene y sincroniza la lista completa de campeones desde Riot API a la base de datos.
   * Se ejecuta idealmente en background (cron).
   */
  async fetchAndSyncChampions(version: string) {
    console.log(
      `[ChampionService] Syncing champions for version ${version}...`
    );
    try {
      const response = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${version}/data/es_MX/championFull.json`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch championFull.json: ${response.statusText}`
        );
      }

      const json = await response.json();
      const data: Record<string, ChampionFullData> = json.data;

      const championsToUpsert: Partial<ChampionDB>[] = Object.values(data).map(
        (champ) => ({
          id: champ.id,
          key: parseInt(champ.key),
          name: champ.name,
          title: champ.title,
          skins: champ.skins,
          full_data: champ,
          version: version,
          updated_at: new Date().toISOString(),
        })
      );

      console.log(
        `[ChampionService] Prepare to upsert ${championsToUpsert.length} champions.`
      );

      const supabase = getServiceClient();

      const { error } = await supabase
        .from("lol_champions")
        .upsert(championsToUpsert, { onConflict: "id" });

      if (error) {
        throw error;
      }

      console.log(`[ChampionService] Successfully synced champions.`);
      return { success: true, count: championsToUpsert.length };
    } catch (error) {
      console.error("[ChampionService] Error syncing champions:", error);
      throw error;
    }
  },

  /**
   * Obtiene la lista de skins de un campeón por su ID (ej: "Aatrox" o 266)
   */
  async getChampionSkins(championIdOrKey: string | number) {
    const supabase = getServiceClient();
    let query = supabase.from("lol_champions").select("skins");

    if (
      typeof championIdOrKey === "number" ||
      !isNaN(Number(championIdOrKey))
    ) {
      query = query.eq("key", Number(championIdOrKey));
    } else {
      query = query.eq("id", championIdOrKey);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error(
        `[ChampionService] Error getting skins for ${championIdOrKey}`,
        error
      );
      return [];
    }

    return data?.skins || [];
  },

  /**
   * Obtiene la data completa de un campeón
   */
  async getChampion(championId: string): Promise<ChampionDB | null> {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("lol_champions")
      .select("*")
      .eq("id", championId)
      .single();

    if (error) return null;
    return data;
  },
};
