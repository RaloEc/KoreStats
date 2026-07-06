export interface WeaponStats {
  damage?: number;
  range?: number;
  control?: number;
  handling?: number;
  stability?: number;
  accuracy?: number;
  armorPenetration?: number;
  fireRate?: number | string;
  capacity?: number | string;
  muzzleVelocity?: number;
  soundRange?: number;
  ui_damage?: number;
  nombreArma?: string | null;
  description?: string | null;
  /** Modo de disparo extraído por la IA de la captura (ej. "Auto", "Único/Ráfaga") */
  mode?: string | null;
  /** Etiquetas especiales detectadas por comparación contra stats base (ej. ["🔄 Conversión de Fuego"]) */
  special_badges?: string[];
}
