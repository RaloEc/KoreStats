"use client";

import { useRef, useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image";
import { MatchShareCard } from "@/components/riot/MatchShareCard";

interface MatchShareButtonProps {
  match: any;
  focusParticipant: any;
  gameVersion: string;
  userColor?: string | null;
}

export function MatchShareButton({
  match,
  focusParticipant,
  gameVersion,
  userColor,
}: MatchShareButtonProps) {
  const shareRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const handleShare = useCallback(async () => {
    if (!shareRef.current) {
      console.error("[MatchShareButton] Ref no disponible");
      return;
    }

    setLoading(true);

    try {
      // Esperar a que las imágenes se carguen
      const images = shareRef.current.querySelectorAll("img");
      const imagePromises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(() => resolve(), 5000);
        });
      });

      await Promise.all(imagePromises);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const dataUrl = await toPng(shareRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        quality: 1,
        backgroundColor: "#0a0e17",
        fetchRequestInit: {
          mode: "cors",
          credentials: "omit",
          cache: "no-cache",
        },
        includeQueryParams: true,
      });

      const link = document.createElement("a");
      const matchId = match.match_id || match.matchId || "share";
      const timestamp = Date.now();
      link.download = `korestats-${matchId}-${timestamp}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("[MatchShareButton] Imagen generada exitosamente");
    } catch (err) {
      console.error("[MatchShareButton] Error al generar la imagen:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      alert(`Error al generar la imagen: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [match]);

  if (!focusParticipant) return null;

  return (
    <>
      <Button
        onClick={handleShare}
        variant="outline"
        size="sm"
        disabled={loading}
        className="gap-2 bg-blue-600 border-blue-500 hover:bg-blue-700 text-white hover:text-white transition-colors shadow-sm"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {loading ? "Generando..." : "Guardar PNG"}
        </span>
        <span className="sm:hidden">{loading ? "..." : "PNG"}</span>
      </Button>

      {/* Contenedor oculto para la generación de imagen */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          pointerEvents: "none",
          opacity: 1,
          visibility: "visible",
        }}
        aria-hidden="true"
      >
        <div ref={shareRef}>
          <MatchShareCard
            participant={focusParticipant}
            match={match}
            gameVersion={gameVersion}
            userColor={userColor}
          />
        </div>
      </div>
    </>
  );
}
