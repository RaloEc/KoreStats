"use client";

import { Trophy } from "lucide-react";
import { ManualRiotLinkForm } from "./ManualRiotLinkForm";

interface RiotEmptyStateProps {
  isOwnProfile: boolean;
  onLinkClick?: () => void;
  onManualLinkSuccess?: () => void | Promise<void>;
}

export function RiotEmptyState({
  isOwnProfile,
  onLinkClick,
  onManualLinkSuccess,
}: RiotEmptyStateProps) {
  if (!isOwnProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Trophy size={48} className="text-slate-400 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Sin cuenta vinculada
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
          Este usuario no ha vinculado su cuenta de Riot Games aún.
        </p>
      </div>
    );
  }

  // Mostrar formulario directamente para el dueño del perfil
  return (
    <div className="py-6">
      <ManualRiotLinkForm onSuccess={onManualLinkSuccess} />
    </div>
  );
}
