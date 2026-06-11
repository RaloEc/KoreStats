import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Black_Ops_One } from "next/font/google";

export const dynamic = "force-dynamic";
import {
    getGameBySlug,
    getGameModules,
    getGameNews,
    getGameEvents,
    getGameBuilds,
    getGameThreads,
} from "@/lib/games/games-data";
import { getDeltaForceWeaponsMeta } from "@/lib/games/delta-force-weapons";
import { createClient } from "@/lib/supabase/server";
import GamePageClient from "./GamePageClient";

const blackOpsOne = Black_Ops_One({
    subsets: ["latin"],
    weight: ["400"],
    variable: "--font-black-ops",
    display: "swap",
});

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
        weaponsMeta = await getDeltaForceWeaponsMeta("all");
    }

    // Obtener estadísticas dinámicas
    const supabase = await createClient();

    // 1. Conteo de Builds según el juego
    let buildsCount = 0;
    if (game.slug === "delta-force") {
        const { count } = await supabase
            .from("weapon_stats_records")
            .select("*", { count: "exact", head: true });
        buildsCount = count || 0;
    } else {
        const { count } = await supabase
            .from("builds")
            .select("*", { count: "exact", head: true })
            .eq("game_id", game.id)
            .eq("status", "published");
        buildsCount = count || 0;
    }

    // 2. Conteo de Usuarios según el juego (en DF: usuarios que han interactuado/creado builds)
    let usersCount = 0;
    if (game.slug === "delta-force") {
        const { data } = await supabase
            .from("weapon_stats_records")
            .select("user_id");
        const userIds = data?.map(r => r.user_id).filter(Boolean) || [];
        usersCount = new Set(userIds).size;
    } else {
        const { count } = await supabase
            .from("perfiles")
            .select("*", { count: "exact", head: true });
        usersCount = count || 0;
    }

    // 3. Conteo de Noticias por categoría y subcategorías
    let newsCount = 0;
    const { data: catTree } = await supabase.rpc('get_category_tree_by_slug', { 
        p_slug: game.slug 
    });
    let catIds: string[] = [];
    if (catTree) {
        catIds = catTree.map((c: any) => c.id);
    } else {
        const { data: directCats } = await supabase
            .from("categorias")
            .select("id")
            .or(`slug.ilike.%${game.slug}%,nombre.ilike.%${game.nombre}%`);
        catIds = directCats?.map((c) => c.id) || [];
    }

    if (catIds.length > 0) {
        const { data: rels } = await supabase
            .from("noticias_categorias")
            .select("noticia_id")
            .in("categoria_id", catIds);
        const noticiaIds = rels?.map((r) => r.noticia_id) || [];
        if (noticiaIds.length > 0) {
            const uniqueNewsIds = Array.from(new Set(noticiaIds));
            const { count } = await supabase
                .from("noticias")
                .select("*", { count: "exact", head: true })
                .eq("estado", "publicada")
                .is("deleted_at", null)
                .or(`juego_id.eq.${game.id},id.in.(${uniqueNewsIds.join(",")})`);
            newsCount = count || 0;
        } else {
            const { count } = await supabase
                .from("noticias")
                .select("*", { count: "exact", head: true })
                .eq("juego_id", game.id)
                .eq("estado", "publicada")
                .is("deleted_at", null);
            newsCount = count || 0;
        }
    } else {
        const { count } = await supabase
            .from("noticias")
            .select("*", { count: "exact", head: true })
            .eq("juego_id", game.id)
            .eq("estado", "publicada")
            .is("deleted_at", null);
        newsCount = count || 0;
    }

    const stats = {
        buildsCount,
        newsCount,
        usersCount,
    };

    return (
        <div className={`min-h-screen bg-white dark:bg-black ${blackOpsOne.variable}`}>
            <GamePageClient
                game={game}
                activeModules={activeModules}
                modules={modules}
                initialNews={news}
                initialEvents={events}
                initialBuilds={builds}
                initialThreads={threads}
                weaponsMeta={weaponsMeta}
                stats={stats}
            />
        </div>
    );
}
