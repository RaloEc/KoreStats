import * as z from "zod";

// Esquema de validación para juegos
export const juegoSchema = z.object({
  id: z.string().optional(),
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder los 100 caracteres"),
  slug: z.string().optional(),
  descripcion: z.string().optional(),
  desarrollador: z.string().optional(),
  fecha_lanzamiento: z.date().optional().nullable(),
  icono_url: z.string().optional(),
});

export type JuegoFormValues = z.infer<typeof juegoSchema>;

// Esquema de validación para eventos con validaciones condicionales
export const eventoSchema = z
  .object({
    titulo: z
      .string()
      .min(3, "El título debe tener al menos 3 caracteres")
      .max(100, "El título no puede exceder los 100 caracteres"),
    descripcion: z
      .string()
      .min(10, "La descripción debe tener al menos 10 caracteres"),
    fecha: z.date({
      required_error: "La fecha es obligatoria",
    }),
    tipo: z.enum(["actualizacion", "parche", "evento", "torneo"], {
      required_error: "Debes seleccionar un tipo de evento",
    }),
    tipo_icono: z.enum(["juego_existente", "personalizado"], {
      required_error: "Debes seleccionar el tipo de icono",
    }),
    juego_id: z.string().optional(),
    juego_nombre: z.string().optional(),
    imagen_url: z.string().optional(),
    icono_url: z.string().optional(),
    url: z.string().url("La URL debe ser válida").optional().or(z.literal("")),
    estado: z.enum(["borrador", "publicado", "cancelado"], {
      required_error: "Debes seleccionar un estado",
    }),
  })
  .superRefine((data, ctx) => {
    // Validar que si tipo_icono es 'juego_existente', juego_id sea obligatorio
    if (data.tipo_icono === "juego_existente" && !data.juego_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["juego_id"],
        message: "Debes seleccionar un juego",
      });
    }

    // Validar que si tipo_icono es 'personalizado', icono_url sea obligatorio
    if (data.tipo_icono === "personalizado" && !data.icono_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["icono_url"],
        message: "Debes subir un icono personalizado",
      });
    }
  });

export type EventoFormValues = z.infer<typeof eventoSchema>;

// Utilidad para generar slugs
export function generateSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
