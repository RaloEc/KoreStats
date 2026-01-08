"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MessageSquare,
  Clock,
  TrendingUp,
  Star,
  User,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import Link from "next/link";
import ForoBtnFlotante from "./ForoBtnFlotante";
import ForoFiltrosModal, { ForoFiltersState } from "./ForoFiltrosModal";
import BtnFlotanteInteligente from "@/components/BtnFlotanteInteligente";
import HiloCard from "./HiloCard";
import { useForoHilos, type Categoria } from "./hooks/useForoHilos";
import { useRealtimeVotosHilos } from "@/hooks/useRealtimeVotosHilos";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";

const InvitacionRegistro = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white dark:bg-black p-8 rounded-lg text-center my-8 border border-gray-200 dark:border-gray-800 shadow-lg"
  >
    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
      Únete a la Discusión
    </h2>
    <p className="text-gray-600 dark:text-gray-200 mb-6 max-w-2xl mx-auto">
      Regístrate para crear tus propios hilos, responder a otros, votar en las
      publicaciones y ser parte activa de nuestra creciente comunidad.
    </p>
    <div className="flex justify-center gap-4">
      <Link
        href="/foro/crear-hilo"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
      >
        Crear Nuevo Hilo
      </Link>
      <Button
        asChild
        variant="outline"
        className="border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-black dark:border-gray-700 dark:text-white dark:hover:bg-black font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
      >
        <Link href="/login">Iniciar Sesión</Link>
      </Button>
    </div>
  </motion.div>
);

