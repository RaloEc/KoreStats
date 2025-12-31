import { getMods } from "@/lib/mods/mods-data";
import ModsPageClient from "@/components/mods/ModsPageClient";

export const metadata = {
  title: "Mods de Minecraft - BitArena",
  description: "Descubre los mejores mods para mejorar tu experiencia de juego",
};

export const dynamic =
  process.env.IS_MOBILE === "true" ? "auto" : "force-dynamic";

export default async function ModsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const isMobile = process.env.IS_MOBILE === "true";
  const resolvedSearchParams = isMobile ? {} : searchParams;

  let mods: any[] = [];
  try {
    mods = await getMods();
  } catch (e) {
    console.error("Error fetching mods", e);
  }

  return (
    <ModsPageClient initialMods={mods} searchParams={resolvedSearchParams} />
  );
}
