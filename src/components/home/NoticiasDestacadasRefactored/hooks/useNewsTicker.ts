import { useState, useEffect } from "react";
import { TickerMessage } from "../types";
import { MENSAJES_TICKER_DEFAULT, MENSAJES_TICKER_ERROR } from "../constants";
import type {
  ServerStatusResponse,
  ServerStatusItem,
} from "@/types/riot-status";

interface IncidentHistoryItem {
  title: string;
  resolvedAt: number | null;
  lastSeen: number;
}

export function useNewsTicker() {
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. Fetch Noticias Ticker y Riot Status en paralelo
        const [tickerRes, riotRes] = await Promise.allSettled([
          fetch("/api/admin/news-ticker"),
          fetch("/api/riot/server-status?region=la1"),
        ]);

        let finalMessages: TickerMessage[] = [];

        // --- Procesar Noticias DB ---
        if (tickerRes.status === "fulfilled" && tickerRes.value.ok) {
          const data = await tickerRes.value.json();
          const activeMessages = data
            .filter((msg: any) => msg.activo && msg.mensaje?.trim())
            .sort((a: any, b: any) => a.orden - b.orden);

          finalMessages = [...activeMessages];
        } else {
          // Si falla DB, usar defaults solo si no hay nada más
          console.warn("Fallo carga de ticker DB");
        }

        // --- Procesar Riot Status ---
        if (riotRes.status === "fulfilled" && riotRes.value.ok) {
          const riotData: ServerStatusResponse = await riotRes.value.json();
          const riotMessages: TickerMessage[] = [];

          // Incidentes activos (Critical & Warning & Maintenance)
          const activeIncidents = [
            ...riotData.incidents,
            ...riotData.maintenances,
          ];

          activeIncidents.forEach((incident) => {
            const prefix =
              incident.severity === "maintenance"
                ? "🔧 MANTENIMIENTO"
                : "⚠️ RIOT ERROR";
            riotMessages.push({
              id: `riot-${incident.id}`,
              mensaje: `${prefix} - ${incident.title}`,
              activo: true,
              orden: -5, // Mostrar primero
            });
          });

          // --- Lógica de Historial (Solucionados) ---
          try {
            const HISTORY_KEY = "riot_incident_history_v1";
            const TWO_HOURS = 2 * 60 * 60 * 1000;
            const now = Date.now();

            const rawHistory = localStorage.getItem(HISTORY_KEY);
            const history: Record<string, IncidentHistoryItem> = rawHistory
              ? JSON.parse(rawHistory)
              : {};
            const currentIds = new Set(
              activeIncidents.map((i) => i.id.toString())
            );
            const newHistory: Record<string, IncidentHistoryItem> = {};

            // A. Registrar activos actuales
            activeIncidents.forEach((inc) => {
              newHistory[inc.id] = {
                title: inc.title,
                resolvedAt: null,
                lastSeen: now,
              };
            });

            // B. Procesar historial previo
            Object.entries(history).forEach(([id, item]) => {
              // Si ya existe en newHistory (sigue activo), no hacer nada (ya se actualizó arriba)
              if (newHistory[id]) return;

              // Si no está activo ahora, verificar si estaba activo antes
              let resolvedAt = item.resolvedAt;

              if (!resolvedAt) {
                // Acaba de resolverse (estaba activo la ultima vez, ahora no)
                resolvedAt = now;
              }

              // Si fue resuelto hace menos de 2 horas, mostrar mensaje y mantener en history
              if (now - resolvedAt < TWO_HOURS) {
                riotMessages.push({
                  id: `riot-resolved-${id}`,
                  mensaje: `✅ RIOT SOLUCIONADO - ${item.title}`,
                  activo: true,
                  orden: -4, // Después de los errores activos
                });

                newHistory[id] = {
                  ...item,
                  resolvedAt,
                };
              }
              // Si > 2 horas, no se añade a newHistory (se borra)
            });

            localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
          } catch (e) {
            console.error("Error procesando historial Riot:", e);
          }

          finalMessages = [...riotMessages, ...finalMessages];
        }

        // Fallback si no hay nada
        if (finalMessages.length === 0) {
          finalMessages = MENSAJES_TICKER_DEFAULT;
        }

        setMessages(finalMessages);
      } catch (error) {
        console.error("Error global ticker:", error);
        setMessages(MENSAJES_TICKER_ERROR);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { messages, isLoading };
}
