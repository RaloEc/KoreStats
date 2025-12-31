"use client";

import React, { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getItemImg } from "@/lib/riot/helpers";
import { cn } from "@/lib/utils";

interface BuildTimelineProps {
  timeline: any;
  participantId: number;
  gameVersion?: string;
}

export function BuildTimeline({
  timeline,
  participantId,
  gameVersion,
}: BuildTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const buildGroups = useMemo(() => {
    if (!timeline || !timeline.info || !timeline.info.frames) return [];

    const groups: Record<number, any[]> = {};

    timeline.info.frames.forEach((frame: any) => {
      frame.events.forEach((event: any) => {
        if (
          event.type === "ITEM_PURCHASED" &&
          event.participantId === participantId
        ) {
          const minute = Math.floor(event.timestamp / 60000);
          if (!groups[minute]) {
            groups[minute] = [];
          }
          groups[minute].push(event);
        }
      });
    });

    return Object.entries(groups).map(([minute, events]) => ({
      minute: parseInt(minute),
      events,
    }));
  }, [timeline, participantId]);

  const totalMinutes = timeline?.info?.frames?.length || 30;
  const pixelsPerMinute = 80; // Balanced spacing
  const totalWidth = Math.max(800, totalMinutes * pixelsPerMinute);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <Card className="bg-white/30 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 overflow-hidden w-full">
      <style jsx>{`
        .timeline-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .timeline-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .timeline-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.4);
          border-radius: 20px;
        }
        .timeline-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.6);
        }
      `}</style>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-500" />
            Ruta de Armado
          </CardTitle>
          <div className="text-xs text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            <span>Desliza para ver más</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={scrollRef}
          className={cn(
            "w-full overflow-x-auto overflow-y-hidden timeline-scroll active:cursor-grabbing cursor-grab select-none pb-4 pt-8 px-4",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <div className="relative h-52" style={{ width: `${totalWidth}px` }}>
            {/* Timeline Track */}
            <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full -translate-y-1/2" />

            {/* Minute Markers every 5 mins */}
            {Array.from({ length: Math.ceil(totalMinutes / 5) + 1 }).map(
              (_, i) => {
                const minute = i * 5;
                const position = (minute / totalMinutes) * 100;
                if (minute > totalMinutes) return null;

                return (
                  <div
                    key={`marker-${minute}`}
                    className="absolute top-1/2 flex flex-col items-center -translate-x-1/2"
                    style={{ left: `${position}%` }}
                  >
                    <div className="h-4 w-0.5 bg-slate-300 dark:bg-slate-700 -mt-2" />
                    <span className="text-[10px] font-mono text-slate-400 mt-4">
                      {minute}m
                    </span>
                  </div>
                );
              }
            )}

            {/* Item Groups */}
            {buildGroups.map((group) => {
              const position = (group.minute / totalMinutes) * 100;

              return (
                <div
                  key={group.minute}
                  className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                  style={{
                    left: `${position}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {/* Time Badge */}
                  <div className="mb-3 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 shadow-sm whitespace-nowrap">
                    {group.minute}&apos;
                  </div>

                  {/* Items Stack */}
                  <div className="flex flex-col gap-1.5">
                    {group.events.map((event, idx) => (
                      <TooltipProvider key={`${group.minute}-${idx}`}>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <div className="w-10 h-10 border-2 border-slate-200 dark:border-slate-700 shadow-md rounded-lg bg-white dark:bg-slate-900 relative hover:scale-110 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all z-10 hover:z-20 group">
                              <Image
                                src={getItemImg(event.itemId, gameVersion)!}
                                alt={`Item ${event.itemId}`}
                                fill
                                sizes="40px"
                                className="object-cover rounded-md"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-900 border-slate-700 text-white">
                            <p className="font-medium">
                              Comprado al minuto {group.minute}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>

                  {/* Connector Dot */}
                  <div className="mt-3 w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 ring-4 ring-white dark:ring-slate-950" />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
