import { useState } from "react";
import { NotebookPen, StickyNote, Tag } from "lucide-react";
import { PlayerNoteModal } from "./PlayerNoteModal";
import { PlayerNote } from "@/hooks/use-player-notes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PlayerNoteButtonProps {
  targetPuuid: string;
  gameName: string;
  tagLine?: string;
  championName?: string;
  gameVersion?: string;
  className?: string;
  existingNote?: PlayerNote;
  onSave: (data: { note: string; tags: string[] }) => Promise<void>;
  onDelete: () => Promise<void>;
  // Props para control externo (opcionales para mantener compatibilidad)
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PlayerNoteButton({
  targetPuuid,
  gameName,
  tagLine,
  championName,
  gameVersion,
  className = "",
  existingNote,
  onSave,
  onDelete,
  isOpen: externalIsOpen,
  onOpenChange,
}: PlayerNoteButtonProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

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
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(true);
              }}
              className={cn(
                "relative inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold border transition-all duration-200",
                hasNote
                  ? "border-amber-400 bg-amber-500/10 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 shadow-sm shadow-amber-500/5 hover:scale-105"
                  : "border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200",
                className,
              )}
            >
              {hasNote ? (
                <StickyNote className="w-3.5 h-3.5" />
              ) : (
                <NotebookPen className="w-3.5 h-3.5" />
              )}
              {hasNote && <span className="sr-only">Nota guardada</span>}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="end"
            className="p-0 border-none bg-transparent shadow-none"
          >
            <div className="max-w-[280px] bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5 animate-in fade-in zoom-in duration-200">
              <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-amber-600" />
              <div className="p-3.5 space-y-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <span className="text-[10px] font-bold dark:text-white uppercase tracking-wider">
                      Nota Personal
                    </span>
                  </div>
                  <div className="pl-8 flex items-center gap-1.5 overflow-hidden">
                    <div className="w-1 h-3 bg-slate-200 dark:bg-white/10 rounded-full shrink-0" />
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">
                      {gameName}
                    </span>
                  </div>
                </div>

                {hasNote && existingNote ? (
                  <>
                    {existingNote.tags && existingNote.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {existingNote.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-white/5"
                          >
                            {tag.split("_").join(" ")}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2">
                      {existingNote.note
                        .split("\n")
                        .filter((n) => n.trim() !== "")
                        .map((noteLine, i) => (
                          <div
                            key={i}
                            className="flex gap-2 bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-200/50 dark:border-white/5"
                          >
                            <div className="mt-1.5 w-1 h-1 rounded-full bg-amber-500/50 shrink-0" />
                            <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed italic flex-1">
                              {noteLine}
                            </p>
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Haz clic para añadir una nota sobre {gameName}
                  </p>
                )}

                <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-white/5 pt-2 mt-1">
                  <Tag className="w-3 h-3" />
                  Privado • Solo tú lo ves
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
