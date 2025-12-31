"use client";

import { useState } from "react";
import { NotebookPen, StickyNote } from "lucide-react";
import { PlayerNoteModal } from "./PlayerNoteModal";
import { PlayerNote } from "@/hooks/use-player-notes";

interface PlayerNoteButtonProps {
  targetPuuid: string;
  gameName: string;
  tagLine?: string;
  className?: string;
  existingNote?: PlayerNote;
  onSave: (data: { note: string; tags: string[] }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function PlayerNoteButton({
  targetPuuid,
  gameName,
  tagLine,
  className = "",
  existingNote,
  onSave,
  onDelete,
}: PlayerNoteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasNote = Boolean(existingNote);

  const handleSave = async (data: { note: string; tags: string[] }) => {
    await onSave(data);
  };

  const handleDelete = async () => {
    await onDelete();
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`relative inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold border transition-colors ${
          hasNote
            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
            : "border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-200 dark:hover:bg-slate-800/40"
        } ${className}`}
        title={hasNote ? "Ver nota personal" : "Añadir nota personal"}
      >
        {hasNote ? (
          <StickyNote className="w-3.5 h-3.5" />
        ) : (
          <NotebookPen className="w-3.5 h-3.5" />
        )}
        {hasNote && <span className="sr-only">Nota guardada</span>}
      </button>

      <PlayerNoteModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        targetPuuid={targetPuuid}
        gameName={gameName}
        tagLine={tagLine}
        existingNote={existingNote}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
