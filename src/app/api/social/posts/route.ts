import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // First check if the table exists by trying a simple query
    const { error: tableCheckError } = await supabase
      .from("social_posts")
      .select("id")
      .limit(1);

    if (tableCheckError) {
      console.error("Table check error:", tableCheckError);
      // Return empty array if table doesn't exist yet
      return NextResponse.json({
        posts: [],
        meta: {
          total: 0,
          page,
          limit,
          hasMore: false,
        },
      });
    }

    let query = supabase
      .from("social_posts")
      .select(
        `
        *,
        user:perfiles!social_posts_user_id_fkey (
          id,
          username,
          avatar_url
        ),
        target_user:perfiles!social_posts_target_user_id_fkey (
          id,
          username,
          avatar_url
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (profileId) {
      query = query.eq("target_user_id", profileId);
    }

    const { data: posts, error, count } = await query;

    if (error) {
      console.error("Error fetching posts:", error);
      // If error is about foreign key, try simpler query
      if (
        error.message.includes("foreign key") ||
        error.message.includes("relationship")
      ) {
        // Fallback: fetch posts without joins
        const {
          data: simplePosts,
          error: simpleError,
          count: simpleCount,
        } = await supabase
          .from("social_posts")
          .select("*", { count: "exact" })
          .eq("target_user_id", profileId || "")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (simpleError) {
          return NextResponse.json(
            { error: simpleError.message },
            { status: 500 },
          );
        }

        return NextResponse.json({
          posts: simplePosts || [],
          meta: {
            total: simpleCount || 0,
            page,
            limit,
            hasMore: simpleCount ? offset + limit < simpleCount : false,
          },
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get current user to check likes
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If user is logged in, check which posts they've liked
    let likedPostIds: Set<string> = new Set();
    if (user && posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: likes } = await supabase
        .from("social_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);

      likedPostIds = new Set(likes?.map((l) => l.post_id) || []);
    }

    // Process posts to add "isLiked" boolean
    const processedPosts = posts?.map((post) => ({
      ...post,
      isLiked: likedPostIds.has(post.id),
    }));

    return NextResponse.json({
      posts: processedPosts,
      meta: {
        total: count,
        page,
        limit,
        hasMore: count ? offset + limit < count : false,
      },
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Import notifyMentions at the top (I can't put imports here with replace_file_content in the middle of functions, I should use write_to_file or be careful)
// Actually I need to add the import at the top of the file. I'll use multi_replace or separate calls.
// Let's assume I'll add the import first.

// wait, I can use the trick of replace imports and function body.
// But better to separate.

// This tool call will ONLY update the POST function. Use a separate call for imports.

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, media_url, media_type, target_user_id } = body;

    if (!content && !media_url) {
      return NextResponse.json(
        { error: "Content or media is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("social_posts")
      .insert({
        user_id: user.id,
        target_user_id: target_user_id || user.id,
        content,
        media_url,
        media_type,
      })
      .select(
        `
        *,
        user:perfiles!social_posts_user_id_fkey(username),
        target_user:perfiles!social_posts_target_user_id_fkey(username)
      `,
      )
      .single();

    if (error) {
      console.error("Error creating post:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process mentions
    if (content) {
      console.log(
        `[API Post] Processing potential mentions for post ${data.id}`,
      );
      // safe check for data existence
      const authorName = data.user?.username || "Alguien";
      const targetUsername = data.target_user?.username || "usuario";
      // URL del muro donde se publicó
      const sourceUrl = `/perfil/${targetUsername}`;

      // Exclude target user (profile owner) from mention notifications because they get a separate "posted on your wall" notification (assumed)
      // Also user.id is excluded by default in notifyMentions
      const excludeIds = [target_user_id || user.id];

      // We don't await this to speed up response time?
      // Next.js functions might terminate if we don't await. Better await.
      try {
        const { notifyMentions, notifyProfilePost } =
          await import("@/lib/notificationService");
        await notifyMentions({
          content,
          authorId: user.id,
          authorName,
          sourceId: data.id,
          sourceType: "post",
          sourceUrl,
          previewText: content.replace(/<[^>]+>/g, ""), // Strip HTML for preview
          excludeUserIds: excludeIds,
        });

        // Notify profile owner if someone else posted on their wall
        if (target_user_id && target_user_id !== user.id) {
          await notifyProfilePost({
            targetUserId: target_user_id,
            authorId: user.id,
            authorName,
            sourceUrl,
            previewText: content.replace(/<[^>]+>/g, ""),
          });
        }
      } catch (err) {
        console.error("Failed to process notifications:", err);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
