import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WeaponStats } from "@/types/weapon";

// Tipo para el resultado del análisis (estructura guardada en BD)
interface AnalysisResult {
  type: "stats" | "descripcion";
  stats?: WeaponStats;
  datos?: WeaponStats;
  nombreArma?: string | null;
}

type ExtendedAnalysisResult = AnalysisResult & {
  datos?: WeaponStats;
  tipo?: AnalysisResult["type"];
};

// Tipo para el Job (basado en tu schema)
interface WeaponAnalysisJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  result: AnalysisResult | string | null;
  error_message: string | null;
}

// Tipo de retorno del hook (más detallado)
interface UseWeaponAnalyzerReturn {
  // 'idle' (inicio), 'uploading' (enviando archivo), 'analyzing' (polling), 'success', 'error'
  status: "idle" | "uploading" | "analyzing" | "success" | "error";
  error: string | null;
  stats: WeaponStats | null;
  weaponStatsRecordId: string | null;
  startAnalysis: (file: File) => Promise<void>;
  clear: () => void;
}

// Función separada para fetchear el estado del job
const fetchJobStatus = async (
  jobId: string
): Promise<WeaponAnalysisJob | null> => {
  if (!jobId) return null;
  console.log("[useWeaponAnalyzer] Consultando estado del job", { jobId });
  const response = await fetch(`/api/analyze-weapon/status?jobId=${jobId}`);
  if (!response.ok) {
    throw new Error("No se pudo obtener el estado del análisis");
  }
  return response.json();
};

