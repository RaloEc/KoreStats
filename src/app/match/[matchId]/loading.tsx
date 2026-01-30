import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Loading() {
  return (
    <div className="container mx-auto p-4 space-y-8 max-w-6xl pb-20">
      {/* --- HEADER SKELETON --- */}
      <div className="relative w-full overflow-hidden rounded-xl bg-white dark:bg-[#030708] border border-slate-200 dark:border-white/5 shadow-xl h-14 sm:h-16 flex items-center">
        {/* Navigation Section */}
        <div className="flex items-center justify-center w-10 sm:w-14 shrink-0 px-1 sm:px-5">
          <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
        </div>

        {/* Status Section */}
        <div className="flex items-center gap-2 sm:gap-5 px-3 sm:px-5 h-full border-l border-slate-100 dark:border-white/10">
          <div className="flex flex-col justify-center gap-1.5">
            <Skeleton className="h-3 w-16 sm:w-20" />
            <Skeleton className="h-2 w-12 sm:w-14" />
          </div>
        </div>

        {/* Info/Stats Section */}
        <div className="flex-1 flex flex-row items-center justify-end px-3 sm:gap-8 gap-3 min-w-0 mr-4">
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="hidden sm:block h-2 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="hidden sm:block h-2 w-10" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      </div>

      {/* --- SCOREBOARD SKELETON --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        {/* VS Indicator */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center">
            <span className="text-sm font-black text-slate-200 dark:text-slate-800 italic">
              VS
            </span>
          </div>
        </div>

        {[0, 1].map((teamIdx) => (
          <div
            key={teamIdx}
            className="overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-black/40 rounded-2xl shadow-xl backdrop-blur-md transition-all h-[550px]"
          >
            {/* Team Header */}
            <div
              className={cn(
                "px-3 py-1.5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 h-10",
                teamIdx === 0 ? "bg-blue-500/5" : "bg-rose-500/5",
              )}
            >
              <div className="flex gap-2">
                <Skeleton className="w-16 h-4 rounded-md" />
                <Skeleton className="w-20 h-4 rounded-md" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="w-10 h-4" />
                <Skeleton className="w-10 h-4" />
              </div>
            </div>

            {/* Players Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50 p-2 space-y-2">
              {[0, 1, 2, 3, 4].map((pIdx) => (
                <div key={pIdx} className="flex items-center gap-3 p-2">
                  <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2 w-32" />
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="w-5 h-5 rounded-sm" />
                    ))}
                  </div>
                  <Skeleton className="w-12 h-6 rounded px-2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* --- ANALYSIS SKELETON --- */}
      <div className="pt-8 border-t border-white/5 space-y-8">
        {/* Lane Duel Skeleton */}
        <div className="w-full h-80 bg-white dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-white/5 p-6 flex flex-col gap-6">
          <div className="flex items-center justify-around flex-1">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-24 h-24 rounded-full border-4 border-white/10" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-20" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl font-black text-slate-200 dark:text-white/10 italic">
                VS
              </div>
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-24 h-24 rounded-full border-4 border-white/10" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-20" />
            </div>
          </div>
          {/* Mini chart in lane duel */}
          <div className="h-32 w-full border-t border-white/5 pt-4">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        </div>

        {/* Build Timeline Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="w-full h-24 bg-slate-900/5 dark:bg-white/[0.02] rounded-xl border border-dashed border-slate-200 dark:border-white/10 flex items-center px-4 gap-4 overflow-hidden">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <Skeleton key={i} className="w-10 h-10 rounded-lg shrink-0" />
            ))}
          </div>
        </div>

        {/* Panorama Global Title */}
        <div className="flex items-center gap-3 pt-4">
          <Skeleton className="h-3 w-32 uppercase tracking-widest" />
          <div className="h-px bg-slate-200 dark:bg-white/20 flex-1" />
        </div>

        {/* Graphs Grid (Gold & XP) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-white/5 p-4 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ))}
        </div>

        {/* Damage Chart Skeleton */}
        <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-6 space-y-8">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[0, 1].map((teamIdx) => (
              <div key={teamIdx} className="space-y-6">
                <div className="flex items-center justify-between border-b dark:border-slate-800 pb-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="grid grid-cols-[1fr,1.5fr] gap-4">
                  <div className="flex justify-center items-center">
                    <Skeleton className="w-32 h-32 rounded-full border-[10px] border-white/5" />
                  </div>
                  <div className="space-y-4">
                    {[0, 1, 2, 3, 4].map((pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2">
                        <Skeleton className="w-8 h-8 rounded shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between">
                            <Skeleton className="h-2 w-16" />
                            <Skeleton className="h-2 w-8" />
                          </div>
                          <Skeleton className="h-1 w-full rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tactical Map Skeleton */}
        <div className="bg-white/40 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex justify-center pb-4">
            <Skeleton className="w-96 h-96 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
