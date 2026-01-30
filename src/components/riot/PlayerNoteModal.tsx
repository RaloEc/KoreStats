"use client";

import { useEffect, useState, useMemo } from "react";
import { Trash2, Save, X, Info, User, MessageSquare } from "lucide-react";
import { PlayerNote } from "@/hooks/use-player-notes";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { getChampionImg } from "@/lib/riot/helpers";
import { cn } from "@/lib/utils";

interface PlayerNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPuuid: string;
  gameName: string;
  tagLine?: string;
  championName?: string;
  gameVersion?: string;
  existingNote?: PlayerNote;
  onSave: (data: { note: string; tags: string[] }) => Promise<void>;
  onDelete: () => Promise<void>;
}

const AVAILABLE_TAGS = [
  {
    id: "buen_teammate",
    label: "Buen Teammate",
    color: "emerald",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  {
    id: "carry",
    label: "Carry",
    color: "amber",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  {
    id: "troll",
    label: "Troll",
    color: "rose",
    className:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  {
    id: "afk",
    label: "AFK",
    color: "slate",
    className:
      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  {
    id: "flamer",
    label: "Flamer",
    color: "orange",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  {
    id: "otp",
    label: "OTP",
    color: "purple",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
];

const MAX_INDIVIDUAL_NOTE_LENGTH = 200;
const MAX_NOTES_PER_PLAYER = 5;

export function PlayerNoteModal({
  isOpen,
  onClose,
  targetPuuid,
  gameName,
  tagLine,
  championName,
  gameVersion,
  existingNote,
  onSave,
  onDelete,
}: PlayerNoteModalProps) {
  const [currentNote, setCurrentNote] = useState("");
  const [noteList, setNoteList] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingNote?.note) {
        // Asumimos que las notas múltiples se guardan separadas por saltos de línea doble o similar
        // Para simplificar, si hay saltos de línea, las tratamos como lista
        const notes = existingNote.note
          .split("\n")
          .filter((n) => n.trim() !== "");
        setNoteList(notes);
      } else {
        setNoteList([]);
      }
      setTags(existingNote?.tags || []);
      setCurrentNote("");
    }
  }, [isOpen, existingNote]);

  const addNoteToList = () => {
    if (!currentNote.trim()) return;
    if (noteList.length >= 5) {
      toast.error("Máximo 5 notas por jugador");
      return;
    }
    setNoteList((prev) => [...prev, currentNote.trim()]);
    setCurrentNote("");
  };

  const removeNoteFromList = (index: number) => {
    setNoteList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addNoteToList();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Si hay texto en el input pero no se ha dado enter, lo añadimos
    const finalNoteList = currentNote.trim()
      ? [...noteList, currentNote.trim()]
      : noteList;

    if (finalNoteList.length === 0 && tags.length === 0 && !existingNote)
      return;

    try {
      setIsSubmitting(true);
      // Guardamos las notas concatenadas por saltos de línea
      await onSave({ note: finalNoteList.join("\n"), tags });
      onClose();
    } catch (error) {
      // Error is handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar todas las notas de este jugador?",
      )
    )
      return;
    try {
      setIsSubmitting(true);
      await onDelete();
      onClose();
    } catch (error) {
      // Error is handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
  };

  const characterCount = currentNote.length;
  const isOverLimit = characterCount > MAX_INDIVIDUAL_NOTE_LENGTH; // Límite por nota individual

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-black border-slate-200 dark:border-white/10 shadow-2xl p-0 overflow-hidden ring-1 ring-black/5 dark:ring-white/5 transition-colors duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 opacity-70" />

        <div className="p-6">
          <DialogHeader className="mb-6 relative">
            <div className="flex items-center gap-4">
              {championName && gameVersion && (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-white/10 shadow-lg shrink-0">
                  <Image
                    src={getChampionImg(championName, gameVersion)}
                    alt={championName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Notas de{" "}
                  <span className="text-blue-600 dark:text-blue-400 truncate max-w-[180px]">
                    {gameName}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                  <Info className="w-3.5 h-3.5" />
                  Privado • Hasta 5 notas personales
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Etiquetas */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <div className="w-1 h-3 bg-blue-500 rounded-full" />
                Etiquetas
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = tags.includes(tag.id);
                  return (
                    <motion.button
                      key={tag.id}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-200",
                        isSelected
                          ? tag.className +
                              " shadow-md border-transparent ring-2 ring-offset-1 dark:ring-offset-black ring-blue-500/30"
                          : "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200",
                      )}
                    >
                      {tag.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Historial de Notas */}
            <AnimatePresence mode="popLayout">
              {noteList.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <div className="w-1 h-3 bg-amber-500 rounded-full" />
                    Notas Guardadas ({noteList.length}/5)
                  </label>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {noteList.map((note, idx) => (
                      <motion.div
                        key={`${idx}-${note}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group relative bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 p-3 rounded-xl flex items-start gap-3"
                      >
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500/50 shrink-0" />
                        <p className="text-sm text-slate-600 dark:text-slate-300 flex-1 leading-relaxed">
                          {note}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeNoteFromList(idx)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 hover:text-rose-500 rounded-md transition-all shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Input de nueva nota */}
            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <div className="w-1 h-3 bg-purple-500 rounded-full" />
                  Nueva Anotaci&oacute;n
                </label>
                <div className="text-[9px] text-slate-400 dark:text-slate-500 animate-pulse flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Presiona Enter para añadir
                </div>
              </div>
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-0 group-within:opacity-20 transition duration-500" />
                <textarea
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  className={cn(
                    "relative w-full rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none text-sm resize-none p-4 border transition-all duration-300",
                    isOverLimit && "border-rose-500/50 focus:ring-rose-500/50",
                  )}
                  placeholder="Escribe algo y pulsa Enter..."
                  disabled={noteList.length >= 5}
                />
              </div>
            </div>

            <DialogFooter className="flex items-center sm:justify-between w-full pt-2 gap-4">
              <div className="flex-1">
                <AnimatePresence>
                  {existingNote && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2 group"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5 group-hover:animate-pulse" />
                        Borrar Todo
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (noteList.length === 0 &&
                      !currentNote.trim() &&
                      tags.length === 0)
                  }
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 px-6 font-semibold border-none"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Finalizar
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
