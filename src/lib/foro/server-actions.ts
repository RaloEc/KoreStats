import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type {
  ForoHiloCompleto,
  ForoCategoria,
  ForoHiloRelacionado,
  ForoEtiqueta,
  ForoHiloEtiqueta,
} from "@/types/foro";

/**
 * Obtiene un hilo del foro por slug o ID
 * Ejecutado en el servidor para SSR
 */
export async function getHiloPorSlugOId(
  slugOrId: string
): Promise<ForoHiloCompleto> {
  const supabase = await createClient();

  // Primero intentar por slug
  let { data: hilo, error } = await supabase
    .from("foro_hilos")
    .select(
      `
      *,
      autor:perfiles!foro_hilos_autor_id_fkey ( id, username, avatar_url, public_id ),
      categoria:foro_categorias!foro_hilos_categoria_id_fkey ( id, nombre, color, slug, parent_id ),
      weapon_stats_record:weapon_stats_records!weapon_stats_id ( id, weapon_name, stats, created_at, updated_at )
    `
    )
    .eq("slug", slugOrId)
    .is("deleted_at", null)
    .single();

  // Fallback por ID si no se encontró por slug
  if (!hilo) {
    const byId = await supabase
      .from("foro_hilos")
      .select(
        `
        *,
        autor:perfiles!foro_hilos_autor_id_fkey ( id, username, avatar_url, public_id ),
        categoria:foro_categorias!foro_hilos_categoria_id_fkey ( id, nombre, color, slug, parent_id ),
        weapon_stats_record:weapon_stats_records!weapon_stats_id ( id, weapon_name, stats, created_at, updated_at )
      `
      )
      .eq("id", slugOrId)
      .is("deleted_at", null)
      .single();
    hilo = byId.data;
    error = byId.error;
  }

  if (error || !hilo) {
    console.error("Error al buscar el hilo por slug/id:", error?.message);
    notFound();
  }

  // Obtener el conteo de votos
  const { data: votosData } = await supabase
    .from("foro_votos")
    .select("value")
    .eq("hilo_id", hilo.id);

  const votosList: { value: number | null }[] = (votosData ?? []) as {
    value: number | null;
  }[];
  const votos = votosList.reduce(
    (sum: number, voto: { value: number | null }) => sum + (voto.value ?? 0),
    0
  );

  // Obtener el conteo de respuestas (posts que no son el hilo principal y no están eliminados)
  const { count: respuestas } = await supabase
    .from("foro_posts")
    .select("*", { count: "exact", head: true })
    .eq("hilo_id", hilo.id)
    .eq("deleted", false);

  return {
    ...hilo,
    votos,
    respuestas: respuestas || 0,
  } as ForoHiloCompleto;
}

/**
 * Obtiene las etiquetas de un hilo
 */
export async function getEtiquetasHilo(
  hiloId: string
): Promise<ForoEtiqueta[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("foro_hilos_etiquetas")
    .select("etiqueta:foro_etiquetas ( id, nombre, color )")
    .eq("hilo_id", hiloId);

  if (error) {
    console.error("Error al obtener etiquetas:", error.message);
    return [];
  }

  if (!data) return [];

  return data
    .map((item: any) => item.etiqueta)
    .filter(Boolean) as ForoEtiqueta[];
}

/**
 * Obtiene la categoría padre de una categoría
 */
export async function getCategoriaParent(
  parentId: string
): Promise<ForoCategoria | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("foro_categorias")
    .select("id, nombre, slug, color, parent_id")
    .eq("id", parentId)
    .single();

  if (error) {
    console.error("Error al obtener categoría padre:", error.message);
    return null;
  }

  return data as ForoCategoria;
}

/**
 * Obtiene hilos relacionados de la misma categoría con datos completos para preview
 */
