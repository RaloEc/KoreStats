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

interface PublicProfileClientProps {
  profile: PublicProfileFull;
}

export default function PublicProfileClient({
  profile,
}: PublicProfileClientProps) {
  const { user, profile: profileData } = useAuth();
  // Adaptamos los datos para que encajen en la interfaz que espera ProfileLolTabContent
  const riotAccountAdapter = {
    id: "public-profile",
    user_id: "system",
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

            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-[10px] md:text-sm font-bold">
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
              userId="public"
              isOwnProfile={false}
              unifiedSyncPending={false}
              unifiedSyncCooldown={0}
              showChampionStats={false}
              isPublicProfile={true}
              onInvalidateCache={async () => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
