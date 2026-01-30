import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/utils/supabase-service";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limitParam = parseInt(searchParams.get("limit") || "10");
    const limit = Math.min(Math.max(limitParam, 1), 100); // Limit between 1 and 100
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const activo = searchParams.get("activo");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const inactivoDias = searchParams.get("inactivoDias");
    const emailVerificado = searchParams.get("emailVerificado");
    const ordenCampo = searchParams.get("ordenCampo") || "role";
    const ordenDireccion = searchParams.get("ordenDireccion") || "ASC";

    const offset = (page - 1) * limit;

    // Construir la consulta base con más campos
    let query = supabase.from("perfiles").select(`
        id,
        username,
        role,
        avatar_url,
        created_at,
        updated_at,
        activo,
        fecha_ultimo_acceso,
        bio,
        ubicacion,
        sitio_web,
        email_verificado,
        racha_dias,
        badges,
        notas_moderador
      `);

    // Construir query de conteo con los mismos filtros
    let countQuery = supabase
      .from("perfiles")
      .select("*", { count: "exact", head: true });

    // Aplicar filtros a ambas queries
    if (search) {
      const term = search.replace(/[(),.]/g, " ").trim();
      if (term) {
        query = query.or(`username.ilike.%${term}%,bio.ilike.%${term}%`);
        countQuery = countQuery.or(
          `username.ilike.%${term}%,bio.ilike.%${term}%`,
        );
      }
    }

    if (role) {
      query = query.eq("role", role);
      countQuery = countQuery.eq("role", role);
    }

    if (activo !== null && activo !== "") {
      query = query.eq("activo", activo === "true");
      countQuery = countQuery.eq("activo", activo === "true");
    }

    if (fechaDesde) {
      query = query.gte("created_at", fechaDesde);
      countQuery = countQuery.gte("created_at", fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte("created_at", fechaHasta);
      countQuery = countQuery.lte("created_at", fechaHasta);
    }

    if (inactivoDias) {
      const diasAtras = new Date();
      diasAtras.setDate(diasAtras.getDate() - parseInt(inactivoDias));
      query = query.or(
        `fecha_ultimo_acceso.is.null,fecha_ultimo_acceso.lt.${diasAtras.toISOString()}`,
      );
      countQuery = countQuery.or(
        `fecha_ultimo_acceso.is.null,fecha_ultimo_acceso.lt.${diasAtras.toISOString()}`,
      );
    }

    if (emailVerificado !== null && emailVerificado !== "") {
      query = query.eq("email_verificado", emailVerificado === "true");
      countQuery = countQuery.eq(
        "email_verificado",
        emailVerificado === "true",
      );
    }

    // Obtener el total de registros con filtros aplicados
    const { count } = await countQuery;

    // Aplicar ordenamiento dinámico
    const ascending = ordenDireccion.toUpperCase() === "ASC";
    query = query.order(ordenCampo, { ascending });

    // Aplicar paginación
    const { data: perfiles, error } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) {
      console.error("Error al obtener usuarios:", error);
      return NextResponse.json(
        { error: "Error al obtener usuarios" },
        { status: 500 },
      );
    }

    // Para cada perfil, obtener información adicional de auth.users si es necesario
    const usuariosCompletos = await Promise.all(
      perfiles.map(async (perfil) => {
        try {
          // Obtener información del usuario de auth.users
          const { data: authUser, error: authError } =
            await supabase.auth.admin.getUserById(perfil.id);

          if (authError) {
            console.warn(
              `Error al obtener datos auth para usuario ${perfil.id}:`,
              authError,
            );
          }

          // Crear el objeto con la estructura correcta según el tipo UsuarioCompleto
          return {
            id: perfil.id,
            email: authUser?.user?.email,
            created_at: perfil.created_at,
            perfil: {
              id: perfil.id,
              username: perfil.username,
              role: perfil.role,
              avatar_url: perfil.avatar_url,
              color: null, // No tenemos este dato en la consulta
              activo: perfil.activo ?? true,
              fecha_ultimo_acceso: perfil.fecha_ultimo_acceso,
              bio: perfil.bio,
              ubicacion: perfil.ubicacion,
              sitio_web: perfil.sitio_web,
            },
          };
        } catch (error) {
          console.warn(`Error al procesar usuario ${perfil.id}:`, error);
          // Retornar datos básicos si falla la obtención de auth
          return {
            id: perfil.id,
            email: "",
            created_at: perfil.created_at,
            perfil: {
              id: perfil.id,
              username: perfil.username,
              role: perfil.role,
              avatar_url: perfil.avatar_url,
              color: null,
              activo: perfil.activo ?? true,
              fecha_ultimo_acceso: perfil.fecha_ultimo_acceso,
              bio: perfil.bio,
              ubicacion: perfil.ubicacion,
              sitio_web: perfil.sitio_web,
            },
          };
        }
      }),
    );

    return NextResponse.json({
      usuarios: usuariosCompletos,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error en API de usuarios:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const body = await request.json();
    const { userId, updates } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "ID de usuario requerido" },
        { status: 400 },
      );
    }

    // Separar actualizaciones de perfil y de auth
    const { email, password, ...perfilUpdates } = updates;

    // Actualizar perfil en la tabla perfiles
    if (Object.keys(perfilUpdates).length > 0) {
      const { error: perfilError } = await supabase
        .from("perfiles")
        .update({
          ...perfilUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (perfilError) {
        console.error("Error al actualizar perfil:", perfilError);
        return NextResponse.json(
          { error: "Error al actualizar perfil" },
          { status: 500 },
        );
      }
    }

    // Actualizar email o password en auth.users si se proporcionan
    if (email || password) {
      const authUpdates: any = {};
      if (email) authUpdates.email = email;
      if (password) authUpdates.password = password;

      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        authUpdates,
      );

      if (authError) {
        console.error("Error al actualizar auth:", authError);
        return NextResponse.json(
          { error: "Error al actualizar autenticación" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ message: "Usuario actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Defense in Depth: Verificar autenticación y rol explícitamente
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verificar si es admin consultando la tabla de perfiles
    const { data: adminProfile } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!adminProfile || adminProfile.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json(
        { error: "ID de usuario requerido" },
        { status: 400 },
      );
    }

    // Obtener información del usuario antes de eliminarlo (para logs)
    const { data: perfilAEliminar } = await supabase
      .from("perfiles")
      .select("username, role")
      .eq("id", userId)
      .single();

    // Obtener el ID del admin que está haciendo la eliminación
    // Nota: En producción deberías obtener esto del token de autenticación
    const adminId = request.headers.get("x-user-id"); // Ajustar según tu implementación

    // --- INICIO DE LÓGICA DE ELIMINACIÓN EN CASCADA MANUAL ---
    // Es crucial eliminar las dependencias en el orden correcto para evitar errores de foreign key.

    // 1. Eliminar datos de las nuevas tablas de admin
    await supabase
      .from("usuario_estadisticas")
      .delete()
      .eq("usuario_id", userId);
    await supabase
      .from("usuario_advertencias")
      .delete()
      .eq("usuario_id", userId);
    await supabase
      .from("usuario_suspensiones")
      .delete()
      .eq("usuario_id", userId);
    // Los admin_logs tienen ON DELETE SET NULL, no es necesario eliminarlos

    // 2. Eliminar reacciones, seguimientos, etc. (tablas que apuntan a posts, hilos o perfiles)
    await supabase.from("foro_reacciones").delete().eq("user_id", userId);
    await supabase.from("foro_seguimiento").delete().eq("user_id", userId);
    await supabase.from("foro_votos_hilos").delete().eq("usuario_id", userId);

    // 3. Eliminar comentarios
    await supabase.from("comentarios").delete().eq("usuario_id", userId);

    // 4. Eliminar posts del foro
    await supabase.from("foro_posts").delete().eq("autor_id", userId);

    // 5. Eliminar hilos del foro
    await supabase.from("foro_hilos").delete().eq("autor_id", userId);

    // 6. Eliminar noticias
    await supabase.from("noticias").delete().eq("autor_id", userId);

    // 7. Eliminar el perfil del usuario
    // Aunque auth.deleteUser podría tener CASCADE, es más seguro hacerlo explícitamente.
    const { error: perfilError } = await supabase
      .from("perfiles")
      .delete()
      .eq("id", userId);
    if (perfilError) {
      console.error("Error al eliminar perfil:", perfilError);
      // No detenemos el proceso, intentamos eliminar el usuario de auth de todas formas
    }

    // 6. Finalmente, eliminar el usuario de auth.users
    // Primero verificar si el usuario existe en auth.users
    const { data: authUser, error: getUserError } =
      await supabase.auth.admin.getUserById(userId);

    if (!getUserError && authUser?.user) {
      // El usuario existe en auth, intentar eliminarlo
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        console.error("Error al eliminar usuario de Supabase Auth:", authError);
        return NextResponse.json(
          {
            error: "Error al eliminar el usuario del sistema de autenticación.",
            details: authError.message,
          },
          { status: 500 },
        );
      }
    } else {
      // El usuario no existe en auth.users, solo existía en perfiles
      console.log(
        `Usuario ${userId} no existe en auth.users, solo se eliminó de perfiles`,
      );
    }

    // --- FIN DE LÓGICA DE ELIMINACIÓN ---

    // Registrar la acción en los logs de auditoría (si tenemos el adminId)
    if (adminId && perfilAEliminar) {
      try {
        await supabase.rpc("registrar_accion_admin", {
          p_admin_id: adminId,
          p_usuario_afectado_id: null, // Ya fue eliminado
          p_accion: "eliminar_usuario",
          p_detalles: {
            username: perfilAEliminar.username,
            role: perfilAEliminar.role,
            userId: userId,
          },
        });
      } catch (logError) {
        console.error("Error al registrar log de auditoría:", logError);
        // No fallar la eliminación por un error en el log
      }
    }

    return NextResponse.json({
      message: "Usuario y todos sus datos asociados eliminados correctamente",
    });
  } catch (error) {
    console.error("Error catastrófico al eliminar usuario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar la eliminación." },
      { status: 500 },
    );
  }
}
