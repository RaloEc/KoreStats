import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
    getGameBySlug,
    getGameModules,
    getGameNews,
    getGameEvents,
    getGameBuilds,
    getGameThreads,
} from "@/lib/games/games-data";
import { getDeltaForceWeaponsMeta } from "@/lib/games/delta-force-weapons";
import GamePageClient from "./GamePageClient";

interface GamePageProps {
    params: Promise<{ slug: string }>;
}

/**
 * Genera metadata SEO dinámica por juego.
 */
export async function generateMetadata({
    params,
}: GamePageProps): Promise<Metadata> {
    const { slug } = await params;
    const game = await getGameBySlug(slug);

    if (!game) {
        return {
            title: "Juego no encontrado | KoreStats",
        };
    }

    return {
        title: `${game.nombre} - Noticias, Builds y Estadísticas | KoreStats`,
        description:
            game.descripcion ||
            `Todo sobre ${game.nombre}: noticias, builds, parches, estadísticas y más en KoreStats.`,
        openGraph: {
            title: `${game.nombre} | KoreStats`,
            description:
                game.descripcion ||
                `Centro de información de ${game.nombre}`,
            images: game.imagen_portada_url
                ? [{ url: game.imagen_portada_url }]
                : undefined,
        },
    };
}

export default async function GamePage({ params }: GamePageProps) {
    const { slug } = await params;
    const game = await getGameBySlug(slug);

    if (!game) {
        notFound();
    }

    // Fetch paralelo de módulos y contenido
    const [modules, news, events, builds, threads] = await Promise.all([
        getGameModules(game.id),
        getGameNews(game.id, game.slug, game.nombre, 6),
        getGameEvents(game.id, game.nombre, 6),
        getGameBuilds(game.id, 6),
        getGameThreads(game.slug, game.nombre, 8),
    ]);

    // Crear mapa de qué módulos están activos
    const activeModules = modules.map((m) => m.module_type);

    // Si es Delta Force, cargar meta de armas para los widgets
    let weaponsMeta = null;
    if (game.slug === "delta-force") {
        weaponsMeta = await getDeltaForceWeaponsMeta("operations");
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <GamePageClient
                game={game}
                activeModules={activeModules}
                initialNews={news}
                initialEvents={events}
                initialBuilds={builds}
                initialThreads={threads}
                weaponsMeta={weaponsMeta}
            />
        </div>
    );
}
