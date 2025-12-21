import { createClient } from "@/lib/supabase/server";
import { ProfileData } from "@/hooks/use-perfil-usuario";
import { LinkedAccountRiot } from "@/types/riot";

export async function getProfileByUsername(username: string) {
  const supabase = await createClient();

  // 1. Obtener usuario actual
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // 1. Obtener el perfil
  let { data: perfil, error: perfilError } = await supabase
    .from("perfiles")
    .select(
      "id, username, public_id, created_at, avatar_url, banner_url, bio, color, role, followers_count, following_count, friends_count, connected_accounts"
    )
    .eq("public_id", username)
    .single();

  if (perfilError || !perfil) {
    const { data: perfilPorUsername, error: errorUsername } = await supabase
      .from("perfiles")
      .select(
        "id, username, public_id, created_at, avatar_url, banner_url, bio, color, role, followers_count, following_count, friends_count, connected_accounts"
      )
      .eq("username", username)
      .single();

    if (errorUsername || !perfilPorUsername) {
      return null;
    }
    perfil = perfilPorUsername;
  }

  return { perfil, currentUser };
}

export async function getRiotAccountByUserId(
  userId: string
): Promise<LinkedAccountRiot | null> {
  const supabase = await createClient();
  const { data: riotAccount } = await supabase
    .from("linked_accounts_riot")
    .select("*")
    .eq("user_id", userId)
    .single();

  return riotAccount;
}

export async function getProfileByUserId(userId: string) {
  const supabase = await createClient();
  const { data: perfil } = await supabase
    .from("perfiles")
    .select(
      "id, username, public_id, created_at, avatar_url, banner_url, bio, color, role, followers_count, following_count, friends_count, connected_accounts, ubicacion, sitio_web, activo, ultimo_acceso, updated_at"
    )
    .eq("id", userId)
    .single();

  return perfil;
}

import { StaticProfileData } from "@/hooks/use-profile-page-data";

export async function getStaticProfileData(
  userId: string
): Promise<StaticProfileData | null> {
  const perfil = await getProfileByUserId(userId);
  if (!perfil) return null;

  const riotAccount = await getRiotAccountByUserId(userId);

  // Parse connected_accounts
  let connectedAccounts: Record<string, string> = {};
  if (perfil.connected_accounts) {
    if (typeof perfil.connected_accounts === "string") {
      try {
        connectedAccounts = JSON.parse(perfil.connected_accounts);
      } catch (e) {}
    } else {
      connectedAccounts = perfil.connected_accounts as Record<string, string>;
    }
  }

  // Mapear al tipo estricto de StaticProfileData
  return {
    perfil: {
      id: perfil.id,
      username: perfil.username,
      role: (perfil.role as "user" | "admin" | "moderator") || "user",
      avatar_url: perfil.avatar_url,
      banner_url: perfil.banner_url,
      color: perfil.color,
      bio: perfil.bio,
      ubicacion: perfil.ubicacion,
      sitio_web: perfil.sitio_web,
      connected_accounts: connectedAccounts,
      activo: perfil.activo,
      ultimo_acceso: perfil.ultimo_acceso,
      created_at: perfil.created_at,
      updated_at: perfil.updated_at,
      followers_count: perfil.followers_count,
      following_count: perfil.following_count,
      friends_count: perfil.friends_count,
    },
    riotAccount: riotAccount as any, // Casting simple, coinciden mayormente
  };
}

export async function getProfileInitialData(username: string): Promise<{
  profile: ProfileData | null;
  riotAccount: LinkedAccountRiot | null;
}> {
  try {
    const profile = await getFullProfileData(username);
    if (!profile) return { profile: null, riotAccount: null };

    const riotAccount = await getRiotAccountByUserId(profile.id);

    return {
      profile,
      riotAccount,
    };
  } catch (error) {
    console.error("Error getting profile initial data:", error);
    return { profile: null, riotAccount: null };
  }
}

