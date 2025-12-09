"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onImageChange?: (hasTemporaryImages: boolean) => void;
  className?: string;
}

// Lazy load TiptapEditor con ssr: false
// Reduce Main Thread Work en ~800ms
const TiptapEditorComponent = dynamic(
  () => import("./tiptap-editor").then((mod) => mod.default),
  {
    loading: () => (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    ),
    ssr: false, // CRÍTICO: Tiptap depende de window, no se puede SSR
  }
);

export default function TiptapEditorLazy(props: TiptapEditorProps) {
  return <TiptapEditorComponent {...props} />;
}

// Función para procesar el contenido del editor antes de guardarlo
export const processEditorContent = (content: string): string => {
  if (!content) return "";

  let processed = content.trim();

  if (!processed || processed === "<p></p>") {
    return "";
  }

  return processed;
};
