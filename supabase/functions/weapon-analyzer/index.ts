import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
// Jimp removido para estabilidad
// Forzar redespliegue v1.1
const LOG_PREFIX = "[weapon-analyzer]";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash-lite";
const geminiApiVersion = Deno.env.get("GEMINI_API_VERSION") || "v1beta";
const geminiApiBaseUrl =
  Deno.env.get("GEMINI_API_BASE_URL") ||
  "https://generativelanguage.googleapis.com";

interface JobRequest {
  jobId: string;
}

interface WeaponStats {
  damage?: number;
  range?: number;
  control?: number;
  handling?: number;
  stability?: number;
  accuracy?: number;
  armorPenetration?: number;
  fireRate?: number;
  capacity?: number;
  muzzleVelocity?: number;
  soundRange?: number;
  nombreArma?: string | null;
}

interface AnalysisResult {
  type: "stats" | "descripcion";
  datos?: WeaponStats;
  stats?: WeaponStats;
  descripcion?: string;
  descripcionComica?: string;
  nombreArma?: string | null;
}

async function downloadImage(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string
): Promise<Uint8Array> {
  console.log(`${LOG_PREFIX} Descargando imagen desde Storage`, {
    bucket,
    path,
  });
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    console.error(`${LOG_PREFIX} Error al descargar imagen`, {
      bucket,
      path,
      error,
    });
    throw new Error(`Failed to download image: ${error.message}`);
  }

  const buffer = await data.arrayBuffer();
  console.log(`${LOG_PREFIX} Imagen descargada correctamente`, {
    size: buffer.byteLength,
  });
  return new Uint8Array(buffer);
}

// function imageToBase64 removida

async function analyzeWithGemini(
  imageBase64: string,
  mimeType: string,
  _width: number,
  _height: number,
  retryCount = 0
): Promise<AnalysisResult> {
  const prompt = `Analiza la imagen detenidamente. Tu tarea es extraer estadísticas de armas de un videojuego.

SI LA IMAGEN NO ES UNA CAPTURA DE PANTALLA DE ESTADÍSTICAS DE UN ARMA (por ejemplo, si es una foto de una persona, un paisaje, un meme, o cualquier otra cosa que no sea el menú de accesorios de un arma):
DEBES responder ÚNICAMENTE con el formato de "descripcion" (tipo 2).

Responde con uno de estos formatos estrictos en JSON:

1) Cuando identifiques CLARAMENTE estadísticas de un arma en su menú de accesorios:
{
  "tipo": "stats",
  "datos": {
    "dano": number,
    "alcance": number,
    "control": number,
    "manejo": number,
    "estabilidad": number,
    "precision": number,
    "perforacionBlindaje": number | null,
    "cadenciaDisparo": number | null,
    "capacidad": number | null,
    "velocidadBoca": number | null,
    "sonidoDisparo": number | null
  },
  "nombreArma": "Nombre Completo del Arma"
}

2) Cuando la imagen NO sea una captura de estadísticas o los datos no sean confiables:
{
  "tipo": "descripcion",
  "descripcionComica": "Escribe aquí un mensaje corto y divertido en español diciendo que eso no es un arma y que necesitas la captura correcta."
}

REGLA DE ORO: Si no hay números de daño, alcance, etc., o si ves personas o cosas que no son del juego, usa el formato 2. No inventes datos. No incluyas comentarios, explicaciones ni texto adicional.`;

  try {
    console.log(`${LOG_PREFIX} Request a Gemini (${geminiModel}) - Intento ${retryCount + 1}`);

    const response = await fetch(
      `${geminiApiBaseUrl}/${geminiApiVersion}/models/${geminiModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (response.status === 429 && retryCount < 2) {
      console.warn(`${LOG_PREFIX} Cuota excedida (429), esperando 5s antes de reintentar...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return analyzeWithGemini(imageBase64, mimeType, _width, _height, retryCount + 1);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`${LOG_PREFIX} Error API Gemini:`, { status: response.status, errorData });
      
      if (response.status === 404) {
        throw new Error(`El modelo de IA '${geminiModel}' no se encontró. Verifica la configuración.`);
      }
      if (response.status === 429) {
        throw new Error("Límite de solicitudes de la API superado. Espera un momento y vuelve a intentarlo.");
      }
      
      throw new Error(`Error de comunicación con la IA (${response.status}).`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (candidate?.finishReason === "SAFETY") {
       throw new Error("La imagen contiene contenido que no puede ser analizado por motivos de seguridad.");
    }

    const content = candidate?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("La IA no pudo procesar esta imagen. Intenta con una captura más clara.");
    }

    const startIndex = content.indexOf("{");
    const endIndex = content.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1) {
      throw new Error("No se pudo extraer información válida de la respuesta.");
    }

    const jsonString = content.substring(startIndex, endIndex + 1);
    const parsed = JSON.parse(jsonString);

    return {
      type: parsed.type || parsed.tipo,
      datos: parsed.datos,
      stats: parsed.stats,
      descripcion: parsed.descripcion,
      descripcionComica: parsed.descripcionComica,
      nombreArma: parsed.nombreArma,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON")) {
       throw new Error("Hubo un error al interpretar los datos del arma. Inténtalo de nuevo.");
    }
    throw error;
  }
}


