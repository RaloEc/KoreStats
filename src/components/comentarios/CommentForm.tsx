"use client";

import React, { useState } from "react";
import { Button } from "./ui/Button";
import { SendHorizontal, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GifPicker } from "./GifPicker";
import dynamic from "next/dynamic";

const MinimalEditor = dynamic(
  () => import("@/components/tiptap-editor/MinimalEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[40px] w-full bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
    ),
  },
);

interface CommentFormProps {
  onSubmit: (text: string, gifUrl?: string | null) => void;
  placeholder?: string;
  ctaText?: string;
  initialText?: string;
  isLoading?: boolean;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  placeholder = "Escribe tu comentario...",
  ctaText = "Enviar",
  initialText = "",
  isLoading = false,
}) => {
  const { profile } = useAuth();
  const [content, setContent] = useState(initialText); // Ahora es HTML
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);

  const userColor = profile?.color || "#3b82f6";
  const charCount = content.replace(/<[^>]*>/g, "").length;
  const maxChars = 1000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const plainText = content.replace(/<[^>]*>/g, "").trim();

    // Permitir envío si hay texto (strip HTML) O si hay GIF seleccionado
    if ((plainText || selectedGifUrl) && charCount <= maxChars) {
      onSubmit(content, selectedGifUrl); // Enviamos el HTML
      setContent("");
      setSelectedGifUrl(null);
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    setSelectedGifUrl(gifUrl);
  };

  const handleRemoveGif = () => {
    setSelectedGifUrl(null);
  };

  const isEmpty = content.replace(/<[^>]*>/g, "").trim().length === 0;

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <MinimalEditor
                value={content}
                onChange={setContent}
                placeholder={placeholder}
                className="min-h-[40px]"
                restrictMentionsToFriends={false}
                currentUserId={profile?.id}
              />

              <div className="flex justify-between items-center mt-1">
                <div className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                  {charCount > 0 && `${charCount}/${maxChars}`}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2">
              <GifPicker onGifSelect={handleGifSelect}>
                <button
                  type="button"
                  disabled={isLoading}
                  className="p-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10"
                  style={{
                    color: userColor,
                    height: "40px",
                    width: "40px",
                    border: `2px solid ${userColor}40`,
                  }}
                  title="Agregar GIF"
                >
                  <span className="font-bold text-[10px]">GIF</span>
                </button>
              </GifPicker>

              <button
                type="submit"
                disabled={
                  isLoading ||
                  (isEmpty && !selectedGifUrl) ||
                  charCount > maxChars
                }
                className="p-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center text-white shadow-sm hover:shadow-md"
                style={{
                  backgroundColor:
                    isLoading ||
                    (isEmpty && !selectedGifUrl) ||
                    charCount > maxChars
                      ? "#9ca3af"
                      : userColor,
                  height: "40px",
                  width: "40px",
                }}
                title={ctaText}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SendHorizontal className="w-4 h-4 ml-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* GIF Preview */}
          {selectedGifUrl && (
            <div className="mt-2 relative inline-block self-start">
              <div
                className="relative rounded-lg overflow-hidden border-2"
                style={{ borderColor: `${userColor}40` }}
              >
                <img
                  src={selectedGifUrl}
                  alt="GIF seleccionado"
                  className="h-24 w-24 object-cover"
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
        </div>
      </form>
    </>
  );
};
