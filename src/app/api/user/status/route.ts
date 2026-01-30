import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type StatusType = "online" | "in-game" | "offline";

interface UpdateStatusRequest {
  status: StatusType;
}

// Cache global fuera del handler para persistir entre llamadas
const tokenCache = new Map<string, { user: any; timestamp: number }>();

export async function PATCH(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Obtener el token de autorización
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7);

    // CACHÉ DE TOKEN (Simple In-Memory Cache)
    // Evita llamar a supabase.auth.getUser() en cada request si el token es el mismo
    // Esto previene el error 429 (Rate Limit) de Supabase Auth
    const now = Date.now();
    const cached = tokenCache.get(token);
    let user = cached?.user;

    if (cached && now - cached.timestamp < 60 * 1000) {
      // Usar caché si tiene menos de 1 minuto
      user = cached.user;
    } else {
      // Verificar el token y obtener el usuario de Supabase
      const {
        data: { user: fetchedUser },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !fetchedUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      user = fetchedUser;

      // Guardar en caché
      tokenCache.set(token, { user: fetchedUser, timestamp: now });

      // Limpieza simple del caché si crece demasiado (opcional)
      if (tokenCache.size > 1000) {
        const firstKey = tokenCache.keys().next().value;
        if (firstKey) tokenCache.delete(firstKey);
      }
    }

    if (!user) {
      // Redundant check but safe
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validar el body
    const body: UpdateStatusRequest = await request.json();
    const validStatuses: StatusType[] = ["online", "in-game", "offline"];

    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: online, in-game, offline" },
        { status: 400 },
      );
    }

    // Actualizar el estado en la BD
    const { error: updateError } = await supabase
      .from("perfiles")
      .update({ status: body.status })
      .eq("id", user.id);

    if (updateError) {
      console.error("[PATCH /api/user/status] Database error:", updateError);
      return NextResponse.json(
        { error: "Failed to update status" },
        { status: 500 },
      );
    }

    // console.log(
    //   `[PATCH /api/user/status] Status updated for user ${user.id} to ${body.status}`,
    // );

    return NextResponse.json(
      { success: true, status: body.status },
      { status: 200 },
    );
  } catch (error) {
    console.error("[PATCH /api/user/status] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
