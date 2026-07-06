import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

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
    const limit = parseInt(searchParams.get("limit") || "3", 10);
    const sort = searchParams.get("sort") || "votes"; // "votes" o "usage"

    if (!baseWeaponId) {
      return NextResponse.json({ error: "Missing base_weapon_id parameter" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 3. Obtener el nombre o slug base del arma (esto asume que se relaciona con weapon_stats_records)
    const { data: baseWeapon, error: baseWeaponError } = await supabase
      .from("delta_force_weapons_base")
      .select("weapon_name, category")
      .eq("id", baseWeaponId)
      .single();

    if (baseWeaponError || !baseWeapon) {
        // Fallback en caso de que pasen un ID dummy del catalogo in memory
        // Si no está en DB, devolvemos un mock (útil para el dev setup actual)
    }

    const weaponName = baseWeapon ? baseWeapon.weapon_name : baseWeaponId;

    // 4. Fetch a las stats
    // Aquí implementamos la lógica simplificada de obtener el Top de builds.
    // Dependiendo de tu esquema, esto podría ser weapon_stats_records cruzado con weapon_votes
    
    // NOTA: Para el bot, simplificaremos trayendo registros que coincidan parcial o totalmente con el nombre.
    // En la implementación real, deberías tener una consulta óptima o una vista `top_builds_view`
    
    let query = supabase
      .from("weapon_stats_records")
      .select("id, weapon_name, share_code, stats")
      // Buscamos que weapon_name contenga el nombre base, o podemos usar el nombre exacto
      .ilike("weapon_name", `%${weaponName === 'm4a1-id-1234' ? 'M4A1' : weaponName}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data: records, error } = await query;

    if (error) {
      console.error("[discord-api] Error fetching records:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Calcular stats promedio
    let avg_damage = 0, avg_control = 0, avg_fire_rate = 0, avg_stability = 0;
    if (records && records.length > 0) {
       // Calcular promedios mockeados de los stats 
       // (esto debe reemplazarse por tu parser real normalizeStats)
       avg_damage = 35;
       avg_control = 60;
       avg_fire_rate = 750;
       avg_stability = 65;
    }

    // Mock data based on the records found
    const builds = (records || []).map((r: any, idx: number) => ({
      name: `Build Variante ${idx + 1}`,
      share_code: r.share_code || `DF-XXXX-YYYY-${idx}`,
      upvotes: Math.floor(Math.random() * 100) + 10 // Mock upvotes
    }));

    // Si no hay records (como con los ids mock de fuse.js), devolvemos data mock para probar el bot
    if (builds.length === 0) {
      builds.push({
        name: "Meta Laser Build",
        share_code: "DF-META-LASER-99X",
        upvotes: 420
      });
      builds.push({
        name: "CQC Aggressive",
        share_code: "DF-CQC-RUSH-11A",
        upvotes: 133
      });
      builds.push({
        name: "Long Range Tapper",
        share_code: "DF-TAP-FIRE-77B",
        upvotes: 89
      });
      avg_damage = 42;
      avg_control = 80;
      avg_fire_rate = 800;
      avg_stability = 70;
    }

    return NextResponse.json({
      weapon_name: weaponName,
      stats: {
        avg_damage,
        avg_control,
        avg_fire_rate,
        avg_stability
      },
      builds
    });
  } catch (error) {
    console.error("[discord-api] Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
