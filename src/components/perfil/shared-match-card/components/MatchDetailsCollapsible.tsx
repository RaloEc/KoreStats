"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface MatchDetailsCollapsibleProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const MatchDetailsCollapsible: React.FC<
  MatchDetailsCollapsibleProps
> = ({ children, defaultOpen = false, isOpen: controlledIsOpen, onToggle }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);

  const isExpanded =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  return (
    <div className="w-full">
      {/* Botón de toggle */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/40 dark:border-white/20 bg-white/30 dark:bg-black/30 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-300 hover:bg-white/40 dark:hover:bg-black/40 hover:shadow-[0_6px_24px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)] group"
      >
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
          {isExpanded ? "Ocultar detalles" : "Ver detalles"}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-300 transition-transform duration-300 group-hover:scale-110" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-300 transition-transform duration-300 group-hover:scale-110" />
        )}
      </button>

      {/* Contenido desplegable */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? "max-h-[2000px] opacity-100 mt-3" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
};
