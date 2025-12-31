"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ThemeTogglerButtonProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg";
  modes?: ("light" | "dark" | "system")[];
  direction?: "btt" | "ttb" | "ltr" | "rtl";
  onImmediateChange?: (theme: "light" | "dark" | "system") => void;
  className?: string;
}

/**
 * ThemeTogglerButton - Botón para cambiar entre temasd
 *
 * Basado en el diseño de animate-ui
 * Solo soporta light y dark por defecto (sin system)
 */
export function ThemeTogglerButton({
  variant = "link",
  size = "lg",
  modes = ["light", "dark"],
  direction = "ltr",
  onImmediateChange,
  className,
}: ThemeTogglerButtonProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = async (e?: React.MouseEvent) => {
    const currentIndex = modes.indexOf(theme as any);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextTheme = modes[nextIndex];

    // Verificar si el navegador soporta View Transitions API
    if (!(document as any).startViewTransition) {
      setTheme(nextTheme);
      if (onImmediateChange) onImmediateChange(nextTheme);
      return;
    }

    // Configurar coordenadas para la animación circular
    if (e) {
      const x = e.clientX;
      const y = e.clientY;

      // Calcular la distancia a la esquina más lejana
      const right = window.innerWidth - x;
      const bottom = window.innerHeight - y;
      const maxRadius = Math.hypot(Math.max(x, right), Math.max(y, bottom));

      document.documentElement.style.setProperty("--x", `${x}px`);
      document.documentElement.style.setProperty("--y", `${y}px`);
      document.documentElement.style.setProperty("--r", `${maxRadius}px`);
    }

    // Iniciar transición
    (document as any).startViewTransition(() => {
      setTheme(nextTheme);
    });

    if (onImmediateChange) onImmediateChange(nextTheme);
  };

  // Placeholder mientras se monta
  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn("relative", className)}
        disabled
      >
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  // Determinar qué icono mostrar
  const isDark = theme === "dark";

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      className={cn("relative", className)}
    >
      <Sun
        className={cn(
          "h-[1.2rem] w-[1.2rem] transition-all",
          isDark ? "rotate-90 scale-0" : "rotate-0 scale-100"
        )}
      />
      <Moon
        className={cn(
          "absolute h-[1.2rem] w-[1.2rem] transition-all",
          isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0"
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

// Alias para compatibilidad
export { ThemeTogglerButton as ThemeToggleButton };
