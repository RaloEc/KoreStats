import { createClient, getServiceClient } from "@/lib/supabase/server";

export interface WeaponAggregate {
  weapon_name: string;
  analyses_count: number;
  avg_damage: number;
  avg_range: number;
  avg_control: number;
  avg_handling: number;
  avg_stability: number;
  avg_accuracy: number;
  avg_fire_rate: number;
  avg_armor_penetration: number;
  avg_capacity: number;
  avg_muzzle_velocity: number;
  avg_sound_range: number;
  avg_dps: number;
  overall_score: number;
  tier: "S" | "A" | "B" | "C";
  category: string;
  share_codes: string[];
  image_url: string | null;
  is_official: boolean;
  upvotes: number;
  downvotes: number;
  community_score: number;
  game_mode?: string;
  patch_version?: string | null;
}

const STAT_MAP: Record<string, string> = {
  dano: "damage",
  alcance: "range",
  manejo: "handling",
  estabilidad: "stability",
  precision: "accuracy",
  control: "control",
  capacidad: "capacity",
  perforacionBlindaje: "armorPenetration",
  cadenciaDisparo: "fireRate",
  velocidadBoca: "muzzleVelocity",
  sonidoDisparo: "soundRange",
  damage: "damage",
  range: "range",
  handling: "handling",
  stability: "stability",
  accuracy: "accuracy",
  armorPenetration: "armorPenetration",
  fireRate: "fireRate",
  muzzleVelocity: "muzzleVelocity",
  soundRange: "soundRange",
};

function normalizeStats(raw: Record<string, any>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    const mappedKey = STAT_MAP[key];
    if (mappedKey && typeof value === "number" && !isNaN(value)) {
      result[mappedKey] = value;
    }
  }
  return result;
}

function normalizeWeaponName(name: string): string {
  return name
    .replace(/^(Fusil de asalto|Fusil de batalla|Ametralladora ligera|Subfusil|Rifle de francotirador|Pistola|Escopeta)\s+/i, "")
    .trim();
}

function categorizeWeapon(stats: Record<string, number>, rawName: string): string {
  const name = rawName.toLowerCase();
  if (name.includes("sniper") || name.includes("francotirador") || name.includes("awm") || name.includes("svd")) return "Sniper";
  if (name.includes("pistol") || name.includes("pistola") || name.includes("deagle") || name.includes("glock")) return "Secondary";
  if (name.includes("smg") || name.includes("subfusil") || name.includes("sr-3m") || name.includes("mp")) return "Close Range";
  const range = stats.range || 0;
  const fireRate = stats.fireRate || 0;
  if (range >= 50) return "Long Range";
  if (range <= 35 && fireRate >= 700) return "Close Range";
  return "Long Range";
}

const CATEGORY_DEFAULTS: Record<string, Record<string, number>> = {
  Assault: { damage: 32, fireRate: 700, control: 60, stability: 62, accuracy: 65, range: 45, armorPenetration: 30, capacity: 30, muzzleVelocity: 600, soundRange: 80 },
  Shotgun: { damage: 85, fireRate: 120, control: 40, stability: 35, accuracy: 45, range: 15, armorPenetration: 15, capacity: 8, muzzleVelocity: 350, soundRange: 120 },
  SMG: { damage: 24, fireRate: 850, control: 65, stability: 70, accuracy: 55, range: 25, armorPenetration: 20, capacity: 30, muzzleVelocity: 400, soundRange: 60 },
  LMG: { damage: 30, fireRate: 650, control: 50, stability: 55, accuracy: 60, range: 50, armorPenetration: 25, capacity: 100, muzzleVelocity: 550, soundRange: 90 },
  Marksman: { damage: 48, fireRate: 350, control: 55, stability: 50, accuracy: 75, range: 65, armorPenetration: 40, capacity: 20, muzzleVelocity: 700, soundRange: 100 },
  Sniper: { damage: 95, fireRate: 45, control: 30, stability: 30, accuracy: 90, range: 85, armorPenetration: 55, capacity: 5, muzzleVelocity: 850, soundRange: 150 },
  Secondary: { damage: 26, fireRate: 400, control: 70, stability: 65, accuracy: 60, range: 18, armorPenetration: 15, capacity: 15, muzzleVelocity: 300, soundRange: 50 },
};

