"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  ExternalLink,
  Clock,
  Newspaper,
  MessageSquare,
  MessageCircle,
  Trophy,
  EyeOff,
} from "lucide-react";
import React from "react";
import {
  SharedMatchCard,
  SharedMatchData,
} from "@/components/perfil/shared-match-card";
import { ActivityCardMenu } from "@/components/perfil/ActivityCardMenu";

interface ActivityItem {
  id: string;
  type:
    | "noticia"
    | "comentario"
    | "hilo"
    | "respuesta"
    | "lol_match"
    | "weapon";
  title: string;
  preview?: string;
  timestamp: string;
  category: string;
  matchId?: string;
  championName?: string;
  role?: string;
  win?: boolean;
  kda?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  // Campos extendidos para lol_match
  entryId?: string;
  championId?: number;
  lane?: string;
  totalCS?: number;
  csPerMin?: number;
  visionScore?: number;
  damageToChampions?: number;
  damageToTurrets?: number;
  goldEarned?: number;
  items?: number[];
  summoner1Id?: number;
  summoner2Id?: number;
  perkPrimaryStyle?: number;
  perkSubStyle?: number;
  rankingPosition?: number | null;
  performanceScore?: number | null;
  queueId?: number;
  gameDuration?: number;
  gameCreation?: number;
  dataVersion?: string;
  tier?: string | null;
  rank?: string | null;
  leaguePoints?: number;
  rankWins?: number;
  rankLosses?: number;
  comment?: string | null;
  perks?: SharedMatchData["perks"];
  gifUrl?: string;
  content?: string;
  // Datos de equipo para comparativas
  teamTotalDamage?: number;
  teamTotalGold?: number;
  teamTotalKills?: number;
  teamAvgDamageToChampions?: number;
  teamAvgGoldEarned?: number;
  teamAvgKillParticipation?: number;
  teamAvgVisionScore?: number;
  teamAvgCsPerMin?: number;
  teamAvgDamageToTurrets?: number;
  objectivesStolen?: number;
  // Campos extra para nuevos badges
  pentaKills?: number;
  quadraKills?: number;
  tripleKills?: number;
  doubleKills?: number;
  firstBloodKill?: boolean;
  totalTimeCCDealt?: number;
  soloKills?: number;
  turretPlatesTaken?: number;
  earlyLaningPhaseGoldExpAdvantage?: number;
  goldDeficit?: number;
  // Todos los jugadores del match
  allPlayers?: Array<{
    championName: string;
    championId: number;
    summonerName: string;
    kills: number;
    deaths: number;
    assists: number;
    kda: number;
    role: string;
    team: "blue" | "red";
  }>;
}

interface UserActivityFeedProps {
  items: ActivityItem[];
  userColor?: string;
  isLoading?: boolean;
  isAdmin?: boolean;
  isOwnProfile?: boolean;
  hiddenIds?: Set<string>;
  onHideItem?: (id: string) => void;
  onUnhideItem?: (id: string) => void;
  filter?: "all" | "hilos" | "respuestas" | "partidas" | "armas";
  userId?: string;
}

