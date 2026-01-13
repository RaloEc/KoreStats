"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface Friend {
  friendship_id: string;
  friend_id: string;
  username: string;
  public_id: string;
  avatar_url: string | null;
  color: string;
  role: string;
  created_at: string;
}

export const useFriendsList = (
  userId: string | null | undefined,
  limit: number = 10
) => {
  const supabase = createClient();

  return useQuery({
    queryKey: ["friends-list", userId, limit],
    queryFn: async () => {
      if (!userId) return null;

      // Obtener amistades donde el usuario es user_one_id o user_two_id
      const { data: friendships, error: friendshipsError } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`)
        .limit(limit);

      if (friendshipsError) {
        console.error(
          "[useFriendsList] Error fetching friendships:",
          friendshipsError
        );
        throw new Error(friendshipsError.message);
      }

      if (!friendships || friendships.length === 0) {
        return [];
      }

      // Enriquecer con información del amigo
      const enrichedFriends = await Promise.all(
        friendships.map(async (friendship) => {
          // Determinar quién es el amigo (el otro usuario en la relación)
          const friendId =
            friendship.user_one_id === userId
              ? friendship.user_two_id
              : friendship.user_one_id;

          const { data: friendProfile } = await supabase
            .from("perfiles")
            .select(
              "id, username, public_id, avatar_url, color, role, created_at"
            )
            .eq("id", friendId)
            .single();

          if (!friendProfile) return null;

          return {
            friendship_id: friendship.id,
            friend_id: friendProfile.id,
            username: friendProfile.username,
            public_id: friendProfile.public_id,
            avatar_url: friendProfile.avatar_url,
            color: friendProfile.color,
            role: friendProfile.role,
            created_at: friendship.created_at,
          } as Friend;
        })
      );

      // Filtrar nulls y retornar
      return enrichedFriends.filter((f): f is Friend => f !== null);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
  });
};
