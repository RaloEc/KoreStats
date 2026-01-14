/**
 * EJEMPLO: page.tsx OPTIMIZADO
 *
 * Cambios principales:
 * 1. SSR minimalista - solo datos críticos para SEO
 * 2. Sin matches ni stats en server (se cargan en cliente)
 * 3. Streaming con Suspense correctamente implementado
 */

import { Suspense } from "react";
import UserProfileClient from "@/components/perfil/UserProfileClient";
import { PerfilSkeleton } from "@/components/perfil/PerfilSkeleton";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

// Forzar renderizado dinámico pero con cache
export const dynamic = "force-dynamic";
export const revalidate = 60;

// Cache de metadata en edge
export const runtime = "edge";

/**
 * Función SSR LIGERA - Solo obtiene lo mínimo para SEO
 * Reduce de 7 queries a 2 queries
 */
async function getProfileLight(username: string) {
  const supabase = await createClient();

  // Query 1: Solo campos esenciales del perfil
  const { data: profile } = await supabase
    .from("perfiles")
    .select(
      `
      id,
      username,
      public_id,
      avatar_url,
      bio,
      color
    `
    )
    .or(`public_id.eq.${username},username.eq.${username}`)
    .single();

  if (!profile) return null;

  // Query 2: Solo datos básicos de Riot para mostrar rank en header
  const { data: riotAccount } = await supabase
    .from("linked_accounts_riot")
    .select(
      `
      puuid,
      game_name,
      tag_line,
      solo_tier,
      solo_division,
      profile_icon_id
    `
    )
    .eq("user_id", profile.id)
    .single();

  return { profile, riotAccount };
}

/**
 * Metadata - Se genera rápido porque solo usa datos ligeros
 */
export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const data = await getProfileLight(params.username);

  if (!data?.profile) {
    return { title: "Perfil no encontrado - BitArena" };
  }

  return {
    title: `${data.profile.username} - BitArena`,
    description: data.profile.bio || `Perfil de ${data.profile.username}`,
    openGraph: {
      images: [data.profile.avatar_url || "/images/default-avatar.png"],
    },
  };
}

/**
 * Componente de página - SSR MINIMALISTA
 *
 * Tiempo estimado de SSR: 0.3-0.5s (vs 3-5s anterior)
 */
export default async function UserProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const data = await getProfileLight(params.username);

  if (!data?.profile) {
    return notFound();
  }

  return (
    <Suspense fallback={<PerfilSkeleton />}>
      <UserProfileClient
        initialProfile={data.profile}
        initialRiotAccount={data.riotAccount}
        // ⚠️ SIN initialMatchesData
        // ⚠️ SIN initialStats
        // → Se cargan en cliente con TanStack Query
      />
    </Suspense>
  );
}
