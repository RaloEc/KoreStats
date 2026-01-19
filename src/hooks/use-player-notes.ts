import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

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

// OPTIMIZACIÓN: Caché global singleton para evitar múltiples fetches
// cuando el hook se usa en múltiples componentes simultáneamente
let globalNotesCache: Record<string, PlayerNote> = {};
let globalFetchPromise: Promise<void> | null = null;
let globalFetchedAt: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de caché

async function fetchNotesGlobal(): Promise<Record<string, PlayerNote>> {
  // Si hay un fetch en progreso, esperar a que termine
  if (globalFetchPromise) {
    await globalFetchPromise;
    return globalNotesCache;
  }

  // Si el caché es reciente, usarlo
  if (globalFetchedAt > 0 && Date.now() - globalFetchedAt < CACHE_TTL_MS) {
    return globalNotesCache;
  }

  // Hacer el fetch
  globalFetchPromise = (async () => {
    try {
      const res = await fetch("/api/riot/notes");

      if (!res.ok) {
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
      globalNotesCache = notesMap;
      globalFetchedAt = Date.now();
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      globalFetchPromise = null;
    }
  })();

  await globalFetchPromise;
  return globalNotesCache;
}

export function usePlayerNotes() {
  const [notes, setNotes] =
    useState<Record<string, PlayerNote>>(globalNotesCache);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const { user } = useAuth();

  const fetchNotes = useCallback(async () => {
    if (!user) return; // No intentar fetch si no hay usuario

    setLoading(true);
    try {
      const freshNotes = await fetchNotesGlobal();
      if (mountedRef.current) {
        setNotes(freshNotes);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user]);

  const getNote = (targetPuuid: string) => notes[targetPuuid];

  const saveNote = async (data: {
    target_puuid: string;
    target_game_name?: string;
    target_tag_line?: string;
    note: string;
    tags: string[];
  }) => {
    if (!user) {
      toast.error("Debes iniciar sesión para guardar notas");
      throw new Error("No authenticated");
    }

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

      // Actualizar caché global y local
      globalNotesCache = {
        ...globalNotesCache,
        [data.target_puuid]: json.data,
      };
      setNotes(globalNotesCache);

      toast.success("Nota guardada");
      return json.data;
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Error al guardar la nota");
      throw error;
    }
  };

  const deleteNote = async (targetPuuid: string) => {
    if (!user) return;

    try {
      const res = await fetch(`/api/riot/notes?target_puuid=${targetPuuid}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete note");

      // Actualizar caché global y local
      const next = { ...globalNotesCache };
      delete next[targetPuuid];
      globalNotesCache = next;
      setNotes(next);

      toast.success("Nota eliminada");
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Error al eliminar la nota");
      throw error;
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    // Si ya hay datos en caché, usarlos inmediatamente sin bloquear
    if (Object.keys(globalNotesCache).length > 0) {
      setNotes(globalNotesCache);
    }

    // Fetch en background solo si el caché está vacío o expirado
    // Y solo si hay usuario autenticado
    if (
      user &&
      (Object.keys(globalNotesCache).length === 0 ||
        Date.now() - globalFetchedAt >= CACHE_TTL_MS)
    ) {
      fetchNotes();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [fetchNotes, user]);

  return {
    notes,
    loading,
    getNote,
    saveNote,
    deleteNote,
    refreshNotes: fetchNotes,
  };
}
