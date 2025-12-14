import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

type StatusType = "online" | "in-game" | "offline";

interface UpdateStatusRequest {
  status: StatusType;
}

export async function PATCH(request: NextRequest) {
  try {
    // Obtener el token de autorización
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // Verificar el token y obtener el usuario
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validar el body
    const body: UpdateStatusRequest = await request.json();
    const validStatuses: StatusType[] = ["online", "in-game", "offline"];

    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: online, in-game, offline" },
        { status: 400 }
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
        { status: 500 }
      );
    }

    console.log(
      `[PATCH /api/user/status] Status updated for user ${user.id} to ${body.status}`
    );

    return NextResponse.json(
      { success: true, status: body.status },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/user/status] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
