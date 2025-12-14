import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface AdminDeleteRequest {
  activityType: string;
  activityId: string;
}

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

    // Verificar que es admin
    const { data: profile, error: profileError } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      console.warn("[Activity Admin Delete] Unauthorized attempt:", {
        user_id: user.id,
      });
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    const { activityType, activityId } =
      (await request.json()) as AdminDeleteRequest;

    if (!activityType || !activityId) {
      return NextResponse.json(
        { error: "activityType y activityId requeridos" },
        { status: 400 }
      );
    }

    // Validar tipo de actividad
    const validTypes = [
      "forum_thread",
      "forum_post",
      "weapon_stats",
      "lol_match",
      "noticia",
      "comentario",
    ];
    if (!validTypes.includes(activityType)) {
      return NextResponse.json(
        { error: "Tipo de actividad inválido" },
        { status: 400 }
      );
    }

    // Obtener snapshot del contenido antes de borrar
    let contentSnapshot: any = null;
    let originalUserId: string | null = null;

    switch (activityType) {
      case "forum_thread": {
        const { data } = await supabase
          .from("foro_hilos")
          .select("*")
          .eq("id", activityId)
          .single();
        console.log("[Activity Admin Delete] Snapshot foro_hilos", {
          activityId,
          found: !!data,
          deleted_at: data?.deleted_at,
        });
        contentSnapshot = data;
        originalUserId = data?.user_id;
        break;
      }

      case "forum_post": {
        const { data } = await supabase
          .from("foro_posts")
          .select("*")
          .eq("id", activityId)
          .single();
        console.log("[Activity Admin Delete] Snapshot foro_posts", {
          activityId,
          found: !!data,
          deleted_at: data?.deleted_at,
        });
        contentSnapshot = data;
        originalUserId = data?.user_id;
        break;
      }

      case "weapon_stats": {
        const { data } = await supabase
          .from("weapon_stats_records")
          .select("*")
          .eq("id", activityId)
          .single();
        console.log("[Activity Admin Delete] Snapshot weapon_stats_records", {
          activityId,
          found: !!data,
          deleted_at: data?.deleted_at,
        });
        contentSnapshot = data;
        originalUserId = data?.user_id;
        break;
      }

      case "lol_match": {
        const { data } = await supabase
          .from("user_activity_entries")
          .select("*")
          .eq("match_id", activityId)
          .single();
        console.log("[Activity Admin Delete] Snapshot user_activity_entries", {
          activityId,
          found: !!data,
          deleted_at: data?.deleted_at,
        });
        contentSnapshot = data;
        originalUserId = data?.user_id;
        break;
      }

      case "noticia": {
        const { data } = await supabase
          .from("noticias")
          .select("*")
          .eq("id", activityId)
          .single();
        console.log("[Activity Admin Delete] Snapshot noticia", {
          activityId,
          found: !!data,
          deleted_at: data?.deleted_at,
          estado: data?.estado,
          autor_id: data?.autor_id,
        });
        contentSnapshot = data;
        originalUserId = data?.autor_id;
        break;
      }

      case "comentario": {
        const { data } = await supabase
          .from("comentarios")
          .select("*")
          .eq("id", activityId)
          .single();
        console.log("[Activity Admin Delete] Snapshot comentario", {
          activityId,
          found: !!data,
          deleted_at: data?.deleted_at,
        });
        contentSnapshot = data;
        originalUserId = data?.user_id;
        break;
      }
    }

    // Soft delete según tipo de actividad
    let deleteError = null;

    switch (activityType) {
      case "forum_thread": {
        const { error } = await supabase
          .from("foro_hilos")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", activityId);
        console.log("[Activity Admin Delete] Update foro_hilos", {
          activityId,
          error,
        });
        deleteError = error;
        break;
      }

      case "forum_post": {
        const { error } = await supabase
          .from("foro_posts")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", activityId);
        console.log("[Activity Admin Delete] Update foro_posts", {
          activityId,
          error,
        });
        deleteError = error;
        break;
      }

      case "weapon_stats": {
        const { error } = await supabase
          .from("weapon_stats_records")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", activityId);
        console.log("[Activity Admin Delete] Update weapon_stats_records", {
          activityId,
          error,
        });
        deleteError = error;
        break;
      }

      case "lol_match": {
        // Para partidas LoL, marcar en user_activity_entries
        const { error } = await supabase
          .from("user_activity_entries")
          .update({ deleted_at: new Date().toISOString() })
          .eq("match_id", activityId);
        console.log("[Activity Admin Delete] Update user_activity_entries", {
          activityId,
          error,
        });
        deleteError = error;
        break;
      }

      case "noticia": {
        // Intentar primero con RPC si existe
        console.log(
          "[Activity Admin Delete] Intentando soft_delete_noticia RPC",
          {
            activityId,
          }
        );

        let rpcError = null;
        try {
          const { error } = await supabase.rpc("soft_delete_noticia", {
            p_noticia_id: activityId,
          });
          rpcError = error;
          console.log("[Activity Admin Delete] Update noticia (RPC)", {
            activityId,
            error: rpcError,
          });
        } catch (e) {
          console.log(
            "[Activity Admin Delete] RPC no disponible, usando update directo",
            {
              activityId,
              error: e,
            }
          );
          // Fallback: update directo
          const { error } = await supabase
            .from("noticias")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", activityId);
          rpcError = error;
          console.log("[Activity Admin Delete] Update noticia (directo)", {
            activityId,
            error: rpcError,
          });
        }

        deleteError = rpcError;
        break;
      }

      case "comentario": {
        const { error } = await supabase
          .from("comentarios")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", activityId);
        console.log("[Activity Admin Delete] Update comentario", {
          activityId,
          error,
        });
        deleteError = error;
        break;
      }
    }

    if (deleteError) {
      console.error("[Activity Admin Delete] Error:", deleteError);
      return NextResponse.json(
        { error: "Error al eliminar actividad" },
        { status: 500 }
      );
    }

    // Registrar en auditoría
    await supabase.from("activity_audit_logs").insert({
      user_id: user.id,
      action: "admin_delete",
      activity_type: activityType,
      activity_id: activityId,
      target_user_id: originalUserId,
    });

    // Guardar snapshot para recuperación
    if (contentSnapshot) {
      await supabase.from("deleted_content_snapshots").insert({
        activity_type: activityType,
        activity_id: activityId,
        original_user_id: originalUserId,
        content_snapshot: contentSnapshot,
        deleted_by_user_id: user.id,
      });
    }

    console.log("[Activity Admin Delete] Success:", {
      admin_id: user.id,
      activity_type: activityType,
      activity_id: activityId,
      original_user_id: originalUserId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Activity Admin Delete] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
