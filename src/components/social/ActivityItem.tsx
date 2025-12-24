import StatusCard from "./StatusCard";
import { SharedMatchCardRefactored as SharedMatchCard } from "@/components/perfil/shared-match-card/SharedMatchCard";

interface ActivityItemProps {
  activity: any;
  onDelete?: (id: string) => void;
}

export default function ActivityItem({
  activity,
  onDelete,
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
        userColor="#64748B"
        isOwnProfile={false}
        isAdmin={false}
      />
    );
  }

  // Hilo del foro
  if (activity.type === "hilo") {
    return (
      <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                Hilo del Foro
              </span>
              <span className="text-xs text-gray-500">{activity.category}</span>
            </div>
            <h3 className="text-white font-semibold mb-1">{activity.title}</h3>
            <p className="text-gray-400 text-sm line-clamp-2">
              {activity.preview}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Noticia
  if (activity.type === "noticia") {
    return (
      <div className="bg-[#1a1b1e] border border-white/5 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 bg-blue-900/30 px-2 py-1 rounded">
                Noticia
              </span>
              <span className="text-xs text-gray-500">{activity.category}</span>
            </div>
            <h3 className="text-white font-semibold mb-1">{activity.title}</h3>
            <p className="text-gray-400 text-sm line-clamp-2">
              {activity.preview}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback para tipos desconocidos
  return null;
}
