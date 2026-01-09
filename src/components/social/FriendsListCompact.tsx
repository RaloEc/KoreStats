"use client";

import type { CSSProperties } from "react";
import { Card, CardBody, CardHeader } from "@nextui-org/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useFriendsList } from "@/hooks/useFriendsList";
import { Users } from "lucide-react";
import Link from "next/link";

interface FriendsListCompactProps {
  userId: string | null | undefined;
  userColor?: string;
  limit?: number;
  hideHeader?: boolean;
}

export const FriendsListCompact = ({
  userId,
  userColor = "#3b82f6",
  limit = 8,
  hideHeader = false,
}: FriendsListCompactProps) => {
  const { data: friends, isLoading } = useFriendsList(userId, limit);

  const colorStyle = {
    "--user-color": userColor,
  } as CSSProperties;

  if (isLoading) {
    return (
      <Card
        className={`${
          hideHeader
            ? "bg-transparent shadow-none border-none"
            : "bg-white dark:bg-black amoled:bg-black"
        }`}
      >
        {!hideHeader && (
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white amoled:text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Amigos
            </h2>
          </CardHeader>
        )}
        <CardBody className={hideHeader ? "p-0" : ""}>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  const friendsCount = friends?.length ?? 0;

  if (friendsCount === 0) {
    return null;
  }

  return (
    <Card
      className={`${
        hideHeader
          ? "bg-transparent shadow-none border-none"
          : "bg-white dark:bg-black amoled:bg-black"
      }`}
    >
      {!hideHeader && (
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white amoled:text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Amigos ({friendsCount})
          </h2>
        </CardHeader>
      )}
      <CardBody className={hideHeader ? "p-0" : ""}>
        <div className="grid grid-cols-4 gap-3">
          {friends?.map((friend) => (
            <Link
              key={friend.friend_id}
              href={`/perfil/${friend.public_id}`}
              className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 amoled:hover:bg-gray-800 transition-colors group"
              title={friend.username}
            >
              <Avatar className="w-12 h-12 cursor-pointer group-hover:scale-105 transition-transform">
                <AvatarImage src={friend.avatar_url || undefined} />
                <AvatarFallback
                  style={{
                    backgroundColor: `color-mix(in srgb, ${
                      friend.color || userColor
                    } 15%, transparent)`,
                    color: friend.color || userColor,
                  }}
                >
                  {friend.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-center truncate w-full text-gray-900 dark:text-gray-100 amoled:text-gray-100">
                {friend.username}
              </span>
            </Link>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};
