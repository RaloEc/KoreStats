"use client";

import { useMemo } from "react";
import { normalizeAvatarUrl } from "@/lib/utils/avatar-utils";
import { SupabaseImage } from "@/components/ui/SupabaseImage";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  color?: string;
  borderColor?: string;
  sizes?: string;
}

const generateColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 270;
  return `hsl(${h}, 70%, 40%)`;
};

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function UserAvatar({
  username,
  avatarUrl,
  size = "md",
  className = "",
  color,
  borderColor,
  sizes,
}: UserAvatarProps) {
  const initials = getInitials(username || "");
  const avatarColor = useMemo(() => {
    if (color) return color;
    if (!username) return "#3b82f6";
    return generateColor(username || "user");
  }, [username, color]);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const avatarStyle = {
    backgroundColor: !avatarUrl ? avatarColor : undefined,
    ...(borderColor && {
      borderColor,
      borderStyle: "solid",
      borderWeight: "2px",
    }),
  };

  const normalizedUrl = normalizeAvatarUrl(avatarUrl);

  if (normalizedUrl) {
    return (
      <div
        className={cn(
          `${sizeClasses[size]} relative rounded-full overflow-hidden flex-shrink-0 border-2 border-border/10`,
          className,
        )}
        style={borderColor ? { borderColor } : {}}
      >
        <SupabaseImage
          src={normalizedUrl}
          alt={username}
          fill
          className="object-cover !m-0 !p-0"
          sizes={
            sizes || (size === "sm" ? "32px" : size === "md" ? "40px" : "48px")
          }
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        `${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`,
        className,
      )}
      style={avatarStyle}
    >
      {initials}
    </div>
  );
}
