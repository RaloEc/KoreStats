import { notFound } from "next/navigation";
import {
    getGameBySlug,
    getGameBuilds
} from "@/lib/games/games-data";
import Link from "next/link";
import { ChevronLeft, Hammer } from "lucide-react";

interface BuildsPageProps {
    params: Promise<{ slug: string }>;
}

export default async function BuildsPage({ params }: BuildsPageProps) {
    const { slug } = await params;
    const game = await getGameBySlug(slug);

    if (!game) {
        notFound();
    }

    const builds = await getGameBuilds(game.id, 24);

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Back link */}
                <div className="mb-6">
                    <Link
                        href={`/games/${slug}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                        <ChevronLeft size={16} />
                        Volver a {game.nombre}
                    </Link>
                </div>

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center">
                        <Hammer className="text-orange-500" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none"> Todas las Builds </h2>
                        <p className="text-sm text-gray-500 mt-1 uppercase font-bold tracking-wider"> {game.nombre} </p>
                    </div>
                </div>

                {builds.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {builds.map((build: any) => (
                            <Link
                                key={build.id}
                                href={`/builds/${build.slug || build.id}`}
                                className="group bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 transition-all p-5"
                            >
                                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                    {build.category}
                                </span>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 mt-2">
                                    {build.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                                    {build.description || "Sin descripción disponible."}
                                </p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="p-20 text-center rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/10">
                        <Hammer className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200"> Sin builds publicadas </h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                            No hemos publicado builds de {game.nombre} todavía. ¡Vuelve pronto!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
