"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { CACHE_CONFIG, RETRY_CONFIG } from "@/lib/auth/cache-config";
import type { Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string | null;
  role: "user" | "admin" | string;
  created_at?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  color?: string | null;
  followers_count?: number;
  following_count?: number;
  friends_count?: number;
  connected_accounts?: Record<string, string> | string;
  settings?: Record<string, any>;
}

// Keys para las queries
export const authKeys = {
  session: ["auth", "session"] as const,
  profile: (userId: string) => ["auth", "profile", userId] as const,
};

/**
 * Hook para obtener la sesión actual usando React Query
 * ✅ OPTIMIZADO: Evita doble carga SSR + Client
 * La sesión se establece inicialmente en AuthProvider con setQueryData
 */
export function useSessionQuery() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useQuery<Session | null>({
    queryKey: authKeys.session,
    queryFn: async () => {
      try {
        // Primero verificar si hay sesión en caché válida para evitar llamadas innecesarias
        const cachedSession = queryClient.getQueryData<Session | null>(
          authKeys.session,
        );

        if (cachedSession?.expires_at) {
          const expiresAt = new Date(cachedSession.expires_at * 1000);
          const now = new Date();
          // Si la sesión en caché aún es válida (con margen de 60 segundos), usarla
          if (expiresAt.getTime() - now.getTime() > 60000) {
            return cachedSession;
          }
        }

        // Llamada directa sin timeout - dejar que Supabase maneje el timeout
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          logger.error("useSessionQuery", "Error al obtener sesión", error);
          // Si hay error pero tenemos caché, usarla
          if (cachedSession) {
            return cachedSession;
          }
          throw error;
        }

        // Validar si el token está expirado
        if (!data.session?.access_token) {
          // Silenciar warning, es normal si no hay sesión
          return null;
        }

        if (data.session?.expires_at) {
          const expiresAt = new Date(data.session.expires_at * 1000);
          const now = new Date();

          if (expiresAt < now) {
            logger.warn(
              "useSessionQuery",
              "Token expirado, intentando refrescar",
            );

            // Intentar refrescar el token
            const { data: refreshed, error: refreshError } =
              await supabase.auth.refreshSession();

            if (refreshError || !refreshed.session) {
              logger.error(
                "useSessionQuery",
                "No se pudo refrescar el token",
                refreshError,
              );
              return null;
            }

            return refreshed.session;
          }
        }

        return data.session ?? null;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(
          "useSessionQuery",
          "Error al obtener sesión",
          errorMessage,
        );

        // CRÍTICO: Si falla, usar la sesión en caché
        const cachedSession = queryClient.getQueryData<Session | null>(
          authKeys.session,
        );
        if (cachedSession) {
          logger.info(
            "useSessionQuery",
            "Usando sesión en caché debido a error",
          );
          return cachedSession;
        }

        // Si no hay caché, retornar null en lugar de throw
        logger.warn(
          "useSessionQuery",
          "No hay sesión en caché, retornando null",
        );
        return null;
      }
    },
    // ✅ OPTIMIZADO: Configuración para evitar doble carga
    staleTime: CACHE_CONFIG.SESSION.staleTime,
    gcTime: CACHE_CONFIG.SESSION.gcTime,
    refetchOnMount: false, // No refetch al montar si hay datos frescos
    refetchOnReconnect: false, // No refetch al reconectar
    refetchOnWindowFocus: false, // CRÍTICO: No refetch al cambiar pestañas
    retry: false, // No reintentar automáticamente
    networkMode: "online", // Solo ejecutar si hay conexión
  });
}

/**
 * Hook para obtener el perfil del usuario usando React Query
 * CON MANEJO ROBUSTO DE ERRORES Y FALLBACK A CACHÉ
 */
