import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

const DELTA_FORCE_GAME_ID = "63865a65-f510-4a9e-843f-e83f405f3b42";

// GET /api/admin/weapons?gameId=xxx
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("perfiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const gameId = request.nextUrl.searchParams.get("gameId") || DELTA_FORCE_GAME_ID;

  // Usar service client para leer también armas inactivas desde admin
  const serviceSupabase = getServiceClient();
  const { data, error } = await serviceSupabase
    .from("delta_force_weapons")
    .select("*")
    .eq("game_id", gameId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin/weapons GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ weapons: data });
}

// POST /api/admin/weapons — Crear nueva arma
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("perfiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await request.json();
  const { name, slug, category, game_mode, image_url, description, is_active, sort_order, game_id } = body;

  if (!name || !slug || !category) {
    return NextResponse.json({ error: "Nombre, slug y categoría son requeridos" }, { status: 400 });
  }

  const normalizedSlug = slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/Ñ/g, "N")
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Usar service client para INSERT (bypassa RLS)
  const serviceSupabase = getServiceClient();
  const { data, error } = await serviceSupabase
    .from("delta_force_weapons")
    .insert({
      game_id: game_id || DELTA_FORCE_GAME_ID,
      name,
      slug: normalizedSlug,
      category,
      game_mode: game_mode || null,
      image_url: image_url || null,
      description: description || null,
      is_active: is_active ?? true,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[admin/weapons POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ weapon: data }, { status: 201 });
}