export const UserActivityFeed = ({
  items,
  userColor = "#3b82f6",
  isLoading = false,
  isAdmin = false,
  isOwnProfile = true,
  hiddenIds = new Set<string>(),
  onHideItem,
  onUnhideItem,
  filter = "all",
  userId,
}: UserActivityFeedProps) => {
  const colorStyle = {
    "--user-color": userColor,
  } as React.CSSProperties;

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diferencia = ahora.getTime() - date.getTime();
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

    if (dias === 0) return "Hoy";
    if (dias === 1) return "Ayer";
    if (dias < 7) return `Hace ${dias} días`;
    if (dias < 30) return `Hace ${Math.floor(dias / 7)} semanas`;

    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "noticia":
        return (
          <Newspaper
            className="w-5 h-5 flex-shrink-0"
            style={{ color: `var(--user-color)`, ...colorStyle }}
          />
        );
      case "comentario":
        return (
          <MessageCircle
            className="w-5 h-5 flex-shrink-0"
            style={{ color: `var(--user-color)`, ...colorStyle }}
          />
        );
      case "hilo":
        return (
          <Newspaper
            className="w-5 h-5 flex-shrink-0"
            style={{ color: `var(--user-color)`, ...colorStyle }}
          />
        );
      case "respuesta":
        return (
          <MessageCircle
            className="w-5 h-5 flex-shrink-0"
            style={{ color: `var(--user-color)`, ...colorStyle }}
          />
        );
      case "lol_match":
        return (
          <Trophy
            className="w-5 h-5 flex-shrink-0"
            style={{ color: `var(--user-color)`, ...colorStyle }}
          />
        );
      default:
        return null;
    }
  };

  const getLink = (item: ActivityItem) => {
    switch (item.type) {
      case "noticia":
        return `/noticias/${item.id.replace("noticia-", "")}`;
      case "comentario":
        return `/noticias`;
      case "hilo":
        return `/foro/hilos/${item.id.replace("hilo-", "")}`;
      case "respuesta":
        return `/foro`;
      case "lol_match":
        return item.matchId ? `/match/${item.matchId}` : "#";
      default:
        return "#";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="dark:border-gray-800">
            <CardContent className="p-4 sm:p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="transition-shadow hover:shadow-lg dark:border-gray-800">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Sin actividad reciente</p>
        </CardContent>
      </Card>
    );
  }

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (filter === "all") return true;
      if (filter === "hilos") return item.type === "hilo";
      if (filter === "respuestas")
        return item.type === "respuesta" || item.type === "comentario";
      if (filter === "partidas") return item.type === "lol_match";
      if (filter === "armas") return item.type === "weapon";
      return true;
    });
  }, [items, filter]);

  return (
    <div className="space-y-4">
      {filteredItems.map((item) => {
        const matchHiddenKey =
          item.type === "lol_match" && item.matchId
            ? `match-${item.matchId}`
            : null;
        const isHidden =
          hiddenIds.has(item.id) ||
          (matchHiddenKey ? hiddenIds.has(matchHiddenKey) : false);

        if (item.type === "lol_match") {
          const matchData: SharedMatchData = {
            entryId: item.entryId || item.id.replace("lol_match-", ""),
            matchId: item.matchId || "",
            championId: item.championId || 0,
            championName: item.championName || "Desconocido",
            role: item.role || "Unknown",
            lane: item.lane || item.role || "Unknown",
            kda: item.kda || 0,
            kills: item.kills || 0,
            deaths: item.deaths || 0,
            assists: item.assists || 0,
            totalCS: item.totalCS || 0,
            csPerMin: item.csPerMin || 0,
            visionScore: item.visionScore || 0,
            damageToChampions: item.damageToChampions || 0,
            damageToTurrets: item.damageToTurrets || 0,
            goldEarned: item.goldEarned || 0,
            items: item.items || [0, 0, 0, 0, 0, 0, 0],
            summoner1Id: item.summoner1Id || 0,
            summoner2Id: item.summoner2Id || 0,
            perkPrimaryStyle: item.perkPrimaryStyle || 0,
            perkSubStyle: item.perkSubStyle || 0,
            rankingPosition: item.rankingPosition || null,
            performanceScore: item.performanceScore || null,
            result: item.win ? "win" : "loss",
            queueId: item.queueId || 0,
            gameDuration: item.gameDuration || 0,
            gameCreation: item.gameCreation || 0,
            dataVersion: item.dataVersion || "14.23.1",
            tier: item.tier || null,
            rank: item.rank || null,
            leaguePoints: item.leaguePoints || 0,
            rankWins: item.rankWins || 0,
            rankLosses: item.rankLosses || 0,
            comment: item.comment || null,
            created_at: item.timestamp,
            perks: item.perks,
            // Datos de equipo para comparativas
            teamTotalDamage: item.teamTotalDamage || 0,
            teamTotalGold: item.teamTotalGold || 0,
            teamTotalKills: item.teamTotalKills || 0,
            teamAvgDamageToChampions: item.teamAvgDamageToChampions,
            teamAvgGoldEarned: item.teamAvgGoldEarned,
            teamAvgKillParticipation: item.teamAvgKillParticipation,
            teamAvgVisionScore: item.teamAvgVisionScore,
            teamAvgCsPerMin: item.teamAvgCsPerMin,
            teamAvgDamageToTurrets: item.teamAvgDamageToTurrets,
            objectivesStolen: item.objectivesStolen || 0,
            // Nuevos campos para badges
            pentaKills: item.pentaKills,
            quadraKills: item.quadraKills,
            tripleKills: item.tripleKills,
            doubleKills: item.doubleKills,
            firstBloodKill: item.firstBloodKill,
            totalTimeCCDealt: item.totalTimeCCDealt,
            soloKills: item.soloKills,
            turretPlatesTaken: item.turretPlatesTaken,
            earlyLaningPhaseGoldExpAdvantage:
              item.earlyLaningPhaseGoldExpAdvantage,
            goldDeficit: item.goldDeficit,
            // Todos los jugadores del match
            allPlayers: item.allPlayers,
          };

          return (
            <SharedMatchCard
              key={item.id}
              partida={matchData}
              userColor={userColor}
              isAdmin={isAdmin}
              isOwnProfile={isOwnProfile}
              isHidden={isHidden}
              onHide={() => onHideItem?.(item.id)}
              onUnhide={() => onUnhideItem?.(item.id)}
              userId={userId}
            />
          );
        }

        return (
          <Card
            key={item.id}
            className={`transition-shadow hover:shadow-lg dark:border-gray-800 overflow-hidden ${
              isHidden ? "opacity-60" : ""
            }`}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-3">
                {/*
                  ID para backend sin prefijos (hilo-, respuesta-, comentario-, noticia-).
                  Evita que el endpoint /user-activity/hide falle y así podemos marcar como oculto.
                */}
                {/*
                  Nota: mantenemos item.id (con prefijo) para marcar UI hiddenIds,
                  pero enviamos backendActivityId al menú de acciones.
                */}
                {(() => {
                  return null;
                })()}
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="flex-grow min-w-0">
                    <Link href={getLink(item)} className="group">
                      <h3 className="text-base sm:text-lg font-semibold group-hover:underline line-clamp-2 text-foreground">
                        {item.title}
                      </h3>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span
                        className="inline-block text-xs px-2 py-1 rounded-full text-foreground"
                        style={{
                          backgroundColor: `color-mix(in srgb, var(--user-color) 15%, transparent)`,
                          color: `var(--user-color)`,
                          ...colorStyle,
                        }}
                      >
                        {item.category}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatearFecha(item.timestamp)}
                      </span>
                      {isHidden && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-500/15 border border-amber-200/70 dark:border-amber-500/30 rounded-full px-2 py-0.5">
                          <EyeOff className="w-3 h-3" /> Oculto para ti
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getIcon(item.type)}
                    {/*
                      Normalizamos el ID para el backend quitando prefijos conocidos.
                    */}
                    {(() => {
                      const backendActivityId = item.id.replace(
                        /^(hilo|respuesta|comentario|noticia|lol_match)-/,
                        ""
                      );
                      return (
                        <ActivityCardMenu
                          activityType={
                            item.type === "hilo"
                              ? "forum_thread"
                              : item.type === "respuesta"
                              ? "forum_post"
                              : item.type === "comentario"
                              ? "forum_post"
                              : item.type === "noticia"
                              ? "noticia"
                              : "forum_post"
                          }
                          activityId={backendActivityId}
                          isOwnProfile={isOwnProfile}
                          isAdmin={isAdmin}
                          onHide={() => onHideItem?.(item.id)}
                          onUnhide={() => onUnhideItem?.(item.id)}
                          onDelete={() => onHideItem?.(item.id)}
                          isHidden={isHidden}
                        />
                      );
                    })()}
                  </div>
                </div>

                {/* Contenido enriquecido (solo hilos) o preview */}
                {item.type === "hilo" && item.content ? (
                  <div className="relative">
                    <div className="prose prose-sm dark:prose-invert max-h-64 overflow-hidden">
                      <div
                        className="text-sm leading-relaxed space-y-2"
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
                  </div>
                ) : item.preview ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.preview}
                  </p>
                ) : null}

                {/* GIF adjunto */}
                {item.gifUrl && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5 p-2 flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.gifUrl}
                      alt="GIF adjunto"
                      className="max-h-60 w-full h-auto object-contain"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Link */}
                {/* <div className="pt-2 border-t dark:border-gray-700">
                  <Link
                    href={getLink(item)}
                    className="flex items-center gap-1 text-xs hover:underline"
                    style={{
                      color: `var(--user-color)`,
                      ...colorStyle,
                    }}
                  >
                    Ver másaaaaaaaa
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div> */}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default UserActivityFeed;
