import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, getServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

import {
    DEFAULT_WEAPONS,
    DEFAULT_AMMO,
    DEFAULT_GEAR,
} from "@/lib/delta-force/defaultData";

async function syncCaliberWeapons(db: any, caliberName: string, selectedWeapons: string[]) {
    const logs: string[] = [];
    logs.push(`[syncCaliberWeapons] START - caliber: "${caliberName}" | weapons: ${JSON.stringify(selectedWeapons)}`);
    try {
        // 1. Obtener las armas que actualmente tienen este calibre asignado en delta_force_weapons_base
        logs.push(`[syncCaliberWeapons] Fetching weapons currently assigned to caliber "${caliberName}"`);
        const { data: currentWeapons, error: currentErr } = await db
            .from("delta_force_weapons_base")
            .select("weapon_name, game_mode")
            .eq("caliber", caliberName);

        if (currentErr) {
            const errStr = `Error fetching current caliber weapons: ${currentErr.message}`;
            logs.push(`[syncCaliberWeapons] ERROR: ${errStr}`);
            return { success: false, error: errStr, logs };
        }

        logs.push(`[syncCaliberWeapons] Weapons currently assigned to caliber "${caliberName}": ${JSON.stringify(currentWeapons?.map((w: any) => `${w.weapon_name} (${w.game_mode})`) ?? [])}`);

        // 2. Determinar cuáles de esas armas ya no están en las seleccionadas (para desvincularlas)
        const toUnlink: string[] = [];
        if (currentWeapons && currentWeapons.length > 0) {
            for (const cw of currentWeapons) {
                const isSelected = selectedWeapons.some(
                    (sw: string) => sw.toLowerCase() === cw.weapon_name.toLowerCase()
                );
                if (!isSelected && !toUnlink.includes(cw.weapon_name)) {
                    toUnlink.push(cw.weapon_name);
                }
            }
        }

        if (toUnlink.length > 0) {
            logs.push(`[syncCaliberWeapons] Unlinking weapons that are no longer selected: ${JSON.stringify(toUnlink)}`);
            const { data: unlinkData, error: unlinkErr } = await db
                .from("delta_force_weapons_base")
                .update({ caliber: null })
                .eq("caliber", caliberName)
                .in("weapon_name", toUnlink)
                .select();

            if (unlinkErr) {
                const errStr = `Error unlinking weapons: ${unlinkErr.message}`;
                logs.push(`[syncCaliberWeapons] ERROR: ${errStr}`);
                return { success: false, error: errStr, logs };
            }
            logs.push(`[syncCaliberWeapons] Successfully unlinked weapons: ${JSON.stringify(unlinkData?.map((w: any) => w.weapon_name) ?? [])}`);
        } else {
            logs.push(`[syncCaliberWeapons] No weapons to unlink.`);
        }

        // 3. Obtener el estado actual en la base de datos de las armas seleccionadas
        if (selectedWeapons.length > 0) {
            logs.push(`[syncCaliberWeapons] Fetching database state for selected weapons: ${JSON.stringify(selectedWeapons)}`);
            const { data: existingBaseWeapons, error: fetchErr } = await db
                .from("delta_force_weapons_base")
                .select("id, weapon_name, game_mode")
                .in("weapon_name", selectedWeapons);

            if (fetchErr) {
                const errStr = `Error fetching selected weapons: ${fetchErr.message}`;
                logs.push(`[syncCaliberWeapons] ERROR: ${errStr}`);
                return { success: false, error: errStr, logs };
            }
            logs.push(`[syncCaliberWeapons] Existing base weapon entries found: ${JSON.stringify(existingBaseWeapons?.map((w: any) => `${w.weapon_name} (${w.game_mode})`) ?? [])}`);

            const modes = ["operations", "warfare"] as const;
            const updates: string[] = [];
            const inserts: any[] = [];

            for (const wName of selectedWeapons) {
                for (const mode of modes) {
                    const existingRecord = existingBaseWeapons?.find(
                        (ebw: any) => ebw.weapon_name.toLowerCase() === wName.toLowerCase() && ebw.game_mode === mode
                    );

                    if (existingRecord) {
                        updates.push(existingRecord.id);
                    } else {
                        // Buscar el arma base por defecto
                        const defaultWeapon = DEFAULT_WEAPONS.find(
                            (dw) => dw.weapon_name.toLowerCase() === wName.toLowerCase() && dw.game_mode === mode
                        ) || DEFAULT_WEAPONS.find(
                            (dw) => dw.weapon_name.toLowerCase() === wName.toLowerCase()
                        );

                        inserts.push({
                            weapon_name: wName,
                            game_mode: mode,
                            caliber: caliberName,
                            category: defaultWeapon?.category ?? "Assault",
                            base_damage: defaultWeapon?.base_damage ?? "33",
                            base_fire_rate: defaultWeapon?.base_fire_rate ?? 600,
                            base_control: defaultWeapon?.base_control ?? 50,
                            base_handling: defaultWeapon?.base_handling ?? 50,
                            base_stability: defaultWeapon?.base_stability ?? 50,
                            base_accuracy: defaultWeapon?.base_accuracy ?? 50,
                            base_range: defaultWeapon?.base_range ?? 50,
                            base_capacity: defaultWeapon?.base_capacity ?? 30,
                            base_muzzle_velocity: defaultWeapon?.base_muzzle_velocity ?? 800,
                            base_armor_penetration: defaultWeapon?.base_armor_penetration ?? "0",
                            image_url: defaultWeapon?.image_url ?? null
                        });
                    }
                }
            }

            // 4. Ejecutar actualizaciones
            if (updates.length > 0) {
                logs.push(`[syncCaliberWeapons] Updating caliber to "${caliberName}" for existing records (IDs): ${JSON.stringify(updates)}`);
                const { data: updateData, error: updateErr } = await db
                    .from("delta_force_weapons_base")
                    .update({ caliber: caliberName })
                    .in("id", updates)
                    .select();

                if (updateErr) {
                    const errStr = `Error updating weapon calibers: ${updateErr.message}`;
                    logs.push(`[syncCaliberWeapons] ERROR: ${errStr}`);
                    return { success: false, error: errStr, logs };
                }
                logs.push(`[syncCaliberWeapons] Successfully updated ${updateData?.length ?? 0} weapon entries.`);
            }

            // 5. Ejecutar inserciones
            if (inserts.length > 0) {
                logs.push(`[syncCaliberWeapons] Inserting new weapon entries: ${JSON.stringify(inserts.map(i => `${i.weapon_name} (${i.game_mode})`))}`);
                const { data: insertData, error: insertErr } = await db
                    .from("delta_force_weapons_base")
                    .insert(inserts)
                    .select();

                if (insertErr) {
                    const errStr = `Error inserting new weapons: ${insertErr.message}`;
                    logs.push(`[syncCaliberWeapons] ERROR: ${errStr}`);
                    return { success: false, error: errStr, logs };
                }
                logs.push(`[syncCaliberWeapons] Successfully inserted ${insertData?.length ?? 0} new weapon entries.`);
            }
        } else {
            logs.push(`[syncCaliberWeapons] selectedWeapons is empty. No weapons to associate.`);
        }

        logs.push(`[syncCaliberWeapons] END - Success`);
        return { success: true, logs };
    } catch (err: any) {
        const errStr = err?.message || JSON.stringify(err);
        logs.push(`[syncCaliberWeapons] EXCEPTION: ${errStr}`);
        return { success: false, error: errStr, logs };
    }
}

