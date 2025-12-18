"use client";

import type { CSSProperties } from "react";
import { useEffect, useState, useRef } from "react";
import { Gamepad2 } from "lucide-react";

type StatusType = "online" | "in-game" | "offline";

interface StatusBadgeProps {
  userId: string;
  initialStatus?: StatusType;
  variant?: "full" | "dot";
  userColor?: string;
  onlyWhenInGame?: boolean;
}

export function StatusBadge({
  userId,
  initialStatus = "offline",
  variant = "full",
  userColor,
  onlyWhenInGame = false,
}: StatusBadgeProps) {
  // Estado inicial según lo que venga del servidor
  const [status, setStatus] = useState<StatusType>(initialStatus);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Función para obtener el estado del usuario desde la API
    // La API ahora consulta el campo `status` de la tabla perfiles
    // que se actualiza cuando el usuario tiene sesión activa
    const checkUserStatus = async () => {
      try {
        // Crear un AbortController con timeout de 10 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          `/api/riot/matches/active/public?userId=${userId}`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn("[StatusBadge] Failed to check user status", {
            status: response.status,
          });
          return;
        }

        const data = await response.json();

        console.log("[StatusBadge] User status check result:", {
          userId: userId.substring(0, 8) + "...",
          status: data.status,
          reason: data.reason,
        });

        // Confiar en la respuesta de la API que ahora consulta la BD
        if (data.status === "in-game") {
          setStatus("in-game");
        } else if (data.status === "online") {
          setStatus("online");
        } else {
          setStatus("offline");
        }
      } catch (err) {
        // Silenciar errores de abort (timeout)
        if (err instanceof Error && err.name === "AbortError") {
          console.warn(
            "[StatusBadge] Request timeout for user:",
            userId.substring(0, 8) + "..."
          );
        } else {
          console.error("[StatusBadge] Error checking user status:", err);
        }
      }
    };

    // Verificar inmediatamente
    checkUserStatus();

    // Verificar cada 30 segundos para mantener el estado actualizado
    pollIntervalRef.current = setInterval(checkUserStatus, 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [userId]);

  const getStatusStyles = (): {
    dotClass: string;
    dotStyle?: CSSProperties;
    textClass: string;
    textStyle?: CSSProperties;
    iconClass?: string;
    iconStyle?: CSSProperties;
    label: string;
  } => {
    switch (status) {
      case "in-game":
        return {
          dotClass: "animate-pulse",
          dotStyle: userColor ? { backgroundColor: userColor } : undefined,
          textClass: "",
          textStyle: userColor ? { color: userColor } : undefined,
          iconClass: "w-3 h-3",
          iconStyle: userColor ? { color: userColor } : undefined,
          label: "En partida",
        };
      case "online":
        return {
          dotClass: "bg-green-500",
          textClass: "text-green-500",
          label: "En línea",
        };
      case "offline":
      default:
        return {
          dotClass: "bg-gray-500",
          textClass: "text-muted-foreground",
          label: "Desconectado",
        };
    }
  };

  const styles = getStatusStyles();

  // Si onlyWhenInGame está activo y no está en partida, no mostrar nada
  if (onlyWhenInGame && status !== "in-game") {
    return null;
  }

  if (variant === "dot") {
    return (
      <div className="absolute bottom-1 right-1 z-50 bg-white dark:bg-gray-950 rounded-full p-0.5 border border-background dark:border-gray-950 shadow-sm">
        <div
          className={`w-3 h-3 rounded-full ${styles.dotClass}`}
          style={styles.dotStyle}
          title={styles.label}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${styles.dotClass}`}
        style={styles.dotStyle}
      />
      <span
        className={`text-xs font-medium ${styles.textClass}`}
        style={styles.textStyle}
      >
        {styles.label}
      </span>
      {status === "in-game" ? (
        <Gamepad2
          className={styles.iconClass ?? "w-3 h-3"}
          style={styles.iconStyle}
        />
      ) : null}
    </div>
  );
}
