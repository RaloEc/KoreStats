"use client";

import type { CSSProperties } from "react";
import { Card, CardBody, CardHeader } from "@nextui-org/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFriendRequests,
  useRespondFriendRequestMutation,
} from "@/hooks/useSocialFeatures";
import { Check, X, Mail } from "lucide-react";
import Link from "next/link";

interface FriendRequestsListProps {
  userColor?: string;
  hideHeader?: boolean;
}

export const FriendRequestsList = ({
  userColor = "#3b82f6",
  hideHeader = false,
}: FriendRequestsListProps) => {
  const { data: receivedData, isLoading: receivedLoading } =
    useFriendRequests("received");
  const respondMutation = useRespondFriendRequestMutation();

  const colorStyle = {
    "--user-color": userColor,
  } as CSSProperties;

  const handleRespond = (requestId: string, action: "accept" | "reject") => {
    respondMutation.mutate({ requestId, action });
  };

  const RequestItem = ({ request }: { request: any }) => {
    const otherUser = request.other_user;

    return (
      <div className="flex items-center gap-2 py-2 px-1 hover:bg-gray-100 dark:hover:bg-gray-800 amoled:hover:bg-gray-800 rounded-md transition-colors group">
        <Link href={`/perfil/${otherUser.public_id}`} className="flex-shrink-0">
          <Avatar className="w-10 h-10 cursor-pointer hover:scale-105 transition-transform">
            <AvatarImage src={otherUser.avatar_url || undefined} />
            <AvatarFallback
              style={{
                backgroundColor: `color-mix(in srgb, ${
                  otherUser.color || userColor
                } 15%, transparent)`,
                color: otherUser.color || userColor,
              }}
            >
              {otherUser.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        <Link
          href={`/perfil/${otherUser.public_id}`}
          className="flex-1 min-w-0 font-medium text-sm hover:underline truncate text-gray-900 dark:text-gray-100 amoled:text-gray-100"
        >
          {otherUser.username}
        </Link>

        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleRespond(request.id, "accept")}
            disabled={respondMutation.isPending}
            className="h-7 w-7 p-0 hover:bg-green-500/20"
            title="Aceptar"
          >
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleRespond(request.id, "reject")}
            disabled={respondMutation.isPending}
            className="h-7 w-7 p-0 hover:bg-red-500/20"
            title="Rechazar"
          >
            <X className="w-4 h-4 text-red-600 dark:text-red-400" />
          </Button>
        </div>
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="space-y-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-2">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-7 w-7" />
        </div>
      ))}
    </div>
  );

  if (receivedLoading) {
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
              <Mail className="w-5 h-5" />
              Solicitudes de amistad
            </h2>
          </CardHeader>
        )}
        <CardBody className={hideHeader ? "p-0" : ""}>
          <LoadingSkeleton />
        </CardBody>
      </Card>
    );
  }

  const hasRequests = (receivedData?.requests?.length ?? 0) > 0;

  if (!hasRequests) {
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
            <Mail className="w-5 h-5" />
            Solicitudes de amistad ({receivedData?.total || 0})
          </h2>
        </CardHeader>
      )}
      <CardBody className={`space-y-1 ${hideHeader ? "p-0" : ""}`}>
        {receivedData?.requests.map((request) => (
          <RequestItem key={request.id} request={request} />
        ))}
      </CardBody>
    </Card>
  );
};