export function useProfileQuery(userId: string | null | undefined) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: userId ? authKeys.profile(userId) : ["auth", "profile", "null"],
    queryFn: async () => {
      if (!userId) {
        logger.info("useProfileQuery", "No hay userId, retornando null");
        return null;
      }

      logger.info("useProfileQuery", "Obteniendo perfil para userId:", userId);

      try {
        // Intentar hasta MAX_RETRIES veces con backoff exponencial
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < RETRY_CONFIG.MAX_RETRIES; attempt++) {
          try {
            const { data, error } = await supabase
              .from("perfiles")
              .select("*")
              .eq("id", userId)
              .single();

            if (error) {
              lastError =
                error instanceof Error ? error : new Error(String(error));
              const delay = RETRY_CONFIG.getDelay(attempt);
              logger.warn(
                "useProfileQuery",
                `Intento ${attempt + 1}/${RETRY_CONFIG.MAX_RETRIES} falló: ${
                  lastError.message
                }. Reintentando en ${delay}ms`,
              );

              // Si no es el último intento, esperar antes de reintentar
              if (attempt < RETRY_CONFIG.MAX_RETRIES - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
              }
              throw lastError;
            }

            if (data) {
              const profile: Profile = {
                id: data.id,
                username: data.username ?? null,
                role: data.role ?? "user",
                created_at: data.created_at ?? null,
                avatar_url: data.avatar_url ?? null,
                banner_url: (data as any).banner_url ?? null,
                color: data.color ?? null,
                followers_count: (data as any).followers_count ?? 0,
                following_count: (data as any).following_count ?? 0,
                friends_count: (data as any).friends_count ?? 0,
                connected_accounts: (data as any).connected_accounts ?? {},
                settings: (data as any).settings ?? {},
              };

              logger.success(
                "useProfileQuery",
                "Perfil obtenido exitosamente",
                {
                  username: profile.username,
                  role: profile.role,
                },
              );

              return profile;
            }
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt === RETRY_CONFIG.MAX_RETRIES - 1) {
              throw lastError;
            }
          }
        }

        throw lastError || new Error("No se pudo obtener el perfil");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(
          "useProfileQuery",
          "Error definitivo al obtener perfil",
          errorMessage,
        );

        // CRÍTICO: Si falla, usar el perfil en caché
        const cachedProfile = queryClient.getQueryData<Profile | null>(
          authKeys.profile(userId),
        );
        if (cachedProfile) {
          logger.info(
            "useProfileQuery",
            "Usando perfil en caché debido a error",
          );
          return cachedProfile;
        }

        // Si no hay caché, retornar null en lugar de throw
        logger.warn(
          "useProfileQuery",
          "No hay perfil en caché, retornando null",
        );
        return null;
      }
    },
    enabled: !!userId, // Solo ejecutar si hay userId
    staleTime: CACHE_CONFIG.PROFILE.staleTime,
    gcTime: CACHE_CONFIG.PROFILE.gcTime,
    refetchOnMount: false, // No refetch al montar si hay datos frescos
    refetchOnWindowFocus: false, // CRÍTICO: No refetch al cambiar pestañas
    retry: false, // Ya manejamos reintentos manualmente
    networkMode: "online", // Solo ejecutar si hay conexión
  });
}

/**
 * Hook combinado que proporciona sesión y perfil de forma sincronizada
 * Elimina race conditions al garantizar que el perfil solo se carga después de la sesión
 */
export function useAuthData(initialSession?: Session | null) {
  const queryClient = useQueryClient();

  // Establecer sesión inicial si existe (solo una vez)
  React.useEffect(() => {
    if (initialSession) {
      const currentData = queryClient.getQueryData<Session | null>(
        authKeys.session,
      );
      if (!currentData) {
        logger.info("useAuthData", "Estableciendo sesión inicial del servidor");
        queryClient.setQueryData(authKeys.session, initialSession);
      }
    }
  }, []); // Solo en el primer render

  // Primero obtener la sesión
  const sessionQuery = useSessionQuery();
  const session = sessionQuery.data ?? null;
  const user = session?.user ?? null;

  // Luego obtener el perfil basado en el userId de la sesión
  const profileQuery = useProfileQuery(user?.id);
  const profile = profileQuery.data ?? null;

  // Estado de carga combinado: está cargando si cualquiera está cargando
  const isLoading = sessionQuery.isLoading || (user && profileQuery.isLoading);

  // Estado de error combinado
  const error = sessionQuery.error || profileQuery.error;

  logger.debug("useAuthData", "Estado actual", {
    sessionLoading: sessionQuery.isLoading,
    profileLoading: profileQuery.isLoading,
    isLoading,
    hasSession: !!session,
    hasUser: !!user,
    hasProfile: !!profile,
    profileRole: profile?.role,
  });

  // Funciones de utilidad
  const invalidateAuth = async () => {
    await queryClient.invalidateQueries({ queryKey: authKeys.session });
    if (user?.id) {
      await queryClient.invalidateQueries({
        queryKey: authKeys.profile(user.id),
      });
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await queryClient.invalidateQueries({
        queryKey: authKeys.profile(user.id),
      });
    }
  };

  return {
    session,
    user,
    profile,
    isLoading,
    error,
    sessionQuery,
    profileQuery,
    invalidateAuth,
    refreshProfile,
  };
}
