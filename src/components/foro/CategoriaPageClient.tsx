"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CategoriaHeader from "./CategoriaHeader";
import { CategoriaFiltersState } from "./CategoriaFilters";
import SubcategoriasDestacadas from "./SubcategoriasDestacadas";
import HilosLista, { HiloDTO } from "./HilosLista";
import FloatingCreateButton from "./FloatingCreateButton";

import CategoriaFiltrosDesktop from "./CategoriaFiltrosDesktop";
import CategoriaFiltrosBtnFlotante from "./CategoriaFiltrosBtnFlotante";
import CategoriaFiltrosModal from "./CategoriaFiltrosModal";
import AdRectangle from "@/components/ads/AdRectangle";

type Categoria = {
  id: string;
  slug: string | null;
  nombre: string | null;
  descripcion: string | null;
  imagen_url?: string | null;
  parent_id?: string | null;
  nivel?: number | null;
  color?: string | null;
};

type TagsDTO = { id: string; nombre: string; slug: string };

type CategoriaMeta = {
  categoria: Categoria;
  subcategorias: Categoria[];
  tags: TagsDTO[];
};

type Props = {
  categoria: Categoria;
  searchParams?: Record<string, string | string[]>;
  initialFilters?: Partial<CategoriaFiltersState>;
};

