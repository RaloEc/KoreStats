export interface LoLItem {
  id: string; // "Viego", "ViegoQ"
  name: string; // "Viego", "Blade of the Ruined King"
  type: "champion" | "ability" | "item" | "summoner" | "rune" | "user";
  image: string; // Full URL
  description?: string;
}

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

// Cache
let version: string | null = null;
const championsCache: Record<string, any> = { es_MX: null, en_US: null };
const itemsCache: Record<string, any> = { es_MX: null, en_US: null };
const summonersCache: Record<string, any> = { es_MX: null, en_US: null };
const runesCache: Record<string, any> = { es_MX: null, en_US: null };
const championDetailsCache: Record<string, any> = {};

async function getVersion(): Promise<string> {
  if (version) return version;
  try {
    const res = await fetch(`${DDRAGON_BASE}/api/versions.json`);
    const versions = await res.json();
    version = versions[0];
    return version!;
  } catch (e) {
    console.error("Failed to fetch LoL version", e);
    return "14.1.1"; // Fallback
  }
}

async function fetchData(locale: "es_MX" | "en_US", endpoint: string) {
  const v = await getVersion();
  const res = await fetch(
    `${DDRAGON_BASE}/cdn/${v}/data/${locale}/${endpoint}.json`,
  );
  const data = await res.json();
  return data.data;
}

async function getChampions(locale: "es_MX" | "en_US") {
  if (championsCache[locale]) return championsCache[locale];
  try {
    championsCache[locale] = await fetchData(locale, "champion");
    return championsCache[locale];
  } catch (e) {
    console.error(`Failed to fetch champions for ${locale}`, e);
    return {};
  }
}

async function getItems(locale: "es_MX" | "en_US") {
  if (itemsCache[locale]) return itemsCache[locale];
  try {
    itemsCache[locale] = await fetchData(locale, "item");
    return itemsCache[locale];
  } catch (e) {
    console.error(`Failed to fetch items for ${locale}`, e);
    return {};
  }
}

async function getSummoners(locale: "es_MX" | "en_US") {
  if (summonersCache[locale]) return summonersCache[locale];
  try {
    summonersCache[locale] = await fetchData(locale, "summoner");
    return summonersCache[locale];
  } catch (e) {
    console.error(`Failed to fetch summoners for ${locale}`, e);
    return {};
  }
}

async function getRunes(locale: "es_MX" | "en_US") {
  if (runesCache[locale]) return runesCache[locale];
  const v = await getVersion();
  try {
    const res = await fetch(
      `${DDRAGON_BASE}/cdn/${v}/data/${locale}/runesReforged.json`,
    );
    runesCache[locale] = await res.json();
    return runesCache[locale];
  } catch (e) {
    console.error(`Failed to fetch runes for ${locale}`, e);
    return [];
  }
}

async function getChampionDetails(
  championId: string,
  locale: "es_MX" | "en_US" = "es_MX",
) {
  const cacheKey = `${championId}_${locale}`;
  if (championDetailsCache[cacheKey]) return championDetailsCache[cacheKey];
  const v = await getVersion();
  try {
    const res = await fetch(
      `${DDRAGON_BASE}/cdn/${v}/data/${locale}/champion/${championId}.json`,
    );
    const data = await res.json();
    const details = data.data[championId];
    championDetailsCache[cacheKey] = details;
    return details;
  } catch (e) {
    console.error(`Failed to fetch details for ${championId} in ${locale}`, e);
    return null;
  }
}

