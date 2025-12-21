"use client";

import Image from "next/image";
import Link from "next/link";
import { NoticiaMetaInfo } from "@/components/noticias/NoticiaMetaInfo";
import { getExcerpt } from "@/lib/utils";
import { Noticia } from "./types";

interface NewsGridProps {
  noticias: Noticia[];
  isDarkMode: boolean;
  userColor: string;
  profileColor: string | null;
  onProfileClick: (e: React.MouseEvent, username: string) => void;
}

export function NewsGrid({
  noticias,
  isDarkMode,
  userColor,
  profileColor,
  onProfileClick,
}: NewsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {noticias.map((noticia) => (
        <div
          key={noticia.id}
          className="group flex flex-col h-full rounded-lg overflow-hidden"
          style={{
            backgroundColor: isDarkMode
              ? `color-mix(in srgb, ${userColor || "#3b82f6"} 3%, #0a0a0a)`
              : `color-mix(in srgb, ${userColor || "#3b82f6"} 5%, white)`,
          }}
        >
          <Link
            href={`/noticias/${noticia.id}`}
            className="flex flex-col h-full"
          >
            <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
              {noticia.imagen_url ? (
                <Image
                  src={noticia.imagen_url}
                  alt={noticia.titulo}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                  <div className="text-center text-gray-400 dark:text-gray-600">
                    <div className="text-4xl mb-2">📰</div>
                  </div>
                </div>
              )}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  backgroundColor: `hsl(var(--primary) / 0.1)`,
                }}
              ></div>
            </div>
            <div className="px-3 py-3 flex flex-col flex-grow">
              <div className="mb-2">
                <h4
                  className="text-lg font-semibold text-gray-900 dark:text-white mb-1 transition-colors"
                  style={
                    {
                      "--user-color": userColor || "#3b82f6",
                    } as React.CSSProperties
                  }
                >
                  <span className="group-hover:text-[color:var(--user-color)]">
                    {noticia.titulo}
                  </span>
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {noticia.resumen || getExcerpt(noticia.contenido, 100)}
                </p>
              </div>
              <div className="mt-auto pt-2">
                <NoticiaMetaInfo
                  autor_nombre={noticia.autor_nombre}
                  autor_avatar={noticia.autor_avatar}
                  created_at={noticia.created_at}
                  vistas={noticia.vistas}
                  comentarios_count={noticia.comentarios_count}
                  className="text-xs"
                  userColor={profileColor}
                  onProfileClick={onProfileClick}
                />
              </div>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
