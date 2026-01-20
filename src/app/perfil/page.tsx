import { Suspense } from "react";
import PerfilPageClient from "@/components/perfil/PerfilPageClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getStaticProfileData } from "@/lib/perfil/server-data";

export const metadata = {
  title: "Mi Perfil - KoreStats",
  description:
    "Gestiona tu perfil, visualiza tus estadísticas y conecta tus cuentas.",
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const staticData = await getStaticProfileData(user.id);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <PerfilPageClient initialStaticData={staticData} />
    </Suspense>
  );
}