export async function getFullProfileData(
  username: string
): Promise<ProfileData | null> {
  const supabase = await createClient();
  const baseData = await getProfileByUsername(username);

  if (!baseData) return null;
  const { perfil, currentUser } = baseData;

  let hiddenActivities: Set<string> = new Set();
  const { data: hidden } = await supabase
    .from("activity_visibility")
    .select("activity_type, activity_id")
    .eq("user_id", perfil.id); // Usar perfil.id, no currentUser.id

  if (hidden) {
    hiddenActivities = new Set(
      hidden.map((h) => `${h.activity_type}:${h.activity_id}`)
    );
  }

  const [
    hilosCount,
    postsCount,
    ultimosHilosData,
    ultimosPostsData,
    weaponStatsData,
    ultimasPartidasData,
    riotAccountData,
  ] = await Promise.all([
    supabase
      .from("foro_hilos")
      .select("*", { count: "exact", head: true })
      .eq("autor_id", perfil.id)
      .is("deleted_at", null),
    supabase
      .from("foro_posts")
      .select("*", { count: "exact", head: true })
      .eq("autor_id", perfil.id)
      .is("deleted_at", null),

    supabase
      .from("foro_hilos")
      .select(
        "id, slug, titulo, contenido, created_at, vistas, foro_categorias!inner(nombre), respuestas_conteo:foro_posts(count), weapon_stats_record:weapon_stats_records!weapon_stats_id(id)"
      )
      .eq("autor_id", perfil.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("foro_posts")
      .select(
        "id, contenido, gif_url, created_at, hilo_id, foro_hilos!inner(titulo, deleted_at)"
      )
      .eq("autor_id", perfil.id)
      .is("deleted_at", null)
      .is("foro_hilos.deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("weapon_stats_records")
      .select(
        "id, weapon_name, created_at, stats, foro_hilos!inner(id, slug, titulo, created_at, vistas, deleted_at, foro_categorias!inner(nombre))"
      )
      .eq("user_id", perfil.id)
      .is("foro_hilos.deleted_at", null)
      .order("created_at", { ascending: false }),

    supabase
      .from("user_activity_entries")
      .select("id, match_id, metadata, created_at")
      .eq("user_id", perfil.id)
      .eq("type", "lol_match")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("linked_accounts_riot")
      .select("puuid")
      .eq("user_id", perfil.id)
      .single(),
  ]);

  let hilosTransformados: any[] = [];
  if (ultimosHilosData.data) {
    hilosTransformados = ultimosHilosData.data
      .filter((hilo: any) => !hiddenActivities.has(`forum_thread:${hilo.id}`))
      .map((hilo: any) => {
        const respuestas = Array.isArray(hilo.respuestas_conteo)
          ? hilo.respuestas_conteo[0]?.count ?? 0
          : hilo.respuestas_conteo?.count ?? 0;
        const weaponStatsRelation = Array.isArray(hilo.weapon_stats_record)
          ? hilo.weapon_stats_record[0]
          : hilo.weapon_stats_record;
        return {
          id: hilo.id,
          slug: hilo.slug,
          titulo: hilo.titulo,
          contenido: hilo.contenido,
          created_at: hilo.created_at,
          vistas: hilo.vistas ?? 0,
          respuestas: respuestas,
          hasWeaponStats: Boolean(weaponStatsRelation?.id),
          categoria_titulo: Array.isArray(hilo.foro_categorias)
            ? hilo.foro_categorias[0]?.nombre ?? "Sin categoría"
            : hilo.foro_categorias?.nombre ?? "Sin categoría",
        };
      });
  }

  const limpiarHTML = (html: string) =>
    !html ? "" : html.replace(/<[^>]*>/g, "").substring(0, 100) + "...";
  let postsLimpios: any[] = [];
  if (ultimosPostsData.data) {
    postsLimpios = ultimosPostsData.data
      .filter((post: any) => !hiddenActivities.has(`forum_post:${post.id}`))
      .map((post: any) => {
        const hilo = Array.isArray(post.foro_hilos)
          ? post.foro_hilos[0]
          : post.foro_hilos;
        return {
          id: post.id,
          contenido: limpiarHTML(post.contenido),
          created_at: post.created_at,
          hilo_id: post.hilo_id,
          hilo_titulo: hilo?.titulo ?? "Hilo desconocido",
          gif_url: post.gif_url ?? null,
        };
      });
  }

  const weaponStatsTransformadasMap = new Map<string, any>();
  const weaponStatsRecords = weaponStatsData.data || [];
  for (const record of weaponStatsRecords) {
    const hiloRelacion = Array.isArray(record.foro_hilos)
      ? record.foro_hilos[0]
      : record.foro_hilos;
    if (!hiloRelacion) continue;
    const categoriaRelacion = Array.isArray(hiloRelacion.foro_categorias)
      ? hiloRelacion.foro_categorias[0]
      : hiloRelacion.foro_categorias;

    let statsNormalizadas = record.stats;
    if (typeof statsNormalizadas === "string") {
      try {
        statsNormalizadas = JSON.parse(statsNormalizadas);
      } catch (e) {}
    }

    const clave = `${hiloRelacion.id}`;
    if (!weaponStatsTransformadasMap.has(clave)) {
      weaponStatsTransformadasMap.set(clave, {
        id: record.id,
        weapon_name: record.weapon_name,
        created_at: record.created_at,
        stats: statsNormalizadas,
        hilo: {
          id: hiloRelacion.id,
          slug: hiloRelacion.slug,
          titulo: hiloRelacion.titulo,
          created_at: hiloRelacion.created_at,
          vistas: hiloRelacion.vistas ?? 0,
          categoria_titulo: categoriaRelacion?.nombre ?? "Sin categoría",
        },
      });
    }
  }
  const weaponStatsTransformadas = Array.from(
    weaponStatsTransformadasMap.values()
  );

  return {
    ...perfil,
    stats: {
      hilos: hilosCount.count ?? 0,
      posts: postsCount.count ?? 0,
    },
    ultimosHilos: hilosTransformados,
    ultimosPosts: postsLimpios,
    weaponStatsRecords: weaponStatsTransformadas,
    ultimasPartidas: [],
  } as unknown as ProfileData;
}
