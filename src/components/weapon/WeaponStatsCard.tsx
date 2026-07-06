"use client";

import React from "react";
import type { WeaponStats } from "@/types/weapon";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  Target,
  Crosshair,
  Zap,
  Hand,
  Shield,
  Eye,
  Sword,
  Clock,
  Package,
  Wind,
  Volume2,
  Edit3,
  Gauge,
  Activity,
  Focus,
  Sparkles,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface WeaponStatsCardProps {
  stats: WeaponStats;
  onEdit?: (field: keyof WeaponStats, value: number | string) => void;
  isEditable?: boolean;
  className?: string;
}

interface StatConfig {
  key: keyof WeaponStats;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  unit?: string;
  max?: number;
  isMainStat?: boolean;
}

const MAIN_STATS_CONFIG: StatConfig[] = [
  { key: "damage", label: "Daño", icon: Crosshair, max: 100, isMainStat: true },
  {
    key: "range",
    label: "Alcance",
    icon: Target,
    unit: "m",
    max: 100,
    isMainStat: true,
  },
  {
    key: "control",
    label: "Control",
    icon: Activity,
    max: 100,
    isMainStat: true,
  },
  { key: "handling", label: "Manejo", icon: Zap, max: 100, isMainStat: true },
  {
    key: "stability",
    label: "Estabilidad",
    icon: Gauge,
    max: 100,
    isMainStat: true,
  },
  {
    key: "accuracy",
    label: "Precisión",
    icon: Focus,
    max: 100,
    isMainStat: true,
  },
];

const ADDITIONAL_STATS_CONFIG: StatConfig[] = [
  { key: "armorPenetration", label: "Perforación de blindaje", icon: Eye },
  {
    key: "fireRate",
    label: "Cad. de disparo",
    icon: Clock,
    unit: "dpm",
  },
  { key: "capacity", label: "Capacidad", icon: Package },
  {
    key: "muzzleVelocity",
    label: "Velocidad de boca",
    icon: Wind,
    unit: "m/s",
  },
  {
    key: "soundRange",
    label: "Sonido de disparo",
    icon: Volume2,
    unit: "m",
  },
];

