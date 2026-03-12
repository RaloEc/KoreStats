"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Game {
  id: string;
  nombre: string;
  slug: string;
  icono_url: string | null;
}

export const GameSelectRadar: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch("/api/games/list"); // I'll need to check if this endpoint exists or create a simple one
        if (res.ok) {
          const data = await res.json();
          setGames(data);
        }
      } catch (error) {
        console.error("Error fetching games for radar:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (games.length === 0) return null;

  return (
    <div className="relative mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Tus Juegos
        </h3>
        <Link 
          href="/games" 
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          Ver todos
        </Link>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1 mask-linear-right">
        {games.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex-shrink-0"
          >
            <Link
              href={`/games/${game.slug}`}
              className="group flex flex-col items-center gap-2"
            >
              <div className="relative">
                <div 
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 dark:from-blue-900/20 dark:to-purple-900/20 border border-gray-200/50 dark:border-white/5 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 group-active:scale-95 group-hover:shadow-lg group-hover:shadow-blue-500/10 group-hover:border-blue-300 dark:group-hover:border-blue-700"
                >
                  {game.icono_url ? (
                    <img
                      src={game.icono_url.startsWith('http') ? game.icono_url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/iconos/${game.icono_url}`}
                      alt={game.nombre}
                      className="w-10 h-10 object-contain drop-shadow-md group-hover:rotate-3 transition-transform"
                    />
                  ) : (
                    <Gamepad2 className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                  )}
                  
                  {/* Subtle glass effect highlight */}
                  <div className="absolute inset-0 bg-white/5 dark:bg-white/0 group-hover:bg-white/10 dark:group-hover:bg-white/5 pointer-events-none" />
                </div>
                
                {/* Active indicator (optional, if we were filtering the feed) */}
                {/* <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" /> */}
              </div>
              
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[70px] text-center">
                {game.nombre}
              </span>
            </Link>
          </motion.div>
        ))}
        
        {/* Add shortcut to browse more */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: games.length * 0.05 }}
          className="flex-shrink-0"
        >
          <Link
            href="/games"
            className="group flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-950 border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-blue-400 dark:group-hover:border-blue-500">
               <span className="text-xl text-gray-400 dark:text-gray-600 group-hover:text-blue-500">+</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600">Explorar</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};
