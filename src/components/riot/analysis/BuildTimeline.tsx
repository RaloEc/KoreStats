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
            "w-full overflow-x-auto overflow-y-hidden timeline-scroll active:cursor-grabbing cursor-grab select-none pb-6 pt-10 px-8",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <div className="flex items-end gap-12 min-w-max h-80 relative">
            {/* Horizontal Timeline Line - Subtle and elegant */}
            <div className="absolute bottom-[32px] left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800/60" />

            {buildGroups.map((group) => (
              <div
                key={group.minute}
                className="flex flex-col items-center relative"
              >
                {/* Items Stack - Glass Container to prevent distortion */}
                <div className="flex flex-col-reverse gap-3 mb-10 p-2.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 backdrop-blur-sm shadow-sm transition-transform hover:-translate-y-2 group">
                  {group.events.map((event, idx) => (
                    <TooltipProvider key={`${group.minute}-${idx}`}>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="w-12 h-12 shrink-0 bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all cursor-pointer relative shadow-md">
                            <Image
                              src={getItemImg(event.itemId, gameVersion)!}
                              alt={`Item ${event.itemId}`}
                              fill
                              sizes="48px"
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="bg-slate-900 border-slate-700 text-white text-[11px] font-semibold"
                        >
                          Minuto {group.minute}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>

                {/* Vertical Step Connector */}
                <div className="absolute bottom-[32px] w-0.5 h-6 bg-slate-200 dark:bg-slate-800/60" />

                {/* Interaction Point */}
                <div className="w-5 h-5 rounded-full bg-white dark:bg-slate-950 border-[4px] border-emerald-500 dark:border-emerald-600 shadow-sm z-10" />

                {/* Minute Label */}
                <div className="mt-3 text-xs font-bold font-mono text-slate-400 dark:text-slate-500">
                  {group.minute}m
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
