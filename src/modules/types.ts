/**
 * Sistema de Módulos Multi-Game
 *
 * Interfaces genéricas para soportar múltiples juegos en la plataforma.
 * Cada juego implementa su propio módulo conformando a estas interfaces.
 */

import type { ReactNode } from "react";

// ============================================================================
// INTERFACES DE DATOS
// ============================================================================

/**
 * Representa una cuenta de juego vinculada genérica.
 * Cada juego extiende esto con sus datos específicos.
 */
export interface GameAccount {
  gameSlug: string;
  accountId: string;
  displayName: string;
  metadata?: Record<string, unknown>;
}

/**
 * Información de un juego como viene de la tabla `juegos`
 */
export interface GameInfo {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string | null;
  imagen_portada_url?: string | null;
  icono_url?: string | null;
}

/**
 * Módulo habilitado para un juego (tabla `game_modules`)
 */
export interface GameModuleEntry {
  id: string;
  game_id: string;
  module_type: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

// ============================================================================
// INTERFACES DE MÓDULO
// ============================================================================

/**
 * Props genéricas que recibe cualquier pestaña de perfil de un juego.
 * Cada módulo puede castear `gameAccountData` a su tipo específico.
 */
export interface ProfileTabProps {
  userId: string;
  isOwnProfile: boolean;
  gameAccountData: unknown;
  onInvalidateCache: () => Promise<unknown>;
  onSync?: () => void;
  profileColor?: string;
  syncPending?: boolean;
  syncCooldown?: number;
  isPublicProfile?: boolean;
  /** Snapshot de partida activa (específico de LoL por ahora, ignorar en otros módulos) */
  activeMatchSnapshot?: unknown;
}

/**
 * Definición de un módulo de juego para el sistema de perfiles.
 * Cada juego registra un objeto que conforma a esta interfaz.
 */
export interface GameProfileModule {
  /** Slug del juego (debe coincidir con juegos.slug en BD) */
  slug: string;

  /** Nombre para mostrar en la pestaña */
  displayName: string;

  /** Ícono del juego (nombre de ícono Lucide o URL) */
  icon?: string;

  /**
   * Renderiza la pestaña de perfil del juego.
   * Recibe props genéricas, internamente sabe cómo renderizarse.
   */
  renderProfileTab: (props: ProfileTabProps) => ReactNode;

  /**
   * OPCIONAL: Renderiza el encabezado de cuenta del juego,
   * mostrado encima de las pestañas en el perfil.
   * Si no se implementa, no se muestra ningún encabezado de cuenta.
   */
  renderAccountHeader?: (props: ProfileTabProps) => ReactNode;

  /**
   * Determina si la pestaña debe mostrarse para un usuario dado.
   * Ej: solo mostrar si tiene cuenta vinculada o si es perfil propio.
   */
  shouldShowTab: (params: {
    hasLinkedAccount: boolean;
    isOwnProfile: boolean;
  }) => boolean;
}
