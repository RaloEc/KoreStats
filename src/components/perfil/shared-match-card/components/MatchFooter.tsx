"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MatchFooterProps {
  matchId: string;
  entryId: string;
  isOwnProfile?: boolean;
  onDelete?: (entryId: string) => Promise<void>;
  deletingId?: string | null;
}

export const MatchFooter: React.FC<MatchFooterProps> = ({
  matchId,
  entryId,
  isOwnProfile,
  onDelete,
  deletingId,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Link
        href={`/match/${matchId}`}
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-slate-900/20 transition hover:bg-slate-800 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
      >
        Abrir análisis
        <ExternalLink className="w-4 h-4" />
      </Link>
      <div className="ml-auto flex items-center">
        {isOwnProfile && onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-600 hover:bg-slate-900/5 dark:text-white/80 dark:hover:bg-white/10"
                aria-label="Acciones de la partida"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            >
              <DropdownMenuItem
                disabled={deletingId === entryId}
                className="text-red-600 focus:text-red-600"
                onSelect={(event) => {
                  event.preventDefault();
                  onDelete(entryId);
                }}
              >
                <Trash2 className="w-3 h-3" />
                {deletingId === entryId ? "Eliminando..." : "Eliminar"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
