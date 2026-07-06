import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServiceClient } from '@/lib/supabase/server';

// Asegurarse de que exista la variable de entorno
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const STAT_MAP: Record<string, string> = {
  "Daño": "base_damage",
  "Perforación de blindaje": "base_armor_penetration",
  "Alcance": "base_range",
  "Control": "base_control",
  "Manejo": "base_handling",
  "Estabilidad": "base_stability",
  "Precisión": "base_accuracy",
  "Cadencia": "base_fire_rate",
  "Capacidad": "base_capacity",
  "Velocidad de boca": "base_muzzle_velocity",
};

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Falta el texto de las notas del parche' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
       return NextResponse.json({ error: 'La API key de Gemini no está configurada' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `**Rol:** Eres un agente de extracción de datos automatizado, especializado en parsear notas de parche de Delta Force. 

**Tarea:** Recibirás texto plano correspondiente a notas de actualización oficiales. Tu objetivo es analizar el texto, ignorar cualquier cambio relacionado con agentes (operadores), optimizaciones, corrección de errores o mapas, y extraer ÚNICAMENTE los ajustes de equilibrio de las armas.

**Reglas de Extracción:**
1. Ignora por completo cualquier mención a agentes (ej. Morse, Toxik, Gizmo).
2. Agrupa los cambios por el modo de juego indicado en el texto (ej. "Operación: Extracción", "Conflicto Bélico"). Si un cambio aplica a todos los modos, usa "Global".
3. Limpia los nombres de las armas eliminando texto innecesario (ej. "Fusil de asalto AS Val" -> "AS Val").
4. Evalúa la dirección del cambio y asigna el valor "trend" estrictamente como: "up" (mejora/buff/↑), "down" (debilitamiento/nerf/↓) o "neutral" (cambio de mecánica).
5. Mantén los valores antiguos y nuevos exactamente como aparecen.

**Formato de Salida:**
Tu respuesta debe ser ÚNICA y EXCLUSIVAMENTE un arreglo JSON válido. No incluyas texto introductorio, saludos, explicaciones, ni bloques de código markdown (como \`\`\`json). El output debe ser parseable directamente por JSON.parse() en un entorno de producción.

**Esquema JSON Requerido:**
[
  {
    "game_mode": "string",
    "weapon_name": "string",
    "changes": [
      {
        "stat": "string (ej: Daño, Caída de alcance)",
        "old_value": "string",
        "new_value": "string",
        "trend": "string (up|down|neutral)"
      }
    ]
  }
]

**Texto a analizar:**
${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let textResponse = response.text();
    
    // Limpiar posibles bloques de markdown en caso de que el modelo los incluya
    if (textResponse.startsWith('\`\`\`json')) {
      textResponse = textResponse.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '');
    } else if (textResponse.startsWith('\`\`\`')) {
      textResponse = textResponse.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '');
    }

    const trimmedResponse = textResponse.trim();
    let parsedJson: any[] = [];
    try {
      parsedJson = JSON.parse(trimmedResponse);
    } catch (e) {
      // Si no es un JSON válido, retornamos el error de parseo directamente
      return NextResponse.json({ result: trimmedResponse, error: "La IA no devolvió un JSON parseable directamente." });
    }

    // Si pudimos parsear, intentamos cruzar con la Base de Datos para obtener los valores actuales
    try {
      const serviceSupabase = getServiceClient();
      const { data: allWeapons } = await serviceSupabase
        .from("delta_force_weapons_base")
        .select("*");

      if (allWeapons && allWeapons.length > 0) {
        // Función para normalizar texto para comparación
        const normalize = (str: string) => {
          if (!str) return "";
          return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");
        };

        for (const item of parsedJson) {
          const weaponNameRaw = item.weapon_name;
          const gameModeRaw = item.game_mode;
          if (!weaponNameRaw || !item.changes) continue;

          const normalizedName = normalize(weaponNameRaw);
          let modes: string[] = [];
          if (gameModeRaw === "Operación: Extracción") {
            modes = ["operations"];
          } else if (gameModeRaw === "Conflicto Bélico") {
            modes = ["warfare"];
          } else {
            modes = ["operations", "warfare"];
          }

          // Buscar el registro en la base de datos
          const dbWeapon = allWeapons.find(w => 
            normalize(w.weapon_name) === normalizedName && 
            modes.includes(w.game_mode)
          );

          if (dbWeapon) {
            for (const change of item.changes) {
              const dbColumn = STAT_MAP[change.stat];
              if (dbColumn && dbWeapon[dbColumn] !== undefined) {
                change.db_value = String(dbWeapon[dbColumn]);
              }
            }
          }
        }
      }
    } catch (dbErr) {
      console.error("Error al buscar valores actuales en la base de datos:", dbErr);
      // No bloqueamos el flujo principal si falla la base de datos, solo seguimos sin los valores actuales
    }

    return NextResponse.json({ 
      result: JSON.stringify(parsedJson, null, 2),
      parsed: parsedJson 
    });
  } catch (error: any) {
    console.error('Error al procesar las notas del parche:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