export async function getHilosRelacionados(
  categoriaId: string,
  hiloActualId: string,
  limit: number = 5
): Promise<ForoHiloRelacionado[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("foro_hilos")
    .select(
      `
      id,
      slug,
      titulo,
      vistas,
      created_at,
      contenido,
      weapon_stats_id,
      autor:perfiles!foro_hilos_autor_id_fkey ( id, username, avatar_url, public_id ),
      weapon_stats_record:weapon_stats_records!weapon_stats_id ( id, weapon_name, stats, created_at, updated_at )
    `
    )
    .eq("categoria_id", categoriaId)
    .neq("id", hiloActualId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error al obtener hilos relacionados:", error.message);
    return [];
  }

  // Obtener conteos de votos y respuestas para cada hilo
  const hilosConConteos = await Promise.all(
    (data || []).map(async (hilo: any) => {
      const [votosResult, respuestasResult] = await Promise.all([
        supabase.from("foro_votos").select("value").eq("hilo_id", hilo.id),
        supabase
          .from("foro_posts")
          .select("*", { count: "exact", head: true })
          .eq("hilo_id", hilo.id)
          .eq("deleted", false),
      ]);

      const votos = (votosResult.data || []).reduce(
        (sum: number, voto: any) => sum + (voto.value ?? 0),
        0
      );
      const respuestas = respuestasResult.count || 0;

      return {
        ...hilo,
        votos,
        respuestas,
      };
    })
  );

  return (hilosConConteos as ForoHiloRelacionado[]) || [];
}

/**
 * Obtiene todas las categorías para el sidebar
 */
export async function getCategoriasForo(): Promise<ForoCategoria[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("foro_categorias")
    .select("*")
    .order("orden", { ascending: true });

  if (error) {
    console.error("Error al obtener categorías:", error.message);
    return [];
  }

  return (data as ForoCategoria[]) || [];
}

/**
 * Obtiene las categorías organizadas jerárquicamente para el sidebar
 */
export async function getCategoriasJerarquicas(): Promise<any[]> {
  try {
    console.log(
      "[getCategoriasJerarquicas] Cargando categorías desde Supabase"
    );
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("foro_categorias")
      .select("*")
      .eq("es_activa", true)
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      console.error(
        "[getCategoriasJerarquicas] Error al cargar foro_categorias:",
        error
      );
      return [];
    }

    const categoriasPlanas = data || [];
    console.log(
      "[getCategoriasJerarquicas] Categorías planas recibidas:",
      categoriasPlanas.length
    );

    // Organizar en estructura jerárquica
    const categoriasPrincipales: any[] = [];
    const categoriasMap = new Map<string, any>();

    // Crear un mapa de todas las categorías
    categoriasPlanas.forEach((cat) => {
      categoriasMap.set(cat.id, { ...cat, subcategorias: [] });
    });

    // Organizar la jerarquía
    categoriasPlanas.forEach((cat) => {
      const categoria = categoriasMap.get(cat.id)!;

      if (!cat.parent_id) {
        // Es una categoría principal
        categoriasPrincipales.push(categoria);
      } else {
        // Es una subcategoría, agregarla a su padre
        const padre = categoriasMap.get(cat.parent_id);
        if (padre) {
          if (!padre.subcategorias) {
            padre.subcategorias = [];
          }
          padre.subcategorias.push(categoria);
        }
      }
    });

    console.log(
      "[getCategoriasJerarquicas] Árbol de categorías construido:",
      categoriasPrincipales.length
    );

    return categoriasPrincipales;
  } catch (err) {
    console.error("[getCategoriasJerarquicas] Error general:", err);
    return [];
  }
}

/**
 * Incrementa el contador de vistas de un hilo
 * Se ejecuta de forma asíncrona sin bloquear
 */
export async function incrementarVistasHilo(hiloId: string): Promise<void> {
  const supabase = await createClient();

  await supabase.rpc("incrementar_vistas_hilo", {
    hilo_id: hiloId,
  });
}
