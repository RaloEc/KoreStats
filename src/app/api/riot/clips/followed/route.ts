import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Obtener los perfiles pro que sigue este usuario
        const { data: follows, error: followsError } = await supabase
            .from("user_follows_pro")
            .select("pro_profile_id")
            .eq("user_id", user.id);

        if (followsError) {
            console.error("[GET /api/riot/clips/followed] Follows error:", followsError);
            return NextResponse.json({ error: "Error de base de datos" }, { status: 500 });
        }

        if (!follows || follows.length === 0) {
            return NextResponse.json({ clips: [] });
        }

        const proIds = follows.map(f => f.pro_profile_id);

        // Obtener los puuids de esos pro_profiles
        const { data: pros, error: prosError } = await supabase
            .from("public_profiles")
            .select("puuid")
            .in("id", proIds);

        if (prosError) {
            console.error("[GET /api/riot/clips/followed] Pros error:", prosError);
            return NextResponse.json({ error: "Error de base de datos" }, { status: 500 });
        }

        if (!pros || pros.length === 0) {
            return NextResponse.json({ clips: [] });
        }

        const puuids = pros.map(p => p.puuid).filter(Boolean);

        // Cargar los clips de cualquiera de estos puuids
        const { data: clips, error: clipsError } = await supabase
            .from("lol_allstar_clips")
            .select("*")
            .in("riot_puuid", puuids)
            .order("created_at", { ascending: false })
            .limit(20);

        if (clipsError) {
            console.error("[GET /api/riot/clips/followed] Clips error:", clipsError);
            return NextResponse.json({ error: "Error de base de datos" }, { status: 500 });
        }

        return NextResponse.json({ clips: clips || [] });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
