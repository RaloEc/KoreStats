import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";


/**
 * GET /api/games/delta-force/weapons
 *
 * Returns aggregated weapon meta data from all users' weapon_stats_records.
 * Groups by weapon name, calculates averages, and assigns tier rankings.
 */

interface WeaponAggregate {
  id: string; // Used as unique key (might be share_code)
  record_id: string; // The UUID of the actual DB record for reporting
  user_id?: string | null;
  weapon_name: string;
  description: string | null;
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
  downvotes?: number;
  community_score: number;
  patch_version: string | null;
  ui_damage?: number;
  special_badges?: string[];
}

// Spanish-to-English stat key mapping
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
  // English keys map to themselves
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

function normalizeStats(raw: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === "ui_damage" || key === "special_badges") {
        result[key] = value;
        continue;
    }
    const mappedKey = STAT_MAP[key];
    if (mappedKey && typeof value === "number" && !isNaN(value)) {
      result[mappedKey] = value;
    }
  }
  return result;
}

function normalizeWeaponName(name: string): string {
  // Remove common prefixes like "Fusil de asalto", "Fusil de batalla", etc.
  return name
    .replace(/^(Fusil de asalto|Fusil de batalla|Ametralladora ligera|Subfusil|Rifle de francotirador|Pistola|Escopeta)\s+/i, "")
    .trim();
}

