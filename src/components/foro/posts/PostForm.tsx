"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";

// Importar TiptapEditor de forma lazy para evitar problemas de SSR
const TiptapEditor = dynamic(() => import("@/components/TiptapEditor"), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse bg-muted rounded-md" />,
});

interface PostFormProps {
  hiloId: string;
  postPadreId?: string | null;
  onSubmit: (contenido: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitText?: string;
  initialValue?: string;
  restrictMentionsToFriends?: boolean;
}

export default function PostForm({
  hiloId,
  postPadreId = null,
  onSubmit,
  onCancel,
  placeholder = "Escribe tu respuesta...",
  submitText = "Publicar respuesta",
  initialValue = "",
  restrictMentionsToFriends = false,
}: PostFormProps) {
  const { user } = useAuth();
  const [contenido, setContenido] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contenido.trim() || contenido === "<p></p>") {
      setError("El contenido no puede estar vacío");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(contenido);
      setContenido("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al publicar la respuesta",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <TiptapEditor
          value={contenido}
          onChange={setContenido}
          placeholder={placeholder}
          restrictMentionsToFriends={restrictMentionsToFriends}
          currentUserId={user?.id}
        />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting || !contenido.trim()}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Publicando...
            </>
          ) : (
            <>
              <Send size={16} className="mr-2" />
              {submitText}
            </>
          )}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
