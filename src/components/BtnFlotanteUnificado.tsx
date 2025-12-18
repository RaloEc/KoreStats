"use client";

import { useState, useEffect } from "react";
import {
  PlusIcon,
  X,
  Clock,
  TrendingUp,
  MessageSquare,
  Star,
  User,
  FileText,
  Flame,
  Sparkles,
  MessageCircle,
  ChevronRight,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";

type TipoContenido = "noticias" | "foro";

type FiltroNoticias =
  | "recientes"
  | "populares"
  | "destacadas"
  | "mas-comentadas";
type FiltroForo =
  | "recientes"
  | "populares"
  | "sin_respuesta"
  | "siguiendo"
  | "mios";

interface Categoria {
  id: string;
  nombre: string;
  color?: string;
  icono?: string;
  parent_id?: string | null;
  subcategorias?: Categoria[];
}

interface BtnFlotanteUnificadoProps {
  tipo: TipoContenido;
  usuarioAutenticado: boolean;
  usuarioRol?: string;
  filtroActivo?: FiltroNoticias | FiltroForo;
  categoriaActiva?: string;
  onCambiarFiltro?: (filtro: FiltroNoticias | FiltroForo) => void;
  onCambiarCategoria?: (categoriaId: string) => void;
  categorias?: Categoria[];
}

export default function BtnFlotanteUnificado({
  tipo,
  usuarioAutenticado,
  usuarioRol,
  filtroActivo = "recientes",
  categoriaActiva,
  onCambiarFiltro,
  onCambiarCategoria,
  categorias = [],
}: BtnFlotanteUnificadoProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [submenuFiltros, setSubmenuFiltros] = useState(false);
  const [submenuCategorias, setSubmenuCategorias] = useState(false);
  const [categoriasAbiertas, setCategoriasAbiertas] = useState<Set<string>>(
    new Set()
  );
  const { profile } = useAuth();
  const colorPersonalizado = profile?.color || "hsl(222.2, 47.4%, 11.2%)"; // Color por defecto

  // Validar si el usuario puede crear contenido (solo admin o redactor)
  const puedeCrear =
    usuarioAutenticado && (usuarioRol === "admin" || usuarioRol === "redactor");

  const toggleMenu = () => {
    const next = !menuAbierto;
    setMenuAbierto(next);
    if (!next) {
      // Al cerrar, limpiar submenús y expansiones
      setSubmenuCategorias(false);
      setCategoriasAbiertas(new Set());
    }
  };

  const toggleSubmenuCategorias = () => {
    setSubmenuCategorias(!submenuCategorias);
  };

  const toggleCategoria = (categoriaId: string) => {
    setCategoriasAbiertas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoriaId)) {
        newSet.delete(categoriaId);
      } else {
        newSet.add(categoriaId);
      }
      return newSet;
    });
  };

  // Configuración según el tipo de contenido
  const config = {
    noticias: {
      crearUrl: "/admin/noticias/crear",
      crearTexto: "Crear noticia",
      filtros: [
        { id: "recientes", label: "Recientes", icon: Clock },
        { id: "populares", label: "Populares", icon: TrendingUp },
        { id: "destacadas", label: "Destacadas", icon: Star },
        { id: "mas-comentadas", label: "Más comentadas", icon: MessageCircle },
      ],
    },
    foro: {
      crearUrl: "/foro/crear-hilo",
      crearTexto: "Crear hilo",
      filtros: [
        { id: "recientes", label: "Recientes", icon: Clock },
        { id: "populares", label: "Populares", icon: TrendingUp },
        { id: "sin_respuesta", label: "Sin respuesta", icon: MessageSquare },
        { id: "siguiendo", label: "Siguiendo", icon: Star },
        { id: "mios", label: "Mis hilos", icon: User },
      ],
    },
  };

  const currentConfig = config[tipo];

  const handleFiltroClick = (filtroId: string) => {
    if (onCambiarFiltro) {
      onCambiarFiltro(filtroId as any);
    }
    setMenuAbierto(false);
    setSubmenuCategorias(false);
  };

  const handleCategoriaClick = (categoriaId: string) => {
    if (onCambiarCategoria) {
      onCambiarCategoria(categoriaId);
    }
    setMenuAbierto(false);
    setSubmenuCategorias(false);
  };

  return (
    <>
      {/* Backdrop blur overlay */}
      <AnimatePresence>
        {menuAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setMenuAbierto(false)}
          />
        )}
      </AnimatePresence>

      <div className="md:hidden fixed bottom-24 right-6 z-50">
        {/* Menú principal */}
        <AnimatePresence>
          {menuAbierto && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-20 right-0 bg-white dark:bg-black rounded-xl shadow-2xl border border-gray-200 dark:border-black overflow-hidden min-w-[220px] max-h-[70vh] overflow-y-auto"
              style={
                {
                  "--color-personalizado": colorPersonalizado,
                  "--color-personalizado-10": `${colorPersonalizado}1a`,
                  "--color-personalizado-20": `${colorPersonalizado}33`,
                } as React.CSSProperties
              }
            >
              {/* Sección de Creación - Solo mostrar si puede crear */}
              {puedeCrear && (
                <div className="border-b border-gray-200 dark:border-black bg-gray-50 dark:bg-black">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Crear
                  </div>
                  <Link
                    href={currentConfig.crearUrl}
                    className="flex items-center w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
                    onClick={() => setMenuAbierto(false)}
                  >
                    <PlusIcon
                      size={18}
                      className="mr-3 text-primary dark:text-[var(--color-personalizado)] group-hover:opacity-90 transition-opacity"
                    />
                    <span className="font-medium">
                      {currentConfig.crearTexto}
                    </span>
                  </Link>
                </div>
              )}

              {/* Sección de Filtros */}
              <div className="border-b border-gray-200 dark:border-black">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Filtrar por
                </div>
                {currentConfig.filtros.map((filtro) => {
                  const Icon = filtro.icon;
                  const isActive = filtroActivo === filtro.id;
                  return (
                    <button
                      key={filtro.id}
                      onClick={() => handleFiltroClick(filtro.id)}
                      className={`flex items-center w-full px-4 py-2.5 text-left transition-colors group ${
                        isActive
                          ? "text-primary dark:text-[var(--color-personalizado)] bg-primary/10 dark:bg-[var(--color-personalizado-20)]"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <Icon
                        size={16}
                        className={`mr-3 ${
                          isActive
                            ? "opacity-100"
                            : "opacity-70 group-hover:opacity-100"
                        }`}
                        style={
                          isActive
                            ? { color: "var(--color-personalizado)" }
                            : {}
                        }
                      />
                      <span className={isActive ? "font-medium" : ""}>
                        {filtro.label}
                      </span>
                      {isActive && (
                        <div
                          className="ml-auto w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: "var(--color-personalizado)",
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sección de Categorías */}
              {categorias.length > 0 && (
                <div>
                  <button
                    onClick={toggleSubmenuCategorias}
                    className="flex items-center w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-b border-gray-200 dark:border-black group"
                  >
                    <Filter
                      size={16}
                      className={`mr-3 ${
                        submenuCategorias
                          ? "text-primary dark:text-[var(--color-personalizado)]"
                          : "opacity-70 group-hover:opacity-100"
                      }`}
                      style={
                        submenuCategorias
                          ? { color: "var(--color-personalizado)" }
                          : {}
                      }
                    />
                    <span
                      className={`font-medium flex-1 ${
                        submenuCategorias
                          ? "text-primary dark:text-[var(--color-personalizado)]"
                          : ""
                      }`}
                    >
                      Categorías
                    </span>
                    <ChevronRight
                      size={16}
                      className={`transition-transform ${
                        submenuCategorias
                          ? "rotate-90 text-primary dark:text-[var(--color-personalizado)]"
                          : "opacity-70 group-hover:opacity-100"
                      }`}
                      style={
                        submenuCategorias
                          ? { color: "var(--color-personalizado)" }
                          : {}
                      }
                    />
                  </button>

                  <AnimatePresence>
                    {submenuCategorias && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-gray-50 dark:bg-black"
                      >
                        {/* Opción "Todas" */}
                        <button
                          onClick={() => handleCategoriaClick("")}
                          className={`flex items-center w-full px-6 py-2.5 text-left text-sm transition-colors group ${
                            !categoriaActiva
                              ? "text-primary dark:text-[var(--color-personalizado)] bg-primary/10 dark:bg-[var(--color-personalizado-20)]"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                          }`}
                        >
                          <span
                            className={!categoriaActiva ? "font-medium" : ""}
                          >
                            Todas
                          </span>
                          {!categoriaActiva && (
                            <div
                              className="ml-auto w-1.5 h-1.5 rounded-full"
                              style={{
                                backgroundColor: "var(--color-personalizado)",
                              }}
                            />
                          )}
                        </button>

                        {/* Lista de categorías jerárquicas */}
                        {categorias
                          .filter((cat) => !cat.parent_id) // Solo categorías principales
                          .map((categoria) => {
                            const isActive = categoriaActiva === categoria.id;
                            const tieneSubcategorias =
                              categoria.subcategorias &&
                              categoria.subcategorias.length > 0;
                            const estaAbierta = categoriasAbiertas.has(
                              categoria.id
                            );

                            return (
                              <div key={categoria.id}>
                                {/* Categoría principal */}
                                <div className="flex items-center w-full">
                                  {tieneSubcategorias && (
                                    <button
                                      onClick={() =>
                                        toggleCategoria(categoria.id)
                                      }
                                      className="px-2 py-2.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                    >
                                      <ChevronRight
                                        size={14}
                                        className={`transition-transform ${
                                          estaAbierta ? "rotate-90" : ""
                                        } text-gray-500 dark:text-gray-400`}
                                      />
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleCategoriaClick(categoria.id)
                                    }
                                    className={`flex items-center flex-1 ${
                                      tieneSubcategorias ? "pl-2" : "pl-6"
                                    } pr-6 py-2.5 text-left text-sm transition-colors group ${
                                      isActive
                                        ? "text-primary dark:text-[var(--color-personalizado)] bg-primary/10 dark:bg-[var(--color-personalizado-20)]"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                                    }`}
                                  >
                                    {categoria.color && (
                                      <div
                                        className="w-2 h-2 rounded-full mr-2"
                                        style={{
                                          backgroundColor: categoria.color,
                                        }}
                                      />
                                    )}
                                    <span
                                      className={isActive ? "font-medium" : ""}
                                    >
                                      {categoria.nombre}
                                    </span>
                                    {isActive && (
                                      <div
                                        className="ml-auto w-1.5 h-1.5 rounded-full"
                                        style={{
                                          backgroundColor:
                                            "var(--color-personalizado)",
                                        }}
                                      />
                                    )}
                                  </button>
                                </div>

                                {/* Subcategorías */}
                                {tieneSubcategorias && estaAbierta && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden bg-gray-100 dark:bg-black/50"
                                  >
                                    {categoria.subcategorias!.map(
                                      (subcategoria) => {
                                        const isSubActive =
                                          categoriaActiva === subcategoria.id;
                                        return (
                                          <button
                                            key={subcategoria.id}
                                            onClick={() =>
                                              handleCategoriaClick(
                                                subcategoria.id
                                              )
                                            }
                                            className={`flex items-center w-full pl-12 pr-6 py-2 text-left text-sm transition-colors group ${
                                              isSubActive
                                                ? "text-primary dark:text-[var(--color-personalizado)] bg-primary/10 dark:bg-[var(--color-personalizado-20)]"
                                                : "text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
                                            }`}
                                          >
                                            {subcategoria.color && (
                                              <div
                                                className="w-1.5 h-1.5 rounded-full mr-2"
                                                style={{
                                                  backgroundColor:
                                                    subcategoria.color,
                                                }}
                                              />
                                            )}
                                            <span
                                              className={
                                                isSubActive ? "font-medium" : ""
                                              }
                                            >
                                              {subcategoria.nombre}
                                            </span>
                                            {isSubActive && (
                                              <div
                                                className="ml-auto w-1.5 h-1.5 rounded-full"
                                                style={{
                                                  backgroundColor:
                                                    "var(--color-personalizado)",
                                                }}
                                              />
                                            )}
                                          </button>
                                        );
                                      }
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            );
                          })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón principal */}
        <button
          onClick={toggleMenu}
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-black/80 hover:scale-110 active:scale-95 border-2"
          style={
            {
              borderColor: colorPersonalizado,
              "--color-personalizado": colorPersonalizado,
              "--color-personalizado-hover": `${colorPersonalizado}1a`,
            } as React.CSSProperties
          }
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
        >
          <motion.div
            animate={{ rotate: menuAbierto ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {menuAbierto ? (
              <X size={24} style={{ color: colorPersonalizado }} />
            ) : (
              <PlusIcon size={24} style={{ color: colorPersonalizado }} />
            )}
          </motion.div>
        </button>
      </div>
    </>
  );
}
