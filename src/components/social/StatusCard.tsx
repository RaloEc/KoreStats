import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Heart,
  MessageSquare,
  Trash2,
  MoreHorizontal,
  Flag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { commentsCacheManager } from "@/lib/cache/commentsCache";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import { SupabaseImage } from "@/components/ui/SupabaseImage";
import PostComments from "./PostComments";
import ReportModal from "./ReportModal";
import { RichTextRenderer } from "@/components/tiptap-editor/components/RichTextRenderer";

interface SocialPost {
  id: string;
  user_id: string;
  target_user_id: string | null;
  content: string | null;
  media_url: string | null;
  media_type: "image" | "video" | "youtube" | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    color?: string | null;
    public_id?: string | null;
  };
  target_user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  isLiked?: boolean;
}

interface StatusCardProps {
  post: SocialPost;
  onDelete?: (id: string) => void;
}

export default function StatusCard({ post, onDelete }: StatusCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Simple auth check effect (or use context if available)
  useState(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  });

  const handleLike = async () => {
    if (!currentUser) {
      toast.error("Debes iniciar sesión para dar like");
      return;
    }
    if (isLikeLoading) return;

    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likesCount;

    setIsLiked(!isLiked);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
    setIsLikeLoading(true);

    try {
      const response = await fetch(`/api/social/posts/${post.id}/like`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle like");
      }
    } catch (error) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      toast.error("Error al actualizar like");
    } finally {
      setIsLikeLoading(false);
    }
  };

  const getYoutubeId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const isWallPost =
    post.target_user_id && post.target_user_id !== post.user_id;

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar este post?")) return;

    try {
      const response = await fetch(`/api/social/posts/${post.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete post");
      }

      toast.success("Post eliminado");
      onDelete && onDelete(post.id);
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar el post");
    }
  };

  return (
    <div className="bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-white/5 rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Link href={`/perfil/${post.user.username}`}>
            <UserAvatar
              username={post.user.username}
              avatarUrl={post.user.avatar_url}
              size="md"
              className="border border-gray-200 dark:border-white/10"
              color={post.user.color || undefined}
            />
          </Link>
          <div>
            <div className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white">
              <Link
                href={`/perfil/${post.user.username}`}
                className="hover:underline"
              >
                {post.user.username}
              </Link>
              {isWallPost && post.target_user && (
                <>
                  <span className="text-gray-400 dark:text-gray-500">▶</span>
                  <Link
                    href={`/perfil/${post.target_user.username}`}
                    className="hover:underline"
                  >
                    {post.target_user.username}
                  </Link>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          </div>
        </div>

        {/* Dropdown menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          >
            <MoreHorizontal size={18} />
          </button>

          {showMenu && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              {/* Menu */}
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
                {/* Report option - visible to everyone except author */}
                {currentUser && currentUser.id !== post.user_id && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowReportModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <Flag size={14} className="text-orange-500" />
                    Reportar
                  </button>
                )}

                {/* Delete option - only visible to author */}
                {currentUser && currentUser.id === post.user_id && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleDelete();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                )}

                {/* If not logged in, show login prompt */}
                {!currentUser && (
                  <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Inicia sesión para más opciones
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-3">
        {post.content && (
          <div className="relative">
            <RichTextRenderer
              content={post.content}
              className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 mb-3"
            />
            <style jsx global>{`
              .prose .lol-mention img {
                margin: 0 !important;
                display: inline-block !important;
              }
              .prose .lol-mention,
              .prose .user-mention {
                vertical-align: middle;
                line-height: 1.1;
              }
            `}</style>
          </div>
        )}

        {post.media_type === "image" && post.media_url && (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/50">
            <SupabaseImage
              src={post.media_url}
              alt="Post attachment"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        {post.media_type === "youtube" && post.media_url && (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${getYoutubeId(
                post.media_url,
              )}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 pt-3 border-t border-gray-200 dark:border-white/5">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            isLiked
              ? "text-pink-600 dark:text-pink-500"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
          <span>{likesCount}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <MessageSquare size={18} />
          <span>{commentsCount}</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <PostComments
          postId={post.id}
          commentsCount={commentsCount}
          onCommentsCountChange={setCommentsCount}
        />
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="post"
        contentId={post.id}
      />
    </div>
  );
}
