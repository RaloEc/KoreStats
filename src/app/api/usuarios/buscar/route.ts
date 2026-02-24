import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ usuarios: [] });
    }

    const supabase = await createClient();

    // Limpiar la query de símbolos como @ que los usuarios suelen poner al buscar perfiles
    const cleanQuery = query.startsWith("@") ? query.slice(1) : query;

    // Buscar usuarios por username y perfiles públicos en paralelo
    const [usersRes, publicProfilesRes] = await Promise.all([
      supabase
        .from("perfiles")
        .select(
          "id, username, avatar_url, public_id, color, role, bio, followers_count",
        )
        .ilike("username", `%${cleanQuery}%`)
        .eq("activo", true)
        .limit(5),

      supabase
        .from("public_profiles")
        .select("id, display_name, slug, avatar_url, category, team_name")
        .or(`display_name.ilike.%${cleanQuery}%,slug.ilike.%${cleanQuery}%`)
        .eq("is_active", true)
        .limit(5),
    ]);

    if (usersRes.error) {
      console.error("Error buscando usuarios:", usersRes.error);
    }

    if (publicProfilesRes.error) {
      console.error(
        "Error buscando perfiles públicos:",
        publicProfilesRes.error,
      );
    }

    const usersData = usersRes.data || [];
    const publicProfilesData = publicProfilesRes.data || [];

    // Obtener conteo de hilos para cada usuario normal
    const usuariosConHilos = await Promise.all(
      usersData.map(async (usuario: any) => {
        const { count } = await supabase
          .from("foro_hilos")
          .select("*", { count: "exact", head: true })
          .eq("autor_id", usuario.id)
          .is("deleted_at", null);

        return {
          ...usuario,
          rol: usuario.role, // Mapear 'role' de la DB a 'rol' para el frontend
          hilos_count: count || 0,
          tipo: "usuario",
          profile_type: "user",
        };
      }),
    );

    // Formatear perfiles públicos
    const formattedPublicProfiles = publicProfilesData.map((p: any) => ({
      id: p.id,
      username: p.display_name,
      avatar_url: p.avatar_url,
      public_id: p.slug, // Usamos slug como ID público
      rol: p.category, // 'pro_player' o 'streamer'
      bio: p.team_name ? `Team: ${p.team_name}` : undefined,
      team_name: p.team_name,
      hilos_count: 0,
      tipo: "usuario", // Mantener tipo usuario para que el dropdown lo renderice
      profile_type: "public_profile",
    }));

    // Combinar resultados (priorizar perfiles públicos si lo deseas, o mezclarlos)
    const combinedResults = [...formattedPublicProfiles, ...usuariosConHilos];

    return NextResponse.json({
      usuarios: combinedResults,
    });
  } catch (error) {
    console.error("Error en búsqueda de usuarios:", error);
    return NextResponse.json({ usuarios: [] }, { status: 500 });
  }
}
