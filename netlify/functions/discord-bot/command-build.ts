import { createClient } from "@supabase/supabase-js";
import Fuse from "fuse.js";

// ─── Cliente Supabase (directo, sin pasar por Next.js) ────────────────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ─── Mapeo de claves de stats ES/EN ──────────────────────────────────────────
const STAT_MAP: Record<string, string> = {
  dano: "damage", control: "control", cadenciaDisparo: "fireRate",
  estabilidad: "stability", damage: "damage", fireRate: "fireRate", stability: "stability",
  alcance: "range", range: "range",
  precision: "accuracy", accuracy: "accuracy",
  manejo: "handling", handling: "handling"
};

const getStat = (stats: any, key: string): number => {
  if (!stats) return 0;
  const mapped = STAT_MAP[key];
  if (mapped && typeof stats[mapped] === "number") return stats[mapped];
  if (typeof stats[key] === "number") return stats[key];
  return 0;
};

// ─── Buscar arma por texto (fuzzy search directo en Supabase) ─────────────────
async function findWeapon(query: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("delta_force_weapons_base")
    .select("id, weapon_name, category, image_url, base_damage, base_fire_rate, base_control, base_stability, base_accuracy, base_range, base_handling");

  if (error || !data || data.length === 0) return null;

  const fuse = new Fuse(data, { keys: ["weapon_name", "category"], threshold: 0.4 });
  const results = fuse.search(query);
  return results.length > 0 ? results[0].item : null;
}

// ─── Buscar arma por ID directo ───────────────────────────────────────────────
async function findWeaponById(id: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("delta_force_weapons_base")
    .select("id, weapon_name, category, image_url, base_damage, base_fire_rate, base_control, base_stability, base_accuracy, base_range, base_handling")
    .eq("id", id)
    .single();
  return data || null;
}

// ─── Obtener builds y votos para un arma ─────────────────────────────────────
async function getBuildsForWeapon(weaponName: string, sort: "votes" | "usage", limit: number) {
  const supabase = getSupabase();

  const [recordsRes, votesRes] = await Promise.all([
    supabase
      .from("weapon_stats_records")
      .select("id, weapon_name, share_code, stats, description")
      .not("weapon_name", "is", null)
      .not("weapon_name", "eq", "")
      .ilike("weapon_name", weaponName),
    supabase
      .from("weapon_votes")
      .select("weapon_name, vote")
  ]);

  const records = recordsRes.data || [];
  const votes = votesRes.data || [];

  // Mapear votos por ID del registro
  const voteMap = new Map<string, { upvotes: number; downvotes: number }>();
  for (const v of votes) {
    const key = v.weapon_name;
    if (!voteMap.has(key)) voteMap.set(key, { upvotes: 0, downvotes: 0 });
    const entry = voteMap.get(key)!;
    if (v.vote === 1) entry.upvotes++; else entry.downvotes++;
  }

  const groups = new Map<string, any>();

  for (const rec of records) {
    const dmg = getStat(rec.stats, "damage") || getStat(rec.stats, "dano");
    const rng = getStat(rec.stats, "range") || getStat(rec.stats, "alcance");
    const ctrl = getStat(rec.stats, "control");
    const hnd = getStat(rec.stats, "handling") || getStat(rec.stats, "manejo");
    const stab = getStat(rec.stats, "stability") || getStat(rec.stats, "estabilidad");
    const acc = getStat(rec.stats, "accuracy") || getStat(rec.stats, "precision");
    const fr = getStat(rec.stats, "fireRate") || getStat(rec.stats, "cadenciaDisparo");

    const key = rec.share_code || rec.id;
    const v = voteMap.get(rec.id) || voteMap.get(rec.share_code || "") || { upvotes: 0, downvotes: 0 };
    
    if (!groups.has(key)) {
      const rawDesc = rec.description || "";
      const name = rawDesc.length > 35 ? rawDesc.substring(0, 35) + "…" : rawDesc || "Build de la Comunidad";
      groups.set(key, { 
        name, 
        share_code: rec.share_code || "—", 
        upvotes: v.upvotes, 
        score: v.upvotes - v.downvotes, 
        usages: 0,
        stats: {
          damage: dmg,
          range: rng,
          control: ctrl,
          handling: hnd,
          stability: stab,
          accuracy: acc,
          fire_rate: fr
        }
      });
    }
    groups.get(key)!.usages++;
  }

  const sorted = Array.from(groups.values());
  if (sort === "votes") sorted.sort((a, b) => b.score - a.score || b.upvotes - a.upvotes);
  else sorted.sort((a, b) => b.usages - a.usages || b.score - a.score);

  return {
    builds: sorted.slice(0, limit)
  };
}

