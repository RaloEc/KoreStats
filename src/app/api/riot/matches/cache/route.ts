import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import {
  getCachedMatchHistory,
  getMatchHistory,
  refreshMatchHistoryCache,
} from "@/lib/riot/matches";

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    // CORREGIDO: Usar query param en lugar de header
    const userId = request.nextUrl.searchParams.get("userId");
    const paramPuuid = request.nextUrl.searchParams.get("puuid");

    if (!userId && !paramPuuid) {
      // Necesitamos al menos uno
      return NextResponse.json(
        { error: "No context provided" },
        { status: 400 },
      );
    }

    let targetPuuid = paramPuuid;
    let targetUserId = userId; // Puede ser "public" o user ID

    // Si no hay PUUID directo, buscar cuenta vinculada (solo si hay userId válido)
    if (!targetPuuid && userId && userId !== "public") {
      const { data: riotAccount, error: accountError } = await supabase
        .from("linked_accounts_riot")
        .select("puuid")
        .eq("user_id", userId)
        .single();

      if (accountError || !riotAccount) {
        return NextResponse.json(
          { error: "No hay cuenta de Riot vinculada" },
          { status: 404 },
        );
      }
      targetPuuid = riotAccount.puuid;
    }

    if (!targetPuuid) {
      return NextResponse.json({ error: "PUUID requerido" }, { status: 400 });
    }

    // Intentar usar caché
    const cachedMatches = await getCachedMatchHistory(
      targetUserId || "public",
      targetPuuid,
    );

    if (cachedMatches.length > 0) {
      return NextResponse.json({ matches: cachedMatches, fromCache: true });
    }

    // Fallback: obtener primeras 5 partidas y refrescar caché
    const { matches } = await getMatchHistory(targetPuuid, { limit: 5 });

    // Actualizar caché en background solo si tenemos un userId válido (no public)
    // O si queremos cachear "public" también? Sería bueno cachear public.
    const cacheUserId = targetUserId || "public";

    (async () => {
      try {
        await refreshMatchHistoryCache(cacheUserId, targetPuuid!); // ! es seguro por chequeo previo
      } catch (err) {
        console.error(
          "[GET /api/riot/matches/cache] Error refrescando caché:",
          err,
        );
      }
    })();

    return NextResponse.json({ matches: matches ?? [], fromCache: false });
  } catch (error: any) {
    console.error("[GET /api/riot/matches/cache] Error:", error.message);
    return NextResponse.json(
      { error: "Error al obtener caché de partidas" },
      { status: 500 },
    );
  }
}
