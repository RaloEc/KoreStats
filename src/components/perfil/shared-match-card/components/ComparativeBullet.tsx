import React, { memo } from "react";

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

export const ComparativeBullet: React.FC<ComparativeBulletProps> = memo(
  ({
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
      <div className="group/bullet space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/70 dark:text-slate-400">
              {label}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-black dark:text-slate-50">
                {valueLabel}
              </span>
              {deltaLabel && (
                <span
                  className={`text-[9px] font-bold px-1 py-0.5 rounded-sm ${
                    isBetter
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-500/10"
                      : "text-rose-700 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-500/10"
                  }`}
                >
                  {deltaLabel}
                </span>
              )}
            </div>
          </div>

          {avg > 0 && (
            <div className="text-right">
              <span className="block text-[8px] uppercase font-bold text-black/60 dark:text-slate-500 tracking-tight">
                Promedio
              </span>
              <span className="text-[10px] font-bold text-black dark:text-slate-300">
                {avgLabel ?? avg.toFixed(0)}
              </span>
            </div>
          )}
        </div>

        {/* Barra de progreso minimalista */}
        <div className="relative h-1 w-full bg-slate-200/50 dark:bg-slate-800/80 rounded-full overflow-visible mt-3 mb-4">
          {/* Marcador de promedio (Línea vertical más alta y clara) */}
          <div
            className="absolute top-[-5px] bottom-[-5px] w-[1.5px] bg-slate-500 dark:bg-slate-500 z-10"
            style={{ left: `${avgPct}%` }}
          />

          {/* Barra de valor (Base neutra) */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out z-0"
            style={{
              width: `${Math.max(1, valuePct)}%`,
              backgroundColor: isBetter ? "#94a3b8" : "#64748b",
            }}
          >
            {/* Indicador del usuario: Barra vertical con Color de Usuario y Brillo */}
            <div
              className="absolute right-[-1px] top-[-4px] bottom-[-4px] w-[3px] rounded-full shadow-sm transition-all duration-500"
              style={{
                backgroundColor: userColor,
                boxShadow: `0 0 8px ${userColor}80`,
              }}
            />
          </div>
        </div>
      </div>
    );
  },
);
