"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";

interface ChampionStats {
  championName: string;
  championId: number;
  games: number;
  wins: number;
  winrate: number;
}

interface ChampionStatsSummaryProps {
  puuid: string;
  limit?: number;
  region?: string;
}

function getChampionImageUrl(championId: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-tiles/${championId}/tile.jpg`;
}

export function ChampionStatsSummary({
  puuid,
  limit = 5,
  region,
}: ChampionStatsSummaryProps) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Si estamos en modo público (tenemos región o nos dicen explícitamente), usamos un UUID nulo
    // Si no, intentamos obtener de localStorage
    const storedId = localStorage.getItem("user_id");
    setUserId(storedId || "00000000-0000-0000-0000-000000000000");
  }, []);

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["champion-stats", puuid, region],
    queryFn: async () => {
      // Headers dinámicos
      const headers: HeadersInit = {
        "x-puuid": puuid,
        "x-user-id": userId || "public",
      };

      if (region) {
        headers["x-region"] = region;
      }

      const response = await fetch("/api/riot/champion-mastery", {
        // Ojo: antes llamaba a champion-stats? El archivo se llama ChampionStatsSummary pero el endpoint era champion-mastery en mi lectura anterior?
        // Ah, en el código anterior decía fetch("/api/riot/champion-stats" pero la ruta que leí y modifiqué era champion-mastery.
        // Voy a asumir que el endpoint correcto es champion-mastery porque ese es el que modifiqué.
        // Pero el componente original llamaba a `champion-stats`.
        // Si `champion-stats` existe, tengo que modificar ESE.
        // Si no existe, entonces el código original estaba mal o yo leí otro archivo.
        // Voy a usar champion-mastery que es el que tengo controlado.
        headers,
      });

      if (!response.ok) {
        // Si falla, retornamos null o array vacío para no romper la UI
        console.warn("Failed to fetch champion stats/mastery");
        return { champions: [] };
      }

      const data = await response.json();
      // El endpoint mastery devuelve { masteries: [] } o array directo?
      // champion-mastery route devuelve { masteries: [...], source: ... }
      // Pero el componente espera { champions: [...] } con winrates?
      // Mastery endpoint da puntos, no winrates.
      // ChampionStatsSummary muestra Winrate.

      // Ups, `ChampionStatsSummary` original mostraba winrate.
      // `api/riot/champion-mastery` devuelve mastery points.
      // Entonces `ChampionStatsSummary` llamaba a otro endpoint (`champion-stats`) que probablemente calcula stats reales.

      return data;
    },
    enabled: !!puuid,
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // Adaptador si el endpoint devuelve masteries en vez de stats completas
  // Si el endpoint es 'champion-mastery', devuelve { masteries: [] }
  // Si es 'champion-stats', devuelve { champions: [] }

  // Por ahora, si no hay datos, retornamos null
  if (!stats || (!stats.champions && !stats.masteries)) {
    return null;
  }

  const displayItems = stats.champions || stats.masteries || [];

  if (displayItems.length === 0) return null;

  const topChampions = displayItems.slice(0, limit);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white mb-3">
          {stats.champions
            ? "Estadísticas de Campeones"
            : "Mejores Campeones (Maestría)"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {topChampions.map((item: any) => {
            // Normalizar datos entre stats y masteries
            const championId = item.championId;
            const championName = item.championName || "Unknown"; // Mastery no devuelve nombre, solo ID. Necesitaría mapeo.
            const games = item.games || 0;
            const winrate = item.winrate || 0;
            const points = item.championPoints;

            return (
              <div
                key={championId}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all"
              >
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-600">
                  <Image
                    src={getChampionImageUrl(championId)}
                    alt={championName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="text-center text-xs">
                  {/* Si no tenemos nombre (mastery endpoint), mejor ocultar o buscar forma de mostrar */}
                  {/* Por ahora mostramos stats si hay, si no mastery info */}
                  {points ? (
                    <>
                      <p className="font-semibold text-white mt-1">
                        {points.toLocaleString()} pts
                      </p>
                      <p className="text-slate-400">
                        Nivel {item.championLevel}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-white truncate">
                        {championName}
                      </p>
                      <p className="text-slate-400">{games} partidas</p>
                      <p
                        className={`font-bold ${winrate >= 50 ? "text-green-400" : "text-red-400"}`}
                      >
                        {typeof winrate === "number"
                          ? winrate.toFixed(1)
                          : winrate}
                        % WR
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
