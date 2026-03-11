import Link from "next/link";
import { Metadata } from "next";
import { Gamepad2 } from "lucide-react";
import { getAllGames } from "@/lib/games/games-data";

export const metadata: Metadata = {
    title: "Juegos | KoreStats",
    description:
        "Explora todos los juegos disponibles en KoreStats: noticias, builds, estadísticas y más.",
};

export default async function GamesIndexPage() {
    const games = await getAllGames();

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Juegos
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Explora todos los juegos disponibles en KoreStats.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {games.map((game) => (
                        <Link
                            key={game.id}
                            href={`/games/${game.slug}`}
                            className="group block rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-lg hover:shadow-blue-600/5"
                        >
                            {/* Cover / Icon */}
                            <div className="h-40 bg-gradient-to-br from-blue-500/20 to-purple-600/20 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center relative overflow-hidden">
                                {game.icono_url ? (
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${game.icono_url}`}
                                        alt={game.nombre}
                                        className="w-20 h-20 object-contain group-hover:scale-110 transition-transform"
                                    />
                                ) : (
                                    <Gamepad2
                                        className="text-gray-400 group-hover:scale-110 transition-transform"
                                        size={48}
                                    />
                                )}
                            </div>

                            <div className="p-5">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {game.nombre}
                                </h2>
                                {game.descripcion && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                        {game.descripcion}
                                    </p>
                                )}

                                {/* Módulos activos */}
                                {game.modules.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-4">
                                        {game.modules.map((mod) => (
                                            <span
                                                key={mod.id}
                                                className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                            >
                                                {mod.module_type}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>

                {games.length === 0 && (
                    <div className="p-12 text-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                        <Gamepad2 className="mx-auto text-gray-400 mb-3" size={48} />
                        <p className="text-gray-500 dark:text-gray-400">
                            No hay juegos disponibles aún.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
