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

// ─── Generar Bloque de Texto de Estadísticas ──────────────────────────────────
function formatStatsGrid(stats: any) {
  const d = stats?.damage ?? "—";
  const r = stats?.range ?? "—";
  const c = stats?.control ?? "—";
  const m = stats?.handling ?? "—";
  const s = stats?.stability ?? "—";
  const p = stats?.accuracy ?? "—";

  const pad = (val: any) => String(val).padEnd(4);

  return `\`\`\`text
Daño       : ${pad(d)} | Alcance  : ${pad(r)}
Control    : ${pad(c)} | Manejo   : ${pad(m)}
Estabilidad: ${pad(s)} | Precisión: ${pad(p)}
\`\`\``;
}

// ─── Generar Embed para Discord ───────────────────────────────────────────────
function generateEmbed(weapon: any, builds: any[], baseStats: any) {
  const fields: any[] = [];

  // Estadísticas base oficiales del arma
  if (baseStats && (baseStats.damage || baseStats.fire_rate)) {
    fields.push({
      name: "Estadísticas Base",
      value: formatStatsGrid(baseStats),
      inline: false
    });
  }

  // Builds encontradas
  if (builds && builds.length > 0) {
    for (let i = 0; i < builds.length; i++) {
      const b = builds[i];
      fields.push({
        name: `#${i + 1} — ${b.name}`,
        value: `Código: \`${b.share_code}\`  •  ${b.upvotes} votos\n${formatStatsGrid(b.stats)}`,
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
      description: `Categoría: **${weapon.category || "Desconocido"}**`,
      color: 0xFF7700, // Naranja KoreStats
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
