import { load } from "cheerio";
export interface PatchContext {
  [key: string]: {
    summary?: string;
    context?: string;
    changes?: string[];
  };
}

export function getVersionSlug(version: string): string {
  const parts = version.split(".");
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return version.replace(/\./g, "-");
}

export async function getPatchContext(version: string): Promise<PatchContext> {
  const parts = version.split(".");
  const season = parts[0];
  const patch = parts[1];

  // Try multiple URL formats: Season-Patch (15-24) and Year-Patch (25-24)
  const slugsToTry = [
    `${season}-${patch}`,
    `25-${patch}`, // Hardcoded fallback for 2025 season anomaly
  ];

  for (const slug of slugsToTry) {
    try {
      const url = `https://www.leagueoflegends.com/es-es/news/game-updates/patch-${slug}-notes/`;
      console.log(`Scraping patch notes from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(
          `Failed to fetch patch notes from ${url}: ${response.status}`
        );
        continue;
      }

      const html = await response.text();
      const $ = load(html);
      const contextMap: PatchContext = {};

      $("h3, h4").each((_, element) => {
        const titleLink = $(element).find("a");
        let name = "";

        if (titleLink.length > 0) {
          name = titleLink.text().trim();
        } else {
          name = $(element).text().trim();
        }

        name = name.replace(/\s+/g, " ").trim();
        if (!name) return;

        let context = "";
        let summary = "";
        let changes: string[] = [];
        let nextElem = $(element).next();
        let limit = 0;

        while (nextElem.length > 0 && limit < 50) {
          const tagName = nextElem.get(0)?.tagName?.toLowerCase();
          if (["h3"].includes(tagName || "")) break; // Only break on h3 (next champion)

          if (tagName === "blockquote") {
            nextElem.find("br").replaceWith("\n");
            context += nextElem.text().trim() + " ";
          }

          if (tagName === "p" && !nextElem.hasClass("change-detail-title")) {
            const text = nextElem.text().trim();
            // Minimum length check to avoid capturing small headers as summary
            if (text.length > 20) {
              nextElem.find("br").replaceWith("\n");
              summary += nextElem.text().trim() + " ";
            }
          }

          if (tagName === "h4") {
            const h4Text = nextElem.text().trim();
            if (h4Text) {
              // Add header as a bold item or special prefix.
              // Using markdown bold syntax or just raw text to indicate section
              changes.push(`**${h4Text}**`);
            }
          }

          if (tagName === "ul") {
            nextElem.find("li").each((_, li) => {
              // Preservar saltos de línea explícitos
              $(li).find("br").replaceWith("\n");

              let liText = $(li).text().trim();

              // Normalizar espacios horizontales pero RESPETAR saltos de línea
              liText = liText.replace(/[ \t]+/g, " ");

              // Heurística de formato: Forzar salto de línea antes de "Corrección de error"
              // si no lo tiene.
              liText = liText.replace(
                /(\.|\s)(Corrección de error:)/gi,
                "$1\n$2"
              );

              if (liText) {
                changes.push(liText);
              }
            });
          }

          nextElem = nextElem.next();
          limit++;
        }

        if (context || summary || changes.length > 0) {
          contextMap[name] = {
            context: context.trim(),
            summary: summary.trim(),
            changes: changes.length > 0 ? changes : undefined,
          };
        }
      });

      console.log(
        `Scraping success for ${slug}. Contexts found: ${
          Object.keys(contextMap).length
        }`
      );
      if (Object.keys(contextMap).length > 0) {
        return contextMap;
      }
    } catch (error) {
      console.warn(`Error scraping ${slug}:`, error);
    }
  }

  console.error("Could not scrape patch notes from any known URL format.");
  return {};
}