export async function searchLoLContent(query: string): Promise<LoLItem[]> {
  const v = await getVersion();
  query = query.toLowerCase();
  const results: LoLItem[] = [];

  // Load both languages
  const [champsEs, champsEn] = await Promise.all([
    getChampions("es_MX"),
    getChampions("en_US"),
  ]);
  const [itemsEs, itemsEn] = await Promise.all([
    getItems("es_MX"),
    getItems("en_US"),
  ]);
  const [summsEs, summsEn] = await Promise.all([
    getSummoners("es_MX"),
    getSummoners("en_US"),
  ]);
  const [runesEs, runesEn] = await Promise.all([
    getRunes("es_MX"),
    getRunes("en_US"),
  ]);

  // 1. Champions
  const champKeys = Object.keys(champsEs);
  for (const key of champKeys) {
    const champEs = champsEs[key];
    const champEn = champsEn[key];
    if (
      champEs.name.toLowerCase().includes(query) ||
      champEn.name.toLowerCase().includes(query) ||
      key.toLowerCase().includes(query)
    ) {
      results.push({
        id: key,
        name: champEs.name, // Display in Spanish
        type: "champion",
        image: `${DDRAGON_BASE}/cdn/${v}/img/champion/${champEs.image.full}`,
        description: champEs.title,
      });
    }
  }

  // 2. Items
  if (query.length > 2) {
    const itemKeys = Object.keys(itemsEs);
    const seenNames = new Set<string>();
    for (const key of itemKeys) {
      const itemEs = itemsEs[key];
      const itemEn = itemsEn[key] || itemEs; // Fallback to ES if EN missing
      if (!itemEs.name) continue;

      if (
        (itemEs.name.toLowerCase().includes(query) ||
          itemEn.name.toLowerCase().includes(query)) &&
        !seenNames.has(itemEs.name.toLowerCase())
      ) {
        seenNames.add(itemEs.name.toLowerCase());
        results.push({
          id: `item_${key}`,
          name: itemEs.name,
          type: "item",
          image: `${DDRAGON_BASE}/cdn/${v}/img/item/${itemEs.image.full}`,
          description: itemEs.plaintext,
        });
      }
    }
  }

  // 3. Summoners
  if (query.length > 1) {
    const summKeys = Object.keys(summsEs);
    for (const key of summKeys) {
      const summEs = summsEs[key];
      const summEn = summsEn[key] || summEs;
      if (
        summEs.name.toLowerCase().includes(query) ||
        summEn.name.toLowerCase().includes(query)
      ) {
        results.push({
          id: `summoner_${summEs.id}`,
          name: summEs.name,
          type: "summoner",
          image: `${DDRAGON_BASE}/cdn/${v}/img/spell/${summEs.image.full}`,
          description: summEs.description,
        });
      }
    }
  }

  // 4. Runes
  if (query.length > 2) {
    runesEs.forEach((styleEs: any, styleIdx: number) => {
      const styleEn = runesEn[styleIdx] || styleEs;
      // Style
      if (
        styleEs.name.toLowerCase().includes(query) ||
        styleEn.name.toLowerCase().includes(query)
      ) {
        results.push({
          id: `rune_style_${styleEs.id}`,
          name: styleEs.name,
          type: "rune",
          image: `${DDRAGON_BASE}/cdn/img/${styleEs.icon}`,
          description: `Rama de runas: ${styleEs.name}`,
        });
      }
      // Individual Runes
      styleEs.slots.forEach((slotEs: any, slotIdx: number) => {
        const slotEn = styleEn.slots[slotIdx];
        slotEs.runes.forEach((runeEs: any, runeIdx: number) => {
          const runeEn = slotEn.runes[runeIdx];
          if (
            runeEs.name.toLowerCase().includes(query) ||
            runeEn.name.toLowerCase().includes(query)
          ) {
            results.push({
              id: `rune_${runeEs.id}`,
              name: runeEs.name,
              type: "rune",
              image: `${DDRAGON_BASE}/cdn/img/${runeEs.icon}`,
              description: runeEs.shortDesc.replace(/<[^>]*>?/gm, ""),
            });
          }
        });
      });
    });
  }

  // 5. Abilities (Match Champion Name)
  const exactMatchChamp = champKeys.find((key) =>
    query.startsWith(key.toLowerCase()),
  );
  if (exactMatchChamp) {
    const details = await getChampionDetails(exactMatchChamp, "es_MX");
    if (details) {
      const keys = ["Q", "W", "E", "R"];
      details.spells.forEach((spell: any, idx: number) => {
        const key = keys[idx];
        if (
          `${exactMatchChamp}${key}`.toLowerCase().includes(query) ||
          query === exactMatchChamp.toLowerCase()
        ) {
          results.push({
            id: `${exactMatchChamp}_${key}`,
            name: `${exactMatchChamp} ${key} - ${spell.name}`,
            type: "ability",
            image: `${DDRAGON_BASE}/cdn/${v}/img/spell/${spell.image.full}`,
            description: spell.description,
          });
        }
      });
      if (
        `${exactMatchChamp}passive`.toLowerCase().includes(query) ||
        query === exactMatchChamp.toLowerCase()
      ) {
        results.push({
          id: `${exactMatchChamp}_P`,
          name: `${exactMatchChamp} Pasiva - ${details.passive.name}`,
          type: "ability",
          image: `${DDRAGON_BASE}/cdn/${v}/img/passive/${details.passive.image.full}`,
          description: details.passive.description,
        });
      }
    }
  }

  return results.slice(0, 15);
}

export async function getLastVersion() {
  return getVersion();
}
