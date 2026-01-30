import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/utils/supabase-service";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Función para verificar si el usuario es administrador
async function esAdmin(supabase: any) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return perfil?.role === "admin";
  } catch (error) {
    console.error("Error al verificar rol de administrador:", error);
    return false;
  }
}

// POST - Ejecutar acciones masivas en noticias
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const admin = searchParams.get("admin") === "true";

  // Verificar permisos de admin
  if (admin) {
    const esUsuarioAdmin = await esAdmin(supabase);
    if (!esUsuarioAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 403 },
      );
    }
  }

  try {
    const body = await request.json();
    const { ids, accion, valor } = body;

    // Para la acción de eliminar borradores no necesitamos IDs
    if (
      accion !== "eliminar_borradores" &&
      (!ids || !Array.isArray(ids) || ids.length === 0)
    ) {
      return NextResponse.json(
        { error: "Se requiere un array de IDs para esta acción" },
        { status: 400 },
      );
    }

    if (!accion) {
      return NextResponse.json(
        { error: "Se requiere especificar una acción" },
        { status: 400 },
      );
    }

    const serviceClient = getServiceClient();
    let resultado;

    switch (accion) {
      case "eliminar":
        // Eliminar múltiples noticias
        const { error: errorEliminar } = await serviceClient
          .from("noticias")
          .delete()
          .in("id", ids);

        if (errorEliminar) {
          throw new Error(
            `Error al eliminar noticias: ${errorEliminar.message}`,
          );
        }

        resultado = {
          mensaje: `${ids.length} noticias eliminadas correctamente`,
        };
        break;

      case "eliminar_borradores":
        // Eliminar todos los borradores
        const { error: errorEliminarBorradores } = await serviceClient
          .from("noticias")
          .delete()
          .eq("estado", "borrador");

        if (errorEliminarBorradores) {
          throw new Error(
            `Error al eliminar borradores: ${errorEliminarBorradores.message}`,
          );
        }

        resultado = {
          mensaje: "Todos los borradores han sido eliminados correctamente",
        };
        break;

      case "activar":
        // Activar múltiples noticias
        const { error: errorActivar } = await serviceClient
          .from("noticias")
          .update({ es_activa: true })
          .in("id", ids);

        if (errorActivar) {
          throw new Error(`Error al activar noticias: ${errorActivar.message}`);
        }

        resultado = {
          mensaje: `${ids.length} noticias activadas correctamente`,
        };
        break;

      case "desactivar":
        // Desactivar múltiples noticias
        const { error: errorDesactivar } = await serviceClient
          .from("noticias")
          .update({ es_activa: false })
          .in("id", ids);

        if (errorDesactivar) {
          throw new Error(
            `Error al desactivar noticias: ${errorDesactivar.message}`,
          );
        }

        resultado = {
          mensaje: `${ids.length} noticias desactivadas correctamente`,
        };
        break;

      case "destacar":
        // Destacar múltiples noticias
        const { error: errorDestacar } = await serviceClient
          .from("noticias")
          .update({ destacada: true })
          .in("id", ids);

        if (errorDestacar) {
          throw new Error(
            `Error al destacar noticias: ${errorDestacar.message}`,
          );
        }

        resultado = {
          mensaje: `${ids.length} noticias destacadas correctamente`,
        };
        break;

      case "quitar_destacada":
        // Quitar destacado de múltiples noticias
        const { error: errorQuitarDestacada } = await serviceClient
          .from("noticias")
          .update({ destacada: false })
          .in("id", ids);

        if (errorQuitarDestacada) {
          throw new Error(
            `Error al quitar destacado: ${errorQuitarDestacada.message}`,
          );
        }

        resultado = {
          mensaje: `${ids.length} noticias ya no están destacadas`,
        };
        break;

      default:
        return NextResponse.json(
          { error: `Acción no válida: ${accion}` },
          { status: 400 },
        );
    }

    // Revalidar rutas
    revalidatePath("/noticias");
    revalidatePath("/admin/noticias/listado");
    revalidatePath("/admin/noticias");

    return NextResponse.json({
      success: true,
      ...resultado,
    });
  } catch (error: any) {
    console.error("Error al procesar acciones masivas:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 },
    );
  }
}
