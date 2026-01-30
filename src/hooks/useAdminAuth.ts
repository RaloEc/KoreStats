"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Profile } from "@/context/AuthContext";
import type { User } from "@supabase/supabase-js";

export interface AdminAuthState {
  isLoading: boolean;
  isAdmin: boolean;
  user: User | null;
  profile: Profile | null;
}

/**
 * Hook para verificar autenticación de administrador
 * Usa el AuthContext refactorizado con React Query
 * Elimina race conditions al usar un estado sincronizado
 *
 * ✅ OPTIMIZADO: Usa app_metadata como fallback si el perfil aún no carga
 */
export function useAdminAuth(): AdminAuthState {
  const { user, profile, loading } = useAuth();

  const state = useMemo<AdminAuthState>(() => {
    // Estado de carga unificado desde React Query
    const isLoading = loading;

    // ✅ Verificar si el usuario es admin con prioridad:
    // 1. Si hay perfil cargado, usar profile.role
    // 2. Si no hay perfil pero hay user, usar app_metadata.role (fallback rápido)
    // 3. Si no hay nada, no es admin
    let isAdmin = false;

    if (profile && profile.role === "admin") {
      isAdmin = true;
    } else if (user && !profile && user.user_metadata?.role === "admin") {
      // Fallback a app_metadata si el perfil aún no carga
      isAdmin = true;
    } else if (user && !profile && user.app_metadata?.role === "admin") {
      // Fallback alternativo a app_metadata
      isAdmin = true;
    }

    return {
      isLoading,
      isAdmin,
      user,
      profile,
    };
  }, [user, profile, loading]);

  return state;
}
