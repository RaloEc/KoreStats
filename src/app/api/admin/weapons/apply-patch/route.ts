import { NextRequest, NextResponse } from "next/server";
import { createClient, getServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("perfiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await request.json();
    const { changes } = body;

    if (!changes || !Array.isArray(changes)) {
      return NextResponse.json({ error: "Formato inválido. Se esperaba un arreglo 'changes'." }, { status: 400 });
    }

    const serviceSupabase = getServiceClient();
    let appliedCount = 0;
    const errors: string[] = [];

    // Diccionario de mapeo de estadísticas a columnas en delta_force_weapons_base
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

    const INT_COLUMNS = [
      "base_range", "base_control", "base_handling", 
      "base_stability", "base_accuracy", "base_fire_rate", 
      "base_capacity", "base_muzzle_velocity"
    ];

    // Obtener todas las armas de la base de datos para hacer coincidencia difusa en JS
    const { data: allWeapons, error: allWeaponsErr } = await serviceSupabase
      .from("delta_force_weapons_base")
      .select("id, weapon_name, game_mode");

    if (allWeaponsErr) {
      return NextResponse.json({ error: `Error inicial de base de datos: ${allWeaponsErr.message}` }, { status: 500 });
    }

    // Función para normalizar texto para comparaciones ("AS Val" -> "asval", "AS-VAL" -> "asval")
    const normalize = (str: string) => {
      if (!str) return "";
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remover tildes
        .replace(/[^a-z0-9]/g, ""); // Remover todo lo no alfanumérico (espacios, guiones, etc.)
    };

    for (const item of changes) {
      const weaponNameRaw = item.weapon_name;
      const gameModeRaw = item.game_mode;
      const itemChanges = item.changes;

      if (!weaponNameRaw || !itemChanges) continue;

      // Si el nombre contiene paréntesis o palabras clave de accesorios, asumimos que es una variante/combo con accesorio
      // (ej: "M7 (Combo de cañón...)") y lo omitimos de la base de datos base
      const isVariant = weaponNameRaw.includes("(") || 
                        weaponNameRaw.includes(")") || 
                        weaponNameRaw.toLowerCase().includes("combo") || 
                        weaponNameRaw.toLowerCase().includes("cañón");
      if (isVariant) {
         continue;
      }

      // Normalizar nombre extraído directamente para buscar coincidencia exacta
      const normalizedExtractedName = normalize(weaponNameRaw);

      // Determinar los game_modes a afectar
      let modesToUpdate: string[] = [];
      if (gameModeRaw === "Operación: Extracción") {
        modesToUpdate = ["operations"];
      } else if (gameModeRaw === "Conflicto Bélico") {
        modesToUpdate = ["warfare"];
      } else if (gameModeRaw === "Global" || gameModeRaw === "Ambos") {
        modesToUpdate = ["operations", "warfare"];
      } else {
        modesToUpdate = ["operations", "warfare"]; // Fallback a ambos
      }

      // Preparar el objeto de actualización basado en las estadísticas mapeables
      const updateData: Record<string, any> = {};

      for (const change of itemChanges) {
        const columnName = STAT_MAP[change.stat];
        if (columnName) {
            let newValue: any = change.new_value;
            
            // Limpiar valores no numéricos si es una columna INT
            if (INT_COLUMNS.includes(columnName)) {
                // Eliminar todo lo que no sea número
                const parsedInt = parseInt(String(newValue).replace(/[^0-9-]/g, ""), 10);
                if (!isNaN(parsedInt)) {
                    updateData[columnName] = parsedInt;
                } else {
                    // Si no se pudo parsear a int y es columna int, lo omitimos para no dar error de bd
                    errors.push(`No se pudo actualizar ${change.stat} en ${weaponNameRaw} porque no es un número válido (${newValue})`);
                    continue;
                }
            } else {
               updateData[columnName] = newValue;
            }
        }
      }

      if (Object.keys(updateData).length === 0) {
        continue; // No hay columnas válidas para actualizar
      }

      // Buscar coincidencia en la lista que tenemos de la BD
      const weaponsFound = allWeapons.filter(w => {
        const isModeMatch = modesToUpdate.includes(w.game_mode);
        const isNameMatch = normalize(w.weapon_name) === normalizedExtractedName;
        return isModeMatch && isNameMatch;
      });

      if (weaponsFound && weaponsFound.length > 0) {
        // Actualizar cada registro encontrado
        for (const w of weaponsFound) {
          const { error: updateError } = await serviceSupabase
            .from("delta_force_weapons_base")
            .update(updateData)
            .eq("id", w.id);
            
          if (updateError) {
             errors.push(`Error actualizando ${w.weapon_name} (${w.game_mode}): ${updateError.message}`);
          } else {
             appliedCount++;
          }
        }
      } else {
          errors.push(`No se encontró el arma '${weaponNameRaw}' para el modo '${gameModeRaw}'`);
      }
    }

    return NextResponse.json({ 
        success: true, 
        message: `Se actualizaron ${appliedCount} registros.`,
        errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error("Error applying patch:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
