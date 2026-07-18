import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getServiceClient();
    
    // Check auth and role
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await (await createClient()).from("perfiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const { data: report, error } = await supabase
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
          stats,
          source_image_path
        )
      `)
      .eq("id", id)
      .single();

    if (error || !report) {
      console.error("[admin-report-detail] DB Error:", error);
      return NextResponse.json({ error: "Failed to fetch report" }, { status: 404 });
    }

    const userIds = new Set<string>();
    const weaponNames = new Set<string>();
    
    if (report.reporter_id) userIds.add(report.reporter_id);
    
    let statsRecord = Array.isArray(report.weapon_stats) ? report.weapon_stats[0] : report.weapon_stats;
    report.weapon_stats = statsRecord;

    if (statsRecord?.user_id) userIds.add(statsRecord.user_id);
    if (statsRecord?.weapon_name) weaponNames.add(statsRecord.weapon_name);

    // Fetch user profiles and weapon metadata
    const [profilesRes, weaponsRes] = await Promise.all([
      userIds.size > 0 ? supabase.from("perfiles").select("id, username, avatar_url").in("id", Array.from(userIds)) : { data: [] },
      weaponNames.size > 0 ? supabase.from("delta_force_weapons").select("name, category, image_url").in("name", Array.from(weaponNames)) : { data: [] }
    ]);

    const profileMap = new Map();
    if (profilesRes.data) profilesRes.data.forEach((p: any) => profileMap.set(p.id, p));

    const weaponMap = new Map();
    if (weaponsRes.data) weaponsRes.data.forEach((w: any) => weaponMap.set(w.name, w));

    // Reporter info
    if (report.reporter_id) {
      const reporterProfile = profileMap.get(report.reporter_id);
      if (reporterProfile) report.reporter = { username: reporterProfile.username };
    }

    // Weapon creator info & metadata
    const ws = report.weapon_stats;
    if (ws) {
      if (ws.user_id) {
        const p = profileMap.get(ws.user_id);
        if (p) {
          ws.perfil = { username: p.username, avatar_url: p.avatar_url };
        }
      }

      const meta = weaponMap.get(ws.weapon_name);
      if (meta) {
        ws.category = meta.category;
        ws.image_url = meta.image_url;
        ws.is_official = true;
      }

      // Generate signed URL since weapon-analysis-temp is a private bucket
      if (ws.source_image_path) {
        const { data: signedData } = await supabase.storage
          .from("weapon-analysis-temp")
          .createSignedUrl(ws.source_image_path, 60 * 60); // 1 hour expiry
        
        if (signedData?.signedUrl) {
          ws.screenshot_url = signedData.signedUrl;
        }
      }

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

    return NextResponse.json({ report });
  } catch (err) {
    console.error("[admin-report-detail] Internal Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
