import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// --- NUEVAS INTERFACES OPTIMIZADAS (DIET PLAN) ---

export interface MinifiedPlayer {
  teamId: number; // 100 | 200
  summonerName: string;
  riotId?: string;
  championId: number;
  championName: string;
  position: string; // "TOP", "JUNGLE", etc.

  // Runas Simplificadas
  perks?: {
    perkIds: number[]; // [8005, ...] -> Solo ids numéricos. [0] es Keystone
    perkSubStyle: number; // 8100
  };

  // Estado Vivo
  level: number;
  currentGold: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number; // Creep Score (Corregido a "cs" según app local, mapeado a "creepScore" si es legacy)
  wardScore: number;
  respawnTimer: number;
  isDead: boolean;
  items: number[]; // Array plano de IDs: [1055, 3006, ...]

  // Compatibilidad Legacy
  creepScore?: number; // Para mantener compatibilidad con componentes que buscan .creepScore
  puuid?: string;
  summonerSpells?: any;
}

export interface LiveGameDataLCU {
  phase: string;
  gameData: {
    gameMode: string;
    gameTime: number;
    mapNumber: number;
    mapName?: string;
    mapTerrain?: string;
  };
  livePlayers: MinifiedPlayer[]; // Usamos la versión minificada
  isApiFallback?: boolean;
  liveData?: { gameData?: any; allPlayers?: any[] }; // Legacy
}

// Alias para mantener compatibilidad
export type LivePlayerLCU = MinifiedPlayer;

export const useLiveGameRealtime = (
  userPuuid?: string | null,
  riotId?: string | null,
  userId?: string | undefined,
) => {
  const [gameData, setGameData] = useState<LiveGameDataLCU | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const targetPuuid = userPuuid || null;

    if (!targetPuuid && !riotId && !userId) {
      setGameData(null);
      setIsConnected(false);
      return;
    }

    let activeChannel: any = null;

    const fetchAndSubscribe = async () => {
      setIsLoading(true);

      // 1. CARGA INICIAL (SNAPSHOT DB) ---
      let dbId = targetPuuid ? `live-${targetPuuid}` : null;
      let availablePuuid = targetPuuid;
      let foundData = null;

      // 0. Si no tenemos PUUID pero si userId, buscamos PUUID
      if (!availablePuuid && !riotId && userId) {
        const { data: acc, error: accError } = await supabase
          .from("linked_accounts_riot")
          .select("puuid")
          .eq("user_id", userId)
          .maybeSingle();

        if (accError) {
          console.error("Error fetching linked account:", accError);
        }

        if (acc?.puuid) {
          availablePuuid = acc.puuid;
          dbId = `live-${availablePuuid}`;
        }
      }

      // --- ESTRATEGIA DE BÚSQUEDA ---

      // A. Intento Directo (El jugador es el informador)
      if (dbId) {
        const { data, error } = await supabase
          .from("live_game_states")
          .select("id, data")
          .eq("id", dbId)
          .maybeSingle();

        if (data?.data) {
          foundData = { id: data.id, data: data.data };
        }
      }

      // B. Intento por PUUID en livePlayers (El jugador está en la partida de otro)
      if (!foundData && availablePuuid) {
        const { data: searchData, error: searchError } = await supabase
          .from("live_game_states")
          .select("id, data")
          .contains("data", { livePlayers: [{ puuid: availablePuuid }] })
          .limit(1)
          .maybeSingle();

        if (searchData?.data) {
          foundData = { id: searchData.id, data: searchData.data };
        }
      }

      // C. Intento por RiotID en livePlayers (Fallback)
      if (!foundData && riotId) {
        const { data: searchData, error: searchError } = await supabase
          .from("live_game_states")
          .select("id, data")
          .contains("data", { livePlayers: [{ riotId: riotId }] })
          .limit(1)
          .maybeSingle();

        if (searchData?.data) {
          foundData = { id: searchData.id, data: searchData.data };
        }
      }

      // Si encontramos algo, aplicamos
      if (foundData) {
        const reporterId = foundData.id;
        availablePuuid = reporterId.replace("live-", "");

        const normalizedData = normalizeGameData(foundData.data as any);
        setGameData(normalizedData);
        setIsConnected(true);
      }

      setIsLoading(false);

      // --- 2. SUSCRIPCIÓN HÍBRIDA (Broadcast + Persistence) ---
      if (availablePuuid) {
        const channelName = `live-status-${availablePuuid}`;
        const dbFilter = `id=eq.live-${availablePuuid}`;

        // console.log("🔌 Conectando a canal realtime:", channelName);

        activeChannel = supabase
          .channel(channelName)
          .on("broadcast", { event: "game-update" }, (payload) => {
            // Recibimos update rápido (1s)
            if (payload.payload) {
              // Normalizar al vuelo
              const normalized = normalizeGameData(payload.payload as any);
              setGameData(normalized);
              setIsConnected(true);
              setLastUpdateTime(Date.now());
              setIsStale(false);
            }
          })
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "live_game_states",
              filter: dbFilter,
            },
            (payload: any) => {
              // Recibimos persistencia (Backup)
              if (payload.new?.data) {
                const normalized = normalizeGameData(payload.new.data as any);
                setGameData(normalized);
                setIsConnected(true);
                setLastUpdateTime(Date.now());
                setIsStale(false);
              }
            },
          )
          .subscribe((status) => {
            // console.log("Status suscripción:", status);
            if (status === "SUBSCRIBED") setIsConnected(true);
          });
      }
    };

    fetchAndSubscribe();

    return () => {
      if (activeChannel) supabase.removeChannel(activeChannel);
      setIsConnected(false);
    };
  }, [userPuuid, riotId, userId]);

  // Efecto para detectar datos estancados (sin actualización en 30 segundos)
  useEffect(() => {
    if (!gameData) {
      setIsStale(false);
      return;
    }

    const STALE_THRESHOLD = 30000; // 30 segundos sin updates = marcar como stale
    const CLEANUP_THRESHOLD = 300000; // 5 minutos sin updates = limpiar (partida probablemente terminada)

    const checkInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTime;

      if (timeSinceLastUpdate > CLEANUP_THRESHOLD) {
        // Si han pasado más de 5 minutos sin actualizaciones, asumir que la partida terminó
        console.warn(
          `🧹 Limpiando datos de partida obsoletos (${Math.round(timeSinceLastUpdate / 1000)}s sin actualización)`,
        );
        setGameData(null);
        setIsStale(false);
        setIsConnected(false);
      } else if (timeSinceLastUpdate > STALE_THRESHOLD) {
        setIsStale(true);
        console.warn(
          `⚠️ Datos de partida en vivo estancados (${Math.round(timeSinceLastUpdate / 1000)}s sin actualización)`,
        );
      }
    }, 5000); // Verificar cada 5 segundos

    return () => clearInterval(checkInterval);
  }, [gameData, lastUpdateTime]);

  return { gameData, isConnected, isLoading, isStale, lastUpdateTime };
};

// Helper para asegurar que .creepScore siempre exista (UI legacy lo usa)
// y que cs (nuevo formato) también.
function normalizeGameData(data: LiveGameDataLCU): LiveGameDataLCU {
  if (!data || !data.livePlayers) return data;

  const updatedPlayers = data.livePlayers.map((p) => {
    // Si viene 'cs' pero no 'creepScore', llenamos creepScore
    // Si viene 'creepScore' pero no 'cs', llenamos cs
    const val = p.cs ?? p.creepScore ?? 0;
    return {
      ...p,
      cs: val,
      creepScore: val,
    };
  });

  return {
    ...data,
    livePlayers: updatedPlayers,
  };
}
