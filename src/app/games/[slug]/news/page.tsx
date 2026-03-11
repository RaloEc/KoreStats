import { notFound } from "next/navigation";
import {
    getGameBySlug,
    getGameNews
} from "@/lib/games/games-data";
import NoticiaCard from "@/components/noticias/NoticiaCard";
import Link from "next/link";
import { ChevronLeft, Newspaper } from "lucide-react";

interface NewsPageProps {
    params: Promise<{ slug: string }>;
}

export default async function NewsPage({ params }: NewsPageProps) {
    const { slug } = await params;
    const game = await getGameBySlug(slug);

    if (!game) {
        notFound();
    }

    const news = await getGameNews(game.id, game.slug, game.nombre, 24);

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
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                        <Newspaper className="text-blue-500" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none"> Todas las Noticias </h2>
                        <p className="text-sm text-gray-500 mt-1 uppercase font-bold tracking-wider"> {game.nombre} </p>
                    </div>
                </div>

                {news.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {news.map((noticia: any, idx: number) => (
                            <NoticiaCard
                                key={noticia.id}
                                noticia={noticia}
                                index={idx}
                                mostrarResumen={true}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="p-20 text-center rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/10">
                        <Newspaper className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200"> Sin noticias aún </h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                            No hemos publicado noticias sobre {game.nombre} todavía. ¡Vuelve pronto!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
