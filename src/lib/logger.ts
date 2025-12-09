/**
 * Logger condicional basado en NODE_ENV
 * En producción, solo registra errores críticos
 * En desarrollo, registra todo
 */

const isDev = process.env.NODE_ENV === "development";

export const logger = {
  /**
   * Log de información (solo en desarrollo)
   */
  info: (prefix: string, message: string, data?: any) => {
    // Disabled for cleaner console
    // if (isDev) {
    //   console.log(`[${prefix}] ${message}`, data ?? "");
    // }
  },

  /**
   * Log de advertencia (siempre)
   */
  warn: (prefix: string, message: string, data?: any) => {
    console.warn(`[${prefix}] ⚠️ ${message}`, data ?? "");
  },

  /**
   * Log de error (siempre)
   */
  error: (prefix: string, message: string, error?: any) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${prefix}] ❌ ${message}`, errorMessage);
  },

  /**
   * Log de éxito (solo en desarrollo)
   */
  success: (prefix: string, message: string, data?: any) => {
    // Disabled for cleaner console
    // if (isDev) {
    //   console.log(`[${prefix}] ✅ ${message}`, data ?? "");
    // }
  },

  /**
   * Log de depuración (solo en desarrollo)
   */
  debug: (prefix: string, message: string, data?: any) => {
    // Disabled for cleaner console
    // if (isDev) {
    //   console.debug(`[${prefix}] 🔍 ${message}`, data ?? "");
    // }
  },
};
