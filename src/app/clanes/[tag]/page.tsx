import { Metadata } from "next";
import { notFound } from "next/navigation";
import { clanService } from "@/lib/clanes/clanService";
import ClanProfileClient from "@/components/clanes/ClanProfileClient";

interface ClanTagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: ClanTagPageProps): Promise<Metadata> {
  const { tag } = await params;

  try {
    const clan = await clanService.getClanByTag(tag);
    const gameLabel =
      clan.game === "league_of_legends" ? "League of Legends" : "Delta Force";
    return {
      title: `${clan.name} [${clan.tag}] — Clan de ${gameLabel} | KoreStats`,
      description:
        clan.description ||
        `Descubre el clan ${clan.name} en KoreStats. Únete o solicita ingreso al clan de ${gameLabel}.`,
    };
  } catch {
    return {
      title: "Clan | KoreStats",
    };
  }
}

export default async function ClanTagPage({ params }: ClanTagPageProps) {
  const { tag } = await params;
  return <ClanProfileClient tag={tag} />;
}
