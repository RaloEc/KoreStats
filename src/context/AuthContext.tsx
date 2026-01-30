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
  settings?: Record<string, any>;
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
  supabase: null as any, // Se asignará en el Provider
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

  // Limpieza de migración de auth: Asegurar que no quede basura del storageKey antiguo
  React.useEffect(() => {
    try {
      if (
        typeof window !== "undefined" &&
        localStorage.getItem("korestats-auth")
      ) {
        logger.info(
          "AuthProvider",
          "Eliminando storageKey legacy korestats-auth",
        );
        localStorage.removeItem("korestats-auth");
      }
    } catch (e) {
      // Ignorar error si no hay acceso a localStorage
    }
  }, []);
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
        queryClient.setQueryData(authKeys.session, null);
        queryClient.removeQueries({
          queryKey: ["auth", "profile"],
          exact: false,
        });

        // Limpiar preferencias guardadas
        try {
          localStorage.removeItem("korestats-color");
        } catch (e) {
          console.error("Error clearing localStorage", e);
        }

        // Invalidar caché de Next.js solo en logout
        router.refresh();
      } else if (event === "INITIAL_SESSION") {
        // Restauración de sesión inicial: sincronizar sin refetch
        queryClient.setQueryData(authKeys.session, newSession);

        if (newSession?.user?.id) {
          queryClient.invalidateQueries({
            queryKey: authKeys.profile(newSession.user.id),
          });
        }
        // NO llamar router.refresh() para INITIAL_SESSION - evita reload innecesario
      } else if (event === "TOKEN_REFRESHED") {
        // Token refrescado: solo actualizar la sesión en React Query
        // NO invalidar perfil ni hacer router.refresh() - el token nuevo es suficiente
        queryClient.setQueryData(authKeys.session, newSession);
      } else if (event === "SIGNED_IN") {
        // Login nuevo: sincronizar sesión y perfil
        queryClient.setQueryData(authKeys.session, newSession);

        if (newSession?.user?.id) {
          queryClient.invalidateQueries({
            queryKey: authKeys.profile(newSession.user.id),
          });
        }

        // Pequeño delay para asegurar que React Query haya actualizado el estado
        await new Promise((resolve) => setTimeout(resolve, 100));
        router.refresh();
      } else {
        // Para otros eventos (USER_UPDATED, PASSWORD_RECOVERY, etc.)
        queryClient.setQueryData(authKeys.session, newSession);

        if (newSession?.user?.id) {
          queryClient.invalidateQueries({
            queryKey: authKeys.profile(newSession.user.id),
          });
        }
        // NO llamar router.refresh() para eventos menores
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, queryClient, router]);

  // Sincronizar color del perfil con localStorage (separado del listener de auth)
  React.useEffect(() => {
    if (profile?.color) {
      try {
        localStorage.setItem("korestats-color", profile.color);
        document.documentElement.style.setProperty("--primary", profile.color);
      } catch (e) {
        console.error("Error saving color preference", e);
      }
    }
  }, [profile?.color]);

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
          "Sesión cerrada exitosamente en Supabase",
        );
      })
      .catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(
          "AuthProvider",
          "Error al cerrar sesión en Supabase",
          errorMessage,
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
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return React.useContext(AuthContext);
}
