"use client";

import React from "react";

interface CarouselDotsProps {
  totalPages: number;
  currentIndex: number;
}

export const CarouselDots: React.FC<CarouselDotsProps> = ({
  totalPages,
  currentIndex,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-2 flex items-center justify-center gap-2">
      {Array.from({ length: totalPages }).map((_, idx) => (
        <span
          key={idx}
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            idx === currentIndex
              ? "bg-slate-900/80 dark:bg-white/80"
              : "bg-slate-500/30 dark:bg-white/20"
          }`}
        />
      ))}
    </div>
  );
};
