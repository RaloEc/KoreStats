"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  PlusIcon,
  X,
  Clock,
  TrendingUp,
  MessageSquare,
  Star,
  User,
  FileText,
  ChevronRight,
  Filter,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

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

interface BtnFlotanteInteligente {
  // Props específicas de noticias
  filtroNoticiasActivo?: FiltroNoticias;
  categoriaNoticiasActiva?: string;
  onCambiarFiltroNoticias?: (filtro: FiltroNoticias) => void;
  onCambiarCategoriaNoticias?: (categoriaId: string) => void;
  // Props para personalización
  customCrearUrl?: string;
  extraOpciones?: {
    id: string;
    label: string;
    icon: any;
    onClick: () => void;
  }[];
  categoriasNoticias?: Categoria[];

  // Props específicas de foro
  filtroForoActivo?: FiltroForo;
  categoriaForoActiva?: string;
  onCambiarFiltroForo?: (filtro: FiltroForo) => void;
  onCambiarCategoriaForo?: (categoriaId: string) => void;
  categoriasForo?: Categoria[];
}

export default function BtnFlotanteInteligente({
  filtroNoticiasActivo = "recientes",
  categoriaNoticiasActiva = "",
  onCambiarFiltroNoticias,
  onCambiarCategoriaNoticias,
  customCrearUrl,
  extraOpciones = [],
  categoriasNoticias = [],
  filtroForoActivo = "recientes",
  categoriaForoActiva,
  onCambiarFiltroForo,
  onCambiarCategoriaForo,
  categoriasForo = [],
}: BtnFlotanteInteligente) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [submenuCategorias, setSubmenuCategorias] = useState(false);
  const [categoriasAbiertas, setCategoriasAbiertas] = useState<Set<string>>(
    new Set()
  );

  const colorPersonalizado = profile?.color || "hsl(222.2, 47.4%, 11.2%)";
  const isAdmin = profile?.role === "admin";
  const isRedactor = profile?.role === "redactor";
  const puedeCrearNoticia = isAdmin || isRedactor;

  // Detectar en qué página estamos
  const enNoticias = pathname?.startsWith("/noticias") || false;
  const enForo = pathname?.startsWith("/foro") || false;
  const enOtraPagina = !enNoticias && !enForo;

  // Detectar si estamos en una página de creación/edición
  const enPaginaCreacion =
    pathname?.includes("/crear") ||
    pathname?.includes("/editar") ||
    pathname?.includes("/crear-hilo") ||
    false;

  // No mostrar el botón en páginas de creación
  if (enPaginaCreacion) {
    return null;
  }

  // Detectar PWA
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsPWA(isStandalone);
  }, []);

  if (isPWA) {
    return null;
  }

  // Prevención de doble renderizado:
  // Si estamos en /foro o /noticias, la página debe renderizar su propio botón con estado.
  // Si esta instancia NO tiene callbacks (es la global del layout), no debe renderizarse.
  const isGlobalInstance =
    !onCambiarFiltroNoticias &&
    !onCambiarFiltroForo &&
    !onCambiarCategoriaNoticias &&
    !onCambiarCategoriaForo;

  if ((enForo || enNoticias) && isGlobalInstance) {
    return null;
  }

  const toggleMenu = () => {
    const next = !menuAbierto;
    setMenuAbierto(next);
    if (!next) {
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

  // Configuración dinámica según la página
  const getConfig = () => {
    if (enNoticias) {
      return {
        tipo: "noticias" as const,
        filtros: [
          { id: "recientes", label: "Recientes", icon: Clock },
          { id: "populares", label: "Populares", icon: TrendingUp },
          { id: "destacadas", label: "Destacadas", icon: Star },
          {
            id: "mas-comentadas",
            label: "Más comentadas",
            icon: MessageCircle,
          },
        ],
        categorias: categoriasNoticias,
        filtroActivo: filtroNoticiasActivo,
        categoriaActiva: categoriaNoticiasActiva,
        onCambiarFiltro: onCambiarFiltroNoticias,
        onCambiarCategoria: onCambiarCategoriaNoticias,
        mostrarCrear: puedeCrearNoticia,
        crearUrl: customCrearUrl || "/admin/noticias/crear",
        crearTexto: "Crear noticia",
        crearIcon: FileText,
        extraOpciones,
      };
    } else if (enForo) {
      return {
        tipo: "foro" as const,
        filtros: [
          { id: "recientes", label: "Recientes", icon: Clock },
          { id: "populares", label: "Populares", icon: TrendingUp },
          { id: "sin_respuesta", label: "Sin respuesta", icon: MessageSquare },
          ...(user
            ? [
                { id: "siguiendo", label: "Siguiendo", icon: Star },
                { id: "mios", label: "Mis hilos", icon: User },
              ]
            : []),
        ],
        categorias: categoriasForo,
        filtroActivo: filtroForoActivo,
        categoriaActiva: categoriaForoActiva,
        onCambiarFiltro: onCambiarFiltroForo,
        onCambiarCategoria: onCambiarCategoriaForo,
        mostrarCrear: !!user,
        crearUrl: customCrearUrl || "/foro/crear-hilo",
        crearTexto: "Crear hilo",
        crearIcon: MessageSquare,
        extraOpciones,
      };
    } else {
      // Otras páginas: solo opciones de creación
      return {
        tipo: "general" as const,
        filtros: [],
        categorias: [],
        filtroActivo: null,
        categoriaActiva: null,
        onCambiarFiltro: null,
        onCambiarCategoria: null,
        mostrarCrear: true,
        opciones: [
          ...(puedeCrearNoticia
            ? [
                {
                  id: "noticia",
                  label: "Crear noticia",
                  icon: FileText,
                  href: "/admin/noticias/crear",
                },
              ]
            : []),
          {
            id: "hilo",
            label: "Crear hilo",
            icon: MessageSquare,
            href: "/foro/crear-hilo",
          },
        ],
      };
    }
  };

  const config = getConfig();

  const handleFiltroClick = (filtroId: string) => {
    if (config.onCambiarFiltro) {
      config.onCambiarFiltro(filtroId as any);
    }
    setMenuAbierto(false);
    setSubmenuCategorias(false);
  };

  const handleCategoriaClick = (categoriaId: string) => {
    if (config.onCambiarCategoria) {
      config.onCambiarCategoria(categoriaId);
    }
    setMenuAbierto(false);
    setSubmenuCategorias(false);
  };

  // Si estamos en otra página y no hay opciones para mostrar, no renderizar nada
  if (enOtraPagina && config.opciones && config.opciones.length === 0) {
    return null;
  }

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

      <div className="md:hidden fixed bottom-16 right-6 z-50">
        {/* Menú principal */}
        <AnimatePresence>
          {menuAbierto && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-20 right-0 bg-white dark:bg-zinc-950 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden min-w-[220px] max-h-[70vh] overflow-y-auto"
              style={
                {
                  "--color-personalizado": colorPersonalizado,
                  "--color-personalizado-10": `${colorPersonalizado}1a`,
                  "--color-personalizado-20": `${colorPersonalizado}33`,
                } as React.CSSProperties
              }
            >
              {/* Modo: Otras páginas (solo opciones de creación) */}
              {enOtraPagina && config.opciones && (
                <div className="py-1">
                  {config.opciones.map((opcion) => (
                    <Link
                      key={opcion.id}
                      href={opcion.href}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group"
                      onClick={() => setMenuAbierto(false)}
                    >
                      <opcion.icon
                        size={18}
                        className="mr-3 text-gray-600 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors"
                      />
                      <span className="font-medium">{opcion.label}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Modo: Noticias o Foro (filtros + categorías) */}
              {!enOtraPagina && (
                <>
                  {/* Sección de Creación */}
                  {config.mostrarCrear && config.crearUrl && (
                    <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-zinc-900/50">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Crear
                      </div>
                      <Link
                        href={config.crearUrl}
                        className="flex items-center w-full px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group"
                        onClick={() => setMenuAbierto(false)}
                      >
                        {config.crearIcon && (
                          <config.crearIcon
                            size={18}
                            className="mr-3 text-gray-600 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors"
                          />
                        )}
                        <span className="font-medium">{config.crearTexto}</span>
                      </Link>
                    </div>
                  )}

                  {/* Opciones Extra (inyectadas) */}
                  {config.extraOpciones && config.extraOpciones.length > 0 && (
                    <div className="border-b border-gray-200 dark:border-gray-800">
                      {config.extraOpciones.map((opcion) => (
                        <button
                          key={opcion.id}
                          onClick={() => {
                            opcion.onClick();
                            setMenuAbierto(false);
                          }}
                          className="flex items-center w-full px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group"
                        >
                          <opcion.icon
                            size={18}
                            className="mr-3 text-gray-600 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors"
                          />
                          <span className="font-medium">{opcion.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sección de Filtros */}
                  {config.filtros.length > 0 && (
                    <div className="border-b border-gray-200 dark:border-gray-800">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Filtrar por
                      </div>
                      {config.filtros.map((filtro) => {
                        const Icon = filtro.icon;
                        const isActive = config.filtroActivo === filtro.id;
                        return (
                          <button
                            key={filtro.id}
                            onClick={() => handleFiltroClick(filtro.id)}
                            className={`flex items-center w-full px-4 py-2.5 text-left transition-colors group ${
                              isActive
                                ? "text-primary dark:text-white bg-primary/10 dark:bg-white/10"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                            }`}
                          >
                            <Icon
                              size={16}
                              className={`mr-3 ${
                                isActive
                                  ? "opacity-100 text-primary dark:text-white"
                                  : "opacity-70 group-hover:opacity-100 dark:group-hover:text-white"
                              }`}
                              style={isActive ? {} : {}}
                            />
                            <span className={isActive ? "font-medium" : ""}>
                              {filtro.label}
                            </span>
                            {isActive && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary dark:bg-white" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Sección de Categorías */}
                  {config.categorias && config.categorias.length > 0 && (
                    <div>
                      <button
                        onClick={toggleSubmenuCategorias}
                        className="flex items-center w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-b border-gray-200 dark:border-gray-800 group"
                      >
                        <Filter
                          size={16}
                          className={`mr-3 ${
                            submenuCategorias
                              ? "text-primary dark:text-white"
                              : "opacity-70 group-hover:opacity-100 dark:group-hover:text-white"
                          }`}
                        />
                        <span
                          className={`font-medium flex-1 ${
                            submenuCategorias
                              ? "text-primary dark:text-white"
                              : ""
                          }`}
                        >
                          Categorías
                        </span>
                        <ChevronRight
                          size={16}
                          className={`transition-transform ${
                            submenuCategorias
                              ? "rotate-90 text-primary dark:text-white"
                              : "opacity-70 group-hover:opacity-100"
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {submenuCategorias && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-gray-50 dark:bg-zinc-900/50"
                          >
                            {/* Opción "Todas" */}
                            <button
                              onClick={() => handleCategoriaClick("")}
                              className={`flex items-center w-full px-6 py-2.5 text-left text-sm transition-colors group ${
                                !config.categoriaActiva
                                  ? "text-primary dark:text-white bg-primary/10 dark:bg-white/10"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                              }`}
                            >
                              <span
                                className={
                                  !config.categoriaActiva ? "font-medium" : ""
                                }
                              >
                                Todas
                              </span>
                              {!config.categoriaActiva && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary dark:bg-white" />
                              )}
                            </button>

                            {/* Lista de categorías */}
                            {config.categorias
                              .filter((cat) => !cat.parent_id)
                              .map((categoria) => {
                                const isActive =
                                  config.categoriaActiva === categoria.id;
                                const tieneSubcategorias =
                                  categoria.subcategorias &&
                                  categoria.subcategorias.length > 0;
                                const estaAbierta = categoriasAbiertas.has(
                                  categoria.id
                                );

                                return (
                                  <div key={categoria.id}>
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
                                            ? "text-primary dark:text-white bg-primary/10 dark:bg-white/10"
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
                                          className={
                                            isActive ? "font-medium" : ""
                                          }
                                        >
                                          {categoria.nombre}
                                        </span>
                                        {isActive && (
                                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary dark:bg-white" />
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
                                              config.categoriaActiva ===
                                              subcategoria.id;
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
                                                    ? "text-primary dark:text-white bg-primary/10 dark:bg-white/10"
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
                                                    isSubActive
                                                      ? "font-medium"
                                                      : ""
                                                  }
                                                >
                                                  {subcategoria.nombre}
                                                </span>
                                                {isSubActive && (
                                                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary dark:bg-white" />
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
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón principal */}
        <button
          onClick={toggleMenu}
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 
            bg-white dark:bg-black 
            border-2 border-gray-700 dark:border-gray-300
            hover:bg-gray-50 dark:hover:bg-zinc-900 
            hover:scale-110 active:scale-95"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
        >
          <motion.div
            animate={{ rotate: menuAbierto ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {menuAbierto ? (
              <X size={24} className="text-gray-700 dark:text-white" />
            ) : (
              <PlusIcon size={24} className="text-gray-700 dark:text-white" />
            )}
          </motion.div>
        </button>
      </div>
    </>
  );
}
