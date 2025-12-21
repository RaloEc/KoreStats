import React from "react";

interface ComparativeBulletProps {
  label: string;
  valueLabel: string;
  value: number;
  avg: number;
  avgLabel?: string;
  deltaLabel?: string;
  isBetter: boolean;
  userColor: string;
}

export const ComparativeBullet: React.FC<ComparativeBulletProps> = ({
  label,
  valueLabel,
  value,
  avg,
  avgLabel,
  deltaLabel,
  isBetter,
  userColor,
}) => {
  const max = avg > 0 ? avg * 2 : Math.max(value, 1);
  const valuePct =
    max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const avgPct =
    avg > 0 && max > 0 ? Math.max(0, Math.min(100, (avg / max) * 100)) : 0;

  return (
    <div className="group/bullet space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          {deltaLabel && (
            <span
              className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md backdrop-blur-sm border border-white/30 dark:border-white/10"
              style={{
                color: userColor,
                opacity: isBetter ? 1 : 0.7,
                backgroundColor: isBetter ? `${userColor}15` : `${userColor}08`,
              }}
            >
              {deltaLabel}
            </span>
          )}
          <span
            className="text-xs sm:text-sm font-black"
            style={{
              color: userColor,
              opacity: isBetter ? 1 : 0.85,
            }}
          >
            {valueLabel}
          </span>
        </div>
      </div>

      {/* Barra de progreso mejorada */}
      <div className="relative h-3 rounded-full bg-gradient-to-r from-slate-200/50 via-slate-100/50 to-slate-200/50 dark:from-slate-800/50 dark:via-slate-900/50 dark:to-slate-800/50 overflow-hidden shadow-inner">
        {/* Brillo superior */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />

        {/* Barra de valor con gradiente */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.max(2, valuePct)}%`,
            background: `linear-gradient(90deg, ${userColor}40, ${userColor}80, ${userColor}40)`,
          }}
        >
          {/* Brillo animado */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>

        {/* Marcador de promedio (línea vertical) */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-white/90 via-white/70 to-white/90 dark:from-white/60 dark:via-white/40 dark:to-white/60 shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-300"
          style={{ left: `calc(${avgPct}% - 1px)` }}
        />

        {/* Indicador circular del valor */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg transition-all duration-500 ease-out"
          style={{
            left: `calc(${valuePct}% - 7px)`,
            backgroundColor: userColor,
            opacity: isBetter ? 1 : 0.7,
            boxShadow: `0 0 12px ${userColor}80, 0 2px 8px rgba(0,0,0,0.2)`,
          }}
        >
          {/* Brillo interno */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 to-transparent" />
        </div>
      </div>

      {avg > 0 && (
        <div className="text-[9px] sm:text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-slate-500 dark:bg-slate-400" />
          Promedio equipo: {avgLabel ?? avg.toFixed(0)}
        </div>
      )}
    </div>
  );
};
