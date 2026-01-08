import { NextResponse } from "next/server";
import type {
  RiotPlatformStatus,
  ServerStatusResponse,
  ServerStatusItem,
  RiotIncident,
  RiotMaintenance,
  RiotLocaleContent,
} from "@/types/riot-status";

// Cache en memoria para evitar llamadas excesivas a la API de Riot
let cachedStatus: ServerStatusResponse | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en ms

// Regiones soportadas de Riot
const RIOT_REGIONS: Record<string, string> = {
  la1: "Latin America North",
  la2: "Latin America South",
  na1: "North America",
  euw1: "Europe West",
  eun1: "Europe Nordic & East",
  kr: "Korea",
  jp1: "Japan",
  br1: "Brazil",
};

// Obtener contenido en español, con fallback a inglés
function getLocalizedContent(
  contents: RiotLocaleContent[],
  preferredLocales: string[] = ["es_MX", "es_AR", "es_ES", "en_US"]
): string {
  for (const locale of preferredLocales) {
    const found = contents.find((c) => c.locale === locale);
    if (found) return found.content;
  }
  // Fallback al primero disponible
  return contents[0]?.content || "";
}

// Transformar incidente de Riot a formato simplificado
function transformIncident(incident: RiotIncident): ServerStatusItem {
  const latestUpdate = incident.updates[0];

  return {
    id: incident.id,
    type: "incident",
    severity: incident.incident_severity || "warning",
    title: getLocalizedContent(incident.titles),
    description: latestUpdate
      ? getLocalizedContent(latestUpdate.translations)
      : "",
    platforms: incident.platforms,
    createdAt: incident.created_at,
    updatedAt: incident.updated_at,
  };
}

