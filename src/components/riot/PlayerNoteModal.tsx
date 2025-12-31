"use client";

import { useEffect, useState } from "react";
import { Trash2, Save } from "lucide-react";
import { PlayerNote } from "@/hooks/use-player-notes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PlayerNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPuuid: string;
  gameName: string;
  tagLine?: string;
  existingNote?: PlayerNote;
  onSave: (data: { note: string; tags: string[] }) => Promise<void>;
  onDelete: () => Promise<void>;
}

const AVAILABLE_TAGS = [
  {
    id: "buen_teammate",
    label: "Buen Teammate",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  {
    id: "carry",
    label: "Carry",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  {
    id: "troll",
    label: "Troll",
    color:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  {
    id: "afk",
    label: "AFK",
    color:
      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  {
    id: "flamer",
    label: "Flamer",
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  {
    id: "otp",
    label: "OTP",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
];

export function PlayerNoteModal({
  isOpen,
  onClose,
  targetPuuid,
  gameName,
  tagLine,
  existingNote,
  onSave,
  onDelete,
}: PlayerNoteModalProps) {
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNote(existingNote?.note || "");
      setTags(existingNote?.tags || []);
    }
  }, [isOpen, existingNote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave({ note, tags });
      onClose();
    } catch (error) {
      // Error is handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta nota?")) return;
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
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Añadir backdrop-none si el blur causa lag, pero probemos primero optimizando */}
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl">
        <DialogHeader>
          <DialogTitle>Nota Privada sobre {gameName}</DialogTitle>
          <DialogDescription>
            Estas notas son privadas y solo tú puedes verlas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Etiquetas
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`text-xs px-2 py-1 rounded-full border transition-all ${
                    tags.includes(tag.id)
                      ? tag.color +
                        " ring-1 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 ring-slate-400"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nota
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none p-2 border"
              placeholder="Escribe algo sobre este jugador..."
              autoFocus
            />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full mt-4">
            {existingNote ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !note.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4" />
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
