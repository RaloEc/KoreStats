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

  useEffect(() => {
    const targetPuuid = userPuuid || null;

    if (!targetPuuid && !riotId) {
      setGameData(null);
      setIsConnected(false);
      return;
    }

    let activeChannel: any = null;

    const fetchAndSubscribe = async () => {
      setIsLoading(true);

      // --- 1. CARGA INICIAL (SNAPSHOT DB) ---
      let dbId = targetPuuid ? `live-${targetPuuid}` : null;
      let availablePuuid = targetPuuid;

      // Si no tenemos PUUID, intentamos buscar el ID row por RiotID (Fallback)
      if (!dbId && riotId) {
        const { data: searchData } = await supabase
          .from("live_game_states")
          .select("id, data")
          .contains("data", { livePlayers: [{ riotId: riotId }] })
          .limit(1)
          .maybeSingle();

        if (searchData) {
          dbId = searchData.id;
          availablePuuid = searchData.id.replace("live-", "");
          if (searchData.data) {
            // Normalizar datos iniciales (cs -> creepScore si es necesario)
            const normalizedData = normalizeGameData(searchData.data as any);
            setGameData(normalizedData);
            setIsConnected(true);
          }
        }
      } else if (dbId) {
        const { data } = await supabase
          .from("live_game_states")
          .select("data")
          .eq("id", dbId)
          .maybeSingle();

        if (data?.data) {
          const normalizedData = normalizeGameData(data.data as any);
          setGameData(normalizedData);
          setIsConnected(true);
        }
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
  }, [userPuuid, riotId]);

  return { gameData, isConnected, isLoading };
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
