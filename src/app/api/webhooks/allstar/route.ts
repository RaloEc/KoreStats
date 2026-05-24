import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  try {
    const authHeader = 
      request.headers.get("authorization") || 
      request.headers.get("x-allstar-auth") ||
      request.headers.get("x-webhook-secret");
      
    const secret = process.env.ALLSTAR_WEBHOOK_SECRET;

    console.log("[Allstar Webhook] Headers:", Object.fromEntries(request.headers));

    // Si hay un secret configurado, validamos. 
    // Allstar envía el token a veces como "Bearer TOKEN" y otras directo.
    if (secret) {
      const cleanHeader = authHeader?.replace("Bearer ", "").trim();
      const cleanSecret = secret.replace("Bearer ", "").trim();
      
      if (cleanHeader !== cleanSecret) {
        console.warn("[Allstar Webhook] Acceso denegado. Token no coincide.");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("[Allstar Webhook] Recibiendo datos...");
    let payload;
    try {
      payload = await request.json();
    } catch {
      const text = await request.text();
      payload = JSON.parse(text);
    }
    console.log("[Allstar Webhook] Payload recibido:", JSON.stringify(payload, null, 2));

    const eventType = payload.event || payload.type;
    if (eventType && eventType !== "clip.ready") {
      console.log("[Allstar Webhook] Evento ignorado:", eventType);
      return NextResponse.json({ ignored: true });
    }

    /**
     * El payload de Allstar suele contener el PUUID de Riot en el campo 'game_account_id'
     * o similar. Intentaremos encontrar al usuario en nuestra DB usando ese ID.
     */
    
    let puuid = payload.game_account_id || payload.account_id || payload.puuid;
    if (typeof puuid === 'string' && puuid.startsWith("riot:")) {
      puuid = puuid.replace("riot:", "");
    }

    const clipId = payload.clip_id || payload.id;
    const videoUrl = payload.video_url || payload.media_url || payload.url;
    const thumbUrl = payload.thumbnail_url || payload.preview_url;
    const title = payload.clip_title || payload.title || "Nuevo Clip de LoL";
    const championId = payload.champion_id || payload.hero_id;
    const matchId = payload.match_id || payload.game_id;
    
    // Novedades para estadísticas que Allstar suele proveer:
    const createdAt = payload.created_at || new Date().toISOString();
    const clipDuration = payload.clip_duration || payload.duration;
    const game = payload.game;
    const killType = payload.kill_type;

    if (!puuid || !clipId) {
      console.warn("[Allstar Webhook] Datos incompletos (falta PUUID o clipId)");
      return NextResponse.json({ error: "Incomplete data" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 1. Buscar al usuario que tiene este PUUID vinculado
    const { data: riotAccount, error: accountError } = await supabase
      .from("linked_accounts_riot")
      .select("user_id")
      .eq("puuid", puuid)
      .single();

    if (accountError || !riotAccount) {
      console.warn("[Allstar Webhook] No se encontró un usuario vinculado al PUUID:", puuid);
      // Respondemos 200 para no causar reintentos innecesarios en Allstar si el usuario simplemente existe allí pero no aquí
      return NextResponse.json({ message: "User not linked in KoreStats" }, { status: 200 });
    }

    // 2. Insertar el clip en nuestra tabla
    const metadata = {
        ...payload,
        clip_duration: clipDuration,
        clip_created_at: createdAt,
        event_type: eventType,
        game: game,
        kill_type: killType,
        timestamp: new Date().getTime()
    };

    const { error: insertError } = await supabase
      .from("lol_allstar_clips")
      .upsert({
        user_id: riotAccount.user_id,
        riot_puuid: puuid,
        allstar_clip_id: clipId,
        clip_title: title,
        video_url: videoUrl,
        thumbnail_url: thumbUrl,
        champion_id: championId ? parseInt(championId.toString()) : null,
        match_id: matchId,
        created_at: createdAt,
        metadata: metadata // Guardamos todo estructurado
      }, { onConflict: 'allstar_clip_id' });

    if (insertError) {
      console.error("[Allstar Webhook] Error al insertar clip:", insertError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log(`[Allstar Webhook] ✅ Clip ${clipId} guardado para el usuario ${riotAccount.user_id}`);

    return NextResponse.json({ success: true, clip_id: clipId }, { status: 200 });

  } catch (error: any) {
    console.error("[Allstar Webhook] Error crítico:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}

// Allstar podría enviar una petición de verificación (GET o OPTIONS)
export async function GET() {
  return NextResponse.json({ message: "Allstar Webhook Endpoint Active" });
}
