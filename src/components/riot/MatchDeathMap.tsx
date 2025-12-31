"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { getChampionImg } from "@/lib/riot/helpers";
import { cn } from "@/lib/utils";
import { Swords, Castle as Tower, Trophy } from "lucide-react";

interface MatchMapAnalysisProps {
  timeline: any;
  participants: any[];
  focusTeamId?: number;
  highlightParticipantId?: number;
}

export function MatchMapAnalysis({
  timeline,
  participants,
  focusTeamId = 100,
  highlightParticipantId,
}: MatchMapAnalysisProps) {
  const [selectedParticipantId, setSelectedParticipantId] =
    useState<string>("all");
  const [activeLayer, setActiveLayer] = useState<"deaths" | "objectives">(
    "deaths"
  );

  // Map participantId to champion info
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

  // Extract Events by Layer
  const events = useMemo(() => {
    if (!timeline || !timeline.info || !timeline.info.frames) return [];

    const extractedEvents: any[] = [];
    timeline.info.frames.forEach((frame: any) => {
      frame.events.forEach((event: any) => {
        // Filter by Participant if selected
        if (selectedParticipantId !== "all") {
          const pId = parseInt(selectedParticipantId);
          const isRelevant =
            event.killerId === pId ||
            event.victimId === pId ||
            event.participantId === pId ||
            event.creatorId === pId ||
            (event.assistingParticipantIds &&
              event.assistingParticipantIds.includes(pId));

          if (!isRelevant) return;
        }

        // Only add events that have a position
        if (!event.position) return;

        if (activeLayer === "deaths" && event.type === "CHAMPION_KILL") {
          extractedEvents.push(event);
        } else if (
          activeLayer === "objectives" &&
          (event.type === "BUILDING_KILL" ||
            event.type === "ELITE_MONSTER_KILL")
        ) {
          extractedEvents.push(event);
        }
      });
    });

    return extractedEvents;
  }, [timeline, selectedParticipantId, activeLayer]);

  const getPosition = (x: number, y: number) => {
    const MAP_SIZE = 14820;
    const left = (x / MAP_SIZE) * 100;
    const bottom = (y / MAP_SIZE) * 100;
    return { left: `${left}%`, bottom: `${bottom}%` };
  };

  if (!timeline) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-100 dark:bg-[#010A13] rounded-lg border border-slate-300 dark:border-[#C8AA6E]/30 text-slate-700 dark:text-[#C8AA6E]">
        <p>No hay datos de línea de tiempo disponibles</p>
      </div>
    );
  }

  const team100 = participants.filter((p) => p.teamId === 100);
  const team200 = participants.filter((p) => p.teamId === 200);

  return (
    <div className="flex flex-col md:flex-row items-start justify-center gap-6 w-full max-w-4xl mx-auto">
      {/* LEFT: Map Frame */}
      <div className="flex-1 w-full max-w-md">
        <div className="relative w-full aspect-square p-1 max-h-[400px] mx-auto">
          {/* Hextech Border Frame */}
          <div className="absolute inset-0 pointer-events-none z-20 border-[3px] border-slate-300 dark:border-[#C8AA6E] rounded-md shadow-sm dark:shadow-[0_0_15px_rgba(200,170,110,0.3)]">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-slate-400 dark:border-[#C89B3C] -m-[3px]" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-slate-400 dark:border-[#C89B3C] -m-[3px]" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-slate-400 dark:border-[#C89B3C] -m-[3px]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-slate-400 dark:border-[#C89B3C] -m-[3px]" />
          </div>

          {/* Map Background */}
          <div className="relative w-full h-full bg-slate-200 dark:bg-[#010A13] overflow-hidden rounded">
            <div className="absolute inset-2 z-0 opacity-80 mix-blend-multiply dark:mix-blend-luminosity brightness-100 dark:brightness-75 contrast-125">
              <Image
                src="https://ddragon.leagueoflegends.com/cdn/6.8.1/img/map/map11.png"
                alt="Summoner's Rift"
                fill
                className="object-cover grayscale"
                priority
              />
            </div>
            <div className="absolute inset-2 z-0 bg-transparent dark:bg-[#3a2f1b]/40 mix-blend-overlay pointer-events-none" />

            {/* Events Layer */}
            <div className="absolute inset-0 z-10 m-2">
              {events.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-500 dark:text-[#C8AA6E] text-sm uppercase tracking-widest font-bold opacity-50">
                    Sin eventos
                  </p>
                </div>
              )}

              {events.map((event, idx) => {
                if (!event.position) return null;
                const pos = getPosition(event.position.x, event.position.y);
                const isParticipantSelected = selectedParticipantId !== "all";
                const killer = participantMap.get(event.killerId);

                let markerColor = "bg-rose-500 dark:bg-[#f23c3c]";
                let isX = false;

                if (activeLayer === "deaths") {
                  const victimId = event.victimId;
                  const isVictimSelected =
                    selectedParticipantId === victimId?.toString();
                  if (isVictimSelected) isX = true;
                } else if (activeLayer === "objectives") {
                  markerColor = "bg-amber-500 dark:bg-[#C8AA6E]";
                  const isTower = event.buildingType === "TOWER_BUILDING";
                  if (isTower) isX = true;
                }

                return (
                  <div
                    key={idx}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                    style={{ left: pos.left, bottom: pos.bottom }}
                  >
                    {isX ? (
                      <div className="relative w-4 h-4 text-rose-600 dark:text-[#e84057]">
                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-current rotate-45 transform origin-center" />
                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-current -rotate-45 transform origin-center" />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full shadow-sm border-[0.5px] border-white/50 dark:border-black",
                          markerColor
                        )}
                      />
                    )}

                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
                      <div className="bg-white dark:bg-[#010A13] border border-slate-200 dark:border-[#C8AA6E] shadow-lg rounded-md p-2 flex flex-col items-center gap-1 min-w-max">
                        {activeLayer === "deaths" ? (
                          <div className="flex items-center gap-2">
                            <div className="relative w-6 h-6 rounded-full border border-amber-500 dark:border-[#C8AA6E] overflow-hidden">
                              <Image
                                src={getChampionImg(killer?.championName)}
                                alt={killer?.championName || "Killer"}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <Swords className="w-3 h-3 text-slate-400 dark:text-[#C8AA6E]" />
                            <div className="relative w-6 h-6 rounded-full border border-rose-500 overflow-hidden grayscale">
                              <Image
                                src={getChampionImg(
                                  participantMap.get(event.victimId)
                                    ?.championName
                                )}
                                alt="Victim"
                                fill
                                className="object-cover"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-600 dark:text-[#C8AA6E] text-[10px] uppercase tracking-wider font-bold px-1">
                            {event.monsterType === "TOWER_BUILDING"
                              ? "Torre"
                              : event.monsterType || "Objetivo"}
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400 font-mono">
                          {Math.floor(event.timestamp / 60000)}:
                          {((event.timestamp % 60000) / 1000)
                            .toFixed(0)
                            .padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Sidebar (Controls & Champions) */}
      <div className="flex flex-col gap-6 w-full md:w-auto md:min-w-[200px]">
        {/* Layer Selector */}
        <div className="flex flex-row md:flex-col gap-3 justify-center">
          {(["deaths", "objectives"] as const).map((layer) => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-all w-full",
                activeLayer === layer
                  ? "bg-amber-100 dark:bg-[#C8AA6E]/10 text-amber-700 dark:text-[#C8AA6E] border border-amber-200 dark:border-[#C8AA6E]/30"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-full border transition-all shrink-0",
                  activeLayer === layer
                    ? "border-amber-500 dark:border-[#C8AA6E] bg-white dark:bg-[#010A13]"
                    : "border-transparent bg-slate-200 dark:bg-slate-800"
                )}
              >
                {layer === "deaths" ? (
                  <Swords className="w-3.5 h-3.5" />
                ) : (
                  <Trophy className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                  Ver
                </span>
                <span className="text-xs font-bold">
                  {layer === "deaths" ? "Muertes" : "Objetivos"}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="h-px bg-slate-200 dark:bg-[#C8AA6E]/20 w-full" />

        {/* Player Selectors */}
        <div className="w-full space-y-4">
          {/* Team 100 (Blue) */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-blue-500 dark:text-[#005a82] pl-1">
              Blue Team
            </span>
            <div className="grid grid-cols-5 md:grid-cols-5 gap-2">
              {team100.map((p) => {
                const isSelected =
                  selectedParticipantId === p.participantId.toString();
                return (
                  <button
                    key={p.participantId}
                    onClick={() =>
                      setSelectedParticipantId(
                        isSelected ? "all" : p.participantId.toString()
                      )
                    }
                    className={cn(
                      "relative w-8 h-8 rounded-full transition-all duration-300 mx-auto",
                      isSelected
                        ? "ring-2 ring-amber-500 dark:ring-[#C8AA6E] scale-110 z-10 box-content shadow-sm"
                        : "grayscale hover:grayscale-0 ring-1 ring-blue-500/30 dark:ring-[#005a82] bg-white dark:bg-[#010A13]"
                    )}
                  >
                    <Image
                      src={getChampionImg(p.championName)}
                      alt={p.championName}
                      fill
                      className="rounded-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team 200 (Red) */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-rose-500 dark:text-[#820025] pl-1">
              Red Team
            </span>
            <div className="grid grid-cols-5 md:grid-cols-5 gap-2">
              {team200.map((p) => {
                const isSelected =
                  selectedParticipantId === p.participantId.toString();
                return (
                  <button
                    key={p.participantId}
                    onClick={() =>
                      setSelectedParticipantId(
                        isSelected ? "all" : p.participantId.toString()
                      )
                    }
                    className={cn(
                      "relative w-8 h-8 rounded-full transition-all duration-300 mx-auto",
                      isSelected
                        ? "ring-2 ring-amber-500 dark:ring-[#C8AA6E] scale-110 z-10 box-content shadow-sm"
                        : "grayscale hover:grayscale-0 ring-1 ring-rose-500/30 dark:ring-[#820025] bg-white dark:bg-[#010A13]"
                    )}
                  >
                    <Image
                      src={getChampionImg(p.championName)}
                      alt={p.championName}
                      fill
                      className="rounded-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
