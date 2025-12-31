"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { MatchDetailContent } from "@/components/riot/MatchDetailContent";

interface MatchModalProps {
  params: { matchId: string };
}

/**
 * Ruta interceptada para mostrar detalles de partida en un modal
 * Se abre sobre el perfil sin desmontar el historial de partidas
 *
 * Estructura:
 * - (.) = intercepta una ruta al mismo nivel
 * - match/[matchId] = intercepta /match/[matchId]
 *
 * Cuando el usuario hace clic en una partida del historial:
 * 1. La navegación a /match/[matchId] es interceptada
 * 2. Este componente se renderiza en el slot @modal
 * 3. El historial se mantiene montado y con su scroll intacto
 * 4. Al cerrar el modal, router.back() regresa sin recargar
 */
export default function MatchModal({ params }: MatchModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  // Cerrar modal cuando open cambia a false
  useEffect(() => {
    if (!open) {
      router.back();
    }
  }, [open, router]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800">
        <DialogHeader className="sticky top-0 z-10 bg-slate-950 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white">
              Detalles de la Partida
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Contenido de la partida */}
        <div className="px-6 pb-6">
          <MatchDetailContent matchId={params.matchId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
