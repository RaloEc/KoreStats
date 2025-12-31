import { Suspense } from "react";
import UserProfileClient from "@/components/perfil/UserProfileClient";
import { PerfilSkeleton } from "@/components/perfil/PerfilSkeleton";
import { getProfileInitialData } from "@/lib/perfil/server-data";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getServiceClient } from "@/lib/supabase/server";

export async function generateStaticParams() {
  if (process.env.IS_MOBILE !== "true") {
    return [];
  }

  const supabase = getServiceClient();
  const { data: perfiles } = await supabase.from("perfiles").select("username");

  return (perfiles || []).map((perfil) => ({
    username: perfil.username,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
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
}

export default async function UserProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const { profile, riotAccount } = await getProfileInitialData(params.username);

  if (!profile) {
    return notFound();
  }

  return (
    <Suspense fallback={<PerfilSkeleton />}>
      <UserProfileClient
        initialProfile={profile}
        initialRiotAccount={riotAccount}
      />
    </Suspense>
  );
}
