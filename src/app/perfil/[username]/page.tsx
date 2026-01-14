import { Suspense } from "react";
import UserProfileClient from "@/components/perfil/UserProfileClient";
import { PerfilSkeleton } from "@/components/perfil/PerfilSkeleton";
import { getProfileInitialData } from "@/lib/perfil/server-data";
import {
  getProfileInitialDataLight,
  getProfileForMetadata,
} from "@/lib/perfil/server-data-light";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getServiceClient } from "@/lib/supabase/server";

// Forzar renderizado dinámico para evitar errores 500
export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateStaticParams() {
  // Solo generar params estáticos para mobile build
  if (process.env.IS_MOBILE !== "true") {
    return [];
  }

  try {
    const supabase = getServiceClient();
    const { data: perfiles, error } = await supabase
      .from("perfiles")
      .select("username");

    if (error) {
      console.error("[generateStaticParams] Error fetching perfiles:", error);
      return [];
    }

    return (perfiles || []).map((perfil) => ({
      username: perfil.username,
    }));
  } catch (error) {
    console.error("[generateStaticParams] Error:", error);
    return [];
  }
}

/**
 * Metadata OPTIMIZADA - Usa función ligera que solo obtiene campos necesarios
 */
export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  try {
    // OPTIMIZADO: Usar función ligera en lugar de getProfileInitialData
    const profile = await getProfileForMetadata(params.username);

    if (!profile) {
      return {
        title: "Perfil no encontrado - BitArena",
      };
    }

    return {
      title: `Perfil de ${profile.username} - BitArena`,
      description:
        profile.bio || `Perfil de usuario de ${profile.username} en BitArena`,
      openGraph: {
        images: [profile.avatar_url || "/images/default-avatar.png"],
      },
    };
  } catch (error) {
    console.error("[generateMetadata] Error:", error);
    return {
      title: "Perfil - BitArena",
    };
  }
}

/**
 * Página de Perfil OPTIMIZADA
 *
 * ANTES: SSR cargaba 9 queries + matches + stats = 3-5s TTFB
 * AHORA: SSR carga solo 2 queries (perfil + riotAccount ligero) = <500ms TTFB
 *
 * Los matches y stats se cargan en el cliente con TanStack Query,
 * que tiene cache y puede mostrar skeletons mientras carga.
 */
export default async function UserProfilePage({
  params,
}: {
  params: { username: string };
}) {
  try {
    // ═══════════════════════════════════════════════════════════════════
    // OPTIMIZACIÓN: Cargar datos completos del perfil pero SIN matches/stats
    // Esto reduce el TTFB de 3-5s a <500ms
    // ═══════════════════════════════════════════════════════════════════
    const { profile, riotAccount } = await getProfileInitialData(
      params.username
    );

    // ⚠️ ELIMINADO: Ya no cargamos matches ni stats en SSR
    // Estos se cargan en el cliente con TanStack Query para mejor UX:
    // - Muestra skeleton mientras carga
    // - Tiene cache que evita re-fetches innecesarios
    // - Permite infinite scroll sin bloquear SSR

    if (!profile) {
      return notFound();
    }

    return (
      <Suspense fallback={<PerfilSkeleton />}>
        <UserProfileClient
          initialProfile={profile}
          initialRiotAccount={riotAccount}
          // ⚠️ SIN initialMatchesData - se carga en cliente
          // ⚠️ SIN initialStats - se carga en cliente
        />
      </Suspense>
    );
  } catch (error) {
    console.error("[UserProfilePage] Error crítico:", error);
    return notFound();
  }
}
