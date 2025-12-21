import { createClient } from "@/lib/supabase/server";

export interface ModTransformed {
  id: any;
  nombre: string;
  descripcion: string | null;
  version: string;
  version_minecraft: string;
  autor: string | null;
  descargas: number;
  imagen_url: string | null;
  fecha_creacion: string;
  ultima_actualizacion: string;
  enlace_principal: string | null;
  tipo_enlace_principal: string | undefined;
  enlace_curseforge: string | undefined;
  enlace_modrinth: string | undefined;
  enlace_github: string | undefined;
  categorias: Array<{ id: string; nombre: string }>;
  source: string | null;
  source_id: string | null;
  slug: string | null;
  summary: string | null;
  description_html: string | null;
  logo_url: string | null;
  website_url: string | null;
  total_downloads: number | null;
  author_name: string | null;
  categories: string[] | null;
  game_versions: string[] | null;
  mod_loader: string[] | null;
  date_created_api: string | null;
  date_modified_api: string | null;
}

export async function getMods(): Promise<ModTransformed[]> {
  try {
    const supabase = await createClient();

    const { data: mods, error } = await supabase
      .from("mods")
      .select("*")
      .order("date_modified_api", { ascending: false });

    if (error) {
      console.error("Error al obtener los mods (lib):", error);
      return [];
    }

    // Transformar los datos para mantener compatibilidad con el código existente
    const transformedMods = mods?.map((mod) => ({
      ...mod,
      // Campos de compatibilidad
      nombre: mod.name,
      descripcion: mod.summary || mod.description_html,
      version: mod.game_versions?.[0] || "Desconocida",
      version_minecraft: mod.game_versions?.[0] || "Desconocida",
      autor: mod.author_name,
      descargas: mod.total_downloads || 0,
      imagen_url: mod.logo_url,
      fecha_creacion: mod.date_created_api,
      ultima_actualizacion: mod.date_modified_api,

      // Determinar enlace principal y tipo
      enlace_principal: mod.website_url,
      tipo_enlace_principal:
        mod.source === "curseforge"
          ? "curseforge"
          : mod.source === "modrinth"
          ? "modrinth"
          : mod.source === "github"
          ? "github"
          : undefined,

      // Enlaces específicos
      enlace_curseforge:
        mod.source === "curseforge" ? mod.website_url : undefined,
      enlace_modrinth: mod.source === "modrinth" ? mod.website_url : undefined,
      enlace_github: mod.source === "github" ? mod.website_url : undefined,

      // Categorías como objetos para compatibilidad
      categorias:
        mod.categories?.map((cat: string) => ({ id: cat, nombre: cat })) || [],
    }));

    return transformedMods || [];
  } catch (error) {
    console.error("Error inesperado al obtener los mods (lib):", error);
    return [];
  }
}
