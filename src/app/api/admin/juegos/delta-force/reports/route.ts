import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getServiceClient();

    // Check auth and role
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await (await createClient()).from("perfiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Forzar el uso del Service Role para asegurar que el admin vea TODO sin restricciones de RLS
    const { data: reports, error } = await supabase
      .from("weapon_reports")
      .select(`
        id,
        reason,
        details,
        status,
        created_at,
        reporter_id,
        weapon_stats_record_id,
        weapon_stats:weapon_stats_records (
          id,
          user_id,
          weapon_name,
          share_code,
          description,
          game_mode,
          stats
        )
      `)
      .order("created_at", { ascending: false });

    console.log("[admin-reports] Count found with ServiceRole:", reports ? reports.length : 0);
    
    if (error) {
      console.error("[admin-reports] DB Error:", error);
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }

    if (reports && reports.length > 0) {
      const userIds = new Set<string>();
      const weaponNames = new Set<string>();
      
      reports.forEach((r: any) => {
        if (r.reporter_id) userIds.add(r.reporter_id);
        
        const statsRecord = Array.isArray(r.weapon_stats) ? r.weapon_stats[0] : r.weapon_stats;
        if (Array.isArray(r.weapon_stats)) {
          r.weapon_stats = statsRecord;
        }

        if (statsRecord?.user_id) userIds.add(statsRecord.user_id);
        if (statsRecord?.weapon_name) weaponNames.add(statsRecord.weapon_name);
      });

      // Fetch user profiles and weapon metadata in parallel
      const [profilesRes, weaponsRes] = await Promise.all([
        userIds.size > 0 ? supabase.from("perfiles").select("id, username, avatar_url").in("id", Array.from(userIds)) : { data: [] },
        weaponNames.size > 0 ? supabase.from("delta_force_weapons").select("name, category, image_url") : { data: [] } // Fetch all potentially relevant weapons
      ]);

      const profileMap = new Map();
      if (profilesRes.data) profilesRes.data.forEach(p => profileMap.set(p.id, p));

      const weaponMap = new Map();
      if (weaponsRes.data) weaponsRes.data.forEach(w => weaponMap.set(w.name, w));

      reports.forEach((r: any) => {
        // Reporter info
        if (r.reporter_id) {
          const reporterProfile = profileMap.get(r.reporter_id);
          if (reporterProfile) r.reporter = { username: reporterProfile.username };
        }

        // Weapon creator info & metadata normalization
        const ws = r.weapon_stats;
        if (ws) {
          if (ws.user_id) {
            const profile = profileMap.get(ws.user_id);
            if (profile) {
              ws.perfil = { username: profile.username, avatar_url: profile.avatar_url };
            }
          }

          // Weapon Meta (static data)
          const meta = weaponMap.get(ws.weapon_name);
          if (meta) {
            ws.category = meta.category;
            ws.image_url = meta.image_url;
            ws.is_official = true;
          }

          // Normalize internal stats from JSONB
          const s = ws.stats || {};
          ws.damage = s.dano || 0;
          ws.range = s.alcance || 0;
          ws.control = s.control || 0;
          ws.handling = s.manejo || 0;
          ws.stability = s.estabilidad || 0;
          ws.accuracy = s.precision || 0;
          ws.fire_rate = s.cadenciaDisparo || 0;
          ws.armor_penetration = s.perforacionBlindaje || 0;
          ws.capacity = s.capacidad || 0;
          ws.muzzle_velocity = s.velocidadBoca || 0;
          ws.sound_range = s.sonidoDisparo || 0;
        }
      });
    }

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("[admin-reports] Internal Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
