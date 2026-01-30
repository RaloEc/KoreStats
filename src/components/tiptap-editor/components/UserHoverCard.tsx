"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, UserPlus, Users, Check, UserMinus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  useFollowMutation,
  useUnfollowMutation,
} from "@/hooks/useSocialFeatures";
import Image from "next/image";

interface UserHoverCardProps {
  username: string; // Creates a unified interface to pass username
  children: React.ReactNode;
}

interface UserProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  role: string;
  stats: {
    followers: number;
    friends: number;
    hilos: number;
    posts: number;
  };
}

export function UserHoverCard({ username, children }: UserHoverCardProps) {
  const { user: currentUser } = useAuth();
  // Clean username if necessary (remove @)
  const cleanUsername = username.replace(/^@/, "");

  const { data: profile, isLoading } = useQuery<UserProfileData>({
    queryKey: ["user-hover-card", cleanUsername],
    queryFn: async () => {
      const res = await fetch(`/api/perfil/${cleanUsername}/basico`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const { data: socialStatus } = useQuery({
    queryKey: ["social-status", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const res = await fetch(`/api/social/${profile.id}/status`); // Note: API expects publicId usually, check if ID works or we need username. basil path routes usually use username. Let's use cleanUsername for status if publicId is username.
      // Wait, useSocialStatus hook uses publicId.
      // Let's assume username is the public identifier for now or profile.id if API supports it.
      // Actually, safest is to fetch status separately ONLY if we have profile?
      // For now, let's keep it simple. If we want "Follow" button to work, we need status.
      // But we can just use the provided hooks if they export the status logic.
      // We will skip complex status fetching for this specific "hover" optimization task to keep it snappy.
      return null;
    },
    enabled: false, // Disabled for now to prioritize 'basico' speed
  });

  // Quick status Implementation context if needed
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();

  // Since we don't have perfect status without another fetch, we will show "View Profile" primarily,
  // and maybe "Follow" if we can infer it, but let's stick to reading data first.
  // The User asked for INFO (image, banner, name, followers, friends).
  // Buttons are nice-to-have but data is required.

  return (
    <HoverCard openDelay={200} closeDelay={150}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="w-80 p-0 overflow-hidden border-none shadow-xl bg-white dark:bg-[#1a1b1e]"
        side="top"
        align="start"
      >
        {isLoading ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            </div>
          </div>
        ) : profile ? (
          <div className="relative flex flex-col">
            {/* Banner */}
            <div className="relative h-24 w-full bg-gradient-to-r from-blue-400 to-purple-500 overflow-hidden">
              {profile.banner_url && (
                <Image
                  src={profile.banner_url}
                  alt="Banner"
                  fill
                  className="object-cover"
                  sizes="320px"
                />
              )}
            </div>

            {/* Content Container */}
            <div className="px-4 pb-4 -mt-10 relative z-10">
              <div className="flex justify-between items-end">
                {/* Avatar with Border */}
                <div className="relative h-20 w-20 rounded-full border-4 border-white dark:border-[#1a1b1e] bg-white dark:bg-[#1a1b1e] overflow-hidden shadow-sm">
                  <UserAvatar
                    username={profile.username}
                    avatarUrl={profile.avatar_url}
                    size="lg"
                    className="h-full w-full"
                    sizes="80px"
                  />
                </div>

                {/* Basic Actions */}
                <div className="flex gap-2 mb-1">
                  {currentUser?.id !== profile.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      asChild
                    >
                      <Link href={`/perfil/${cleanUsername}`}>Ver perfil</Link>
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <h4 className="text-lg font-bold leading-tight text-gray-900 dark:text-gray-100 flex items-center gap-1">
                  {profile.username}
                  {/* Role Badge could go here */}
                </h4>
                {profile.role !== "user" && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {profile.role}
                  </span>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                    <Users size={14} />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {profile.stats?.followers || 0}
                    </span>
                    <span>seguidores</span>
                  </div>
                  {profile.stats?.friends !== undefined && (
                    <div className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {profile.stats.friends}
                      </span>
                      <span>amigos</span>
                    </div>
                  )}
                </div>

                {/* Bio Preview */}
                {profile.bio && (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-gray-500">
            Usuario no encontrado
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
