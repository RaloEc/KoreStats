/**
 * Configuración centralizada de caché para autenticación
 * Define staleTime y gcTime para diferentes tipos de datos
 */

export const CACHE_CONFIG = {
  /**
   * Configuración para sesión
   * - staleTime: 10 minutos (reducir llamadas a getSession para evitar rate limits)
   * - gcTime: 30 minutos (mantener en caché por si se reconecta)
   * NOTA: El cliente de Supabase auto-refresca el token internamente
   */
  SESSION: {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },

  /**
   * Configuración para perfil de usuario
   * - staleTime: 10 minutos (perfil cambia menos frecuentemente)
   * - gcTime: 30 minutos (mantener más tiempo en caché)
   */
  PROFILE: {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },

  /**
   * Configuración para datos generales
   * - staleTime: 10 minutos
   * - gcTime: 30 minutos
   */
  DEFAULT: {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },
} as const;

/**
 * Configuración de reintentos
 */
export const RETRY_CONFIG = {
  /**
   * Máximo número de reintentos
   */
  MAX_RETRIES: 3,

  /**
   * Delays entre reintentos (backoff exponencial)
   * [300ms, 600ms, 1200ms]
   */
  RETRY_DELAYS: [300, 600, 1200] as const,

  /**
   * Calcular delay para un intento específico
   */
  getDelay: (attempt: number): number => {
    return RETRY_CONFIG.RETRY_DELAYS[
      Math.min(attempt, RETRY_CONFIG.RETRY_DELAYS.length - 1)
    ];
  },
} as const;

/**
 * Configuración de timeouts
 */
export const TIMEOUT_CONFIG = {
  /**
   * Timeout para operaciones de autenticación (ms)
   */
  AUTH_TIMEOUT: 30000, // 30 segundos

  /**
   * Timeout para operaciones de base de datos (ms)
   */
  DB_TIMEOUT: 15000, // 15 segundos
} as const;
