"use client";

import { Filter, X, ChevronDown, Check } from "lucide-react";
import { CategoriaFiltersState } from "./CategoriaFilters";
import { useUserTheme } from "@/hooks/useUserTheme";

type Tag = { id: string; nombre: string; slug: string };

interface CategoriaFiltrosDesktopProps {
  tags: Tag[];
  value: CategoriaFiltersState;
  onChange: (next: CategoriaFiltersState) => void;
  onAplicarFiltros: () => void;
  onLimpiarFiltros: () => void;
}

export default function CategoriaFiltrosDesktop({
  tags,
  value,
  onChange,
  onAplicarFiltros,
  onLimpiarFiltros,
}: CategoriaFiltrosDesktopProps) {
  const { userColor } = useUserTheme();

  const orderOptions = [
    { key: "ultimo", label: "Último mensaje" },
    { key: "creacion", label: "Fecha creación" },
    { key: "respuestas", label: "Más respuestas" },
    { key: "vistas", label: "Más populares" },
    { key: "destacados", label: "Destacados" },
  ] as const;

  const toggleTag = (slug: string) => {
    const set = new Set(value.tags);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    onChange({ ...value, tags: Array.from(set) });
  };

  const hayFiltrosActivos =
    value.tags.length > 0 ||
    value.estado !== undefined ||
    value.popularidad !== undefined ||
    value.fechaFrom !== undefined ||
    value.fechaTo !== undefined ||
    value.destacados === true;

  return (
    <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm space-y-4">
      {/* Top Row: Main Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Filter size={18} />
            <span className="text-sm font-medium">Ordenar por:</span>
          </div>

          <div className="relative group">
            <select
              className="appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 transition-all cursor-pointer font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{
                // @ts-ignore
                "--ring-color": userColor,
              }}
              value={value.orderBy}
              onChange={(e) =>
                onChange({
                  ...value,
                  orderBy: e.target.value as CategoriaFiltersState["orderBy"],
                })
              }
            >
              {orderOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-2 hidden sm:block"></div>

          {/* Destacados Toggle */}
          <label className="flex items-center gap-2 cursor-pointer group select-none">
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                value.destacados
                  ? "border-transparent text-white"
                  : "border-gray-300 dark:border-gray-700 bg-transparent"
              }`}
              style={{
                backgroundColor: value.destacados ? userColor : undefined,
              }}
            >
              {value.destacados && <Check size={12} strokeWidth={3} />}
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={!!value.destacados}
              onChange={(e) =>
                onChange({ ...value, destacados: e.target.checked })
              }
            />
            <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              Solo destacados
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hayFiltrosActivos && (
            <button
              onClick={onLimpiarFiltros}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
          <button
            onClick={onAplicarFiltros}
            className="text-sm font-semibold text-white px-5 py-2 rounded-lg shadow-sm hover:opacity-90 transition-all active:scale-95"
            style={{ backgroundColor: userColor }}
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* Tags Row */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/50">
          {tags.map((t) => {
            const active = value.tags.includes(t.slug);
            return (
              <button
                key={t.id}
                onClick={() => toggleTag(t.slug)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                  active
                    ? "text-white border-transparent shadow-sm"
                    : "bg-transparent text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
                style={active ? { backgroundColor: userColor } : undefined}
              >
                #{t.nombre}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
