import { Suspense } from "react";
import dynamic from "next/dynamic";
import BannerPublicitario from "@/components/home/BannerPublicitario";
import SeccionForoServer from "@/components/home/SeccionForoServer";
import { AuthModalWrapper } from "@/components/auth/AuthModalWrapper";
import { getCategoriasTree } from "@/lib/foro/categorias-data";
import { getNoticias } from "@/lib/noticias/noticias-data";

// Lazy loading para componentes pesados y menos críticos
const NoticiasDestacadas = dynamic(
  () => import("@/components/home/NoticiasDestacadasRefactored"),
  {
    // ... (mismo loading) ...
    loading: () => (
      <div className="space-y-6 mb-12">
        <div className="bg-gray-200 dark:bg-gray-800 rounded-xl h-96 w-full animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-200 dark:bg-gray-800 rounded-lg h-48 w-full animate-pulse" />
            <div className="bg-gray-200 dark:bg-gray-800 rounded-lg h-48 w-full animate-pulse" />
          </div>
          <div className="bg-gray-200 dark:bg-gray-800 rounded-lg h-96 w-full animate-pulse" />
        </div>
      </div>
    ),
    ssr: true, // Mantenemos SSR para SEO
  }
);

const ForoCategoriasWidget = dynamic(
  () => import("@/components/home/ForoCategoriasWidget"),
  {
    loading: () => (
      <div className="bg-gray-200 dark:bg-gray-800 rounded-xl h-48 w-full animate-pulse" />
    ),
    ssr: false, // Cliente solo, interactivo
  }
);

export default async function Home() {
  // Fetch de datos críticos en servidor en paralelo
  const [categoriasForo, destacadasResult, recientesResult] = await Promise.all(
    [
      getCategoriasTree(6),
      getNoticias({ tipo: "destacadas", limit: 5 }),
      getNoticias({ tipo: "recientes", limit: 4 }),
    ]
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <main className="container mx-auto px-4 py-4">
        <div className="space-y-12">
          {/* Seccion Noticias (Client Component) */}
          <Suspense
            fallback={
              <div className="h-96 w-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            }
          >
            <NoticiasDestacadas
              className="mb-12"
              initialNoticias={destacadasResult.data}
              initialRecientes={recientesResult.data}
            />
          </Suspense>

          {/* Layout principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna principal - Contenido */}
            <div className="lg:col-span-2 space-y-8">
              {/* Banner publicitario */}
              <div className="flex justify-center">
                <BannerPublicitario
                  variant="horizontal"
                  className="w-full max-w-2xl"
                />
              </div>

              {/* Sección del foro (Server Component) */}
              <Suspense
                fallback={
                  <div className="h-96 w-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                }
              >
                <SeccionForoServer />
              </Suspense>
            </div>

            {/* Sidebar derecha */}
            <div className="space-y-6">
              {/* Banner publicitario vertical */}
              <div className="hidden lg:block">
                <BannerPublicitario variant="vertical" className="w-full" />
              </div>

              {/* Información adicional */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
                  Acerca de BitArena
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  ¡Bienvenido a BitArena! Tu espacio para estar al día con las
                  últimas noticias sobre tecnología, IA, software, videojuegos y
                  más. Participa en nuestros foros.
                </p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      1.2K+
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Miembros
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      500+
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Hilos
                    </div>
                  </div>
                </div>
              </div>

              {/* Widget de categorías (Client Component hidratado con datos server) */}
              <div className="mt-6">
                <ForoCategoriasWidget initialCategorias={categoriasForo} />
              </div>

              {/* Banner publicitario cuadrado */}
              <div className="hidden lg:block">
                <BannerPublicitario variant="square" className="w-full" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Banner publicitario inferior */}
      <div className="flex justify-center py-6">
        <BannerPublicitario variant="horizontal" className="w-full max-w-4xl" />
      </div>

      {/* Modal de autenticación (Cliente) */}
      <AuthModalWrapper />
    </div>
  );
}
