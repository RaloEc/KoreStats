import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import Fuse from "fuse.js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Verificación del Personal Access Token (PAT)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (token !== process.env.KORESTATS_BOT_PAT) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Extraer parámetros
    const searchParams = request.nextUrl.searchParams;
    const baseWeaponId = searchParams.get("base_weapon_id");
    const queryParam = searchParams.get("query");
    const limit = parseInt(searchParams.get("limit") || "3", 10);
    const sort = searchParams.get("sort") || "votes"; // "votes" o "usage"

    if (!baseWeaponId && !queryParam) {
      return NextResponse.json({ error: "Missing base_weapon_id or query parameter" }, { status: 400 });
    }

    const supabase = getServiceClient();
    let baseWeapon: any = null;

    if (baseWeaponId) {
      // Búsqueda directa por ID (usado por botones de interacción)
      const { data } = await supabase
        .from("delta_force_weapons_base")
        .select("id, weapon_name, category, image_url, base_damage, base_fire_rate, base_control, base_stability, base_accuracy, base_range")
        .eq("id", baseWeaponId)
        .single();
      baseWeapon = data;
    } else if (queryParam) {
      // Fuzzy Search dinámico en la base de datos completa
      const { data: allWeapons } = await supabase
        .from("delta_force_weapons_base")
        .select("id, weapon_name, category, image_url, base_damage, base_fire_rate, base_control, base_stability, base_accuracy, base_range");

      if (allWeapons && allWeapons.length > 0) {
        const fuse = new Fuse(allWeapons, { keys: ["weapon_name", "category"], threshold: 0.4 });
        const results = fuse.search(queryParam);
        if (results.length > 0) {
          baseWeapon = results[0].item;
        }
      }
    }

    if (!baseWeapon) {
      return NextResponse.json({ error: "Weapon not found" }, { status: 404 });
    }

    const actualWeaponId = baseWeapon.id;
    const weaponName = baseWeapon.weapon_name;
    const category = baseWeapon.category || "Desconocido";
    const imageUrl = baseWeapon.image_url || null;
    const baseStats = {
      damage: baseWeapon.base_damage,
      fire_rate: baseWeapon.base_fire_rate,
      control: baseWeapon.base_control,
      stability: baseWeapon.base_stability,
      accuracy: baseWeapon.base_accuracy,
      range: baseWeapon.base_range
    };


    // 4. Fetch a las builds reales de la comunidad para esta arma
    // Buscamos registros de weapon_stats_records de delta-force
    const { data: records, error: recordsError } = await supabase
      .from("weapon_stats_records")
      .select("id, weapon_name, share_code, stats, description, user_id")
      .not("weapon_name", "is", null)
      .not("weapon_name", "eq", "")
      .ilike("weapon_name", `%${weaponName}%`);

    if (recordsError) {
      console.error("[discord-api] Error fetching records:", recordsError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // 5. Cargar votos de la comunidad
    const { data: votesData, error: votesError } = await supabase
      .from("weapon_votes")
      .select("weapon_name, vote");

    if (votesError) {
      console.error("[discord-api] Error fetching votes:", votesError);
    }

    // Mapear votos: weapon_name de la tabla weapon_votes contiene el ID único de la build/registro
    const voteMap = new Map<string, { upvotes: number; downvotes: number }>();
    for (const v of (votesData || [])) {
      const key = v.weapon_name; // ID del registro o share_code
      if (!voteMap.has(key)) voteMap.set(key, { upvotes: 0, downvotes: 0 });
      const entry = voteMap.get(key)!;
      if (v.vote === 1) entry.upvotes++;
      else entry.downvotes++;
    }

    // 6. Agrupar y Calcular Estadísticas
    let totalDamage = 0;
    let totalControl = 0;
    let totalFireRate = 0;
    let totalStability = 0;
    let statsCount = 0;

    // Spanish-to-English stat key mapping helper
    const STAT_MAP: Record<string, string> = {
      dano: "damage",
      control: "control",
      cadenciaDisparo: "fireRate",
      estabilidad: "stability",
      damage: "damage",
      fireRate: "fireRate",
      stability: "stability",
    };

    const getStat = (stats: any, key: string): number => {
      if (!stats) return 0;
      const mappedKey = STAT_MAP[key];
      if (mappedKey && typeof stats[mappedKey] === "number") return stats[mappedKey];
      if (typeof stats[key] === "number") return stats[key];
      return 0;
    };

    // Agrupar por share_code o por ID del registro si no tiene share_code
    const groups = new Map<string, {
      id: string;
      name: string;
      share_code: string;
      upvotes: number;
      downvotes: number;
      score: number;
      usages: number;
    }>();

    for (const record of (records || [])) {
      // Extraer stats para promediar
      const dmg = getStat(record.stats, "damage");
      const ctrl = getStat(record.stats, "control");
      const fr = getStat(record.stats, "fireRate");
      const stab = getStat(record.stats, "stability");

      if (dmg || ctrl || fr || stab) {
        totalDamage += dmg;
        totalControl += ctrl;
        totalFireRate += fr;
        totalStability += stab;
        statsCount++;
      }

      const key = record.share_code || record.id;
      if (!key) continue;

      const votes = voteMap.get(record.id) || voteMap.get(record.share_code || "") || { upvotes: 0, downvotes: 0 };
      const score = votes.upvotes - votes.downvotes;

      if (!groups.has(key)) {
        groups.set(key, {
          id: record.id,
          name: record.description ? (record.description.length > 30 ? record.description.substring(0, 30) + "..." : record.description) : "Build de la Comunidad",
          share_code: record.share_code || "Código no disponible",
          upvotes: votes.upvotes,
          downvotes: votes.downvotes,
          score: score,
          usages: 0
        });
      }
      groups.get(key)!.usages++;
    }

    // Calcular promedios generales
    const avg_damage = statsCount > 0 ? Math.round(totalDamage / statsCount) : 0;
    const avg_control = statsCount > 0 ? Math.round(totalControl / statsCount) : 0;
    const avg_fire_rate = statsCount > 0 ? Math.round(totalFireRate / statsCount) : 0;
    const avg_stability = statsCount > 0 ? Math.round(totalStability / statsCount) : 0;

    // Ordenar y limitar las builds
    const sortedBuilds = Array.from(groups.values());
    if (sort === "votes") {
      sortedBuilds.sort((a, b) => b.score - a.score || b.upvotes - a.upvotes);
    } else {
      sortedBuilds.sort((a, b) => b.usages - a.usages || b.score - a.score);
    }

    const builds = sortedBuilds.slice(0, limit).map((b) => ({
      name: b.name,
      share_code: b.share_code,
      upvotes: b.upvotes
    }));

    return NextResponse.json({
      weapon_id: actualWeaponId,
      weapon_name: weaponName,
      category,
      image_url: imageUrl,
      base_stats: baseStats,
      stats: statsCount > 0 ? {
        avg_damage,
        avg_control,
        avg_fire_rate,
        avg_stability
      } : null,
      builds
    });
  } catch (error) {
    console.error("[discord-api] Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
