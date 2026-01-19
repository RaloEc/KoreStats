import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Crea un cliente de Supabase para Client Components
 * SINGLETON: Retorna siempre la misma instancia para evitar múltiples
 * auto-refreshes que causan rate limiting.
 *
 * IMPORTANTE: Solo debe usarse en componentes con 'use client'
 */
export function createClient(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  client = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "pkce",
    },
  });

  return client;
}

/**
 * Obtener el cliente singleton (alias para compatibilidad)
 */
export function getClient(): SupabaseClient {
  return createClient();
}
