import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/Button";
import { SendHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GifPicker } from "./GifPicker";

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
  const [text, setText] = useState(initialText);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charCount = text.length;
  const maxChars = 1000;
  const userColor = profile?.color || "#3b82f6";

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [text]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Permitir envío si hay texto O si hay GIF seleccionado
    if ((text.trim() || selectedGifUrl) && charCount <= maxChars) {
      onSubmit(text.trim() || "", selectedGifUrl);
      setText("");
      setSelectedGifUrl(null);
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    setSelectedGifUrl(gifUrl);
  };

  const handleRemoveGif = () => {
    setSelectedGifUrl(null);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex items-end gap-2">
          <div
            className="relative flex-1 rounded-lg border-2 transition-all duration-200"
            style={{
              borderColor: isFocused ? `${userColor}80` : `${userColor}30`,
            }}
          >
            <textarea
              ref={textareaRef}
              placeholder={placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isLoading}
              rows={1}
              maxLength={maxChars}
              className="w-full px-4 py-2 pr-16 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden transition-all duration-200 ease-out"
              style={{ minHeight: "40px" }}
            />

            {/* Contador de caracteres */}
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500">
              {charCount}/{maxChars}
            </div>
          </div>

          {/* Botón GIF con Popover */}
          <GifPicker onGifSelect={handleGifSelect}>
            <button
              type="button"
              disabled={isLoading}
              className="p-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center"
              style={{
                backgroundColor: isLoading ? "#9ca3af" : `${userColor}40`,
                color: userColor,
                height: "40px",
                width: "40px",
                border: `2px solid ${userColor}60`,
              }}
              aria-label="Agregar GIF"
              title="Agregar GIF"
            >
              <span className="font-bold text-xs">GIF</span>
            </button>
          </GifPicker>

          {/* Botón enviar */}
          <button
            type="submit"
            disabled={
              (text.trim().length === 0 && !selectedGifUrl) ||
              isLoading ||
              charCount > maxChars
            }
            className="p-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            style={{
              backgroundColor:
                (text.trim().length === 0 && !selectedGifUrl) ||
                isLoading ||
                charCount > maxChars
                  ? "#9ca3af"
                  : `${userColor}CC`,
              color: "white",
              height: "40px",
              width: "40px",
            }}
            aria-label={ctaText}
            title={ctaText}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Previsualización del GIF seleccionado */}
        {selectedGifUrl && (
          <div className="mt-3 relative inline-block">
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
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                title="Remover GIF"
              >
                <span className="text-xs font-bold">✕</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </>
  );
};
