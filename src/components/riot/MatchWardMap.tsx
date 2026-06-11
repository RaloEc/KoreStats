"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { getChampionImg } from "@/lib/riot/helpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MatchWardMapProps {
  timeline: any;
  participants: any[]; // From match.full_json.info.participants
}

export function MatchWardMap({ timeline, participants }: MatchWardMapProps) {
  const [selectedParticipantId, setSelectedParticipantId] =
    useState<string>("all");

  // Map participantId to champion name/image
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

  const wards = useMemo(() => {
    if (!timeline || !timeline.info || !timeline.info.frames) return [];

    const wardEvents: any[] = [];
    timeline.info.frames.forEach((frame: any) => {
      frame.events.forEach((event: any) => {
        if (event.type === "WARD_PLACED") {
          // Filter by participant if selected
          if (
            selectedParticipantId !== "all" &&
            event.creatorId !== parseInt(selectedParticipantId)
          ) {
            return;
          }
          wardEvents.push(event);
        }
      });
    });

    console.log("[MatchWardMap] Total wards found:", wardEvents.length);
    console.log(
      "[MatchWardMap] Selected participant ID:",
      selectedParticipantId
    );
    if (wardEvents.length > 0) {
      console.log(
        "[MatchWardMap] Sample ward event (FULL):",
        JSON.stringify(wardEvents[0], null, 2)
      );
      console.log(
        "[MatchWardMap] First 3 ward events:",
        wardEvents.slice(0, 3)
      );
      console.log(
        "[MatchWardMap] Ward creator IDs:",
        Array.from(new Set(wardEvents.map((w) => w.creatorId)))
      );

      // Check how many wards have position data
      const wardsWithPosition = wardEvents.filter((w) => w.position);
      console.log(
        `[MatchWardMap] Wards WITH position: ${wardsWithPosition.length}/${wardEvents.length}`
      );
      if (wardsWithPosition.length > 0) {
        console.log(
          "[MatchWardMap] Sample ward WITH position:",
          wardsWithPosition[0]
        );
      }
    }

    return wardEvents;
  }, [timeline, selectedParticipantId]);

  // Debug: Check CHAMPION_KILL events for position data
  React.useEffect(() => {
    if (!timeline || !timeline.info || !timeline.info.frames) return;

    const killEvents: any[] = [];
    timeline.info.frames.forEach((frame: any) => {
      frame.events.forEach((event: any) => {
        if (event.type === "CHAMPION_KILL") {
          killEvents.push(event);
        }
      });
    });

    console.log(
      "[MatchWardMap] Total CHAMPION_KILL events:",
      killEvents.length
    );
    if (killEvents.length > 0) {
      console.log(
        "[MatchWardMap] Sample CHAMPION_KILL event (FULL):",
        JSON.stringify(killEvents[0], null, 2)
      );
      console.log(
        "[MatchWardMap] First 3 kill events:",
        killEvents.slice(0, 3)
      );

      const killsWithPosition = killEvents.filter((k) => k.position);
      console.log(
        `[MatchWardMap] Kills WITH position: ${killsWithPosition.length}/${killEvents.length}`
      );
      if (killsWithPosition.length > 0) {
        console.log(
          "[MatchWardMap] Sample kill WITH position:",
          killsWithPosition[0]
        );
      }
    }
  }, [timeline]);

  // Debug: Log participant data
  React.useEffect(() => {
    console.log("[MatchWardMap] Participants:", participants);
    console.log(
      "[MatchWardMap] Participant IDs:",
      participants.map((p) => p.participantId)
    );
    console.log("[MatchWardMap] Participant Map:", participantMap);
  }, [participants, participantMap]);

  const getPosition = (x: number, y: number) => {
    const MAP_SIZE = 14820;
    const left = (x / MAP_SIZE) * 100;
    const bottom = (y / MAP_SIZE) * 100;
    return { left: `${left}%`, bottom: `${bottom}%` };
  };

  if (!timeline) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900/50 rounded-lg border border-slate-800">
        <p className="text-slate-400">
          No hay datos de línea de tiempo disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800 gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <span className="text-sm text-slate-400 whitespace-nowrap">
            Filtrar por:
          </span>
          <Select
            value={selectedParticipantId}
            onValueChange={setSelectedParticipantId}
          >
            <SelectTrigger className="w-full sm:w-[240px] bg-slate-950 border-slate-800">
              <SelectValue placeholder="Todos los jugadores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los jugadores</SelectItem>
              {participants.map((p) => {
                // Calculate ward count for this participant
                const participantWardCount =
                  timeline?.info?.frames?.reduce(
                    (count: number, frame: any) => {
                      return (
                        count +
                        frame.events.filter(
                          (event: any) =>
                            event.type === "WARD_PLACED" &&
                            event.creatorId === p.participantId
                        ).length
                      );
                    },
                    0
                  ) || 0;

                console.log(
                  `[MatchWardMap] ${p.championName} (ID: ${p.participantId}): ${participantWardCount} wards`
                );

                return (
                  <SelectItem
                    key={p.participantId}
                    value={p.participantId.toString()}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative w-5 h-5 rounded-full overflow-hidden border border-slate-700">
                        <Image
                          src={getChampionImg(p.championName)}
                          alt={p.championName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span>{p.championName}</span>
                      <span className="text-xs text-slate-500 ml-auto">
                        ({participantWardCount})
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-slate-500 font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800">
          {wards.length} Wards
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full max-w-2xl mx-auto aspect-square bg-[#0a0a0c] rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
        <Image
          src="https://ddragon.leagueoflegends.com/cdn/6.8.1/img/map/map11.png"
          alt="Summoner's Rift"
          fill
          className="object-cover opacity-50 grayscale-[0.3]"
          priority
        />

        {wards.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-500 bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
              No se encontraron wards con el filtro actual
            </p>
          </div>
        )}

        {wards.map((ward, idx) => {
          if (!ward.position) return null;

          const pos = getPosition(ward.position.x, ward.position.y);
          const creator = participantMap.get(ward.creatorId);
          const isBlueTeam = creator?.teamId === 100;

          // Colores más brillantes para "heatmap style"
          const colorClass = isBlueTeam
            ? "bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]"
            : "bg-rose-500 shadow-[0_0_8px_2px_rgba(244,63,94,0.6)]";

          const controlWardClass =
            "bg-pink-500 shadow-[0_0_10px_3px_rgba(236,72,153,0.7)] ring-1 ring-white";

          return (
            <div
              key={idx}
              className={`absolute w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-150 hover:z-50 cursor-help group ${
                ward.wardType === "CONTROL_WARD"
                  ? `z-20 w-3 h-3 ${controlWardClass}`
                  : `z-10 ${colorClass}`
              }`}
              style={{ left: pos.left, bottom: pos.bottom }}
            >
              {/* Tooltip Mejorado */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900/95 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 border border-slate-700 shadow-xl backdrop-blur-md transition-opacity">
                <div className="font-bold text-yellow-400 mb-0.5">
                  {creator?.championName || "Desconocido"}
                </div>
                <div className="text-slate-300">
                  {ward.wardType === "CONTROL_WARD"
                    ? "Control Ward"
                    : "Ward Normal"}
                </div>
                <div className="text-slate-500 text-[0.625rem]">
                  {Math.floor(ward.timestamp / 60000)}:
                  {((ward.timestamp % 60000) / 1000)
                    .toFixed(0)
                    .padStart(2, "0")}
                </div>
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md p-3 rounded-lg border border-white/10 text-xs text-white space-y-2 shadow-lg z-30">
          <div className="font-semibold mb-1 text-slate-300 uppercase tracking-wider text-[0.625rem]">
            Leyenda
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]"></div>
            <span>Equipo Azul</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.8)]"></div>
            <span>Equipo Rojo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_4px_rgba(236,72,153,0.8)] border border-white/50"></div>
            <span>Control Ward</span>
          </div>
        </div>
      </div>
    </div>
  );
}
