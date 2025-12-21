import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto py-6 sm:py-8 px-3 sm:px-4 max-w-6xl">
        {/* Header Skeleton */}
        <div className="mb-6 sm:mb-8 relative mt-16 sm:mt-24">
          <div className="absolute -top-16 sm:-top-24 left-0 right-0 h-32 sm:h-48 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 animate-pulse" />
          <div className="relative pt-20 sm:pt-28 px-4 sm:px-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
              <Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-black" />
              <div className="flex-1 text-center sm:text-left space-y-2 mb-2">
                <Skeleton className="h-8 w-48 mx-auto sm:mx-0 rounded" />
                <Skeleton className="h-4 w-32 mx-auto sm:mx-0 rounded" />
              </div>
              <div className="flex gap-2 mb-4 sm:mb-2">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="mb-6 sm:mb-8 flex gap-4 border-b border-gray-200 dark:border-gray-800 pb-2">
          <Skeleton className="h-10 w-24 rounded" />
          <Skeleton className="h-10 w-24 rounded" />
          <Skeleton className="h-10 w-24 rounded" />
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>

            {/* Feed Items */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="space-y-4 p-6 border rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
