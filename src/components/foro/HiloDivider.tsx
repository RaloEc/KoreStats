"use client";

import { useUserTheme } from "@/hooks/useUserTheme";

interface HiloDividerProps {
  label: string;
  className?: string;
}

export default function HiloDivider({
  label,
  className = "",
}: HiloDividerProps) {
  const { userColor } = useUserTheme();

  return (
    <div className={`relative py-6 mt-8 mb-2 ${className}`}>
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div
          className="w-full border-t-2"
          style={{ borderColor: userColor }}
        ></div>
      </div>
      <div className="relative flex justify-center">
        <span
          className="bg-background px-6 text-sm font-bold uppercase tracking-widest transition-colors duration-200"
          style={{ color: userColor }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
