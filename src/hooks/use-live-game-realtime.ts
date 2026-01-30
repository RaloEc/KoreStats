import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Usamos el cliente compartido para evitar múltiples instancias
const supabase = createClient();

export interface LivePlayerLCU {
  championName: string;
  isBot?: boolean;
  isDead: boolean;
  items: number[];
  level: number;
  position: string;
  respawnTimer: number;
  summonerName: string;
  riotId?: string;
  profileIconId?: number;

  // Stats (Now flat in DB)
  kills: number;
  deaths: number;
  assists: number;
  creepScore: number;
  wardScore: number;
  currentGold?: number;
  totalGold?: number;

  // Identifiers
  championId?: number;
  puuid?: string;

  // Team (Now teamId in DB)
  teamId: number; // 100 = Blue, 200 = Red

  // Legacy fields (optional, might be missing)
  rawChampionName?: string;
  runes?: {
    keystone: { id: number; displayName: string; rawDescription: string };
    primaryRuneTree: {
      id: number;
      displayName: string;
      rawDescription: string;
    };
    secondaryRuneTree: {
      id: number;
      displayName: string;
      rawDescription: string;
    };
  };
  scores?: {
    assists: number;
    creepScore: number;
    deaths: number;
    kills: number;
    wardScore: number;
  };
  screenPosition?: string;
  skinName?: string;
  skinID?: number;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerSpells?: {
    summonerSpellOne: {
      displayName: string;
      rawDescription: string;
      rawDisplayName: string;
    };
    summonerSpellTwo: {
      displayName: string;
      rawDescription: string;
      rawDisplayName: string;
    };
  };
  team?: "ORDER" | "CHAOS";
}

export interface LiveGameDataLCU {
  // Estructura anidada desde liveData (ruta real en Supabase)
  liveData?: {
    gameData?: {
      gameMode: string;
      gameTime: number;
      mapName: string;
      mapNumber: number;
      mapTerrain: string;
    };
    allPlayers?: any[];
    events?: any;
  };
  // Estructura plana (fallback/legacy)
  gameData?: {
    gameMode: string;
    gameTime: number;
    mapName: string;
    mapNumber: number;
    mapTerrain: string;
  };
  livePlayers: LivePlayerLCU[];
  phase: string; // "InProgress", "ChampSelect", etc.
  isApiFallback?: boolean; // Flag to indicate data comes from Riot API fallback
}

