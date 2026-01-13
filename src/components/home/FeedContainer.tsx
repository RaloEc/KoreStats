"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { Button } from "@/components/ui/button";
import HiloCard from "@/components/foro/HiloCard";
import NoticiaCard from "@/components/noticias/NoticiaCard";
import BannerPublicitario from "@/components/home/BannerPublicitario";
import {
  SharedMatchCard,
  type SharedMatchData,
} from "@/components/perfil/shared-match-card";
import StatusCard from "@/components/social/StatusCard";
import type { Noticia } from "@/types";
import type { WeaponStats } from "@/types/weapon";
import { getDeterministicSkinIdSync } from "@/lib/riot/skinHelpers";

// Memoize components for better performance
const MemoizedHiloCard = memo(HiloCard);
const MemoizedNoticiaCard = memo(NoticiaCard);
const MemoizedSharedMatchCard = memo(SharedMatchCard);
const MemoizedStatusCard = memo(StatusCard);
const MemoizedBannerPublicitario = memo(BannerPublicitario);

type FeedFilter = "all" | "threads" | "news" | "lol" | "social";

type FeedAuthor = {
  id: string;
  username: string | null;
  public_id: string | null;
  avatar_url: string | null;
  color: string | null;
};

type FeedItem =
  | {
      type: "thread";
      id: string;
      created_at: string;
      thread: {
        id: string;
        slug: string | null;
        titulo: string;
        contenido: string | null;
        created_at: string;
        vistas: number;
        votos_conteo: number;
        respuestas_conteo: number;
        categoria?: {
          nombre: string;
          slug: string;
          color: string;
        };
        autor: FeedAuthor;
        weapon_stats_record?: {
          id: string;
          weapon_name: string | null;
          stats: WeaponStats | string | null;
        } | null;
      };
    }
  | {
      type: "news";
      id: string;
      created_at: string;
      news: Noticia;
    }
  | {
      type: "lol_match";
      id: string;
      created_at: string;
      entry: {
        entryId: string;
        matchId: string;
        created_at: string;
        user_id: string;
        metadata: Record<string, unknown>;
      };
      sharedBy?: {
        id: string;
        username: string | null;
        public_id: string | null;
        avatar_url: string | null;
        color: string | null;
      };
      match?: {
        participant?: {
          champion_id: number | null;
          champion_name: string | null;
          role: string | null;
          lane: string | null;
          kills: number | null;
          deaths: number | null;
          assists: number | null;
          kda: number | null;
          total_minions_killed: number | null;
          neutral_minions_killed: number | null;
          vision_score: number | null;
          total_damage_dealt_to_champions: number | null;
          gold_earned: number | null;
          damage_dealt_to_turrets: number | null;
          item0: number | null;
          item1: number | null;
          item2: number | null;
          item3: number | null;
          item4: number | null;
          item5: number | null;
          item6: number | null;
          summoner1_id: number | null;
          summoner2_id: number | null;
          perk_primary_style: number | null;
          perk_sub_style: number | null;
          ranking_position: number | null;
          performance_score: number | null;
          win: boolean | null;
          matches?: {
            match_id: string;
            game_creation: number | null;
            game_duration: number | null;
            queue_id: number | null;
            data_version: string | null;
          } | null;
        };
      };
      enriched?: {
        perks?: unknown;
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
      };
    }
  | {
      type: "social_post";
      id: string;
      created_at: string;
      content: string | null;
      media_url: string | null;
      media_type: "image" | "youtube" | null;
      likes_count: number;
      comments_count: number;
      isLiked: boolean;
      user: {
        id: string;
        username: string | null;
        avatar_url: string | null;
        color: string | null;
        public_id: string | null;
      };
      target_user?: {
        id: string;
        username: string | null;
        avatar_url: string | null;
      } | null;
    };

