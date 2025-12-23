"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, MessageSquare, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WeaponStatsCard } from "@/components/weapon/WeaponStatsCard";
import type { ForoHiloRelacionado } from "@/types/foro";

interface HiloCarouselCardProps {
  hilo: ForoHiloRelacionado;
}

/**
 * Extrae la primera imagen del contenido HTML
 */
function extractFirstImage(html: string): string | null {
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/);
  return imgMatch ? imgMatch[1] : null;
}

/**
 * Extrae el primer párrafo de texto del contenido HTML
 */
function extractFirstParagraph(html: string): string {
  const textMatch = html.replace(/<[^>]*>/g, "").trim();
  return textMatch.substring(0, 100) + (textMatch.length > 100 ? "..." : "");
}

import { useUserTheme } from "@/hooks/useUserTheme";

export function HiloCarouselCard({ hilo }: HiloCarouselCardProps) {
  const { userColor } = useUserTheme(); // Hook para obtener el color del usuario actual
  // Nota: Si quisiéramos usar el color de la CATEGORÍA del hilo, necesitaríamos que el backend lo envíe.
  // Por ahora usaremos un diseño neutral pero elegante o el color del usuario para detalles.

  const firstImage = extractFirstImage(hilo.contenido);
  const firstText = extractFirstParagraph(hilo.contenido);
  const hasWeaponStats = hilo.weapon_stats_record?.stats;

  return (
    <Link
      href={`/foro/hilos/${hilo.slug ?? hilo.id}`}
      className="group block h-full"
      prefetch={false}
    >
      <div className="flex flex-col h-full bg-white dark:bg-black amoled:bg-black rounded-xl border border-gray-200 dark:border-gray-800 amoled:border-gray-900 overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        {/* Contenido Visual Principal */}
        {hasWeaponStats ? (
          <div className="relative w-full h-48 bg-gray-50 dark:bg-black amoled:bg-black overflow-hidden flex items-center justify-center p-0 md:p-1">
            <div className="h-full w-full max-w-sm scale-90 origin-center">
              <WeaponStatsCard
                stats={hilo.weapon_stats_record!.stats}
                className="h-full w-full shadow-none border-none"
              />
            </div>
          </div>
        ) : firstImage ? (
          <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-900 overflow-hidden">
            <Image
              src={firstImage}
              alt={hilo.titulo}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading="lazy"
            />
            {/* Gradiente sutil para mejorar legibilidad si quisiéramos poner texto encima */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div className="relative w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black overflow-hidden p-6 flex flex-col justify-center">
            {/* Decoración de fondo (Watermark) */}
            <MessageSquare
              className="absolute -right-4 -bottom-4 w-32 h-32 text-gray-200 dark:text-gray-800/50 opacity-50 rotate-[-10deg]"
              strokeWidth={1}
            />

            <div className="relative z-10">
              {/* Categoría Placeholder o Icono */}
              <div className="mb-3 w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />

              {/* Título Grande para hilos sin imagen */}
              <h3 className="font-bold text-lg leading-tight text-gray-900 dark:text-gray-100 line-clamp-3 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {hilo.titulo}
              </h3>
            </div>
          </div>
        )}

        {/* Sección de detalles (Título pequeño si hay imagen, texto si no, footer) */}
        <div className="flex flex-col flex-1 p-4 border-t border-gray-100 dark:border-gray-800/50">
          {/* Si hay imagen o stats, mostramos título aquí. Si NO, ya está arriba grande. */}
          {hasWeaponStats || firstImage ? (
            <>
              <h3 className="font-semibold text-base line-clamp-2 text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {hilo.titulo}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
                {firstText}
              </p>
            </>
          ) : (
            /* Si no hay imagen, mostramos más texto descriptivo aquí */
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 flex-1">
              {firstText}
            </p>
          )}

          {/* Footer: Autor y Stats */}
          <div className="flex items-center justify-between gap-2 mt-auto pt-2">
            <div className="flex items-center gap-2 max-w-[65%]">
              <Avatar className="h-6 w-6 shrink-0 ring-1 ring-gray-100 dark:ring-gray-800">
                <AvatarImage src={hilo.autor?.avatar_url || ""} />
                <AvatarFallback className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500">
                  {hilo.autor?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-200 truncate">
                  {hilo.autor?.username}
                </span>
                <span className="text-[10px] text-gray-400">
                  {format(new Date(hilo.created_at), "d MMM", { locale: es })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              <div className="flex items-center gap-1" title="Vistas">
                <Eye className="h-3.5 w-3.5" />
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {hilo.vistas}
                </span>
              </div>
              <div className="flex items-center gap-1" title="Respuestas">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {hilo.respuestas ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
