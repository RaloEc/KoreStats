"use client";

import { useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { differenceInHours, differenceInDays, format } from "date-fns";

import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useRespondFriendRequestMutation } from "@/hooks/useSocialFeatures";
import "./notification-bell.css";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const { mutate: respondFriendRequest } = useRespondFriendRequestMutation();

  const handleNotificationClick = (
    id: string,
    read: boolean,
    notification: any
  ) => {
    if (!read) {
      markAsRead(id);
    }

    // Navegar según el tipo de notificación
    const data = notification.data as any;
    // El CommentCard usa id="comment-{id}", los posts del foro usan id="post-{id}"
    const commentHash = data?.commentId ? `#comment-${data.commentId}` : "";

    if (notification.type === "news_comment" && data?.noticiaSlug) {
      window.location.href = `/noticias/${data.noticiaSlug}${commentHash}`;
    } else if (notification.type === "thread_comment" && data?.hiloSlug) {
      // Para comentarios en hilos, el commentId es un post de foro
      const postHash = data?.commentId ? `#post-${data.commentId}` : "";
      window.location.href = `/foro/hilo/${data.hiloSlug}${postHash}`;
    } else if (notification.type === "comment_reply") {
      if (data?.contentType === "hilo" && data?.hiloSlug) {
        const postHash = data?.commentId ? `#post-${data.commentId}` : "";
        window.location.href = `/foro/hilo/${data.hiloSlug}${postHash}`;
      } else if (data?.contentType === "noticia" && data?.contentSlug) {
        window.location.href = `/noticias/${data.contentSlug}${commentHash}`;
      }
    } else if (data?.link) {
      // Fallback para notificaciones genéricas que traen un link directo
      window.location.href = data.link;
    }
  };

  // Función para formatear la fecha de la notificación
  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const hoursAgo = differenceInHours(now, date);
    const daysAgo = differenceInDays(now, date);

    if (hoursAgo < 1) {
      // Menos de 1 hora: mostrar minutos
      const minutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );
      if (minutes < 1) return "ahora";
      return `hace ${minutes}m`;
    } else if (daysAgo < 1) {
      // Más de 1 hora pero menos de 1 día: mostrar HH:MM
      return format(date, "HH:mm");
    } else {
      // Más de 1 día: mostrar DD/MM
      return format(date, "dd/MM");
    }
  };

  const handleFriendRequest = (
    e: React.MouseEvent,
    notificationId: string,
    requestId: string,
    action: "accept" | "reject"
  ) => {
    e.stopPropagation(); // Evitar abrir la notificación
    respondFriendRequest(
      { requestId, action },
      {
        onSuccess: () => {
          markAsRead(notificationId);
        },
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative z-50">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </PopoverTrigger>

      {/* Backdrop para móvil */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          style={{ top: "64px" }}
          onClick={() => setOpen(false)}
        />
      )}
      <PopoverContent className="notification-popover w-96 p-0" align="end">
        <div className="notification-header flex items-center justify-between">
          <h4>Notificaciones</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mark-all-read-btn text-muted-foreground hover:text-foreground"
              onClick={() => markAllAsRead()}
            >
              <Check className="mr-1 h-3 w-3" />
              Marcar leídas
            </Button>
          )}
        </div>
        <ScrollArea className="notification-list h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <Bell className="notification-empty-icon" />
              <p className="notification-empty-text">
                No tienes notificaciones
              </p>
            </div>
          ) : (
            <div className="grid">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "notification-item",
                    !notification.read && "unread"
                  )}
                  onClick={() =>
                    handleNotificationClick(
                      notification.id,
                      notification.read,
                      notification
                    )
                  }
                >
                  <div className="notification-content">
                    {/* Título y hora en la misma línea */}
                    <div className="flex justify-between items-start gap-2">
                      <span className="notification-title line-clamp-2 text-sm flex-1">
                        {notification.title}
                      </span>
                      <span className="notification-time text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {formatNotificationTime(notification.created_at)}
                      </span>
                    </div>
                    {/* Mensaje */}
                    <p className="notification-message line-clamp-2 text-xs mt-0.5">
                      {notification.message}
                    </p>

                    {/* Botones de acción para solicitud de amistad */}
                    {notification.type === "friend_request" &&
                      (notification.data as any)?.requestId && (
                        <div className="notification-actions">
                          <Button
                            size="sm"
                            className="notification-action-btn accept"
                            onClick={(e) =>
                              handleFriendRequest(
                                e,
                                notification.id,
                                (notification.data as any).requestId,
                                "accept"
                              )
                            }
                          >
                            Aceptar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="notification-action-btn reject"
                            onClick={(e) =>
                              handleFriendRequest(
                                e,
                                notification.id,
                                (notification.data as any).requestId,
                                "reject"
                              )
                            }
                          >
                            Rechazar
                          </Button>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
