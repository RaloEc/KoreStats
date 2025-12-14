import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, Eye, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

interface NoticiaMetaInfoProps {
  autor_nombre?: string;
  autor_avatar?: string;
  created_at: string;
  comentarios_count?: number;
  vistas?: number;
  className?: string;
  userColor?: string | null;
  onProfileClick?: (e: React.MouseEvent, username: string) => void;
}

export function NoticiaMetaInfo({
  autor_nombre,
  autor_avatar,
  created_at,
  comentarios_count = 0,
  vistas,
  className = "",
  userColor = null,
  onProfileClick,
}: NoticiaMetaInfoProps) {
  const handleProfileClick = (e: React.MouseEvent) => {
    if (onProfileClick && autor_nombre) {
      onProfileClick(e, autor_nombre);
    }
  };

  return (
    <div
      className={`flex items-center justify-between pt-3 border-t ${className}`}
      style={userColor ? { borderColor: userColor } : {}}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 group/author cursor-pointer"
          title={`Ver perfil de ${autor_nombre || "usuario"}`}
          onClick={handleProfileClick}
        >
          <Avatar className="h-10 w-10 group-hover/author:ring-2 group-hover/author:ring-primary transition-all duration-200">
            {autor_avatar && (
              <AvatarImage src={autor_avatar} alt={autor_nombre} />
            )}
            <AvatarFallback className="text-xs bg-red-900 dark:bg-white/20 text-white">
              {autor_nombre?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-medium text-gray-900 dark:text-white group-hover/author:text-primary dark:group-hover/author:text-primary transition-colors duration-200 flex items-center gap-1">
              {autor_nombre || "Usuario"}
              <ExternalLink className="h-3 w-3 opacity-0 group-hover/author:opacity-100 transition-opacity duration-200" />
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {formatDistanceToNow(new Date(created_at), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {typeof comentarios_count !== "undefined" && (
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {comentarios_count}
          </span>
        )}
        {typeof vistas !== "undefined" && (
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {vistas}
          </span>
        )}
      </div>
    </div>
  );
}
