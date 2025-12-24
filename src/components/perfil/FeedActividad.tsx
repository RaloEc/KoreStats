"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  ExternalLink,
  MessageSquare,
  Newspaper,
  Clock,
  Eye,
  MessageCircle,
  Image as ImageIcon,
  Code,
  Twitter,
  Youtube,
  AtSign,
  Crosshair,
  Trophy,
  Trash2,
  EyeOff,
} from "lucide-react";
import { ProfileData } from "@/hooks/use-perfil-usuario";
import { WeaponStatsCard } from "@/components/weapon/WeaponStatsCard";
import { SharedMatchCard } from "@/components/perfil/shared-match-card";
import { ActivityCardMenu } from "@/components/perfil/ActivityCardMenu";
import React from "react";

interface FeedActividadProps {
  ultimosHilos: Array<{
    id: string;
    titulo: string;
    contenido: string;
    created_at: string;
    categoria_titulo: string;
    slug?: string;
    vistas: number;
    respuestas: number;
    hasWeaponStats: boolean;
  }>;
  ultimosPosts: ProfileData["ultimosPosts"];
  weaponStatsRecords: ProfileData["weaponStatsRecords"];
  ultimasPartidas?: Array<{
    id: string;
    matchId: string;
    championId: number;
    championName: string;
    role: string;
    lane: string;
    kda: number;
    kills: number;
    deaths: number;
    assists: number;
    totalCS: number;
    csPerMin: number;
    visionScore: number;
    damageToChampions: number;
    damageToTurrets: number;
    goldEarned: number;
    items: number[];
    summoner1Id: number;
    summoner2Id: number;
    perkPrimaryStyle: number;
    perkSubStyle: number;
    rankingPosition: number | null;
    performanceScore: number | null;
    result: "win" | "loss";
    queueId: number;
    gameDuration: number;
    gameCreation: number;
    dataVersion: string;
    tier: string | null;
    rank: string | null;
    leaguePoints: number;
    rankWins: number;
    rankLosses: number;
    comment: string | null;
    created_at: string;
  }>;
  userColor?: string;
  isOwnProfile?: boolean;
  isAdmin?: boolean;
  onMatchDeleted?: () => void;
}

