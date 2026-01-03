"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Componente que actualiza dinámicamente el theme-color de la PWA
 * según el tema actual (claro/oscuro/amoled)
 */
export default function DynamicThemeColor() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    // Obtener o crear la meta tag theme-color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }

    // Definir colores según el tema
    const colors = {
      light: "#ffffff", // Blanco para tema claro
      dark: "#18181b", // Zinc-900 para tema oscuro
      amoled: "#000000", // Negro puro para AMOLED
    };

    // Determinar el tema actual
    let currentTheme = resolvedTheme || theme;

    // Detectar si está en modo AMOLED
    const isAmoled = document.documentElement.classList.contains("amoled");
    if (isAmoled) {
      currentTheme = "amoled";
    }

    // Aplicar el color correspondiente
    const color = colors[currentTheme as keyof typeof colors] || colors.dark;
    metaThemeColor.setAttribute("content", color);

    // También actualizar el manifest.json dinámicamente si es necesario
    // (Esto es opcional, pero mejora la experiencia)
    const manifestLink = document.querySelector(
      'link[rel="manifest"]'
    ) as HTMLLinkElement;
    if (manifestLink) {
      // Forzar recarga del manifest con el nuevo theme_color
      const manifestUrl = new URL(manifestLink.href, window.location.origin);
      manifestUrl.searchParams.set("theme", currentTheme);
      manifestLink.href = manifestUrl.toString();
    }
  }, [theme, resolvedTheme]);

  return null; // Este componente no renderiza nada
}
