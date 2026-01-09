"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import type { Juego, JuegoListado, JuegoRow } from "../types";
import { JuegoFormValues, generateSlug } from "../schemas";

interface UseJuegosReturn {
  juegos: JuegoListado[];
  isLoadingJuegos: boolean;
  juegosError: string | null;
  hasTriedLoadingJuegos: boolean;
  juegoEliminandoId: string | null;
  fetchJuegos: () => Promise<void>;
  handleEliminarJuego: (
    juego: JuegoListado,
    onJuegoEliminado?: (juegoId: string) => void
  ) => Promise<void>;
  guardarJuego: (
    data: JuegoFormValues,
    juegoEditando: Juego | null
  ) => Promise<boolean>;
}

export function useJuegos(): UseJuegosReturn {
  const supabase = createClient();
  const [juegos, setJuegos] = useState<JuegoListado[]>([]);
  const [isLoadingJuegos, setIsLoadingJuegos] = useState(false);
  const [juegosError, setJuegosError] = useState<string | null>(null);
  const [hasTriedLoadingJuegos, setHasTriedLoadingJuegos] = useState(false);
  const [juegoEliminandoId, setJuegoEliminandoId] = useState<string | null>(
    null
  );

  // Función para cargar juegos con cacheo de URLs públicas
  const fetchJuegos = useCallback(async () => {
    try {
      setIsLoadingJuegos(true);
      setJuegosError(null);
      setHasTriedLoadingJuegos(true);

      const { data, error } = await supabase
        .from("juegos")
        .select(
          "id, nombre, slug, icono_url, descripcion, desarrollador, fecha_lanzamiento"
        )
        .order("nombre");

      if (error) throw error;

      if (data) {
        // Cachear URLs públicas para cada juego
        const juegosConUrls: JuegoListado[] = (data as JuegoRow[]).map(
          (juego) => {
            let iconoPublicUrl: string | null = null;

            if (juego.icono_url) {
              try {
                // Si ya es una URL pública (comienza con http), usarla directamente
                if (juego.icono_url.startsWith("http")) {
                  iconoPublicUrl = juego.icono_url;
                } else {
                  // Si es una ruta relativa, generar URL pública
                  const { data: publicUrlData } = supabase.storage
                    .from("iconos")
                    .getPublicUrl(juego.icono_url);
                  iconoPublicUrl = publicUrlData?.publicUrl || null;
                }
              } catch (e) {
                console.warn(
                  `[fetchJuegos] Error obteniendo URL para ${juego.nombre}:`,
                  e
                );
              }
            }

            return {
              ...juego,
              iconoPublicUrl,
            };
          }
        );

        setJuegos(juegosConUrls);
        console.log(
          "[fetchJuegos] Juegos cargados:",
          juegosConUrls.length,
          "con iconos"
        );
      }
    } catch (error) {
      console.error("[fetchJuegos] Error:", error);
      setJuegosError("No se pudieron cargar los juegos. Intenta de nuevo.");
    } finally {
      setIsLoadingJuegos(false);
    }
  }, [supabase]);

  // Eliminar un juego existente
  const handleEliminarJuego = useCallback(
    async (
      juego: JuegoListado,
      onJuegoEliminado?: (juegoId: string) => void
    ) => {
      const confirmar = window.confirm(
        `¿Seguro que deseas eliminar el juego "${juego.nombre}"? Esta acción no se puede deshacer.`
      );
      if (!confirmar) return;

      try {
        setJuegoEliminandoId(juego.id);

        if (juego.icono_url && !juego.icono_url.startsWith("http")) {
          try {
            await supabase.storage.from("iconos").remove([juego.icono_url]);
          } catch (errorRemocion) {
            console.warn(
              "No se pudo eliminar el icono asociado al juego:",
              errorRemocion
            );
          }
        }

        const { error } = await supabase
          .from("juegos")
          .delete()
          .eq("id", juego.id);

        if (error) throw error;

        // Callback para limpiar selección si es necesario
        onJuegoEliminado?.(juego.id);

        await fetchJuegos();

        toast({
          title: "Juego eliminado",
          description: `Se eliminó el juego "${juego.nombre}" correctamente.`,
        });
      } catch (error) {
        console.error("Error al eliminar juego:", error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el juego. Intenta nuevamente.",
          variant: "destructive",
        });
      } finally {
        setJuegoEliminandoId(null);
      }
    },
    [supabase, fetchJuegos]
  );

  // Guardar juego (crear o actualizar)
  const guardarJuego = useCallback(
    async (
      data: JuegoFormValues,
      juegoEditando: Juego | null
    ): Promise<boolean> => {
      try {
        // Generar slug a partir del nombre
        const generatedSlug = generateSlug(data.nombre);

        const juegoData = {
          nombre: data.nombre,
          slug: generatedSlug,
          descripcion: data.descripcion || null,
          desarrollador: data.desarrollador || null,
          fecha_lanzamiento: data.fecha_lanzamiento
            ? data.fecha_lanzamiento.toISOString()
            : null,
          icono_url: data.icono_url || null,
        };

        console.log("Guardando juego con datos:", juegoData);

        let result;

        if (juegoEditando) {
          // Actualizar juego existente
          result = await supabase
            .from("juegos")
            .update(juegoData)
            .eq("id", juegoEditando.id)
            .select();
        } else {
          // Crear nuevo juego
          result = await supabase.from("juegos").insert([juegoData]).select();
        }

        const { error } = result;

        if (error) throw error;

        // Actualizar lista de juegos
        await fetchJuegos();

        // Mostrar mensaje de éxito
        toast({
          title: juegoEditando ? "Juego actualizado" : "Juego creado",
          description: `El juego ${data.nombre} ha sido ${
            juegoEditando ? "actualizado" : "creado"
          } correctamente.`,
          variant: "default",
        });

        return true;
      } catch (error) {
        console.error("Error al guardar juego:", error);
        toast({
          title: "Error",
          description: `Ocurrió un error al ${
            juegoEditando ? "actualizar" : "crear"
          } el juego.`,
          variant: "destructive",
        });
        return false;
      }
    },
    [supabase, fetchJuegos]
  );

  return {
    juegos,
    isLoadingJuegos,
    juegosError,
    hasTriedLoadingJuegos,
    juegoEliminandoId,
    fetchJuegos,
    handleEliminarJuego,
    guardarJuego,
  };
}
