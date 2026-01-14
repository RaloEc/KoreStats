"use client";

/**
 * Módulo optimizado para carga de imágenes en html-to-image
 *
 * Características:
 * - Cache con TTL y limpieza automática
 * - Limitación de concurrencia para evitar sobrecarga
 * - Validación de URLs y respuestas
 * - Soporte para retries con backoff
 */

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const ERROR_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Cache con TTL
interface CacheEntry {
  data: string;
  timestamp: number;
}

const CACHE_TTL = 10 * 60 * 1000; // 10 minutos
const imageCache = new Map<string, CacheEntry>();
const pendingLoads = new Map<string, Promise<string>>();

// Limitar concurrencia para evitar sobrecarga
const MAX_CONCURRENT_LOADS = 6;
let activeLoads = 0;
const loadQueue: Array<() => void> = [];

function processQueue() {
  while (activeLoads < MAX_CONCURRENT_LOADS && loadQueue.length > 0) {
    const next = loadQueue.shift();
    if (next) {
      activeLoads++;
      next();
    }
  }
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (e) {
        reject(e);
      } finally {
        activeLoads--;
        processQueue();
      }
    };
    loadQueue.push(run);
    processQueue();
  });
}

// Limpieza periódica de caché expirado
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanupInterval() {
  if (cleanupInterval || typeof window === "undefined") return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    imageCache.forEach((entry, key) => {
      if (now - entry.timestamp > CACHE_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => imageCache.delete(key));

    // Limitar tamaño del caché a 200 entradas máximo
    if (imageCache.size > 200) {
      const entries = Array.from(imageCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );

      const toRemove = entries.slice(0, entries.length - 150);
      toRemove.forEach(([key]) => imageCache.delete(key));
    }
  }, 60000); // Cada minuto
}

if (typeof window !== "undefined") {
  startCleanupInterval();
}

/**
 * Obtiene la URL normalizada para una imagen.
 * Extrae la URL original si viene envuelta en el proxy.
 */
function normalizeImageUrl(src: string): string {
  if (!src) return "";

  // Si ya es data URL, devolverla
  if (src.startsWith("data:")) return src;

  // Extraer URL original del proxy si es necesario
  if (src.includes("/api/proxy-image?url=")) {
    try {
      const urlObj = new URL(
        src,
        typeof window !== "undefined"
          ? window.location.origin
          : "https://korestats.com"
      );
      const originalUrl = urlObj.searchParams.get("url");
      if (originalUrl) {
        return decodeURIComponent(originalUrl);
      }
    } catch (e) {
      console.warn("[ImageLoader] Error extracting proxy URL:", e);
    }
  }

  return src;
}

/**
 * Construye la URL del proxy para una imagen externa
 */
function getProxyUrl(originalUrl: string): string {
  if (
    originalUrl.includes("ddragon.leagueoflegends.com") ||
    originalUrl.includes("communitydragon.org") ||
    originalUrl.includes("raw.communitydragon.org")
  ) {
    return `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  }
  return originalUrl;
}

/**
 * Carga una imagen y la convierte a base64 para uso con html-to-image
 *
 * @param originalUrl - URL original de la imagen (sin proxy)
 * @returns Promise con el data URL base64 de la imagen
 */
export async function loadImageAsBase64(originalUrl: string): Promise<string> {
  // Normalizar la URL
  const normalizedUrl = normalizeImageUrl(originalUrl);

  if (
    !normalizedUrl ||
    normalizedUrl === "null" ||
    normalizedUrl === "undefined"
  ) {
    return TRANSPARENT_PIXEL;
  }

  // Si ya es data URL, devolverla directamente
  if (normalizedUrl.startsWith("data:")) {
    return normalizedUrl;
  }

  // Verificar caché válido
  const cached = imageCache.get(normalizedUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Si ya se está cargando esta URL, esperar
  const pending = pendingLoads.get(normalizedUrl);
  if (pending) {
    return pending;
  }

  // Crear promesa de carga con control de concurrencia
  const loadPromise = enqueue(async (): Promise<string> => {
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      let resolved = false;
      const safeResolve = (result: string) => {
        if (resolved) return;
        resolved = true;
        pendingLoads.delete(normalizedUrl);

        // Solo cachear resultados exitosos
        if (result !== ERROR_PIXEL && result !== TRANSPARENT_PIXEL) {
          imageCache.set(normalizedUrl, {
            data: result,
            timestamp: Date.now(),
          });
        }
        resolve(result);
      };

      // Timeout de 8 segundos
      const timeoutId = setTimeout(() => {
        console.warn(
          `[ImageLoader] Timeout: ${normalizedUrl.substring(0, 60)}...`
        );
        safeResolve(ERROR_PIXEL);
      }, 8000);

      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          if (img.width === 0 || img.height === 0) {
            console.warn(`[ImageLoader] Zero dimensions for: ${normalizedUrl}`);
            safeResolve(ERROR_PIXEL);
            return;
          }

          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            safeResolve(ERROR_PIXEL);
            return;
          }

          ctx.drawImage(img, 0, 0);

          try {
            const dataUrl = canvas.toDataURL("image/png");
            if (dataUrl && dataUrl.length > 100) {
              safeResolve(dataUrl);
            } else {
              safeResolve(ERROR_PIXEL);
            }
          } catch (e) {
            // Canvas tainted
            console.error(`[ImageLoader] Canvas tainted:`, e);
            safeResolve(ERROR_PIXEL);
          }
        } catch (err) {
          console.error(`[ImageLoader] Canvas error:`, err);
          safeResolve(ERROR_PIXEL);
        }
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        console.warn(
          `[ImageLoader] Load failed: ${normalizedUrl.substring(0, 60)}...`
        );
        safeResolve(ERROR_PIXEL);
      };

      // Usar proxy para URLs externas
      img.src = getProxyUrl(normalizedUrl);
    });
  });

  pendingLoads.set(normalizedUrl, loadPromise);
  return loadPromise;
}

/**
 * Pre-carga un lote de imágenes de forma optimizada
 * Útil para cargar todas las imágenes antes de renderizar
 *
 * @param urls - Array de URLs a precargar
 * @returns Promise que resuelve cuando todas las imágenes están cargadas
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));

  // Cargar en lotes para no saturar
  const batchSize = 10;
  for (let i = 0; i < uniqueUrls.length; i += batchSize) {
    const batch = uniqueUrls.slice(i, i + batchSize);
    await Promise.all(batch.map((url) => loadImageAsBase64(url)));
  }
}

/**
 * Limpia el caché de imágenes
 * Útil cuando se detectan problemas de imágenes incorrectas
 */
export function clearImageCache(): void {
  imageCache.clear();
  pendingLoads.clear();
}

/**
 * Obtiene estadísticas del caché para debugging
 */
export function getCacheStats(): { size: number; pending: number } {
  return {
    size: imageCache.size,
    pending: pendingLoads.size,
  };
}

// Exportar constantes útiles
export { TRANSPARENT_PIXEL, ERROR_PIXEL };