export default function CategoriaPageClient({
  categoria,
  searchParams,
  initialFilters,
}: Props) {
  const [meta, setMeta] = useState<CategoriaMeta | null>(null);
  const [hilos, setHilos] = useState<HiloDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [modalFiltrosAbierto, setModalFiltrosAbierto] = useState(false);
  const [filters, setFilters] = useState<CategoriaFiltersState>({
    subcategoriaId:
      typeof searchParams?.sub === "string" ? searchParams?.sub : undefined,
    tags:
      typeof searchParams?.tags === "string"
        ? searchParams?.tags.split(",")
        : [],
    estado:
      typeof searchParams?.estado === "string"
        ? searchParams?.estado
        : undefined,
    popularidad:
      typeof searchParams?.pop === "string" ? searchParams?.pop : undefined,
    fechaFrom:
      typeof searchParams?.from === "string" ? searchParams?.from : undefined,
    fechaTo:
      typeof searchParams?.to === "string" ? searchParams?.to : undefined,
    destacados: searchParams?.destacado === "true",
    orderBy: (typeof searchParams?.order === "string"
      ? searchParams?.order
      : "ultimo") as CategoriaFiltersState["orderBy"],
    ...initialFilters,
  });

  const observerRef = useRef<HTMLDivElement | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("categoriaSlug", categoria.slug || categoria.id);
    if (filters.subcategoriaId)
      params.set("subcategoriaId", String(filters.subcategoriaId));
    if (filters.tags && filters.tags.length)
      params.set("tags", filters.tags.join(","));
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.popularidad) params.set("popularidad", filters.popularidad);
    if (filters.fechaFrom) params.set("from", filters.fechaFrom);
    if (filters.fechaTo) params.set("to", filters.fechaTo);
    if (filters.destacados) params.set("destacado", "true");
    if (filters.orderBy) params.set("orderBy", filters.orderBy);
    params.set("limit", "20");
    params.set("offset", String(page * 20));
    return params.toString();
  }, [categoria.slug, categoria.id, filters, page]);

  useEffect(() => {
    let cancelled = false;
    const loadMeta = async () => {
      try {
        const res = await fetch(
          `/api/foro/categorias/${categoria.slug || categoria.id}`
        );
        const json = await res.json();
        if (!cancelled) setMeta(json.data);
      } catch (e) {
        if (!cancelled) setMeta({ categoria, subcategorias: [], tags: [] });
      }
    };
    loadMeta();
  }, [categoria]);

  const fetchHilos = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(0);
      } else {
        setIsFetchingMore(true);
      }
      const res = await fetch(`/api/foro/hilos?${queryString}`);
      const json = await res.json();
      const items: HiloDTO[] = (json.hilos || json.items || []).map(
        (hilo: any) => ({
          ...hilo,
          // Transformar 'perfiles' a 'autor' para compatibilidad con HiloItem
          autor: hilo.perfiles || hilo.autor,
          // Transformar 'foro_categorias' a 'subcategoria' para compatibilidad con HiloItem
          subcategoria: hilo.foro_categorias
            ? {
                id: hilo.id,
                nombre: hilo.foro_categorias.nombre,
                slug: hilo.foro_categorias.slug,
                color: hilo.foro_categorias.color,
              }
            : undefined,
          // Asegurar que respuestas_count tenga el valor correcto
          respuestas_count: hilo.respuestas_conteo,
          votos: hilo.votos_conteo,
          vistas: hilo.vistas,
        })
      );

      // Eliminar duplicados antes de actualizar el estado
      const procesarHilosSinDuplicados = (
        nuevosHilos: HiloDTO[],
        hilosExistentes: HiloDTO[] = []
      ) => {
        const idsVistos = new Set(hilosExistentes.map((h) => h.id));
        const hilosFiltrados = nuevosHilos.filter((hilo) => {
          // Si ya vimos este ID, es un duplicado
          if (idsVistos.has(hilo.id)) {
            console.warn(
              `Hilo duplicado detectado y eliminado: ${hilo.id} - ${hilo.titulo}`
            );
            return false;
          }
          // Si no, lo marcamos como visto y lo mantenemos
          idsVistos.add(hilo.id);
          return true;
        });
        return hilosFiltrados;
      };

      if (reset) {
        // En reset, solo filtramos los nuevos items
        const hilosFiltrados = procesarHilosSinDuplicados(items);
        setHilos(hilosFiltrados);
      } else {
        // En append, filtramos considerando los hilos que ya tenemos
        setHilos((prev) => {
          const hilosFiltrados = procesarHilosSinDuplicados(items, prev);
          return [...prev, ...hilosFiltrados];
        });
      }
      setHasMore(items.length === 20);
    } catch (e: any) {
      setError(e?.message || "Error al cargar hilos");
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  // Función para aplicar filtros
  const aplicarFiltros = () => {
    setPage(0);
    fetchHilos(true);
  };

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setFilters({
      subcategoriaId: undefined,
      tags: [],
      estado: undefined,
      popularidad: undefined,
      fechaFrom: undefined,
      fechaTo: undefined,
      destacados: false,
      orderBy: "ultimo",
    });
  };

  useEffect(() => {
    // reset page when filters change
    setPage(0);
    fetchHilos(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    if (!observerRef.current) return;
    const el = observerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isFetchingMore) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [hasMore, isFetchingMore]);

  useEffect(() => {
    if (page > 0) fetchHilos(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="bg-white dark:bg-black amoled:bg-black min-h-screen">
      <div className="container mx-auto px-2 sm:px-3 lg:px-4 py-6 lg:py-8">
        <CategoriaHeader categoria={meta?.categoria || categoria} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <div className="lg:col-span-8 space-y-6 bg-white dark:bg-black amoled:bg-black rounded-lg">
            <SubcategoriasDestacadas
              subcategorias={meta?.subcategorias || []}
              currentId={categoria.id}
            />
            <CategoriaFiltrosDesktop
              tags={meta?.tags || []}
              value={filters}
              onChange={setFilters}
              onAplicarFiltros={aplicarFiltros}
              onLimpiarFiltros={limpiarFiltros}
            />
            <HilosLista hilos={hilos} loading={loading} />
            <div ref={observerRef} />
          </div>
          <aside className="lg:col-span-4 space-y-6 hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <AdRectangle />

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-4 shadow-sm">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="text-blue-500">ℹ️</span> Información / Reglas
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  En esta categoría comparte contenido relevante. Respeta las
                  normas y usa etiquetas apropiadas. Si tu post es una pregunta,
                  añade detalles para recibir mejores respuestas.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <FloatingCreateButton categoriaId={categoria.id} />

      {/* Botón flotante para filtros en móvil */}
      <CategoriaFiltrosBtnFlotante
        modalAbierto={modalFiltrosAbierto}
        onAbrirModal={() => setModalFiltrosAbierto(true)}
        hayFiltrosActivos={
          filters.tags.length > 0 ||
          filters.estado !== undefined ||
          filters.popularidad !== undefined ||
          filters.fechaFrom !== undefined ||
          filters.fechaTo !== undefined ||
          filters.destacados === true
        }
      />

      {/* Modal de filtros para móvil */}
      <CategoriaFiltrosModal
        isOpen={modalFiltrosAbierto}
        onClose={() => setModalFiltrosAbierto(false)}
        tags={meta?.tags || []}
        value={filters}
        onChange={setFilters}
        onAplicarFiltros={aplicarFiltros}
        onLimpiarFiltros={limpiarFiltros}
      />
    </div>
  );
}
