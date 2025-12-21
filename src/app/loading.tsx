import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-4 space-y-12">
        {/* Noticias destacadas skeleton */}
        <div className="space-y-6 mb-12">
          <Skeleton className="h-96 w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Banner skeleton */}
            <div className="flex justify-center">
              <Skeleton className="h-[90px] w-full max-w-2xl rounded-lg" />
            </div>

            {/* Foro skeleton */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48 rounded" />
                <Skeleton className="h-8 w-32 rounded" />
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-5 w-3/4 rounded" />
                      <Skeleton className="h-20 w-full rounded" />
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-12 rounded" />
                        <Skeleton className="h-4 w-12 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Skeleton className="h-[600px] w-full rounded-xl hidden lg:block" />
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <Skeleton className="h-[250px] w-full rounded-xl hidden lg:block" />
          </div>
        </div>
      </div>
    </div>
  );
}
