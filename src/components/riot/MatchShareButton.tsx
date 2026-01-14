"use client";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchShareModal } from "@/components/riot/MatchShareModal";
import { useSiteSetting } from "@/hooks/useSiteSettings";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isPngEnabled = useSiteSetting("match_share_png_enabled");

  // Si está cargando (null), no mostrar nada temporalmente
  // Si está deshabilitado, no renderizar el botón
  if (isPngEnabled === null || isPngEnabled === false) return null;

  if (!focusParticipant) return null;

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2 bg-blue-600 border-blue-500 hover:bg-blue-700 text-white hover:text-white transition-colors shadow-sm"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Guardar PNG</span>
        <span className="sm:hidden">PNG</span>
      </Button>

      <MatchShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        match={match}
        focusParticipant={focusParticipant}
        gameVersion={gameVersion}
        userColor={userColor}
      />
    </>
  );
}
