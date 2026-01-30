import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Detectar si estamos en el navegador o en el servidor
const isBrowser = typeof window !== "undefined";

// Obtener las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton instance - IMPORTAR DESDE @/lib/supabase/client para cliente del navegador
// Este archivo solo existe por compatibilidad con código legacy
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseInstance: any = null;

// Función para crear un cliente de Supabase
// DEPRECATED: Usar createClient de @/lib/supabase/client en su lugar
const createClient = () => {
  if (isBrowser && (window as any)._supabaseClient) {
    return (window as any)._supabaseClient;
  }

  const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
    },
    global: {
      headers: {
        "x-application-name": "korestats-legacy",
      },
    },
  });

  if (isBrowser) {
    (window as any)._supabaseClient = client;
  }

  return client;
};

export default createClient;
