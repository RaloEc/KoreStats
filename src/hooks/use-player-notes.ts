import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export interface PlayerNote {
  id: string;
  user_id: string;
  target_puuid: string;
  target_game_name: string | null;
  target_tag_line: string | null;
  note: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface UsePlayerNotesProps {
  currentUserPuuid?: string;
}

export function usePlayerNotes() {
  const [notes, setNotes] = useState<Record<string, PlayerNote>>({});
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchNotes = useCallback(async () => {
    // Basic caching/deduping to prevent strict mode double-fetch or rapid re-fetches
    // Ideally use React Query, but this suffices for now
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    try {
      setLoading(true);
      const res = await fetch("/api/riot/notes");

      if (!res.ok) {
        // If 404/500, likely table missing. Don't throw to avoid loop spam, just log.
        console.warn("Failed to fetch notes (API error)", res.status);
        return;
      }

      const json = await res.json();
      const notesMap: Record<string, PlayerNote> = {};
      if (json.data) {
        json.data.forEach((note: PlayerNote) => {
          notesMap[note.target_puuid] = note;
        });
      }
      setNotes(notesMap);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch only a specific note if needed, but for now we fetch all
  // Optimization: Could fetch single note on modal open if list is huge
  const getNote = (targetPuuid: string) => notes[targetPuuid];

  const saveNote = async (data: {
    target_puuid: string;
    target_game_name?: string;
    target_tag_line?: string;
    note: string;
    tags: string[];
  }) => {
    try {
      const res = await fetch("/api/riot/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to save note");
      }

      setNotes((prev) => ({
        ...prev,
        [data.target_puuid]: json.data,
      }));

      toast.success("Nota guardada");
      return json.data;
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Error al guardar la nota");
      throw error;
    }
  };

  const deleteNote = async (targetPuuid: string) => {
    try {
      const res = await fetch(`/api/riot/notes?target_puuid=${targetPuuid}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete note");

      setNotes((prev) => {
        const next = { ...prev };
        delete next[targetPuuid];
        return next;
      });

      toast.success("Nota eliminada");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Error al eliminar la nota");
      throw error;
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    loading,
    getNote,
    saveNote,
    deleteNote,
    refreshNotes: fetchNotes,
  };
}