// Transformar mantenimiento de Riot a formato simplificado
function transformMaintenance(maintenance: RiotMaintenance): ServerStatusItem {
  const latestUpdate = maintenance.updates[0];

  return {
    id: maintenance.id,
    type: "maintenance",
    severity: "maintenance",
    title: getLocalizedContent(maintenance.titles),
    description: latestUpdate
      ? getLocalizedContent(latestUpdate.translations)
      : "",
    platforms: maintenance.platforms,
    createdAt: maintenance.created_at,
    updatedAt: maintenance.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || "la1";
    const forceRefresh = searchParams.get("refresh") === "true";

    // Verificar cache (solo si no se fuerza refresh y es la misma región)
    const now = Date.now();
    if (
      !forceRefresh &&
      cachedStatus &&
      cachedStatus.region === region &&
      now - cacheTimestamp < CACHE_DURATION
    ) {
      return NextResponse.json(cachedStatus, {
        headers: {
          "X-Cache": "HIT",
          "X-Cache-Age": String(Math.round((now - cacheTimestamp) / 1000)),
        },
      });
    }

    // API Key de Riot (debería estar en variables de entorno en producción)
    const apiKey = process.env.RIOT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Riot API key not configured" },
        { status: 500 }
      );
    }

    // Llamar a la API de Riot
    const riotUrl = `https://${region}.api.riotgames.com/lol/status/v4/platform-data?api_key=${apiKey}`;

    const response = await fetch(riotUrl, {
      headers: {
        Accept: "application/json",
      },
      // No usar cache de Next.js porque tenemos nuestro propio sistema
      cache: "no-store",
    });

    if (!response.ok) {
      // Si Riot devuelve error, devolver cache si existe
      if (cachedStatus) {
        console.warn(
          `Riot API error ${response.status}, returning stale cache`
        );
        return NextResponse.json(cachedStatus, {
          headers: {
            "X-Cache": "STALE",
            "X-Cache-Age": String(Math.round((now - cacheTimestamp) / 1000)),
          },
        });
      }

      return NextResponse.json(
        { error: `Riot API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data: RiotPlatformStatus = await response.json();

    // Transformar a formato simplificado
    const statusResponse: ServerStatusResponse = {
      region: data.id,
      regionName: data.name || RIOT_REGIONS[region.toLowerCase()] || region,
      hasIssues: data.incidents.length > 0 || data.maintenances.length > 0,
      incidents: data.incidents.map(transformIncident),
      maintenances: data.maintenances.map(transformMaintenance),
      lastUpdated: new Date().toISOString(),
    };

    // Actualizar cache local
    cachedStatus = statusResponse;
    cacheTimestamp = now;

    // --- Lógica de Persistencia y Detección de Cambios ---
    try {
      // Usamos import dinámico para evitar problemas de dependencias circulares o contexto
      const { getServiceClient } = await import("@/lib/supabase/service");
      const supabaseAdmin = getServiceClient();

      const settingKey = `riot_server_status_${region}`;

      // 1. Obtener estado anterior
      const { data: settingsData } = await supabaseAdmin
        .from("admin_settings")
        .select("value")
        .eq("key", settingKey)
        .single();

      const previousStatus = settingsData?.value as ServerStatusResponse | null;

      // 2. Comparar estados (simplificado: comparamos IDs de incidentes/mantenimientos)
      const prevIncidentIds =
        previousStatus?.incidents
          .map((i) => i.id)
          .sort()
          .join(",") || "";
      const currIncidentIds =
        statusResponse.incidents
          .map((i) => i.id)
          .sort()
          .join(",") || "";

      const prevMaintIds =
        previousStatus?.maintenances
          .map((m) => m.id)
          .sort()
          .join(",") || "";
      const currMaintIds =
        statusResponse.maintenances
          .map((m) => m.id)
          .sort()
          .join(",") || "";

      const hasChanges =
        prevIncidentIds !== currIncidentIds || prevMaintIds !== currMaintIds;

      if (hasChanges) {
        console.log(
          `[RiotStatus] Detectado cambio de estado en ${region}. Actualizando DB...`
        );

        // 3. Guardar nuevo estado
        const { error: upsertError } = await supabaseAdmin
          .from("admin_settings")
          .upsert({
            key: settingKey,
            value: statusResponse,
            updated_at: new Date().toISOString(),
            updated_by: "system_riot_monitor", // Identificador del sistema
          });

        if (upsertError) {
          console.error(
            "[RiotStatus] Error updating admin_settings:",
            upsertError
          );
        } else {
          // Lógica de notificaciones para usuarios con cuentas vinculadas
          try {
            // 4. Buscar usuarios afectados (con cuenta linkeada en esa región)
            const { data: usersToNotify, error: userError } =
              await supabaseAdmin
                .from("linked_accounts_riot")
                .select("user_id")
                .eq("region", region); // IMPORTANTE: Filtrar por región del servidor
            // Eliminamos duplicados a nivel de aplicación porque SQL 'distinct' puede ser tricky con UUIDs a veces,
            // pero aquí supabase devuelve filas. Haremos un Set en JS.

            if (userError) {
              console.error(
                "[RiotStatus] Error fetching affected users:",
                userError
              );
            } else if (usersToNotify && usersToNotify.length > 0) {
              const uniqueUserIds = Array.from(
                new Set(usersToNotify.map((u) => u.user_id))
              );

              console.log(
                `[RiotStatus] Notificando a ${uniqueUserIds.length} usuarios afectados en región ${region}`
              );

              // Determinar mensaje
              const issueCount =
                statusResponse.incidents.length +
                statusResponse.maintenances.length;
              const prevIssueCount =
                (previousStatus?.incidents.length || 0) +
                (previousStatus?.maintenances.length || 0);

              let title = "";
              let message = "";

              if (issueCount > prevIssueCount) {
                title = "Nuevos problemas en Riot Games";
                message = `Se han detectado ${issueCount} incidentes/mantenimientos en la región ${region.toUpperCase()}.`;
              } else if (issueCount < prevIssueCount) {
                title = "Problemas resueltos en Riot Games";
                message = `Algunos incidentes en ${region.toUpperCase()} han sido resueltos. Estado actual: ${
                  issueCount > 0 ? issueCount + " activos" : "Operativo"
                }.`;
              } else {
                // Cambio de contenido pero no de cantidad (actualización)
                title = "Actualización de estado Riot Games";
                message = `Se ha actualizado la información de estado para la región ${region.toUpperCase()}.`;
              }

              // 5. Insertar notificaciones en batch
              const notificationsToInsert = uniqueUserIds.map((userId) => ({
                user_id: userId,
                type: "info",
                title: title,
                message: message,
                data: {
                  source: "riot_status",
                  region: region,
                  issues: issueCount,
                },
                read: false,
                created_at: new Date().toISOString(),
              }));

              // Supabase permite insert masivo
              const { error: notifyError } = await supabaseAdmin
                .from("notifications")
                .insert(notificationsToInsert);

              if (notifyError) {
                console.error(
                  "[RiotStatus] Error insertando notificaciones:",
                  notifyError
                );
              } else {
                console.log(
                  "[RiotStatus] Notificaciones enviadas correctamente."
                );
              }
            }
          } catch (notifyErr) {
            console.error(
              "[RiotStatus] Excepción en lógica de notificaciones:",
              notifyErr
            );
          }

          console.log("[RiotStatus] Procesamiento de cambios completado.");
        }
      }
    } catch (dbError) {
      // No bloqueamos la respuesta si falla la persistencia (ej: falta service key)
      console.warn(
        "[RiotStatus] No se pudo persistir el estado (probablemente safe ignorable en dev):",
        dbError
      );
    }
    // -----------------------------------------------------

    return NextResponse.json(statusResponse, {
      headers: {
        "X-Cache": "MISS",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching Riot server status:", error);

    // Devolver cache stale si existe
    if (cachedStatus) {
      return NextResponse.json(cachedStatus, {
        headers: {
          "X-Cache": "ERROR",
        },
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch server status" },
      { status: 500 }
    );
  }
}
