"use client";

import ProfileLolTabContent from "@/components/perfil/ProfileLolTabContent";
import { PublicProfileFull } from "@/lib/public-profiles/server-data";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import {
  Twitter,
  Twitch,
  Youtube,
  Instagram,
  BadgeCheck,
  Swords,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { EditPublicProfileDialog } from "./EditPublicProfileDialog";
import TwitchLivePlayer from "./TwitchLivePlayer";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface PublicProfileClientProps {
  profile: PublicProfileFull;
}

export default function PublicProfileClient({
  profile,
}: PublicProfileClientProps) {
  const { user, profile: profileData } = useAuth();
  const { toast } = useToast();
  const [isSyncingPublic, setIsSyncingPublic] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsFollowLoading(false);
      return;
    }

    const checkFollowStatus = async () => {
      try {
        const res = await fetch(`/api/pro-profiles/follow?userId=${user.id}&proProfileId=${profile.id}`);
        const data = await res.json();
        if (data.isFollowing) setIsFollowing(true);
      } catch (err) {
        console.error("Error checking follow status:", err);
      } finally {
        setIsFollowLoading(false);
      }
    };

    checkFollowStatus();
  }, [user, profile.id]);

  const handleToggleFollow = async () => {
    if (!user) {
      toast({
        title: "Inicia Sesión",
        description: "Necesitas iniciar sesión para seguir a un jugador.",
        variant: "destructive",
      });
      return;
    }

    setIsFollowLoading(true);
    try {
      const action = isFollowing ? "unfollow" : "follow";
      const res = await fetch("/api/pro-profiles/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, proProfileId: profile.id, action }),
      });

      if (!res.ok) throw new Error("Error al modificar seguimiento");

      setIsFollowing(!isFollowing);
      toast({
        title: isFollowing ? "Dejaste de seguir" : "Siguiendo",
        description: isFollowing
          ? `Ya no sigues a ${profile.display_name}.`
          : `Ahora sigues a ${profile.display_name}.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Hubo un problema al procesar tu solicitud.",
        variant: "destructive",
      });
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handlePublicSync = async () => {
    if (isSyncingPublic) return;
    setIsSyncingPublic(true);
    try {
      const res = await fetch("/api/riot/account/public/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }), // The public profile ID is the user_id in linked_accounts_riot
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al sincronizar");
      }

      toast({
        title: "Actualizado",
        description: "El perfil se ha actualizado correctamente.",
      });

      // Refrescar para obtener los nuevos datos
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      return data;
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e.message || "No se pudo actualizar el perfil",
        variant: "destructive",
      });
      throw e;
    } finally {
      setIsSyncingPublic(false);
    }
  };

  // Adaptamos los datos para que encajen en la interfaz que espera ProfileLolTabContent
  const riotAccountAdapter = {
    id: "public-profile",
    user_id: profile.id,
    // IMPORTANTE: Mostramos el nombre de invocador real en la tarjeta de Riot
    game_name: profile.summoner?.summoner_name || profile.display_name,
    tag_line: "",
    puuid: profile.puuid,
    summoner_id: "hidden",
    profile_icon_id: profile.summoner?.profile_icon_id || 29,
    summoner_level: profile.summoner?.summoner_level || 1,
    tier: profile.summoner?.tier || undefined,
    rank: profile.summoner?.rank || undefined,
    lp: profile.summoner?.league_points || 0,
    wins: profile.summoner?.wins || 0,
    losses: profile.summoner?.losses || 0,
    region: profile.region || "la1",
    active_shard: profile.region || "la1",
    league_points: profile.summoner?.league_points || 0,
    last_match_sync: new Date().toISOString(),
    last_rank_sync: profile.summoner?.updated_at || new Date().toISOString(),
    last_updated: profile.summoner?.updated_at || new Date().toISOString(),
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    access_token: "",
    refresh_token: "",
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header Personalizado para Pros - Ultra Compacto */}
      <div className="relative w-full h-40 md:h-48 bg-slate-100 dark:bg-slate-900 overflow-hidden border-b border-border transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/5 dark:to-black/20 z-10" />

        {/* Banner Splash Dinámico */}
        <div className="absolute inset-0 opacity-20 dark:opacity-40 transition-opacity duration-300">
          <div
            className="w-full h-full bg-cover bg-center filter grayscale blur-sm scale-110"
            style={{
              backgroundImage: `url('https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${(
                profile.most_played_champion || "Azir"
              ).replace(/\s+/g, "")}_0.jpg')`,
            }}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-20 container mx-auto flex flex-row items-center md:items-end gap-4 md:gap-6">
          {/* Avatar - Compacto */}
          <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full border-2 border-background shadow-2xl overflow-hidden bg-muted flex-shrink-0 transition-colors duration-300">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name}
                fill
                sizes="(max-width: 768px) 80px, 112px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                <Swords size={32} />
              </div>
            )}
          </div>

          {/* Info - Nombre del Jugador (Faker) */}
          <div className="flex-1 mb-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl md:text-4xl font-normal text-foreground tracking-tighter font-unbounded flex items-center gap-2">
                {profile.slug.charAt(0).toUpperCase() +
                  profile.slug.slice(1).toLowerCase()}
                {profile.category === "pro_player" && (
                  <BadgeCheck className="text-blue-500 dark:text-blue-400 w-5 h-5 md:w-7 md:h-7" />
                )}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-[0.625rem] md:text-sm font-bold">
              {profile.team_name && (
                <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-foreground border border-border">
                  {profile.team_name}
                </span>
              )}
              <span className="tracking-widest opacity-70 capitalize">
                {profile.category.replace("_", " ")}
              </span>
              {profile.main_role && (
                <span className="flex items-center gap-1 opacity-70">
                  • {profile.main_role}
                </span>
              )}
            </div>
          </div>

          {/* Botón de Seguir */}
          <div className="hidden sm:flex mb-1 ml-auto mr-4">
            <Button
              onClick={handleToggleFollow}
              disabled={isFollowLoading}
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              className={isFollowing ? "bg-white/10 hover:bg-white/20 dark:border-white/20 text-foreground" : "font-bold text-white shadow-lg"}
            >
              {isFollowLoading ? "..." : isFollowing ? "Siguiendo" : `Seguir a ${profile.display_name}`}
            </Button>
          </div>

          <div className="w-full flex sm:hidden justify-end absolute right-4 bottom-[85px] z-30">
            <Button
              onClick={handleToggleFollow}
              disabled={isFollowLoading}
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              className={`rounded-full px-4 h-8 text-[0.625rem] ${isFollowing ? "bg-background/80 hover:bg-background/90" : "font-bold"}`}
            >
              {isFollowLoading ? "..." : isFollowing ? "Siguiendo" : "Seguir"}
            </Button>
          </div>

          {/* Social Links - Compactos */}
          <div className="hidden sm:flex gap-1.5 mb-1">
            {profile.social_links?.twitter && (
              <Link
                href={`https://twitter.com/${profile.social_links.twitter.replace("@", "")}`}
                target="_blank"
                className="p-1.5 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md border border-border transition-all"
              >
                <Twitter
                  size={16}
                  className="text-foreground/70 dark:text-white/70"
                />
              </Link>
            )}
            {profile.social_links?.twitch && (
              <Link
                href={`https://twitch.tv/${profile.social_links.twitch}`}
                target="_blank"
                className="p-1.5 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md border border-border transition-all"
              >
                <Twitch
                  size={16}
                  className="text-foreground/70 dark:text-white/70"
                />
              </Link>
            )}
            {profile.social_links?.youtube && (
              <Link
                href={`https://youtube.com/${profile.social_links.youtube}`}
                target="_blank"
                className="p-1.5 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md border border-border transition-all"
              >
                <Youtube
                  size={16}
                  className="text-foreground/70 dark:text-white/70"
                />
              </Link>
            )}
          </div>

          {/* Admin Edit Button */}
          {user?.id && profileData?.role === "admin" && (
            <div className="mb-1 ml-auto">
              <EditPublicProfileDialog profile={profile} />
            </div>
          )}
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="container mx-auto px-4 py-4 md:py-6 max-w-6xl">
        {/* Stream de Twitch si está en directo */}
        {profile.social_links?.twitch && (
          <TwitchLivePlayer username={profile.social_links.twitch} />
        )}

        <div className="grid grid-cols-1 gap-6">
          <div className="col-span-1">
            <ProfileLolTabContent
              riotAccount={riotAccountAdapter as any}
              userId={profile.id}
              isOwnProfile={false}
              unifiedSyncPending={isSyncingPublic}
              unifiedSyncCooldown={0}
              showChampionStats={false}
              isPublicProfile={true}
              onInvalidateCache={handlePublicSync}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