// ─── Fórmulas de Simulación de TTK Integradas ─────────────────────────────────
const getDamageProfile = (category: string | null | undefined) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("sniper") || cat.includes("francotirador")) {
    return { head: 2.5, torso: 1.0, abdomen: 0.9, limbs: 0.4 };
  }
  if (cat.includes("marksman") || cat.includes("tirador")) {
    return { head: 1.6, torso: 1.0, abdomen: 0.9, limbs: 0.45 };
  }
  return { head: 1.9, torso: 1.0, abdomen: 0.9, limbs: 0.4 };
};

const calculateDamageFalloff = (baseDamage: number, distance: number, category: string | null | undefined, weaponRange?: number): number => {
  const cat = (category || "").toLowerCase();
  let multiplier = 1.0;

  if (weaponRange !== undefined && weaponRange > 0) {
    const d1 = weaponRange * 0.8;
    const d2 = weaponRange * 1.25;
    if (distance > d2) {
      multiplier = (cat.includes("smg") || cat.includes("subfusil") || cat.includes("pistol") || cat.includes("secund")) ? 0.70 : 0.85;
    } else if (distance > d1) {
      multiplier = (cat.includes("smg") || cat.includes("subfusil") || cat.includes("pistol") || cat.includes("secund")) ? 0.85 : 0.92;
    }
  } else {
    if (cat.includes("sniper") || cat.includes("francotirador")) {
      if (distance > 150) multiplier = 0.80;
    } else if (cat.includes("smg") || cat.includes("subfusil") || cat.includes("pistol") || cat.includes("secund")) {
      if (distance > 55) multiplier = 0.70;
      else if (distance > 30) multiplier = 0.85;
    } else {
      if (distance > 85) multiplier = 0.80;
      else if (distance > 55) multiplier = 0.90;
    }
  }
  return baseDamage * multiplier;
};

