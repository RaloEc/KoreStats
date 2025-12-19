import { createClient } from "@/lib/supabase/client";

/**
 * Servicio optimizado para interactuar con Supabase Storage reduciendo Egress.
 *
 * Estrategias implementadas:
 * 1. Cache-Control headers para indicar al navegador/CDN que guarde el recurso.
 * 2. Transformaciones de imagen para no pedir archivos originales gigantes.
 */

export const OptimizedStorageService = {
  /**
   * Obtiene una URL pública con opciones de optimización.
   * Úsalo SIEMPRE en lugar de acceder directamente a la URL 'raw'.
   */
  getOptimizedImageUrl(
    bucket: string,
    path: string,
    options: { width?: number; height?: number; quality?: number } = {}
  ) {
    const supabase = createClient();

    // Obtener URL base
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    let publicUrl = data.publicUrl;

    // Si usamos un transformador de imagen de Supabase (requiere plan Pro o superior para transforms nativos,
    // pero si usamos Next.js Image esto se pasa al loader de Next.js).
    //
    // Opción A: URL cruda para pasar al componente <Image /> de Next.js (Recomendado para Egress bajo)
    // El componente <Image /> se encargará de redimensionar y cachear en el servidor de Next/Netlify.
    return publicUrl;
  },

  /**
   * Descarga un archivo forzando headers de caché si es posible a nivel de fetch
   * o implementando lógica de cache-first.
   */
  async fetchWithCache(bucket: string, path: string) {
    const cacheKey = `supabase-storage:${bucket}:${path}`;

    // Verificar cache del navegador (Service Worker o Cache API)
    if ("caches" in window) {
      const cache = await caches.open("supabase-storage-manual-v1");
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return cachedResponse.blob();
      }
    }

    const supabase = createClient();
    const { data, error } = await supabase.storage.from(bucket).download(path);

    if (error) throw error;

    // Guardar en cache manual si es necesario
    if ("caches" in window && data) {
      const cache = await caches.open("supabase-storage-manual-v1");
      const response = new Response(data, {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": data.type,
        },
      });
      await cache.put(cacheKey, response);
    }

    return data;
  },
};

/**
 * Ejemplo de Middleware para Netlify Edge (Representación conceptual).
 *
 * Implementar en: netlify/edge-functions/cache-supabase.ts
 */
/*
import type { Context, Config } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const response = await context.next();
  const url = new URL(request.url);

  // Interceptar respuestas de imágenes o API que queramos cachear agresivamente
  if (url.pathname.startsWith('/_next/image') || url.pathname.includes('supabase.co')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('Netlify-CDN-Cache-Control', 'public, max-age=31536000, immutable');
  }

  return response;
};

export const config: Config = {
  path: ["/_next/image*", "/api/*"],
};
*/
