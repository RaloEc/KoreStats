import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Gamepad2 } from "lucide-react";
import { getPublicUrl } from "@/lib/utils/image-utils";

interface GamesDesktopMenuProps {
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    menuRef: React.RefObject<HTMLLIElement>;
    games: any[];
}

export const GamesDesktopMenu: React.FC<GamesDesktopMenuProps> = ({
    isOpen,
    onToggle,
    onClose,
    menuRef,
    games,
}) => {
    return (
        <li className="relative" ref={menuRef}>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                className={`flex items-center gap-1.5 px-4 py-2 transition-all duration-300 font-medium rounded-xl ${isOpen
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400"
                    }`}
                onClick={onToggle}
            >
                Juegos
                <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-300 opacity-60 ${isOpen ? "rotate-180 opacity-100" : ""}`}
                />
            </button>

            <div
                className={`absolute top-[calc(100%+8px)] left-0 w-64 rounded-2xl border shadow-2xl bg-white/95 dark:bg-black/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] transform origin-top-left z-50 overflow-hidden ${isOpen
                    ? "scale-100 opacity-100 translate-y-0"
                    : "scale-95 opacity-0 -translate-y-4 pointer-events-none"
                    }`}
            >
                <ul className="p-1.5 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-0.5">
                    {games.length > 0 ? (
                        games.map((game) => (
                            <li key={game.id}>
                                <Link
                                    href={`/games/${game.slug}`}
                                    className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all duration-200 text-gray-700 dark:text-gray-200 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 group active:scale-[0.98]"
                                    onClick={onClose}
                                >
                                    <div className="relative shrink-0">
                                        {getPublicUrl(game.icono_url) ? (
                                            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-transform duration-300 group-hover:scale-105">
                                                <Image
                                                    src={getPublicUrl(game.icono_url)!}
                                                    alt={game.nombre}
                                                    width={36}
                                                    height={36}
                                                    className="object-cover w-full h-full"
                                                    unoptimized={game.icono_url?.includes('.gif')}
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-900 flex items-center justify-center text-white font-bold text-xs shadow-sm transition-transform duration-300 group-hover:scale-105">
                                                {game.nombre.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-[13px] leading-tight text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {game.nombre}
                                        </span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5 truncate">
                                            Estadísticas y noticias
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))
                    ) : (
                        <li className="px-4 py-6 text-xs text-center text-gray-400 dark:text-gray-500 italic flex flex-col items-center gap-2">
                            <Gamepad2 className="h-6 w-6 opacity-20" />
                            <span>No hay juegos</span>
                        </li>
                    )}
                </ul>

                <div className="px-1.5 pb-1.5">
                    <Link
                        href="/games"
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/20 hover:bg-blue-50/60 dark:hover:bg-blue-900/40 transition-all duration-300"
                        onClick={onClose}
                    >
                        Explorar todos los juegos
                        <span className="text-[9px] opacity-70">→</span>
                    </Link>
                </div>
            </div>
        </li>
    );
};
