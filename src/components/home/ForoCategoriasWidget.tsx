"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  color: string | null;
  icono: string | null;
  orden: number | null;
  es_activa: boolean | null;
  nivel: number | null;
  parent_id: string | null;
  hilos_count?: number;
  subcategorias?: Categoria[];
  abierta?: boolean;
};

interface ForoCategoriasWidgetProps {
  initialCategorias?: Categoria[];
}

export default function ForoCategoriasWidget({
  initialCategorias,
}: ForoCategoriasWidgetProps) {
  const [categorias, setCategorias] = useState<Categoria[]>(
    initialCategorias || []
  );
  const [loading, setLoading] = useState(!initialCategorias);

  const toggleCategoria = (id: string) => {
    setCategorias((prev) =>
      prev.map((cat) => ({
        ...cat,
        abierta: cat.id === id ? !cat.abierta : cat.abierta,
        subcategorias: cat.subcategorias?.map((sub) => ({
          ...sub,
          abierta: sub.id === id ? !sub.abierta : sub.abierta,
        })),
      }))
    );
  };

  useEffect(() => {
    if (initialCategorias) {
      setLoading(false);
      return;
    }

    const fetchCategorias = async () => {
      try {
        const supabase = createClient();
        const supabaseUrlSafe = (
          process.env.NEXT_PUBLIC_SUPABASE_URL || ""
        ).replace(/^(https?:\/\/)/, "");
        console.info("[ForoCategoriasWidget] Iniciando carga de categorías", {
          supabaseUrl: supabaseUrlSafe,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          ts: new Date().toISOString(),
        });

        // Primero obtenemos todas las categorías activas
        const { data: todasCategorias, error } = await supabase
          .from("foro_categorias")
          .select(
            `
            id, 
            nombre, 
            slug, 
            descripcion, 
            color, 
            icono,
            orden,
            es_activa,
            nivel,
            parent_id
          `
          )
          .eq("es_activa", true) // Solo categorías activas
          .order("orden", { ascending: true });

        if (error) {
          console.error(
            "[ForoCategoriasWidget] Error al cargar foro_categorias:",
            {
              message: (error as any)?.message,
              code: (error as any)?.code,
              details: (error as any)?.details,
              hint: (error as any)?.hint,
            }
          );
          throw error;
        }

        // Función recursiva para construir el árbol de categorías
        const construirArbol = (
          parentId: string | null = null
        ): Categoria[] => {
          return (todasCategorias || [])
            .filter((cat) => cat.parent_id === parentId)
            .map((cat) => ({
              ...cat,
              abierta: false, // Por defecto cerrado
              subcategorias: construirArbol(cat.id),
            }));
        };

        // Obtenemos solo las categorías principales (primer nivel)
        const categoriasPrincipales = construirArbol(null).slice(0, 6); // Limitamos a 6 categorías principales
        console.info(
          "[ForoCategoriasWidget] Categorías principales construidas:",
          {
            count: categoriasPrincipales.length,
            sample: categoriasPrincipales
              .slice(0, Math.min(3, categoriasPrincipales.length))
              .map((c) => ({ id: c.id, nombre: c.nombre })),
          }
        );

        if (error) {
          console.error("Error al cargar categorías:", error);
          return;
        }

        // Ahora obtenemos el conteo de hilos para cada categoría
        if (categoriasPrincipales && categoriasPrincipales.length > 0) {
          // Función recursiva para aplanar el árbol y obtener todos los IDs
          const obtenerTodosLosIds = (categorias: Categoria[]): string[] => {
            return categorias.reduce<string[]>((ids, cat) => {
              return [
                ...ids,
                cat.id,
                ...(cat.subcategorias
                  ? obtenerTodosLosIds(cat.subcategorias)
                  : []),
              ];
            }, []);
          };

          const todosLosIds = obtenerTodosLosIds(categoriasPrincipales);

          // Obtenemos el conteo de hilos para cada categoría individualmente
          // ya que Supabase no soporta GROUP BY con múltiples categorías en una sola consulta
          const conteos = await Promise.all(
            todosLosIds.map(async (id) => {
              const { count, error } = await supabase
                .from("foro_hilos")
                .select("*", { count: "exact", head: true })
                .eq("categoria_id", id)
                .is("deleted_at", null);

              if (error) {
                console.error(
                  `[ForoCategoriasWidget] Error al contar hilos para categoría ${id}:`,
                  error
                );
                return { categoria_id: id, count: 0 };
              }

              return { categoria_id: id, count: count || 0 };
            })
          );

          // Función para actualizar los conteos en el árbol
          const actualizarConteos = (categorias: Categoria[]): Categoria[] => {
            return categorias.map((cat) => {
              const conteo = conteos?.find((c) => c.categoria_id === cat.id);
              return {
                ...cat,
                hilos_count: conteo ? parseInt(conteo.count as any) : 0,
                subcategorias: cat.subcategorias
                  ? actualizarConteos(cat.subcategorias)
                  : [],
              };
            });
          };

          const categoriasConConteos = actualizarConteos(categoriasPrincipales);
          console.info("[ForoCategoriasWidget] Árbol final con conteos:", {
            roots: categoriasConConteos.length,
            sample: categoriasConConteos
              .slice(0, Math.min(3, categoriasConConteos.length))
              .map((c) => ({
                id: c.id,
                nombre: c.nombre,
                subCount: c.subcategorias?.length || 0,
              })),
          });
          setCategorias(categoriasConConteos);
        } else {
          setCategorias([]);
        }
      } catch (error) {
        console.error(
          "[ForoCategoriasWidget] Error general al cargar categorías:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCategorias();
  }, []);

  // Función para obtener un color de fondo con opacidad
  const getBgColor = (color: string | null) => {
    if (!color) return "rgba(59, 130, 246, 0.1)"; // Azul por defecto

    // Si es un color hex, convertirlo a RGB con opacidad
    if (color.startsWith("#")) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.1)`;
    }

    // Si ya es RGB/RGBA, ajustar opacidad
    if (color.startsWith("rgb")) {
      return color.replace(/rgba?\((.+?)(,\s*[\d.]+)?\)/, "rgba($1, 0.1)");
    }

    return "rgba(59, 130, 246, 0.1)";
  };

  // Si está cargando, mostrar skeleton
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            Categorías del Foro
          </h3>
        </div>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-md"
            />
          ))}
        </div>
      </div>
    );
  }

  if (categorias.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No hay categorías disponibles
      </p>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
          Categorías del Foro
        </h3>
        <Link
          href="/foro"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Ver todas
        </Link>
      </div>
      <div className="space-y-1">
        {categorias.map((categoria) => (
          <div key={categoria.id} className="rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={() => toggleCategoria(categoria.id)}
            >
              <div className="flex items-center space-x-2 flex-1">
                {categoria.icono && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: categoria.color || "#3b82f6" }}
                  >
                    <i className={categoria.icono}></i>
                  </div>
                )}
                <span className="font-medium">{categoria.nombre}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {categoria.hilos_count || 0}
                </span>
                {categoria.subcategorias &&
                  categoria.subcategorias.length > 0 && (
                    <motion.span
                      animate={{ rotate: categoria.abierta ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </motion.span>
                  )}
              </div>
            </div>

            {/* Subcategorías */}
            {categoria.subcategorias && categoria.subcategorias.length > 0 && (
              <motion.div
                initial={false}
                animate={{
                  height: categoria.abierta ? "auto" : 0,
                  opacity: categoria.abierta ? 1 : 0.8,
                  scale: categoria.abierta ? 1 : 0.95,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden pl-8"
              >
                <div className="space-y-1 py-1">
                  {categoria.subcategorias.map((subcategoria) => (
                    <Link
                      key={subcategoria.id}
                      href={`/foro/categoria/${subcategoria.slug}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        {subcategoria.icono && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                            style={{
                              backgroundColor: subcategoria.color || "#3b82f6",
                            }}
                          >
                            <i className={subcategoria.icono}></i>
                          </div>
                        )}
                        <span>{subcategoria.nombre}</span>
                      </div>
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                        {subcategoria.hilos_count || 0}
                      </span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
