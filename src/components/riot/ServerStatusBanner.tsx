"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  XCircle,
  Wrench,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
} from "lucide-react";
import type {
  ServerStatusResponse,
  ServerStatusItem,
} from "@/types/riot-status";

// Iconos y colores según severidad
const severityConfig = {
  critical: {
    icon: XCircle,
    bgColor: "bg-red-500/10 dark:bg-red-500/20",
    borderColor: "border-red-500/30",
    textColor: "text-red-600 dark:text-red-400",
    iconColor: "text-red-500",
    label: "Crítico",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-500",
    label: "Advertencia",
  },
  info: {
    icon: AlertTriangle,
    bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-600 dark:text-blue-400",
    iconColor: "text-blue-500",
    label: "Información",
  },
  maintenance: {
    icon: Wrench,
    bgColor: "bg-purple-500/10 dark:bg-purple-500/20",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-600 dark:text-purple-400",
    iconColor: "text-purple-500",
    label: "Mantenimiento",
  },
};

// Fetch del estado del servidor
async function fetchServerStatus(): Promise<ServerStatusResponse> {
  const response = await fetch("/api/riot/server-status?region=la1");
  if (!response.ok) {
    throw new Error("Failed to fetch server status");
  }
  return response.json();
}

// Componente para un item de incidente/mantenimiento
function StatusItem({ item }: { item: ServerStatusItem }) {
  const config = severityConfig[item.severity] || severityConfig.warning;
  const Icon = config.icon;

  const timeAgo = getTimeAgo(item.updatedAt);

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${config.textColor}`}>
          {item.title}
        </p>
        {item.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.textColor}`}
          >
            {config.label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500">
            Actualizado {timeAgo}
          </span>
        </div>
      </div>
    </div>
  );
}

// Obtener tiempo relativo
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins} min`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays}d`;
}

export function ServerStatusBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Query con React Query
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["riot-server-status"],
    queryFn: fetchServerStatus,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Refetch cada 5 minutos
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Log de depuración para ver por qué no se muestra
  useEffect(() => {
    if (error) console.error("Banner Error:", error);
    if (data) console.log("Banner Data:", data);
  }, [data, error]);

  // Resetear dismiss cuando cambian los incidentes
  useEffect(() => {
    if (data?.incidents) {
      setIsDismissed(false);
    }
  }, [data?.incidents?.map((i) => i.id).join(",")]);

  // No mostrar si está cargando, hay error, no hay problemas, o fue descartado
  if (isLoading || error || !data?.hasIssues || isDismissed) {
    return null;
  }

  // Determinar la severidad más alta
  const allItems = [...data.incidents, ...data.maintenances];
  const highestSeverity = allItems.some((i) => i.severity === "critical")
    ? "critical"
    : allItems.some((i) => i.severity === "warning")
    ? "warning"
    : allItems.some((i) => i.severity === "maintenance")
    ? "maintenance"
    : "info";

  const config = severityConfig[highestSeverity];
  const Icon = config.icon;

  // Título principal (primer incidente crítico o el primero disponible)
  const primaryItem =
    data.incidents.find((i) => i.severity === "critical") ||
    data.incidents[0] ||
    data.maintenances[0];

  const totalIssues = data.incidents.length + data.maintenances.length;

  return (
    <div
      className={`
        w-full border-b ${config.bgColor} ${config.borderColor}
        sticky top-14 lg:top-16 z-[40]
        transition-all duration-300 ease-in-out
      `}
    >
      <div className="container mx-auto px-4">
        {/* Header clickeable */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between py-2.5 gap-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} />
            <div className="flex-1 min-w-0 text-left">
              <p className={`font-medium text-sm truncate ${config.textColor}`}>
                {primaryItem?.title || "Problemas con el servidor"}
              </p>
              {!isExpanded && totalIssues > 1 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  +{totalIssues - 1}{" "}
                  {totalIssues === 2 ? "problema más" : "problemas más"}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Botón de refresh */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                refetch();
              }}
              disabled={isFetching}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Actualizar estado"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-500 ${
                  isFetching ? "animate-spin" : ""
                }`}
              />
            </button>

            {/* Botón de cerrar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Cerrar"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>

            {/* Indicador de expandir */}
            {totalIssues > 0 &&
              (isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ))}
          </div>
        </button>

        {/* Contenido expandido */}
        {isExpanded && (
          <div className="pb-3 border-t border-gray-200/50 dark:border-gray-700/50 mt-1">
            <div className="pt-3 space-y-1 divide-y divide-gray-200/30 dark:divide-gray-700/30">
              {data.incidents.map((incident) => (
                <StatusItem key={`incident-${incident.id}`} item={incident} />
              ))}
              {data.maintenances.map((maintenance) => (
                <StatusItem
                  key={`maintenance-${maintenance.id}`}
                  item={maintenance}
                />
              ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 pt-2 border-t border-gray-200/30 dark:border-gray-700/30">
              Servidor: {data.regionName} • Última actualización:{" "}
              {getTimeAgo(data.lastUpdated)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ServerStatusBanner;
