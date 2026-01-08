"use client";

import { useEffect, useRef } from "react";
import { highlightCodeBlocks } from "@/lib/utils/highlightCode";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import "@/components/tiptap-editor/editor-styles.css";

interface HighlightedContentProps {
  html: string;
  className?: string;
}

/**
 * Componente que renderiza HTML con resaltado de sintaxis en bloques de código
 */
export function HighlightedContent({
  html,
  className = "",
}: HighlightedContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Sanear el HTML antes de procesarlo
      const sanitizedHtml = sanitizeHtml(html);
      // Aplicar resaltado de sintaxis
      const highlightedHtml = highlightCodeBlocks(sanitizedHtml);
      contentRef.current.innerHTML = highlightedHtml;
    }
  }, [html]);

  return (
    <div ref={contentRef} className={className} suppressHydrationWarning />
  );
}
