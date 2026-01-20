import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import ForoSidebar from "@/components/foro/ForoSidebar";
import HiloHeader from "@/components/foro/HiloHeader";
import HiloSidebar from "@/components/foro/HiloSidebar";
import HilosRelacionadosInline from "@/components/foro/HilosRelacionadosInline";
import AdBanner from "@/components/ads/AdBanner";
import HiloDivider from "@/components/foro/HiloDivider";

// Importación dinámica del componente de comentarios para evitar problemas de SSR
const HiloComentariosOptimizado = dynamic(
  () => import("@/components/foro/HiloComentariosOptimizado"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    ),
  },
);
import {
  getHiloPorSlugOId,
  getEtiquetasHilo,
  getCategoriaParent,
  getHilosRelacionados,
  getCategoriasJerarquicas,
  incrementarVistasHilo,
} from "@/lib/foro/server-actions";
import type { ForoHiloCompleto } from "@/types/foro";

interface PageProps {
  params: {
    slug: string;
  };
}

// Generar metadata dinámica para SEO
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const hilo = await getHiloPorSlugOId(params.slug);

    return {
      title: `${hilo.titulo} | Foro - KoreStats`,
      description: hilo.contenido.substring(0, 160).replace(/<[^>]*>/g, ""),
      openGraph: {
        title: hilo.titulo,
        description: hilo.contenido.substring(0, 160).replace(/<[^>]*>/g, ""),
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
  // Obtener datos del hilo en el servidor
  const hilo = await getHiloPorSlugOId(params.slug);

  // Incrementar vistas de forma asíncrona (no bloqueante)
  incrementarVistasHilo(hilo.id).catch(() => {
    // Silenciar errores de incremento de vistas
  });

  // Obtener datos relacionados en paralelo
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Contenido principal */}
      <div className="lg:col-span-10 mt-0">
        {/* Breadcrumbs */}
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

        {/* Encabezado del hilo */}
        <HiloHeader hilo={hilo} etiquetas={etiquetas} />

        <HiloDivider label="Comentarios" />

        {/* Sistema de Posts/Respuestas */}
        <section className="mt-4" id="responder">
          <HiloComentariosOptimizado
            hiloId={hilo.id}
            autorHiloId={hilo.autor_id}
            hiloCerrado={hilo.es_cerrado}
            pageSize={3}
            order="desc"
          />
        </section>

        <section className="my-12">
          <AdBanner />
        </section>

        {/* Más en ... (relacionados) */}
        <HilosRelacionadosInline
          categoriaId={hilo.categoria_id}
          categoriaNombre={hilo.categoria?.nombre || "la categoría"}
          hiloActualId={hilo.id}
          hilosRelacionadosIniciales={hilosRelacionados}
        />
      </div>

      {/* Sidebar */}
      <HiloSidebar />
    </div>
  );
}
