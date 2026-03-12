import { createClient } from "@/lib/supabase/server";
import type { GameInfo, GameModuleEntry } from "@/modules/types";

/**
 * Obtiene un juego por su slug desde la BD.
 * Se usa en Server Components para la ruta /games/[slug].
 */
export async function getGameBySlug(
  slug: string
): Promise<GameInfo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("juegos")
    .select("id, nombre, slug, descripcion, imagen_portada_url, icono_url, desarrollador, fecha_lanzamiento")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return null;
  }

  // Resolver URLs públicas
  if (data.imagen_portada_url && !data.imagen_portada_url.startsWith("http")) {
    const { data: publicUrl } = supabase.storage
      .from("imagenes")
      .getPublicUrl(data.imagen_portada_url);
    data.imagen_portada_url = publicUrl.publicUrl;
  }

  if (data.icono_url && !data.icono_url.startsWith("http")) {
    const { data: publicUrl } = supabase.storage
      .from("iconos")
      .getPublicUrl(data.icono_url);
    data.icono_url = publicUrl.publicUrl;
  }

  return data as GameInfo;
}

/**
 * Obtiene los módulos activos de un juego.
 */
export async function getGameModules(
  gameId: string
): Promise<GameModuleEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("game_modules")
    .select("id, game_id, module_type, enabled, config")
    .eq("game_id", gameId)
    .eq("enabled", true)
    .order("module_type");

  if (error || !data) {
    return [];
  }

  return data as GameModuleEntry[];
}

/**
 * Obtiene todos los juegos activos con sus módulos.
 * Usado para el índice /games.
 */
export async function getAllGames(): Promise<
  (GameInfo & { modules: GameModuleEntry[] })[]
> {
  const supabase = await createClient();

  const { data: games, error: gamesError } = await supabase
    .from("juegos")
    .select("id, nombre, slug, descripcion, imagen_portada_url, icono_url, desarrollador, fecha_lanzamiento")
    .order("created_at");

  if (gamesError || !games) {
    return [];
  }

  const { data: modules, error: modulesError } = await supabase
    .from("game_modules")
    .select("id, game_id, module_type, enabled, config")
    .eq("enabled", true);

  if (modulesError || !modules) {
    return games.map((g) => ({ ...g, modules: [] }));
  }

  return games.map((game) => {
    // Resolver URLs públicas
    const resolvedGame = { ...game };
    
    if (resolvedGame.imagen_portada_url && !resolvedGame.imagen_portada_url.startsWith("http")) {
      const { data: publicUrl } = supabase.storage
        .from("imagenes")
        .getPublicUrl(resolvedGame.imagen_portada_url);
      resolvedGame.imagen_portada_url = publicUrl.publicUrl;
    }

    if (resolvedGame.icono_url && !resolvedGame.icono_url.startsWith("http")) {
      const { data: publicUrl } = supabase.storage
        .from("iconos")
        .getPublicUrl(resolvedGame.icono_url);
      resolvedGame.icono_url = publicUrl.publicUrl;
    }

    return {
      ...resolvedGame,
      modules: modules.filter((m) => m.game_id === game.id),
    };
  });
}

/**
 * Obtiene las noticias de un juego por su game_id o su slug/nombre en categorías.
 * Incluye noticias de subcategorías recursivamente.
 */