async function updateJobStatus(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  status: string,
  result?: AnalysisResult | null,
  errorMessage?: string,
  weaponStatsRecordId?: string
): Promise<void> {
  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (result) updateData.result = result;
  if (errorMessage) updateData.error_message = errorMessage;
  if (weaponStatsRecordId) updateData.weapon_stats_record_id = weaponStatsRecordId;

  await supabase
    .from("weapon_analysis_jobs")
    .update(updateData)
    .eq("id", jobId);
}

serve(async (req: Request) => {
  let currentJobId: string | null = null;
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const { jobId } = await req.json();
    currentJobId = jobId;

    if (!jobId) return new Response("jobId is required", { status: 400 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await updateJobStatus(supabase, jobId, "processing");

    const { data: job, error: fetchError } = await supabase
      .from("weapon_analysis_jobs")
      .select("bucket, storage_path, user_id")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) throw new Error("No se encontró la tarea de análisis.");

    const imageData = await downloadImage(supabase, job.bucket, job.storage_path);
    
    // MIME Detection
    const ext = job.storage_path.split(".").pop()?.toLowerCase() || "png";
    const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    const mime = mimeMap[ext] || "image/png";

    // Efficient Base64
    const imageBase64 = btoa(Array.from(imageData).map(b => String.fromCharCode(b)).join(""));

    const result = await analyzeWithGemini(imageBase64, mime, 0, 0);

    const stats = result.datos || result.stats;
    const isStats = result.type === "stats";
    const hasData = stats && Object.values(stats).some(v => typeof v === 'number' && v > 0);

    if (isStats && hasData) {
      // 1. Crear el registro persistente de estadísticas
      console.log(`${LOG_PREFIX} Creando registro en weapon_stats_records`);
      const { data: weaponRecord, error: weaponError } = await supabase
        .from("weapon_stats_records")
        .insert({
          user_id: job.user_id,
          weapon_name: result.nombreArma,
          stats: stats,
          source_image_path: job.storage_path,
        })
        .select("id")
        .single();

      if (weaponError) {
        console.error(`${LOG_PREFIX} Error al crear weapon_stats_records:`, weaponError);
        throw new Error("No se pudo crear el registro de estadísticas finales.");
      }

      // 2. Marcar job como completado y vincular el ID del nuevo registro
      await updateJobStatus(supabase, jobId, "completed", {
        type: "stats",
        stats: stats,
        nombreArma: result.nombreArma
      }, undefined, weaponRecord.id);
    } else {
      const msg = result.descripcionComica || result.descripcion || 
                 (isStats ? "Esa imagen no parece tener estadísticas claras. ¡Muestra el menú de accesorios!" : "No es una captura válida.");
      await updateJobStatus(supabase, jobId, "failed", null, msg);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    const err = error as Error;
    console.error(`${LOG_PREFIX} Critical Error:`, err);
    if (currentJobId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await updateJobStatus(supabase, currentJobId, "failed", null, err.message || "Error inesperado");
      } catch (updateError) {
        console.error(`${LOG_PREFIX} Error al actualizar estado fallido:`, updateError);
      }
    }
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), { status: 500 });
  }
});

