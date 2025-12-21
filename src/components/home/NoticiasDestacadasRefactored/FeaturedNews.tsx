"use client";

import Image from "next/image";
import Link from "next/link";
import { NoticiaMetaInfo } from "@/components/noticias/NoticiaMetaInfo";
import { getExcerpt } from "@/lib/utils";
import { Noticia } from "./types";

interface FeaturedNewsProps {
  noticia: Noticia;
  isDarkMode: boolean;
  userColor: string;
  profileColor: string | null;
  onProfileClick: (e: React.MouseEvent, username: string) => void;
}

export function FeaturedNews({
  noticia,
  isDarkMode,
  userColor,
  profileColor,
  onProfileClick,
}: FeaturedNewsProps) {
  if (!noticia) return null;

  return (
    <div
      className="mb-10 rounded-xl overflow-hidden"
      style={{
        backgroundColor: isDarkMode
          ? `color-mix(in srgb, ${userColor || "#3b82f6"} 3%, #0a0a0a)`
          : `color-mix(in srgb, ${userColor || "#3b82f6"} 6%, white)`,
      }}
    >
      <Link href={`/noticias/${noticia.id}`} className="block group">
        <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
          {noticia.imagen_url ? (
            <Image
              src={noticia.imagen_url}
              alt={noticia.titulo}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: `linear-gradient(to bottom right, ${userColor}10, ${userColor}20)`,
              }}
            >
              <div className="text-center text-gray-400 dark:text-gray-600">
                <div className="text-6xl mb-2">📰</div>
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-3">
          <h3
            className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors"
            style={
              {
                "--user-color": userColor || "#3b82f6",
              } as React.CSSProperties
            }
          >
            <span className="group-hover:text-[color:var(--user-color)]">
              {noticia.titulo}
            </span>
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {noticia.resumen || getExcerpt(noticia.contenido, 150)}
          </div>
          <div className="mt-3 pt-3 ">
            <NoticiaMetaInfo
              autor_nombre={noticia.autor_nombre}
              autor_avatar={noticia.autor_avatar}
              created_at={noticia.created_at}
              vistas={noticia.vistas}
              comentarios_count={noticia.comentarios_count}
              className="text-sm"
              userColor={profileColor}
              onProfileClick={onProfileClick}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