const simulateTTK = (weaponDamage: number, fireRate: number, category: string, weaponRange?: number, weaponName?: string) => {
  if (!weaponDamage || !fireRate || weaponDamage <= 0 || fireRate <= 0) return { ttk: 0, btk: 0 };
  const rps = fireRate / 60;
  let hp = 100;
  
  // Asumimos balas Nv4 y chaleco Nv4 en Operaciones a 30m por defecto
  const distance = 30;
  const penetrationLevel = 4;
  const penetration = 42;
  const armorTier = 4;
  let durability = 110; // tier 4 mock armor max_durability is 110
  const materialMult = 1.0; // aramida
  
  const damageAfterFalloff = calculateDamageFalloff(weaponDamage, distance, category, weaponRange);
  const bulletDamage = damageAfterFalloff; // damage_ratio is 100

  let btk = 0;
  while (hp > 0 && btk < 30) {
    btk++;
    let currentDamage = bulletDamage * 1.0; // torso
    
    if (armorTier > 0 && durability > 0) {
      const tierDiff = penetrationLevel - armorTier;
      const durabilityDamageThisShot = penetration * materialMult;

      if (tierDiff >= 0) {
        const mitigation = tierDiff === 0 ? 0.50 : 0.95;
        if (durability >= durabilityDamageThisShot) {
          currentDamage = currentDamage * mitigation;
          durability -= durabilityDamageThisShot;
        } else {
          const fractionWithArmor = durability / durabilityDamageThisShot;
          const fractionWithout = 1 - fractionWithArmor;
          currentDamage = (currentDamage * mitigation * fractionWithArmor) + (currentDamage * fractionWithout);
          durability = 0;
        }
      } else {
        currentDamage = 0;
        durability = Math.max(0, durability - durabilityDamageThisShot);
      }
    }
    hp -= currentDamage;
  }

  const wName = (weaponName || "").toLowerCase();
  const isAsVal = wName.includes("val") || category.toLowerCase().includes("val");
  const isAsValBurst = isAsVal && weaponDamage >= 35 && fireRate <= 700;

  const isMk4 = wName.includes("mk4") || 
                category.toLowerCase().includes("mk4") ||
                (weaponDamage === 32 && fireRate === 872) || 
                (weaponDamage === 34 && fireRate === 793);

  let finalBtk = btk;
  let ttkSeconds = 0;

  if (isAsValBurst && weaponDamage >= 35 && fireRate <= 700) {
    if (penetrationLevel === 4 && armorTier === 4) {
      finalBtk = 4;
    }
    const burstRps = 900 / 60;
    const timeBetweenBurstShots = 1 / burstRps;
    if (finalBtk <= 4) {
      ttkSeconds = (finalBtk - 1) * timeBetweenBurstShots;
    } else {
      const firstBurstDuration = 3 * timeBetweenBurstShots;
      const delayBetweenBursts = 0.25;
      const additionalShots = finalBtk - 4;
      ttkSeconds = firstBurstDuration + delayBetweenBursts + (additionalShots - 1) / rps;
    }
  } else if (isMk4) {
    const isAutomatic = fireRate > 820;
    if (isAutomatic) {
      ttkSeconds = (finalBtk - 1) / rps;
    } else {
      if (penetrationLevel === 4 && armorTier === 4) {
        finalBtk = 5;
      }
      const burstRps = 1000 / 60; 
      const timeBetweenBurstShots = 1 / burstRps;
      const delayBetweenBursts = 0.10;
      
      if (finalBtk <= 3) {
        ttkSeconds = (finalBtk - 1) * timeBetweenBurstShots;
      } else if (finalBtk <= 6) {
        const firstBurstDuration = 2 * timeBetweenBurstShots;
        const additionalShotsInSecondBurst = finalBtk - 3;
        ttkSeconds = firstBurstDuration + delayBetweenBursts + (additionalShotsInSecondBurst - 1) * timeBetweenBurstShots;
      } else {
        const firstBurstDuration = 2 * timeBetweenBurstShots;
        const secondBurstDuration = 2 * timeBetweenBurstShots;
        const additionalShots = finalBtk - 6;
        ttkSeconds = firstBurstDuration + delayBetweenBursts + secondBurstDuration + delayBetweenBursts + (additionalShots - 1) / rps;
      }
    }
  } else {
    ttkSeconds = (finalBtk - 1) / rps;
  }

  return {
    ttk: Math.round(ttkSeconds * 1000) / 1000,
    btk: finalBtk
  };
};

// ─── Generar Bloque de Texto de Estadísticas Comparadas ───────────────────────
function formatStatsGrid(stats: any, baseStats?: any, isBase: boolean = false) {
  const labels: Record<string, string> = {
    damage: "Daño",
    range: "Alcance",
    control: "Control",
    handling: "Manejo",
    stability: "Estabilidad",
    accuracy: "Precisión"
  };

  const keys = ["damage", "range", "control", "handling", "stability", "accuracy"];

  if (isBase) {
    // Para las estadísticas base, mostramos los 6 atributos organizados en 2 columnas separadas por "|"
    const items = keys.map(k => {
      const val = stats?.[k] ?? "—";
      return `**${labels[k]}:** \`${val}\``;
    });
    return `${items[0]} | ${items[1]}\n${items[2]} | ${items[3]}\n${items[4]} | ${items[5]}`;
  }

  // Para una build, solo incluimos las estadísticas que han cambiado respecto a las base
  const modifiedItems: string[] = [];

  for (const k of keys) {
    const currentVal = stats?.[k];
    const baseVal = baseStats?.[k];

    if (currentVal !== undefined && currentVal !== null && baseVal !== undefined && baseVal !== null) {
      const curr = parseFloat(currentVal);
      const base = parseFloat(baseVal);
      if (!isNaN(curr) && !isNaN(base)) {
        const diff = curr - base;
        if (diff !== 0) {
          const diffStr = diff > 0 ? `*(+${diff})*` : `*(${diff})*`;
          modifiedItems.push(`**${labels[k]}:** \`${curr}\` ${diffStr}`);
        }
      }
    }
  }

  if (modifiedItems.length === 0) {
    return "*Sin cambios respecto a las estadísticas base*";
  }

  // Se muestran las estadísticas modificadas de forma clara y limpia en su propia línea
  return modifiedItems.join("\n");
}

