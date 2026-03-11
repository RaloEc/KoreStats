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
  const { titulo, contenido, categoria_id, weapon_stats } = await request.json();

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

  const contenidoProcesado = contenido;

  const slug = createSlug(titulo);

  let finalWeaponStatsId = null;

  // Si hay estadísticas del arma, creamos el registro en weapon_stats_records primero.
  if (weapon_stats) {
    try {
      const { data: record, error: recordError } = await supabase
        .from("weapon_stats_records")
        .insert({
          weapon_name: weapon_stats.nombreArma || weapon_stats.weapon_name || null,
          stats: weapon_stats,
        })
        .select("id")
        .single();

      if (!recordError && record) {
        finalWeaponStatsId = record.id;
      } else {
        console.error("[crear-hilo] Error insertando weapon_stats_records:", recordError);
      }
    } catch (e) {
      console.error("[crear-hilo] Excepción al insertar weapon_stats_records:", e);
    }
  }

  const { data, error } = await supabase
    .from("foro_hilos")
    .insert({
      titulo,
      contenido: contenidoProcesado,
      categoria_id,
      autor_id: session.user.id,
      slug,
      weapon_stats_id: finalWeaponStatsId,
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
