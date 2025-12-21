import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { FriendRequestsResponse } from "@/types/social";

// POST /api/social/friend-requests - Enviar solicitud de amistad
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { targetPublicId } = await request.json();

    if (!targetPublicId) {
      return NextResponse.json(
        { error: "targetPublicId requerido" },
        { status: 400 }
      );
    }

    // Obtener ID del usuario objetivo
    const { data: targetProfile, error: profileError } = await supabase
      .from("perfiles")
      .select("id")
      .eq("public_id", targetPublicId)
      .single();

    if (profileError || !targetProfile) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Obtener ID del usuario actual
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from("perfiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (currentProfileError || !currentProfile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    // No puedes enviarte solicitud a ti mismo
    if (currentProfile.id === targetProfile.id) {
      return NextResponse.json(
        { error: "No puedes enviarte solicitud a ti mismo" },
        { status: 400 }
      );
    }

    // Normalizar IDs: user_a_id siempre debe ser menor que user_b_id
    const user_a_id =
      currentProfile.id < targetProfile.id
        ? currentProfile.id
        : targetProfile.id;
    const user_b_id =
      currentProfile.id < targetProfile.id
        ? targetProfile.id
        : currentProfile.id;

    console.log("[FriendRequest POST] Creating request:", {
      user_a_id,
      user_b_id,
      requester_id: currentProfile.id,
    });

    // Crear solicitud
    const { data: friendRequest, error: requestError } = await supabase
      .from("friend_requests")
      .insert({
        user_a_id,
        user_b_id,
        requester_id: currentProfile.id,
        status: "pending",
      })
      .select()
      .single();

    if (requestError) {
      // Si es error de bloqueo
      if (requestError.message.includes("bloqueado")) {
        return NextResponse.json(
          { error: "No puedes enviar solicitud a este usuario" },
          { status: 403 }
        );
      }
      // Si ya existe solicitud
      if (requestError.code === "23505") {
        return NextResponse.json(
          { error: "Ya existe una solicitud con este usuario" },
          { status: 409 }
        );
      }
      console.error("[FriendRequest POST] Error:", requestError);
      return NextResponse.json(
        { error: "Error al enviar solicitud" },
        { status: 500 }
      );
    }

    // Crear notificación para el usuario que recibe la solicitud
    try {
      const { data: senderProfile } = await supabase
        .from("perfiles")
        .select("username")
        .eq("id", currentProfile.id)
        .single();

      await supabase.from("notifications").insert({
        user_id: targetProfile.id,
        type: "friend_request",
        title: "Nueva solicitud de amistad",
        message: `${
          senderProfile?.username || "Alguien"
        } te ha enviado una solicitud de amistad`,
        data: {
          requestId: friendRequest.id,
          fromUserId: currentProfile.id,
          fromUsername: senderProfile?.username,
        },
      });

      console.log(
        "[FriendRequest POST] Notificación enviada a:",
        targetProfile.id
      );
    } catch (notifError) {
      console.error(
        "[FriendRequest POST] Error al crear notificación:",
        notifError
      );
      // No fallar la solicitud si falla la notificación
    }

    return NextResponse.json({ success: true, friendRequest }, { status: 201 });
  } catch (error) {
    console.error("[FriendRequest POST] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// GET /api/social/friend-requests?scope=received|sent
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "received";

    // Obtener ID del usuario actual
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from("perfiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (currentProfileError || !currentProfile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    let query = supabase
      .from("friend_requests")
      .select(
        `
        id,
        user_a_id,
        user_b_id,
        requester_id,
        status,
        created_at,
        responded_at
      `,
        { count: "exact" }
      )
      .eq("status", "pending");

    // Filtrar según scope
    if (scope === "received") {
      // Solicitudes recibidas: donde el usuario NO es el requester
      query = query
        .or(
          `user_a_id.eq.${currentProfile.id},user_b_id.eq.${currentProfile.id}`
        )
        .neq("requester_id", currentProfile.id);
    } else if (scope === "sent") {
      // Solicitudes enviadas: donde el usuario ES el requester
      query = query.eq("requester_id", currentProfile.id);
    }

    const {
      data: requests,
      error: requestsError,
      count,
    } = await query.order("created_at", { ascending: false });

    if (requestsError) {
      console.error("[FriendRequests GET] Error:", requestsError);
      return NextResponse.json(
        { error: "Error al obtener solicitudes" },
        { status: 500 }
      );
    }

    // Enriquecer con información de perfiles
    const enrichedRequests = await Promise.all(
      (requests || []).map(async (req) => {
        const otherUserId =
          req.user_a_id === currentProfile.id ? req.user_b_id : req.user_a_id;

        const { data: requesterProfile } = await supabase
          .from("perfiles")
          .select("id, username, public_id, avatar_url, color")
          .eq("id", req.requester_id)
          .single();

        const { data: otherProfile } = await supabase
          .from("perfiles")
          .select("id, username, public_id, avatar_url, color")
          .eq("id", otherUserId)
          .single();

        return {
          ...req,
          requester: requesterProfile,
          other_user: otherProfile,
        };
      })
    );

    const response: FriendRequestsResponse = {
      requests: enrichedRequests as any,
      total: count || 0,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[FriendRequests GET] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
