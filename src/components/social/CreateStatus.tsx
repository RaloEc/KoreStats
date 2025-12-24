import { useState, useRef, useEffect } from "react";
import {
  Image as ImageIcon,
  Send,
  X,
  Youtube,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

interface CreateStatusProps {
  targetUserId?: string; // If posting to another user's wall
  targetUsername?: string; // Username of the target profile
  onPostCreated?: () => void;
}

export default function CreateStatus({
  targetUserId,
  targetUsername,
  onPostCreated,
}: CreateStatusProps) {
  const { user: authUser, profile } = useAuth();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "youtube" | null>(null);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const userColor = profile?.color || "#ec4899";
  const isWallPost = targetUserId && targetUserId !== authUser?.id;

  // Don't render if user is not logged in
  if (!authUser) {
    return null;
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast.error("La imagen no puede superar los 5MB");
      return;
    }

    try {
      setIsLoading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `social/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath);

      setMediaUrl(publicUrl);
      setMediaType("image");
      setShowYoutubeInput(false);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Error al subir imagen");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleYoutubeAdd = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      setMediaUrl(url);
      setMediaType("youtube");
      setShowYoutubeInput(false);
      setContent((prev) => prev.replace(url, "").trim());
    } else {
      toast.error("URL de YouTube no válida");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !mediaUrl) return;

    try {
      setIsLoading(true);

      const response = await fetch("/api/social/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          media_url: mediaUrl,
          media_type: mediaType,
          target_user_id: targetUserId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      toast.success("Publicado correctamente");
      setContent("");
      setMediaUrl(null);
      setMediaType(null);
      if (onPostCreated) onPostCreated();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Error al publicar");
    } finally {
      setIsLoading(false);
    }
  };

  const clearMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
  };

  return (
    <div className="bg-white dark:bg-[#1a1b1e] border border-gray-200 dark:border-white/5 rounded-xl p-4 mb-6 shadow-sm">
      <form onSubmit={handleSubmit}>
        {/* Wall post indicator */}
        {isWallPost && targetUsername && (
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-white/5">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-medium text-gray-900 dark:text-white">
                {profile?.username || "Tú"}
              </span>
              <ArrowRight size={14} className="text-gray-400" />
              <span className="font-medium" style={{ color: userColor }}>
                {targetUsername}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              • Publicando en su muro
            </span>
          </div>
        )}

        <div className="mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              isWallPost
                ? `Escribe algo en el muro de ${targetUsername}...`
                : "¿Qué estás pensando?"
            }
            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-lg p-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 resize-none min-h-[80px] transition-colors"
          />
        </div>

        {mediaUrl && (
          <div className="relative mb-4 bg-gray-100 dark:bg-black/40 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 group">
            <button
              type="button"
              onClick={clearMedia}
              className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/90"
            >
              <X size={16} />
            </button>
            {mediaType === "image" ? (
              <div className="relative h-48 w-full">
                <Image
                  src={mediaUrl}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="p-2 text-sm text-blue-500 dark:text-blue-400 truncate flex items-center gap-2">
                <Youtube size={16} />
                {mediaUrl}
              </div>
            )}
          </div>
        )}

        {showYoutubeInput && (
          <div className="flex gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
            <input
              type="text"
              placeholder="Pega el enlace de YouTube..."
              className="flex-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-md px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleYoutubeAdd(e.currentTarget.value);
                }
              }}
              onBlur={(e) => {
                if (e.target.value) handleYoutubeAdd(e.target.value);
                else setShowYoutubeInput(false);
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowYoutubeInput(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Subir imagen"
            >
              <ImageIcon size={20} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />

            <button
              type="button"
              onClick={() => setShowYoutubeInput(!showYoutubeInput)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              title="Añadir video de YouTube"
            >
              <Youtube size={20} />
            </button>
          </div>

          <button
            type="submit"
            disabled={(!content.trim() && !mediaUrl) || isLoading}
            className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
            style={{
              backgroundColor: userColor,
              opacity: (!content.trim() && !mediaUrl) || isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Publicar
          </button>
        </div>
      </form>
    </div>
  );
}
