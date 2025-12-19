"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";

interface RankAnimatedBackgroundProps {
  tier?: string | null;
  className?: string;
}

/**
 * Paletas de colores para cada tier de League of Legends
 * Cada tier tiene un color base y un acento para crear gradientes dinámicos
 */
const TIER_PALETTES: Record<
  string,
  { base: string; accent: string; name: string }
> = {
  IRON: {
    base: "#4A4A4A",
    accent: "#6B6B6B",
    name: "Iron",
  },
  BRONZE: {
    base: "#8B5A3C",
    accent: "#CD7F32",
    name: "Bronze",
  },
  SILVER: {
    base: "#7E8A8F",
    accent: "#C0C0C0",
    name: "Silver",
  },
  GOLD: {
    base: "#FFD700",
    accent: "#FFA500",
    name: "Gold",
  },
  PLATINUM: {
    base: "#00A8A8",
    accent: "#4EC9B0",
    name: "Platinum",
  },
  EMERALD: {
    base: "#00C26F",
    accent: "#50E3C2",
    name: "Emerald",
  },
  DIAMOND: {
    base: "#3E5F8A",
    accent: "#6FAAFF",
    name: "Diamond",
  },
  MASTER: {
    base: "#9B59B6",
    accent: "#C471ED",
    name: "Master",
  },
  GRANDMASTER: {
    base: "#E74C3C",
    accent: "#FF6B6B",
    name: "Grandmaster",
  },
  CHALLENGER: {
    base: "#F4D03F",
    accent: "#FFEB3B",
    name: "Challenger",
  },
  UNRANKED: {
    base: "#2C3E50",
    accent: "#34495E",
    name: "Unranked",
  },
};

/**
 * Componente de fondo animado que cambia según el tier del jugador
 * Crea un gradiente diagonal animado con colores adaptados al tema
 */
export function RankAnimatedBackground({
  tier,
  className = "",
}: RankAnimatedBackgroundProps) {
  const { resolvedTheme } = useTheme();

  const gradientStyle = useMemo(() => {
    // Normalizar tier a mayúsculas
    const normalizedTier = (tier || "UNRANKED").toUpperCase();
    const palette = TIER_PALETTES[normalizedTier] || TIER_PALETTES.UNRANKED;

    // Determinar color mezclador según el tema
    const isDark = resolvedTheme === "dark";
    const themeMixer = isDark ? "#0f0f0f" : "#ffffff";
    const themeSecondary = isDark ? "#1a1a1a" : "#f3f4f6";

    // Crear gradiente diagonal con 4 stops para mejor fluidez
    return {
      backgroundImage: `linear-gradient(
        -45deg,
        ${palette.base}15,
        ${themeMixer}80,
        ${palette.accent}25,
        ${themeSecondary}90,
        ${palette.base}15
      )`,
      backgroundSize: "400% 400%",
    };
  }, [tier, resolvedTheme]);

  return (
    <div
      className={`absolute inset-0 animate-gradient-flow ${className}`}
      style={gradientStyle}
      aria-hidden="true"
    />
  );
}
