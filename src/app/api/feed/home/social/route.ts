import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/feed/home - Get home feed with posts from friends and followed users
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Get list of users the current user is following
    const { data: following } = await supabase
      .from("social_follows")
      .select("followed_id")
      .eq("follower_id", user.id);

    const followingIds = following?.map((f) => f.followed_id) || [];

    // Get list of friends (both directions)
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_one_id, user_two_id")
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`);

    const friendIds =
      friendships?.map((f) =>
        f.user_one_id === user.id ? f.user_two_id : f.user_one_id
      ) || [];

    // Combine both lists (unique)
    const combinedIds = [...followingIds, ...friendIds];
    const allRelatedUsers = Array.from(new Set(combinedIds));

    // If no connections, return empty feed with suggestion
    if (allRelatedUsers.length === 0) {
      return NextResponse.json({
        posts: [],
        meta: {
          page,
          limit,
          hasMore: false,
          total: 0,
        },
        isEmpty: true,
        suggestion:
          "Sigue a otros usuarios o añade amigos para ver su actividad aquí",
      });
    }

    // Get posts from followed users and friends
    // Include own posts too
    const userIds = [...allRelatedUsers, user.id];

    const {
      data: posts,
      error,
      count,
    } = await supabase
      .from("social_posts")
      .select(
        `
        *,
        user:perfiles!social_posts_user_id_fkey (
          id,
          username,
          avatar_url,
          color,
          public_id
        ),
        target_user:perfiles!social_posts_target_user_id_fkey (
          id,
          username,
          avatar_url
        )
      `,
        { count: "exact" }
      )
      .in("user_id", userIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching home feed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if current user liked each post
    const postIds = posts?.map((p) => p.id) || [];
    let likedPostIds: Set<string> = new Set();

    if (postIds.length > 0) {
      const { data: likes } = await supabase
        .from("social_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);

      likedPostIds = new Set(likes?.map((l) => l.post_id) || []);
    }

    const enrichedPosts = posts?.map((post) => ({
      ...post,
      isLiked: likedPostIds.has(post.id),
    }));

    const hasMore = (count || 0) > offset + limit;

    return NextResponse.json({
      posts: enrichedPosts || [],
      meta: {
        page,
        limit,
        hasMore,
        total: count || 0,
      },
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
