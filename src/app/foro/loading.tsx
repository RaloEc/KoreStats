import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto px-2 sm:px-3 lg:px-4 py-6 lg:py-8">
      {/* Header Area */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Skeleton className="h-4 w-12" />
          <span>/</span>
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        <Skeleton className="h-5 w-2/3 rounded-lg opacity-60" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-9 space-y-6">
          {/* Subcategories/Stats row */}
          <div className="flex gap-4 overflow-hidden py-1">
            <Skeleton className="h-24 w-40 shrink-0 rounded-xl" />
            <Skeleton className="h-24 w-40 shrink-0 rounded-xl" />
            <Skeleton className="h-24 w-40 shrink-0 rounded-xl" />
          </div>

          {/* Filters Bar */}
          <div className="h-16 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4 flex items-center gap-3">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <div className="flex-1" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>

          {/* Threads List */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex gap-4 bg-white dark:bg-black"
              >
                <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-5 w-24 rounded" />
                  </div>
                  <Skeleton className="h-4 w-full rounded opacity-70" />
                  <div className="flex gap-4 pt-1">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar Column */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6">
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </aside>
      </div>
    </div>
  );
}