function getFirstImageUrl(urlStr: string | null | undefined): string {
    if (!urlStr) return "";
    const trimmed = urlStr.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed[0] || "";
            }
        } catch {
            // Ignorar
        }
    }
    return trimmed;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type"); // 'weapons' | 'ammo' | 'gear'
        const caliber = searchParams.get("caliber"); // Optional filter for ammo

        const CACHE_HEADERS = {
            "Cache-Control": "no-store, max-age=0",
        };

        const supabase = await createClient();

        if (type === "weapons") {
            const mode = (searchParams.get("mode") || "operations") as "operations" | "warfare";

            // Get Delta Force game ID
            const { data: gameData } = await supabase
                .from("juegos")
                .select("id")
                .eq("slug", "delta-force")
                .single();
            const gameId = gameData?.id || "63865a65-f510-4a9e-843f-e83f405f3b42";

            // 1. Fetch official active weapons
            const { data: officialWeapons, error: officialErr } = await supabase
                .from("delta_force_weapons")
                .select("*")
                .eq("game_id", gameId)
                .eq("is_active", true)
                .order("name", { ascending: true });

            if (officialErr) {
                console.error("[delta-force-base-data] Error fetching official weapons:", officialErr.message);
                return NextResponse.json({ error: officialErr.message }, { status: 500 });
            }

            // 2. Fetch base stats for the requested mode
            const { data: baseStats, error: statsErr } = await supabase
                .from("delta_force_weapons_base")
                .select("*")
                .eq("game_mode", mode);

            if (statsErr) {
                console.error("[delta-force-base-data] Error fetching base stats:", statsErr.message);
            }

            if (!officialWeapons || officialWeapons.length === 0) {
                const fallback = DEFAULT_WEAPONS.filter(w => w.game_mode === mode);
                return NextResponse.json({ weapons: fallback.length ? fallback : DEFAULT_WEAPONS }, { headers: CACHE_HEADERS });
            }

            // Create a lookup map for base stats by weapon_name (case insensitive)
            const statsMap = new Map<string, any>();
            if (baseStats) {
                for (const stat of baseStats) {
                    statsMap.set(stat.weapon_name.toLowerCase().trim(), stat);
                }
            }

            // Create a lookup map for default weapons by name/slug (case insensitive)
            const defaultMap = new Map<string, any>();
            for (const dw of DEFAULT_WEAPONS) {
                defaultMap.set(dw.weapon_name.toLowerCase().trim(), dw);
            }

            const findStats = (owName: string, owSlug: string) => {
                const nameLower = owName.toLowerCase().trim();
                const slugLower = owSlug.toLowerCase().trim();
                
                if (statsMap.has(nameLower)) return statsMap.get(nameLower);
                if (statsMap.has(slugLower)) return statsMap.get(slugLower);
                
                let result: any = null;
                statsMap.forEach((value, key) => {
                    if (result) return;
                    const keyTokens = key.split(/[^a-z0-9]+/).filter(t => t.length > 0);
                    const nameTokens = nameLower.split(/[^a-z0-9]+/).filter(t => t.length > 0);
                    if (keyTokens.length > 0 && nameTokens.length > 0 && keyTokens[0] === nameTokens[0]) {
                        result = value;
                    }
                });
                return result;
            };

            const findDefault = (owName: string, owSlug: string) => {
                const nameLower = owName.toLowerCase().trim();
                const slugLower = owSlug.toLowerCase().trim();
                
                if (defaultMap.has(nameLower)) return defaultMap.get(nameLower);
                if (defaultMap.has(slugLower)) return defaultMap.get(slugLower);
                
                let result: any = null;
                defaultMap.forEach((value, key) => {
                    if (result) return;
                    const keyTokens = key.split(/[^a-z0-9]+/).filter(t => t.length > 0);
                    const nameTokens = nameLower.split(/[^a-z0-9]+/).filter(t => t.length > 0);
                    if (keyTokens.length > 0 && nameTokens.length > 0 && keyTokens[0] === nameTokens[0]) {
                        result = value;
                    }
                });
                return result;
            };

            // Merge official weapons with base stats or defaults
            const mergedWeapons = officialWeapons.map((ow) => {
                const stats = findStats(ow.name, ow.slug);
                const defaults = findDefault(ow.name, ow.slug);

                return {
                    id: stats?.id || ow.id,
                    official_id: ow.id,
                    base_id: stats?.id || null,
                    weapon_name: ow.name,
                    category: ow.category,
                    game_mode: mode,
                    caliber: stats ? stats.caliber : (defaults ? defaults.caliber : null),
                    base_damage: stats?.base_damage ? String(stats.base_damage) : (defaults?.base_damage ?? "0"),
                    base_fire_rate: stats?.base_fire_rate ?? defaults?.base_fire_rate ?? 0,
                    base_control: stats?.base_control ?? defaults?.base_control ?? 0,
                    base_handling: stats?.base_handling ?? defaults?.base_handling ?? 0,
                    base_stability: stats?.base_stability ?? defaults?.base_stability ?? 0,
                    base_accuracy: stats?.base_accuracy ?? defaults?.base_accuracy ?? 0,
                    base_range: stats?.base_range ?? defaults?.base_range ?? 0,
                    base_capacity: stats?.base_capacity ?? defaults?.base_capacity ?? 0,
                    base_muzzle_velocity: stats?.base_muzzle_velocity ?? defaults?.base_muzzle_velocity ?? 0,
                    base_armor_penetration: mode === "operations"
                        ? (stats?.base_armor_penetration ? String(stats.base_armor_penetration) : (defaults?.base_armor_penetration ?? "0"))
                        : "0",
                    image_url: ow.image_url || stats?.image_url || defaults?.image_url || null,
                    is_configured: !!stats,
                };
            });

            return NextResponse.json({ weapons: mergedWeapons }, { headers: CACHE_HEADERS });
        }

        if (type === "ammo") {
            let query = supabase.from("delta_force_ammo").select("*");
            if (caliber) {
                query = query.eq("caliber", caliber);
            }
            const { data, error } = await query.order("penetration_level", { ascending: true });

            if (error) {
                console.log("[delta-force-base-data] Error fetching ammo:", error?.message);
                return NextResponse.json({ ammo: DEFAULT_AMMO }, { headers: CACHE_HEADERS });
            }
            return NextResponse.json({ ammo: data ?? [] }, { headers: CACHE_HEADERS });
        }

        if (type === "calibers") {
            const { data, error } = await supabase
                .from("delta_force_calibers")
                .select("*")
                .order("name", { ascending: true });

            if (error) {
                console.error("[delta-force-base-data] Error fetching calibers:", error.message);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            return NextResponse.json({ calibers: data ?? [] }, { headers: CACHE_HEADERS });
        }

        if (type === "gear") {
            const { data, error } = await supabase
                .from("delta_force_gear")
                .select("*")
                .order("tier", { ascending: true });

            if (error || !data || data.length === 0) {
                console.log("[delta-force-base-data] Falling back to default gear:", error?.message);
                return NextResponse.json({ gear: DEFAULT_GEAR }, { headers: CACHE_HEADERS });
            }
            return NextResponse.json({ gear: data }, { headers: CACHE_HEADERS });
        }

        return NextResponse.json({ error: "Invalid type requested" }, { status: 400 });
    } catch (err: any) {
        console.error("[delta-force-base-data] Unexpected error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    // 1. Authenticate with cookie-based client
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    console.log("[base-data POST] Auth user:", user?.id ?? "null", "| authError:", authError?.message ?? "none");
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch (parseErr: any) {
        console.error("[base-data POST] JSON parse error:", parseErr?.message);
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { table, weapons, ...payload } = body;
    console.log("[base-data POST] Table:", table, "| name:", payload.weapon_name ?? payload.name);

    if (!["delta_force_weapons_base", "delta_force_ammo", "delta_force_gear", "delta_force_calibers"].includes(table)) {
        return NextResponse.json({ error: "Invalid table specified" }, { status: 400 });
    }

    // 2. Use service role client for DB writes (bypasses RLS)
    let db: any;
    try {
        db = getServiceClient();
        const svcKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
        console.log("[base-data POST] Service client OK | key length:", svcKey.length, "| key prefix:", svcKey.slice(0, 20));
    } catch (initErr: any) {
        console.error("[base-data POST] Service client init error:", initErr?.message);
        return NextResponse.json({ error: "DB init error: " + initErr?.message }, { status: 500 });
    }

    try {
        let data: any, error: any, status: any, statusText: any;

        let oldImageUrl: string | null = null;
        if (table === "delta_force_calibers" && payload.name) {
            const { data: oldCal } = await db
                .from("delta_force_calibers")
                .select("image_url")
                .eq("name", payload.name)
                .maybeSingle();
            if (oldCal) {
                oldImageUrl = oldCal.image_url;
            }
        }

        if (table === "delta_force_weapons_base") {
            ({ data, error, status, statusText } = await db
                .from(table)
                .upsert([payload], { onConflict: "weapon_name,game_mode" })
                .select());
        } else if (table === "delta_force_ammo") {
            ({ data, error, status, statusText } = await db
                .from(table)
                .insert([payload])
                .select());
        } else if (table === "delta_force_calibers") {
            ({ data, error, status, statusText } = await db
                .from(table)
                .upsert([payload], { onConflict: "name" })
                .select());
        } else {
            ({ data, error, status, statusText } = await db
                .from(table)
                .upsert([payload], { onConflict: "name" })
                .select());
        }

        console.log("[base-data POST] HTTP status:", status, statusText);
        console.log("[base-data POST] data:", JSON.stringify(data));
        console.log("[base-data POST] error raw:", error);
        console.log("[base-data POST] error JSON:", JSON.stringify(error));
        console.log("[base-data POST] error type:", error === null ? "null" : error === undefined ? "undefined" : typeof error);
        if (error !== null && error !== undefined) {
            console.log("[base-data POST] error own keys:", Object.getOwnPropertyNames(error));
            // Try reading all possible error properties including prototype chain
            const allKeys = [];
            for (const k in error) allKeys.push(k);
            console.log("[base-data POST] error all keys (proto chain):", allKeys);
            console.log("[base-data POST] error.message:", error.message);
            console.log("[base-data POST] error.code:", error.code);
            console.log("[base-data POST] error.details:", error.details);
            console.log("[base-data POST] error.hint:", error.hint);
        }

        if (error !== null && error !== undefined) {
            const errMsg = error.message || error.code || error.hint || `HTTP ${status}: ${statusText}` || "DB write failed";
            return NextResponse.json({ error: errMsg }, { status: 500 });
        }

        // --- AUTOGENERACIÓN Y PROPAGACIÓN DE IMÁGENES PARA CALIBRES ---
        let syncLogs: string[] = [];
        if (table === "delta_force_calibers" && payload.name) {
            // Sincronizar armas asociadas si se enviaron
            if (Array.isArray(weapons)) {
                const syncResult = await syncCaliberWeapons(db, payload.name, weapons);
                syncLogs = syncResult.logs;
                if (!syncResult.success) {
                    console.error("[base-data POST] Weapon sync failed:", syncResult.error);
                    return NextResponse.json({ error: syncResult.error, logs: syncLogs }, { status: 500 });
                }
            }
            // 1. Verificar si ya existen balas para este calibre en delta_force_ammo
            const { data: existingAmmo, error: ammoCheckErr } = await db
                .from("delta_force_ammo")
                .select("id")
                .eq("caliber", payload.name);

            if (!ammoCheckErr && (!existingAmmo || existingAmmo.length === 0)) {
                // Generar e insertar 5 niveles de munición de perforación
                const calculateDamageVsArmor = (bulletLevel: number, armorLevel: number): number => {
                    const diff = bulletLevel - armorLevel;
                    if (diff < 0) return 0;
                    if (diff === 0) return 50;
                    if (diff === 1) return 75;
                    return 100;
                };

                const bulletsToCreate = Array.from({ length: 5 }, (_, i) => {
                    const level = i + 1;
                    return {
                        name: `${payload.name} - Nivel ${level}`,
                        caliber: payload.name,
                        penetration_level: level,
                        damage_ratio: 100,
                        armor_pen_degradation: "bajo",
                        pen_falloff_coefficient: 0,
                        damage_vs_armor_1: calculateDamageVsArmor(level, 1),
                        damage_vs_armor_2: calculateDamageVsArmor(level, 2),
                        damage_vs_armor_3: calculateDamageVsArmor(level, 3),
                        damage_vs_armor_4: calculateDamageVsArmor(level, 4),
                        damage_vs_armor_5: calculateDamageVsArmor(level, 5),
                        damage_vs_armor_6: calculateDamageVsArmor(level, 6),
                        image_url: getFirstImageUrl(payload.image_url),
                        description: ""
                    };
                });

                const { error: bulkInsertErr } = await db
                    .from("delta_force_ammo")
                    .insert(bulletsToCreate);

                if (bulkInsertErr) {
                    console.error("[base-data POST] Error creating default ammo for caliber:", bulkInsertErr.message);
                }
            } else if (!ammoCheckErr && existingAmmo && existingAmmo.length > 0 && payload.image_url !== undefined) {
                // Si ya existen pero cambiamos/agregamos la imagen del calibre, la propagamos solo a las que heredan o no tienen
                const { data: ammoList } = await db
                    .from("delta_force_ammo")
                    .select("id, image_url")
                    .eq("caliber", payload.name);

                if (ammoList && ammoList.length > 0) {
                    const oldFirst = getFirstImageUrl(oldImageUrl);
                    const idsToUpdate = ammoList
                        .filter((a: any) => !a.image_url || a.image_url === "" || a.image_url === oldImageUrl || a.image_url === oldFirst)
                        .map((a: any) => a.id);

                    if (idsToUpdate.length > 0) {
                        await db
                            .from("delta_force_ammo")
                            .update({ image_url: getFirstImageUrl(payload.image_url) })
                            .in("id", idsToUpdate);
                    }
                }
            }
        }

        console.log("[base-data POST] SUCCESS — rows:", data?.length);
        revalidatePath("/api/games/delta-force/base-data");
        return NextResponse.json({ success: true, data, logs: syncLogs });
    } catch (queryErr: any) {
        console.error("[base-data POST] Query exception:", queryErr?.constructor?.name, queryErr?.message);
        console.error("[base-data POST] Stack:", queryErr?.stack?.slice(0, 500));
        return NextResponse.json({ error: queryErr?.message || "Query failed" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { table, id, weapons, ...payload } = body;

    if (!["delta_force_weapons_base", "delta_force_ammo", "delta_force_gear", "delta_force_calibers"].includes(table)) {
        return NextResponse.json({ error: "Invalid table specified" }, { status: 400 });
    }
    if (!id) {
        return NextResponse.json({ error: "Missing id for update" }, { status: 400 });
    }

    try {
        const db = getServiceClient();

        // Si es delta_force_calibers, podemos querer obtener el nombre y la imagen del calibre actual antes de la actualización
        let caliberName = payload.name;
        let oldImageUrl: string | null = null;
        if (table === "delta_force_calibers") {
            const { data: currentCaliber } = await db
                .from("delta_force_calibers")
                .select("name, image_url")
                .eq("id", id)
                .single();
            if (currentCaliber) {
                caliberName = caliberName || currentCaliber.name;
                oldImageUrl = currentCaliber.image_url;
            }
        }

        const { data, error } = await db
            .from(table)
            .update(payload)
            .eq("id", id)
            .select();

        if (error) {
            const errMsg = error?.message || JSON.stringify(error) || "DB update failed";
            console.error("[base-data PUT] error:", errMsg);
            return NextResponse.json({ error: errMsg }, { status: 500 });
        }

        // Si actualizamos las armas compatibles de un calibre
        let syncLogs: string[] = [];
        if (table === "delta_force_calibers" && caliberName && Array.isArray(weapons)) {
            const syncResult = await syncCaliberWeapons(db, caliberName, weapons);
            syncLogs = syncResult.logs;
            if (!syncResult.success) {
                console.error("[base-data PUT] Weapon sync failed:", syncResult.error);
                return NextResponse.json({ error: syncResult.error, logs: syncLogs }, { status: 500 });
            }
        }

        // Si actualizamos la imagen de un calibre con éxito, propagarla a las municiones de este calibre (sin pisar las personalizadas)
        if (table === "delta_force_calibers" && payload.image_url !== undefined && caliberName) {
            const { data: ammoList } = await db
                .from("delta_force_ammo")
                .select("id, image_url")
                .eq("caliber", caliberName);

            if (ammoList && ammoList.length > 0) {
                const oldFirst = getFirstImageUrl(oldImageUrl);
                const idsToUpdate = ammoList
                    .filter((a: any) => !a.image_url || a.image_url === "" || a.image_url === oldImageUrl || a.image_url === oldFirst)
                    .map((a: any) => a.id);

                if (idsToUpdate.length > 0) {
                    await db
                        .from("delta_force_ammo")
                        .update({ image_url: getFirstImageUrl(payload.image_url) })
                        .in("id", idsToUpdate);
                }
            }
        }

        revalidatePath("/api/games/delta-force/base-data");
        return NextResponse.json({ success: true, data, logs: syncLogs });
    } catch (err: any) {
        console.error("[base-data PUT] exception:", err?.message);
        return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const table = searchParams.get("table");
    const id = searchParams.get("id");

    if (!table || !["delta_force_weapons_base", "delta_force_ammo", "delta_force_gear", "delta_force_calibers"].includes(table)) {
        return NextResponse.json({ error: "Invalid table specified" }, { status: 400 });
    }
    if (!id) {
        return NextResponse.json({ error: "Missing id for delete" }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return NextResponse.json({ success: true, message: "Ignorado (no es un UUID de base de datos)" });
    }

    try {
        const db = getServiceClient();
        const { error } = await db
            .from(table)
            .delete()
            .eq("id", id);

        if (error) {
            let errMsg = error?.message || JSON.stringify(error) || "DB delete failed";
            console.error("[base-data DELETE] error:", errMsg);

            if (table === "delta_force_calibers" && error.code === "23503") {
                errMsg = "No se puede eliminar el calibre porque está siendo utilizado por armas o municiones registradas.";
            }

            return NextResponse.json({ error: errMsg }, { status: 500 });
        }
        revalidatePath("/api/games/delta-force/base-data");
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[base-data DELETE] exception:", err?.message);
        return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
    }
}
