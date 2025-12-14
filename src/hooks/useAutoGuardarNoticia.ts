import { useCallback, useRef, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface DatosAutoGuardar {
  id?: string;
  titulo: string;
  contenido: string;
  imagen_portada?: string;
  categoria_ids: string[];
  destacada?: boolean;
}

interface UseAutoGuardarNoticiaReturn {
  autoGuardar: (datos: DatosAutoGuardar) => Promise<string | null>;
  isAutoSaving: boolean;
  lastSavedAt: Date | null;
  noticiaId: string | null;
}

/**
 * Hook para auto-guardar noticias como borradores
 * Se guarda automáticamente después de 3 segundos de inactividad
 */
export function useAutoGuardarNoticia(): UseAutoGuardarNoticiaReturn {
  const { toast } = useToast();
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [noticiaId, setNoticiaId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string>("");

  const autoGuardar = useCallback(
    async (datos: DatosAutoGuardar): Promise<string | null> => {
      // No guardar si los datos no han cambiado
      const datosString = JSON.stringify(datos);
      if (datosString === lastDataRef.current) {
        return noticiaId;
      }

      // No guardar si faltan campos críticos (solo título y categorías)
      if (!datos.titulo || datos.categoria_ids.length === 0) {
        return noticiaId;
      }

      try {
        setIsAutoSaving(true);
        toast({
          title: "Guardando...",
          description: "Guardando borrador",
          duration: 1000,
        });
        lastDataRef.current = datosString;

        const response = await fetch("/api/admin/noticias/auto-guardar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: datos.id || noticiaId,
            titulo: datos.titulo,
            contenido: datos.contenido,
            imagen_portada: datos.imagen_portada || null,
            categoria_ids: datos.categoria_ids,
            destacada: datos.destacada || false,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Error al auto-guardar:", error);
          return noticiaId;
        }

        const resultado = await response.json();
        const savedId = resultado.id;

        // Actualizar el ID de la noticia si es la primera vez que se guarda
        if (!noticiaId && savedId) {
          setNoticiaId(savedId);
        }

        setLastSavedAt(new Date());

        toast({
          title: "Borrador guardado",
          description: "Tu noticia se ha guardado como borrador",
          duration: 1800,
        });

        return savedId;
      } catch (error) {
        console.error("Error en auto-guardado:", error);
        return noticiaId;
      } finally {
        setIsAutoSaving(false);
      }
    },
    [noticiaId, toast]
  );

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    autoGuardar,
    isAutoSaving,
    lastSavedAt,
    noticiaId,
  };
}
