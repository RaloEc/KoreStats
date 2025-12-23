import CategoriaPageClient from "@/components/foro/CategoriaPageClient";
import ForoSidebar from "@/components/foro/ForoSidebar";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

async function getCategoriaBySlugOrId(slugOrId: string) {
  const supabase = await createClient();
  // Intentar por slug primero, si no existe, por id
  let { data: categoria, error } = await supabase
    .from("foro_categorias")
    .select("*")
    .eq("slug", slugOrId)
    .single();

  if (!categoria) {
    // Fallback por id (UUID) si no se encontró por slug
    const byId = await supabase
      .from("foro_categorias")
      .select("*")
      .eq("id", slugOrId)
      .single();
    categoria = byId.data || null;
    error = byId.error || null;
  }

  if (error || !categoria || categoria.es_activa === false) return null;
  return categoria;
}

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Record<string, string | string[]>;
}) {
  const categoria = await getCategoriaBySlugOrId(params.slug);
  if (!categoria) notFound();

  return (
    <CategoriaPageClient
      categoria={categoria}
      initialFilters={{}}
      searchParams={searchParams}
    />
  );
}
