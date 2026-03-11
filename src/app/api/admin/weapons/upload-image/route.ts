import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

// POST /api/admin/weapons/upload-image
// Sube una imagen al bucket weapon-images y retorna la URL pública
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

  const formData = await request.formData();
  const file = formData.get("image") as File | null;
  const weaponSlug = formData.get("slug") as string | null;

  if (!file || !weaponSlug) {
    return NextResponse.json({ error: "Se requiere imagen y slug del arma" }, { status: 400 });
  }

  const allowedTypes = ["image/webp", "image/png", "image/jpeg", "image/jpg"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Solo se permiten imágenes WebP, PNG o JPEG" }, { status: 400 });
  }

  const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
  const normalizedSlug = weaponSlug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/Ñ/g, "N")
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
    
  const fileName = `${normalizedSlug}.${ext}`;

  const bytes = await file.arrayBuffer();
  const buffer = new Uint8Array(bytes);

  // Usar service client para Storage (bypassa RLS en Storage)
  const serviceSupabase = getServiceClient();
  const { error: uploadError } = await serviceSupabase.storage
    .from("weapon-images")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("[admin/weapons/upload-image]", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = serviceSupabase.storage
    .from("weapon-images")
    .getPublicUrl(fileName);

  return NextResponse.json({ url: publicUrl });
}