export function useWeaponAnalyzer(): UseWeaponAnalyzerReturn {
  const [jobId, setJobId] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [status, setStatus] = useState<UseWeaponAnalyzerReturn["status"]>("idle");
  const [finalStats, setFinalStats] = useState<WeaponStats | null>(null);
  const [weaponStatsRecordId, setWeaponStatsRecordId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Hook de React Query para el polling
  const { data: job, error: pollError } = useQuery({
    queryKey: ["weaponJobStatus", jobId],
    queryFn: () => fetchJobStatus(jobId!),
    enabled: !!jobId && status === "analyzing", // Solo activa el query si hay un jobId y estamos analizando
    refetchInterval: (query) => {
      // Detener polling si está completo o fallido
      const jobStatus = (query.state.data as WeaponAnalysisJob | undefined)?.status;
      if (jobStatus === "completed" || jobStatus === "failed") {
        return false;
      }
      // Continuar polling cada 2 segundos
      return 2000;
    },
    refetchOnWindowFocus: false, // Evitar refetches innecesarios
  });

  // Efecto para manejar cambios en el job (reemplaza onSuccess/onError)
  useEffect(() => {
    if (!job) return;

    if (job.status === "completed") {
      console.log("[useWeaponAnalyzer] Job completado", {
        jobId: job.id,
        result: job.result,
        weaponStatsRecordId: (job as any).weapon_stats_record_id,
      });

      let parsedStats: WeaponStats | null = null;
      let aiDescription: string | null = null;

      try {
        let rawResult: any = null;
        if (typeof job.result === "string") {
          rawResult = JSON.parse(job.result);
        } else {
          rawResult = job.result;
        }

        if (rawResult) {
          // CAPTURA CRÍTICA: La IA devuelve 'descripcionComica' según el prompt
          aiDescription = rawResult.descripcionComica || rawResult.descripcion || rawResult.error_message || null;
          parsedStats = rawResult.stats ?? rawResult.datos ?? null;
          
          // Si el tipo es descripción O si no hay stats válidas, forzar error con el mensaje de la IA
          const isDescriptionType = rawResult.type === 'descripcion' || rawResult.tipo === 'descripcion';
          
          if (isDescriptionType) {
            console.log("[useWeaponAnalyzer] La IA devolvió una descripción (error):", aiDescription);
            setStatus("error");
            setClientError(aiDescription || "No se pudo identificar el arma.");
            setFinalStats(null);
            setJobId(null);
            return;
          }

          // Validación de seguridad para el tipo 'stats' que vienen en cero
          if (parsedStats) {
            const s = parsedStats as any;
            const coreStats = [
              s.damage ?? s.dano,
              s.range ?? s.alcance,
              s.control,
              s.accuracy ?? s.precision,
              s.handling ?? s.manejo,
              s.stability ?? s.estabilidad
            ];
            const hasRealData = coreStats.some(v => typeof v === 'number' && v > 0);
            
            if (!hasRealData) {
              console.warn("[useWeaponAnalyzer] Detección fallida (stats en cero):", aiDescription);
              setStatus("error");
              setClientError(aiDescription || "Esa imagen no contiene estadísticas válidas.");
              setFinalStats(null);
              setJobId(null);
              return;
            }
          }
        }
      } catch (parseError) {
        console.error("[useWeaponAnalyzer] Error parseando resultado final", {
          parseError,
        });
      }

      setFinalStats(parsedStats);
      setWeaponStatsRecordId((job as any).weapon_stats_record_id || null);
      setStatus("success");
      setJobId(null); // Detener query
    } else if (job.status === "failed") {
      console.error("[useWeaponAnalyzer] Job falló", {
        jobId: job.id,
        error: job.error_message,
        result: job.result
      });

      // Intentar extraer el mensaje de la IA desde varias fuentes posibles
      let aiErrorMessage = job.error_message;
      
      if (!aiErrorMessage && job.result) {
        try {
          const res = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
          aiErrorMessage = res.descripcionComica || res.descripcion || res.error_message;
        } catch(e) {}
      }

      setStatus("error");
      setClientError(
        aiErrorMessage || "Esa imagen no contiene estadísticas válidas. Asegúrate de subir una captura clara del menú de accesorios."
      );
      setFinalStats(null);
      setJobId(null); // Detener query
    }
  }, [job]);

  // Efecto para manejar errores de polling
  useEffect(() => {
    if (pollError) {
      console.error("[useWeaponAnalyzer] Error durante el polling", pollError);
      setStatus("error");
      setClientError(pollError.message);
      setFinalStats(null);
      setJobId(null); // Detener query
    }
  }, [pollError]);

  // Función que el componente llamará para iniciar el análisis
  const startAnalysis = useCallback(async (file: File) => {
    console.log("[useWeaponAnalyzer] Iniciando análisis", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
    setStatus("uploading"); // Estado inicial: subiendo
    setClientError(null);
    setJobId(null);
    setFinalStats(null);

    try {
      // 1. Validaciones (movidas desde el hook original)
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        console.warn("[useWeaponAnalyzer] Tipo de archivo no permitido", {
          fileType: file.type,
        });
        throw new Error(
          "Tipo de archivo no válido. Solo se permiten JPEG, PNG y WebP."
        );
      }
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        console.warn("[useWeaponAnalyzer] Archivo supera el tamaño máximo", {
          fileSize: file.size,
        });
        throw new Error("El archivo es demasiado grande. Máximo 5MB.");
      }

      // 2. Subir y crear el job
      const formData = new FormData();
      formData.append("image", file);

      console.log("[useWeaponAnalyzer] Subiendo imagen a la API");
      const response = await fetch("/api/analyze-weapon", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        console.error("[useWeaponAnalyzer] Error en respuesta inicial", {
          status: response.status,
        });
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Error ${response.status} al iniciar el job`
        );
      }

      const result = await response.json();

      if (!result.success || !result.jobId) {
        console.error("[useWeaponAnalyzer] Respuesta inválida, falta jobId", {
          result,
        });
        throw new Error("La API no devolvió un jobId.");
      }

      // 3. ¡Éxito! Iniciar el polling
      console.log("[useWeaponAnalyzer] Job creado correctamente", {
        jobId: result.jobId,
      });
      setJobId(result.jobId);
      setStatus("analyzing"); // Cambiar a estado de "analizando" (activará el useQuery)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido al subir";
      console.error("[useWeaponAnalyzer] Error durante startAnalysis", {
        error: err,
        message: errorMessage,
      });
      setClientError(errorMessage);
      setStatus("error");
      setFinalStats(null);
    }
  }, []);

  // Función para resetear el estado
  const clear = useCallback(() => {
    console.log("[useWeaponAnalyzer] Restableciendo estado del hook");
    setJobId(null);
    setClientError(null);
    setStatus("idle");
    setFinalStats(null);
    // Limpia la caché de React Query para este job
    queryClient.removeQueries({ queryKey: ["weaponJobStatus", jobId] });
  }, [queryClient, jobId]);

  const parsedResult = useMemo(() => {
    if (!job?.result) return null;

    let rawResult: AnalysisResult | null = null;

    if (typeof job.result === "string") {
      try {
        rawResult = JSON.parse(job.result) as AnalysisResult;
      } catch (error) {
        console.error("[useWeaponAnalyzer] Error parseando result string", {
          error,
          result: job.result,
        });
        return null;
      }
    } else {
      rawResult = job.result;
    }

    if (!rawResult) return null;

    const extended = rawResult as ExtendedAnalysisResult;
    const type = rawResult.type || extended.tipo;

    const stats = rawResult.stats ?? extended.datos ?? null;

    if (!type) {
      console.warn("[useWeaponAnalyzer] Resultado sin tipo", { rawResult });
      return null;
    }

    console.log("[useWeaponAnalyzer] Resultado parseado correctamente", {
      type,
      hasStats: Boolean(stats),
    });

    return {
      type,
      stats: stats || undefined,
      datos: stats || undefined,
      nombreArma: rawResult.nombreArma ?? null,
    } satisfies AnalysisResult;
  }, [job?.result]);

  useEffect(() => {
    if (parsedResult?.type === "stats") {
      const statsData = parsedResult.stats ?? parsedResult.datos ?? null;
      if (statsData) {
        setFinalStats(statsData);
      }
    }
  }, [parsedResult]);

  useEffect(() => {
    console.log("[useWeaponAnalyzer] Estado actualizado", {
      status,
      jobId,
      error: clientError,
    });
  }, [status, jobId, clientError]);

  return {
    status,
    error: clientError || (pollError ? pollError.message : null),
    stats: finalStats,
    weaponStatsRecordId,
    startAnalysis,
    clear,
  };
}
