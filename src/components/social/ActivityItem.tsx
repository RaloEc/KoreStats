import Link from "next/link";
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
  // Social post
  if (activity.type === "social_post") {
    return <StatusCard post={activity} onDelete={onDelete} />;
  }

  // Match compartido
  if (activity.type === "lol_match") {
    return (
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
                onDelete(activity.id);
              }
            : undefined
        }
      />
    );
  }

  // Hilo del foro
  if (activity.type === "hilo") {
    return (
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
            <h3 className="text-gray-900 dark:text-white font-semibold mb-1 group-hover:text-[var(--hover-color)] transition-colors">
              {activity.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
              {activity.preview}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Noticia
  if (activity.type === "noticia") {
    const newsId = activity.id.replace("noticia-", "");
    return (
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
            <h3 className="text-gray-900 dark:text-white font-semibold mb-2 group-hover:text-[var(--hover-color)] transition-colors line-clamp-2">
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
    );
  }

  // Fallback para tipos desconocidos
  return null;
}
