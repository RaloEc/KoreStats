"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

interface LPBadgeProps {
  lp?: number | null;
  className?: string;
}

export function LPBadge({ lp, className = "" }: LPBadgeProps) {
  if (lp === undefined || lp === null) return null;

  const isPositive = lp > 0;
  const isZero = lp === 0;

  return (
    <div
      className={`
      inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider
      ${
        isPositive
          ? "text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20"
          : isZero
            ? "text-gray-500 bg-gray-500/10 border border-gray-500/20 dark:text-gray-400 dark:bg-gray-500/10 dark:border-gray-500/20"
            : "text-rose-600 bg-rose-500/10 border border-rose-500/20 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20"
      }
      ${className}
    `}
    >
      {isPositive ? "+" : ""}
      {lp} PL
    </div>
  );
}
