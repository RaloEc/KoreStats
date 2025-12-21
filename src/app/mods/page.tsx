import { getMods } from "@/lib/mods/mods-data";
import ModsPageClient from "@/components/mods/ModsPageClient";

export const metadata = {
  title: "Mods de Minecraft - BitArena",
  description: "Descubre los mejores mods para mejorar tu experiencia de juego",
};

export const dynamic = "force-dynamic";

export default async function ModsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const mods = await getMods();

  return <ModsPageClient initialMods={mods} searchParams={searchParams} />;
}
