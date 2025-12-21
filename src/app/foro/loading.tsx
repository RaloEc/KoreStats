import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-screen">
      {/* Sidebar skeleton */}
      <div className="lg:w-64 xl:w-72 shrink-0 p-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 rounded" />
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 rounded" />
            <div className="space-y-1">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-4 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-10 w-32 rounded" />
        </div>

        {/* Filters bar */}
        <Skeleton className="h-12 w-full rounded" />

        {/* Threads list */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex gap-4 bg-white dark:bg-gray-900"
            >
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
