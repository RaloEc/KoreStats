import { load } from "cheerio";

export interface PatchContext {
  champions: {
    [key: string]: {
      summary?: string;
      context?: string;
      changes?: string[];
      section?: string;
    };
  };
  items: {
    [key: string]: {
      summary?: string;
      context?: string;
      changes?: string[];
      section?: string;
    };
  };
  runes: {
    [key: string]: {
      summary?: string;
      context?: string;
      changes?: string[];
      section?: string;
    };
  };
  summoners: {
    [key: string]: {
      summary?: string;
      context?: string;
      changes?: string[];
      section?: string;
    };
  };
  _meta?: any;
}

/**
 * Convierte una versión técnica "14.23" a un slug de URL "14-23".
 */
export function getPatchSlug(version: string): string {
  return version.replace(/\./g, "-");
}

export async function getPatchContext(
  version: string,
  knownChampionNames: string[] = [],
  knownItemNames: string[] = []
): Promise<PatchContext> {
  const parts = version.split(".");
  const season = parseInt(parts[0]);
  const patch = parts[1];

  // Generar posibles slugs para encontrar la URL correcta
  const slugsToTry: string[] = [];

  // 1. Formato estándar DataDragon (Season-Patch): ej. "16-1"
  slugsToTry.push(`${season}-${patch}`);

  // 2. Formato Comercial/Año (Heurística: Season + 10 ≈ Año corto).
  // Si season es 16 (2026), 16 + 10 = 26.
  // Esto cubre el caso que mencionas: DD 16.1 -> Web 26.1
  slugsToTry.push(`${season + 10}-${patch}`);

  // 3. Formato Año completo (ej. "2026-1") - Por si acaso
  slugsToTry.push(`20${season + 10}-${patch}`);

  // 4. Hardcoded fallbacks específicos por si acaso (ej. transición de temporada)
  if (season === 16) slugsToTry.push(`26-${patch}`); // Refuerzo explícito para 2026

  const debugInfo: any = {
    urlsTried: [] as string[],
    successUrl: null as string | null,
    contextsFound: 0,
    htmlLength: 0,
    pageTitle: "",
    firstHeaders: [] as string[],
    scrapingLog: [] as string[],
  };

  for (const slug of slugsToTry) {
    try {
      const url = `https://www.leagueoflegends.com/es-es/news/game-updates/patch-${slug}-notes/`;
      debugInfo.urlsTried.push(url);
      console.log(`Scraping patch notes from: ${url}`);
      debugInfo.scrapingLog.push(`Trying URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        console.warn(
          `Failed to fetch patch notes from ${url}: ${response.status}`
        );
        debugInfo.scrapingLog.push(`Failed fetch: ${response.status}`);
        continue;
      }

      const html = await response.text();
      const $ = load(html);
      debugInfo.successUrl = url;
      debugInfo.htmlLength = html.length;
      debugInfo.pageTitle = $("title").text();

      const contextMap: PatchContext = {
        champions: {},
        items: {},
        runes: {},
        summoners: {},
        _meta: debugInfo, // Hidden meta for debug
      };

      // Detectar la sección actual basándose en h2
      let currentCategory:
        | "champions"
        | "items"
        | "runes"
        | "summoners"
        | null = null;

      let currentSectionTitle = "";

      // Palabras clave para detectar secciones
      const sectionKeywords = {
        champions: ["campeones", "champions", "campeón"],
        items: ["objetos", "items", "objeto", "item"],
        runes: ["runas", "runes", "runa"],
        summoners: ["hechizos de invocador", "summoner spells", "hechizo"],
      };

      // Escaneo lineal: H2 define sección, H3 define ítem (campeón/objeto), H4 para items nuevos
      let scannedCount = 0;
      $("h2, h3, h4").each((_, element) => {
        const $element = $(element);
        const text = $element.text().trim();
        const tagName = element.tagName.toLowerCase();
        const lowerText = text.toLowerCase();

        // Log básico de estructura para debug
        if (tagName === "h2" || debugInfo.scrapingLog.length < 100) {
          debugInfo.scrapingLog.push(
            `<${tagName}>: ${text.substring(0, 30)}...`
          );
        }

        // Detección especial: Si el texto coincide con un nombre de campeón conocido,
        // forzamos la categoría a "champions" automáticamente.
        if (
          tagName === "h3" &&
          knownChampionNames.some(
            (n) =>
              n.toLowerCase() === text.replace(/\s+/g, " ").trim().toLowerCase()
          )
        ) {
          console.log(`Auto-detected champion section from H3: "${text}"`);
          currentCategory = "champions";
        }

        // Detección especial: Si el texto coincide con un nombre de OBJETO conocido
        // También procesar H4 como items (Riot usa H4 para objetos nuevos)
        if (
          (tagName === "h3" || tagName === "h4") &&
          knownItemNames.some(
            (n) =>
              n.toLowerCase() === text.replace(/\s+/g, " ").trim().toLowerCase()
          )
        ) {
          console.log(
            `Auto-detected item section from ${tagName.toUpperCase()}: "${text}"`
          );
          currentCategory = "items";
        }

        // Detección especial: Si H4 y estamos en sección de Objetos (nuevos, renovados, etc.)
        if (tagName === "h4" && currentCategory === "items") {
          // Este H4 es probablemente un nombre de objeto nuevo
          console.log(
            `Processing H4 as item: "${text}" in section: ${currentSectionTitle}`
          );
        }

        // 1. Detección de Sección (H2)
        if (tagName === "h2") {
          currentSectionTitle = text; // Guardar el título exacto de la sección (ej: "Objetos nuevos")
          for (const [category, keywords] of Object.entries(sectionKeywords)) {
            if (keywords.some((keyword) => lowerText.includes(keyword))) {
              currentCategory = category as
                | "champions"
                | "items"
                | "runes"
                | "summoners";
              console.log(`Detected section: ${category} from h2: "${text}"`);
              debugInfo.scrapingLog.push(`  -> SWITCH CATEGORY: ${category}`);
              return;
            }
          }
          return;
        }

        // 2. Procesamiento de Ítem (H3 o H4 para items nuevos)
        // H4 solo se procesa si estamos en sección de items (nuevos, renovados, regresan)
        const isItemSection =
          currentCategory === "items" &&
          (currentSectionTitle.toLowerCase().includes("nuevo") ||
            currentSectionTitle.toLowerCase().includes("renovado") ||
            currentSectionTitle.toLowerCase().includes("regresan") ||
            currentSectionTitle.toLowerCase().includes("new"));

        // Skip H4 si NO estamos en una sección de items especial
        if (tagName === "h4" && !isItemSection) {
          return; // Saltar H4 que no son items nuevos (ej: "Estadísticas básicas" de campeones)
        }

        // Solo procesamos si tenemos una categoría activa o podemos inferirla
        if (!currentCategory) {
          // Intento de inferencia directa (fallback)
          const fallbackKeywords = { ...sectionKeywords };
          for (const [category, keywords] of Object.entries(fallbackKeywords)) {
            if (keywords.some((keyword) => lowerText.includes(keyword))) {
              currentCategory = category as
                | "champions"
                | "items"
                | "runes"
                | "summoners";
              currentSectionTitle = text; // Asumimos que este H3 actúa como header
              return; // Es un header de sección disfrazado de H3
            }
          }
          // Default a champions si ya estamos viendo items y no hay header
          if (!currentCategory) currentCategory = "champions";
        }

        // Verificar si este H3/H4 es en realidad un header de sección disfrazado
        const isSectionHeader = Object.values(sectionKeywords)
          .flat()
          .some((keyword) => lowerText.includes(keyword));

        if (isSectionHeader) {
          // Si parece header de sección, actualizamos categoría y salimos
          for (const [category, keywords] of Object.entries(sectionKeywords)) {
            if (keywords.some((keyword) => lowerText.includes(keyword))) {
              currentCategory = category as
                | "champions"
                | "items"
                | "runes"
                | "summoners";
              return;
            }
          }
          return;
        }

        // Extracción del nombre
        const titleLink = $element.find("a");
        let name = titleLink.length > 0 ? titleLink.text().trim() : text;
        name = name.replace(/\s+/g, " ").trim();
        if (!name) return;

        // Verificar si es un header disfrazado
        if (
          Object.values(sectionKeywords)
            .flat()
            .some((keyword) => name.toLowerCase().includes(keyword))
        )
          return;

        // NUEVA ESTRATEGIA: Capturar TODO el contenido entre este H3/H4 y el siguiente
        const allHeaders = $("h2, h3, h4");
        const currentIndex = allHeaders.index($element);
        const nextHeaderIndex = currentIndex + 1;

        // Obtener el siguiente header (si existe)
        const $nextHeader =
          nextHeaderIndex < allHeaders.length
            ? allHeaders.eq(nextHeaderIndex)
            : null;

        // Buscar contenido entre el elemento actual y el siguiente header
        let context = "";
        let summary = "";
        let changes: string[] = [];

        // Capturar el contexto justo después del elemento
        let $current = $element.next();
        while ($current.length > 0) {
          const tag = $current.prop("tagName")?.toLowerCase();

          // Si llegamos a otro H2/H3, SIEMPRE paramos (nueva sección o item/campeón)
          if (tag === "h2" || tag === "h3") break;
          if ($current.find("h2, h3").length > 0) break;

          // H4 es delicado:
          // - Si estamos procesando un H4 (Item Nuevo), el siguiente H4 es otro item -> BREAK
          // - Si estamos procesando un H3 (Campeón), el H4 es parte del contenido (Stats/Habilidades) -> CONTINUE
          if (
            tagName === "h4" &&
            (tag === "h4" || $current.find("h4").length > 0)
          ) {
            break;
          }

          // Procesar según el tipo de elemento
          if (tag === "blockquote") {
            $current.find("br").replaceWith("\n");
            context += $current.text().trim() + " ";
          }

          if (tag === "h4") {
            const h4Text = $current.text().trim();
            if (h4Text) changes.push(`**${h4Text}**`);
          }

          if (tag === "ul") {
            $current.find("li").each((_, li) => {
              $(li).find("br").replaceWith("\n");
              let liText = $(li)
                .text()
                .trim()
                .replace(/[ \t]+/g, " ");
              if (liText) changes.push(liText);
            });
          }

          if (tag === "p" && !$current.hasClass("change-detail-title")) {
            const pText = $current.text().trim();
            if (pText.length > 10) {
              summary += pText + " ";
            }
          }

          // Si es un div, buscar contenido dentro
          if (tag === "div") {
            // Pero primero verificar que no contenga un header
            if ($current.find("h2, h3").length > 0) break;

            $current.find("h4").each((_, h4) => {
              const t = $(h4).text().trim();
              if (t) changes.push(`**${t}**`);
            });

            $current.find("ul li").each((_, li) => {
              const t = $(li)
                .text()
                .trim()
                .replace(/[ \t]+/g, " ");
              if (t) changes.push(t);
            });

            $current.find("blockquote").each((_, bq) => {
              context += $(bq).text().trim() + " ";
            });

            $current.find("p").each((_, p) => {
              const t = $(p).text().trim();
              if (t.length > 20 && !summary.includes(t)) summary += t + " ";
            });
          }

          $current = $current.next();
        }

        if (context || summary || changes.length > 0) {
          contextMap[currentCategory][name] = {
            context: context.trim(),
            summary: summary.trim(),
            changes: changes.length > 0 ? changes : undefined,
            section: currentSectionTitle,
          };
          if (debugInfo.scrapingLog.length < 200)
            debugInfo.scrapingLog.push(
              `    -> SAVED: ${name} (${changes.length} changes) [Sec: ${currentSectionTitle}]`
            );
        } else {
          if (debugInfo.scrapingLog.length < 200)
            debugInfo.scrapingLog.push(`    -> EMPTY CONTENT: ${name}`);
        }
      });

      const totalContexts =
        Object.keys(contextMap.champions).length +
        Object.keys(contextMap.items).length +
        Object.keys(contextMap.runes).length +
        Object.keys(contextMap.summoners).length;

      debugInfo.contextsFound = totalContexts;

      console.log(
        `Scraping success for ${slug}. Contexts found: ${totalContexts} ` +
          `(Champions: ${Object.keys(contextMap.champions).length}, Items: ${
            Object.keys(contextMap.items).length
          })`
      );

      // Si encontramos algo, retornamos inmediatamente
      if (totalContexts > 0) {
        return contextMap;
      }
    } catch (error) {
      console.error(`Error scraping patch notes for slug ${slug}:`, error);
      debugInfo.scrapingLog.push(`Error scraping: ${error}`);
    }
  }

  console.warn(
    "Could not find patch notes in any of the tried URLs. Returning empty context."
  );
  return {
    champions: {},
    items: {},
    runes: {},
    summoners: {},
    _meta: debugInfo,
  };
}