export function WeaponStatsCard({
  stats,
  onEdit,
  className,
  isEditable = false,
}: WeaponStatsCardProps) {
  const { profile } = useAuth();

  // Obtener el color personalizado del usuario
  const userColor = profile?.color || "#6366f1";

  // Normalizar stats: convertir nombres en español a inglés
  const normalizeStats = (rawStats: WeaponStats): WeaponStats => {
    const normalized: any = { ...rawStats };

    // Mapeo de español a inglés
    const spanishToEnglish: Record<string, string> = {
      dano: "damage",
      alcance: "range",
      manejo: "handling",
      estabilidad: "stability",
      precision: "accuracy",
      perforacionBlindaje: "armorPenetration",
      cadenciaDisparo: "fireRate",
      velocidadBoca: "muzzleVelocity",
      sonidoDisparo: "soundRange",
      capacidad: "capacity",
    };

    // Copiar valores de campos en español a sus equivalentes en inglés
    Object.entries(spanishToEnglish).forEach(([spanish, english]) => {
      if (spanish in rawStats && !(english in rawStats)) {
        normalized[english] = rawStats[spanish as keyof WeaponStats];
      }
    });

    return normalized;
  };

  const normalizedStats = normalizeStats(stats);

  const sanitizeToNumber = (value: unknown) => {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === "string") {
      const cleaned = value.replace(/,/g, ".").replace(/[^0-9.-]/g, "");
      const parsed = parseFloat(cleaned);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return 0;
  };
  const handleStatEdit = (
    field: keyof WeaponStats,
    currentValue: number | string
  ) => {
    if (!onEdit || !isEditable) return;

    const allConfigs = [...MAIN_STATS_CONFIG, ...ADDITIONAL_STATS_CONFIG];
    const label =
      allConfigs.find((s) => s.key === field)?.label || String(field);

    const newValue = prompt(`Editar ${label}:`, String(currentValue));
    if (newValue !== null) {
      // Nota: Si has eliminado 'Modo', es posible que 'nombreArma' no necesite un manejo especial aquí
      // Sin embargo, se mantiene la lógica si "nombreArma" aún puede ser editado para otros propósitos.
      const numValue = field === "nombreArma" ? newValue : Number(newValue);
      if (
        field !== "nombreArma" &&
        (isNaN(numValue as number) || (numValue as number) < 0)
      ) {
        alert("Por favor ingresa un número válido mayor o igual a 0");
        return;
      }
      onEdit(field, numValue);
    }
  };

  return (
    <div
      className={cn(
        "bg-slate-950/80 p-4 rounded-lg shadow-xl border border-slate-800/60 flex flex-col h-full",
        className
      )}
    >
      {/* Header */}
      <div className="mb-3 pb-2 border-b border-slate-700/50 flex-shrink-0">
        <p className="text-slate-400 text-xs mb-0">
          {normalizedStats.description || normalizedStats.nombreArma || "Estadísticas del Arma"}
        </p>
      </div>

      {/* Special Badges / Anomaly Chips */}
      {normalizedStats.special_badges && normalizedStats.special_badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <TooltipProvider delayDuration={100}>
            {normalizedStats.special_badges.map((badge, idx) => {
              const tooltipText =
                badge.includes("Conversión") ? "El modo de disparo fue cambiado por un accesorio especial" :
                badge.includes("Cargador") ? "Esta build usa un cargador ampliado (más del 40% de capacidad base)" :
                badge.includes("Munión") || badge.includes("Especial") ? "El daño supera en más de 5% al valor base del arma" :
                "Accesorio especial detectado";

              return (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold uppercase tracking-wide bg-amber-500/15 border border-amber-500/40 text-amber-400 cursor-help select-none transition-colors hover:bg-amber-500/25">
                      <Sparkles className="w-2.5 h-2.5" />
                      {badge}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    {tooltipText}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      )}

      <div className="space-y-2 mb-3 flex-shrink-0">
        {MAIN_STATS_CONFIG.map((config) => {
          // Si es daño y hay un ui_damage, usamos ese valor para mostrarlo en UI
          const rawValue =
            config.key === "damage" && normalizedStats.ui_damage !== undefined
              ? normalizedStats.ui_damage
              : normalizedStats[config.key];
              
          const numericValue = sanitizeToNumber(rawValue);
          const displayValue = Number.isInteger(numericValue)
            ? numericValue
            : Number(numericValue.toFixed(1));
          const Icon = config.icon;
          const percentage = Math.min(
            (numericValue / (config.max || 100)) * 100,
            100
          );

          return (
            <div
              key={config.key}
              className={cn(
                "flex items-center gap-2 text-xs",
                isEditable && "cursor-pointer"
              )}
              onClick={() =>
                isEditable && handleStatEdit(config.key, displayValue)
              }
            >
              <Icon className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="text-slate-300 flex-1 min-w-0">
                {config.label}
              </span>
              <div className="flex-1 bg-slate-800/40 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: userColor,
                  }}
                />
              </div>
              <span className="text-slate-200 font-medium w-16 text-right">
                {displayValue}
                {config.unit || ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="my-2 border-t border-slate-700/50"></div>

      {/* Additional Stats */}
      <div className="space-y-1.5 text-xs">
        {ADDITIONAL_STATS_CONFIG.map((config) => {
          const value = normalizedStats[config.key];
          const displayValue =
            value === undefined || value === null
              ? ""
              : typeof value === "number"
              ? value
              : Array.isArray(value)
              ? value.join(", ")
              : String(value);

          return (
            <div
              key={config.key}
              className={cn(
                "flex items-center justify-between",
                isEditable && "cursor-pointer hover:text-slate-100"
              )}
              onClick={() =>
                isEditable && handleStatEdit(config.key, displayValue)
              }
            >
              <span className="text-slate-500">• {config.label}</span>
              <span className="text-slate-300 font-medium">
                {displayValue}
                {config.unit ? ` ${config.unit}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
