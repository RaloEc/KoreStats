import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/social/follow - Seguir a un usuario
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

    // Obtener ID del usuario a seguir por public_id
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

    // No puedes seguirte a ti mismo
    if (currentProfile.id === targetProfile.id) {
      return NextResponse.json(
        { error: "No puedes seguirte a ti mismo" },
        { status: 400 }
      );
    }

    // Crear el follow (el trigger validará bloqueos)
    const { data: follow, error: followError } = await supabase
      .from("social_follows")
      .insert({
        follower_id: currentProfile.id,
        followed_id: targetProfile.id,
      })
      .select()
      .single();

    if (followError) {
      console.error("[Follow POST] Error details:", {
        code: followError.code,
        message: followError.message,
        details: followError.details,
        hint: followError.hint,
      });

      // Si es error de bloqueo
      if (followError.message.includes("bloqueado")) {
        return NextResponse.json(
          { error: "No puedes seguir a este usuario" },
          { status: 403 }
        );
      }
      // Si ya existe el follow (unique constraint violation)
      if (followError.code === "23505") {
        console.log(
          "[Follow POST] Ya existe follow entre",
          currentProfile.id,
          "y",
          targetProfile.id
        );
        return NextResponse.json(
          { error: "Ya sigues a este usuario" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Error al seguir usuario" },
        { status: 500 }
      );
    }

    console.log("[Follow POST] Success - nuevo follow creado:", {
      follower_id: currentProfile.id,
      followed_id: targetProfile.id,
    });

    // Crear notificación para el usuario que es seguido
    try {
      const { data: followerProfile } = await supabase
        .from("perfiles")
        .select("username")
        .eq("id", currentProfile.id)
        .single();

      await supabase.from("notifications").insert({
        user_id: targetProfile.id,
        type: "new_follower",
        title: "Nuevo seguidor",
        message: `${
          followerProfile?.username || "Alguien"
        } ha comenzado a seguirte`,
        data: {
          followId: follow.id,
          fromUserId: currentProfile.id,
          fromUsername: followerProfile?.username,
        },
      });

      console.log("[Follow POST] Notificación enviada a:", targetProfile.id);
    } catch (notifError) {
      console.error("[Follow POST] Error al crear notificación:", notifError);
      // No fallar el follow si falla la notificación
    }

    return NextResponse.json({ success: true, follow }, { status: 201 });
  } catch (error) {
    console.error("[Follow POST] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/social/follow?targetPublicId=xxx - Dejar de seguir
export async function DELETE(request: Request) {
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
    const targetPublicId = searchParams.get("targetPublicId");

    if (!targetPublicId) {
      return NextResponse.json(
        { error: "targetPublicId requerido" },
        { status: 400 }
      );
    }

    // Obtener ID del usuario a dejar de seguir
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

    // Eliminar el follow
    const { error: deleteError, count } = await supabase
      .from("social_follows")
      .delete()
      .eq("follower_id", currentProfile.id)
      .eq("followed_id", targetProfile.id);

    if (deleteError) {
      console.error("[Follow DELETE] Error:", deleteError);
      return NextResponse.json(
        { error: "Error al dejar de seguir" },
        { status: 500 }
      );
    }

    console.log("[Follow DELETE] Success - follow eliminado:", {
      follower_id: currentProfile.id,
      followed_id: targetProfile.id,
      deleted_count: count,
    });

    return NextResponse.json(
      { success: true, deleted_count: count },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Follow DELETE] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