export async function getGameNews(
  gameId: string,
  gameSlug: string,
  gameName: string,
  limit = 10
) {
  const supabase = await createClient();

  // 1. Obtener IDs de categorías que coincidan con el juego o sean hijas de la categoría del juego
  // Usamos una query recursiva para obtener todo el árbol de categorías relacionadas al juego
  const { data: catTree, error: catError } = await supabase.rpc('get_category_tree_by_slug', { 
    p_slug: gameSlug 
  });

  let catIds: string[] = [];
  
  if (!catError && catTree) {
    catIds = catTree.map((c: any) => c.id);
  } else {
    // Fallback manual si la función RPC no existe o falla
    const { data: directCats } = await supabase
      .from("categorias")
      .select("id")
      .or(`slug.ilike.%${gameSlug}%,nombre.ilike.%${gameName}%`);
    
    catIds = directCats?.map((c) => c.id) || [];
  }

  // Obtener IDs de noticias asociadas a esas categorías
  let noticiaIds: string[] = [];
  if (catIds.length > 0) {
    const { data: rels } = await supabase
      .from("noticias_categorias")
      .select("noticia_id")
      .in("categoria_id", catIds);
    noticiaIds = rels?.map((r) => r.noticia_id) || [];
  }

  // 2. Query usando juego_id OR los IDs de noticias encontrados
  let orString = `juego_id.eq.${gameId}`;
  if (noticiaIds.length > 0) {
    // Eliminamos duplicados
    const uniqueIds = Array.from(new Set(noticiaIds));
    orString += `,id.in.(${uniqueIds.join(",")})`;
  }

  const { data, error } = await supabase
    .from("noticias")
    .select(`
      id, titulo, slug, contenido, imagen_portada, 
      fecha_publicacion, vistas, estado, type, data,
      autor:perfiles!noticias_autor_id_fkey(id, username, avatar_url)
    `)
    .eq("estado", "publicada")
    .is("deleted_at", null)
    .or(orString)
    .order("fecha_publicacion", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getGameNews]", error);
    return [];
  }

  return data || [];
}

/**
 * Obtiene los hilos del foro asociados a las categorías de un juego usando el slug y nombre.
 */
export async function getGameThreads(
  gameSlug: string,
  gameName: string,
  limit = 10
) {
  const supabase = await createClient();

  // 1. Buscar foros (hilos) mediante las categorías de foro que coincidan
  const { data: categorias } = await supabase
    .from("foro_categorias")
    .select("id")
    .eq("es_activa", true)
    .or(`slug.ilike.%${gameSlug}%,nombre.ilike.%${gameName}%`);

  if (!categorias || categorias.length === 0) return [];
  const rootCatIds = categorias.map((c) => c.id);

  // Buscar subcategorias (hasta 1 nivel por ahora)
  const { data: subcats } = await supabase
    .from("foro_categorias")
    .select("id")
    .eq("es_activa", true)
    .in("parent_id", rootCatIds);

  const allCatIds = [...rootCatIds, ...(subcats?.map((c) => c.id) || [])];

  const { data, error } = await supabase
    .from("foro_hilos")
    .select(`
      id, titulo, slug, vistas, created_at, es_fijado, es_cerrado,
      autor:perfiles!foro_hilos_autor_id_fkey(id, username, avatar_url, color)
    `)
    .eq("es_cerrado", false)
    .is("deleted_at", null)
    .in("categoria_id", allCatIds)
    .order("es_fijado", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getGameThreads]", error);
    return [];
  }

  return data || [];
}

/**
 * Obtiene los eventos de un juego.
 * Usa game_id (nueva migración) con fallback a juego_nombre para retrocompatibilidad.
 */
export async function getGameEvents(
  gameId: string,
  gameName: string,
  limit = 10
) {
  const supabase = await createClient();

  // Intentar primero por game_id (columna nueva), fallback a juego_nombre
  // Solo obtener eventos futuros (fecha >= hoy)
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("eventos")
    .select("*")
    .or(`game_id.eq.${gameId},juego_nombre.ilike.${gameName}`)
    .eq("estado", "publicado")
    .gte("fecha", now)
    .order("fecha", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[getGameEvents]", error);
    return [];
  }

  return data || [];
}

/**
 * Obtiene las builds públicas de un juego.
 */
export async function getGameBuilds(
  gameId: string,
  limit = 20,
  category?: string
) {
  const supabase = await createClient();

  let query = supabase
    .from("builds")
    .select(`
      id, title, slug, description, category, subcategory,
      mode, patch_version, data, tags,
      views_count, saves_count, is_featured, 
      created_at, updated_at,
      autor:perfiles!builds_user_id_fkey(id, username, avatar_url, color)
    `)
    .eq("game_id", gameId)
    .eq("status", "published")
    .eq("is_public", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getGameBuilds]", error);
    return [];
  }

  return data || [];
}
