import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = params;

    // Verify the comment belongs to the user
    const { data: comment, error: fetchError } = await supabase
      .from("social_comments")
      .select("user_id, post_id")
      .eq("id", commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from("social_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      console.error("Error deleting comment:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Update comments_count on the post
    const { error: updateError } = await supabase.rpc(
      "decrement_post_comments",
      { post_id: comment.post_id }
    );

    // If RPC doesn't exist, fallback to manual update
    if (updateError) {
      // Fetch current count and decrement
      const { data: currentPost } = await supabase
        .from("social_posts")
        .select("comments_count")
        .eq("id", comment.post_id)
        .single();

      if (currentPost) {
        const { error: fallbackError } = await supabase
          .from("social_posts")
          .update({
            comments_count: Math.max((currentPost.comments_count || 0) - 1, 0),
          })
          .eq("id", comment.post_id);

        if (fallbackError) {
          console.warn("Failed to update comments_count:", fallbackError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
