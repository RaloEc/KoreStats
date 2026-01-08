"use client";

import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Share2, X } from "lucide-react";
import { MatchShareCard } from "@/components/riot/MatchShareCard";
import { MatchSummaryCard } from "@/components/riot/MatchSummaryCard";
import { toPng } from "html-to-image";
import { cn } from "@/lib/utils";

interface MatchShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: any;
  focusParticipant: any;
  gameVersion: string;
  userColor?: string | null;
}

export function MatchShareModal({
  isOpen,
  onClose,
  match,
  focusParticipant,
  gameVersion,
  userColor,
}: MatchShareModalProps) {
  // Refs for the high-res hidden elements
  const printCardRef = useRef<HTMLDivElement>(null);
  const printSummaryRef = useRef<HTMLDivElement>(null);

  const [downloadingCard, setDownloadingCard] = useState(false);
  const [downloadingSummary, setDownloadingSummary] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);
  const [sharingSummary, setSharingSummary] = useState(false);

  // Helper to generate Blob from DOM element
  const getBlob = async (ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return null;
    try {
      const blob = await toPng(ref.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0a101a",
      }).then((dataUrl) => {
        return fetch(dataUrl).then((res) => res.blob());
      });
      return blob;
    } catch (err) {
      console.error("Error generating blob:", err);
      return null;
    }
  };

  const handleShare = async (
    ref: React.RefObject<HTMLDivElement>,
    fileName: string,
    setSharing: (v: boolean) => void
  ) => {
    setSharing(true);
    const blob = await getBlob(ref);
    if (blob) {
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "KoreStats Match",
            text: "Mira mis estadísticas de partida en KoreStats!",
          });
        } catch (err) {
          console.log("Share cancelled or failed", err);
        }
      } else {
        // Fallback to download if share not supported
        const link = document.createElement("a");
        link.download = fileName;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
    setSharing(false);
  };

  const generateImage = async (
    ref: React.RefObject<HTMLDivElement>,
    fileName: string
  ) => {
    if (!ref.current) return;

    try {
      const element = ref.current;
      // Basic wait for images might be needed if they are not cached,
      // but since we render them on mount (even hidden), they likely start loading immediately.

      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2, // 2x for retina quality
        backgroundColor: "#0a101a",
      });

      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (err) {
      console.error("Error generating image:", err);
      return false;
    }
  };

  const handleDownloadCard = async () => {
    setDownloadingCard(true);
    await generateImage(
      printCardRef,
      `korestats-card-${match.matchId || match.match_id}.png`
    );
    setDownloadingCard(false);
  };

  const handleDownloadSummary = async () => {
    setDownloadingSummary(true);
    await generateImage(
      printSummaryRef,
      `korestats-summary-${match.matchId || match.match_id}.png`
    );
    setDownloadingSummary(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] md:max-w-7xl w-full bg-slate-950/95 border-slate-800 p-0 overflow-hidden flex flex-col h-[90vh] md:h-auto backdrop-blur-xl"
      >
        {/* Hidden Full-Res Containers for Capture */}
        <div className="fixed left-[-9999px] top-0 pointer-events-none">
          <div ref={printCardRef}>
            <MatchShareCard
              participant={focusParticipant}
              match={match}
              gameVersion={gameVersion}
              userColor={userColor}
            />
          </div>
          <div ref={printSummaryRef}>
            <MatchSummaryCard match={match} gameVersion={gameVersion} />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800/60">
          <div>
            <DialogTitle className="text-xl md:text-2xl font-bold text-white">
              Compartir Estadísticas
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">
              Elige el formato que deseas descargar
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white rounded-full hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-900/40 p-6 md:p-10 scrollbar-hide snap-x snap-mandatory">
          <div className="flex flex-row gap-6 md:gap-12 xl:gap-16 items-center min-w-max px-[calc(50vw-150px)] md:px-0 md:justify-center min-h-[500px]">
            {/* 1. Personal Card Preview */}
            <div className="snap-center flex flex-col items-center gap-6 animate-in fade-in slide-in-from-right-6 duration-700 w-[300px] md:w-auto shrink-0">
              <div className="relative group rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-700/50 bg-[#0a101a] transition-transform hover:scale-[1.02] duration-300">
                {/* Scaled Preview Wrapper */}
                <div className="w-[300px] h-[533px] md:w-[320px] md:h-[569px] relative overflow-hidden bg-[#0a101a]">
                  <div
                    style={{
                      transform: `scale(${300 / 450})`,
                      transformOrigin: "top left",
                      width: "450px",
                      height: "800px",
                    }}
                    className="md:hidden"
                  >
                    <MatchShareCard
                      participant={focusParticipant}
                      match={match}
                      gameVersion={gameVersion}
                      userColor={userColor}
                    />
                  </div>

                  <div
                    style={{
                      transform: `scale(${320 / 450})`,
                      transformOrigin: "top left",
                      width: "450px",
                      height: "800px",
                    }}
                    className="hidden md:block"
                  >
                    <MatchShareCard
                      participant={focusParticipant}
                      match={match}
                      gameVersion={gameVersion}
                      userColor={userColor}
                    />
                  </div>
                </div>

                {/* Overlay with Button */}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
                  <span className="text-white font-bold text-lg translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    Tarjeta Individual
                  </span>
                  <Button
                    onClick={handleDownloadCard}
                    disabled={downloadingCard}
                    size="lg"
                    className="rounded-full font-bold bg-blue-600 hover:bg-blue-500 text-white border-none shadow-lg shadow-blue-900/20 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75"
                  >
                    {downloadingCard ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Descargar PNG
                  </Button>
                  <Button
                    onClick={() =>
                      handleShare(
                        printCardRef,
                        `korestats-card-${match.matchId}.png`,
                        setSharingCard
                      )
                    }
                    disabled={sharingCard}
                    size="lg"
                    variant="outline"
                    className="rounded-full font-bold text-white border-white/20 hover:bg-white/10 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100"
                  >
                    {sharingCard ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="mr-2 h-4 w-4" />
                    )}
                    Compartir
                  </Button>
                </div>
              </div>

              <div className="text-center xl:hidden w-full">
                <h3 className="font-bold text-white text-lg">
                  Tarjeta Personal
                </h3>
                <Button
                  variant="secondary"
                  className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-200"
                  onClick={handleDownloadCard}
                  disabled={downloadingCard}
                >
                  Generar
                </Button>
                <Button
                  variant="outline"
                  className="mt-2 w-full border-slate-700 hover:bg-slate-800 text-slate-300"
                  onClick={() =>
                    handleShare(
                      printCardRef,
                      `korestats-card-${match.matchId}.png`,
                      setSharingCard
                    )
                  }
                  disabled={sharingCard}
                >
                  {sharingCard ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="mr-2 h-4 w-4" />
                  )}
                  Compartir
                </Button>
              </div>
            </div>

            {/* 2. Match Summary Preview */}
            <div className="snap-center flex flex-col items-center gap-6 animate-in fade-in slide-in-from-right-6 duration-700 delay-150 w-[300px] md:w-auto shrink-0">
              <div className="relative group rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-700/50 bg-[#0a101a] transition-transform hover:scale-[1.02] duration-300">
                <div className="w-[300px] h-[533px] md:w-[320px] md:h-[569px] relative overflow-hidden bg-[#0a101a]">
                  {/* Mobile Scale */}
                  <div
                    style={{
                      transform: `scale(${300 / 450})`,
                      transformOrigin: "top left",
                      width: "450px",
                      height: "800px",
                    }}
                    className="md:hidden"
                  >
                    <MatchSummaryCard match={match} gameVersion={gameVersion} />
                  </div>

                  {/* Desktop Scale */}
                  <div
                    style={{
                      transform: `scale(${320 / 450})`,
                      transformOrigin: "top left",
                      width: "450px",
                      height: "800px",
                    }}
                    className="hidden md:block"
                  >
                    <MatchSummaryCard match={match} gameVersion={gameVersion} />
                  </div>
                </div>

                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
                  <span className="text-white font-bold text-lg translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    Resumen de Partida
                  </span>
                  <Button
                    onClick={handleDownloadSummary}
                    disabled={downloadingSummary}
                    size="lg"
                    className="rounded-full font-bold bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-lg shadow-emerald-900/20 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75"
                  >
                    {downloadingSummary ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Descargar PNG
                  </Button>
                  <Button
                    onClick={() =>
                      handleShare(
                        printSummaryRef,
                        `korestats-summary-${match.matchId}.png`,
                        setSharingSummary
                      )
                    }
                    disabled={sharingSummary}
                    size="lg"
                    variant="outline"
                    className="rounded-full font-bold text-white border-white/20 hover:bg-white/10 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100"
                  >
                    {sharingSummary ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="mr-2 h-4 w-4" />
                    )}
                    Compartir
                  </Button>
                </div>
              </div>

              <div className="text-center xl:hidden w-full">
                <h3 className="font-bold text-white text-lg">Resumen Global</h3>
                <Button
                  variant="secondary"
                  className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-200"
                  onClick={handleDownloadSummary}
                  disabled={downloadingSummary}
                >
                  Generar
                </Button>
                <Button
                  variant="outline"
                  className="mt-2 w-full border-slate-700 hover:bg-slate-800 text-slate-300"
                  onClick={() =>
                    handleShare(
                      printSummaryRef,
                      `korestats-summary-${match.matchId}.png`,
                      setSharingSummary
                    )
                  }
                  disabled={sharingSummary}
                >
                  {sharingSummary ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="mr-2 h-4 w-4" />
                  )}
                  Compartir
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
