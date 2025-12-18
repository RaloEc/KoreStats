"use client";

import { FilterIcon } from "lucide-react";

interface CategoriaFiltrosBtnFlotanteProps {
  modalAbierto: boolean;
  onAbrirModal: () => void;
  hayFiltrosActivos?: boolean;
}

export default function CategoriaFiltrosBtnFlotante({
  modalAbierto,
  onAbrirModal,
  hayFiltrosActivos = false,
}: CategoriaFiltrosBtnFlotanteProps) {
  return (
    <button
      onClick={onAbrirModal}
      className="md:hidden fixed bottom-24 right-6 z-10 flex items-center justify-center p-3 rounded-full shadow-lg transition-all duration-300 bg-primary hover:bg-primary/90"
      aria-label="Abrir filtros"
    >
      <div className="flex items-center relative">
        <FilterIcon size={24} className="text-primary-foreground" />

        {/* Indicador de filtros activos */}
        {hayFiltrosActivos && (
          <div
            className="absolute -top-1 -right-1 bg-destructive rounded-full h-3.5 w-3.5 border border-background"
            style={{
              animation: "suaveRespirar 2s infinite ease-in-out",
              boxShadow: "0 0 0 0 rgba(220, 38, 38, 0.7)",
              transform: "scale(1)",
            }}
          >
            <span className="sr-only">Filtros activos</span>
          </div>
        )}
      </div>
    </button>
  );
}
