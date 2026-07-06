/**
 * analyzeWeaponBadges.ts
 *
 * Compara las estadísticas extraídas por la IA (de una captura de pantalla)
 * contra las estadísticas base del arma guardadas en la base de datos.
 * Genera automáticamente etiquetas ("badges") especiales cuando detecta
 * anomalías que indican accesorios especiales o temporales.
 */

import type { WeaponStats } from "@/types/weapon";
import type { BaseWeapon } from "@/lib/delta-force/defaultData";

// Umbral porcentual para considerar que el daño fue "significativamente" alterado
const DAMAGE_THRESHOLD_PERCENT = 5; // +5% por encima del base es anomalía
// Factor multiplicador de cargador para considerar que fue ampliado
const CAPACITY_MULTIPLIER_THRESHOLD = 1.4; // 40% más que el base es anomalía

/**
 * Normaliza un string de modo de disparo para comparación robusta.
 * Convierte "Único/Ráfaga/Auto" y "auto/rafaga/unico" al mismo resultado ordenado.
 *
 * @example
 * normalizeFireMode("Único/Ráfaga/Auto") => ["auto", "rafaga", "unico"]
 * normalizeFireMode("auto/rafaga/unico") => ["auto", "rafaga", "unico"]
 */
export function normalizeFireMode(mode: string): string[] {
  return mode
    .toLowerCase()
    // Remover acentos (ú -> u, á -> a, etc.)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Separar por cualquier combinación de: "/" , "," , " " , "-"
    .split(/[\/,\-\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .sort(); // Ordenar alfabéticamente para que el orden no importe
}

/**
 * Compara dos strings de modo de disparo sin importar el orden de los modos.
 *
 * @example
 * fireModesMatch("Auto/Único", "Único/Auto")     => true
 * fireModesMatch("Auto", "Ráfaga")               => false
 * fireModesMatch("Auto/Único", "Único/Ráfaga")   => false
 */
export function fireModesMatch(modeA: string, modeB: string): boolean {
  const normalizedA = normalizeFireMode(modeA);
  const normalizedB = normalizeFireMode(modeB);

  if (normalizedA.length !== normalizedB.length) return false;
  return normalizedA.every((mode, i) => mode === normalizedB[i]);
}

export interface BadgeAnalysisResult {
  /** Lista de etiquetas/badges detectadas */
  special_badges: string[];
  /** Detalles de las anomalías para debug o UI avanzada */
  anomalies: {
    fireModeChanged?: { base: string; extracted: string };
    capacityAmplified?: { base: number; extracted: number | string; ratio: number };
    fireRateVariable?: { extracted: string };
    damageAlterated?: { base: number; extracted: number; diffPercent: number };

  };
}

/**
 * Analiza las estadísticas extraídas de una captura contra el arma base
 * y devuelve los badges de anomalía detectados automáticamente.
 *
 * @param extractedStats - Estadísticas extraídas por la IA de la captura de pantalla
 * @param baseWeapon - Datos del arma base desde la base de datos
 * @returns Objeto con badges y detalles de las anomalías detectadas
 */
export function analyzeWeaponBadges(
  extractedStats: WeaponStats,
  baseWeapon: BaseWeapon | null | undefined
): BadgeAnalysisResult {
  const badges: string[] = [];
  const anomalies: BadgeAnalysisResult["anomalies"] = {};

  if (!baseWeapon) {
    return { special_badges: badges, anomalies };
  }

  // ── 1. DETECCIÓN DE MODO DE FUEGO ALTERADO ──────────────────────────────────
  // La IA extrae el modo como "modo" o "mode" dependiendo de la versión del prompt
  const extractedMode =
    extractedStats.mode ??
    (extractedStats as Record<string, any>)["modo"] ??
    null;

  if (extractedMode && baseWeapon.base_fire_mode) {
    if (!fireModesMatch(extractedMode, baseWeapon.base_fire_mode)) {
      badges.push("🔄 Conversión de Fuego");
      anomalies.fireModeChanged = {
        base: baseWeapon.base_fire_mode,
        extracted: extractedMode,
      };
    }
  }

  // ── 2. DETECCIÓN DE CARGADOR AMPLIADO / ESPECIAL ────────────────────────────────
  // Función para extraer la capacidad total de un string
  const parseCapacity = (cap: any): number | null => {
    if (cap == null) return null;
    if (typeof cap === "number") return cap;
    if (typeof cap === "string") {
      const numbers = cap.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        return numbers.reduce((sum, val) => sum + parseInt(val, 10), 0);
      }
    }
    return null;
  };

  // Soporta tanto el key en inglés (capacity) como en español (capacidad)
  const extractedCapacityRaw =
    extractedStats.capacity ??
    (extractedStats as Record<string, any>)["capacidad"] ??
    null;

  const baseCapacity = baseWeapon.base_capacity;

  // Si la capacidad es un string y contiene un '+', es un cargador especial (ej. "20 + 20 rondas")
  if (
    typeof extractedCapacityRaw === "string" &&
    extractedCapacityRaw.includes("+")
  ) {
    // Formatear para que quede solo "20+20" eliminando letras y espacios
    const cleanSpecialCapacity = extractedCapacityRaw.replace(/[^\d+]/g, '');
    
    badges.push("🔋 Cargador Especial");
    anomalies.capacityAmplified = {
      base: baseCapacity,
      extracted: cleanSpecialCapacity,
      ratio: 1, // Ratio representativo
    };
    
    // Mutamos el objeto stats original para que la UI renderice exactamente "20+20"
    if ('capacity' in (extractedStats as object)) extractedStats.capacity = cleanSpecialCapacity;
    if ('capacidad' in (extractedStats as object)) (extractedStats as any).capacidad = cleanSpecialCapacity;
    
  } else {
    // Si no tiene '+', intentamos parsearlo para la lógica normal
    const extractedCapacity = parseCapacity(extractedCapacityRaw);
    if (
      extractedCapacity != null &&
      baseCapacity > 0 &&
      extractedCapacity > baseCapacity * CAPACITY_MULTIPLIER_THRESHOLD
    ) {
      // Ya no generamos el badge, pero podemos guardar la anomalía internamente si es necesario
      anomalies.capacityAmplified = {
        base: baseCapacity,
        extracted: extractedCapacity,
        ratio: Math.round((extractedCapacity / baseCapacity) * 100) / 100,
      };
    }
  }

  // ── 3. DETECCIÓN DE CADENCIA VARIABLE ────────────────────────────────────────
  // Si el valor de cadencia contiene '-', hay un cerrojo/accesorio que da cadencia dual
  // Ej: "700 - 600 RPM" -> badge "⚡ Cadencia Variable", se muestra "700-600"
  const extractedFireRateRaw =
    extractedStats.fireRate ??
    (extractedStats as Record<string, any>)["cadencia"] ??
    null;

  if (typeof extractedFireRateRaw === "string" && extractedFireRateRaw.includes("-")) {
    // Limpiar: quitar letras, espacios y unidades ("RPM"), dejando solo "700-600"
    const cleanFireRate = extractedFireRateRaw.replace(/[^\d\-]/g, "").replace(/-$/, "");

    badges.push("⚡ Cadencia Variable");
    anomalies.fireRateVariable = { extracted: cleanFireRate };

    // Mutar el valor para que la UI lo muestre limpio
    if ("fireRate" in (extractedStats as object)) extractedStats.fireRate = cleanFireRate;
    if ("cadencia" in (extractedStats as object)) (extractedStats as any).cadencia = cleanFireRate;
  }

  // ── 4. DETECCIÓN DE MUNICIÓN / DAÑO ALTERADO ────────────────────────────────
  // Soporta tanto el key en inglés (damage) como en español (dano)
  const extractedDamageRaw =
    extractedStats.damage ??
    (extractedStats as Record<string, any>)["dano"] ??
    null;
  
  let extractedDamage = typeof extractedDamageRaw === "number" ? extractedDamageRaw : parseFloat(extractedDamageRaw);

  const baseDamage = parseFloat(baseWeapon.base_damage);

  if (extractedDamage != null && !isNaN(baseDamage) && baseDamage > 0) {
    // ── 4.1 DETECCIÓN ESPECÍFICA CAÑÓN DOBLE (Ash-12) ────────────────────────
    // Si es la Ash-12, y el daño bajó alrededor de un 25% (ej. de 56 a 42)
    const isAsh12 = baseWeapon.weapon_name?.toLowerCase().includes("ash") ?? false;
    if (isAsh12 && extractedDamage < baseDamage * 0.85) {
      badges.push("🔥 Cañón Doble");
      // Engañamos a la calculadora de TTK multiplicando el daño por 2 en las stats
      const doubleDamage = extractedDamage * 2;
      
      anomalies.damageAlterated = {
        base: baseDamage,
        extracted: doubleDamage,
        diffPercent: Math.round(((doubleDamage - baseDamage) / baseDamage) * 100 * 10) / 10,
      };

      // Mutamos el objeto de stats para que la BD guarde el daño doble y el TTK se calcule bien
      if ("damage" in (extractedStats as object)) extractedStats.damage = doubleDamage;
      if ("dano" in (extractedStats as object)) (extractedStats as any).dano = doubleDamage;
      
      // Guardamos el daño original solo para mostrarlo en UI
      extractedStats.ui_damage = extractedDamage;
      
    } else {
      // ── 4.2 LÓGICA NORMAL DE MUNICIÓN ESPECIAL ────────────────────────────
      const damageIncreasePercent =
        ((extractedDamage - baseDamage) / baseDamage) * 100;

      if (damageIncreasePercent > DAMAGE_THRESHOLD_PERCENT) {
        badges.push("💥 Munición Especial");
        anomalies.damageAlterated = {
          base: baseDamage,
          extracted: extractedDamage,
          diffPercent: Math.round(damageIncreasePercent * 10) / 10,
        };
      }
    }
  }

  return { special_badges: badges, anomalies };
}
