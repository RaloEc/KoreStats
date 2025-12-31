"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useInView } from "react-intersection-observer";
import { AnimatePresence } from "framer-motion";
import FiltrosBtnFlotante from "@/components/FiltrosBtnFlotante";
import FiltrosModal from "@/components/FiltrosModal";
import FiltrosDesktop from "@/components/FiltrosDesktop";
import NoticiaCard from "@/components/noticias/NoticiaCard";
import { useNoticias } from "@/components/noticias/hooks/useNoticias";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/context/AuthContext";
import BtnFlotanteInteligente from "@/components/BtnFlotanteInteligente";
import { Loader2 } from "lucide-react";

export default function NoticiasPageClient() {
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [autor, setAutor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ordenFecha, setOrdenFecha] = useState<"asc" | "desc">("desc");
  const [filtroRapido, setFiltroRapido] = useState<
    "recientes" | "populares" | "destacadas" | "mas-comentadas"
  >("recientes");

  const busquedaDebounced = useDebounce(busqueda, 500);

  const [busquedaTemp, setBusquedaTemp] = useState("");
  const [autorTemp, setAutorTemp] = useState("");
  const [categoriaTemp, setCategoriaTemp] = useState("");
  const [ordenFechaTemp, setOrdenFechaTemp] = useState<"asc" | "desc">("desc");

  const {
    noticias,
    categorias: categoriasData,
    isLoading,
    isRefetching,
    isError,
    loadMoreNoticias,
    hasNextPage,
    isFetchingNextPage,
  } = useNoticias(
    {
      busqueda: busquedaDebounced,
      autor,
      categoria,
      ordenFecha,
      tipo: filtroRapido,
    },
    12
  );

  const categorias = useMemo(() => {
    const formateadas = categoriasData.map((cat) => ({
      id: String(cat.id),
      nombre: cat.nombre,
    }));

    return formateadas;
  }, [categoriasData]);

  const filtrosActivosArray = useMemo(() => {
    const activos: { tipo: string; valor: string; etiqueta: string }[] = [];
    if (busqueda)
      activos.push({
        tipo: "busqueda",
        valor: busqueda,
        etiqueta: `Búsqueda: ${busqueda}`,
      });
    if (autor)
      activos.push({
        tipo: "autor",
        valor: autor,
        etiqueta: `Autor: ${autor}`,
      });
    if (categoria) {
      const cat = categorias.find((c) => c.id === categoria);
      if (cat) {
        activos.push({
          tipo: "categoria",
          valor: categoria,
          etiqueta: `Categoría: ${cat.nombre}`,
        });
      }
    }
    if (ordenFecha !== "desc") {
      activos.push({
        tipo: "ordenFecha",
        valor: ordenFecha,
        etiqueta: "Orden: Más antiguas primero",
      });
    }
    return activos;
  }, [busqueda, autor, categoria, ordenFecha, categorias]);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  useEffect(() => {
    const urlBusqueda = searchParams.get("busqueda");
    const urlAutor = searchParams.get("autor");
    const urlCategoria = searchParams.get("categoria");
    const urlOrden = searchParams.get("orden");

    if (urlBusqueda) setBusqueda(urlBusqueda);
    if (urlAutor) setAutor(urlAutor);
    if (urlCategoria) setCategoria(urlCategoria);
    if (urlOrden === "asc" || urlOrden === "desc") setOrdenFecha(urlOrden);
  }, [searchParams]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      loadMoreNoticias();
    }
  }, [inView, hasNextPage, isFetchingNextPage, loadMoreNoticias]);

  useEffect(() => {
    setBusquedaTemp(busqueda);
    setAutorTemp(autor);
    setCategoriaTemp(categoria);
    setOrdenFechaTemp(ordenFecha);
  }, [busqueda, autor, categoria, ordenFecha]);

  const eliminarFiltro = useCallback((tipo: string) => {
    if (tipo === "busqueda") {
      setBusqueda("");
      setBusquedaTemp("");
    } else if (tipo === "autor") {
      setAutor("");
      setAutorTemp("");
    } else if (tipo === "categoria") {
      setCategoria("");
      setCategoriaTemp("");
    } else if (tipo === "ordenFecha") {
      setOrdenFecha("desc");
      setOrdenFechaTemp("desc");
    }
  }, []);

  const limpiarFiltros = useCallback(() => {
    setBusqueda("");
    setAutor("");
    setCategoria("");
    setOrdenFecha("desc");
    setBusquedaTemp("");
    setAutorTemp("");
    setCategoriaTemp("");
    setOrdenFechaTemp("desc");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Noticias
          </h1>
          <p className="text-muted-foreground">
            Mantente al día con las últimas novedades
          </p>
        </div>

        <FiltrosDesktop
          busqueda={busqueda}
          autor={autor}
          categoria={categoria}
          ordenFecha={ordenFecha}
          categorias={categorias}
          filtrosActivos={filtrosActivosArray}
          onBusquedaChange={setBusqueda}
          onAutorChange={setAutor}
          onCategoriaChange={setCategoria}
          onOrdenFechaChange={setOrdenFecha}
          onEliminarFiltro={eliminarFiltro}
          onAplicarFiltros={() => {}}
          onLimpiarFiltros={limpiarFiltros}
        />

        {isLoading && noticias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Cargando noticias...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Error al cargar noticias
              </h2>
              <p className="text-muted-foreground mb-4">
                No se pudieron cargar las noticias. Por favor, intenta de nuevo
                más tarde.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : noticias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                No se encontraron noticias
              </h2>
              <p className="text-muted-foreground mb-4">
                No hay noticias que coincidan con los filtros seleccionados.
              </p>
              <button
                onClick={limpiarFiltros}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <AnimatePresence mode="popLayout">
                {noticias.map((noticia, index) => (
                  <NoticiaCard
                    key={noticia.id}
                    noticia={noticia}
                    mostrarResumen
                    prioridad={index < 3}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>

            {hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Cargando más noticias...</span>
                  </div>
                ) : (
                  <button
                    onClick={loadMoreNoticias}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                  >
                    Cargar más noticias
                  </button>
                )}
              </div>
            )}

            {!hasNextPage && noticias.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Has visto todas las noticias disponibles</p>
              </div>
            )}
          </>
        )}

        <BtnFlotanteInteligente
          filtroNoticiasActivo={filtroRapido}
          categoriaNoticiasActiva={categoria}
          onCambiarFiltroNoticias={(filtro) => {
            setFiltroRapido(filtro as any);
          }}
          onCambiarCategoriaNoticias={(categoriaId) => {
            setCategoria(categoriaId);
          }}
          categoriasNoticias={(categoriasData || []).map((cat) => ({
            id: String(cat.id),
            nombre: cat.nombre,
            color: cat.color || undefined,
            parent_id: (cat as any).parent_id ?? undefined,
            subcategorias: ((cat as any).subcategorias || []).map(
              (sub: any) => ({
                id: String(sub.id),
                nombre: sub.nombre,
                color: sub.color || undefined,
                parent_id: sub.parent_id ?? undefined,
              })
            ),
          }))}
        />

        <FiltrosModal
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
          busqueda={busquedaTemp}
          autor={autorTemp}
          categoria={categoriaTemp}
          ordenFecha={ordenFechaTemp}
          categorias={categorias}
          filtrosActivos={filtrosActivosArray}
          onBusquedaChange={setBusquedaTemp}
          onAutorChange={setAutorTemp}
          onCategoriaChange={setCategoriaTemp}
          onOrdenFechaChange={setOrdenFechaTemp}
          onAplicarFiltros={() => {
            setBusqueda(busquedaTemp);
            setAutor(autorTemp);
            setCategoria(categoriaTemp);
            setOrdenFecha(ordenFechaTemp);
            setModalAbierto(false);
          }}
          onLimpiarFiltros={() => {
            limpiarFiltros();
            setModalAbierto(false);
          }}
          onEliminarFiltro={eliminarFiltro}
        />
      </main>
    </div>
  );
}
