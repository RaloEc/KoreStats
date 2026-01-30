import { createClient } from "@/lib/supabase/client";

export interface UserItem {
  id: string;
  name: string;
  image?: string;
  type: "user";
}

export interface SearchUsersOptions {
  onlyFriends?: boolean;
  currentUserId?: string;
}

// Removed global client to prevent static initialization issues
// const supabase = createClient();

export async function searchUsers(
  query: string,
  options?: SearchUsersOptions,
): Promise<UserItem[]> {
  try {
    const supabase = createClient();

    if (!query || query.length < 1) {
      return [];
    }

    console.log(
      `Searching users in 'perfiles' table with query: "${query}"`,
      options,
    );

    // Si se requiere filtrar solo amigos
    if (options?.onlyFriends && options?.currentUserId) {
      // Primero obtener la lista de amigos confirmados
      const { data: friendships, error: friendshipsError } = await supabase
        .from("friendships")
        .select("user_one_id, user_two_id")
        .or(
          `user_one_id.eq.${options.currentUserId},user_two_id.eq.${options.currentUserId}`,
        );

      if (friendshipsError) {
        console.error("Error fetching friendships:", friendshipsError);
        return [];
      }

      // Extraer los IDs de los amigos
      const friendIds = (friendships || []).map((friendship) =>
        friendship.user_one_id === options.currentUserId
          ? friendship.user_two_id
          : friendship.user_one_id,
      );

      if (friendIds.length === 0) {
        // No tiene amigos, retornar vacío
        return [];
      }

      // Buscar usuarios que sean amigos y coincidan con la query
      const { data, error } = await supabase
        .from("perfiles")
        .select("id, username, avatar_url")
        .in("id", friendIds)
        .ilike("username", `%${query}%`)
        .limit(5);

      console.log("Friend search results:", { data, error });

      if (error) {
        console.error("Error searching friends:", error);
        return [];
      }

      return (data || []).map((user) => ({
        id: user.id || user.username || "unknown",
        name: user.username || "Usuario sin nombre",
        image: user.avatar_url,
        type: "user",
      }));
    }

    // Búsqueda normal sin restricción de amigos
    const { data, error } = await supabase
      .from("perfiles")
      .select("id, username, avatar_url")
      .ilike("username", `%${query}%`)
      .limit(5);

    console.log("Search results:", { data, error });

    if (error) {
      console.error("Error searching users:", error);
      return [];
    }

    return (data || []).map((user) => ({
      id: user.id || user.username || "unknown",
      name: user.username || "Usuario sin nombre",
      image: user.avatar_url,
      type: "user",
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}
