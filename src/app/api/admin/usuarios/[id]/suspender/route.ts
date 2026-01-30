import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/utils/supabase-service";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const suspensionSchema = z.object({
  tipo: z.enum(["suspension_temporal", "suspension_permanente", "baneo"]),
  razon: z
    .string()
    .min(3, "La razón debe tener al menos 3 caracteres")
    .max(500, "La razón es demasiado larga"),
  fin: z.string().optional().nullable(),
  notasInternas: z
    .string()
    .max(1000, "Las notas internas son demasiado largas")
    .optional()
    .nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const serviceSupabase = getServiceClient();

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verificar que sea admin o moderador
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!perfil || !["admin", "moderator"].includes(perfil.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();

    // Validar con Zod
    const validationResult = suspensionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.format() },
        { status: 400 },
      );
    }

    const { tipo, razon, fin, notasInternas } = validationResult.data;
    const usuarioId = params.id;

    // Crear suspensión
    const { data: suspension, error: suspensionError } = await serviceSupabase
      .from("usuario_suspensiones")
      .insert({
        usuario_id: usuarioId,
        tipo,
        razon,
        fin: fin || null,
        moderador_id: user.id,
        notas_internas: notasInternas || null,
        activa: true,
      })
      .select()
      .single();

    if (suspensionError) {
      console.error("Error al crear suspensión:", suspensionError);
      return NextResponse.json(
        { error: "Error al crear suspensión" },
        { status: 500 },
      );
    }

    // Si es baneo o suspensión permanente, desactivar el usuario
    if (tipo === "baneo" || tipo === "suspension_permanente") {
      await serviceSupabase
        .from("perfiles")
        .update({ activo: false })
        .eq("id", usuarioId);
    }

    // Registrar en logs
    await serviceSupabase.rpc("registrar_accion_admin", {
      p_admin_id: user.id,
      p_usuario_afectado_id: usuarioId,
      p_accion: "suspender",
      p_detalles: { tipo, razon, fin, suspension_id: suspension.id },
    });

    return NextResponse.json({
      message: "Usuario suspendido correctamente",
      suspension,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