function ForoSkeleton() {
  return (
    <div className="bg-white dark:bg-black transition-colors duration-300">
      <div className="container mx-auto px-0 sm:px-3 lg:px-4 py-8">
        <div className="space-y-10">
          <header className="space-y-3">
            <Skeleton className="h-10 w-52 rounded-lg bg-indigo-200/40 dark:bg-indigo-500/20" />
            <Skeleton className="h-4 w-80 max-w-full rounded bg-gray-200/90 dark:bg-gray-700/90" />
          </header>

          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <HiloCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HiloCardSkeleton() {
  return (
    <div className="w-full px-2 py-1">
      <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/80 dark:bg-black/60 shadow-sm">
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-4 rounded-full" />
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200/70 dark:border-gray-800/70 px-5 py-3 flex flex-wrap items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <div className="ml-auto flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente Row eliminado temporalmente

// Props para el componente ForoCliente
interface ForoClienteProps {
  initialCategorias?: Categoria[];
}

export default function ForoCliente({ initialCategorias }: ForoClienteProps) {
  const router = useRouter();
  const { user, profile, loading: userLoading } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // OPTIMIZACIÓN #5: Configura Intersection Observer
  const { ref: scrollTriggerRef, inView } = useInView({
    threshold: 0.5, // Activa cuando esté 50% visible
  });

  // Usar nuestro hook personalizado para gestionar los hilos
  const {
    hilos,
    categorias,
    isLoading,
    isRefetching,
    isError,
    error,
    activeTab,
    setActiveTab,
    timeRange,
    setTimeRange,
    handleVote,
    handleDeleteHilo,
    loadMoreHilos,
    hasNextPage,
    isFetchingNextPage,
  } = useForoHilos({ initialCategorias });

  // Activar sincronización en tiempo real de votos de hilos
  useRealtimeVotosHilos();

  // Observar cambios en el tamaño del contenedor
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, [containerRef]);

  // Estado para los filtros
  const [filters, setFilters] = useState<ForoFiltersState>({
    tab: activeTab,
    timeRange: timeRange,
  });

  // Función para aplicar filtros
  const aplicarFiltros = () => {
    setActiveTab(filters.tab);
    setTimeRange(filters.timeRange);
  };

  // 👇 OPTIMIZACIÓN #5: useEffect para scroll infinito con Intersection Observer
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      loadMoreHilos();
    }
  }, [inView, hasNextPage, isFetchingNextPage, loadMoreHilos]);

  if ((isLoading && hilos.length === 0) || userLoading) {
    return <ForoSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-white dark:bg-black transition-colors duration-300">
        <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-gray-50 dark:bg-black border border-red-200 dark:border-red-900 shadow-md max-w-md mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-red-500 dark:text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-xl font-medium text-gray-800 dark:text-white mb-2">
            Error
          </p>
          <p className="text-red-600 dark:text-red-500 text-center">
            {error instanceof Error
              ? error.message
              : "Ocurrió un error al cargar los hilos"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="container mx-auto px-0 sm:px-3 lg:px-4 py-0">
        {!user && (
          <>
            <header className="mb-8 text-left">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-4xl md:text-5xl font-bold tracking-tight"
                style={
                  {
                    color: profile?.color || "#6366F1",
                    "--accent-light": profile?.color || "#6366F1",
                    "--accent-dark": profile?.color || "#3730A3",
                  } as React.CSSProperties
                }
              >
                Foros
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                className="mt-3 max-w-xl text-base text-gray-600 dark:text-gray-300"
              >
                Un espacio para discutir, compartir y aprender con la comunidad.
              </motion.p>
            </header>
            <InvitacionRegistro />
          </>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <main className="w-full lg:flex-1">
            <div className="bg-white dark:bg-black p-0 rounded-lg shadow-none border-0 transition-colors duration-300 outline-none ring-0 focus:outline-none focus:ring-0">
              <div
                className={`space-y-4 transition-opacity duration-200 ${
                  isRefetching ? "opacity-70" : "opacity-100"
                }`}
              >
                {activeTab === "siguiendo" && !user && (
                  <div className="text-center text-sm text-gray-600 dark:text-gray-300 py-6">
                    Inicia sesión para ver los hilos que sigues.
                  </div>
                )}
                {activeTab === "mios" && !user && (
                  <div className="text-center text-sm text-gray-600 dark:text-gray-300 py-6">
                    Inicia sesión para ver tus hilos.
                  </div>
                )}
                <div className="w-full space-y-0" ref={containerRef}>
                  {hilos.map((hilo, index) => (
                    <motion.div
                      key={`${hilo.id}-${index}`}
                      initial={index < 10 ? false : { opacity: 0, y: 4 }}
                      animate={index < 10 ? undefined : { opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="w-full px-2 py-1"
                    >
                      <HiloCard
                        id={hilo.id}
                        href={`/foro/hilos/${hilo.slug ?? hilo.id}`}
                        titulo={hilo.titulo}
                        contenido={hilo.contenido}
                        categoriaNombre={hilo.foro_categorias?.nombre}
                        categoriaColor={
                          hilo.foro_categorias?.color || undefined
                        }
                        autorUsername={hilo.perfiles?.username || "Anónimo"}
                        autorAvatarUrl={hilo.perfiles?.avatar_url || null}
                        autorId={hilo.autor_id || null}
                        autorPublicId={hilo.perfiles?.public_id ?? null}
                        autorColor={hilo.perfiles?.color ?? undefined}
                        createdAt={hilo.created_at}
                        vistas={hilo.vistas || 0}
                        respuestas={hilo.respuestas_conteo || 0}
                        votosIniciales={hilo.votos_conteo || 0}
                        showSinRespuestasAlert={false}
                        className="w-full"
                        weaponStats={hilo.weapon_stats_record?.stats ?? null}
                        onDelete={handleDeleteHilo}
                      />
                    </motion.div>
                  ))}

                  {/* 👇 OPTIMIZACIÓN #5: Añade el 'ref' del trigger aquí */}
                  {/* Este div invisible al final de la lista activará 'inView' */}
                  <div ref={scrollTriggerRef} />
                </div>

                {/* Mostrar indicador de carga al final de la lista */}
                {isFetchingNextPage && hasNextPage && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-600 dark:text-sky-500" />
                  </div>
                )}

                {/* Mostrar mensaje cuando no hay más hilos */}
                {!hasNextPage && hilos.length > 0 && (
                  <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                    Has llegado al final de la lista
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Botón flotante unificado para móvil */}
      {/* Botón flotante unificado para móvil */}
      <BtnFlotanteInteligente
        filtroForoActivo={activeTab}
        onCambiarFiltroForo={(filtro) => {
          setActiveTab(filtro);
        }}
        onCambiarCategoriaForo={(categoriaId) => {
          if (categoriaId) {
            router.push(`/foro/categoria/${categoriaId}`);
          }
        }}
        categoriasForo={(categorias || []).map((cat) => ({
          id: cat.slug || cat.id.toString(),
          nombre: cat.nombre,
          color: cat.color || undefined,
          parent_id: cat.parent_id,
          subcategorias: (cat.subcategorias || []).map((sub) => ({
            id: sub.slug || sub.id.toString(),
            nombre: sub.nombre,
            color: sub.color || undefined,
            parent_id: sub.parent_id,
          })),
        }))}
      />
    </div>
  );
}
