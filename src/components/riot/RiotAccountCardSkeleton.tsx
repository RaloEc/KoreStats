"use client";

/**
 * Skeleton UI para RiotAccountCard
 * Muestra un placeholder mientras se carga la información
 */
export function RiotAccountCardSkeleton() {
  return (
    <div className="w-full">
      {/* Main Card */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300/50 dark:border-white/5 shadow-2xl bg-slate-100/50 dark:bg-slate-900/40 backdrop-blur-sm">
        <div className="p-6 md:p-8 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-stretch w-full">
            <div className="flex flex-col md:flex-row items-center gap-6 flex-1 w-full">
              {/* Left: Profile Icon Skeleton */}
              <div className="relative flex-shrink-0">
                <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-[3px] border-slate-300/70 dark:border-white/5 bg-slate-300 dark:bg-slate-800 animate-pulse" />
              </div>

              {/* Middle: Info Skeleton */}
              <div className="flex-1 text-center md:text-left space-y-4 min-w-0 w-full flex flex-col justify-center">
                {/* Name skeleton */}
                <div className="space-y-2 flex flex-col items-center md:items-start">
                  <div className="h-10 bg-slate-300 dark:bg-slate-800 rounded-lg w-64 animate-pulse" />
                  <div className="h-4 bg-slate-300 dark:bg-slate-800 rounded-lg w-32 animate-pulse opacity-50" />
                </div>

                {/* Winrate bar skeleton */}
                <div className="max-w-[280px] w-full mx-auto md:mx-0 bg-slate-200 dark:bg-slate-800/20 border-2 border-slate-300 dark:border-white/5 p-3 rounded-xl animate-pulse">
                  <div className="h-2 bg-slate-300 dark:bg-slate-800 rounded w-full mb-3" />
                  <div className="h-1.5 bg-slate-400 dark:bg-slate-800 rounded w-full" />
                </div>
              </div>
            </div>

            {/* Right: Queue Rankings Skeleton */}
            <div className="grid grid-cols-2 gap-3 w-full lg:w-auto lg:min-w-[400px]">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800/40 p-4 flex flex-col items-center text-center gap-2 animate-pulse"
                >
                  <div className="h-3 bg-slate-300 dark:bg-slate-800 rounded w-20 mb-2" />
                  <div className="w-28 h-28 md:w-32 md:h-32 bg-slate-300 dark:bg-slate-800 rounded-lg shadow-inner" />
                  <div className="space-y-1.5 w-full mt-2">
                    <div className="h-4 bg-slate-300 dark:bg-slate-800 rounded w-24 mx-auto" />
                    <div className="h-3 bg-slate-400 dark:bg-slate-800 rounded w-16 mx-auto opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions Skeleton */}
      <div className="mt-4 px-2 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="space-y-1.5">
            <div className="h-2 bg-slate-300 dark:bg-slate-800 rounded w-24 animate-pulse opacity-30" />
            <div className="h-3 bg-slate-300 dark:bg-slate-800 rounded w-32 animate-pulse opacity-60" />
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="h-10 bg-slate-300 dark:bg-slate-800 rounded-xl w-full sm:w-32 animate-pulse" />
          <div className="h-10 bg-slate-300 dark:bg-slate-800 rounded-xl w-10 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