// ─── Generar Embed para Discord ───────────────────────────────────────────────
function generateEmbed(weapon: any, builds: any[], baseStats: any) {
  const fields: any[] = [];

  // Calcular TTK Base
  const baseTtkObj = simulateTTK(
    parseFloat(baseStats.damage),
    parseFloat(baseStats.fire_rate),
    weapon.category || "Fusil de asalto",
    parseFloat(baseStats.range),
    weapon.weapon_name
  );

  // Estadísticas base oficiales del arma
  if (baseStats && (baseStats.damage || baseStats.fire_rate)) {
    fields.push({
      name: "Estadísticas Base",
      value: `**TTK:** \`${baseTtkObj.ttk}s\` | **BTK:** \`${baseTtkObj.btk}\` *(Vs. Chaleco Nv.4 a 30m)*\n${formatStatsGrid(baseStats, baseStats, true)}`,
      inline: false
    });
  }

  // Builds encontradas (más votadas de la comunidad)
  if (builds && builds.length > 0) {
    for (let i = 0; i < builds.length; i++) {
      const b = builds[i];
      // Calcular TTK para esta build en base a sus estadísticas modificadas
      const buildTtkObj = simulateTTK(
        parseFloat(b.stats?.damage || baseStats.damage),
        parseFloat(b.stats?.fire_rate || baseStats.fire_rate),
        weapon.category || "Fusil de asalto",
        parseFloat(b.stats?.range || baseStats.range),
        weapon.weapon_name
      );

      // Limpiamos los acentos o caracteres alrededor de share_code para que se copie limpio en celular
      const cleanShareCode = String(b.share_code).trim();

      fields.push({
        name: `─────────────\nBuild #${i + 1} — ${b.name}`,
        value: `\`\`\`\n${cleanShareCode}\n\`\`\`\n**TTK:** \`${buildTtkObj.ttk}s\` | **BTK:** \`${buildTtkObj.btk}\` | **${b.upvotes}** votos\n\n${formatStatsGrid(b.stats, baseStats, false)}`,
        inline: false
      });
    }
  } else {
    fields.push({
      name: "Sin resultados",
      value: "No hay builds registradas para esta arma en la temporada actual.",
      inline: false
    });
  }

  return {
    content: "",
    embeds: [{
      title: weapon.weapon_name,
      color: 0x2563EB, // Azul KoreStats (Blue 600)
      image: weapon.image_url ? { url: weapon.image_url } : undefined, // Imagen grande
      fields,
      footer: {
        text: "KoreStats.com — Delta Force: Hawk Ops",
        icon_url: "https://korestats.com/favicon.ico"
      }
    }],
    components: [{
      type: 1,
      components: [
        { type: 2, style: 5, url: "https://korestats.com/games/delta-force/weapons", label: "Ver en la Web" },
      ]
    }]
  };
}

