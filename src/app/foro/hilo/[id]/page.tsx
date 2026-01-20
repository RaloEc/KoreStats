import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";

import HiloHeader from "@/components/foro/HiloHeader";
import HiloSidebar from "@/components/foro/HiloSidebar";
import HilosRelacionadosInline from "@/components/foro/HilosRelacionadosInline";
import AdBanner from "@/components/ads/AdBanner";
import {
  getHiloPorSlugOId,
  getEtiquetasHilo,
  getCategoriaParent,
  getHilosRelacionados,
  getCategoriasJerarquicas,
  incrementarVistasHilo,
} from "@/lib/foro/server-actions";

// Cargar comentarios de forma dinámica para evitar problemas de SSR
const HiloComentariosOptimizado = dynamic(
  () => import("@/components/foro/HiloComentariosOptimizado"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    ),
  },
);

import { getServiceClient } from "@/lib/supabase/server";

export async function generateStaticParams() {
  if (process.env.IS_MOBILE !== "true") {
    return [];
  }

  const supabase = getServiceClient();
  const { data: hilos } = await supabase.from("hilos").select("id");

  return (hilos || []).map((hilo) => ({
    id: hilo.id,
  }));
}

interface PageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const hilo = await getHiloPorSlugOId(params.id);

    const descripcion = hilo.contenido
      .substring(0, 160)
      .replace(/<[^>]*>/g, "");

    return {
      title: `${hilo.titulo} | Foro - KoreStats`,
      description: descripcion,
      openGraph: {
        title: hilo.titulo,
        description: descripcion,
        type: "article",
        publishedTime: hilo.created_at,
        modifiedTime: hilo.updated_at || hilo.created_at,
        authors: [hilo.autor?.username || "Usuario"],
      },
    };
  } catch {
    return {
      title: "Hilo no encontrado | Foro - KoreStats",
    };
  }
}

export default async function HiloPage({ params }: PageProps) {
  const hilo = await getHiloPorSlugOId(params.id);

  incrementarVistasHilo(hilo.id).catch(() => {
    // Silenciar errores al incrementar vistas
  });

  const [etiquetas, categorias, hilosRelacionados, categoriaParent] =
    await Promise.all([
      getEtiquetasHilo(hilo.id),
      getCategoriasJerarquicas(),
      getHilosRelacionados(hilo.categoria_id, hilo.id),
      hilo.categoria?.parent_id
        ? getCategoriaParent(hilo.categoria.parent_id)
        : Promise.resolve(null),
    ]);

  return (
    <div className="container mx-auto py-6 px-0 lg:px-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-9">
          <nav className="text-sm mb-3 text-gray-600 dark:text-gray-300 amoled:text-gray-200">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/" className="hover:underline">
                  Inicio
                </Link>
              </li>
              <li>›</li>
              <li>
                <Link href="/foro" className="hover:underline">
                  Foro
                </Link>
              </li>
              <li>›</li>
              {categoriaParent && (
                <>
                  <li>
                    <Link
                      href={`/foro/categoria/${categoriaParent.slug}`}
                      className="hover:underline"
                    >
                      {categoriaParent.nombre}
                    </Link>
                  </li>
                  <li>›</li>
                </>
              )}
              {hilo.categoria && (
                <>
                  <li>
                    <Link
                      href={`/foro/categoria/${hilo.categoria.slug}`}
                      className="hover:underline"
                    >
                      {hilo.categoria.nombre}
                    </Link>
                  </li>
                  <li>›</li>
                </>
              )}
              <li className="text-gray-800 dark:text-gray-200 amoled:text-white truncate max-w-[60%]">
                {hilo.titulo}
              </li>
            </ol>
          </nav>

          <HiloHeader hilo={hilo} etiquetas={etiquetas} />

          <div className="relative py-10 mt-10 mb-6">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div className="w-full border-t-2 border-gray-300 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Comentarios
              </span>
            </div>
          </div>

          <section className="mt-6" id="responder">
            <HiloComentariosOptimizado
              hiloId={hilo.id}
              autorHiloId={hilo.autor_id}
              hiloCerrado={hilo.es_cerrado}
              pageSize={5}
              order="desc"
            />
          </section>

          <div className="relative py-10 mt-10 mb-6">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div className="w-full border-t-2 border-gray-300 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Publicidad
              </span>
            </div>
          </div>

          <section className="mb-6">
            <AdBanner />
          </section>

          <HilosRelacionadosInline
            categoriaId={hilo.categoria_id}
            categoriaNombre={hilo.categoria?.nombre || "la categoría"}
            hiloActualId={hilo.id}
            hilosRelacionadosIniciales={hilosRelacionados}
          />
        </div>

        <HiloSidebar />
      </div>
    </div>
  );
}