export const FeedActividad = ({
  ultimosHilos,
  ultimosPosts,
  weaponStatsRecords,
  ultimasPartidas,
  userColor = "#3b82f6",
  isOwnProfile = false,
  isAdmin = false,
  onMatchDeleted,
  userId,
}: FeedActividadProps & { userId?: string }) => {
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [hiddenItems, setHiddenItems] = React.useState<Set<string>>(new Set());

  // Debug eliminado

  const handleDeleteMatch = async (entryId: string) => {
    if (
      !confirm("¿Estás seguro de que deseas eliminar esta partida compartida?")
    ) {
      return;
    }

    setDeletingId(entryId);
    try {
      const response = await fetch("/api/user-activity/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al eliminar");
      }

      // Llamar callback para refrescar el feed
      onMatchDeleted?.();
    } catch (error) {
      console.error("[FeedActividad] Error deleting match:", error);
      alert("Error al eliminar la partida");
    } finally {
      setDeletingId(null);
    }
  };

  React.useEffect(() => {
    if (isOwnProfile) {
      const fetchHiddenItems = async () => {
        try {
          const response = await fetch("/api/user-activity/hidden");
          if (response.ok) {
            const { data } = await response.json();
            const hiddenSet = new Set<string>();
            data.forEach(
              (item: { activity_type: string; activity_id: string }) => {
                if (item.activity_type === "lol_match") {
                  hiddenSet.add(`match-${item.activity_id}`);
                } else if (item.activity_type === "forum_thread") {
                  hiddenSet.add(`hilo-${item.activity_id}`);
                } else if (item.activity_type === "forum_post") {
                  hiddenSet.add(`post-${item.activity_id}`);
                } else if (item.activity_type === "weapon_stats") {
                  hiddenSet.add(`weapon-${item.activity_id}`);
                }
              }
            );
            setHiddenItems(hiddenSet);
          }
        } catch (error) {
          console.error("Error fetching hidden items:", error);
        }
      };
      fetchHiddenItems();
    }
  }, [isOwnProfile]);

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

  const getContentIndicators = React.useMemo(() => {
    return (contenido: string) => {
      if (!contenido) {
        return {
          hasCode: false,
          hasTweet: false,
          hasYoutube: false,
          hasImages: false,
          hasMentions: false,
          hasAny: false,
        };
      }

      const hasCode = /<pre|<code/i.test(contenido);
      const hasTweet = /data-type="twitter-embed"/i.test(contenido);
      const hasYoutube =
        /youtube\.com|youtu\.be/i.test(contenido) && /<iframe/i.test(contenido);
      const hasImages = /<img/i.test(contenido);
      const hasMentions = /class="[^"]*editor-mention[^"]*"|@\w+/i.test(
        contenido
      );

      return {
        hasCode,
        hasTweet,
        hasYoutube,
        hasImages,
        hasMentions,
        hasAny: hasCode || hasTweet || hasYoutube || hasImages || hasMentions,
      };
    };
  }, []);

  // Combinar hilos, posts, weapon stats y partidas en un feed unificado
  const feedItems = React.useMemo(() => {
    const items: Array<{
      type: "hilo" | "post" | "weapon" | "lol_match";
      id: string;
      fecha: string;
      data: any;
    }> = [];

    // Agregar hilos
    ultimosHilos?.forEach((hilo) => {
      items.push({
        type: "hilo",
        id: `hilo-${hilo.id}`,
        fecha: hilo.created_at,
        data: hilo,
      });
    });

    // Agregar posts
    ultimosPosts?.forEach((post) => {
      items.push({
        type: "post",
        id: `post-${post.id}`,
        fecha: post.created_at,
        data: post,
      });
    });

    // Agregar weapon stats
    weaponStatsRecords?.forEach((record) => {
      items.push({
        type: "weapon",
        id: `weapon-${record.id}`,
        fecha: record.created_at,
        data: record,
      });
    });

    // Agregar partidas compartidas
    ultimasPartidas?.forEach((partida) => {
      items.push({
        type: "lol_match",
        id: `match-${partida.matchId}`,
        fecha: partida.created_at,
        data: partida,
      });
    });

    // Ordenar por fecha descendente
    const sorted = items.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    return sorted;
  }, [
    ultimosHilos,
    ultimosPosts,
    weaponStatsRecords,
    ultimasPartidas,
    hiddenItems,
  ]);

  const renderHiddenBadge = () => (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-500/15 border border-amber-200/70 dark:border-amber-500/30 rounded-full px-2 py-0.5">
      <EyeOff className="w-3 h-3" /> Oculto para ti
    </span>
  );

  if (feedItems.length === 0) {
    return (
      <Card className="transition-shadow hover:shadow-lg dark:border-gray-800">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Sin actividad reciente</p>
        </CardContent>
      </Card>
    );
  }

  const [filter, setFilter] = React.useState<
    "all" | "hilo" | "post" | "lol_match"
  >("all");

  const filteredItems = React.useMemo(() => {
    if (filter === "all") return feedItems;
    return feedItems.filter((item) => item.type === filter);
  }, [feedItems, filter]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filter === "all"
              ? "bg-slate-900 text-white dark:bg-white dark:text-black"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          }`}
        >
          Todo
        </button>
        <button
          onClick={() => setFilter("hilo")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
            filter === "hilo"
              ? "bg-slate-900 text-white dark:bg-white dark:text-black"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          }`}
        >
          <Newspaper className="w-3.5 h-3.5" />
          Hilos
        </button>
        <button
          onClick={() => setFilter("post")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
            filter === "post"
              ? "bg-slate-900 text-white dark:bg-white dark:text-black"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Respuestas
        </button>
        <button
          onClick={() => setFilter("lol_match")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
            filter === "lol_match"
              ? "bg-slate-900 text-white dark:bg-white dark:text-black"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          Partidas
        </button>
      </div>

      <div className="space-y-4">
        {filteredItems.map((item) => {
          const isHidden = hiddenItems.has(item.id);

          if (item.type === "hilo") {
            const hilo = item.data;
            const contenidoPlano = hilo.contenido.replace(/<[^>]*>/g, "");
            const indicators = getContentIndicators(hilo.contenido);

            return (
              <Card
                key={item.id}
                className={`transition-shadow hover:shadow-lg dark:border-gray-800 overflow-hidden ${
                  isHidden ? "opacity-60" : ""
                }`}
              >
                <CardContent className="p-4 sm:p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-grow min-w-0">
                      <Link
                        href={`/foro/hilos/${hilo.slug || hilo.id}`}
                        className="group"
                      >
                        <h3 className="text-base sm:text-lg font-semibold group-hover:underline line-clamp-2 text-foreground">
                          {hilo.titulo}
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
                          {hilo.categoria_titulo}
                        </span>
                        <span
                          className="text-xs text-muted-foreground flex items-center gap-1"
                          suppressHydrationWarning
                        >
                          <Clock className="w-3 h-3" />
                          {formatearFecha(hilo.created_at)}
                        </span>
                        {isHidden && renderHiddenBadge()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Newspaper
                        className="w-5 h-5"
                        style={{
                          color: `var(--user-color)`,
                          ...colorStyle,
                        }}
                      />
                      <ActivityCardMenu
                        activityType="forum_thread"
                        activityId={hilo.id}
                        isOwnProfile={isOwnProfile}
                        isAdmin={isAdmin}
                        onHide={() => {
                          const newSet = new Set(hiddenItems);
                          newSet.add(item.id);
                          setHiddenItems(newSet);
                        }}
                        onUnhide={() => {
                          const newSet = new Set(hiddenItems);
                          newSet.delete(item.id);
                          setHiddenItems(newSet);
                        }}
                        isHidden={isHidden}
                      />
                    </div>
                  </div>

                  {/* Contenido enriquecido con multimedia */}
                  <div className="relative">
                    <div className="prose prose-sm dark:prose-invert max-h-64 overflow-hidden prose-img:mx-auto prose-figure:mx-auto prose-iframe:mx-auto prose-video:mx-auto">
                      <div
                        className="text-sm leading-relaxed space-y-2"
                        dangerouslySetInnerHTML={{ __html: hilo.contenido }}
                        suppressHydrationWarning
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
                  </div>

                  {/* Indicadores de contenido */}
                  {(indicators.hasAny || hilo.hasWeaponStats) && (
                    <div className="flex flex-wrap gap-2">
                      {indicators.hasCode && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Code className="w-3 h-3" />
                          <span>Código</span>
                        </div>
                      )}
                      {indicators.hasTweet && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Twitter className="w-3 h-3" />
                          <span>Tweet</span>
                        </div>
                      )}
                      {indicators.hasYoutube && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Youtube className="w-3 h-3" />
                          <span>Video</span>
                        </div>
                      )}
                      {indicators.hasImages && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ImageIcon className="w-3 h-3" />
                          <span>Imágenes</span>
                        </div>
                      )}
                      {indicators.hasMentions && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <AtSign className="w-3 h-3" />
                          <span>Menciones</span>
                        </div>
                      )}
                      {hilo.hasWeaponStats && (
                        <div
                          className="flex items-center gap-1 text-xs text-muted-foreground"
                          style={{ color: `var(--user-color)`, ...colorStyle }}
                        >
                          <Crosshair className="w-3 h-3" />
                          <span>Stats</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t dark:border-gray-700">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      {hilo.vistas} vistas
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      <MessageSquare className="w-3 h-3" />
                      {hilo.respuestas} respuestas
                    </span>
                    {hilo.hasWeaponStats && (
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: `color-mix(in srgb, var(--user-color) 12%, transparent)`,
                          color: `var(--user-color)`,
                          ...colorStyle,
                        }}
                      >
                        <Crosshair className="w-3 h-3" />
                        Stats de armas
                      </span>
                    )}
                    <Link
                      href={`/foro/hilos/${hilo.slug || hilo.id}`}
                      className="ml-auto inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                      style={{
                        color: `var(--user-color)`,
                        ...colorStyle,
                      }}
                    >
                      Ver hilo
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          } else if (item.type === "post") {
            const post = item.data;
            const contenidoPlano =
              typeof window === "undefined"
                ? post.contenido
                : (post.contenido || "").replace(/<[^>]*>/g, "");

            return (
              <Card
                key={item.id}
                className={`transition-shadow hover:shadow-lg dark:border-gray-800 overflow-hidden ${
                  isHidden ? "opacity-60" : ""
                }`}
              >
                <CardContent className="p-4 sm:p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-grow min-w-0">
                      <Link
                        href={`/foro/hilos/${post.hilo_id}`}
                        className="group"
                      >
                        <h3 className="text-base sm:text-lg font-semibold group-hover:underline line-clamp-1 text-foreground">
                          Respuesta en: {post.hilo_titulo}
                        </h3>
                      </Link>
                      <span
                        className="text-xs text-muted-foreground flex items-center gap-1 mt-1"
                        suppressHydrationWarning
                      >
                        <Clock className="w-3 h-3" />
                        {formatearFecha(post.created_at)}
                      </span>
                      {isHidden && renderHiddenBadge()}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <MessageCircle
                        className="w-5 h-5"
                        style={{
                          color: `var(--user-color)`,
                          ...colorStyle,
                        }}
                      />
                      <ActivityCardMenu
                        activityType="forum_post"
                        activityId={post.id}
                        isOwnProfile={isOwnProfile}
                        isAdmin={isAdmin}
                        onHide={() => {
                          const newSet = new Set(hiddenItems);
                          newSet.add(item.id);
                          setHiddenItems(newSet);
                        }}
                        onUnhide={() => {
                          const newSet = new Set(hiddenItems);
                          newSet.delete(item.id);
                          setHiddenItems(newSet);
                        }}
                        isHidden={isHidden}
                      />
                    </div>
                  </div>

                  {/* Contenido preview */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {contenidoPlano}
                  </p>

                  {/* GIF adjunto */}
                  {post.gif_url && (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5 p-2 flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.gif_url}
                        alt="GIF adjunto"
                        className="max-h-60 w-full h-auto object-contain"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Link */}
                  <div className="pt-2 border-t dark:border-gray-700">
                    <Link
                      href={`/foro/hilos/${post.hilo_id}`}
                      className="flex items-center gap-1 text-xs hover:underline"
                      style={{
                        color: `var(--user-color)`,
                        ...colorStyle,
                      }}
                    >
                      Ver respuesta
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          } else if (item.type === "weapon") {
            const record = item.data;

            return (
              <Card
                key={item.id}
                className={`transition-shadow hover:shadow-lg dark:border-gray-800 overflow-hidden ${
                  isHidden ? "opacity-60" : ""
                }`}
              >
                <CardContent className="p-4 sm:p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-grow min-w-0">
                      <Link
                        href={`/foro/hilos/${
                          record.hilo.slug || record.hilo.id
                        }`}
                        className="group"
                      >
                        <h3 className="text-base sm:text-lg font-semibold group-hover:underline line-clamp-2 text-foreground">
                          {record.hilo.titulo}
                        </h3>
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span
                          className="text-xs text-muted-foreground flex items-center gap-1"
                          suppressHydrationWarning
                        >
                          <Clock className="w-3 h-3" />
                          {formatearFecha(record.created_at)}
                        </span>
                        {isHidden && renderHiddenBadge()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Crosshair
                        className="w-5 h-5"
                        style={{
                          color: `var(--user-color)`,
                          ...colorStyle,
                        }}
                      />
                      <ActivityCardMenu
                        activityType="weapon_stats"
                        activityId={record.id}
                        isOwnProfile={isOwnProfile}
                        isAdmin={isAdmin}
                        onHide={() => {
                          const newSet = new Set(hiddenItems);
                          newSet.add(item.id);
                          setHiddenItems(newSet);
                        }}
                        onUnhide={() => {
                          const newSet = new Set(hiddenItems);
                          newSet.delete(item.id);
                          setHiddenItems(newSet);
                        }}
                        isHidden={isHidden}
                      />
                    </div>
                  </div>

                  {/* Weapon Stats Card */}
                  {record.stats && (
                    <div className="mt-2">
                      <WeaponStatsCard
                        stats={record.stats}
                        className="max-w-full"
                      />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 pt-2 border-t dark:border-gray-700">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      <span>{record.hilo.vistas}</span>
                    </div>
                    <Link
                      href={`/foro/hilos/${record.hilo.slug || record.hilo.id}`}
                      className="ml-auto flex items-center gap-1 text-xs hover:underline"
                      style={{
                        color: `var(--user-color)`,
                        ...colorStyle,
                      }}
                    >
                      Ver más
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          } else if (item.type === "lol_match") {
            const partida = item.data;

            return (
              <SharedMatchCard
                key={item.id}
                partida={partida}
                userColor={userColor}
                isOwnProfile={isOwnProfile}
                isAdmin={isAdmin}
                onDelete={handleDeleteMatch}
                deletingId={deletingId}
                isHidden={isHidden}
                onHide={() => {
                  const newSet = new Set(hiddenItems);
                  newSet.add(item.id);
                  setHiddenItems(newSet);
                }}
                onUnhide={() => {
                  const newSet = new Set(hiddenItems);
                  newSet.delete(item.id);
                  setHiddenItems(newSet);
                }}
                userId={userId}
              />
            );
          }
        })}
      </div>
    </div>
  );
};
