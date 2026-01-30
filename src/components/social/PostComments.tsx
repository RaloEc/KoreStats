"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Send,
  Loader2,
  Trash2,
  MessageCircle,
  SendHorizontal,
  Flag,
  MoreVertical,
} from "lucide-react";
import { GifPicker } from "@/components/comentarios/GifPicker";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { commentsCacheManager } from "@/lib/cache/commentsCache";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import ReportModal from "./ReportModal";
import dynamic from "next/dynamic";
import { RichTextRenderer } from "@/components/tiptap-editor/components/RichTextRenderer";

const MinimalEditor = dynamic(
  () => import("@/components/tiptap-editor/MinimalEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[80px] w-full bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
    ),
  },
);

interface Comment {
  id: string;
  user_id: string;
  content: string | null;
  gif_url: string | null;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface PostCommentsProps {
  postId: string;
  commentsCount: number;
  onCommentsCountChange?: (count: number) => void;
}

// Skeleton for loading comments
const CommentSkeleton = () => (
  <div className="flex gap-3 p-3 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-4 w-20 bg-gray-200 dark:bg-white/10 rounded" />
        <div className="h-3 w-16 bg-gray-200 dark:bg-white/10 rounded" />
      </div>
      <div className="h-4 w-3/4 bg-gray-200 dark:bg-white/10 rounded" />
    </div>
  </div>
);

export default function PostComments({
  postId,
  commentsCount,
  onCommentsCountChange,
}: PostCommentsProps) {
  const { user: authUser, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const supabase = createClient();

  const userColor = profile?.color || "#3b82f6";
  const charCount = content.replace(/<[^>]*>/g, "").length; // Approximate char count stripping HTML
  const maxChars = 500;

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = useCallback(async () => {
    // Check cache first
    const cached = commentsCacheManager.get(postId);
    if (cached) {
      setComments(cached);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/social/posts/${postId}/comments`);
      const data = await res.json();

      const commentsData = data.comments || [];
      setComments(commentsData);
      commentsCacheManager.set(postId, commentsData);
    } catch (error) {
      console.error(error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plainText = content.replace(/<[^>]*>/g, "").trim();
    if ((!plainText && !gifUrl) || charCount > maxChars) return;
    if (!authUser) {
      toast.error("Debes iniciar sesión para comentar");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/social/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim() || null, // Guardamos el HTML
          gif_url: gifUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to post comment");
      const newComment = await res.json();

      setComments((prev) => [...prev, newComment]);
      setContent("");
      setGifUrl(null);
      toast.success("Comentario publicado");

      commentsCacheManager.invalidate(postId);

      if (onCommentsCountChange) {
        onCommentsCountChange(commentsCount + 1);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al publicar comentario");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("¿Eliminar este comentario?")) return;

    try {
      const res = await fetch(
        `/api/social/posts/${postId}/comments/${commentId}`,
        { method: "DELETE" },
      );

      if (!res.ok) throw new Error("Failed to delete comment");

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comentario eliminado");

      commentsCacheManager.invalidate(postId);

      if (onCommentsCountChange) {
        onCommentsCountChange(Math.max(0, commentsCount - 1));
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar comentario");
    }
  };

  const handleRemoveGif = () => {
    setGifUrl(null);
  };

  const loadMoreComments = () => {
    setVisibleCount((prev) => prev + 10);
  };

  // Memoize visible comments
  const visibleComments = useMemo(() => {
    return comments.slice(0, visibleCount);
  }, [comments, visibleCount]);

  const hasMoreComments = comments.length > visibleCount;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/5">
      {/* Comment Form - Always visible first */}
      {authUser ? (
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {/* Avatar */}
              <UserAvatar
                username={profile?.username || "Usuario"}
                avatarUrl={profile?.avatar_url}
                size="sm"
                className="border border-gray-200 dark:border-white/10 flex-shrink-0 mt-1"
              />

              {/* Input Area */}
              <div className="flex-1 min-w-0">
                <MinimalEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Escribe un comentario..."
                  restrictMentionsToFriends={true}
                  currentUserId={authUser.id}
                  className="min-h-[60px]"
                />

                <div className="flex justify-between items-center mt-2">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">
                    {/* Optional char count if needed */}
                  </div>

                  <div className="flex gap-2">
                    {/* GIF Button */}
                    <GifPicker onGifSelect={setGifUrl}>
                      <button
                        type="button"
                        disabled={submitting}
                        className="p-1 px-2 rounded-md transition-colors text-xs font-semibold flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-white/10"
                        style={{ color: userColor }}
                      >
                        GIF
                      </button>
                    </GifPicker>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={
                        (content.replace(/<[^>]*>?/gm, "").trim().length ===
                          0 &&
                          !gifUrl) ||
                        submitting
                      }
                      className="px-3 py-1.5 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-medium text-white shadow-sm"
                      style={{
                        backgroundColor:
                          (content.replace(/<[^>]*>?/gm, "").trim().length ===
                            0 &&
                            !gifUrl) ||
                          submitting
                            ? "#9ca3af"
                            : userColor,
                      }}
                    >
                      {submitting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <SendHorizontal className="h-3 w-3" />
                      )}
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GIF Preview */}
          {gifUrl && (
            <div className="mt-3 ml-10 relative inline-block">
              <div
                className="relative rounded-lg overflow-hidden border-2"
                style={{ borderColor: `${userColor}40` }}
              >
                <img
                  src={gifUrl}
                  alt="GIF seleccionado"
                  className="h-20 w-20 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveGif}
                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                  title="Remover GIF"
                >
                  <span className="text-[10px] font-bold px-1">✕</span>
                </button>
              </div>
            </div>
          )}
        </form>
      ) : (
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Inicia sesión para comentar
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-0">
        {loading ? (
          <>
            <CommentSkeleton />
            <CommentSkeleton />
          </>
        ) : visibleComments.length === 0 ? (
          <div className="text-center py-4">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {authUser
                ? "Sé el primero en comentar"
                : "No hay comentarios aún"}
            </p>
          </div>
        ) : (
          visibleComments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 py-3 border-b border-gray-100 dark:border-white/5 last:border-b-0 group"
            >
              <Link href={`/perfil/${comment.user.username}`}>
                <UserAvatar
                  username={comment.user.username}
                  avatarUrl={comment.user.avatar_url}
                  size="sm"
                  className="border border-gray-200 dark:border-white/10 flex-shrink-0 hover:opacity-80 transition-opacity"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link
                    href={`/perfil/${comment.user.username}`}
                    className="text-sm font-medium text-gray-900 dark:text-white hover:underline"
                  >
                    {comment.user.username}
                  </Link>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>

                  <div className="relative ml-auto">
                    <button
                      onClick={() =>
                        setActiveMenu(
                          activeMenu === comment.id ? null : comment.id,
                        )
                      }
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all p-1"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {activeMenu === comment.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenu(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg py-1 z-20 min-w-[140px]">
                          {authUser && authUser.id !== comment.user_id && (
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                setReportCommentId(comment.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                              <Flag size={12} className="text-orange-500" />
                              Reportar
                            </button>
                          )}

                          {authUser?.id === comment.user_id && (
                            <button
                              onClick={() => {
                                setActiveMenu(null);
                                handleDelete(comment.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={12} />
                              Eliminar
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {comment.content && (
                  <div className="relative">
                    <RichTextRenderer
                      content={comment.content}
                      className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none [&>p]:mb-0"
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

                {comment.gif_url && (
                  <div className="mt-2">
                    <img
                      src={comment.gif_url}
                      alt="GIF"
                      className="rounded-lg max-h-40 w-auto"
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Load more button */}
        {hasMoreComments && (
          <div className="text-center pt-3">
            <button
              onClick={loadMoreComments}
              className="text-sm font-medium transition-colors hover:underline"
              style={{ color: userColor }}
            >
              Mostrar más comentarios ({comments.length - visibleCount}{" "}
              restantes)
            </button>
          </div>
        )}
      </div>

      {/* Report Modal for comments */}
      {reportCommentId && (
        <ReportModal
          isOpen={!!reportCommentId}
          onClose={() => setReportCommentId(null)}
          contentType="comment"
          contentId={reportCommentId}
        />
      )}
    </div>
  );
}