export const useLiveGameRealtime = (
  userPuuid?: string | null,
  riotId?: string | null,
  userId?: string | undefined, // Added parameter for API fallback
) => {
  const [gameData, setGameData] = useState<LiveGameDataLCU | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!userPuuid && !riotId) {
      setGameData(null);
      setIsConnected(false);
      setIsLoading(false);
      return;
    }

    const cleanPuuid = userPuuid ? userPuuid.trim() : null;
    const cleanRiotId = riotId ? riotId.trim() : null;

    // 1. Cargar el estado inicial
    const fetchInitialState = async () => {
      setIsLoading(true);
      try {
        let targetId = cleanPuuid ? `live-${cleanPuuid}` : null;
        let foundData: LiveGameDataLCU | null = null;
        let foundSubscriptionId: string | null = null;

        // --- INTENTO 1: SUPABASE DIRECTO ---
        if (targetId) {
          const { data } = await supabase
            .from("live_game_states")
            .select("id, data")
            .eq("id", targetId)
            .single();

          if (data?.data) {
            foundData = data.data as LiveGameDataLCU;
            foundSubscriptionId = data.id;
          }
        }

        if (!foundData && cleanRiotId) {
          const { data: searchData } = await supabase
            .from("live_game_states")
            .select("id, data")
            .contains("data", {
              livePlayers: [{ riotId: cleanRiotId }],
            })
            .limit(1)
            .maybeSingle();

          if (searchData?.data) {
            foundData = searchData.data as LiveGameDataLCU;
            foundSubscriptionId = searchData.id;
          }
        }

        // --- INTENTO 2: API RIOT (FALLBACK) ---
        // Si no tenemos datos de Supabase y tenemos userId, consultamos la API de Riot
        if (!foundData && userId) {
          try {
            const apiRes = await fetch(
              `/api/riot/matches/active?userId=${encodeURIComponent(userId)}`,
            );
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              if (apiData.hasActiveMatch && apiData.teams) {
                // Convertir respuesta de API a formato LCU
                const convertParticipant = (
                  p: any,
                  teamId: number,
                ): LivePlayerLCU => ({
                  championName: p.championName || "Unknown",
                  isBot: false,
                  isDead: false,
                  items: [],
                  level: 0,
                  position: p.position || "NONE",
                  respawnTimer: 0,
                  summonerName: p.summonerName || "Unknown",
                  riotId: p.riotId || "",
                  puuid: p.puuid,
                  championId: p.championId,
                  teamId: teamId,
                  // Stats simulados (vacíos)
                  kills: 0,
                  deaths: 0,
                  assists: 0,
                  creepScore: 0,
                  wardScore: 0,
                  // Runas (si vienen)
                  runes: p.perks
                    ? {
                        keystone: {
                          id: p.perks.perkIds[0] || 0,
                          displayName: "",
                          rawDescription: "",
                        },
                        primaryRuneTree: {
                          id: p.perks.perkStyle || 0,
                          displayName: "",
                          rawDescription: "",
                        },
                        secondaryRuneTree: {
                          id: p.perks.perkSubStyle || 0,
                          displayName: "",
                          rawDescription: "",
                        },
                      }
                    : undefined,
                  // Hechizos
                  summonerSpells: {
                    summonerSpellOne: {
                      displayName: "",
                      rawDescription: "",
                      rawDisplayName: "",
                    }, // TODO: Mapear IDs si es necesario, pero ActiveMatchCard usa IDs
                    summonerSpellTwo: {
                      displayName: "",
                      rawDescription: "",
                      rawDisplayName: "",
                    },
                  },
                });

                const team100 = (apiData.teams.team100 || []).map((p: any) =>
                  convertParticipant(p, 100),
                );
                const team200 = (apiData.teams.team200 || []).map((p: any) =>
                  convertParticipant(p, 200),
                );

                foundData = {
                  phase: "InProgress",
                  isApiFallback: true,
                  gameData: {
                    gameMode: apiData.gameMode || "CLASSIC",
                    gameTime: apiData.elapsedSeconds || 0,
                    mapName: "",
                    mapNumber: apiData.mapId || 11,
                    mapTerrain: "",
                  },
                  livePlayers: [...team100, ...team200],
                  // Agregamos estructura liveData anidada para compatibilidad máxima
                  liveData: {
                    gameData: {
                      gameMode: apiData.gameMode || "CLASSIC",
                      gameTime: apiData.elapsedSeconds || 0,
                      mapName: "",
                      mapNumber: apiData.mapId || 11,
                      mapTerrain: "",
                    },
                    allPlayers: [...team100, ...team200].map((p) => ({
                      ...p,
                      team: p.teamId === 100 ? "ORDER" : "CHAOS",
                    })),
                  },
                };
              }
            }
          } catch (apiErr) {
            console.warn("Error fetching Riot API active match:", apiErr);
          }
        }

        if (foundData) {
          setGameData(foundData);
          if (foundSubscriptionId) {
            setActiveSubscriptionId(foundSubscriptionId);
          }
        } else {
          setGameData(null);
        }
      } catch (err) {
        console.error("Error fetching initial live game state:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Polling si no se encontró partida inicial: Reintentar cada 30s
    // Usamos un intervalo simple que no depende del estado 'gameData' para evitar loops
    // pero verificamos si YA tenemos datos antes de volver a fetchear agresivamente?
    // Mejor estrategia: Un intervalo fijo que siempre verifica si la data está "stale" o si no hay.

    // Simplemente ejecutamos el fetch inicial y seteamos el intervalo.
    // Si ya hay suscripción realtime, el fetch inicial puede ser redundante pero seguro.
    fetchInitialState();

    const intervalId = setInterval(fetchInitialState, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [userPuuid, riotId, userId]); // gameData ELIMINADO de dependencias

  // 2. Suscribirse a cambios en tiempo real (solo si tenemos subscription ID de Supabase)
  useEffect(() => {
    if (!activeSubscriptionId) return;

    const channel = supabase
      .channel(`live-game-tracking-${activeSubscriptionId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT y UPDATE
          schema: "public",
          table: "live_game_states",
          filter: `id=eq.${activeSubscriptionId}`,
        },
        (payload) => {
          if (payload.new && "data" in payload.new) {
            setGameData(payload.new.data as LiveGameDataLCU);
          }
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [activeSubscriptionId]);

  return { gameData, isConnected, isLoading };
};
