import { getServiceClient } from "@/utils/supabase-service";
import * as cheerio from "cheerio";

// Interfaces
export interface HiloOptions {
  tipo?:
    | "recientes"
    | "populares"
    | "mas_votados"
    | "mas_vistos"
    | "sin_respuesta"
    | "destacados";
  limit?: number;
  page?: number;
  pageSize?: number;
  buscar?: string;
  categoriaSlug?: string;
  timeRange?: string;
}

// Función auxiliar para procesar contenido HTML
export function processContent(html: string | null) {
  if (!html) {
    return {
      excerpt: "",
      hasImage: false,
      hasVideo: false,
      hasCode: false,
      hasTweet: false,
      thumbnailUrl: null,
      images: [] as string[],
      youtubeVideoId: null,
    };
  }

  try {
    const $ = cheerio.load(html);
    const text = $.text().trim().replace(/\s+/g, " ");
    const excerpt = text.length > 250 ? text.substring(0, 250) + "..." : text;

    const images: string[] = [];
    $("img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && !src.includes("analytics") && !src.startsWith("data:")) {
        images.push(src);
      }
    });

    const hasImage = images.length > 0;
    const hasCode = $("pre").length > 0 || $("code").length > 0;

    let hasVideo = false;
    let youtubeVideoId: string | null = null;
    $("iframe").each((i, el) => {
      const src = $(el).attr("src") || "";
      if (src.includes("youtube.com") || src.includes("youtu.be")) {
        hasVideo = true;
        const match = src.match(
          /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        );
        if (match && match[2].length === 11) {
          youtubeVideoId = match[2];
        }
      }
    });

    const hasTweet = $('[data-type="twitter-embed"]').length > 0;

    return {
      excerpt,
      hasImage,
      hasVideo,
      hasCode,
      hasTweet,
      thumbnailUrl: images[0] || null,
      images: images.slice(0, 4),
      youtubeVideoId,
    };
  } catch (error) {
    console.error("Error procesando contenido HTML:", error);
    return {
      excerpt: "",
      hasImage: false,
      hasVideo: false,
      hasCode: false,
      hasTweet: false,
      thumbnailUrl: null,
      images: [],
      youtubeVideoId: null,
      error: true,
    };
  }
}

