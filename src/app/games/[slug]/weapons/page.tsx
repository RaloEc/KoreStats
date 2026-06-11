import { notFound } from "next/navigation";
import {
    getGameBySlug,
    getGameModules
} from "@/lib/games/games-data";
import DeltaForceWeaponsMeta from "@/components/weapon/DeltaForceWeaponsMeta";
import Link from "next/link";
import { ChevronLeft, Swords } from "lucide-react";

interface WeaponsPageProps {
    params: Promise<{ slug: string }>;
}

export default async function WeaponsPage({ params }: WeaponsPageProps) {
    const { slug } = await params;
    const game = await getGameBySlug(slug);

    if (!game) {
        notFound();
    }

    const modules = await getGameModules(game.id);
    const activeModules = modules.map((m) => m.module_type);

    if (!activeModules.includes("weapons")) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="container mx-auto px-4 py-6 max-w-6xl">
                {/* Weapons specific view */}
                {slug === "delta-force" ? (
                    <DeltaForceWeaponsMeta />
                ) : (
                    <div className="p-16 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30">
                        <Swords className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2"> Meta de Armas </h3>
                        <p className="text-gray-500 dark:text-gray-500 max-w-md mx-auto">
                            Esta sección aún no está disponible para {game.nombre}.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
