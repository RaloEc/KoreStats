import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/riot/clips/sync
 * 
 * NOTA: La arquitectura de Allstar funciona mejor vía Webhooks (event-driven).
 * Este endpoint ya no intenta hacer polling a Allstar (que solía dar 404),
 * sino que simplemente verifica qué clips tenemos ya en nuestra base de datos
 * procesados por el webhook y devuelve el conteo.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 1. Obtener la cuenta de Riot vinculada
    const { data: riotAccount } = await supabase
      .from("linked_accounts_riot")
      .select("puuid")
      .eq("user_id", user.id)
      .single();

    if (!riotAccount) {
      return NextResponse.json({ error: "Cuenta Riot no vinculada" }, { status: 404 });
    }

    // 2. Contar clips locales (sincronizados vía webhook)
    const { count, error: countError } = await supabase
      .from("lol_allstar_clips")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id);

    if (countError) {
      console.error("[Allstar Sync] Error al contar clips locales:", countError);
    }

    return NextResponse.json({
      success: true,
      message: "Sincronización completada (vía Webhook)",
      count: count || 0,
      note: "Los clips se añaden automáticamente mediante el sistema de Webhooks de Allstar."
    });

  } catch (error: any) {
    console.error("[Allstar Sync] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno", details: error.message },
      { status: 500 }
    );
  }
}
