import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Crear cliente dentro del handler para evitar errores de build en Netlify
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[actualizar] Variables de entorno faltantes");
      return NextResponse.json(
        { error: "Configuración del servidor incompleta" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { id, ...datosServidor } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID de servidor no proporcionado" },
        { status: 400 }
      );
    }

    // Llamar a la función de servicio para actualizar el servidor
    const { data, error } = await supabase.rpc("actualizar_servidor", {
      servidor_id: id,
      p_nombre: datosServidor.nombre,
      p_descripcion: datosServidor.descripcion,
      p_ip: datosServidor.ip,
      p_version: datosServidor.version,
      p_capacidad_jugadores: parseInt(datosServidor.capacidad_jugadores) || 100,
      p_tipo: datosServidor.tipo,
      p_imagen: datosServidor.imagen || null,
      p_destacado: datosServidor.destacado,
    });

    if (error) {
      console.error("Error al actualizar servidor:", error);
      return NextResponse.json(
        { error: "Error al actualizar el servidor", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error al actualizar servidor:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud", details: error },
      { status: 500 }
    );
  }
}
