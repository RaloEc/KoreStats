"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { getChampionImg } from "@/lib/riot/helpers";
import { cn } from "@/lib/utils";
import {
  Swords,
  Castle as Tower,
  Eye,
  Footprints,
  Skull,
  Clock,
  Map as MapIcon,
  Flame,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MatchMapAnalysisProps {
  timeline: any;
  participants: any[];
  focusTeamId?: number;
  highlightParticipantId?: number;
  onSelectParticipant?: (id: string) => void;
}

const getObjectiveIcon = (event: any) => {
  const baseUrl =
    "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-match-history/global/default/";

  if (event.type === "ELITE_MONSTER_KILL") {
    switch (event.monsterType) {
      case "BARON_NASHOR":
        return `${baseUrl}baron-100.png`;
      case "RIFTHERALD":
        return `${baseUrl}herald-100.png`;
      case "HORDE":
        // Fallback a heraldo para los Atelios ya que el icono específico no está en este plugin
        return `${baseUrl}herald-100.png`;
      case "DRAGON":
        const subType = event.monsterSubType;
        if (subType === "AIR_DRAGON") return `${baseUrl}air-100.png`;
        if (subType === "EARTH_DRAGON") return `${baseUrl}earth-100.png`;
        if (subType === "FIRE_DRAGON") return `${baseUrl}fire-100.png`;
        if (subType === "WATER_DRAGON") return `${baseUrl}water-100.png`;
        if (subType === "ELDER_DRAGON") return `${baseUrl}elder-100.png`;
        // Para dragones nuevos (Hextech/Chemtech) usamos el icono de dragón genérico
        // Esto evita que se vea una imagen rota hasta que CDragon actualice este plugin
        return `${baseUrl}dragon-100.png`;
    }
  }

  if (event.type === "BUILDING_KILL") {
    if (event.buildingType === "TOWER_BUILDING")
      return `${baseUrl}tower-100.png`;
    if (event.buildingType === "INHIBITOR_BUILDING")
      return `${baseUrl}inhibitor-100.png`;
    if (event.buildingType === "NEXUS_BUILDING")
      return `${baseUrl}inhibitor-100.png`;
  }

  if (event.type === "TURRET_PLATE_DESTROYED") return `${baseUrl}tower-100.png`;

  return `${baseUrl}monster-100.png`;
};

const getObjectiveName = (event: any) => {
  if (event.type === "ELITE_MONSTER_KILL") {
    switch (event.monsterType) {
      case "BARON_NASHOR":
        return "Barón Nashor";
      case "RIFTHERALD":
        return "Heraldo de la Grieta";
      case "HORDE":
        return "Larvas del Vacío";
      case "DRAGON":
        const subType = event.monsterSubType;
        if (subType === "AIR_DRAGON") return "Dragón de Nube";
        if (subType === "EARTH_DRAGON") return "Dragón de Montaña";
        if (subType === "FIRE_DRAGON") return "Dragón de Fuego";
        if (subType === "WATER_DRAGON") return "Dragón de Océano";
        if (subType === "HEXTECH_DRAGON") return "Dragón Hextech";
        if (subType === "CHEMTECH_DRAGON") return "Dragón Quimtech";
        if (subType === "ELDER_DRAGON") return "Dragón Anciano";
        return "Dragón";
      default:
        return "Monstruo Élite";
    }
  }
  if (event.type === "BUILDING_KILL") {
    switch (event.buildingType) {
      case "TOWER_BUILDING":
        return "Torre";
      case "INHIBITOR_BUILDING":
        return "Inhibidor";
      case "NEXUS_BUILDING":
        return "Nexo";
      default:
        return "Estructura";
    }
  }
  if (event.type === "TURRET_PLATE_DESTROYED") return "Placa de Torre";
  return "Objetivo";
};

type TimeRange = "early" | "mid" | "late" | "all";
type MapLayer = "deaths" | "structures" | "paths";

export function MatchMapAnalysis({
  timeline,
  participants,
  focusTeamId = 100,
  highlightParticipantId,
  onSelectParticipant,
}: MatchMapAnalysisProps) {
  const [internalSelectionId, setInternalSelectionId] = useState<string>(
    highlightParticipantId?.toString() || "all",
  );

  // Sync with prop changes
  React.useEffect(() => {
    if (highlightParticipantId) {
      setInternalSelectionId(highlightParticipantId.toString());
    } else {
      setInternalSelectionId("all");
    }
  }, [highlightParticipantId]);

  const selectedParticipantId = internalSelectionId;

  const handleSelect = (id: string) => {
    setInternalSelectionId(id);
    onSelectParticipant?.(id);
  };
  const [activeLayers, setActiveLayers] = useState<MapLayer[]>([
    "deaths",
    "structures",
  ]);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  // Map helper
  const participantMap = useMemo(() => {
    const map = new Map();
    participants.forEach((p) => {
      map.set(p.participantId, {
        championName: p.championName,
        summonerName: p.summonerName,
        teamId: p.teamId,
      });
    });
    return map;
  }, [participants]);

  // Derived Data: Filtered Events
  const { events, paths } = useMemo(() => {
    if (!timeline?.info?.frames) return { events: [], paths: [] };

    const filteredEvents: any[] = [];
    const filteredPaths: any[] = [];

    // Time filter logic
    const getTimeBounds = (range: TimeRange) => {
      switch (range) {
        case "early":
          return { start: 0, end: 15 * 60000 };
        case "mid":
          return { start: 15 * 60000, end: 30 * 60000 };
        case "late":
          return { start: 30 * 60000, end: 999 * 60000 };
        case "all":
        default:
          return { start: 0, end: 999 * 60000 };
      }
    };
    const { start, end } = getTimeBounds(timeRange);

    // Process frames
    timeline.info.frames.forEach((frame: any) => {
      // 1. Position tracking (Paths)
      if (
        activeLayers.includes("paths") &&
        frame.timestamp >= start &&
        frame.timestamp <= end
      ) {
        Object.values(frame.participantFrames).forEach((pf: any) => {
          if (!pf.position) return;
          if (
            selectedParticipantId !== "all" &&
            pf.participantId.toString() !== selectedParticipantId
          )
            return;

          filteredPaths.push({
            x: pf.position.x,
            y: pf.position.y,
            participantId: pf.participantId,
            timestamp: frame.timestamp,
          });
        });
      }

      // 2. Events
      frame.events.forEach((event: any) => {
        if (event.timestamp < start || event.timestamp > end) return;

        // Layer check first to avoid unnecessary processing
        const isDeathLayer =
          activeLayers.includes("deaths") && event.type === "CHAMPION_KILL";
        const isStructureLayer =
          activeLayers.includes("structures") &&
          (event.type === "BUILDING_KILL" ||
            event.type === "ELITE_MONSTER_KILL" ||
            event.type === "TURRET_PLATE_DESTROYED");

        if (!isDeathLayer && !isStructureLayer) return;

        // Resolve position
        let resolvedPosition = event.position;
        if (!resolvedPosition) {
          const pId = event.killerId || event.participantId;
          if (pId && frame.participantFrames[pId]) {
            resolvedPosition = frame.participantFrames[pId].position;
          }
        }

        if (!resolvedPosition) return;

        // Participant Filter
        if (selectedParticipantId !== "all") {
          const pId = parseInt(selectedParticipantId);
          const isInvolved =
            event.killerId === pId ||
            event.victimId === pId ||
            event.participantId === pId ||
            event.creatorId === pId ||
            event.assistingParticipantIds?.includes(pId);

          if (!isInvolved) return;
        }

        // Add to filtered events with its resolved position
        if (isDeathLayer) {
          filteredEvents.push({ ...event, layer: "deaths", resolvedPosition });
        } else if (isStructureLayer) {
          filteredEvents.push({
            ...event,
            layer: "structures",
            resolvedPosition,
          });
        }
      });
    });

    return { events: filteredEvents, paths: filteredPaths };
  }, [timeline, selectedParticipantId, activeLayers, timeRange]);

  // Handle Layer Toggle
  const toggleLayer = (layer: MapLayer) => {
    setActiveLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer],
    );
  };

  const getPosStyle = (x: number, y: number) => {
    const MAP_SIZE = 15000; // Estándar de Riot (0,0 a 15000,15000)
    const left = (x / MAP_SIZE) * 100;
    const bottom = (y / MAP_SIZE) * 100;
    return { left: `${left}%`, bottom: `${bottom}%` };
  };

  // SVG Path Generator for movements
  const generateSvgPath = () => {
    if (paths.length === 0) return "";

    // Group by participant
    const pathsByParticipant: Record<number, { x: number; y: number }[]> = {};
    paths.forEach((p) => {
      if (!pathsByParticipant[p.participantId])
        pathsByParticipant[p.participantId] = [];
      pathsByParticipant[p.participantId].push({ x: p.x, y: p.y });
    });

    return Object.entries(pathsByParticipant).map(([pId, points]) => {
      const isSelected =
        selectedParticipantId !== "all" && pId === selectedParticipantId;
      const teamId = participantMap.get(parseInt(pId))?.teamId;

      // Better colors for paths
      const color = teamId === 100 ? "#3b82f6" : "#f43f5e";
      const glowColor =
        teamId === 100 ? "rgba(59, 130, 246, 0.4)" : "rgba(244, 63, 94, 0.4)";

      const d = points
        .map((pt, i) => {
          const x = (pt.x / 15000) * 100;
          const y = 100 - (pt.y / 15000) * 100;
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ");

      return (
        <g
          key={pId}
          className={cn(
            "transition-opacity duration-500",
            !isSelected && selectedParticipantId !== "all"
              ? "opacity-20"
              : "opacity-100",
          )}
        >
          {/* External Glow / Halo */}
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={isSelected ? "3" : "2"}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-30 blur-[1px]"
            vectorEffect="non-scaling-stroke"
          />
          {/* Main Core Path */}
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={isSelected ? "1.5" : "0.8"}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={isSelected ? "4 2" : "none"}
            className={cn(
              "drop-shadow-sm transition-all duration-300",
              isSelected && "animate-[dash_20s_linear_infinite]",
            )}
            vectorEffect="non-scaling-stroke"
          />
          {/* Indicators for endpoints or key moments could go here */}
        </g>
      );
    });
  };

  // Add a small style block for the dash animation
  const dashAnimation = (
    <style
      dangerouslySetInnerHTML={{
        __html: `
      @keyframes dash {
        to {
          stroke-dashoffset: -100;
        }
      }
    `,
      }}
    />
  );

  const team100 = participants.filter((p) => p.teamId === 100);
  const team200 = participants.filter((p) => p.teamId === 200);

  if (!timeline) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-xl border-dashed">
        <span className="text-slate-500">Sin datos de mapa</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
      {dashAnimation}
      {/* MAP AREA */}
      <div className="flex-1 w-full">
        <div className="relative w-full aspect-square max-h-[600px] mx-auto border-4 border-slate-300 dark:border-[#3C3C41] rounded-2xl overflow-hidden shadow-2xl bg-slate-200 dark:bg-[#010A13] transition-colors duration-300">
          {/* Map Image with dynamic filters for Light/Dark mode */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src="https://ddragon.leagueoflegends.com/cdn/14.3.1/img/map/map11.png"
              alt="Rift"
              fill
              className="object-fill transition-all duration-500 grayscale brightness-110 contrast-75 opacity-40 dark:opacity-80 dark:brightness-50 dark:contrast-125"
            />
            {/* Subtle overlay for more "Tactical" feel in light mode */}
            <div className="absolute inset-0 bg-blue-500/5 dark:bg-transparent pointer-events-none" />
          </div>

          {/* Paths Layer (SVG) */}
          {activeLayers.includes("paths") && (
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              preserveAspectRatio="none"
            >
              {generateSvgPath()}
            </svg>
          )}

          {/* Events Layer */}
          <div className="absolute inset-0 z-20">
            {events.map((event, idx) => {
              const pos = getPosStyle(
                event.resolvedPosition.x,
                event.resolvedPosition.y,
              );
              const isDeath = event.layer === "deaths";
              const isStructure = event.layer === "structures";

              const pKiller = participantMap.get(event.killerId);
              const pVictim = participantMap.get(event.victimId);
              const pCreator = participantMap.get(event.creatorId);

              const pInfo = pKiller || pCreator;
              const teamColor =
                pInfo?.teamId === 100
                  ? "text-blue-500 dark:text-blue-400"
                  : "text-rose-500 dark:text-rose-400";
              const bgColor =
                pInfo?.teamId === 100 ? "bg-blue-500" : "bg-rose-500";

              // Logic for personalized icons
              const isFocusVictim =
                selectedParticipantId !== "all" &&
                event.victimId?.toString() === selectedParticipantId;
              const isFocusKiller =
                selectedParticipantId !== "all" &&
                event.killerId?.toString() === selectedParticipantId;
              const isFocusAssist =
                selectedParticipantId !== "all" &&
                event.assistingParticipantIds?.includes(
                  parseInt(selectedParticipantId),
                );

              return (
                <TooltipProvider key={`${event.type}-${idx}`}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 flex items-center justify-center hover:scale-125 hover:z-50",
                        )}
                        style={{ left: pos.left, bottom: pos.bottom }}
                      >
                        {isDeath && (
                          <div
                            className={cn(
                              "relative flex items-center justify-center transition-all",
                              isFocusVictim
                                ? "text-rose-500 drop-shadow-md"
                                : isFocusKiller
                                  ? "text-rose-500"
                                  : isFocusAssist
                                    ? "p-1 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-500 shadow-sm"
                                    : "p-1 rounded-full ring-2 ring-white dark:ring-slate-900 text-white " +
                                      bgColor,
                            )}
                          >
                            {isFocusVictim ? (
                              <svg
                                viewBox="0 0 24 24"
                                className="w-5 h-5 stroke-[3] fill-none stroke-current"
                              >
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            ) : isFocusKiller ? (
                              <div className="w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 shadow-lg animate-pulse" />
                            ) : isFocusAssist ? (
                              <Skull className="w-3 h-3 text-slate-900 dark:text-black" />
                            ) : (
                              <Skull className="w-3 h-3" />
                            )}
                          </div>
                        )}
                        {isStructure && (
                          <div
                            className={cn(
                              "relative w-8 h-8 flex items-center justify-center rounded-lg border-2 border-white dark:border-slate-900 shadow-xl overflow-hidden transition-all hover:scale-110 hover:z-50",
                              event.type === "ELITE_MONSTER_KILL"
                                ? "bg-[#010A13] ring-2 ring-amber-500/30"
                                : "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/20",
                            )}
                          >
                            {getObjectiveIcon(event) ? (
                              <div className="relative w-full h-full">
                                <Image
                                  src={getObjectiveIcon(event)!}
                                  alt="Icono"
                                  fill
                                  className="object-contain scale-125"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <Tower className="w-5 h-5 text-white" />
                            )}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-0 shadow-2xl overflow-hidden rounded-lg"
                    >
                      <div className="flex flex-col min-w-[200px]">
                        {/* Header with time */}
                        <div className="bg-slate-50 dark:bg-black/20 px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-widest",
                              isFocusKiller
                                ? "text-rose-500"
                                : isFocusVictim
                                  ? "text-rose-500"
                                  : isFocusAssist
                                    ? "text-emerald-500"
                                    : isStructure
                                      ? "text-amber-500"
                                      : "text-slate-400",
                            )}
                          >
                            {(() => {
                              if (isFocusKiller) return "Asesinato";
                              if (isFocusVictim) return "Muerte";
                              if (isFocusAssist) return "Asistencia";
                              if (isStructure) return getObjectiveName(event);
                              return "Suceso Táctico";
                            })()}
                          </span>
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                            Min {Math.floor(event.timestamp / 60000)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="p-3">
                          {isDeath ? (
                            <div className="flex items-center gap-3">
                              {/* Killer */}
                              <div className="flex flex-col items-center gap-1">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500/50">
                                  <Image
                                    src={getChampionImg(
                                      pKiller?.championName || "Unknown",
                                    )}
                                    alt="Asesino"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <span className="text-[9px] font-bold text-blue-500 uppercase truncate max-w-[50px]">
                                  {pKiller?.championName}
                                </span>
                              </div>

                              <div className="flex-1 flex flex-col items-center">
                                <Swords className="w-4 h-4 text-slate-300 dark:text-slate-600 mb-1" />
                                <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                              </div>

                              {/* Victim */}
                              <div className="flex flex-col items-center gap-1">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-rose-500/50">
                                  <Image
                                    src={getChampionImg(
                                      pVictim?.championName || "Unknown",
                                    )}
                                    alt="Víctima"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <span className="text-[9px] font-bold text-rose-500 uppercase truncate max-w-[50px]">
                                  {pVictim?.championName}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              {getObjectiveIcon(event) ? (
                                <div className="relative w-10 h-10 bg-slate-100 dark:bg-black/40 rounded-lg p-1.5 border border-slate-200 dark:border-white/10">
                                  <Image
                                    src={getObjectiveIcon(event)!}
                                    alt="Icono"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <Tower className="w-6 h-6 text-amber-500" />
                              )}
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                  {getObjectiveName(event)}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">
                                  Objetivo Asegurado
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: Analysis Controls Panel */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-5 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800/60 shadow-sm backdrop-blur-sm">
        {/* Panel Header */}
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-emerald-500" />
            Control Táctico
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
            Ajusta los filtros para visualizar el control del mapa.
          </p>
        </div>

        {/* 1. Time Selection */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Fase de Juego
          </label>
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/50 dark:bg-black/20 rounded-lg">
            {(["early", "mid", "late", "all"] as TimeRange[]).map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={cn(
                  "py-1 text-[10px] font-bold uppercase rounded-md transition-all",
                  timeRange === t
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300",
                )}
              >
                {t === "all" ? "Todo" : t}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Visual Layers */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Eye className="w-3 h-3" /> Capas Activas
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                id: "deaths",
                label: "Muertes",
                icon: Skull,
                color: "text-rose-500",
              },
              {
                id: "structures",
                label: "Objetivos",
                icon: Tower,
                color: "text-amber-500",
              },
              {
                id: "paths",
                label: "Rutas",
                icon: Footprints,
                color: "text-blue-500",
              },
            ].map((layer) => (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id as MapLayer)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-bold transition-all",
                  activeLayers.includes(layer.id as MapLayer)
                    ? "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white shadow-sm"
                    : "bg-transparent border-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/30",
                )}
              >
                <layer.icon className={cn("w-3.5 h-3.5", layer.color)} />
                {layer.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800/60" />

        {/* 3. Player Filter */}
        <div className="space-y-4">
          {/* Team Blue */}
          <div>
            <span className="text-[10px] font-bold uppercase text-blue-500 mb-2 block tracking-wider">
              Equipo Azul
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {team100.map((p) => (
                <button
                  key={p.participantId}
                  onClick={() =>
                    handleSelect(
                      selectedParticipantId === p.participantId.toString()
                        ? "all"
                        : p.participantId.toString(),
                    )
                  }
                  className={cn(
                    "relative w-8 h-8 rounded-full overflow-hidden border-2 transition-all",
                    selectedParticipantId === p.participantId.toString()
                      ? "border-blue-500 scale-110 z-10 shadow-md ring-2 ring-blue-500/30"
                      : "border-transparent opacity-50 hover:opacity-100 grayscale hover:grayscale-0",
                  )}
                >
                  <Image
                    src={getChampionImg(p.championName)}
                    alt={p.championName}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Team Red */}
          <div>
            <span className="text-[10px] font-bold uppercase text-rose-500 mb-2 block tracking-wider">
              Equipo Rojo
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {team200.map((p) => (
                <button
                  key={p.participantId}
                  onClick={() =>
                    handleSelect(
                      selectedParticipantId === p.participantId.toString()
                        ? "all"
                        : p.participantId.toString(),
                    )
                  }
                  className={cn(
                    "relative w-8 h-8 rounded-full overflow-hidden border-2 transition-all",
                    selectedParticipantId === p.participantId.toString()
                      ? "border-rose-500 scale-110 z-10 shadow-md ring-2 ring-rose-500/30"
                      : "border-transparent opacity-50 hover:opacity-100 grayscale hover:grayscale-0",
                  )}
                >
                  <Image
                    src={getChampionImg(p.championName)}
                    alt={p.championName}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
