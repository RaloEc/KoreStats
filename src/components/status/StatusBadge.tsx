"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import createClient from "@/utils/supabase/client";

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
  const [status, setStatus] = useState<StatusType>(initialStatus);
  const supabase = createClient();

  useEffect(() => {
    // Carga inicial del estado
    const fetchInitialStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("perfiles")
          .select("status")
          .eq("id", userId)
          .single();

        if (error) {
          console.warn("[StatusBadge] initial status fetch error", {
            userId,
            message: error.message,
          });
        }

        if (data?.status) {
          console.log("[StatusBadge] initial status", {
            userId,
            status: data.status,
          });
          setStatus(data.status as StatusType);
        }
      } catch (err) {
        console.error("Error fetching initial status:", err);
      }
    };

    fetchInitialStatus();

    const channel = supabase
      .channel(`profile-status-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "perfiles",
          filter: `id=eq.${userId}`,
        },
        (payload: unknown) => {
          const data = payload as { new?: { status?: StatusType } };
          if (data.new?.status) {
            setStatus(data.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

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

  if (variant === "full" && onlyWhenInGame && status !== "in-game") {
    return null;
  }

  if (variant === "dot") {
    return (
      <div
        className={`w-4 h-4 rounded-full ${styles.dotClass} border-2 border-white dark:border-black shadow-sm`}
        style={styles.dotStyle}
        title={styles.label}
      />
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
