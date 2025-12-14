import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Detectar si estamos en el navegador o en el servidor
const isBrowser = typeof window !== "undefined";

// Obtener las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseInstance: any = null;

// Función para crear un cliente de Supabase
const createClient = () => {
  if (isBrowser && supabaseInstance) {
    return supabaseInstance;
  }

  const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
      storageKey: "korestats-auth",
    },
    global: {
      headers: {
        "x-application-name": "korestats",
      },
    },
  });

  if (isBrowser) {
    supabaseInstance = client;
  }

  return client;
};

export default createClient;
