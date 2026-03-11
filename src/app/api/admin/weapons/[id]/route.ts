import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("perfiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

// PATCH /api/admin/weapons/[id] — Editar arma
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const admin = await checkAdmin(supabase);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json();
  const { name, slug, category, game_mode, image_url, description, is_active, sort_order } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (slug !== undefined) updateData.slug = slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/Ñ/g, "N")
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (category !== undefined) updateData.category = category;
  if (game_mode !== undefined) updateData.game_mode = game_mode;
  if (image_url !== undefined) updateData.image_url = image_url;
  if (description !== undefined) updateData.description = description;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (sort_order !== undefined) updateData.sort_order = sort_order;

  const serviceSupabase = getServiceClient();
  const { data, error } = await serviceSupabase
    .from("delta_force_weapons")
    .update(updateData)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    console.error("[admin/weapons PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ weapon: data });
}

// DELETE /api/admin/weapons/[id] — Eliminar arma (y su imagen del Storage)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const admin = await checkAdmin(supabase);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const serviceSupabase = getServiceClient();

  // Obtener el weapon para saber su image_url (para borrarla del Storage)
  const { data: weapon } = await serviceSupabase
    .from("delta_force_weapons")
    .select("image_url")
    .eq("id", params.id)
    .single();

  // Si tiene imagen en Storage, borrarla también
  if (weapon?.image_url && weapon.image_url.includes("weapon-images")) {
    try {
      const urlParts = weapon.image_url.split("/weapon-images/");
      if (urlParts[1]) {
        // quitar query params si los hay
        const filePath = urlParts[1].split("?")[0];
        await serviceSupabase.storage.from("weapon-images").remove([filePath]);
      }
    } catch (storageErr) {
      console.warn("[admin/weapons DELETE] Error removing from storage:", storageErr);
    }
  }

  const { error } = await serviceSupabase
    .from("delta_force_weapons")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("[admin/weapons DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
