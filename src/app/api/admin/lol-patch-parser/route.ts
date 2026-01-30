import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializar cliente de Google AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { text, imageUrl, version } = await req.json();

    console.log("=== STARTING AI PATCH PARSER (Gemini 3 Flash) ===");

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY no configurada en el servidor" },
        { status: 500 },
      );
    }

    // 0. Obtener la versión más reciente de DDragon de Riot
    let assetVersion = "16.2.1"; // Fallback
    try {
      const vRes = await fetch(
        "https://ddragon.leagueoflegends.com/api/versions.json",
      );
      if (vRes.ok) {
        const versions = await vRes.json();
        assetVersion = versions[0];
      }
    } catch (e) {
      console.error("Error fetching DDragon versions:", e);
    }

    // 1. Descargar la imagen si existe
    let imagePart = null;
    if (imageUrl) {
      try {
        const imgRes = await fetch(imageUrl);
        if (imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString("base64");
          const mimeType = imgRes.headers.get("content-type") || "image/jpeg";

          imagePart = {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          };
          console.log("Image fetched correctly for analysis.");
        }
      } catch (e) {
        console.error("Error fetching image:", e);
      }
    }

    // 0. Pre-chequeo: ¿El usuario pasó un JSON directo en el campo 'text'?
    let manualJson = null;
    try {
      if (
        text &&
        (text.trim().startsWith("[") || text.trim().startsWith("{"))
      ) {
        manualJson = JSON.parse(text);
      }
    } catch (e) {
      // No es un JSON válido, seguimos con flujo IA
    }

    let aiData: any = { champions: [], items: [], changes: [], summary: "" };

    // 1. Si NO hay JSON manual, usamos Gemini para extraer (Flujo Original)
    if (!manualJson) {
      // 2. Preparar el Prompt para Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
      ROL: Analista experto de League of Legends.
      TAREA: Extraer CADA campeón y objeto de la imagen.

      REGLAS ESTRICTAS:
      - NOMBRES COMPUESTOS: Si un objeto tiene un nombre con "y" (ej. "Ocaso y Amanecer"), es un ÚNICO objeto. PROHIBIDO SEPARARLO.
      - NO AGRUPES: Prohibido usar "Jungla AD (1/10)". Lista a cada campeón por su nombre real.
      - ESTADÍSTICAS: Extrae valores numéricos exactos (Vida: 600 -> 630). Si no hay números pero es mejora, usa "Buff".
      - IDIOMA: Todo en ESPAÑOL LATINO (es_MX).

      JSON: { "champions": [...], "changes": [...] }
      `;
      const parts: any[] = [prompt, `Text context: ${text || "No text"}`];
      if (imagePart) parts.push(imagePart);

      const result = await model.generateContent(parts);
      const textResponse = result.response.text();

      console.log("--- AI RAW RESPONSE ---");
      console.log(textResponse);
      console.log("-----------------------");

      // Parsear JSON
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("La IA no devolvió un formato válido.");
      aiData = JSON.parse(jsonMatch[0]);
      console.log("AI Data detected:", aiData.champions?.length, "champions");
    } else {
      // 1.5 Adaptar JSON manual al formato aiData con Parser de texto
      console.log("Procesando JSON manual enriquecido...");

      // Si el JSON es un objeto, extraemos el summary y los cambios
      let changesArray = manualJson;
      if (manualJson && !Array.isArray(manualJson)) {
        aiData.summary = "";
        changesArray =
          manualJson.changes ||
          manualJson.data ||
          manualJson.items ||
          manualJson.elements ||
          [];
      }

      changesArray.forEach((item: any) => {
        const typeUpper = item.type ? item.type.toUpperCase() : "";
        const rawChanges = item.changes || item.details || "";

        // Dividir por punto y coma para obtener cambios individuales
        const parts = rawChanges
          .split(";")
          .map((p: string) => p.trim())
          .filter(Boolean);

        let changeType = "adjustment";
        if (typeUpper.includes("BUFF")) changeType = "buff";
        if (typeUpper.includes("NERF")) changeType = "nerf";

        // Separar estadísticas (con flecha) de comentarios (sin flecha)
        const statsParts: any[] = [];
        const contextParts: string[] = [];

        parts.forEach((part: string) => {
          const arrowMatch = part.match(/(.*?):\s*(.*?)\s*->\s*(.*)/);
          if (arrowMatch) {
            const statName = arrowMatch[1].trim();
            // Detectar si es una habilidad (Q, W, E, R, Pasiva/P)
            const spellMatch = statName.match(/\b([QWER]|Pasiva|P)\b/i);
            const isSpell = !!spellMatch;
            const spellKey = spellMatch ? spellMatch[0].toUpperCase() : null;

            statsParts.push({
              stat: statName,
              old: arrowMatch[2].trim(),
              new: arrowMatch[3].trim(),
              type: changeType,
              _isSpell: isSpell,
              _spellKey: spellKey === "PASIVA" ? "P" : spellKey,
            });
          } else {
            contextParts.push(part);
          }
        });

        if (typeUpper.includes("CHAMPION")) {
          aiData.champions.push({
            name: item.name,
            type: changeType,
            details: contextParts.join(". "),
            stats: statsParts,
          });
        } else {
          let category = "item";
          if (typeUpper.includes("SYSTEM")) category = "system";

          aiData.changes.push({
            name: item.name,
            category: category,
            type: changeType,
            details: contextParts.length > 0 ? contextParts : parts,
          });
        }
      });
    }

    // 2.5 Cargar Mapa de Assets (Enriquecido)
    let assetMap = new Map();
    try {
      const idToNameMX = new Map();
      const esRes = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${assetVersion}/data/es_MX/item.json`,
      );

      // Cargar mapa EN -> ID para soportar inputs en inglés
      const nameEnToId = new Map();
      const enRes = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${assetVersion}/data/en_US/item.json`,
      );

      if (enRes.ok) {
        const enData = await enRes.json();
        Object.entries(enData.data).forEach(([id, data]: [string, any]) => {
          nameEnToId.set(data.name.toLowerCase(), id);
          if (data.name.includes("Duskblade")) nameEnToId.set("duskblade", id);
        });
      }

      if (esRes.ok) {
        const esData = await esRes.json();
        Object.entries(esData.data).forEach(([id, data]: [string, any]) => {
          idToNameMX.set(id, data.name);
          const cleanName = data.name.toLowerCase();
          const normName = cleanName.replace(/[^a-z0-9]/g, "");

          const itemObj = { id, type: "item", es_name: data.name };
          assetMap.set(cleanName, itemObj);
          assetMap.set(normName, itemObj);

          // Soporte para variaciones de nombres de Ornn y comunes
          if (
            data.description.toLowerCase().includes("ornn") ||
            parseInt(id) > 7000
          ) {
            assetMap.set("mejora de ornn: " + cleanName, itemObj);

            if (cleanName.includes("anochecer")) {
              assetMap.set("ocaso y amanecer", itemObj);
              assetMap.set("anochecer y amanecer", itemObj);
              assetMap.set("dusk and dawn", itemObj);
            }
            if (
              cleanName.includes("hambre") &&
              cleanName.includes("interminable")
            ) {
              assetMap.set("endless hunger", itemObj);
            }
          }
        });

        // 2.7 Cargar Runas
        const runeRes = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${assetVersion}/data/es_MX/runesReforged.json`,
        );
        if (runeRes.ok) {
          const runeData = await runeRes.json();
          runeData.forEach((tree: any) => {
            tree.slots.forEach((slot: any) => {
              slot.runes.forEach((rune: any) => {
                const runeObj = {
                  id: rune.id,
                  icon: rune.icon,
                  type: "rune",
                  es_name: rune.name,
                };
                const cleanRuneName = rune.name.toLowerCase();
                const normRuneName = cleanRuneName.replace(/[^a-z0-9]/g, "");
                const runeKey = rune.key.toLowerCase();

                assetMap.set(cleanRuneName, runeObj);
                assetMap.set(normRuneName, runeObj);
                assetMap.set(runeKey, runeObj);
                assetMap.set(runeKey.replace(/[^a-z0-9]/g, ""), runeObj);
              });
            });
          });
        }

        // Mapeo Manual de Objetos de Ornn (Hardcoded ID Fix)
        assetMap.set("protoplasm harness", {
          id: "7025",
          type: "item",
          es_name: "Arnés de Protoplasma",
        });
        assetMap.set("endless hunger", {
          id: "7031",
          type: "item",
          es_name: "Hambre Interminable",
        });
        assetMap.set("dusk and dawn", {
          id: "7002",
          type: "item",
          es_name: "Anochecer y Amanecer",
        });

        // Ahora poblamos assetMap con nombres en inglés apuntando a data en español
        for (const [nameEn, id] of Array.from(nameEnToId.entries())) {
          const esName = idToNameMX.get(id);
          if (esName) {
            const itemObj = { id, type: "item", es_name: esName };
            assetMap.set(nameEn, itemObj);
            assetMap.set(nameEn.replace(/[^a-z0-9]/g, ""), itemObj);
          }
        }
      }
    } catch (e) {
      console.error("Error building asset map:", e);
    }

    // 3. Enriquecer con DB
    const supabase = getServiceClient();

    const patchData: any = {
      version: assetVersion,
      displayVersion: version || "Preview",
      summary: "",
      champions: [],
      items: [],
      runes: [],
      summoners: [],
      systemChanges: [],
      _debug: [`Processed ${manualJson ? "Manual JSON" : "AI Analysis"}`],
    };

    // 3.1 Procesar Campeones
    const { data: championsData } = await supabase
      .from("lol_champions")
      .select("id, name, key, full_data");

    if (championsData && aiData.champions) {
      const champMap = new Map();
      championsData.forEach((c) => {
        champMap.set(c.name.toLowerCase().replace(/[^a-z0-9]/g, ""), c);
        champMap.set(c.id.toLowerCase().replace(/[^a-z0-9]/g, ""), c);
        if (c.id === "MonkeyKing") champMap.set("wukong", c);
      });

      aiData.champions.forEach((aiChamp: any) => {
        const dbChamp = champMap.get(
          aiChamp.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
        );
        if (dbChamp) {
          const finalStats: any[] = [];
          const finalSpells: any[] = [];

          if (aiChamp.stats) {
            aiChamp.stats.forEach((s: any) => {
              if (s._isSpell) {
                let spellData = null;
                const key = s._spellKey || "";

                if (key === "P" || key === "PASIVA") {
                  spellData = {
                    name: dbChamp.full_data.passive.name,
                    image: dbChamp.full_data.passive.image.full,
                    key: "Pasiva",
                  };
                } else {
                  const index = ["Q", "W", "E", "R"].indexOf(key);
                  if (index !== -1 && dbChamp.full_data.spells[index]) {
                    spellData = {
                      name: dbChamp.full_data.spells[index].name,
                      image: dbChamp.full_data.spells[index].image.full,
                      key: key,
                    };
                  }
                }

                if (spellData) {
                  let existing = finalSpells.find(
                    (f) => f.name === spellData.name,
                  );

                  // Extraer contexto (Cuerpo a cuerpo, Rango, Monstruos, etc)
                  let context = "";
                  const contextMatch = s.stat.match(/\((.*?)\)/);
                  if (contextMatch) {
                    context = ` (${contextMatch[1]})`;
                  } else if (s.stat.toLowerCase().includes("monstruos")) {
                    context = " (Monstruos)";
                  }

                  let attrBase = "";
                  const lowStat = s.stat.toLowerCase();

                  if (
                    lowStat.includes("enfriamiento") ||
                    lowStat.includes("cd")
                  )
                    attrBase = "CD";
                  else if (lowStat.includes("coste")) attrBase = "Costo";
                  else if (
                    lowStat.includes("rango") ||
                    lowStat.includes("alcance")
                  )
                    attrBase = "Rango";
                  else if (lowStat.includes("duración")) attrBase = "Duración";
                  else if (
                    lowStat.includes("ratio") ||
                    lowStat.includes("escalado") ||
                    lowStat.includes("ap") ||
                    lowStat.includes("ad")
                  ) {
                    const type = lowStat.includes("ap")
                      ? "AP"
                      : lowStat.includes("ad")
                        ? "AD"
                        : "";
                    const contextText = lowStat.includes("vida máxima")
                      ? " Vida Máx"
                      : lowStat.includes("impacto")
                        ? " Impacto"
                        : "";
                    attrBase = `Ratio ${type}${contextText}`.trim();
                    if (attrBase === "Ratio") attrBase = "Escalado";
                  } else if (lowStat.includes("daño")) attrBase = "Daño";
                  else {
                    // Si no detectamos nada, intentamos limpiar el texto original
                    attrBase = s.stat
                      .replace(/^[A-Z][a-z]+:\s*/, "") // Quitar Varus:
                      .replace(/\b[QWER]:\s*/i, "") // Quitar W:
                      .replace(/\s+de la\s+[QWER]\b/i, "") // Quitar de la W
                      .trim();

                    if (!attrBase || attrBase.length > 25) attrBase = "Ajuste";
                  }

                  const changeObj = {
                    attribute: `${attrBase}${context}`,
                    old: s.old,
                    new: s.new,
                    type: s.type ? s.type.toLowerCase() : "adjustment",
                  };

                  if (existing) {
                    existing.changes.push(changeObj);
                  } else {
                    finalSpells.push({
                      name: spellData.name,
                      image: spellData.image,
                      key: spellData.key,
                      changes: [changeObj],
                    });
                  }
                } else {
                  finalStats.push(s);
                }
              } else {
                finalStats.push(s);
              }
            });
          }

          patchData.champions.push({
            id: dbChamp.id,
            name: dbChamp.name,
            image: dbChamp.full_data.image.full,
            skins: dbChamp.full_data.skins,
            stats: finalStats.length > 0 ? finalStats : [],
            spells: finalSpells,
            developerContext: {
              changes: aiChamp.details ? [aiChamp.details] : [],
            },
            type: aiChamp.type.toLowerCase(),
          });
        }
      });
    }

    // 3.2 Procesar Otros Cambios Categorizados
    if (aiData.changes) {
      aiData.changes.forEach((change: any) => {
        const itemName = change.name.toLowerCase();
        const normItemName = itemName.replace(/[^a-z0-9]/g, "");

        // 1. Buscar coincidencia exacta o normalizada
        let entry = assetMap.get(itemName) || assetMap.get(normItemName);

        // 2. Si no hay exacta, buscar por palabras clave
        // EXCEPCIÓN: Lista negra de términos de sistema que NO deben buscarse como items
        const systemBlacklist = [
          "turret plates",
          "champion bounties",
          "actualizer",
        ]; // Actualizer a veces es item, a veces sistema
        const isSystemTerm = systemBlacklist.some((t) => itemName.includes(t));

        if (!entry && !isSystemTerm) {
          const keywords = [
            "hambre",
            "ocaso",
            "amanecer",
            "anochecer",
            "eterna",
            "interminable",
            "dawn",
            "dusk",
            "hunger",
            "endless",
          ];
          const hasKeyword = keywords.some((k) => itemName.includes(k));

          for (const [key, val] of Array.from(assetMap.entries())) {
            if (
              hasKeyword &&
              (val as any).id > 7000 &&
              (key.includes(itemName) || itemName.includes(key))
            ) {
              entry = val;
              break;
            }
            if (key.includes(itemName) || itemName.includes(key)) {
              entry = val;
            }
          }
        }

        // Fix Manual para Runas (si no se detectaron arriba)
        const isCashBackMatch =
          normItemName === "cashback" || normItemName === "reembolso";
        const isTripleTonicMatch =
          normItemName === "tripletonic" || normItemName === "tonicotriple";
        const isPhaseRushMatch =
          normItemName === "phaserush" ||
          normItemName === "irrupciondefase" ||
          itemName.includes("phase");

        if (isCashBackMatch) {
          const found =
            assetMap.get("cash back") ||
            assetMap.get("reembolso") ||
            assetMap.get("cashback");
          if (found) entry = found;
          else
            entry = {
              id: 8352,
              type: "rune",
              es_name: "Reembolso",
              icon: "perk-images/Styles/Inspiration/CashBack/CashBack.png",
            };
        } else if (isTripleTonicMatch) {
          const found =
            assetMap.get("triple tonic") ||
            assetMap.get("tripletonic") ||
            assetMap.get("tónico triple") ||
            assetMap.get("tonicotriple");
          if (found) entry = found;
          else
            entry = {
              id: 8369,
              type: "rune",
              es_name: "Tónico Triple",
              icon: "perk-images/Styles/Inspiration/TripleTonic/TripleTonic.png",
            };
        } else if (isPhaseRushMatch) {
          const found =
            assetMap.get("phaserush") ||
            assetMap.get("phase rush") ||
            assetMap.get("irrupción de fase") ||
            assetMap.get("irrupciondefase");
          if (found) entry = found;
        }

        const displayName = entry?.es_name || change.name;

        if (change.category === "rune" || entry?.type === "rune") {
          patchData.runes.push({
            id: entry?.id || 0,
            name: displayName,
            icon: entry?.icon || "",
            descriptionChange: { old: "", new: change.details || "Ajustada" },
          });
        } else if (entry && entry.type === "item") {
          // Si encontramos el asset como ITEM, lo forzamos a mostrarse como item
          // aunque venga etiquetado como "SYSTEM ADJUSTMENTS"
          patchData.items.push({
            id: entry.id,
            name: displayName,
            image: `${entry.id}.png`,
            statChanges: [],
            developerContext: {
              changes: Array.isArray(change.details)
                ? change.details
                : [change.details],
            },
            type: change.type,
          });
        } else if (change.category === "system") {
          patchData.systemChanges.push({
            name: displayName,
            details: change.details,
            type: change.type,
          });
        } else {
          patchData.items.push({
            id: entry?.id || displayName.toLowerCase().replace(/\s/g, "-"),
            name: displayName,
            image: entry?.id ? `${entry.id}.png` : "",
            statChanges: [], // No stats parsing from simple text detail yet
            developerContext: { changes: [change.details || "Modificado"] },
            type: change.type,
          });
        }
      });
    }

    return NextResponse.json({ data: patchData });
  } catch (error: any) {
    console.error("Error in AI Parser:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