type FeedResponse = {
  success: boolean;
  items: FeedItem[];
  page: number;
  limit: number;
  filter: FeedFilter | "status";
  hasMore: boolean;
  nextCursor?: string;
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toBool(value: unknown): boolean {
  return value === true;
}

export default function FeedContainer() {
  const ADS_EVERY = 5;

  const [filter, setFilter] = useState<FeedFilter>("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);

  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [socialSuggestion, setSocialSuggestion] = useState<string | null>(null);

  const loadPage = useCallback(
    async (nextPage: number, mode: "replace" | "append") => {
      setIsLoading(true);
      try {
        // For social filter, use the social-specific endpoint
        if (filter === "social") {
          const res = await fetch(
            `/api/feed/home/social?page=${nextPage}&limit=10`
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          if (data.error) {
            // User not logged in - show empty state
            setSocialPosts([]);
            setSocialSuggestion(
              "Inicia sesión para ver publicaciones de tus amigos"
            );
            setHasMore(false);
          } else {
            setHasMore(data.meta?.hasMore || false);
            setSocialSuggestion(data.suggestion || null);

            const transformedItems: FeedItem[] = (data.posts || []).map(
              (post: any) => ({
                type: "social_post" as const,
                id: post.id,
                created_at: post.created_at,
                content: post.content,
                media_url: post.media_url,
                media_type: post.media_type,
                likes_count: post.likes_count || 0,
                comments_count: post.comments_count || 0,
                isLiked: post.isLiked || false,
                user: post.user,
                target_user: post.target_user,
              })
            );

            setItems((prev) =>
              mode === "replace"
                ? transformedItems
                : [...prev, ...transformedItems]
            );
          }
          setPage(nextPage);
          setIsLoading(false);
          return;
        }

        // For other filters, use the regular endpoint
        const cursorValue = mode === "append" ? cursorRef.current : null;
        const cursorQuery = cursorValue
          ? `&cursor=${encodeURIComponent(cursorValue)}`
          : "";
        const res = await fetch(
          `/api/feed/home?page=${nextPage}&limit=20&filter=${filter}${cursorQuery}`
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as FeedResponse;
        if (!data.success) {
          throw new Error("Respuesta inválida");
        }
        setHasMore(Boolean(data.hasMore));
        cursorRef.current =
          typeof data.nextCursor === "string" ? data.nextCursor : null;
        setItems((prev) =>
          mode === "replace" ? data.items : [...prev, ...data.items]
        );
        setPage(nextPage);
      } catch (e) {
        console.error("[inicio] Error cargando feed", e);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    cursorRef.current = null;
    setPage(1);
    setSocialSuggestion(null);
    void loadPage(1, "replace");
  }, [filter, loadPage]);

  const actions = useMemo(
    () => [
      { key: "all" as const, label: "Todo" },
      { key: "social" as const, label: "Social" },
      { key: "threads" as const, label: "Hilos" },
      { key: "lol" as const, label: "LoL" },
      { key: "news" as const, label: "Noticias" },
    ],
    []
  );

  // Precalculate items with ads to avoid expensive flatMap on every render
  const itemsWithAds = useMemo(() => {
    const result: Array<{
      type: "item" | "ad";
      data: FeedItem | null;
      key: string;
      index: number;
    }> = [];

    items.forEach((item, index) => {
      // Insert ad before this item if needed
      if (index > 0 && index % ADS_EVERY === 0) {
        result.push({
          type: "ad",
          data: null,
          key: `ad-infeed-${page}-${index}`,
          index,
        });
      }

      // Add the actual item
      result.push({
        type: "item",
        data: item,
        key: `${item.type}-${item.id}`,
        index,
      });
    });

    return result;
  }, [items, page]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Sticky tabs container - Optimized for performance */}
      <div
        className="sticky top-0 z-40 bg-white dark:bg-black py-3 -mx-4 px-4 mb-3 border-b border-gray-200 dark:border-white/5"
        style={{ willChange: "transform" }}
      >
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a.key}
              variant={filter === a.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(a.key)}
              disabled={isLoading && page === 1}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {itemsWithAds.map((entry) => {
          // Render ad
          if (entry.type === "ad") {
            return (
              <MemoizedBannerPublicitario
                key={entry.key}
                variant="in-feed"
                className="w-full"
                closeable={false}
              />
            );
          }

          // Render item
          const item = entry.data!;

          if (item.type === "thread") {
            const href = item.thread.slug
              ? `/foro/hilos/${item.thread.slug}`
              : `/foro/hilos/${item.thread.id}`;

            return (
              <MemoizedHiloCard
                key={entry.key}
                id={item.thread.id}
                href={href}
                titulo={item.thread.titulo}
                contenido={item.thread.contenido}
                categoriaNombre={item.thread.categoria?.nombre}
                categoriaColor={item.thread.categoria?.color}
                autorUsername={item.thread.autor.username || "Anónimo"}
                autorAvatarUrl={item.thread.autor.avatar_url}
                autorId={item.thread.autor.id || null}
                autorPublicId={item.thread.autor.public_id}
                autorColor={item.thread.autor.color || undefined}
                createdAt={item.thread.created_at}
                vistas={item.thread.vistas}
                respuestas={item.thread.respuestas_conteo}
                votosIniciales={item.thread.votos_conteo}
                weaponStats={item.thread.weapon_stats_record?.stats ?? null}
              />
            );
          }

          if (item.type === "news") {
            return (
              <div key={entry.key}>
                <MemoizedNoticiaCard
                  noticia={item.news}
                  mostrarResumen={true}
                />
              </div>
            );
          }

          if (item.type === "lol_match") {
            const p = item.match?.participant;
            const m = p?.matches;
            const meta = item.entry.metadata;
            const enriched = item.enriched;
            const sharedBy = item.sharedBy;

            const matchId = item.entry.matchId;

            const partida: SharedMatchData = {
              entryId: item.entry.entryId,
              matchId,
              skinId: getDeterministicSkinIdSync(matchId),
              championId: p?.champion_id ?? toNumber(meta.championId),
              championName:
                p?.champion_name ??
                toStringOrNull(meta.championName) ??
                "Campeón desconocido",
              role: p?.role ?? toStringOrNull(meta.role) ?? "Unknown",
              lane:
                p?.lane ??
                toStringOrNull(meta.lane) ??
                toStringOrNull(meta.role) ??
                "Unknown",
              kda: p?.kda ?? toNumber(meta.kda),
              kills: p?.kills ?? toNumber(meta.kills),
              deaths: p?.deaths ?? toNumber(meta.deaths),
              assists: p?.assists ?? toNumber(meta.assists),
              totalCS:
                (p?.total_minions_killed ?? 0) +
                (p?.neutral_minions_killed ?? 0),
              csPerMin: 0,
              visionScore: p?.vision_score ?? toNumber(meta.visionScore),
              damageToChampions: p?.total_damage_dealt_to_champions ?? 0,
              damageToTurrets: p?.damage_dealt_to_turrets ?? 0,
              goldEarned: p?.gold_earned ?? toNumber(meta.goldEarned),
              items: [
                p?.item0 ?? 0,
                p?.item1 ?? 0,
                p?.item2 ?? 0,
                p?.item3 ?? 0,
                p?.item4 ?? 0,
                p?.item5 ?? 0,
                p?.item6 ?? 0,
              ],
              summoner1Id: p?.summoner1_id ?? 0,
              summoner2Id: p?.summoner2_id ?? 0,
              perkPrimaryStyle: p?.perk_primary_style ?? 0,
              perkSubStyle: p?.perk_sub_style ?? 0,
              rankingPosition: p?.ranking_position ?? null,
              performanceScore: p?.performance_score ?? null,
              result: p?.win ?? toBool(meta.win) ? "win" : "loss",
              queueId: m?.queue_id ?? toNumber(meta.queueId),
              gameDuration: m?.game_duration ?? toNumber(meta.gameDuration),
              gameCreation: m?.game_creation ?? toNumber(meta.gameCreation),
              dataVersion:
                m?.data_version ?? toStringOrNull(meta.dataVersion) ?? "16.1.1",
              tier: null,
              rank: null,
              leaguePoints: 0,
              rankWins: 0,
              rankLosses: 0,
              comment: toStringOrNull(meta.comment),
              created_at: item.entry.created_at,
              perks: (enriched?.perks as SharedMatchData["perks"]) ?? null,
              teamTotalDamage: enriched?.teamTotalDamage ?? 0,
              teamTotalGold: enriched?.teamTotalGold ?? 0,
              teamTotalKills: enriched?.teamTotalKills ?? 0,
              teamAvgDamageToChampions: enriched?.teamAvgDamageToChampions,
              teamAvgGoldEarned: enriched?.teamAvgGoldEarned,
              teamAvgKillParticipation: enriched?.teamAvgKillParticipation,
              teamAvgVisionScore: enriched?.teamAvgVisionScore,
              teamAvgCsPerMin: enriched?.teamAvgCsPerMin,
              teamAvgDamageToTurrets: enriched?.teamAvgDamageToTurrets,
              objectivesStolen: enriched?.objectivesStolen ?? 0,
              allPlayers: enriched?.allPlayers,
            };

            return (
              <MemoizedSharedMatchCard
                key={entry.key}
                partida={partida}
                sharedBy={sharedBy ?? undefined}
                isOwnProfile={false}
                isAdmin={false}
              />
            );
          }

          if (item.type === "social_post") {
            return (
              <MemoizedStatusCard
                key={entry.key}
                post={{
                  id: item.id,
                  user_id: item.user.id,
                  target_user_id: item.target_user?.id || null,
                  content: item.content,
                  media_url: item.media_url,
                  media_type: item.media_type,
                  created_at: item.created_at,
                  likes_count: item.likes_count,
                  comments_count: item.comments_count,
                  user: {
                    id: item.user.id,
                    username: item.user.username || "Usuario",
                    avatar_url: item.user.avatar_url,
                    color: item.user.color,
                    public_id: item.user.public_id,
                  },
                  target_user: item.target_user
                    ? {
                        id: item.target_user.id,
                        username: item.target_user.username || "Usuario",
                        avatar_url: item.target_user.avatar_url,
                      }
                    : undefined,
                  isLiked: item.isLiked,
                }}
              />
            );
          }

          return null;
        })}

        {items.length === 0 && !isLoading && (
          <div className="text-center py-10 space-y-3">
            <p className="text-muted-foreground">
              {filter === "social" && socialSuggestion
                ? socialSuggestion
                : "No hay contenido para mostrar."}
            </p>
            {filter === "social" && (
              <p className="text-sm text-gray-400">
                Cuando sigas a otros usuarios o añadas amigos, sus publicaciones
                aparecerán aquí.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => loadPage(page + 1, "append")}
            disabled={isLoading || !hasMore}
          >
            {isLoading ? "Cargando..." : hasMore ? "Cargar más" : "No hay más"}
          </Button>
        </div>
      </div>
    </div>
  );
}