export async function getDeltaForceWeaponsMeta(mode: "operations" | "warfare" | "all" = "all") {
  const supabase = await createClient();

  // 1. Fetch records
  let query = supabase
    .from("weapon_stats_records")
    .select("weapon_name, stats, share_code, game_mode")
    .not("weapon_name", "is", null)
    .not("weapon_name", "eq", "");

  if (mode !== "all") {
    query = query.eq("game_mode", mode);
  }

  const { data: records, error } = await query.order("created_at", { ascending: false });

  if (error || !records || records.length === 0) return { weapons: [], top_voted: [] };

  // 2. Official weapons
  const { data: officialWeapons } = await supabase
    .from("delta_force_weapons")
    .select("slug, name, category, image_url")
    .eq("is_active", true);

  const officialMap = new Map();
  for (const w of (officialWeapons || [])) {
    officialMap.set(w.slug.toUpperCase(), { category: w.category, image_url: w.image_url, name: w.name });
  }

  // 3. Aggregate by (WeaponName + GameMode)
  const groups = new Map<string, { stats: Record<string, number>[]; rawName: string; shareCodes: string[]; gameMode: string }>();
  for (const record of records) {
    if (!record.weapon_name) continue;
    const normalizedName = normalizeWeaponName(record.weapon_name);
    const recMode = record.game_mode || "operations";
    const key = `${normalizedName.toUpperCase()}_${recMode.toUpperCase()}`;
    
    if (!groups.has(key)) {
      groups.set(key, { stats: [], rawName: normalizedName, shareCodes: [], gameMode: recMode });
    }
    if (record.share_code) groups.get(key)!.shareCodes.push(record.share_code);
    groups.get(key)!.stats.push(normalizeStats(record.stats));
  }

  const weapons: WeaponAggregate[] = [];
  for (const [, group] of Array.from(groups)) {
    const count = group.stats.length;
    if (count === 0) continue; // Solo armas con datos reales de la comunidad

    const avgOf = (key: string) => {
      const values = group.stats.map((s) => s[key]).filter((v) => v != null && !isNaN(v));
      if (values.length === 0) return 0;
      return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    };

    const avgDamage = avgOf("damage");
    const avgFireRate = avgOf("fireRate");
    const avgDps = Math.round((avgFireRate / 60) * avgDamage * 10) / 10;
    const dpsFactor = Math.min((avgDps / 600) * 100, 100);

    const overallScore = Math.round(
      dpsFactor * 0.30 +
      avgOf("armorPenetration") * 0.15 +
      avgOf("control") * 0.15 +
      avgOf("stability") * 0.15 +
      avgOf("accuracy") * 0.10 +
      avgOf("range") * 0.10 +
      avgOf("handling") * 0.05
    );

    const weaponSlug = group.rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const official = officialMap.get(weaponSlug);

    weapons.push({
      weapon_name: official?.name || group.rawName,
      analyses_count: count,
      avg_damage: avgDamage,
      avg_range: avgOf("range"),
      avg_control: avgOf("control"),
      avg_handling: avgOf("handling"),
      avg_stability: avgOf("stability"),
      avg_accuracy: avgOf("accuracy"),
      avg_fire_rate: avgFireRate,
      avg_armor_penetration: avgOf("armorPenetration"),
      avg_capacity: avgOf("capacity"),
      avg_muzzle_velocity: avgOf("muzzleVelocity"),
      avg_sound_range: avgOf("soundRange"),
      avg_dps: avgDps,
      overall_score: overallScore,
      tier: "C",
      category: official?.category || categorizeWeapon({ range: avgOf("range"), fireRate: avgFireRate }, group.rawName),
      share_codes: group.shareCodes,
      image_url: official?.image_url || null,
      is_official: !!official,
      upvotes: 0,
      downvotes: 0,
      community_score: 0,
      game_mode: group.gameMode,
    });
  }

  // 4. Votes
  const serviceSupabase = getServiceClient();
  let votesQuery = serviceSupabase
    .from("weapon_votes")
    .select("weapon_name, vote, game_mode");
  
  if (mode !== "all") {
    votesQuery = votesQuery.eq("game_mode", mode);
  }
  
  const { data: votesData } = await votesQuery;

  const voteMap = new Map();
  for (const v of (votesData || [])) {
    const recMode = v.game_mode || "operations";
    const key = `${normalizeWeaponName(v.weapon_name).toUpperCase()}_${recMode.toUpperCase()}`;
    if (!voteMap.has(key)) voteMap.set(key, { upvotes: 0, downvotes: 0 });
    const entry = voteMap.get(key)!;
    if (v.vote === 1) entry.upvotes++; else entry.downvotes++;
  }

  for (const w of weapons) {
    const key = `${normalizeWeaponName(w.weapon_name).toUpperCase()}_${(w.game_mode || "operations").toUpperCase()}`;
    const vd = voteMap.get(key);
    if (vd) {
      w.upvotes = vd.upvotes;
      w.downvotes = vd.downvotes;
      w.community_score = vd.upvotes - vd.downvotes;
    }
  }

  // 5. Sort and Tier
  weapons.sort((a, b) => b.overall_score - a.overall_score);
  const total = weapons.length;
  weapons.forEach((w, i) => {
    const p = i / total;
    if (p <= 0.15) w.tier = "S";
    else if (p <= 0.40) w.tier = "A";
    else if (p <= 0.70) w.tier = "B";
    else w.tier = "C";
  });

  const top_voted = [...weapons]
    .filter(w => w.community_score > 0)
    .sort((a, b) => b.community_score - a.community_score)
    .slice(0, 5);

  return { weapons, top_voted };
}
