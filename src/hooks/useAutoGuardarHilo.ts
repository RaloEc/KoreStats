"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const STORAGE_KEY = "korestats_hilo_draft_v1";

interface DraftData {
  titulo: string;
  contenido: string;
  categoriaId: string;
  weaponStatsRecordId: string | null;
  savedAt: string;
}

export function useAutoGuardarHilo() {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const { user } = useAuth();

  // Clave específica para el usuario actual para evitar conflictos
  const getUserStorageKey = useCallback(() => {
    if (!user) return null;
    return `${STORAGE_KEY}_${user.id}`;
  }, [user]);

  // Cargar borrador guardado al iniciar
  const loadDraft = useCallback(() => {
    try {
      const storageKey = getUserStorageKey();
      if (!storageKey) return null;

      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft) as DraftData;

        // Verificar validez básica del draft (ej. no más antiguo de 7 días)
        const savedDate = new Date(parsedDraft.savedAt);
        const now = new Date();
        const diffDays = Math.floor(
          (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays > 7) {
          // Borrador demasiado antiguo, limpiar
          localStorage.removeItem(storageKey);
          return null;
        }

        setLastSavedAt(savedDate);
        return parsedDraft;
      }
    } catch (error) {
      console.error("Error al cargar borrador de hilo:", error);
    }
    return null;
  }, [getUserStorageKey]);

  // Función para guardar el borrador
  const saveDraft = useCallback(
    (data: Omit<DraftData, "savedAt">) => {
      const storageKey = getUserStorageKey();
      if (!storageKey) return;

      // Solo guardar si hay algo de contenido relevante
      if (!data.titulo.trim() && !data.contenido.trim() && !data.categoriaId) {
        return;
      }

      setIsAutoSaving(true);

      // Simular un pequeño delay para feedback visual (opcional)
      setTimeout(() => {
        try {
          const draftToSave: DraftData = {
            ...data,
            savedAt: new Date().toISOString(),
          };

          localStorage.setItem(storageKey, JSON.stringify(draftToSave));
          setLastSavedAt(new Date());
          setIsAutoSaving(false);
        } catch (error) {
          console.error("Error al guardar borrador de hilo:", error);
          setIsAutoSaving(false);
        }
      }, 500);
    },
    [getUserStorageKey]
  );

  // Limpiar borrador después de publicar exitosamente
  const clearDraft = useCallback(() => {
    const storageKey = getUserStorageKey();
    if (storageKey) {
      localStorage.removeItem(storageKey);
      setLastSavedAt(null);
    }
  }, [getUserStorageKey]);

  return {
    isAutoSaving,
    lastSavedAt,
    saveDraft,
    loadDraft,
    clearDraft,
  };
}
