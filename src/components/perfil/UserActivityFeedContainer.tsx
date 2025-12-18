"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { UserActivityFeed } from "./UserActivityFeed";
import { Spinner } from "@nextui-org/react";

interface ActivityItem {
  id: string;
  type:
    | "noticia"
    | "comentario"
    | "hilo"
    | "respuesta"
    | "weapon"
    | "lol_match";
  title: string;
  preview?: string;
  timestamp: string;
  category: string;
}

interface UserActivityFeedContainerProps {
  fetchActivities: (page: number, limit: number) => Promise<ActivityItem[]>;
  userColor?: string;
  initialPage?: number;
  itemsPerPage?: number;
  isAdmin?: boolean;
  isOwnProfile?: boolean;
}

export const UserActivityFeedContainer = ({
  fetchActivities,
  userColor = "#3b82f6",
  initialPage = 1,
  itemsPerPage = 10,
  isAdmin = false,
  isOwnProfile = true,
  userId,
}: UserActivityFeedContainerProps & { userId?: string }) => {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<
    "all" | "hilos" | "respuestas" | "partidas" | "armas"
  >("all");
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadActivities = useCallback(
    async (page: number, append: boolean = false) => {
      try {
        if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const newItems = await fetchActivities(page, itemsPerPage);

        if (append) {
          setItems((prev) => [...prev, ...newItems]);
        } else {
          setItems(newItems);
        }

        setHasMore(newItems.length === itemsPerPage);
      } catch (error) {
        console.error("Error loading activities:", error);
        if (page === 1) {
          setItems([]);
        }
        setHasMore(false);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [fetchActivities, itemsPerPage]
  );

  // Cargar actividades iniciales
  useEffect(() => {
    loadActivities(1, false);
  }, []);

  // Cargar items ocultos del usuario para mostrar badge/opacidad
  useEffect(() => {
    if (!isOwnProfile) return;

    const fetchHidden = async () => {
      try {
        const response = await fetch("/api/user-activity/hidden");
        if (!response.ok) return;

        const { data } = await response.json();
        const hiddenSet = new Set<string>();

        (data || []).forEach(
          (item: { activity_type: string; activity_id: string }) => {
            if (item.activity_type === "forum_thread") {
              hiddenSet.add(`hilo-${item.activity_id}`);
            } else if (item.activity_type === "forum_post") {
              // Puede ser respuesta o comentario; usamos prefijo genérico
              hiddenSet.add(`respuesta-${item.activity_id}`);
              hiddenSet.add(`comentario-${item.activity_id}`);
            } else if (item.activity_type === "noticia") {
              hiddenSet.add(`noticia-${item.activity_id}`);
            } else if (item.activity_type === "lol_match") {
              hiddenSet.add(`lol_match-${item.activity_id}`);
              hiddenSet.add(`match-${item.activity_id}`);
            }
          }
        );

        setHiddenIds(hiddenSet);
      } catch (error) {
        console.error("Error fetching hidden activities:", error);
      }
    };

    fetchHidden();
  }, [isOwnProfile]);

  // Intersection Observer para scroll infinito
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !isLoading
        ) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading]);

  // Cargar más cuando cambia la página
  useEffect(() => {
    if (currentPage > 1) {
      loadActivities(currentPage, true);
    }
  }, [currentPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "Todo" },
          { key: "hilos", label: "Hilos" },
          { key: "respuestas", label: "Respuestas" },
          { key: "partidas", label: "Partidas" },
          { key: "armas", label: "Armas" },
        ].map((option) => (
          <button
            key={option.key}
            onClick={() =>
              setFilter(
                option.key as
                  | "all"
                  | "hilos"
                  | "respuestas"
                  | "partidas"
                  | "armas"
              )
            }
            className={`text-xs sm:text-sm px-3 py-1.5 rounded-md border transition-colors ${
              filter === option.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <UserActivityFeed
        items={items}
        userColor={userColor}
        isLoading={isLoading && items.length === 0}
        isAdmin={isAdmin}
        isOwnProfile={isOwnProfile}
        hiddenIds={hiddenIds}
        filter={filter}
        onHideItem={(id) =>
          setHiddenIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          })
        }
        onUnhideItem={(id) =>
          setHiddenIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          })
        }
        userId={userId}
      />

      {/* Indicador de carga al final */}
      <div ref={observerTarget} className="flex justify-center py-4">
        {isLoadingMore && <Spinner size="sm" />}
        {!hasMore && items.length > 0 && (
          <p className="text-sm text-muted-foreground">
            No hay más actividades
          </p>
        )}
      </div>
    </div>
  );
};

export default UserActivityFeedContainer;
