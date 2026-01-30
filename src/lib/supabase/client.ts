import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
const isBrowser = typeof window !== "undefined";

/**
 * Crea un cliente de Supabase para Client Components
 * SINGLETON: Retorna siempre la misma instancia para evitar múltiples
 * auto-refreshes que causan rate limiting.
 *
 * IMPORTANTE: Solo debe usarse en componentes con 'use client'
 */
export function createClient(): SupabaseClient {
  if (isBrowser && (window as any)._supabaseClient) {
    return (window as any)._supabaseClient;
  }

  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  client = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "pkce",
    },
  });

  if (isBrowser) {
    (window as any)._supabaseClient = client;
  }

  return client;
}

/**
 * Obtener el cliente singleton (alias para compatibilidad)
 */
export function getClient(): SupabaseClient {
  return createClient();
}
