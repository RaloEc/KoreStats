import { Suspense } from "react";
import UserProfileClient from "@/components/perfil/UserProfileClient";
import { PerfilSkeleton } from "@/components/perfil/PerfilSkeleton";
import { getProfileInitialData } from "@/lib/perfil/server-data";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getServiceClient } from "@/lib/supabase/server";
import { getMatchHistory, getPlayerStats } from "@/lib/riot/matches";

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

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  try {
    const { profile } = await getProfileInitialData(params.username);

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

export default async function UserProfilePage({
  params,
}: {
  params: { username: string };
}) {
  try {
    const { profile, riotAccount } = await getProfileInitialData(
      params.username
    );

    let initialMatchesData = null;
    let initialStats = null;

    if (riotAccount) {
      const [matchesResult, statsResult] = await Promise.all([
        getMatchHistory(riotAccount.puuid, { limit: 10 }),
        getPlayerStats(riotAccount.puuid, { limit: 40 }),
      ]);
      initialMatchesData = matchesResult;
      initialStats = statsResult;
    }

    if (!profile) {
      return notFound();
    }

    return (
      <Suspense fallback={<PerfilSkeleton />}>
        <UserProfileClient
          initialProfile={profile}
          initialRiotAccount={riotAccount}
          initialMatchesData={initialMatchesData}
          initialStats={initialStats}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("[UserProfilePage] Error crítico:", error);
    return notFound();
  }
}
