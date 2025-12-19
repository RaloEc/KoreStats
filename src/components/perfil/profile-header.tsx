"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { ConnectedAccounts } from "./ConnectedAccounts";

interface ProfileHeaderProps {
  perfil: {
    id: string;
    username: string;
    role: "user" | "admin" | "moderator";
    avatar_url: string;
    color: string;
    banner_url?: string;
    followers_count?: number;
    following_count?: number;
    friends_count?: number;
    connected_accounts?: Record<string, string>;
  };
  riotTier?: string | null;
  riotRank?: string | null;
  riotAccount?: any;
  onEditClick: () => void;
}

export default function ProfileHeader({
  perfil,
  riotTier,
  riotRank,
  riotAccount,
  onEditClick,
}: ProfileHeaderProps) {
  const [bannerError, setBannerError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return { variant: "destructive" as const, label: "Administrador" };
      case "moderator":
        return { variant: "secondary" as const, label: "Moderador" };
      default:
        return { variant: "default" as const, label: "Usuario" };
    }
  };

  const roleBadge = getRoleBadge(perfil.role);

  const colorStyle = {
    "--user-color": perfil.color || "#3b82f6",
  } as CSSProperties;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg dark:border-gray-800">
      {/* Banner */}
      <div
        className="relative h-32 sm:h-40 md:h-48 w-full bg-gradient-to-r dark:bg-gradient-to-r dark:from-gray-900 dark:to-gray-800"
        style={{
          backgroundImage:
            perfil.banner_url && !bannerError
              ? undefined
              : `linear-gradient(135deg, color-mix(in srgb, var(--user-color) 20%, transparent), color-mix(in srgb, var(--user-color) 10%, transparent))`,
          ...colorStyle,
        }}
      >
        {perfil.banner_url && !bannerError ? (
          <Image
            src={perfil.banner_url}
            alt={`Banner de ${perfil.username}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px"
            className="object-cover transition-opacity duration-300"
            priority
            quality={75}
            onError={() => setBannerError(true)}
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
          />
        ) : null}
      </div>

      <CardContent className="px-4 sm:px-6 py-6">
        {/* Layout: Centrado en mobile, lado a lado en desktop */}
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 md:items-start">
          {/* Avatar, nombre y rol - Centrado en mobile */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0 w-full md:w-auto">
            <div className="relative w-fit">
              <Avatar
                className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 border-3 border-background dark:border-gray-950 shadow-md -mt-20 sm:-mt-24 md:-mt-28"
                style={{
                  borderColor: `color-mix(in srgb, var(--user-color) 30%, white)`,
                  ...colorStyle,
                }}
              >
                {!avatarError ? (
                  <AvatarImage
                    src={perfil.avatar_url}
                    alt={perfil.username}
                    onError={() => setAvatarError(true)}
                  />
                ) : null}
                <AvatarFallback
                  className="text-lg sm:text-2xl md:text-3xl font-bold"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--user-color) 15%, transparent)`,
                    color: `var(--user-color)`,
                    ...colorStyle,
                  }}
                >
                  {perfil.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex flex-col items-center gap-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-center">
                {perfil.username}
              </h1>
              {perfil.role !== "user" && (
                <Badge
                  variant={roleBadge.variant}
                  className="text-xs inline-flex justify-center"
                  style={{
                    backgroundColor:
                      roleBadge.variant === "default"
                        ? `color-mix(in srgb, var(--user-color) 20%, transparent)`
                        : undefined,
                    color:
                      roleBadge.variant === "default"
                        ? `var(--user-color)`
                        : undefined,
                    ...colorStyle,
                  }}
                >
                  {roleBadge.label}
                </Badge>
              )}
            </div>
          </div>

          {/* Separador */}
          <div
            className="hidden md:block flex-1 min-w-[160px]"
            aria-hidden="true"
          />

          {/* Contenido principal - Centrado en mobile, derecha en desktop */}
          <div className="flex-grow md:flex-none md:w-fit md:min-w-[240px]">
            {/* Contadores y botón de editar */}
            <div className="flex flex-col items-center md:items-end gap-3 mb-3 w-full md:w-auto">
              {/* Contadores */}
              <div className="flex gap-4 md:gap-6 text-xs sm:text-sm justify-center">
                <div className="text-center">
                  <div className="font-bold text-foreground text-sm sm:text-base">
                    {perfil.followers_count ?? 0}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    seguidores
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-foreground text-sm sm:text-base">
                    {perfil.following_count ?? 0}
                  </div>
                  <div className="text-muted-foreground text-xs">siguiendo</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-foreground text-sm sm:text-base">
                    {perfil.friends_count ?? 0}
                  </div>
                  <div className="text-muted-foreground text-xs">amigos</div>
                </div>
              </div>

              {/* Botón de editar */}
              <Button
                variant="outline"
                size="default"
                className="gap-2 w-full sm:w-auto px-4 py-2 h-auto min-h-10"
                onClick={onEditClick}
                style={{
                  borderColor: `color-mix(in srgb, var(--user-color) 30%, transparent)`,
                  color: `var(--user-color)`,
                  ...colorStyle,
                }}
              >
                <Edit className="w-4 h-4" />
                <span className="text-sm sm:text-base">Editar Perfil</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Cuentas Conectadas - Temporalmente oculto */}
        {/* <div className="mt-6 pt-6 border-t">
          <ConnectedAccounts
            accounts={perfil.connected_accounts || {}}
            isOwnProfile={true}
            userColor={perfil.color}
            riotAccount={riotAccount}
          />
        </div> */}
      </CardContent>
    </Card>
  );
}
