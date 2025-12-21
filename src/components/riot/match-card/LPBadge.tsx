"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

interface LPBadgeProps {
  gameId: string | number;
  userId?: string; // Optional: target user ID for public profiles
  className?: string;
  isOwnProfile?: boolean;
}

export function LPBadge({
  gameId,
  userId,
  className,
  isOwnProfile,
}: LPBadgeProps) {
  const { session } = useAuth();

  const { data: lpData, isLoading } = useQuery({
    queryKey: ["lp-snapshot", gameId, userId],
    queryFn: async () => {
      // If we have a target userId, we pass it. If not, API defaults to logged in user.
      const url = new URL("/api/riot/lp/snapshot", window.location.origin);
      url.searchParams.set("gameId", gameId.toString());
      if (userId) {
        url.searchParams.set("userId", userId);
      }

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(url.toString(), { headers });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[LPBadge] Error response:", errorText);
        return null;
      }
      const data = await res.json();
      return data;
    },
    enabled: !!gameId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isLoading) return null;

  if (!lpData?.lpChange) return null;

  const { gained } = lpData.lpChange;

  const isPositive = gained > 0;
  const isZero = gained === 0;

  return (
    <div
      className={`
      inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider
      ${
        isPositive
          ? "text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20"
          : isZero
          ? "text-gray-500 bg-gray-500/10 border border-gray-500/20 dark:text-gray-400 dark:bg-gray-500/10 dark:border-gray-500/20"
          : "text-rose-600 bg-rose-500/10 border border-rose-500/20 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20"
      }
      ${className}
    `}
    >
      {isPositive ? "+" : ""}
      {gained} PL
    </div>
  );
}
