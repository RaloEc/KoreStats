/**
 * Registro Central de Módulos de Juego
 *
 * Este archivo es la "tabla de verdad" del frontend.
 * Para agregar un nuevo juego, solo necesitas:
 * 1. Crear un módulo en /modules/[slug]/
 * 2. Registrarlo aquí
 *
 * Usa imports estáticos por ahora ya que los módulos son livianos
 * (solo wrappers). Los componentes pesados internos (MatchHistoryList, etc.)
 * ya usan dynamic imports dentro de sus propios archivos.
 */

import type { GameProfileModule } from "@/modules/types";
import { LoLProfileModule } from "@/modules/league-of-legends";
import { DeltaForceProfileModule } from "@/modules/delta-force";

// ============================================================================
// REGISTRO
// ============================================================================

const moduleRegistry: Record<string, GameProfileModule> = {
  "league-of-legends": LoLProfileModule,
  "delta-force": DeltaForceProfileModule,
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Obtiene el módulo de perfil para un slug de juego.
 * Retorna undefined si el juego no tiene módulo registrado.
 */
export function getProfileModule(
  gameSlug: string
): GameProfileModule | undefined {
  return moduleRegistry[gameSlug];
}

/**
 * Obtiene todos los módulos de perfil registrados.
 */
export function getAllProfileModules(): GameProfileModule[] {
  return Object.values(moduleRegistry);
}

/**
 * Obtiene los módulos de perfil que deben mostrarse para un usuario.
 * Filtra según las cuentas vinculadas del usuario y si es perfil propio.
 */
export function getVisibleProfileModules(params: {
  connectedAccounts?: Record<string, string>;
  isOwnProfile: boolean;
  /** Slugs de juegos que tienen cuenta vinculada específica (ej: riot) */
  linkedGameSlugs?: string[];
}): GameProfileModule[] {
  const { connectedAccounts = {}, isOwnProfile, linkedGameSlugs = [] } = params;

  return getAllProfileModules().filter((mod) => {
    const hasLinkedAccount =
      linkedGameSlugs.includes(mod.slug) ||
      Object.keys(connectedAccounts).some(
        (key) =>
          key.replace(/_/g, "-") === mod.slug ||
          key === mod.slug
      );

    return mod.shouldShowTab({ hasLinkedAccount, isOwnProfile });
  });
}

export default moduleRegistry;
