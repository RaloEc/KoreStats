"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, Trophy } from "lucide-react";
import { formatDuration } from "@/components/riot/match-card/helpers";

const CHAMPION_NAME_FIXES: Record<string, string> = {
  "Xin Zhao": "XinZhao",
  "Dr. Mundo": "DrMundo",
  "Lee Sin": "LeeSin",
  "Master Yi": "MasterYi",
  "Maestro Yi": "MasterYi",
  "Jarvan IV": "JarvanIV",
  "Miss Fortune": "MissFortune",
  "Tahm Kench": "TahmKench",
  "Twisted Fate": "TwistedFate",
  "Aurelion Sol": "AurelionSol",
  "Kog'Maw": "KogMaw",
  "Rek'Sai": "RekSai",
  "Vel'Koz": "Velkoz",
  "Kha'Zix": "Khazix",
  "Cho'Gath": "Chogath",
  "Kai'Sa": "Kaisa",
  LeBlanc: "Leblanc",
  "Bel'Veth": "Belveth",
  "K'Sante": "KSante",
  "Nunu & Willump": "Nunu",
  "Nunu y Willump": "Nunu",
  "Renata Glasc": "Renata",
  FiddleSticks: "Fiddlesticks",
  Wukong: "MonkeyKing",
};

const QUEUE_LABELS: Record<string, string> = {
  "Solo/Dúo": "SoloQ",
  "Flex 5:5": "Flex",
  ARAM: "ARAM",
  Normal: "Normal",
  URF: "URF",
  "Uno para todos": "UPT",
  Arena: "Arena",
};

interface LiveGameBannerProps {
  championName?: string | null;
  championId?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  queueName?: string | null;
  gameDuration?: number; // en segundos
  teamScore?: { blue: number; red: number };
  teamId?: 100 | 200;
  phase?: string;
  isStale?: boolean; // Indica si los datos están desactualizados
  isApiFallback?: boolean; // Indica si los datos vienen de la API de Riot (sin stats en vivo)
}

export function LiveGameBanner({
  championName,
  championId,
  kills = 0,
  deaths = 0,
  assists = 0,
  queueName,
  gameDuration,
  teamScore,
  teamId,
  phase = "InProgress",
  isStale = false,
  isApiFallback = false,
}: LiveGameBannerProps) {
  // Normalizar nombre del campeón
  const fixedChampionName = championName
    ? CHAMPION_NAME_FIXES[championName] || championName
    : null;

  // Obtener imagen del campeón
  const championImg = fixedChampionName
    ? `https://cdn.communitydragon.org/latest/champion/${fixedChampionName}/square`
    : championId
      ? `https://cdn.communitydragon.org/latest/champion/${championId}/square`
      : null;

  // Formatear nombre de la cola
  const displayQueue = queueName
    ? QUEUE_LABELS[queueName] || queueName.split(" ").slice(0, 2).join(" ")
    : "En partida";

  // Calcular KDA
  const kda =
    deaths === 0 ? kills + assists : ((kills + assists) / deaths).toFixed(2);

  // Determinar color del KDA
  const kdaColor =
    parseFloat(kda.toString()) >= 3
      ? "text-emerald-600 dark:text-emerald-400"
      : parseFloat(kda.toString()) >= 2
        ? "text-blue-600 dark:text-blue-400"
        : parseFloat(kda.toString()) >= 1
          ? "text-slate-600 dark:text-slate-400"
          : "text-rose-600 dark:text-rose-400";

  // Determinar color del equipo
  const teamColor =
    teamId === 100
      ? "text-blue-600 dark:text-blue-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-50/50 via-white/50 to-emerald-50/50 dark:from-emerald-950/20 dark:via-slate-900/50 dark:to-emerald-950/20 backdrop-blur-sm"
    >
      {/* Animated pulse background */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 animate-pulse" />

      {/* Live indicator o Warning indicator */}
      {isStale ? (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 dark:bg-amber-500/30 border border-amber-500/40 group cursor-help">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
            ⚠️ DESCONECTADO
          </span>
          {/* Tooltip */}
          <div className="absolute top-full right-0 mt-2 w-56 p-2 bg-slate-900 dark:bg-slate-800 text-white text-[10px] rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 border border-amber-500/30">
            <div className="font-bold text-amber-400 mb-1">
              Conexión perdida
            </div>
            <div className="text-slate-300">
              Los datos no se han actualizado en más de 30s. Posibles causas:
              <ul className="list-disc list-inside mt-1 text-[9px]">
                <li>Programa de escritorio cerrado</li>
                <li>Pérdida de conexión</li>
              </ul>
              <div className="mt-1 text-amber-400 font-semibold">
                Mostrando datos de API de Riot
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 border border-emerald-500/30">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {isApiFallback ? "LIVE (API)" : "LIVE"}
          </span>
        </div>
      )}

      <div className="relative z-10 p-3 flex items-center gap-3">
        {/* Champion Image */}
        {championImg && (
          <div className="relative flex-shrink-0">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-emerald-500/30 shadow-lg ring-2 ring-emerald-500/10">
              <Image
                src={championImg}
                alt={fixedChampionName || "Champion"}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* Stats Container */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
          {/* Left: KDA */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1">
              <span className={`text-lg font-black tracking-tight ${kdaColor}`}>
                {kills}
                <span className="text-slate-300 dark:text-white/20 mx-0.5">
                  /
                </span>
                {deaths}
                <span className="text-slate-300 dark:text-white/20 mx-0.5">
                  /
                </span>
                {assists}
              </span>
            </div>
            <span className="text-[9px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">
              {kda} KDA
            </span>
          </div>

          {/* Center: Queue & Duration */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <Trophy className="w-3 h-3 text-slate-500 dark:text-white/40" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white/70">
                {displayQueue}
              </span>
            </div>
            {gameDuration !== undefined && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 dark:text-white/30" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-white/50">
                  {formatDuration(gameDuration)}
                </span>
              </div>
            )}
          </div>

          {/* Right: Team Score (if available) */}
          {teamScore && (
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                    {teamScore.blue}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-400 dark:text-white/30">
                  -
                </span>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                    {teamScore.red}
                  </span>
                </div>
              </div>
              <span className="text-[8px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">
                Score
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
