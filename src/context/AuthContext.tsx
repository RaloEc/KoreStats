"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import { useAuthData, authKeys } from "@/hooks/useAuthQuery";
import type { Session, User } from "@supabase/supabase-js";

export interface Profile {
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
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  supabase: ReturnType<typeof createClient>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const defaultAuthState: AuthState = {
  user: null,
  session: null,
  loading: true,
  profile: null,
  supabase: createClient(),
  signOut: async () => {},
  refreshAuth: async () => {},
  refreshProfile: async () => {},
};

export const AuthContext = React.createContext<AuthState>(defaultAuthState);

export function AuthProvider({
  children,
  session: initialSession,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  // Usar React Query para gestionar el estado de autenticación
  // Pasar la sesión inicial del servidor para evitar flash de "sin sesión"
  const {
    session,
    user,
    profile,
    isLoading,
    invalidateAuth,
    refreshProfile: refreshProfileQuery,
  } = useAuthData(initialSession);

  // Suscribirse a cambios de autenticación de Supabase
  React.useEffect(() => {
    logger.info(
      "AuthProvider",
      "Configurando listener de auth state change..."
    );

    // Sincronizar color del perfil con localStorage
    if (profile?.color) {
      try {
        localStorage.setItem("korestats-color", profile.color);
        // Actualizar variable CSS inmediatamente
        document.documentElement.style.setProperty("--primary", profile.color);
      } catch (e) {
        console.error("Error saving color preference", e);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      logger.info("AuthProvider", `Auth state change: ${event}`, {
        hasSession: !!newSession,
        userId: newSession?.user?.id,
      });

      // ✅ OPTIMIZADO: Sincronizar React Query SIN refetch innecesario
      // Solo actualizar el caché con los datos nuevos
      if (event === "SIGNED_OUT") {
        // En logout, limpiar todo inmediatamente
        logger.info(
          "AuthProvider",
          "SIGNED_OUT: Limpiando caché de autenticación"
        );
        queryClient.setQueryData(authKeys.session, null);
        queryClient.removeQueries({
          queryKey: ["auth", "profile"],
          exact: false,
        });

        // Limpiar preferencias guardadas
        try {
          localStorage.removeItem("korestats-color");
          // No removemos el tema, eso es preferencia global del navegador/dispositivo
        } catch (e) {
          console.error("Error clearing localStorage", e);
        }

        // CRÍTICO: Invalidar caché de Next.js
        router.refresh();
        logger.success(
          "AuthProvider",
          "Estado de auth limpiado y router refreshed"
        );
      } else if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        // Restauración de sesión o refresh de token: sincronizar sin refetch
        logger.info("AuthProvider", `${event}: Sincronizando sesión y perfil`);

        // ✅ Actualizar React Query directamente (sin refetch)
        queryClient.setQueryData(authKeys.session, newSession);

        // Si hay sesión, invalidar perfil para que se recargue
        if (newSession?.user?.id) {
          logger.info(
            "AuthProvider",
            `Invalidando perfil para usuario: ${newSession.user.id}`
          );
          queryClient.invalidateQueries({
            queryKey: authKeys.profile(newSession.user.id),
          });
        }

        // CRÍTICO: Invalidar caché de Next.js
        router.refresh();
        logger.success(
          "AuthProvider",
          "Sesión sincronizada, perfil invalidado, router refreshed"
        );
      } else if (event === "SIGNED_IN") {
        // Login nuevo: sincronizar sesión y perfil
        logger.info("AuthProvider", "SIGNED_IN: Actualizando sesión y perfil");

        // ✅ Actualizar React Query directamente
        queryClient.setQueryData(authKeys.session, newSession);

        if (newSession?.user?.id) {
          // Invalidar perfil para que se recargue con datos nuevos
          queryClient.invalidateQueries({
            queryKey: authKeys.profile(newSession.user.id),
          });
        }

        logger.success("AuthProvider", "Login completado, datos sincronizados");

        // CRÍTICO: Invalidar caché de Next.js DESPUÉS de que los datos estén listos
        // Pequeño delay para asegurar que React Query haya actualizado el estado
        await new Promise((resolve) => setTimeout(resolve, 50));
        router.refresh();
        logger.info("AuthProvider", "Router refreshed");
      } else {
        // Para otros eventos (USER_UPDATED, PASSWORD_RECOVERY, etc.)
        logger.info(
          "AuthProvider",
          `${event}: Sincronizando cambios de autenticación`
        );
        // ✅ Actualizar sesión si cambió
        queryClient.setQueryData(authKeys.session, newSession);

        if (newSession?.user?.id) {
          // Invalidar perfil para que se recargue
          queryClient.invalidateQueries({
            queryKey: authKeys.profile(newSession.user.id),
          });
        }

        // Invalidar caché de Next.js para otros eventos también
        router.refresh();
      }
    });

    return () => {
      logger.info("AuthProvider", "Limpiando listener de auth state change");
      subscription.unsubscribe();
    };
  }, [supabase, queryClient, router, profile]);

  // Funciones de utilidad
  const signOut = React.useCallback(async () => {
    logger.info("AuthProvider", "Cerrando sesión...");

    // 1. Limpiar TODA la caché de React Query inmediatamente
    queryClient.clear();
    logger.info("AuthProvider", "Caché de React Query limpiada completamente");

    // 2. Redirigir inmediatamente a la página principal (UX optimista)
    router.push("/");
    logger.info("AuthProvider", "Redirigiendo a la página principal...");

    // 3. Ejecutar signOut de Supabase en segundo plano (no bloqueante)
    supabase.auth
      .signOut()
      .then(() => {
        logger.success(
          "AuthProvider",
          "Sesión cerrada exitosamente en Supabase"
        );
      })
      .catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(
          "AuthProvider",
          "Error al cerrar sesión en Supabase",
          errorMessage
        );
        // Aunque falle, el usuario ya fue redirigido y la caché limpiada
      });
  }, [router, supabase, queryClient]);

  const refreshAuth = React.useCallback(async () => {
    logger.info("AuthProvider", "Refrescando autenticación...");
    await invalidateAuth();
  }, [invalidateAuth]);

  const refreshProfile = React.useCallback(async () => {
    logger.info("AuthProvider", "Refrescando perfil...");
    await refreshProfileQuery();
  }, [refreshProfileQuery]);

  const value = React.useMemo<AuthState>(
    () => ({
      user,
      session,
      loading: isLoading,
      profile,
      supabase,
      signOut,
      refreshAuth,
      refreshProfile,
    }),
    [
      user,
      session,
      isLoading,
      profile,
      supabase,
      signOut,
      refreshAuth,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return React.useContext(AuthContext);
}
