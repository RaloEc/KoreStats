"use client";

import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileData } from "@/hooks/use-perfil-usuario";
import {
  UserPlus,
  Mail,
  UserMinus,
  UserCheck,
  Clock,
  Shield,
} from "lucide-react";
import {
  useFollowMutation,
  useUnfollowMutation,
  useSendFriendRequestMutation,
  useRespondFriendRequestMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useSocialStatus,
} from "@/hooks/useSocialFeatures";
import { useAuth } from "@/context/AuthContext";
import { ConnectedAccounts } from "./ConnectedAccounts";
import { ConnectedAccountsModal } from "./ConnectedAccountsModal";
import { normalizeAvatarUrl } from "@/lib/utils/avatar-utils";
import { StatusBadge } from "@/components/status/StatusBadge";

interface PerfilHeaderProps {
  profile: ProfileData;
  riotAccount?: {
    game_name: string;
    tag_line: string;
    solo_tier?: string;
    solo_rank?: string;
    tier?: string;
    rank?: string;
  } | null;
}

export const PerfilHeader = ({ profile, riotAccount }: PerfilHeaderProps) => {
  const [bannerError, setBannerError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);

  const { user } = useAuth();
  const isOwnProfile = user?.id === profile.id;
  const queryClient = useQueryClient();

  // Mutations para funcionalidades sociales
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();
  const sendFriendRequestMutation = useSendFriendRequestMutation();
  const respondFriendRequestMutation = useRespondFriendRequestMutation();
  const blockUserMutation = useBlockUserMutation();
  const unblockUserMutation = useUnblockUserMutation();

  // Obtener estado social del usuario actual con el perfil mostrado
  const { data: socialStatusData, refetch: refetchSocialStatus } =
    useSocialStatus(profile.public_id);

  // Estado local para contadores y flags sociales
  const [socialStats, setSocialStats] = useState({
    followers_count: profile.followers_count ?? 0,
    following_count: profile.following_count ?? 0,
    friends_count: profile.friends_count ?? 0,
    is_following: false,
    friendship_status: "none" as
      | "none"
      | "pending_sent"
      | "pending_received"
      | "friends",
    is_blocked: false,
    friend_request_id: null as string | null,
  });

  // Rastrear el estado anterior de follow para detectar cambios
  const prevFollowingRef = useRef(false);

  useEffect(() => {
    setSocialStats((prev) => ({
      ...prev,
      followers_count: profile.followers_count ?? 0,
      following_count: profile.following_count ?? 0,
      friends_count: profile.friends_count ?? 0,
    }));
  }, [profile.followers_count, profile.following_count, profile.friends_count]);

  // Sincronizar estado social desde la API (solo flags, no contadores)
  useEffect(() => {
    if (socialStatusData) {
      const followingChanged =
        prevFollowingRef.current !== socialStatusData.is_following;

      setSocialStats((prev) => {
        const newStats = {
          ...prev,
          is_following: socialStatusData.is_following,
          friendship_status: socialStatusData.friendship_status,
          is_blocked: socialStatusData.is_blocked,
          friend_request_id: socialStatusData.friend_request_id,
        };

        return newStats;
      });

      // Si el estado de follow cambió, invalidar el perfil para obtener contadores actualizados
      if (followingChanged) {
        prevFollowingRef.current = socialStatusData.is_following;
        // Esperar un poco para que el trigger de BD se ejecute
        setTimeout(() => {
          // Invalidar el query del perfil para que se recargue con contadores correctos
          queryClient.invalidateQueries({
            queryKey: ["perfil", profile.public_id],
          });
        }, 500);
      }
    }
  }, [socialStatusData, profile.public_id, queryClient]);

  // Refrescar estado social cuando cambia el estado de amistad
  useEffect(() => {
    // Si la amistad cambió a 'friends' o cambió de estado, refrescar después de un delay
    if (
      socialStats.friendship_status === "friends" ||
      socialStats.friendship_status === "pending_sent"
    ) {
      const timer = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["social-status", profile.public_id],
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [socialStats.friendship_status, profile.public_id, queryClient]);

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

  const roleBadge = getRoleBadge(profile.role);

  // Handlers para acciones sociales
  const handleFollow = () => {
    if (socialStats.is_following) {
      unfollowMutation.mutate(profile.public_id);
    } else {
      followMutation.mutate(profile.public_id);
    }
  };

  const handleFriendRequest = () => {
    sendFriendRequestMutation.mutate(profile.public_id, {
      onSuccess: () => {
        // Refrescar estado social después de enviar solicitud
        setTimeout(() => {
          refetchSocialStatus();
        }, 500);
      },
    });
  };

  const handleCancelFriendRequest = () => {
    if (socialStats.friend_request_id) {
      respondFriendRequestMutation.mutate(
        { requestId: socialStats.friend_request_id, action: "cancel" },
        {
          onSuccess: () => {
            // Refrescar estado social después de cancelar
            setTimeout(() => {
              refetchSocialStatus();
            }, 500);
          },
        }
      );
    }
  };

  const handleRemoveFriend = () => {
    if (socialStats.friend_request_id) {
      respondFriendRequestMutation.mutate(
        { requestId: socialStats.friend_request_id, action: "reject" },
        {
          onSuccess: () => {
            // Refrescar estado social después de remover
            setTimeout(() => {
              refetchSocialStatus();
            }, 500);
          },
        }
      );
    }
  };

  const handleBlock = () => {
    if (socialStats.is_blocked) {
      unblockUserMutation.mutate(profile.public_id);
    } else {
      blockUserMutation.mutate(profile.public_id);
    }
  };

  // Determinar qué botones mostrar
  const getActionButtons = () => {
    if (isOwnProfile) return null;

    const buttons = [];

    // Botón de seguir/dejar de seguir
    if (!socialStats.is_blocked) {
      buttons.push(
        <Button
          key="follow"
          variant={socialStats.is_following ? "default" : "outline"}
          size="sm"
          className="gap-1"
          onClick={handleFollow}
          disabled={followMutation.isPending || unfollowMutation.isPending}
          style={{
            borderColor: socialStats.is_following
              ? undefined
              : `color-mix(in srgb, var(--user-color) 30%, transparent)`,
            color: socialStats.is_following ? undefined : `var(--user-color)`,
            backgroundColor: socialStats.is_following
              ? `var(--user-color)`
              : undefined,
            ...colorStyle,
          }}
        >
          {socialStats.is_following ? (
            <>
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Siguiendo</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Seguir</span>
            </>
          )}
        </Button>
      );

      // Botón de amistad
      const friendButton = (() => {
        switch (socialStats.friendship_status) {
          case "friends":
            return (
              <Button
                key="friends"
                variant="default"
                size="sm"
                className="gap-1"
                onClick={handleRemoveFriend}
                disabled={respondFriendRequestMutation.isPending}
                title="Click para remover de amigos"
                style={{ backgroundColor: `var(--user-color)`, ...colorStyle }}
              >
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Amigos</span>
              </Button>
            );
          case "pending_sent":
            return (
              <Button
                key="pending"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleCancelFriendRequest}
                disabled={respondFriendRequestMutation.isPending}
                title="Click para cancelar solicitud"
                style={{
                  borderColor: `color-mix(in srgb, var(--user-color) 30%, transparent)`,
                  color: `var(--user-color)`,
                  ...colorStyle,
                }}
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Pendiente</span>
              </Button>
            );
          case "pending_received":
            return (
              <Button
                key="respond"
                variant="default"
                size="sm"
                className="gap-1"
                style={{ backgroundColor: `var(--user-color)`, ...colorStyle }}
                title="Tienes una solicitud de amistad pendiente"
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Responder</span>
              </Button>
            );
          default:
            return (
              <Button
                key="add-friend"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleFriendRequest}
                disabled={sendFriendRequestMutation.isPending}
                style={{
                  borderColor: `color-mix(in srgb, var(--user-color) 30%, transparent)`,
                  color: `var(--user-color)`,
                  ...colorStyle,
                }}
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Agregar</span>
              </Button>
            );
        }
      })();

      buttons.push(friendButton);
    } else {
      // Usuario bloqueado
      buttons.push(
        <Button
          key="unblock"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={handleBlock}
          disabled={unblockUserMutation.isPending}
        >
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Desbloquear</span>
        </Button>
      );
    }

    return buttons;
  };

  // Crear variable CSS para el color personalizado
  const colorStyle = {
    "--user-color": profile.color || "#3b82f6",
  } as CSSProperties;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg dark:border-gray-800">
      {/* Banner */}
      <div
        className="relative h-32 sm:h-40 md:h-48 w-full bg-gradient-to-r dark:bg-gradient-to-r dark:from-gray-900 dark:to-gray-800"
        style={{
          backgroundImage:
            profile.banner_url && !bannerError
              ? undefined
              : `linear-gradient(135deg, color-mix(in srgb, var(--user-color) 20%, transparent), color-mix(in srgb, var(--user-color) 10%, transparent))`,
          ...colorStyle,
        }}
      >
        {profile.banner_url && !bannerError ? (
          <Image
            src={profile.banner_url}
            alt={`Banner de ${profile.username}`}
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
          <div className="flex flex-col items-center gap-3 flex-shrink-0 w-full md:w-auto md:items-start">
            <div className="relative w-fit">
              <Avatar
                className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 border-3 border-background dark:border-gray-950 shadow-md -mt-20 sm:-mt-24 md:-mt-28"
                style={{
                  borderColor: `color-mix(in srgb, var(--user-color) 30%, white)`,
                  ...colorStyle,
                }}
              >
                {!avatarError && normalizeAvatarUrl(profile.avatar_url) ? (
                  <AvatarImage
                    src={normalizeAvatarUrl(profile.avatar_url) || ""}
                    alt={profile.username}
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
                  {profile.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Indicador de estado */}
              <div className="absolute bottom-1 right-1 z-50 bg-white dark:bg-gray-950 rounded-full p-0.5 border border-background dark:border-gray-950 shadow-sm">
                <StatusBadge
                  userId={profile.id}
                  initialStatus="offline"
                  variant="dot"
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-3 justify-center">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-center">
                  {profile.username}
                </h1>
                <div>
                  <StatusBadge
                    userId={profile.id}
                    initialStatus="offline"
                    variant="full"
                    onlyWhenInGame
                    userColor={profile.color}
                  />
                </div>
              </div>
              {profile.role !== "user" && (
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
            {/* Contadores y acciones */}
            <div className="flex flex-col items-center md:items-end gap-3 mb-3">
              {/* Contadores */}
              <div className="flex gap-4 md:gap-6 text-xs sm:text-sm justify-center">
                <div className="text-center">
                  <div className="font-bold text-foreground text-sm sm:text-base">
                    {socialStats.followers_count}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    seguidores
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-foreground text-sm sm:text-base">
                    {socialStats.following_count}
                  </div>
                  <div className="text-muted-foreground text-xs">siguiendo</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-foreground text-sm sm:text-base">
                    {socialStats.friends_count}
                  </div>
                  <div className="text-muted-foreground text-xs">amigos</div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-2 flex-wrap justify-center">
                {getActionButtons()}
              </div>
            </div>

            {/* Biografía */}
            {profile.bio && (
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground text-center line-clamp-2">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Cuentas Conectadas - Temporalmente oculto */}
        {/* <div className="mt-6 pt-6 border-t">
          <ConnectedAccounts
            accounts={profile.connected_accounts || {}}
            isOwnProfile={isOwnProfile}
            userColor={profile.color}
            riotAccount={riotAccount}
          />
        </div> */}
      </CardContent>

      {/* Modal de edición de cuentas */}
      {isOwnProfile && (
        <ConnectedAccountsModal
          isOpen={isAccountsModalOpen}
          onClose={() => setIsAccountsModalOpen(false)}
          userId={profile.id}
          onSave={() => {
            queryClient.invalidateQueries({
              queryKey: ["perfil", profile.public_id],
            });
          }}
        />
      )}
    </Card>
  );
};
