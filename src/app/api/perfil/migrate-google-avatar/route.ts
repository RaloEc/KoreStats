import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * API para migrar avatares de Google a Supabase Storage
 * POST /api/perfil/migrate-google-avatar
 * Body: { userId: string, googleAvatarUrl: string }
 */

export async function POST(request: NextRequest) {
  try {
    // Crear cliente dentro del handler para evitar errores de build en Netlify
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[migrate-google-avatar] Variables de entorno faltantes");
      return NextResponse.json(
        { error: "Configuración del servidor incompleta" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, googleAvatarUrl } = await request.json();

    if (!userId || !googleAvatarUrl) {
      return NextResponse.json(
        { error: "userId y googleAvatarUrl son requeridos" },
        { status: 400 }
      );
    }

    // Validar que sea URL de Google
    if (!googleAvatarUrl.includes("googleusercontent.com")) {
      return NextResponse.json(
        { error: "URL no es de Google" },
        { status: 400 }
      );
    }

    console.log(
      `[migrate-google-avatar] Descargando avatar de Google para usuario ${userId}`
    );

    // 1. Descargar la imagen de Google
    const response = await fetch(googleAvatarUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(
        `[migrate-google-avatar] Error descargando imagen: ${response.status}`
      );
      return NextResponse.json(
        { error: "No se pudo descargar la imagen de Google" },
        { status: 400 }
      );
    }

    // 2. Obtener el buffer de la imagen
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    console.log(
      `[migrate-google-avatar] Imagen descargada: ${buffer.byteLength} bytes, tipo: ${contentType}`
    );

    // 3. Generar nombre de archivo único
    const timestamp = Date.now();
    const extension = contentType.split("/")[1] || "jpg";
    const fileName = `${userId}-${timestamp}.${extension}`;
    const filePath = `profiles/avatars/${fileName}`;

    // 4. Subir a Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(filePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error(
        `[migrate-google-avatar] Error subiendo a Storage:`,
        uploadError
      );
      return NextResponse.json(
        { error: "No se pudo subir la imagen a Storage" },
        { status: 500 }
      );
    }

    // 5. Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from("profiles")
      .getPublicUrl(filePath);

    const newAvatarUrl = publicUrlData.publicUrl;

    console.log(
      `[migrate-google-avatar] Avatar subido correctamente: ${newAvatarUrl}`
    );

    // 6. Actualizar el perfil en la BD
    const { error: updateError } = await supabase
      .from("perfiles")
      .update({ avatar_url: newAvatarUrl })
      .eq("id", userId);

    if (updateError) {
      console.error(
        `[migrate-google-avatar] Error actualizando perfil:`,
        updateError
      );
      return NextResponse.json(
        { error: "No se pudo actualizar el perfil" },
        { status: 500 }
      );
    }

    console.log(
      `[migrate-google-avatar] Perfil actualizado correctamente para usuario ${userId}`
    );

    return NextResponse.json({
      success: true,
      message: "Avatar migrado correctamente",
      newAvatarUrl,
      fileName,
    });
  } catch (error) {
    console.error("[migrate-google-avatar] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
