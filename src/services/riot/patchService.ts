import { getServiceClient } from "@/lib/supabase";

// --- Interfaces para Datos de Riot API ---

interface Image {
  full: string;
  sprite: string;
  group: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ChampionStats {
  hp: number;
  hpperlevel: number;
  mp: number;
  mpperlevel: number;
  movespeed: number;
  armor: number;
  armorperlevel: number;
  spellblock: number;
  spellblockperlevel: number;
  attackrange: number;
  hpregen: number;
  hpregenperlevel: number;
  mpregen: number;
  mpregenperlevel: number;
  crit: number;
  critperlevel: number;
  attackdamage: number;
  attackdamageperlevel: number;
  attackspeedperlevel: number;
  attackspeed: number;
}

interface ChampionSpell {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  cooldown: number[];
  cooldownBurn: string;
  cost: number[];
  costBurn: string;
  range: number[];
  rangeBurn: string;
  image: Image;
  effect: (number | null)[][];
}

interface ChampionData {
  id: string;
  name: string;
  stats: ChampionStats;
  spells: ChampionSpell[];
  passive: {
    name: string;
    description: string;
    image: Image;
  };
  image: Image;
  skins: {
    id: string;
    num: number;
    name: string;
  }[];
}

interface ItemData {
  name: string;
  description: string;
  plaintext: string;
  gold: {
    base: number;
    purchasable: boolean;
    total: number;
    sell: number;
  };
  stats: Record<string, number>;
  image: Image;
}

interface Rune {
  id: number;
  key: string;
  icon: string;
  name: string;
  shortDesc: string;
  longDesc: string;
}

interface RunePath {
  id: number;
  key: string;
  icon: string;
  name: string;
  slots: {
    runes: Rune[];
  }[];
}

interface SummonerSpell {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  cooldown: number[];
  cooldownBurn: string;
  image: Image;
}

// --- Interfaces para Cambios Detectados ---

interface StatChange {
  stat: string;
  old: number | string;
  new: number | string;
  type: "buff" | "nerf" | "adjustment";
}

interface SpellAttributeChange {
  attribute: string;
  old: string;
  new: string;
  type: "buff" | "nerf" | "adjustment";
}

interface SpellChange {
  name: string;
  image: string;
  key: string;
  changes: SpellAttributeChange[];
}

interface PassiveChange {
  name: string;
  image: string;
  descriptionChange: { old: string; new: string };
  type: "adjustment";
}

interface ChampionChange {
  id: string;
  name: string;
  image: string;
  stats: StatChange[];
  spells: SpellChange[];
  passive?: PassiveChange;
  developerContext?: {
    summary?: string;
    context?: string;
    changes?: string[];
  };
}

interface ItemChange {
  id: string;
  name: string;
  image: string;
  statChanges: StatChange[];
  goldChange?: { old: number; new: number };
  descriptionChange?: { old: string; new: string };
  type: "buff" | "nerf" | "adjustment" | "new";
  developerContext?: {
    summary?: string;
    context?: string;
    changes?: string[];
  };
}

interface RuneChange {
  id: number;
  name: string;
  icon: string;
  descriptionChange?: { old: string; new: string };
}

interface SummonerChange {
  id: string;
  name: string;
  image: string;
  descriptionChange?: { old: string; new: string };
  cooldownChange?: { old: string; new: string };
}

interface PatchData {
  version: string;
  champions: ChampionChange[];
  items: ItemChange[];
  runes: RuneChange[];
  summoners: SummonerChange[];
  displayVersion?: string;
  scrapingDebug?: any;
}

import { getPatchContext, PatchContext } from "./scrapingService";
import { championService } from "./championService";

export const patchService = {
  async checkForNewPatch(force: boolean = false) {
    try {
      // 1. Obtener versiones sin caché
      const versionsResponse = await fetch(
        "https://ddragon.leagueoflegends.com/api/versions.json",
        { cache: "no-store", headers: { "Cache-Control": "no-cache" } }
      );
      if (!versionsResponse.ok) throw new Error("Error fetching versions");
      const versions: string[] = await versionsResponse.json();
      const latestVersion = versions[0];
      const previousVersion = versions[1];

      console.log(
        `Versiones detectadas - Latest: ${latestVersion}, Prev: ${previousVersion}`
      );

      if (!latestVersion || !previousVersion)
        throw new Error("Versions not found");

      console.log(`Checking patch: ${latestVersion} vs ${previousVersion}`);

      const supabase = getServiceClient();

      // 2. Comprobar existencia (y force flag)
      if (!force) {
        const { data: existing } = await supabase
          .from("lol_versions")
          .select("*")
          .eq("version", latestVersion)
          .single();

        if (existing) {
          console.log(`Version ${latestVersion} already processed.`);
          return { status: "already_exists", version: latestVersion };
        }
      } else {
        console.log(`Force flag enabled for ${latestVersion}`);
      }

      console.log(`Processing patch ${latestVersion}...`);

      // 3. Obtener TODOS los datos "Full"
      const [
        latestChamps,
        prevChamps,
        latestItems,
        prevItems,
        latestRunes,
        prevRunes,
        latestSums,
        prevSums,
      ] = await Promise.all([
        this.fetchChampionFull(latestVersion),
        this.fetchChampionFull(previousVersion),
        this.fetchItems(latestVersion),
        this.fetchItems(previousVersion),
        this.fetchRunes(latestVersion),
        this.fetchRunes(previousVersion),
        this.fetchSummoners(latestVersion),
        this.fetchSummoners(previousVersion),
      ]);

      // 3.5. Obtener contexto de la web oficial (Scraping)
      console.log("Fetching developer context from official site...");
      const patchContext = await getPatchContext(
        latestVersion,
        Object.keys(latestChamps?.data || {}),
        Object.keys(latestItems?.data || {})
      );

      // 4. Comparar TODO - Usando contextos categorizados
      const championChanges = this.compareChampions(
        prevChamps,
        latestChamps,
        patchContext.champions
      );
      const itemChanges = this.compareItems(
        prevItems,
        latestItems,
        patchContext.items
      );
      const runeChanges = this.compareRunes(prevRunes, latestRunes);
      const summonerChanges = this.compareSummoners(prevSums, latestSums);

      // 5. Preparar Payload
      const slug = `parche-${latestVersion.replace(/\./g, "-")}`;

      // Obtener Admin ID (desde ENV o Base de Datos)
      let adminId = process.env.ADMIN_USER_ID;

      if (!adminId) {
        // Fallback: Buscar cualquier usuario con rol admin
        const { data: adminUser } = await supabase
          .from("perfiles")
          .select("id")
          .eq("role", "admin")
          .limit(1)
          .single();

        if (adminUser) {
          adminId = adminUser.id;
        }
      }

      // Seleccionar imagen de portada
      let imagenPrincipal = null;

      // Estrategia: Elegir un campeón modificado al azar
      if (championChanges.length > 0) {
        const randomChampChange =
          championChanges[Math.floor(Math.random() * championChanges.length)];
        // Buscar datos completos del campeón para obtener skins
        const champData = latestChamps[randomChampChange.id];
        if (champData && champData.skins && champData.skins.length > 0) {
          // Intentar no elegir la skin base (num 0) si hay otras opciones, para variar
          const skins = champData.skins;
          // Filtrar skins que no sean la default si es posible, sino usar cualquiera
          const candidateSkins =
            skins.length > 1 ? skins.filter((s) => s.num !== 0) : skins;
          const randomSkin =
            candidateSkins[Math.floor(Math.random() * candidateSkins.length)];
          imagenPrincipal = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champData.id}_${randomSkin.num}.jpg`;
        }
      }

      // Si no tenemos imagen (no hubo campeones modificados o error), elegir uno al azar de todos
      if (!imagenPrincipal) {
        const allChampKeys = Object.keys(latestChamps);
        if (allChampKeys.length > 0) {
          const randomKey =
            allChampKeys[Math.floor(Math.random() * allChampKeys.length)];
          const champData = latestChamps[randomKey];
          if (champData && champData.skins && champData.skins.length > 0) {
            const randomSkin =
              champData.skins[
                Math.floor(Math.random() * champData.skins.length)
              ];
            imagenPrincipal = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champData.id}_${randomSkin.num}.jpg`;
          }
        }
      }

      // Convertir la imagen principal a nuestra URL dinámica con texto
      if (imagenPrincipal) {
        // Usamos ruta relativa o absoluta si existe la variable.
        // Al guardar en base de datos, lo ideal es que sea accesible desde cualquier lugar.
        // Si usamos ruta relativa iniciando con /, en la web funcionará.
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
        imagenPrincipal = `${baseUrl}/api/og/patch?version=${latestVersion}&bg=${encodeURIComponent(
          imagenPrincipal
        )}`;
      }

      const season = parseInt(latestVersion.split(".")[0]);
      const patchNum = latestVersion.split(".")[1];
      const displayVersion = `${season + 10}.${patchNum}`;

      // 5. Deduplicar Items (Fix para "Retoño de Pisamusgo" duplicado)
      const uniqueItemChanges = Array.from(
        itemChanges
          .reduce((map, item) => {
            if (!map.has(item.id)) {
              map.set(item.id, item);
            } else {
              // Merge inteligente: Si ya existe, nos quedamos con el que tenga más info
              const existing = map.get(item.id)!;
              const hasStats = item.statChanges.length > 0;
              const hasContext = !!item.developerContext;
              const existingHasStats = existing.statChanges.length > 0;
              const existingHasContext = !!existing.developerContext;

              // Si el nuevo tiene stats y el viejo no, reemplazamos
              if (hasStats && !existingHasStats) {
                map.set(item.id, item);
              }
              // Si ambos tienen stats (o ninguno), priorizamos el que tenga contexto
              else if (hasContext && !existingHasContext) {
                map.set(item.id, item);
              }
              // Si el nuevo tiene una sección definida y el viejo no, reemplazamos
              else if (
                item.developerContext?.section &&
                !existing.developerContext?.section
              ) {
                map.set(item.id, item);
              }
            }
            return map;
          }, new Map<string, ItemChange>())
          .values()
      ) as ItemChange[];

      const patchData: PatchData = {
        version: latestVersion, // Versión Técnica para DataDragon (16.1.1)
        displayVersion: displayVersion, // Versión Comercial para mostrar (26.1)
        champions: championChanges,
        items: uniqueItemChanges,
        runes: runeChanges,
        summoners: summonerChanges,
        scrapingDebug: {
          ...patchContext._meta,
          contextsFound: patchContext._meta?.contextsFound || 0,
        },
      };

      const hasChanges =
        championChanges.length > 0 ||
        uniqueItemChanges.length > 0 ||
        runeChanges.length > 0 ||
        summonerChanges.length > 0;

      // Generar resumen HTML usando la versión comercial si es posible
      let contentHtml = `<h3>Resumen del Parche ${displayVersion} (${latestVersion})</h3>`;
      contentHtml += `<ul>
        <li>Campeones modificados: ${championChanges.length}</li>
        <li>Objetos modificados: ${itemChanges.length}</li>
        <li>Runas modificadas: ${runeChanges.length}</li>
        <li>Hechizos modificados: ${summonerChanges.length}</li>
      </ul>`;

      const payload = {
        titulo: `Notas del Parche ${displayVersion}`,
        contenido: contentHtml,
        type: "lol_patch",
        fecha_publicacion: new Date().toISOString(),
        estado: "publicada", // Asegurar que sea visible
        autor_id: adminId || undefined,
        slug: slug,
        data: patchData,
        imagen_portada: imagenPrincipal,
      };

      // 6. Insertar o Actualizar noticia
      const { data: newsData, error: newsError } = await supabase
        .from("noticias")
        .upsert(payload, { onConflict: "slug" })
        .select("id, slug")
        .single();

      if (newsError)
        throw new Error(`Error creating/updating news: ${newsError.message}`);

      // 7. Notificación
      if (adminId && hasChanges) {
        await supabase.from("notifications").insert({
          user_id: adminId,
          type: "info",
          title: `Borrador Parche ${latestVersion}`,
          message: `Se detectaron cambios en ${latestVersion}. Revisa el borrador.`,
          data: {
            link: `/noticias/${newsData.id}`,
            version: latestVersion,
            noticiaSlug: newsData.slug,
          },
        });
      }

      // 8. Marcar versión
      // 8. Marcar versión
      await supabase
        .from("lol_versions")
        .upsert({ version: latestVersion }, { onConflict: "version" });

      // 9. Sincronizar Campeones y Skins (CRON AUTOMATION)
      console.log("Syncing champion data...");
      let championSyncResult = null;
      try {
        championSyncResult = await championService.fetchAndSyncChampions(
          latestVersion
        );
      } catch (champError) {
        console.error("Error syncing champions:", champError);
      }

      return {
        status: "processed",
        version: latestVersion,
        patchChanges: {
          champions: championChanges.length,
          items: itemChanges.length,
          runes: runeChanges.length,
          summoners: summonerChanges.length,
        },
        championDatabase: championSyncResult,
        scrapingDebug: patchContext._meta,
      };
    } catch (error) {
      console.error("Error in patchService:", error);
      throw error;
    }
  },

  // --- Fetchers ---

  async fetchChampionFull(
    version: string
  ): Promise<Record<string, ChampionData>> {
    const res = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/es_ES/championFull.json`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`Failed fetches champions ${version}`);
    const json = await res.json();
    return json.data;
  },

  async fetchItems(version: string): Promise<Record<string, ItemData>> {
    const res = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/es_ES/item.json`
    );
    if (!res.ok) return {};
    const json = await res.json();
    return json.data;
  },

  // Compare Items
  compareItems(
    oldData: Record<string, ItemData>,
    newData: Record<string, ItemData>,
    contextMap: Record<
      string,
      { summary?: string; context?: string; changes?: string[] }
    > = {}
  ): ItemChange[] {
    const changes: ItemChange[] = [];

    // First, include all items mentioned in context (from official patch notes)
    for (const itemName in contextMap) {
      // Try to find the item in DDragon data by name
      let foundItem: ItemData | null = null;
      let itemKey: string | null = null;

      for (const key in newData) {
        const item = newData[key];
        // Normalizar nombres para comparación robusta (ignorar acentos, case y caracteres especiales)
        const normalize = (s: string) =>
          s
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");

        if (normalize(item.name) === normalize(itemName)) {
          foundItem = item;
          itemKey = key;
          break;
        }
      }

      if (foundItem && itemKey) {
        const oldItem = oldData[itemKey];
        const statChanges: StatChange[] = [];
        let goldChange;
        let descriptionChanged = false;

        if (oldItem) {
          // Item existente con cambios
          for (const stat in foundItem.stats) {
            const oldVal = oldItem.stats[stat] || 0;
            const newVal = foundItem.stats[stat];
            if (oldVal !== newVal) {
              statChanges.push({
                stat,
                old: oldVal,
                new: newVal,
                type: newVal > oldVal ? "buff" : "nerf",
              });
            }
          }

          if (foundItem.gold.total !== oldItem.gold.total) {
            goldChange = { old: oldItem.gold.total, new: foundItem.gold.total };
          }

          descriptionChanged = foundItem.description !== oldItem.description;
        }

        // Incluir el item aunque sea nuevo (sin oldItem) si está en el contexto
        changes.push({
          id: itemKey,
          name: foundItem.name,
          image: foundItem.image.full,
          statChanges,
          goldChange,
          descriptionChange: descriptionChanged
            ? { old: "...", new: "Updated" }
            : undefined,
          type: oldItem ? "adjustment" : "new",
          developerContext: contextMap[itemName],
        });
      } else if (!foundItem && contextMap[itemName]) {
        // Item mencionado en notas pero no encontrado en DDragon (quizás nombre diferente)
        // Crear entrada placeholder con la info del scraping
        changes.push({
          id: `scraped-${itemName.toLowerCase().replace(/\s+/g, "-")}`,
          name: itemName,
          image: "3340.png", // Trinket placeholder
          statChanges: [],
          goldChange: undefined,
          descriptionChange: undefined,
          type: "new",
          developerContext: contextMap[itemName],
        });
      }
    }

    // Then, include items with changes but not mentioned in context
    for (const key in newData) {
      const newItem = newData[key];
      const oldItem = oldData[key];
      if (!oldItem || !newItem.gold.purchasable) continue;

      // Skip if already included from context
      if (contextMap[newItem.name]) continue;

      // Map 11 is Summoner's Rift. DDragon item.maps is a map of string->boolean {"11": true}
      // But checking if "11" key exists or is true is safer.
      // However, item type definitions are loose here. Let's assume most purchasable items are relevant.

      const statChanges: StatChange[] = [];

      // Stats
      for (const stat in newItem.stats) {
        const oldVal = oldItem.stats[stat] || 0;
        const newVal = newItem.stats[stat];
        if (oldVal !== newVal) {
          statChanges.push({
            stat,
            old: oldVal,
            new: newVal,
            type: newVal > oldVal ? "buff" : "nerf",
          });
        }
      }

      // Gold
      let goldChange;
      if (newItem.gold.total !== oldItem.gold.total) {
        goldChange = { old: oldItem.gold.total, new: newItem.gold.total };
      }

      const descriptionChanged = newItem.description !== oldItem.description;

      if (statChanges.length > 0 || goldChange || descriptionChanged) {
        changes.push({
          id: key,
          name: newItem.name,
          image: newItem.image.full,
          statChanges,
          goldChange,
          descriptionChange: descriptionChanged
            ? { old: "...", new: "Updated" }
            : undefined,
          type: "adjustment",
          developerContext: undefined,
        });
      }
    }
    return changes;
  },

  async fetchRunes(version: string): Promise<RunePath[]> {
    const res = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/es_ES/runesReforged.json`
    );
    if (!res.ok) return [];
    return await res.json();
  },

  async fetchSummoners(
    version: string
  ): Promise<Record<string, SummonerSpell>> {
    const res = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/es_ES/summoner.json`
    );
    if (!res.ok) return {};
    const json = await res.json();
    return json.data;
  },

  // Compare Champions
  compareChampions(
    oldData: Record<string, ChampionData>,
    newData: Record<string, ChampionData>,
    contextMap: Record<
      string,
      { summary?: string; context?: string; changes?: string[] }
    > = {}
  ): ChampionChange[] {
    const changes: ChampionChange[] = [];
    for (const key in newData) {
      const newChamp = newData[key];
      const oldChamp = oldData[key];
      if (!oldChamp) continue;

      const statChanges: StatChange[] = [];
      const spellChanges: SpellChange[] = [];

      // Stats comparison
      this.compareStat(
        statChanges,
        "hp",
        oldChamp.stats.hp,
        newChamp.stats.hp,
        true
      );
      this.compareStat(
        statChanges,
        "armor",
        oldChamp.stats.armor,
        newChamp.stats.armor,
        true
      );
      this.compareStat(
        statChanges,
        "attackdamage",
        oldChamp.stats.attackdamage,
        newChamp.stats.attackdamage,
        true
      );
      this.compareStat(
        statChanges,
        "movespeed",
        oldChamp.stats.movespeed,
        newChamp.stats.movespeed,
        true
      );

      // Spells comparison
      const spellKeys = ["Q", "W", "E", "R"];
      for (let i = 0; i < newChamp.spells.length; i++) {
        const newSpell = newChamp.spells[i];
        const oldSpell = oldChamp.spells[i];
        if (!oldSpell) continue;

        const spellAttrChanges: SpellAttributeChange[] = [];

        // Cooldown
        if (newSpell.cooldownBurn !== oldSpell.cooldownBurn) {
          const cdType =
            parseFloat(newSpell.cooldownBurn) <
            parseFloat(oldSpell.cooldownBurn)
              ? "buff"
              : "nerf";
          spellAttrChanges.push({
            attribute: "cooldown",
            old: oldSpell.cooldownBurn,
            new: newSpell.cooldownBurn,
            type: cdType,
          });
        }

        // Cost
        if (newSpell.costBurn !== oldSpell.costBurn) {
          const costType =
            parseFloat(newSpell.costBurn) < parseFloat(oldSpell.costBurn)
              ? "buff"
              : "nerf";
          spellAttrChanges.push({
            attribute: "cost",
            old: oldSpell.costBurn,
            new: newSpell.costBurn,
            type: costType,
          });
        }

        // Effect (damage values)
        if (newSpell.effect && oldSpell.effect) {
          const limit = Math.min(
            newSpell.effect.length,
            oldSpell.effect.length
          );

          for (let effectIdx = 0; effectIdx < limit; effectIdx++) {
            const newEffect = newSpell.effect[effectIdx];
            const oldEffect = oldSpell.effect[effectIdx];

            // Ignorar si alguno es nulo o vacio
            if (!newEffect || !oldEffect) continue;

            const newFiltered = newEffect.filter((v) => v !== null);
            const oldFiltered = oldEffect.filter((v) => v !== null);

            // Comparar strings JSON para detectar CUALQUIER cambio
            if (
              newFiltered.length > 0 &&
              oldFiltered.length > 0 &&
              JSON.stringify(newFiltered) !== JSON.stringify(oldFiltered)
            ) {
              const oldStr = oldFiltered.join("/");
              const newStr = newFiltered.join("/");

              // FILTER GARBAGE DATA:
              // If newStr involves only "0" or "0/0/0", it's likely a data structure change, not a real nerf to 0.
              // Example: "60/75/90" -> "0/0/0"
              if (/^[0/]+$/.test(newStr)) {
                continue;
              }

              // Intentar determinar tipo (buff/nerf) de forma mas segura
              // Si falla el calculo, dejarlo como 'adjustment'
              let damageType: "buff" | "nerf" | "adjustment" = "adjustment";

              // Usar el ultimo valor (nivel maximo) como referencia heuristica
              const lastOld = oldFiltered[oldFiltered.length - 1];
              const lastNew = newFiltered[newFiltered.length - 1];

              if (typeof lastOld === "number" && typeof lastNew === "number") {
                if (lastNew > lastOld) damageType = "buff";
                else if (lastNew < lastOld) damageType = "nerf";
              }

              spellAttrChanges.push({
                attribute: "damage",
                old: oldStr,
                new: newStr,
                type: damageType,
              });
            }
          }
        }

        // Description
        // Solo marcar cambio de descripcion si hay cambio real de texto y no hemos detectado cambio numerico,
        // o si queremos ser exhaustivos. A veces Riot cambia solo texto.
        if (newSpell.description !== oldSpell.description) {
          // Limpiar etiquetas HTML para comparar texto real si se desea, por ahora directo
          // Pero evitar duplicados si ya detectamos damage change? No, mostrar ambos es mejor.

          // Ignorar cambios triviales de espacios
          if (newSpell.description.trim() !== oldSpell.description.trim()) {
            spellAttrChanges.push({
              attribute: "description",
              old: oldSpell.description,
              new: newSpell.description,
              type: "adjustment",
            });
          }
        }

        if (spellAttrChanges.length > 0) {
          spellChanges.push({
            name: newSpell.name,
            image: newSpell.image.full,
            key: spellKeys[i] || "Q",
            changes: spellAttrChanges,
          });
        }
      }

      // Passive comparison
      let passiveChange: PassiveChange | undefined;
      if (newChamp.passive.description !== oldChamp.passive.description) {
        passiveChange = {
          name: newChamp.passive.name,
          image: newChamp.passive.image.full,
          descriptionChange: {
            old: oldChamp.passive.description,
            new: newChamp.passive.description,
          },
          type: "adjustment",
        };
      }

      // Get context
      // Try exact match first
      let context = contextMap[newChamp.name];

      // If not found, try normalized match
      if (!context) {
        const normalizedChampName = newChamp.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const foundKey = Object.keys(contextMap).find(
          (key) =>
            key.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedChampName
        );
        if (foundKey) {
          context = contextMap[foundKey];
        }
      }

      // --- INTEGRAR CAMBIOS SCRAPEADOS (TEXTO -> VISUAL) ---
      if (context && context.changes && context.changes.length > 0) {
        let currentSection: "Passive" | "Q" | "W" | "E" | "R" | "Stats" | null =
          null;
        let pendingText: string[] = [];

        // Función auxiliar para procesar textos pendientes
        const flushPending = () => {
          if (!currentSection || pendingText.length === 0) return;

          // Procesar cada línea individualmente para intentar extraer estructura
          const parsedChanges: SpellAttributeChange[] = [];

          for (const line of pendingText) {
            const cleanLine = line.replace(/^\s*[•-]\s*/, "").trim();
            if (!cleanLine) continue;

            // Detectar "Corrección de error:" como caso especial
            if (cleanLine.toLowerCase().startsWith("corrección de error:")) {
              const errorText = cleanLine
                .substring("corrección de error:".length)
                .trim();
              parsedChanges.push({
                attribute: "Corrección de error",
                old: "",
                new: errorText,
                type: "adjustment",
              });
              continue;
            }

            // Intentar matchear formato "Atributo: Viejo => Nuevo"
            // Soporta:
            // - Colons: : o ：(full width)
            // - Arrows: ->, =>, &rArr;, ⇒, →, ➤, >, -
            // - Spaces around elements
            const match = cleanLine.match(
              /^([^:：]+)[:：]\s*(.+?)\s*(?:=>|->|&rArr;|⇒|→|➤|[-=]+>)\s*(.+?)[.]?$/
            );

            if (match) {
              let rawAttr = match[1].trim();
              const oldVal = match[2].trim();
              const newVal = match[3].trim();

              // Limpiar atributo (quitar parentesis de versiones)
              rawAttr = rawAttr.replace(/\s*\(.*?\)/g, "").trim();

              // Usar el texto completo como badge
              parsedChanges.push({
                attribute: rawAttr,
                old: oldVal,
                new: newVal,
                type: "adjustment",
              });
            } else {
              // Si no matchea estructura, es una descripción plana
              parsedChanges.push({
                attribute: "description",
                old: "",
                new: cleanLine,
                type: "adjustment",
              });
            }
          }

          if (currentSection === "Passive") {
            if (!passiveChange) {
              // Para pasiva, si detectamos multiples cambios, podriamos intentar fusionarlos o just use generic description.
              // La UI de pasiva actual espera "descriptionChange".
              // Si tenemos varios parsedChanges, tomamos el primero o unimos los textos si son description.
              // Si son atributos estructurados, Pasiva no suele tener soporte visual para stats en la UI actual (solo desc change).
              // FOR NOW: Join text for passive to keep it simple, or map first change.
              // User wants standard design. Spell design supports attributes. Passive design currently supports generic desc.
              // Let's stick to text for passive unless we upgrade Passive UI too.
              const combinedNew = parsedChanges
                .map((c) =>
                  c.attribute === "description"
                    ? c.new
                    : `${c.attribute}: ${c.old} -> ${c.new}`
                )
                .join("\n");

              passiveChange = {
                name: newChamp.passive.name,
                image: newChamp.passive.image.full,
                descriptionChange: {
                  old: "",
                  new: combinedNew,
                },
                type: "adjustment",
              };
            }
          } else {
            // Slots Q, W, E, R
            const keyIndex = ["Q", "W", "E", "R"].indexOf(currentSection);
            if (keyIndex !== -1) {
              const spellKey = currentSection;
              const existingSpellChange = spellChanges.find(
                (s) => s.key === spellKey
              );
              // Si no existe, lo creamos. Si existe, podríamos (opcionalmente) agregar cambios extra?
              // El plan original decía "si no existe". Mantengamos eso para evitar conflictos con API.

              if (!existingSpellChange) {
                const targetSpell = newChamp.spells[keyIndex];
                if (targetSpell) {
                  spellChanges.push({
                    name: targetSpell.name,
                    image: targetSpell.image.full,
                    key: spellKey,
                    changes: parsedChanges,
                  });
                }
              }
            }
          }
          pendingText = [];
        };

        const remainingLines: string[] = [];

        for (const line of context.changes) {
          // Detectar headers tipo **Pasiva - Nombre**, **Q - Nombre**
          // Se asume que el scraper preserve las negritas ** o el formato
          const lowerLine = line.toLowerCase();

          let nextSection: "Passive" | "Q" | "W" | "E" | "R" | "Stats" | null =
            null;

          if (lowerLine.includes("estadísticas") || lowerLine.includes("stat"))
            nextSection = "Stats";
          else if (
            lowerLine.includes("**pasiva") ||
            lowerLine.includes("pasiva -")
          )
            nextSection = "Passive";
          else if (lowerLine.includes("**q") || lowerLine.includes("q -"))
            nextSection = "Q";
          else if (lowerLine.includes("**w") || lowerLine.includes("w -"))
            nextSection = "W";
          else if (lowerLine.includes("**e") || lowerLine.includes("e -"))
            nextSection = "E";
          else if (lowerLine.includes("**r") || lowerLine.includes("r -"))
            nextSection = "R";

          // Detectar si entramos en sección Stats ANTES del flush general
          const isStatsSection = nextSection === "Stats";
          const isStatsContent = currentSection === "Stats" && !nextSection;

          if (nextSection && !isStatsSection) {
            flushPending();
            currentSection = nextSection;
          }

          // Lógica de procesamiento según la sección actual
          if (isStatsSection) {
            // El header "Estadísticas básicas" se añade a remainingLines para mostrarlo
            remainingLines.push(line);
            currentSection = "Stats" as typeof currentSection;
          } else if (isStatsContent) {
            // Estamos procesando líneas DENTRO de la sección de Stats
            remainingLines.push(line);
          } else if (nextSection) {
            // Es un header de habilidad (Q, W, E, R, Pasiva), no añadir a remainingLines
            // currentSection ya está seteado arriba
          } else if (currentSection) {
            // Estamos dentro de una habilidad, añadir a pendingText para procesar
            pendingText.push(line);
          } else {
            // Línea sin sección (contexto general), añadir a remainingLines
            remainingLines.push(line);
          }
        }
        flushPending(); // Procesar último bloque

        // Actualizar context.changes con lo que sobró (incluye Stats ahora)
        context.changes = remainingLines;
      }

      if (
        statChanges.length > 0 ||
        spellChanges.length > 0 ||
        passiveChange ||
        context
      ) {
        changes.push({
          id: key,
          name: newChamp.name,
          image: newChamp.image.full,
          stats: statChanges,
          spells: spellChanges,
          passive: passiveChange,
          developerContext: context,
        });
      }
    }
    return changes;
  },

  // Compare Summoners
  compareSummoners(
    oldData: Record<string, SummonerSpell>,
    newData: Record<string, SummonerSpell>
  ): SummonerChange[] {
    const changes: SummonerChange[] = [];
    for (const key in newData) {
      const newSum = newData[key];
      const oldSum = oldData[key];
      if (!oldSum) continue;

      let descChange;
      let cdChange;

      if (newSum.description !== oldSum.description) {
        descChange = { old: oldSum.description, new: newSum.description };
      }

      if (newSum.cooldownBurn !== oldSum.cooldownBurn) {
        cdChange = { old: oldSum.cooldownBurn, new: newSum.cooldownBurn };
      }

      if (descChange || cdChange) {
        changes.push({
          id: key,
          name: newSum.name,
          image: newSum.image.full,
          descriptionChange: descChange,
          cooldownChange: cdChange,
        });
      }
    }
    return changes;
  },

  compareStat(
    changes: StatChange[],
    stat: string,
    oldVal: number,
    newVal: number,
    higherBetter: boolean
  ) {
    // Some stats are floating point, allow very small difference but be inclusive
    if (Math.abs(oldVal - newVal) > 0.0001) {
      changes.push({
        stat,
        old: oldVal,
        new: newVal,
        type: newVal > oldVal === higherBetter ? "buff" : "nerf",
      });
    }
  },
  // --- Helper to flatten rune paths into a map ---
  flattenRunes(paths: RunePath[]): Record<string, Rune> {
    const map: Record<string, Rune> = {};
    paths.forEach((path) => {
      path.slots.forEach((slot) => {
        slot.runes.forEach((rune) => {
          map[rune.id] = rune;
        });
      });
    });
    return map;
  },

  // Compare Runes
  compareRunes(oldPaths: RunePath[], newPaths: RunePath[]): RuneChange[] {
    const oldMap = this.flattenRunes(oldPaths);
    const newMap = this.flattenRunes(newPaths);
    const changes: RuneChange[] = [];
    for (const key in newMap) {
      const newRune = newMap[key];
      const oldRune = oldMap[key];
      if (!oldRune) continue;
      if (newRune.longDesc !== oldRune.longDesc) {
        changes.push({
          id: newRune.id,
          name: newRune.name,
          icon: newRune.icon,
          descriptionChange: {
            old: oldRune.longDesc,
            new: newRune.longDesc,
          },
        });
      }
    }
    return changes;
  },
};
