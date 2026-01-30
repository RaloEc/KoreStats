import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Función para generar un slug a partir de un título
function createSlug(title: string): string {
  const now = new Date();
  const datePart = now.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
  const timePart = now.toTimeString().split(" ")[0].replace(/:/g, ""); // HHMMSS
  const randomPart = Math.random().toString(36).substring(2, 8);

  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-") // Reemplaza espacios y guiones bajos por guiones
      .replace(/[^a-z0-9-]/g, "") // Elimina caracteres no alfanuméricos excepto guiones
      .replace(/--+/g, "-") // Reemplaza múltiples guiones por uno solo
      .replace(/^-+|-+$/g, "") // Elimina guiones al principio y al final
      .substring(0, 75) + `-${datePart}${timePart}-${randomPart}`
  );
}

export async function POST(request: Request) {
  const { titulo, contenido, categoria_id, weapon_stats_id } =
    await request.json();

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }

  if (!titulo || !contenido || !categoria_id) {
    return NextResponse.json(
      { message: "Todos los campos son requeridos." },
      { status: 400 },
    );
  }

  // IMPORTANTE: No procesar imágenes en el servidor
  // Las imágenes blob:// no existen en el servidor
  // Se procesarán en el cliente cuando se visualice el hilo
  // Simplemente guardar el contenido tal como viene del editor
  const contenidoProcesado = contenido;

  console.log("[crear-hilo] Recibido POST para crear hilo");
  console.log("[crear-hilo] Título:", titulo);
  console.log("[crear-hilo] Categoría ID:", categoria_id);
  console.log(
    "[crear-hilo] Contenido (primeros 300 chars):",
    contenido.substring(0, 300),
  );

  // Verificar si hay imágenes sin src
  const imgSinSrcRegex = /<img[^>]*(?<!src=["'][^"']*["'])[^>]*>/gi;
  const imagenessSinSrc = contenido.match(imgSinSrcRegex) || [];
  if (imagenessSinSrc.length > 0) {
    console.warn(
      "[crear-hilo] ADVERTENCIA: Se detectaron imágenes sin src:",
      imagenessSinSrc.length,
    );
    imagenessSinSrc.forEach((img, idx) => {
      console.warn(`  [${idx + 1}] ${img.substring(0, 100)}`);
    });
  }

  console.log(
    "[crear-hilo] Guardando hilo con contenido (imágenes se procesarán en cliente)",
  );

  const slug = createSlug(titulo);

  // El `categoria_id` recibido del formulario es el UUID correcto para la inserción.
  const { data, error } = await supabase
    .from("foro_hilos")
    .insert({
      titulo,
      contenido: contenidoProcesado,
      categoria_id,
      autor_id: session.user.id,
      slug,
      weapon_stats_id: weapon_stats_id ?? null,
    })
    .select("id, slug") // Solo seleccionamos lo necesario para la redirección
    .single();

  if (error) {
    console.error("Error al crear el hilo:", error);
    return NextResponse.json(
      {
        message: "Error en el servidor al crear el hilo.",
        error: error.message,
      },
      { status: 500 },
    );
  }

  // Notificar menciones en el hilo
  if (contenidoProcesado) {
    try {
      const { data: perfilData } = await supabase
        .from("perfiles")
        .select("username")
        .eq("id", session.user.id)
        .single();
      const { notifyMentions } = await import("@/lib/notificationService");

      await notifyMentions({
        content: contenidoProcesado,
        authorId: session.user.id,
        authorName: perfilData?.username || "Alguien",
        sourceId: data.id,
        sourceType: "post", // Tratamos un hilo como un "post" principa
        sourceUrl: `/foro/hilo/${data.slug}`,
        previewText: contenidoProcesado.replace(/<[^>]+>/g, ""),
      });
    } catch (err) {
      console.error("[crear-hilo] Error procesando menciones:", err);
    }
  }

  return NextResponse.json(data, { status: 201 });
}
