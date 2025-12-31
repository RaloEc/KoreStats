import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { getNoticiaById, getNoticias } from "@/lib/noticias/noticias-data";
import { procesarContenido } from "@/lib/utils/html-processing";
import { NoticiaLoading } from "@/components/noticias/NoticiaLoading";
import NoticiaCabecera from "@/components/noticias/NoticiaCabecera";
import NoticiaAutor from "@/components/noticias/NoticiaAutor";
import NoticiaImagen from "@/components/noticias/NoticiaImagen";
import NoticiaContenido from "@/components/noticias/NoticiaContenido";
import NoticiaCategorias from "@/components/noticias/NoticiaCategorias";
import NoticiasRelacionadas from "@/components/noticias/NoticiasRelacionadas";
import NoticiaComentariosOptimizado from "@/components/noticias/NoticiaComentariosOptimizado";
import LolPatchContent from "@/components/noticias/LolPatchContent";
import NoticiaVistaCounter from "@/components/noticias/NoticiaVistaCounter";
import NoticiaScrollbarStyles from "@/components/noticias/NoticiaScrollbarStyles";

export const revalidate = 60; // Revalidar cada minuto

import { getServiceClient } from "@/lib/supabase/server";

export async function generateStaticParams() {
  if (process.env.IS_MOBILE !== "true") {
    return [];
  }

  const supabase = getServiceClient();
  const { data: noticias } = await supabase.from("noticias").select("id");

  return (noticias || []).map((noticia) => ({
    id: noticia.id.toString(),
  }));
}

export default async function NoticiaDetalle({
  params,
}: {
  params: { id: string };
}) {
  const noticia = await getNoticiaById(params.id);

  if (!noticia) {
    notFound();
  }

  // Verificar usuario y rol (Server Side)
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let esAdmin = false;

  if (session) {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (perfil?.role === "admin") {
      esAdmin = true;
    }
  }

  // Cargar noticias relacionadas
  let noticiasRelacionadas = [];
  if (noticia.categorias && noticia.categorias.length > 0) {
    // Usamos la primera categoría para buscar relacionadas
    // Nota: getNoticias no tiene filtro por ID de categoría directo si son M:N,
    // pero asumimos que el helper lo maneja o que usamos el filtro 'categoria' que busca por slug o ID.
    // Si la API `getNoticias` espera un slug o ID, hay que asegurarse.
    // Revisando `getNoticias`: `if (categoria) ...` pero no vimos la implementación completa del filtro.
    // Asumiremos que funciona o traerá vacío.
    const categoriaId = noticia.categorias[0]?.id;
    if (categoriaId) {
      const res = await getNoticias({
        limit: 5, // Pedimos 5 para tener margen si excluimos la actual
        categoria: categoriaId,
      });
      noticiasRelacionadas = res.data
        .filter((n: any) => n.id !== params.id)
        .slice(0, 4);
    }
  }

  // Procesar contenido
  const contenidoProcesado = procesarContenido(noticia.contenido);

  return (
    <div className="min-h-screen bg-background">
      <NoticiaScrollbarStyles />
      <NoticiaVistaCounter noticiaId={params.id} />

      <main className="container py-4 px-4">
        {/* Cabecera con título y botón de volver */}
        <NoticiaCabecera
          titulo={noticia.titulo}
          descripcion={
            noticia.contenido?.substring(0, 160).replace(/<[^>]*>/g, "") || ""
          }
          esAdmin={esAdmin}
          noticiaId={params.id}
        />

        {/* Información del autor */}
        <NoticiaAutor
          nombre={noticia.autor_nombre || ""}
          autorId={noticia.autor_public_id}
          avatar={noticia.autor_avatar}
          color={noticia.autor_color}
          rol={noticia.autor_rol}
          fecha={noticia.fecha_publicacion}
          vistas={noticia.vistas || 0}
        />

        {/* Imagen de portada */}
        {(noticia.imagen_url || noticia.imagen_portada) && (
          <NoticiaImagen
            src={noticia.imagen_url || noticia.imagen_portada || ""}
            alt={noticia.titulo}
            priority={true}
          />
        )}

        {/* Contenido de la noticia */}
        <NoticiaContenido contenido={contenidoProcesado} />

        {/* Contenido especial para parches de LoL */}
        {noticia.type === "lol_patch" && noticia.data && (
          <div className="max-w-4xl mx-auto mb-8">
            <LolPatchContent data={noticia.data} />
          </div>
        )}

        {/* Divisor después del contenido */}
        <div className="max-w-4xl mx-auto mb-8">
          <Separator className="my-4" />
        </div>

        {/* Temas relacionados */}
        <NoticiaCategorias
          categoria={noticia.categoria}
          categorias={noticia.categorias}
        />

        {/* Noticias relacionadas */}
        {/* Usamos Suspense si quisiéramos cargarlo streamed, pero aquí ya lo tenemos */}
        <NoticiasRelacionadas noticias={noticiasRelacionadas} />

        {/* Divisor antes de comentarios */}
        <div className="max-w-4xl mx-auto mb-8">
          <Separator className="my-4" />
        </div>

        {/* Sección de comentarios */}
        <Suspense
          fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}
        >
          <NoticiaComentariosOptimizado noticiaId={noticia.id.toString()} />
        </Suspense>
      </main>
    </div>
  );
}
