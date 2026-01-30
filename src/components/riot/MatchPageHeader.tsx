import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MatchShareButton } from "@/components/riot/MatchShareButton";
import { formatGameVersion } from "@/lib/riot/helpers";

interface MatchPageHeaderProps {
  match: {
    queue_id: number;
    game_creation: number;
    game_duration: number;
    game_mode: string;
    game_version: string;
  };
  focusParticipant?: any;
  userProfileColor?: string | null;
  skinId: number;
  queueName: string;
  gameVersion: string;
}

// Helper functions (duplicated for self-containment or can be passed as props)
function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatTimeAgo(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  const date = new Date(timestamp);
  const currentYear = new Date().getFullYear();
  const matchYear = date.getFullYear();

  if (matchYear < currentYear) {
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (days >= 7) {
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  if (days > 0) return `${days}H`; // Refined to show hours if less than 7 days but more than 24h
  if (hours > 0) return `${hours}H`;
  return `${Math.max(1, minutes)}m`;
}

export function MatchPageHeader({
  match,
  focusParticipant,
  userProfileColor,
  skinId,
  queueName,
  gameVersion,
}: MatchPageHeaderProps) {
  const isWin = focusParticipant?.win;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-white dark:bg-[#030708] border border-slate-200 dark:border-white/5 shadow-xl dark:shadow-2xl mb-8 transition-all duration-300",
        isWin
          ? "ring-1 ring-blue-500/5 dark:ring-blue-500/10"
          : "ring-1 ring-red-500/5 dark:ring-red-500/10",
      )}
    >
      {/* Accent Color Strip */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 z-20",
          isWin
            ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            : "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]",
        )}
      />

      <div className="relative z-10 flex flex-row items-center h-14 sm:h-16 px-1 sm:px-5">
        {/* Navigation Section */}
        <div className="flex items-center justify-center w-10 sm:w-14 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all rounded-lg group/back"
            asChild
          >
            <Link href="/perfil?tab=lol">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover/back:-translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </div>

        {/* Champion & Status Section */}
        <div className="flex items-center gap-2 sm:gap-5 px-3 sm:px-5 h-full border-l border-slate-100 dark:border-white/10">
          <div className="flex flex-col justify-center">
            <h2
              className={cn(
                "text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-[0.2em] leading-none mb-0.5 sm:mb-1.5",
                isWin
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {isWin ? "Victoria" : "Derrota"}
            </h2>
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-tighter leading-none">
              {queueName}
            </span>
          </div>
        </div>

        {/* Info/Stats Section */}
        <div className="flex-1 flex flex-row items-center justify-end px-3 sm:px-6 gap-3 sm:gap-8 min-w-0">
          {/* Duration Block */}
          <div className="flex flex-col items-end">
            <span className="hidden sm:block text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest leading-none mb-1.5">
              Duración
            </span>
            <div className="flex items-center gap-1 sm:gap-2">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300 dark:text-white/20" />
              <span className="text-[10px] sm:text-sm font-bold text-slate-600 dark:text-white/90 tabular-nums leading-none">
                {formatDuration(match.game_duration)}
              </span>
            </div>
          </div>

          {/* Time Ago Block */}
          <div className="flex flex-col items-end">
            <span className="hidden sm:block text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest leading-none mb-1.5">
              Hace
            </span>
            <div className="flex items-center gap-1 sm:gap-2">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300 dark:text-white/20" />
              <span className="text-[10px] sm:text-sm font-bold text-slate-600 dark:text-white/90 leading-none">
                {formatTimeAgo(match.game_creation)}
              </span>
            </div>
          </div>
        </div>

        {/* Ending Decoration/Logo */}
        <div className="hidden lg:flex items-center px-6 border-l border-slate-100 dark:border-white/5 h-14 bg-slate-50 dark:bg-white/[0.01]">
          <div className="flex flex-col items-end opacity-20 dark:opacity-20">
            <span className="text-[8px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em]">
              KORESTATS
            </span>
            <span className="text-[7px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest mt-0.5">
              MATCH ANALYSIS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
