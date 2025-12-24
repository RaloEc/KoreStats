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
import ReportModal from "./ReportModal";

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
  const charCount = content.length;
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
    if ((!content.trim() && !gifUrl) || charCount > maxChars) return;
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
          content: content.trim() || null,
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
        { method: "DELETE" }
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
          <div className="flex items-end gap-2">
            {/* Avatar */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-white/10 flex-shrink-0">
              <Image
                src={profile?.avatar_url || "/default-avatar.png"}
                alt={profile?.username || "Usuario"}
                fill
                className="object-cover"
              />
            </div>

            {/* Input */}
            <div
              className="relative flex-1 rounded-lg border-2 transition-all duration-200"
              style={{
                borderColor: isFocused ? `${userColor}80` : `${userColor}30`,
              }}
            >
              <textarea
                placeholder="Escribe un comentario..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={submitting}
                rows={1}
                maxLength={maxChars}
                className="w-full px-3 py-2 pr-12 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                style={{ minHeight: "36px" }}
              />
              <div className="absolute bottom-1.5 right-2 text-[10px] text-gray-400 dark:text-gray-500">
                {charCount}/{maxChars}
              </div>
            </div>

            {/* GIF Button */}
            <GifPicker onGifSelect={setGifUrl}>
              <button
                type="button"
                disabled={submitting}
                className="p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center"
                style={{
                  backgroundColor: submitting ? "#9ca3af" : `${userColor}40`,
                  color: userColor,
                  height: "36px",
                  width: "36px",
                  border: `2px solid ${userColor}60`,
                }}
                aria-label="Agregar GIF"
                title="Agregar GIF"
              >
                <span className="font-bold text-[10px]">GIF</span>
              </button>
            </GifPicker>

            {/* Send Button */}
            <button
              type="submit"
              disabled={
                (content.trim().length === 0 && !gifUrl) ||
                submitting ||
                charCount > maxChars
              }
              className="p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              style={{
                backgroundColor:
                  (content.trim().length === 0 && !gifUrl) ||
                  submitting ||
                  charCount > maxChars
                    ? "#9ca3af"
                    : `${userColor}CC`,
                color: "white",
                height: "36px",
                width: "36px",
              }}
              aria-label="Enviar"
              title="Enviar comentario"
            >
              {submitting ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </button>
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
              {/* Avatar */}
              <Link href={`/perfil/${comment.user.username}`}>
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-white/10 flex-shrink-0 hover:opacity-80 transition-opacity">
                  <Image
                    src={comment.user.avatar_url || "/default-avatar.png"}
                    alt={comment.user.username}
                    fill
                    className="object-cover"
                  />
                </div>
              </Link>

              {/* Content */}
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

                  {/* Menu button */}
                  <div className="relative ml-auto">
                    <button
                      onClick={() =>
                        setActiveMenu(
                          activeMenu === comment.id ? null : comment.id
                        )
                      }
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all p-1"
                      title="Opciones"
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
                          {/* Report - visible to everyone except author */}
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

                          {/* Delete - only visible to author */}
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

                {/* Comment text */}
                {comment.content && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                )}

                {/* Comment GIF */}
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
