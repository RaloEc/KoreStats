import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET comments for a post
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const postId = params.id;

    // Check if table exists by trying a simple query
    const { error: tableCheckError } = await supabase
      .from("social_comments")
      .select("id")
      .limit(1);

    if (tableCheckError) {
      console.error("Table check error:", tableCheckError);
      // Return empty array if table doesn't exist yet
      return NextResponse.json({ comments: [] });
    }

    const { data: comments, error } = await supabase
      .from("social_comments")
      .select(
        `
        *,
        user:perfiles!social_comments_user_id_fkey (
          id,
          username,
          avatar_url
        )
      `,
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return NextResponse.json({ comments: [] });
    }

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ comments: [] });
  }
}

// POST a new comment
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const postId = params.id;
    const body = await request.json();
    const { content, gif_url } = body;

    if (!content?.trim() && !gif_url) {
      return NextResponse.json(
        { error: "Content or GIF is required" },
        { status: 400 },
      );
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from("social_comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content?.trim() || null,
        gif_url,
      })
      .select(
        `
        *,
        user:perfiles!social_comments_user_id_fkey (
          id,
          username,
          avatar_url
        )
      `,
      )
      .single();

    if (insertError) {
      console.error("Error creating comment:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update comments_count on the post
    const { error: updateError } = await supabase.rpc(
      "increment_post_comments",
      { post_id: postId },
    );

    // If RPC doesn't exist, fallback to manual update
    if (updateError) {
      // Fetch current count and increment
      const { data: currentPost } = await supabase
        .from("social_posts")
        .select("comments_count")
        .eq("id", postId)
        .single();

      if (currentPost) {
        const { error: fallbackError } = await supabase
          .from("social_posts")
          .update({ comments_count: (currentPost.comments_count || 0) + 1 })
          .eq("id", postId);

        if (fallbackError) {
          console.warn("Failed to update comments_count:", fallbackError);
        }
      }
    }

    // Process mentions
    if (content) {
      try {
        // Fetch post info for URL construction (we need to know whose wall this is)
        const { data: postData } = await supabase
          .from("social_posts")
          .select(
            "target_user:perfiles!social_posts_target_user_id_fkey(username)",
          )
          .eq("id", postId)
          .single();

        const targetWallUsername =
          (postData?.target_user as any)?.username || "usuario";
        const sourceUrl = `/perfil/${targetWallUsername}`;
        const authorName = comment.user?.username || "Alguien";

        const { notifyMentions } = await import("@/lib/notificationService");
        await notifyMentions({
          content,
          authorId: user.id,
          authorName,
          sourceId: comment.id,
          sourceType: "comment",
          sourceUrl,
          previewText: content.replace(/<[^>]+>/g, ""),
          // We don't exclude anyone here as per instructions (except self which is auto)
          // "Es decir, le tiene que llegar la notificacion asi sea que lo mencione en una noticia, en un hilo, en comentario de cualquier cosa."
        });
      } catch (err) {
        console.error("Failed to process comment mentions:", err);
      }
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
