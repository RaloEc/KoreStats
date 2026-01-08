"use client";

import dynamic from "next/dynamic";
import { FriendRequestsList } from "@/components/social/FriendRequestsList";
import { FriendsListCompact } from "@/components/social/FriendsListCompact";
import ProfileStats from "@/components/perfil/profile-stats";

// Dynamic import para StatusFeed
const StatusFeed = dynamic(() => import("@/components/social/StatusFeed"), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-white/5 rounded-xl p-4 h-40 animate-pulse"
        />
      ))}
    </div>
  ),
});

interface Estadisticas {
  noticias: number;
  comentarios: number;
  hilos: number;
  respuestas: number;
}

interface ProfilePostsTabContentProps {
  perfilId: string;
  perfilUsername: string;
  perfilColor: string;
  userId?: string;
  estadisticas: Estadisticas;
}

export function ProfilePostsTabContent({
  perfilId,
  perfilUsername,
  perfilColor,
  userId,
  estadisticas,
}: ProfilePostsTabContentProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Columna izquierda - Feed de actividad */}
      <div className="lg:col-span-2">
        <StatusFeed
          profileId={perfilId}
          profileUsername={perfilUsername}
          isOwnProfile={true}
          userColor={perfilColor}
        />
      </div>

      {/* Columna derecha - Información de membresía */}
      <div className="lg:col-span-1 space-y-6">
        {/* Solicitudes de amistad */}
        <FriendRequestsList userColor={perfilColor} />

        {/* Lista de amigos */}
        <FriendsListCompact userId={userId} userColor={perfilColor} limit={8} />

        {/* Estadísticas */}
        <ProfileStats estadisticas={estadisticas} />
      </div>
    </div>
  );
}
