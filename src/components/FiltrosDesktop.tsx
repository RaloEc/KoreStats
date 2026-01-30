"use client";

import React from "react";
import { FilterIcon, XIcon, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FiltrosDesktopProps {
  busqueda: string;
  autor: string;
  categoria: string;
  ordenFecha: "asc" | "desc";
  categorias: { id: string; nombre: string }[];
  filtrosActivos: { tipo: string; valor: string; etiqueta: string }[];
  onBusquedaChange: (valor: string) => void;
  onAutorChange: (valor: string) => void;
  onCategoriaChange: (valor: string) => void;
  onOrdenFechaChange: (valor: "asc" | "desc") => void;
  onAplicarFiltros: () => void;
  onLimpiarFiltros: () => void;
  onEliminarFiltro: (tipo: string) => void;
}

const FiltrosDesktop = React.memo(function FiltrosDesktop({
  busqueda,
  autor,
  categoria,
  ordenFecha,
  categorias,
  filtrosActivos,
  onBusquedaChange,
  onAutorChange,
  onCategoriaChange,
  onOrdenFechaChange,
  onAplicarFiltros,
  onLimpiarFiltros,
  onEliminarFiltro,
}: FiltrosDesktopProps) {
  return (
    <div className="hidden md:block bg-card rounded-lg border border-border mb-6 p-4 shadow-sm">
      <div className="space-y-3">
        {/* Título con icono */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilterIcon size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Filtros de búsqueda
            </span>
          </div>
          {filtrosActivos.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {filtrosActivos.length} activo
              {filtrosActivos.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Inputs y selects */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar noticias..."
              className="w-full pl-9 pr-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              aria-label="Buscar noticias"
            />
          </div>

          {/* Categoría */}
          <select
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer"
            value={categoria}
            onChange={(e) => onCategoriaChange(e.target.value)}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>

          {/* Orden */}
          <select
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer"
            value={ordenFecha}
            onChange={(e) =>
              onOrdenFechaChange(e.target.value as "asc" | "desc")
            }
            aria-label="Ordenar por fecha"
          >
            <option value="desc">Más recientes primero</option>
            <option value="asc">Más antiguas primero</option>
          </select>

          {/* Botón limpiar */}
          <button
            className="px-4 py-2 bg-muted text-muted-foreground text-sm rounded-md hover:bg-muted/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onLimpiarFiltros}
            disabled={filtrosActivos.length === 0}
            aria-label="Limpiar todos los filtros"
          >
            Limpiar filtros
          </button>
        </div>

        {/* Filtros activos */}
        {filtrosActivos.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground self-center">
              Activos:
            </span>
            {filtrosActivos.map((filtro) => (
              <Badge
                key={`${filtro.tipo}-${filtro.valor}`}
                variant="secondary"
                className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1"
              >
                <span className="text-xs">{filtro.etiqueta}</span>
                <button
                  onClick={() => onEliminarFiltro(filtro.tipo)}
                  className="hover:bg-background/50 rounded-sm p-0.5 transition-colors"
                  aria-label={`Eliminar filtro ${filtro.etiqueta}`}
                >
                  <XIcon size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default FiltrosDesktop;