export async function getHilosForo(options: HiloOptions = {}) {
  const {
    tipo = "recientes",
    limit = 10,
    page = 1,
    pageSize = 10,
    buscar = "",
    categoriaSlug = null,
    timeRange = "24h",
  } = options;

  const supabase = getServiceClient();

  // Lógica de IDs de categorías
  let categoriasIds: string[] = [];
  if (categoriaSlug) {
    let categoriaId: string | null = null;
    // Regex UUID
    if (
      categoriaSlug.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      categoriaId = categoriaSlug;
    } else {
      const { data: categoria } = await supabase
        .from("foro_categorias")
        .select("id")
        .eq("slug", categoriaSlug)
        .single();
      if (categoria) categoriaId = categoria.id;
    }

    if (categoriaId) {
      const { data: todasLasCategorias } = await supabase
        .from("foro_categorias")
        .select("id, parent_id");

      const getSubcategoriesIds = (
        parentId: string,
        allCats: any[]
      ): string[] => {
        const ids = [parentId];
        const subcats =
          allCats?.filter((cat) => cat.parent_id === parentId) || [];
        subcats.forEach((subcat) => {
          ids.push(...getSubcategoriesIds(subcat.id, allCats));
        });
        return ids;
      };

      categoriasIds = getSubcategoriesIds(
        categoriaId,
        todasLasCategorias || []
      );
    }
  }

  const getDateFromRange = (range: string): string => {
    const now = new Date();
    const from = new Date(now);
    if (range === "24h") {
      from.setHours(now.getHours() - 24);
    } else {
      from.setDate(now.getDate() - 7);
    }
    return from.toISOString();
  };

  const baseSelect = `
    id, slug, titulo, contenido, autor_id, created_at, updated_at, ultimo_post_at, vistas,
    votos_conteo:foro_votos_hilos(count),
    respuestas_conteo:foro_posts(count),
    autor:perfiles!autor_id(id, username, public_id, role, avatar_url, color),
    categoria:foro_categorias!categoria_id(nombre, slug, color),
    weapon_stats_record:weapon_stats_records!weapon_stats_id(id, weapon_name, stats)
  `;

  let query = supabase
    .from("foro_hilos")
    .select(baseSelect, { count: "exact" })
    .is("deleted_at", null);

  if (categoriasIds.length > 0) {
    query = query.in("categoria_id", categoriasIds);
  }

  if (buscar) {
    query = query.or(`titulo.ilike.%${buscar}%,contenido.ilike.%${buscar}%`);
    try {
      const { data: perfilesCoincidentes } = await supabase
        .from("perfiles")
        .select("id")
        .ilike("username", `%${buscar}%`);

      if (perfilesCoincidentes?.length) {
        const autorIds = perfilesCoincidentes.map((p) => p.id);
        query = query.or(`autor_id.in.(${autorIds.join(",")})`);
      }
    } catch {}
  }

  // Mapeo de tipos
  let activeTab = tipo;
  if (tipo === "destacados") activeTab = "populares";
  if ((tipo as any) === "sin_respuestas") activeTab = "sin_respuesta";

  let hasNextPage = false;
  let items: any[] = [];
  let count = 0;

  // Lógica de ordenamiento y paginación
  if (activeTab === "recientes") {
    if (limit && limit !== 10) {
      query = query.order("created_at", { ascending: false }).limit(limit);
    } else {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.order("created_at", { ascending: false }).range(from, to);
    }
  } else if (activeTab === "populares") {
    const fromIso = getDateFromRange(timeRange);
    query = query
      .gte("ultimo_post_at", fromIso)
      .order("updated_at", { ascending: false })
      .limit(limit || 50);
  } else if (activeTab === "mas_votados") {
    query = query.order("votos_conteo", { ascending: false }).limit(limit);
  } else if (activeTab === "mas_vistos") {
    query = query.order("vistas", { ascending: false }).limit(limit);
  } else if (activeTab === "sin_respuesta") {
    // Filtrado posterior en memoria para sin respuesta exacta, pero traemos los recientes
    query = query.order("created_at", { ascending: false }).limit(limit || 50);
  } else {
    if (limit && limit !== 10) {
      query = query.order("created_at", { ascending: false }).limit(limit);
    } else {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.order("created_at", { ascending: false }).range(from, to);
    }
  }

  const { data, error, count: totalCount } = await query;
  if (error) throw error;
  items = data || [];
  count = totalCount || 0;

  // Post-procesamiento
  if (activeTab === "populares") {
    items = items.sort((a, b) => {
      const votosA = Array.isArray(a.votos_conteo)
        ? a.votos_conteo[0]?.count ?? 0
        : (a.votos_conteo as any)?.count ?? 0;
      const votosB = Array.isArray(b.votos_conteo)
        ? b.votos_conteo[0]?.count ?? 0
        : (b.votos_conteo as any)?.count ?? 0;
      const respuestasA = Array.isArray(a.respuestas_conteo)
        ? a.respuestas_conteo[0]?.count ?? 0
        : (a.respuestas_conteo as any)?.count ?? 0;
      const respuestasB = Array.isArray(b.respuestas_conteo)
        ? b.respuestas_conteo[0]?.count ?? 0
        : (b.respuestas_conteo as any)?.count ?? 0;

      const scoreA = respuestasA * 2 + votosA;
      const scoreB = respuestasB * 2 + votosB;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime()
      );
    });

    if (limit && limit !== 10) items = items.slice(0, limit);
    else {
      items = items.slice((page - 1) * pageSize, page * pageSize);
      hasNextPage = items.length === pageSize;
    }
  } else if (activeTab === "sin_respuesta") {
    items = items.filter((h) => {
      const respuestas = Array.isArray(h.respuestas_conteo)
        ? h.respuestas_conteo[0]?.count ?? 0
        : (h.respuestas_conteo as any)?.count ?? 0;
      return respuestas === 0;
    });
    if (limit && limit !== 10) items = items.slice(0, limit);
    else {
      items = items.slice((page - 1) * pageSize, page * pageSize);
      hasNextPage = items.length === pageSize;
    }
  } else {
    if (!(limit && limit !== 10)) {
      hasNextPage = page * pageSize < count;
    }
  }

  // Normalización
  const hilosNormalizados = items.map((hilo: any) => {
    const votos = Array.isArray(hilo.votos_conteo)
      ? hilo.votos_conteo[0]?.count ?? 0
      : (hilo.votos_conteo as any)?.count ?? 0;
    const respuestas = Array.isArray(hilo.respuestas_conteo)
      ? hilo.respuestas_conteo[0]?.count ?? 0
      : (hilo.respuestas_conteo as any)?.count ?? 0;

    let weaponStatsRecord = null;
    if (hilo.weapon_stats_record) {
      const statsValue = hilo.weapon_stats_record.stats;
      let parsedStats = statsValue;
      if (typeof statsValue === "string") {
        try {
          parsedStats = JSON.parse(statsValue);
        } catch {}
      }
      if (parsedStats) {
        weaponStatsRecord = {
          id: hilo.weapon_stats_record.id,
          weapon_name: hilo.weapon_stats_record.weapon_name ?? null,
          stats: parsedStats,
        };
      }
    }

    const mediaMetadata = processContent(hilo.contenido);

    return {
      id: hilo.id,
      slug: hilo.slug,
      titulo: hilo.titulo,
      contenido: hilo.contenido,
      excerpt: mediaMetadata.excerpt,
      media_metadata: mediaMetadata,
      autor_id: hilo.autor_id,
      created_at: hilo.created_at,
      updated_at: hilo.updated_at,
      ultimo_post_at: hilo.ultimo_post_at,
      vistas: hilo.vistas || 0,
      votos_conteo: votos,
      respuestas_conteo: respuestas,
      perfiles: {
        id: hilo.autor?.id ?? null,
        username: hilo.autor?.username || "Anónimo",
        public_id: hilo.autor?.public_id || null,
        avatar_url: hilo.autor?.avatar_url || null,
        rol: hilo.autor?.role,
        color: hilo.autor?.color || null,
      },
      foro_categorias: hilo.categoria
        ? {
            nombre: hilo.categoria.nombre || "Sin categoría",
            slug: hilo.categoria.slug || "",
            color: hilo.categoria.color || "#3b82f6",
          }
        : undefined,
      weapon_stats_record: weaponStatsRecord,
    };
  });

  return {
    hilos: hilosNormalizados,
    hasNextPage,
    total: count,
  };
}
