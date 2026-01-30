"use client";

import Link from "next/link";
import { useState } from "react";
import StatusCard from "./StatusCard";
import { SharedMatchCardRefactored as SharedMatchCard } from "@/components/perfil/shared-match-card/SharedMatchCard";

interface ActivityItemProps {
  activity: any;
  onDelete?: (id: string) => void;
  userColor?: string;
}

export default function ActivityItem({
  activity,
  onDelete,
  userColor = "#f43f5e",
}: ActivityItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (id: string) => {
    // Iniciar animación de eliminación
    setIsDeleting(true);

    // Esperar a que termine la animación antes de llamar al callback
    setTimeout(() => {
      onDelete?.(id);
    }, 300); // Duración de la animación
  };

  // Social post
  if (activity.type === "social_post") {
    return (
      <div
        className={`transition-all duration-300 ${
          isDeleting
            ? "opacity-0 scale-95 -translate-y-2"
            : "opacity-100 scale-100 translate-y-0"
        }`}
      >
        <StatusCard post={activity} onDelete={handleDelete} />
      </div>
    );
  }

  // Match compartido
  if (activity.type === "lol_match") {
    return (
      <div
        className={`transition-all duration-300 ${
          isDeleting
            ? "opacity-0 scale-95 -translate-y-2"
            : "opacity-100 scale-100 translate-y-0"
        }`}
      >
        <SharedMatchCard
          partida={{
            ...activity,
            result: activity.win ? "win" : "loss",
            created_at: activity.timestamp,
          }}
          userColor={userColor}
          isOwnProfile={true}
          isAdmin={false}
          onDelete={
            onDelete
              ? async (entryId: string) => {
                  handleDelete(activity.id);
                }
              : undefined
          }
        />
      </div>
    );
  }

  // Hilo del foro
  if (activity.type === "hilo") {
    return (
      <div
        className={`transition-all duration-300 ${
          isDeleting
            ? "opacity-0 scale-95 -translate-y-2"
            : "opacity-100 scale-100 translate-y-0"
        }`}
      >
        <div
          className="bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-white/5 rounded-xl p-4 transition-colors group cursor-pointer"
          style={
            {
              "--hover-color": userColor,
            } as React.CSSProperties
          }
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  Hilo del Foro
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {activity.category}
                </span>
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-1 transition-colors">
                {activity.title}
              </h3>
              <div
                className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 prose prose-sm dark:prose-invert max-w-none pointer-events-none"
                dangerouslySetInnerHTML={{ __html: activity.content }}
              />
              <style jsx global>{`
                .prose .lol-mention img {
                  margin: 0 !important;
                  display: inline-block !important;
                }
                .prose .lol-mention,
                .prose .user-mention {
                  vertical-align: middle;
                  line-height: 1.1;
                }
                /* Ajustes adicionales para que se vea bien en activity feed */
                .prose p {
                  margin: 0 !important;
                }
                .prose {
                  font-size: 0.875rem !important;
                  line-height: 1.25rem !important;
                }
              `}</style>
            </div>
          </div>
          {/* Envolver toda la tarjeta en un Link para navegar al hilo */}
          <Link
            href={
              activity.slug
                ? `/foro/hilos/${activity.slug}`
                : `/foro/${activity.id.replace("hilo-", "")}`
            }
            className="absolute inset-0 z-10"
          />
        </div>
      </div>
    );
  }

  // Noticia
  if (activity.type === "noticia") {
    const newsId = activity.id.replace("noticia-", "");
    return (
      <div
        className={`transition-all duration-300 ${
          isDeleting
            ? "opacity-0 scale-95 -translate-y-2"
            : "opacity-100 scale-100 translate-y-0"
        }`}
      >
        <Link href={`/noticias/${newsId}`} className="block group">
          <div
            className="bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden transition-all shadow-sm dark:shadow-none"
            style={
              {
                "--hover-color": userColor,
              } as React.CSSProperties
            }
          >
            {/* Imagen de portada */}
            {activity.image && (
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={activity.image}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* Cuerpo de la noticia con borde izquierdo activo constante */}
            <div className="p-4 border-l-4 border-l-transparent transition-all duration-300 content-body">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-medium px-2 py-1 rounded"
                  style={{
                    backgroundColor: `${userColor}20`,
                    color: userColor,
                  }}
                >
                  Noticia
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {activity.category}
                </span>
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2 transition-colors line-clamp-2">
                {activity.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                {activity.preview}
              </p>
            </div>
          </div>
          <style jsx>{`
            .group:hover > div {
              border-color: ${userColor}80 !important;
            }
            .group:hover .content-body {
              border-left-color: ${userColor} !important;
            }
          `}</style>
        </Link>
      </div>
    );
  }

  // Fallback para tipos desconocidos
  return null;
}