// ─── Handler del comando /build ───────────────────────────────────────────────
export async function handleBuildCommand(interaction: any) {
  try {
    const options = interaction.data?.options;
    const query = options?.[0]?.value;
    if (!query) return { content: "Debes especificar el nombre de un arma." };

    const weapon = await findWeapon(query);
    if (!weapon) {
      return { content: `No encontré ninguna arma que coincida con **"${query}"**. Prueba con otro nombre o parte del nombre.` };
    }

    const baseStats = {
      damage: weapon.base_damage,
      fire_rate: weapon.base_fire_rate,
      control: weapon.base_control,
      handling: weapon.base_handling,
      stability: weapon.base_stability,
      accuracy: weapon.base_accuracy,
      range: weapon.base_range
    };

    const { builds } = await getBuildsForWeapon(weapon.weapon_name, "votes", 3);
    return generateEmbed(weapon, builds, baseStats);

  } catch (err) {
    console.error("[discord-bot] Error en handleBuildCommand:", err);
    return { content: "Ocurrió un error interno. Intenta de nuevo más tarde." };
  }
}

// ─── Handler de botones ───────────────────────────────────────────────────────
export async function handleInteractionButton(interaction: any) {
  try {
    const customId: string = interaction.data?.custom_id || "";

    if (customId.startsWith("build_top_voted_") || customId.startsWith("build_top_used_")) {
      const prefix = customId.startsWith("build_top_voted_") ? "build_top_voted_" : "build_top_used_";
      const weaponId = customId.slice(prefix.length);
      const sort = customId.startsWith("build_top_voted_") ? "votes" : "usage";

      const weapon = await findWeaponById(weaponId);
      if (!weapon) return { content: "No se encontró el arma en la base de datos." };

      const baseStats = {
        damage: weapon.base_damage, 
        fire_rate: weapon.base_fire_rate,
        control: weapon.base_control, 
        handling: weapon.base_handling,
        stability: weapon.base_stability,
        accuracy: weapon.base_accuracy, 
        range: weapon.base_range
      };

      const { builds } = await getBuildsForWeapon(weapon.weapon_name, sort as "votes" | "usage", 3);
      return generateEmbed(weapon, builds, baseStats);
    }

    if (customId === "link_account") {
      return { content: "La funcionalidad de vincular cuenta estará disponible muy pronto." };
    }

  } catch (err) {
    console.error("[discord-bot] Error en handleInteractionButton:", err);
    return { content: "Ocurrió un error al procesar el botón." };
  }

  return { content: "Interacción no reconocida." };
}

// ─── Buscar armas para autocompletado ─────────────────────────────────────────
async function searchWeaponsAutocomplete(query: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("delta_force_weapons_base")
    .select("weapon_name, category");

  if (error || !data || data.length === 0) return [];

  // Filtrar duplicados por weapon_name
  const uniqueWeaponsMap = new Map<string, any>();
  for (const w of data) {
    if (w.weapon_name && !uniqueWeaponsMap.has(w.weapon_name)) {
      uniqueWeaponsMap.set(w.weapon_name, w);
    }
  }
  const uniqueWeapons = Array.from(uniqueWeaponsMap.values());

  if (!query) {
    return uniqueWeapons.slice(0, 25).map((w: any) => ({ name: w.weapon_name, value: w.weapon_name }));
  }

  const fuse = new Fuse(uniqueWeapons, { keys: ["weapon_name", "category"], threshold: 0.4 });
  const results = fuse.search(query);
  return results.slice(0, 25).map((r: any) => ({ name: r.item.weapon_name, value: r.item.weapon_name }));
}

// ─── Handler de Autocompletado ────────────────────────────────────────────────
export async function handleAutocomplete(interaction: any) {
  try {
    const options = interaction.data?.options;
    if (!options) return { choices: [] };
    
    // Buscar la opción que tiene el foco
    const focusedOption = options.find((opt: any) => opt.focused);
    if (!focusedOption || focusedOption.name !== 'arma') return { choices: [] };

    const query = focusedOption.value;
    const choices = await searchWeaponsAutocomplete(query);
    
    return { choices };
  } catch (err) {
    console.error("[discord-bot] Error en handleAutocomplete:", err);
    return { choices: [] };
  }
}
