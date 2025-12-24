import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
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

    // Check if like exists
    const { data: existingLike, error: checkError } = await supabase
      .from("social_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "Row not found"
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    let isLiked = false;

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from("social_likes")
        .delete()
        .eq("id", existingLike.id);

      if (deleteError) throw deleteError;

      // Decrement count in posts table (could be done via trigger in DB but manual here for now if no trigger)
      // Actually, triggers are better for counts. But let's assume we update it manually or rely on triggers.
      // If no triggers, we should update the count.
      const { error: rpcError } = await supabase.rpc("decrement_likes", {
        post_id: postId,
      });

      if (rpcError) {
        // Fallback if RPC doesn't exist
        const { data: post } = await supabase
          .from("social_posts")
          .select("likes_count")
          .eq("id", postId)
          .single();
        if (post) {
          await supabase
            .from("social_posts")
            .update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) })
            .eq("id", postId);
        }
      }

      isLiked = false;
    } else {
      // Like
      const { error: insertError } = await supabase
        .from("social_likes")
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (insertError) throw insertError;

      // Increment count
      const { error: rpcError } = await supabase.rpc("increment_likes", {
        post_id: postId,
      });

      if (rpcError) {
        const { data: post } = await supabase
          .from("social_posts")
          .select("likes_count")
          .eq("id", postId)
          .single();
        if (post) {
          await supabase
            .from("social_posts")
            .update({ likes_count: (post.likes_count || 0) + 1 })
            .eq("id", postId);
        }
      }

      isLiked = true;
    }

    return NextResponse.json({ success: true, isLiked });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
