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
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-slate-800 dark:text-white/85">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          {deltaLabel && (
            <span
              className="text-[10px] font-semibold"
              style={{
                color: userColor,
                opacity: isBetter ? 1 : 0.7,
              }}
            >
              {deltaLabel}
            </span>
          )}
          <span
            className="text-[11px] font-bold"
            style={{
              color: userColor,
              opacity: isBetter ? 1 : 0.85,
            }}
          >
            {valueLabel}
          </span>
        </div>
      </div>

      <div className="relative h-2.5 rounded-full bg-white/35 dark:bg-white/10 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-slate-800/40 dark:bg-white/35"
          style={{ width: `${Math.max(2, valuePct)}%` }}
        />
        <div
          className="absolute -top-0.5 h-3.5 w-[2px] rounded-full bg-white/80 dark:bg-white/60"
          style={{ left: `calc(${avgPct}% - 1px)` }}
        />
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-white/70 shadow"
          style={{
            left: `calc(${valuePct}% - 5px)`,
            backgroundColor: userColor,
            opacity: isBetter ? 1 : 0.55,
          }}
        />
      </div>

      {avg > 0 && (
        <div className="text-[10px] text-slate-600 dark:text-white/50">
          Promedio equipo: {avgLabel ?? avg.toFixed(0)}
        </div>
      )}
    </div>
  );
};
