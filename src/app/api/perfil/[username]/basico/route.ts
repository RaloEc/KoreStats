import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface ExtendedStats {
  hilos: number;
  posts: number;
  promedio_respuestas_por_hilo: number;
  categoria_favorita: string | null;
  ultima_actividad: string | null;
  followers: number;
  friends: number;
}

export async function GET(
  request: Request,
  { params }: { params: { username: string } },
) {
  const supabase = await createClient();
  const publicId = params.username;

  try {
    // Obtener datos básicos del perfil (carga rápida)
    let { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select(
        "id, username, public_id, created_at, avatar_url, banner_url, bio, color, role",
      )
      .eq("public_id", publicId)
      .single();

    // Si no encontramos por public_id, intentar por username
    if (perfilError || !perfil) {
      console.log(
        `[Perfil Basico API] public_id "${publicId}" no encontrado, intentando por username...`,
      );
      const { data: perfilPorUsername, error: errorUsername } = await supabase
        .from("perfiles")
        .select(
          "id, username, public_id, created_at, avatar_url, banner_url, bio, color, role",
        )
        .eq("username", publicId)
        .single();

      if (errorUsername || !perfilPorUsername) {
        console.error(
          "Error fetching basic profile by public_id or username:",
          perfilError,
          errorUsername,
        );
        return NextResponse.json(
          { error: "Perfil no encontrado" },
          { status: 404 },
        );
      }

      perfil = perfilPorUsername;
    }

    // Obtener estadísticas extendidas
    const { count: hilosCount } = await supabase
      .from("foro_hilos")
      .select("*", { count: "exact", head: true })
      .eq("autor_id", perfil.id)
      .is("deleted_at", null);

    const { count: postsCount } = await supabase
      .from("foro_posts")
      .select("*", { count: "exact", head: true })
      .eq("autor_id", perfil.id)
      .is("deleted_at", null);

    // Calcular promedio de respuestas por hilo
    const { data: hilosConRespuestas } = await supabase
      .from("foro_hilos")
      .select(
        "id, (select count(*) from foro_posts where hilo_id = foro_hilos.id and deleted_at is null) as respuestas_count",
      )
      .eq("autor_id", perfil.id)
      .is("deleted_at", null);

    const totalRespuestas = (hilosConRespuestas || []).reduce(
      (sum: number, hilo: any) => sum + (hilo.respuestas_count || 0),
      0,
    );
    const promedioRespuestas =
      hilosCount && hilosCount > 0
        ? Math.round((totalRespuestas / hilosCount) * 10) / 10
        : 0;

    // Obtener categoría favorita
    const { data: categoriaFavorita } = await supabase
      .from("foro_hilos")
      .select("foro_categorias!inner(titulo)")
      .eq("autor_id", perfil.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    let categoriaTitulo: string | null = null;
    if (categoriaFavorita && categoriaFavorita.length > 0) {
      const firstItem = categoriaFavorita[0] as any;
      const categorias = firstItem.foro_categorias;
      if (Array.isArray(categorias) && categorias.length > 0) {
        categoriaTitulo = categorias[0].titulo;
      } else if (
        categorias &&
        typeof categorias === "object" &&
        "titulo" in categorias
      ) {
        categoriaTitulo = (categorias as any).titulo;
      }
    }

    // Obtener última actividad
    const { data: ultimaActividad } = await supabase
      .from("foro_posts")
      .select("created_at")
      .eq("autor_id", perfil.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Obtener seguidores
    const { count: followersCount } = await supabase
      .from("social_follows")
      .select("*", { count: "exact", head: true })
      .eq("followed_id", perfil.id);

    // Obtener amigos (bi-direccional)
    const { count: friendsCount } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .or(`user_one_id.eq.${perfil.id},user_two_id.eq.${perfil.id}`);

    const stats: ExtendedStats = {
      hilos: hilosCount || 0,
      posts: postsCount || 0,
      promedio_respuestas_por_hilo: promedioRespuestas,
      categoria_favorita: categoriaTitulo,
      ultima_actividad: ultimaActividad?.created_at || null,
      followers: followersCount || 0,
      friends: friendsCount || 0,
    };

    return NextResponse.json({
      ...perfil,
      stats,
    });
  } catch (error) {
    console.error("Unexpected error fetching basic profile:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
