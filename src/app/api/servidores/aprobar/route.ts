import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Configuración del servidor incompleta" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const solicitud = await request.json();

    if (!solicitud || !solicitud.id) {
      return NextResponse.json(
        { error: "Solicitud inválida" },
        { status: 400 }
      );
    }

    // Llamar a la función de servicio para aprobar la solicitud
    const { data, error } = await supabase.rpc("aprobar_solicitud_servidor", {
      solicitud_id: solicitud.id,
    });

    if (error) {
      console.error("Error al aprobar solicitud:", error);
      return NextResponse.json(
        { error: "Error al aprobar la solicitud", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error al procesar solicitud:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud", details: error },
      { status: 500 }
    );
  }
}
