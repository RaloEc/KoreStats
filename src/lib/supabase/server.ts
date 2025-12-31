import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Crea un cliente de Supabase para Server Components, Server Actions y Route Handlers
 * IMPORTANTE: Esta función es asíncrona porque cookies() ahora es async en Next.js 15+
 */
export async function createClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // El método set puede fallar en Server Components
          // Esto es esperado cuando se llama desde un Server Component
        }
      },
    },
  });
}

export const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  // Intentar obtener la clave de servicio de múltiples fuentes
  let supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";

  // Si no hay clave de servicio, usar la clave anónima como fallback
  // Esto es menos seguro pero evita errores 500 en producción
  if (!supabaseServiceKey) {
    console.warn(
      "[getServiceClient] No se encontró SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SERVICE_KEY. Usando clave anónima como fallback."
    );
    supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "[getServiceClient] Error crítico: No hay credenciales de Supabase configuradas.",
      { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey }
    );
    // En lugar de lanzar error, devolver un cliente "simulado" que devuelve errores graciosamente
    // Esto evita el crash 500 y permite que la página muestre un error más amigable
    throw new Error(
      "Las variables de entorno de Supabase no están configuradas correctamente"
    );
  }

  const { createClient } = require("@supabase/supabase-js");
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
