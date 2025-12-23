"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import type { Database } from "@/lib/database.types";

// Definición local del tipo Categoria basada en la estructura de la DB
type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  color: string | null;
  icono: string | null;
  orden: number | null;
  creado_en: string;
  actualizado_en: string | null;
  categoria_padre_id: string | null;
  parent_id?: string | null; // Alias para compatibilidad
  subcategorias?: Categoria[];
};

// Componente para un solo elemento de categoría, maneja la lógica de despliegue
const CategoryItem = ({
  category,
  isRoot = false,
}: {
  category: Categoria;
  isRoot?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { profile } = useAuth();

  // Persistir el estado de desplegado
  React.useEffect(() => {
    try {
      const key = `foro_cat_${category.id}_open`;
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        setIsOpen(saved === "true");
      }
    } catch (e) {
      console.error("Error accessing localStorage", e);
    }
  }, [category.id]);

  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    try {
      localStorage.setItem(`foro_cat_${category.id}_open`, String(newState));
    } catch (e) {
      // Ignore storage errors
    }
  };
  const hasSubcategories = !!(
    category.subcategorias && category.subcategorias.length > 0
  );
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detectar el modo oscuro solo en el cliente
  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    // Opcional: Escuchar cambios en el tema
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Función para obtener el color base sin opacidad
  const getBaseColor = (color: string) => {
    if (!color) return "#3b82f6";
    return color.includes("rgba")
      ? color.replace(/,\s*\d*\.?\d*\)$/, ")")
      : color;
  };

  // Función para convertir un color a versión pastel
  const toPastelColor = (color: string, isDarkMode = false) => {
    // Color azul pastel por defecto
    if (!color)
      return isDarkMode
        ? "rgba(191, 219, 254, 0.2)"
        : "rgba(191, 219, 254, 0.4)";

    // Extraer componentes RGB del color
    let r, g, b;

    // Manejar diferentes formatos de color
    if (color.startsWith("#")) {
      // Formato HEX
      const hex = color.replace("#", "");
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else if (color.startsWith("rgb")) {
      // Formato RGB o RGBA
      const parts = color.match(/\d+/g) || [];
      [r, g, b] = parts.map(Number);
    } else {
      // Color no reconocido, usar el azul pastel por defecto
      return isDarkMode
        ? "rgba(191, 219, 254, 0.2)"
        : "rgba(191, 219, 254, 0.4)";
    }

    // Convertir a versión pastel (aumentar luminosidad y reducir saturación)
    const pastelR = Math.round(r + (255 - r) * 0.7);
    const pastelG = Math.round(g + (255 - g) * 0.7);
    const pastelB = Math.round(b + (255 - b) * 0.7);

    // Ajustar opacidad según el modo
    const opacity = isDarkMode ? "0.2" : "0.4";

    return `rgba(${pastelR}, ${pastelG}, ${pastelB}, ${opacity})`;
  };

  // Usar el color del perfil o un color por defecto con efecto pastel
  const userColor = toPastelColor(profile?.color || "#3b82f6", isDarkMode);

  const catSlug = (category.slug || category.id).toLowerCase();
  const currentPath = pathname?.toLowerCase() || "";
  // Verificar si la ruta actual coincide exactamente con la categoría o es una subruta
  const isActive =
    currentPath === `/foro/categoria/${catSlug}` ||
    (currentPath.startsWith(`/foro/categoria/${catSlug}/`) &&
      catSlug !== "todas");
  const isHome = currentPath === "/foro" && isRoot;

  return (
    <li className="mb-1">
      <motion.div
        className="flex items-center w-full"
        whileHover={{
          backgroundColor: userColor.replace(/\d(\.\d+)?\)$/, (opacity) => {
            const current = parseFloat(opacity);
            return `${Math.min(current + 0.15, 0.6)})`;
          }),
          transition: { duration: 0.15 },
        }}
        whileTap={{ scale: 0.98 }}
      >
        <Link
          href={isRoot ? "/foro" : `/foro/categoria/${catSlug}`}
          className={
            `flex-grow px-4 py-2 text-sm transition-all duration-150 outline-none ` +
            `relative ${isActive || isHome ? "ml-[-4px] pl-[12px]" : ""} ` +
            `${
              isActive || isHome
                ? "font-medium"
                : "text-gray-700 dark:text-gray-300"
            }`
          }
          style={
            {
              ...(isActive || isHome
                ? {
                    borderLeft: "4px solid",
                    borderLeftColor: getBaseColor(profile?.color || "#3b82f6"),
                    color: getBaseColor(profile?.color || "#3b82f6"),
                    "--tw-text-opacity": "1",
                    "--tw-border-opacity": "1",
                    borderTopRightRadius: "0.375rem",
                    borderBottomRightRadius: "0.375rem",
                  }
                : {
                    borderLeft: "none",
                    color: "inherit",
                  }),
              backgroundColor: "transparent",
            } as React.CSSProperties
          }
        >
          <span className="truncate">{category.nombre}</span>
        </Link>

        {hasSubcategories && (
          <button
            type="button"
            aria-label={
              isOpen ? "Colapsar subcategorías" : "Expandir subcategorías"
            }
            aria-expanded={isOpen}
            onClick={toggleOpen}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 transition-transform duration-200 ${
                isOpen ? "rotate-90" : ""
              }`}
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {hasSubcategories && isOpen && (
          <motion.ul
            className="ml-2 mt-1 origin-top"
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            animate={{
              opacity: 1,
              height: "auto",
              transition: { duration: 0.2, ease: "easeInOut" },
            }}
            exit={{
              opacity: 0,
              height: 0,
              transition: { duration: 0.15, ease: "easeInOut" },
            }}
          >
            {category.subcategorias?.map((sub) => (
              // Renderizar recursivamente para soportar 3 niveles
              <CategoryItem key={sub.id} category={sub} isRoot={false} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
};

// Props para el componente principal del Sidebar
interface ForoSidebarProps {
  categorias: Categoria[];
}

export default function ForoSidebar({ categorias = [] }: ForoSidebarProps) {
  const [query, setQuery] = useState("");

  // Log para depuración
  React.useEffect(() => {
    console.log("Categorías recibidas en ForoSidebar:", categorias);
    if (categorias.length === 0) {
      console.warn("No se recibieron categorías en el componente ForoSidebar");
    }
  }, [categorias]);

  const nestedCategorias = useMemo(() => {
    if (!categorias || categorias.length === 0) {
      console.warn("No hay categorías para procesar en nestedCategorias");
      return [];
    }

    console.log("[ForoSidebar] Categorías recibidas (raw):", categorias);
    console.log("[ForoSidebar] Primera categoría estructura:", categorias[0]);

    // Si las categorías ya vienen con subcategorias (árbol construido), usarlas directamente
    const yaEsArbol = categorias.some((c) => c.subcategorias !== undefined);
    console.log("[ForoSidebar] ¿Ya es árbol?:", yaEsArbol);

    let tree: Categoria[];

    if (yaEsArbol) {
      // Ya viene organizado jerárquicamente desde el servidor
      tree = categorias;
      console.log("[ForoSidebar] Usando árbol existente, raíces:", tree.length);
    } else {
      // Necesita reorganización (categorías planas)
      const parents = categorias.filter(
        (c) => !c.categoria_padre_id && !c.parent_id
      );
      console.log(
        "[ForoSidebar] Categorías padre encontradas:",
        parents.length
      );

      const childrenByParent = new Map<string, Categoria[]>();
      for (const child of categorias) {
        const parentId = child.categoria_padre_id || child.parent_id;
        if (parentId) {
          const list = childrenByParent.get(parentId) || [];
          list.push(child);
          childrenByParent.set(parentId, list);
        }
      }

      tree = parents.map((parent) => ({
        ...parent,
        subcategorias: childrenByParent.get(parent.id) || [],
      }));
    }

    // Log de subcategorías
    tree.forEach((cat) => {
      if (cat.subcategorias && cat.subcategorias.length > 0) {
        console.log(
          `[ForoSidebar] Categoría "${cat.nombre}" tiene ${cat.subcategorias.length} subcategorías:`,
          cat.subcategorias.map((s) => s.nombre)
        );
      }
    });

    if (!query.trim()) return tree;
    const q = query.toLowerCase();
    // Filtra manteniendo padres que coincidan o aquellos con subcategorías coincidentes
    return tree
      .map((p) => {
        const matchParent = p.nombre?.toLowerCase().includes(q);
        const filteredSubs = (p.subcategorias || []).filter((s) =>
          s.nombre?.toLowerCase().includes(q)
        );
        if (matchParent) return { ...p, subcategorias: filteredSubs };
        if (filteredSubs.length > 0)
          return { ...p, subcategorias: filteredSubs };
        return null;
      })
      .filter(Boolean) as Categoria[];
  }, [categorias, query]);

  // Crear un objeto de categoría especial para "Todas las categorías"
  const todasLasCategorias = useMemo<Categoria>(
    () => ({
      id: "todas",
      nombre: "Todas las categorías",
      slug: "todas",
      descripcion: "Todas las categorías del foro",
      color: "#3B82F6",
      icono: "grid",
      orden: 0,
      creado_en: new Date().toISOString(),
      actualizado_en: null,
      categoria_padre_id: null,
      parent_id: null, // Alias para compatibilidad
      subcategorias: [],
    }),
    []
  );

  return (
    <aside className="sticky top-[var(--header-height)] h-[calc(100vh-var(--header-height))] hidden lg:flex lg:flex-col w-56 flex-shrink-0 bg-white dark:bg-black py-0">
      <div className="pt-8 px-4">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
          Categorías
        </h2>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-1">
          <CategoryItem
            key="todas"
            category={todasLasCategorias}
            isRoot={true}
          />
          {nestedCategorias.map((cat) => (
            <CategoryItem key={cat.id} category={cat} />
          ))}

          {nestedCategorias.length === 0 && (
            <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              No se encontraron categorías
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