function categorizeWeapon(stats: Record<string, number>, rawName: string): string {
  const name = rawName.toLowerCase();

  // By name patterns
  if (name.includes("sniper") || name.includes("francotirador") || name.includes("awm") || name.includes("svd")) {
    return "Sniper";
  }
  if (name.includes("pistol") || name.includes("pistola") || name.includes("deagle") || name.includes("glock")) {
    return "Secondary";
  }
  if (name.includes("smg") || name.includes("subfusil") || name.includes("sr-3m") || name.includes("mp")) {
    return "Close Range";
  }

  // By stats heuristics
  const range = stats.range || 0;
  const fireRate = stats.fireRate || 0;

  if (range >= 50) return "Long Range";
  if (range <= 35 && fireRate >= 700) return "Close Range";
  return "Long Range"; // Default rifles
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const mode = request.nextUrl.searchParams.get("mode") || "operations";
    const patchFilter = request.nextUrl.searchParams.get("patch") || "current";
    const validMode = mode === "warfare" ? "warfare" : "operations";

    // ─── Obtener el parche activo del command_center ───────────────────────────
    const FALLBACK_PATCH = "Season 10 - MELTDOWN";
    let currentPatch = FALLBACK_PATCH;
    let showTtkBadge = true;
    try {
      const serviceSupabaseForPatch = getServiceClient();
      
      // Obtener ID del juego Delta Force
      const { data: gameData } = await serviceSupabaseForPatch
        .from("juegos")
        .select("id")
        .eq("slug", "delta-force")
        .single();

      if (gameData?.id) {
        const { data: moduleData } = await serviceSupabaseForPatch
          .from("game_modules")
          .select("config")
          .eq("game_id", gameData.id)
          .eq("module_type", "command_center")
          .eq("enabled", true)
          .single();
        if (moduleData?.config) {
          if (typeof moduleData.config.show_ttk_badge === 'boolean') {
            showTtkBadge = moduleData.config.show_ttk_badge;
          }
          const name = moduleData.config.season_name;
          const version = moduleData.config.season_version;
          if (name && version) {
            const versionStr = /temporada|season/i.test(String(version))
              ? version
              : `Temporada ${version}`;
            currentPatch = `${versionStr} - ${name}`;
          } else if (name) {
            currentPatch = name as string;
          }
        }
      }
    } catch (e) {
      // fallback already set
    }

    // ─── Fetch weapon records ──────────────────────────────────────────────────
    let query = supabase
      .from("weapon_stats_records")
      .select("id, user_id, weapon_name, stats, share_code, description, patch_version")
      .not("weapon_name", "is", null)
      .not("weapon_name", "eq", "")
      .eq("game_mode", validMode)
      .order("created_at", { ascending: false });

    // Filtrar por parche: por defecto solo el parche actual
    if (patchFilter === "current") {
      // Incluir también los que tienen patch_version NULL (builds muy antiguas antes de la migración)
      query = query.or(`patch_version.eq.${currentPatch},patch_version.is.null`);
    }
    // Si patchFilter === "all", no aplicar filtro adicional

    const { data: records, error } = await query;

    if (error) {
      console.error("[delta-force-weapons] Error:", error);
      return NextResponse.json({ weapons: [] }, { status: 200 });
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ weapons: [] }, { status: 200 });
    }

    // Cargar catálogo oficial de armas (imagen y categoría)
    const { data: officialWeapons } = await supabase
      .from("delta_force_weapons")
      .select("slug, name, category, image_url")
      .eq("is_active", true);

    // Mapa de slug -> datos oficiales para lookup rápido
    const officialMap = new Map<string, { category: string; image_url: string | null; name: string }>();
    for (const w of (officialWeapons || [])) {
      officialMap.set(w.slug.toUpperCase(), { category: w.category, image_url: w.image_url, name: w.name });
    }

    // Group by share_code, fallback to id
    const groups = new Map<string, { record_id: string; user_id: string | null; stats: Record<string, any>[]; rawName: string; shareCodes: string[]; description: string | null; patch_version: string | null }>();

    for (const record of records) {
      if (!record.weapon_name) continue;

      const normalizedName = normalizeWeaponName(record.weapon_name);
      const key = record.share_code || record.id.toString();

      if (!groups.has(key)) {
        groups.set(key, { record_id: record.id.toString(), user_id: record.user_id || null, stats: [], rawName: normalizedName, shareCodes: [], description: record.description || null, patch_version: record.patch_version || null });
      }

      if (record.share_code && !groups.get(key)!.shareCodes.includes(record.share_code)) {
        groups.get(key)!.shareCodes.push(record.share_code);
      }
      
      // Try to keep the description if it's available and we don't have one yet
      if (record.description && !groups.get(key)!.description) {
        groups.get(key)!.description = record.description;
      }

      const normalized = normalizeStats(record.stats);
      groups.get(key)!.stats.push(normalized);
    }

    // Aggregate stats per weapon build
    const weapons: WeaponAggregate[] = [];

    for (const [key, group] of Array.from(groups)) {
      const count = group.stats.length;
      if (count === 0) continue;

      const avgOf = (key: string) => {
        const values = group.stats.map((s) => s[key]).filter((v) => v != null && !isNaN(v));
        if (values.length === 0) return 0;
        return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
      };

      const avgDamage = avgOf("damage");
      const avgRange = avgOf("range");
      const avgControl = avgOf("control");
      const avgHandling = avgOf("handling");
      const avgStability = avgOf("stability");
      const avgAccuracy = avgOf("accuracy");
      const avgFireRate = avgOf("fireRate");
      const avgArmorPen = avgOf("armorPenetration");
      const avgCapacity = avgOf("capacity");
      const avgMuzzleVel = avgOf("muzzleVelocity");
      const avgSoundRange = avgOf("soundRange");

      // Calculation of DPS (Damage Per Second) as requested: (FireRate / 60) * Damage
      const avgDps = Math.round((avgFireRate / 60) * avgDamage * 10) / 10;

      // Extract ui_damage and special_badges from the most recent or first stat
      let uiDamage: number | undefined = undefined;
      let specialBadges: string[] | undefined = undefined;
      for (const stat of group.stats) {
          if (stat.ui_damage !== undefined) uiDamage = stat.ui_damage;
          if (stat.special_badges !== undefined && (Array.isArray(stat.special_badges) || typeof stat.special_badges === 'string') && stat.special_badges.length > 0) {
              specialBadges = Array.isArray(stat.special_badges) 
                  ? stat.special_badges 
                  : [stat.special_badges];
          }
      }

      // Refined Overall Score Calculation
      // We balance combat efficiency (DPS + Penetration) with handling/accuracy
      // Weights: DPS (30%), Penetration (15%), Control (15%), Stability (15%), Accuracy (10%), Range (10%), Handling (5%)
      
      // Since DPS can be a high number (e.g. 300-600), we normalize it slightly for the score
      // A typical high DPS is around 600.
      const dpsFactor = Math.min((avgDps / 600) * 100, 100);
      
      const overallScore = Math.round(
        dpsFactor * 0.30 +
        avgArmorPen * 0.15 +
        avgControl * 0.15 +
        avgStability * 0.15 +
        avgAccuracy * 0.10 +
        avgRange * 0.10 +
        avgHandling * 0.05
      );

      const category = categorizeWeapon(
        { range: avgRange, fireRate: avgFireRate, damage: avgDamage },
        group.rawName
      );

      const normalizeSlug = (str: string) => {
        return str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
          .replace(/Ñ/g, "N")
          .replace(/[^A-Z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
      };

      const weaponSlug = normalizeSlug(group.rawName);
      const official = officialMap.get(weaponSlug);

      weapons.push({
        id: key,
        record_id: group.record_id,
        user_id: group.user_id,
        weapon_name: official?.name || group.rawName,
        description: group.description,
        analyses_count: count,
        avg_damage: avgDamage,
        avg_range: avgRange,
        avg_control: avgControl,
        avg_handling: avgHandling,
        avg_stability: avgStability,
        avg_accuracy: avgAccuracy,
        avg_fire_rate: avgFireRate,
        avg_armor_penetration: avgArmorPen,
        avg_capacity: avgCapacity,
        avg_muzzle_velocity: avgMuzzleVel,
        avg_sound_range: avgSoundRange,
        avg_dps: avgDps,
        overall_score: overallScore,
        tier: "C",
        category: official?.category || category,
        share_codes: group.shareCodes,
        image_url: official?.image_url || null,
        is_official: !!official,
        upvotes: 0,
        downvotes: 0,
        community_score: 0,
        patch_version: group.patch_version,
        ui_damage: uiDamage,
        special_badges: specialBadges,
      });
    }

    // ─── Fetch vote totals ──────────────────────────────────────────────────
    const serviceSupabase = getServiceClient();
    const { data: votesData } = await serviceSupabase
      .from("weapon_votes")
      .select("weapon_name, vote")
      .eq("game_mode", validMode);

    // Build a map: weapon build key (id) -> { upvotes, downvotes }
    const voteMap = new Map<string, { upvotes: number; downvotes: number }>();
    for (const v of (votesData || [])) {
      const key = v.weapon_name; // Now weapon_name column stores w.id (build unique key / share code / record id)
      if (!voteMap.has(key)) voteMap.set(key, { upvotes: 0, downvotes: 0 });
      const entry = voteMap.get(key)!;
      if (v.vote === 1) entry.upvotes++;
      else entry.downvotes++;
    }

    // Merge vote data into weapons
    for (const w of weapons) {
      const key = w.id; // Unique build identifier
      const vd = voteMap.get(key);
      if (vd) {
        w.upvotes = vd.upvotes;
        w.downvotes = vd.downvotes;
        w.community_score = vd.upvotes - vd.downvotes;
      }
    }

    // Sort by overall score and assign tiers
    weapons.sort((a, b) => b.overall_score - a.overall_score);

    const totalWeapons = weapons.length;
    weapons.forEach((w, i) => {
      const percentile = i / totalWeapons;
      if (percentile <= 0.15) w.tier = "S";
      else if (percentile <= 0.40) w.tier = "A";
      else if (percentile <= 0.70) w.tier = "B";
      else w.tier = "C";
    });

    // Top voted (community ranking, sorted by community_score desc)
    const top_voted = [...weapons]
      .filter(w => w.community_score > 0)
      .sort((a, b) => b.community_score - a.community_score)
      .slice(0, 3);

    return NextResponse.json({
      weapons,
      top_voted,
      game_mode: validMode,
      total_analyses: records.length,
      last_updated: new Date().toISOString(),
      current_patch: currentPatch,
      show_ttk_badge: showTtkBadge,
    });
  } catch (error) {
    console.error("[delta-force-weapons] Unexpected error:", error);
    return NextResponse.json({ weapons: [] }, { status: 500 });
  }
}
