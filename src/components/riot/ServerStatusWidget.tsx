"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  XCircle,
  Wrench,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import type {
  ServerStatusResponse,
  ServerStatusItem,
} from "@/types/riot-status";

const severityConfig = {
  critical: {
    icon: XCircle,
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    textColor: "text-red-700 dark:text-red-400",
    iconColor: "text-red-500",
    label: "Crítico",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    textColor: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-500",
    label: "Advertencia",
  },
  info: {
    icon: AlertTriangle,
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    textColor: "text-blue-700 dark:text-blue-400",
    iconColor: "text-blue-500",
    label: "Info",
  },
  maintenance: {
    icon: Wrench,
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    textColor: "text-purple-700 dark:text-purple-400",
    iconColor: "text-purple-500",
    label: "Mantenimiento",
  },
};

async function fetchServerStatus(): Promise<ServerStatusResponse> {
  const response = await fetch("/api/riot/server-status?region=la1");
  if (!response.ok) throw new Error("Failed to fetch");
  return response.json();
}

function StatusItem({ item }: { item: ServerStatusItem }) {
  const config = severityConfig[item.severity] || severityConfig.warning;
  const Icon = config.icon;

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex gap-3">
        <div className={`mt-0.5 p-1.5 rounded-lg ${config.bgColor}`}>
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${config.textColor}`}
            >
              {config.label}
            </span>
            <span className="text-[10px] text-gray-500">
              {new Date(item.updatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight mb-1">
            {item.title}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ServerStatusWidget() {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["riot-server-status-widget"],
    queryFn: fetchServerStatus,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading || !data?.hasIssues) {
    return null;
  }

  const allItems = [...data.incidents, ...data.maintenances];
  const totalIssues = allItems.length;

  return (
    <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800/60 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between bg-gray-50/50 dark:bg-black">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
          </div>
          <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
            Estado de Riot
          </h3>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-gray-500 ${
              isFetching ? "animate-spin" : ""
            }`}
          />
        </button>
      </div>

      {/* Contenido */}
      <div className="p-5">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {/* Solo mostrar el primero si no está expandido */}
          {(!isExpanded ? allItems.slice(0, 1) : allItems).map((item, idx) => (
            <StatusItem key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>

        {totalIssues > 1 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {isExpanded ? (
              <>
                Ver menos <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Ver {totalIssues - 1} problemas más{" "}
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}

        {/* Footer Link */}
        <a
          href="https://status.riotgames.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between group"
        >
          <span className="text-[10px] font-medium text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
            Página oficial de Riot Status
          </span>
          <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
        </a>
      </div>
    </div>
  );
}
