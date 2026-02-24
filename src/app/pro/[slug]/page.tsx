import { notFound } from "next/navigation";
import { getPublicProfileBySlug } from "@/lib/public-profiles/server-data";
import PublicProfileClient from "@/components/public-profile/PublicProfileClient";
import { Metadata } from "next";

export const revalidate = 60; // Revalidar cada minuto para stats semi-live

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const profile = await getPublicProfileBySlug(decodeURIComponent(params.slug));
  if (!profile) return { title: "Perfil Público - KoreStats" };

  return {
    title: `${profile.display_name} - Perfil de ${profile.category === "pro_player" ? "Pro Player" : "Streamer"} | KoreStats`,
    description: `Analiza las estadísticas, builds y partidas recientes de ${profile.display_name}.`,
    openGraph: {
      images: [profile.avatar_url || "/images/default-avatar.png"],
    },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  const decodedSlug = decodeURIComponent(params.slug);
  console.log(
    `[PublicProfilePage] Buscando slug decodificado: "${decodedSlug}"`,
  );
  const profile = await getPublicProfileBySlug(decodedSlug);
  console.log(
    `[PublicProfilePage] Resultado para "${params.slug}":`,
    profile ? "Encontrado" : "NULL",
  );

  if (!profile) {
    return notFound();
  }

  // Asegurarnos de que el perfil está activo o el usuario es admin (implementación simplificada para ahora)
  if (!profile.is_active) {
    // Aquí podríamos chequear cookies para ver si es admin, por ahora solo 404
    return notFound();
  }

  return <PublicProfileClient profile={profile} />;
}
