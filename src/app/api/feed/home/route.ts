import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/utils/supabase-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FeedItemType = "thread" | "news" | "lol_match" | "status";

type FeedAuthor = {
  id: string;
  username: string | null;
  public_id: string | null;
  avatar_url: string | null;
  color: string | null;
};

type FeedThreadItem = {
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
      stats: unknown;
    } | null;
  };
};

type FeedNewsItem = {
  type: "news";
  id: string;
  created_at: string;
  news: {
    id: number;
    titulo: string;
    contenido: string;
    fecha_publicacion: string;
    imagen_url: string | null;
    imagen_portada?: string | null;
    vistas?: number;
    comentarios_count?: number;
    resumen?: string;
    autor_nombre?: string;
    autor_color?: string;
    autor_avatar?: string | null;
    categorias?: Array<{
      id: string | number;
      nombre: string;
      slug: string;
      parent_id?: string | number | null;
      color?: string | null;
      icono?: string | null;
    }>;
  };
};

type FeedLolMatchItem = {
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
  sharedBy?: FeedAuthor;
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
};

type FeedStatusItem = {
  type: "status";
  id: string;
  created_at: string;
  status: null;
};

type FeedItem =
  | FeedThreadItem
  | FeedNewsItem
  | FeedLolMatchItem
  | FeedStatusItem;

type FeedCursor = {
  threadsCreatedAt?: string;
  newsCreatedAt?: string;
  lolCreatedAt?: string;
};

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stableHashNumber(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  const normalized = Math.abs(hash) % 1000000000;
  return -normalized;
}

function getParticipantPosition(p: unknown): string {
  if (!p || typeof p !== "object") return "Unknown";
  const obj = p as Record<string, unknown>;

  const normalize = (raw: unknown): string | null => {
    if (typeof raw !== "string") return null;
    const value = raw.trim().toUpperCase();
    if (!value) return null;
    if (value === "TOP") return "TOP";
    if (value === "JUNGLE" || value === "JG" || value === "JUN")
      return "JUNGLE";
    if (value === "MID" || value === "MIDDLE") return "MID";
    if (
      value === "BOT" ||
      value === "BOTTOM" ||
      value === "ADC" ||
      value === "CARRY" ||
      value === "DUO_CARRY"
    ) {
      return "BOT";
    }
    if (
      value === "SUP" ||
      value === "SUPP" ||
      value === "SUPPORT" ||
      value === "UTILITY" ||
      value === "DUO_SUPPORT"
    ) {
      return "SUP";
    }
    return null;
  };

  return (
    normalize(obj.teamPosition) ??
    normalize(obj.individualPosition) ??
    normalize(obj.lane) ??
    normalize(obj.role) ??
    "Unknown"
  );
}

function getParticipantDisplayName(p: unknown): string | null {
  if (!p || typeof p !== "object") return null;
  const obj = p as Record<string, unknown>;

  const riotIdGameNameRaw = obj.riotIdGameName;
  const riotIdTaglineRaw = obj.riotIdTagline;
  const summonerNameRaw = obj.summonerName;

  const riotIdGameName =
    typeof riotIdGameNameRaw === "string" && riotIdGameNameRaw.trim()
      ? riotIdGameNameRaw.trim()
      : null;
  const riotIdTagline =
    typeof riotIdTaglineRaw === "string" && riotIdTaglineRaw.trim()
      ? riotIdTaglineRaw.trim()
      : null;
  const summonerName =
    typeof summonerNameRaw === "string" && summonerNameRaw.trim()
      ? summonerNameRaw.trim()
      : null;

  if (riotIdGameName && riotIdTagline)
    return `${riotIdGameName}#${riotIdTagline}`;
  if (riotIdGameName) return riotIdGameName;
  if (summonerName) return summonerName;
  return null;
}

function makeSummary(text: string, maxLen: number): string {
  const clean = stripHtml(text);
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}...` : clean;
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function recencyBoost(createdAtIso: string): number {
  const created = new Date(createdAtIso).getTime();
  const ageHours = Math.max(0, (Date.now() - created) / (1000 * 60 * 60));
  return 8 * Math.exp(-ageHours / 72);
}

function threadEngagementScore(input: {
  created_at: string;
  vistas: number;
  votos: number;
  respuestas: number;
}): number {
  const viewsScore = Math.log10(1 + input.vistas) * 1.0;
  const votesScore = Math.log10(1 + input.votos) * 4.0;
  const repliesScore = Math.log10(1 + input.respuestas) * 6.0;
  return (
    recencyBoost(input.created_at) + viewsScore + votesScore + repliesScore
  );
}

function decodeCursor(value: string | null): FeedCursor | null {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64").toString("utf8");
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const cursor: FeedCursor = {
      threadsCreatedAt:
        typeof parsed.threadsCreatedAt === "string"
          ? parsed.threadsCreatedAt
          : undefined,
      newsCreatedAt:
        typeof parsed.newsCreatedAt === "string"
          ? parsed.newsCreatedAt
          : undefined,
      lolCreatedAt:
        typeof parsed.lolCreatedAt === "string"
          ? parsed.lolCreatedAt
          : undefined,
    };
    return cursor;
  } catch {
    return null;
  }
}

function encodeCursor(cursor: FeedCursor): string {
  const json = JSON.stringify(cursor);
  return Buffer.from(json, "utf8").toString("base64");
}

function getAuthorKey(item: FeedItem): string | null {
  if (item.type === "thread") return item.thread.autor.id || null;
  if (item.type === "lol_match") return item.entry.user_id || null;
  if (item.type === "news") return null;
  return null;
}

function applyAntiRepetition(items: FeedItem[], limit: number): FeedItem[] {
  const out: FeedItem[] = [];
  const authorCount = new Map<string, number>();

  for (const item of items) {
    if (out.length >= limit) break;

    const last1 = out[out.length - 1];
    const last2 = out[out.length - 2];

    if (
      last1 &&
      last2 &&
      last1.type === item.type &&
      last2.type === item.type
    ) {
      continue;
    }

    const author = getAuthorKey(item);
    if (author) {
      const count = authorCount.get(author) ?? 0;
      if (count >= 2) continue;
      authorCount.set(author, count + 1);
    }

    out.push(item);
  }

  return out;
}

function interleave<T extends { type: FeedItemType }>(
  buckets: Record<FeedItemType, T[]>,
  limit: number
): T[] {
  const order: FeedItemType[] = [
    "thread",
    "thread",
    "news",
    "thread",
    "lol_match",
    "thread",
    "thread",
    "news",
    "thread",
    "lol_match",
    "thread",
    "thread",
    "news",
    "thread",
    "lol_match",
    "thread",
    "thread",
    "news",
    "thread",
    "lol_match",
  ];

  const out: T[] = [];
  let orderIndex = 0;

  while (out.length < limit) {
    const nextType = order[orderIndex % order.length];
    orderIndex += 1;

    const bucket = buckets[nextType];
    if (!bucket || bucket.length === 0) {
      const fallbackType = (Object.keys(buckets) as FeedItemType[]).find(
        (t) => buckets[t]?.length
      );
      if (!fallbackType) break;
      out.push(buckets[fallbackType].shift()!);
      continue;
    }

    out.push(bucket.shift()!);
  }

  return out;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(
      30,
      Math.max(10, parseInt(url.searchParams.get("limit") || "20", 10))
    );
    const cursorParam = url.searchParams.get("cursor");
    const cursor = decodeCursor(cursorParam);
    const filter = (url.searchParams.get("filter") || "all") as
      | "all"
      | "threads"
      | "news"
      | "lol"
      | "status";

    const supabase = getServiceClient();

    const wantThreads = filter === "all" || filter === "threads";
    const wantNews = filter === "all" || filter === "news";
    const wantLol = filter === "all" || filter === "lol";

    const isSingleTypeFeed = filter !== "all";

    const perType = {
      threadsRecent:
        wantThreads && isSingleTypeFeed
          ? limit
          : wantThreads
          ? Math.ceil(limit * 0.4)
          : 0,
      threadsDiscover:
        wantThreads && isSingleTypeFeed
          ? 0
          : wantThreads
          ? Math.ceil(limit * 0.2)
          : 0,
      news:
        wantNews && isSingleTypeFeed
          ? limit
          : wantNews
          ? Math.ceil(limit * 0.2)
          : 0,
      lol:
        wantLol && isSingleTypeFeed
          ? limit
          : wantLol
          ? Math.ceil(limit * 0.2)
          : 0,
    };

    // 1) Threads recientes
    const threadsRecentPromise = wantThreads
      ? (() => {
          let query = supabase
            .from("foro_hilos")
            .select(
              `
              id,
              slug,
              titulo,
              contenido,
              created_at,
              vistas,
              votos_conteo:foro_votos_hilos(count),
              respuestas_conteo:foro_posts(count),
              autor:perfiles!autor_id(id, username, public_id, avatar_url, color),
              categoria:foro_categorias!categoria_id(nombre, slug, color),
              weapon_stats_record:weapon_stats_records!weapon_stats_id(id, weapon_name, stats)
            `
            )
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

          if (cursor?.threadsCreatedAt) {
            query = query.lt("created_at", cursor.threadsCreatedAt);
            query = query.limit(perType.threadsRecent);
          } else {
            query = query.range(
              (page - 1) * perType.threadsRecent,
              page * perType.threadsRecent - 1
            );
          }

          return query;
        })()
      : Promise.resolve({ data: [], error: null } as const);

    // 2) Threads descubrimiento (últimos 30 días)
    const threadsDiscoverPromise = wantThreads
      ? (() => {
          let query = supabase
            .from("foro_hilos")
            .select(
              `
              id,
              slug,
              titulo,
              contenido,
              created_at,
              vistas,
              votos_conteo:foro_votos_hilos(count),
              respuestas_conteo:foro_posts(count),
              autor:perfiles!autor_id(id, username, public_id, avatar_url, color),
              categoria:foro_categorias!categoria_id(nombre, slug, color),
              weapon_stats_record:weapon_stats_records!weapon_stats_id(id, weapon_name, stats)
            `
            )
            .is("deleted_at", null)
            .gte("created_at", daysAgoISO(30))
            .order("created_at", { ascending: false })
            .limit(80);

          if (cursor?.threadsCreatedAt) {
            query = query.lt("created_at", cursor.threadsCreatedAt);
          }

          return query;
        })()
      : Promise.resolve({ data: [], error: null } as const);

    // 3) Noticias (publicadas)
    const newsPromise = wantNews
      ? (() => {
          let query = supabase
            .from("noticias")
            .select(
              "id, titulo, contenido, fecha_publicacion, imagen_portada, vistas, autor, autor_id, created_at"
            )
            .eq("estado", "publicada")
            .order("fecha_publicacion", { ascending: false });

          if (cursor?.newsCreatedAt) {
            query = query.lt("fecha_publicacion", cursor.newsCreatedAt);
            query = query.limit(perType.news);
          } else {
            query = query.range(
              (page - 1) * perType.news,
              page * perType.news - 1
            );
          }

          return query;
        })()
      : Promise.resolve({ data: [], error: null } as const);

    // 4) Partidas compartidas (public)
    const lolEntriesPromise = wantLol
      ? (() => {
          let query = supabase
            .from("user_activity_entries")
            .select("id, user_id, match_id, metadata, created_at")
            .eq("type", "lol_match")
            .eq("visibility", "public")
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

          if (cursor?.lolCreatedAt) {
            query = query.lt("created_at", cursor.lolCreatedAt);
            query = query.limit(perType.lol);
          } else {
            query = query.range(
              (page - 1) * perType.lol,
              page * perType.lol - 1
            );
          }

          return query;
        })()
      : Promise.resolve({ data: [], error: null } as const);

    const [threadsRecentRes, threadsDiscoverRes, newsRes, lolEntriesRes] =
      await Promise.all([
        threadsRecentPromise,
        threadsDiscoverPromise,
        newsPromise,
        lolEntriesPromise,
      ]);

    if (threadsRecentRes.error) {
      console.error("[feed/home] Error threadsRecent", threadsRecentRes.error);
    }
    if (threadsDiscoverRes.error) {
      console.error(
        "[feed/home] Error threadsDiscover",
        threadsDiscoverRes.error
      );
    }
    if (newsRes.error) {
      console.error("[feed/home] Error news", newsRes.error);
    }
    if (lolEntriesRes.error) {
      console.error("[feed/home] Error lol entries", lolEntriesRes.error);
    }

    const lolEntries = (lolEntriesRes.data ?? []) as Array<
      Record<string, unknown>
    >;

    const profileById = new Map<string, FeedAuthor>();
    if (wantLol && lolEntries.length > 0) {
      const userIds = Array.from(
        new Set(
          lolEntries
            .map((e) => (typeof e.user_id === "string" ? e.user_id : ""))
            .filter(Boolean)
        )
      );

      if (userIds.length > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from("perfiles")
          .select("id, username, public_id, avatar_url, color")
          .in("id", userIds);

        if (profileError) {
          console.warn(
            "[feed/home] Error perfiles for lol sharedBy",
            profileError
          );
        } else {
          for (const p of (profileRows ?? []) as Array<
            Record<string, unknown>
          >) {
            const id = String(p.id ?? "");
            if (!id) continue;
            profileById.set(id, {
              id,
              username: (p.username as string | null) ?? null,
              public_id: (p.public_id as string | null) ?? null,
              avatar_url: (p.avatar_url as string | null) ?? null,
              color: (p.color as string | null) ?? null,
            });
          }
        }
      }
    }

    const normalizeCount = (value: unknown): number => {
      if (Array.isArray(value)) {
        const first = value[0] as { count?: number } | undefined;
        return typeof first?.count === "number" ? first.count : 0;
      }
      if (typeof value === "object" && value !== null) {
        const maybe = value as { count?: number };
        return typeof maybe.count === "number" ? maybe.count : 0;
      }
      return 0;
    };

    const threadsDiscoverRaw = (threadsDiscoverRes.data ?? []) as Array<
      Record<string, unknown>
    >;

    const threadsDiscoverSorted = threadsDiscoverRaw
      .map((h) => {
        const vistas = typeof h.vistas === "number" ? h.vistas : 0;
        const votos = normalizeCount(h.votos_conteo);
        const respuestas = normalizeCount(h.respuestas_conteo);
        const created_at = String(h.created_at || new Date().toISOString());
        return {
          hilo: h,
          score: threadEngagementScore({
            created_at,
            vistas,
            votos,
            respuestas,
          }),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, perType.threadsDiscover)
      .map((x) => x.hilo);

    const threadsRecent = (threadsRecentRes.data ?? []) as Array<
      Record<string, unknown>
    >;

    const seenThreadIds = new Set<string>();
    const uniqueThreads = [...threadsRecent, ...threadsDiscoverSorted].filter(
      (h) => {
        const id = String(h.id ?? "");
        if (!id) return false;
        if (seenThreadIds.has(id)) return false;
        seenThreadIds.add(id);
        return true;
      }
    );

    const threadItems: FeedThreadItem[] = uniqueThreads
      .map((h) => {
        const autorRaw = (h.autor ?? null) as unknown;
        const autorObj = Array.isArray(autorRaw)
          ? (autorRaw[0] as Record<string, unknown> | undefined)
          : (autorRaw as Record<string, unknown> | null);

        const categoriaRaw = (h.categoria ?? null) as unknown;
        const categoriaObj = Array.isArray(categoriaRaw)
          ? (categoriaRaw[0] as Record<string, unknown> | undefined)
          : (categoriaRaw as Record<string, unknown> | null);

        const weaponRaw = (h.weapon_stats_record ?? null) as unknown;
        const weaponObj = Array.isArray(weaponRaw)
          ? (weaponRaw[0] as Record<string, unknown> | undefined)
          : (weaponRaw as Record<string, unknown> | null);

        const created_at = String(h.created_at || new Date().toISOString());

        const autor: FeedAuthor = {
          id: String(autorObj?.id ?? ""),
          username: (autorObj?.username as string | null) ?? null,
          public_id: (autorObj?.public_id as string | null) ?? null,
          avatar_url: (autorObj?.avatar_url as string | null) ?? null,
          color: (autorObj?.color as string | null) ?? null,
        };

        return {
          type: "thread" as const,
          id: String(h.id),
          created_at,
          thread: {
            id: String(h.id),
            slug: (h.slug as string | null) ?? null,
            titulo: String(h.titulo ?? ""),
            contenido: (h.contenido as string | null) ?? null,
            created_at,
            vistas: typeof h.vistas === "number" ? h.vistas : 0,
            votos_conteo: normalizeCount(h.votos_conteo),
            respuestas_conteo: normalizeCount(h.respuestas_conteo),
            categoria: categoriaObj
              ? {
                  nombre: String(categoriaObj.nombre ?? "Sin categoría"),
                  slug: String(categoriaObj.slug ?? ""),
                  color: String(categoriaObj.color ?? "#3b82f6"),
                }
              : undefined,
            autor,
            weapon_stats_record: weaponObj
              ? {
                  id: String(weaponObj.id ?? ""),
                  weapon_name: (weaponObj.weapon_name as string | null) ?? null,
                  stats: weaponObj.stats ?? null,
                }
              : null,
          },
        };
      })
      .filter((x) => x.thread.titulo);

    const newsItems: FeedNewsItem[] = (
      (newsRes.data ?? []) as Array<Record<string, unknown>>
    ).map((n) => {
      const fecha_publicacion = String(n.fecha_publicacion || n.created_at);
      const numericId =
        typeof n.id === "number" && Number.isFinite(n.id)
          ? n.id
          : typeof n.id === "string" && Number.isFinite(Number(n.id))
          ? Number(n.id)
          : stableHashNumber(`${fecha_publicacion}|${String(n.titulo ?? "")}`);
      const contenido = String(n.contenido || "");
      const resumen = makeSummary(contenido, 180);
      const autorNombre = typeof n.autor === "string" ? n.autor : "";

      return {
        type: "news",
        id: `news-${numericId}`,
        created_at: fecha_publicacion,
        news: {
          id: numericId,
          titulo: String(n.titulo ?? ""),
          contenido,
          fecha_publicacion,
          imagen_url: null,
          imagen_portada: (n.imagen_portada as string | null) ?? null,
          vistas: typeof n.vistas === "number" ? n.vistas : undefined,
          comentarios_count: undefined,
          resumen,
          autor_nombre: autorNombre || undefined,
          autor_color: undefined,
          autor_avatar: null,
          categorias: [],
        },
      };
    });

    const matchIds = Array.from(
      new Set(
        lolEntries
          .map((e) => (typeof e.match_id === "string" ? e.match_id : null))
          .filter((x): x is string => Boolean(x))
      )
    );

    const puuids = Array.from(
      new Set(
        lolEntries
          .map((e) => {
            const metadata = (e.metadata ?? {}) as Record<string, unknown>;
            const puuid = metadata.puuid;
            return typeof puuid === "string" ? puuid : null;
          })
          .filter((x): x is string => Boolean(x))
      )
    );

    const participantByKey = new Map<
      string,
      FeedLolMatchItem["match"]["participant"]
    >();
    const matchById = new Map<string, Record<string, unknown>>();
    const summonerNameByMatchId = new Map<string, Map<string, string>>();

    if (matchIds.length > 0) {
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(
          "match_id, game_creation, game_duration, queue_id, data_version, full_json"
        )
        .in("match_id", matchIds);

      if (matchesError) {
        console.warn("[feed/home] Error fetching matches", matchesError);
      } else {
        for (const m of matchesData || []) {
          const matchId = typeof m.match_id === "string" ? m.match_id : "";
          if (!matchId) continue;
          matchById.set(matchId, m as Record<string, unknown>);
        }
      }
    }

    if (matchIds.length > 0) {
      const { data: participantsAll, error: participantsAllError } =
        await supabase
          .from("match_participants")
          .select("match_id, puuid, summoner_name")
          .in("match_id", matchIds);

      if (participantsAllError) {
        console.warn(
          "[feed/home] Error fetching match_participants (names)",
          participantsAllError
        );
      } else {
        for (const row of participantsAll || []) {
          const matchId = typeof row.match_id === "string" ? row.match_id : "";
          const puuid = typeof row.puuid === "string" ? row.puuid : "";
          const summonerName =
            typeof (row as any).summoner_name === "string" &&
            (row as any).summoner_name.trim()
              ? (row as any).summoner_name.trim()
              : null;

          if (!matchId || !puuid || !summonerName) continue;
          if (!summonerNameByMatchId.has(matchId)) {
            summonerNameByMatchId.set(matchId, new Map());
          }
          summonerNameByMatchId.get(matchId)!.set(puuid, summonerName);
        }
      }
    }

    if (matchIds.length > 0 && puuids.length > 0) {
      const { data: participantsSelf, error: participantsError } =
        await supabase
          .from("match_participants")
          .select(
            `
          match_id,
          puuid,
          champion_id,
          champion_name,
          role,
          lane,
          kills,
          deaths,
          assists,
          kda,
          total_minions_killed,
          neutral_minions_killed,
          vision_score,
          total_damage_dealt_to_champions,
          gold_earned,
          damage_dealt_to_turrets,
          item0,
          item1,
          item2,
          item3,
          item4,
          item5,
          item6,
          summoner1_id,
          summoner2_id,
          perk_primary_style,
          perk_sub_style,
          ranking_position,
          performance_score,
          win,
          matches(match_id, game_creation, game_duration, queue_id, data_version)
        `
          )
          .in("match_id", matchIds)
          .in("puuid", puuids);

      if (participantsError) {
        console.warn(
          "[feed/home] Error fetching match_participants",
          participantsError
        );
      } else {
        for (const p of participantsSelf || []) {
          const matchId = (p.match_id as string) || "";
          const puuid = (p.puuid as string) || "";
          if (!matchId || !puuid) continue;
          participantByKey.set(`${matchId}:${puuid}`, p as any);
        }
      }
    }

    const lolItems: FeedLolMatchItem[] = lolEntries
      .map((e) => {
        const metadata = (e.metadata ?? {}) as Record<string, unknown>;
        const matchId = typeof e.match_id === "string" ? e.match_id : "";
        const puuid = typeof metadata.puuid === "string" ? metadata.puuid : "";
        const participant = participantByKey.get(`${matchId}:${puuid}`);

        const userId = typeof e.user_id === "string" ? e.user_id : "";
        const sharedBy = userId ? profileById.get(userId) : undefined;

        const matchRow = matchById.get(matchId) ?? null;
        const fullJson = matchRow?.full_json as unknown;
        const fullParticipants =
          fullJson && typeof fullJson === "object"
            ? ((fullJson as any).info?.participants as unknown) ?? null
            : null;

        let perks: unknown = undefined;
        let teamTotalDamage = 0;
        let teamTotalGold = 0;
        let teamTotalKills = 0;
        let teamAvgDamageToChampions = 0;
        let teamAvgGoldEarned = 0;
        let teamAvgKillParticipation = 0;
        let teamAvgVisionScore = 0;
        let teamAvgCsPerMin = 0;
        let teamAvgDamageToTurrets = 0;
        let objectivesStolen = 0;
        let allPlayers: FeedLolMatchItem["enriched"]["allPlayers"] = undefined;

        const fallbackNameByPuuid = summonerNameByMatchId.get(matchId);

        if (Array.isArray(fullParticipants) && fullParticipants.length > 0) {
          const fullParticipantsArr = fullParticipants as any[];

          const participantDetailByPuuid = puuid
            ? fullParticipantsArr.find(
                (p) => typeof p?.puuid === "string" && p.puuid === puuid
              )
            : null;

          const metaChampionIdRaw = metadata.championId;
          const metaChampionId =
            typeof metaChampionIdRaw === "number"
              ? metaChampionIdRaw
              : typeof metaChampionIdRaw === "string"
              ? Number(metaChampionIdRaw)
              : null;
          const metaKills =
            typeof metadata.kills === "number"
              ? metadata.kills
              : typeof (participant as any)?.kills === "number"
              ? ((participant as any).kills as number)
              : null;
          const metaDeaths =
            typeof metadata.deaths === "number"
              ? metadata.deaths
              : typeof (participant as any)?.deaths === "number"
              ? ((participant as any).deaths as number)
              : null;
          const metaAssists =
            typeof metadata.assists === "number"
              ? metadata.assists
              : typeof (participant as any)?.assists === "number"
              ? ((participant as any).assists as number)
              : null;

          const participantDetailFallback =
            typeof metaChampionId === "number" &&
            Number.isFinite(metaChampionId) &&
            typeof metaKills === "number" &&
            typeof metaDeaths === "number" &&
            typeof metaAssists === "number"
              ? (() => {
                  const candidates = fullParticipantsArr.filter((p) => {
                    const champOk =
                      typeof p?.championId === "number" &&
                      p.championId === metaChampionId;
                    if (!champOk) return false;
                    const killsOk =
                      typeof p?.kills === "number" && p.kills === metaKills;
                    const deathsOk =
                      typeof p?.deaths === "number" && p.deaths === metaDeaths;
                    const assistsOk =
                      typeof p?.assists === "number" &&
                      p.assists === metaAssists;
                    return killsOk && deathsOk && assistsOk;
                  });

                  if (candidates.length === 1) return candidates[0];

                  const metaSummonerName =
                    typeof (participant as any)?.summoner_name === "string"
                      ? ((participant as any).summoner_name as string)
                      : typeof metadata.summonerName === "string"
                      ? (metadata.summonerName as string)
                      : null;

                  if (metaSummonerName) {
                    const byName = candidates.find(
                      (p) =>
                        typeof p?.summonerName === "string" &&
                        p.summonerName.toLowerCase() ===
                          metaSummonerName.toLowerCase()
                    );
                    if (byName) return byName;
                  }

                  return candidates[0] ?? null;
                })()
              : null;

          const participantDetailByChampionOnly =
            !participantDetailByPuuid &&
            !participantDetailFallback &&
            typeof metaChampionId === "number" &&
            Number.isFinite(metaChampionId)
              ? (() => {
                  const candidates = fullParticipantsArr.filter(
                    (p) =>
                      typeof p?.championId === "number" &&
                      p.championId === metaChampionId
                  );
                  return candidates.length === 1 ? candidates[0] : null;
                })()
              : null;

          const participantDetail =
            participantDetailByPuuid ??
            participantDetailFallback ??
            participantDetailByChampionOnly ??
            null;

          perks = participantDetail?.perks ?? undefined;
          objectivesStolen =
            typeof metadata.objectivesStolen === "number"
              ? metadata.objectivesStolen
              : 0;

          const playerTeamId = participantDetail?.teamId;
          const teamParticipants = fullParticipantsArr.filter(
            (p) => p?.teamId === playerTeamId
          );
          const enemyParticipants = fullParticipantsArr.filter(
            (p) => p?.teamId !== playerTeamId
          );

          teamTotalDamage = teamParticipants.reduce(
            (sum, p) =>
              sum +
              (typeof p?.totalDamageDealtToChampions === "number"
                ? p.totalDamageDealtToChampions
                : 0),
            0
          );
          teamTotalGold = teamParticipants.reduce(
            (sum, p) =>
              sum + (typeof p?.goldEarned === "number" ? p.goldEarned : 0),
            0
          );
          teamTotalKills = teamParticipants.reduce(
            (sum, p) => sum + (typeof p?.kills === "number" ? p.kills : 0),
            0
          );

          const teamCount =
            teamParticipants.length > 0 ? teamParticipants.length : 5;
          teamAvgDamageToChampions = teamTotalDamage / teamCount;
          teamAvgGoldEarned = teamTotalGold / teamCount;
          teamAvgKillParticipation =
            teamTotalKills > 0
              ? teamParticipants.reduce((sum, p) => {
                  const kills = typeof p?.kills === "number" ? p.kills : 0;
                  const assists =
                    typeof p?.assists === "number" ? p.assists : 0;
                  return sum + ((kills + assists) / teamTotalKills) * 100;
                }, 0) / teamCount
              : 0;

          teamAvgVisionScore =
            teamParticipants.reduce(
              (sum, p) =>
                sum + (typeof p?.visionScore === "number" ? p.visionScore : 0),
              0
            ) / teamCount;

          const gameDurationSeconds =
            (typeof (matchRow as any)?.game_duration === "number"
              ? (matchRow as any).game_duration
              : null) ??
            (typeof (participant as any)?.matches?.game_duration === "number"
              ? (participant as any).matches.game_duration
              : 0);
          const minutes = Math.max(1, gameDurationSeconds / 60);

          teamAvgCsPerMin =
            teamParticipants.reduce((sum, p) => {
              const totalMinionsKilled =
                typeof p?.totalMinionsKilled === "number"
                  ? p.totalMinionsKilled
                  : 0;
              const neutralMinionsKilled =
                typeof p?.neutralMinionsKilled === "number"
                  ? p.neutralMinionsKilled
                  : 0;
              return (
                sum + (totalMinionsKilled + neutralMinionsKilled) / minutes
              );
            }, 0) / teamCount;

          teamAvgDamageToTurrets =
            teamParticipants.reduce(
              (sum, p) =>
                sum +
                (typeof p?.damageDealtToTurrets === "number"
                  ? p.damageDealtToTurrets
                  : 0),
              0
            ) / teamCount;

          const getDbNameFallback = (puuidValue: unknown): string | null => {
            if (typeof puuidValue !== "string" || !puuidValue.trim())
              return null;
            return fallbackNameByPuuid?.get(puuidValue) ?? null;
          };

          allPlayers = (fullParticipants as any[]).map((p) => {
            const championName =
              typeof p?.championName === "string"
                ? p.championName
                : "Desconocido";
            const championId =
              typeof p?.championId === "number" ? p.championId : 0;
            const kills = typeof p?.kills === "number" ? p.kills : 0;
            const deaths = typeof p?.deaths === "number" ? p.deaths : 0;
            const assists = typeof p?.assists === "number" ? p.assists : 0;
            const kda =
              deaths > 0 ? (kills + assists) / deaths : kills + assists;
            const displayName =
              getParticipantDisplayName(p) ??
              getDbNameFallback(p?.puuid) ??
              "Jugador";
            const team = p?.teamId === 100 ? "blue" : "red";
            const role = getParticipantPosition(p);

            return {
              championName,
              championId,
              summonerName: displayName,
              kills,
              deaths,
              assists,
              kda,
              role,
              team,
            };
          });

          // Silenciar variable no usada pero mantiene lógica de referencia
          void enemyParticipants;
        }

        return {
          type: "lol_match" as const,
          id: `lol_match-${String(e.id)}`,
          created_at: String(e.created_at || new Date().toISOString()),
          entry: {
            entryId: String(e.id),
            matchId,
            created_at: String(e.created_at || new Date().toISOString()),
            user_id: String(e.user_id || ""),
            metadata,
          },
          sharedBy,
          match: participant ? { participant } : undefined,
          enriched: {
            perks,
            teamTotalDamage,
            teamTotalGold,
            teamTotalKills,
            teamAvgDamageToChampions,
            teamAvgGoldEarned,
            teamAvgKillParticipation,
            teamAvgVisionScore,
            teamAvgCsPerMin,
            teamAvgDamageToTurrets,
            objectivesStolen,
            allPlayers,
          },
        };
      })
      .filter((x) => x.entry.matchId);

    const statusItems: FeedStatusItem[] = [];

    const mixedRaw = isSingleTypeFeed
      ? (() => {
          if (filter === "threads") return [...threadItems] as FeedItem[];
          if (filter === "news") return [...newsItems] as FeedItem[];
          if (filter === "lol") return [...lolItems] as FeedItem[];
          return [] as FeedItem[];
        })()
      : interleave<FeedItem>(
          {
            thread: [...threadItems],
            news: [...newsItems],
            lol_match: [...lolItems],
            status: [...statusItems],
          },
          limit
        );

    const mixed = isSingleTypeFeed
      ? mixedRaw
      : applyAntiRepetition(mixedRaw, limit);

    const nextCursorObj: FeedCursor = {
      threadsCreatedAt: cursor?.threadsCreatedAt,
      newsCreatedAt: cursor?.newsCreatedAt,
      lolCreatedAt: cursor?.lolCreatedAt,
    };

    for (let i = mixed.length - 1; i >= 0; i -= 1) {
      const item = mixed[i];
      if (item.type === "thread" && !nextCursorObj.threadsCreatedAt) {
        nextCursorObj.threadsCreatedAt = item.created_at;
      }
      if (item.type === "news" && !nextCursorObj.newsCreatedAt) {
        nextCursorObj.newsCreatedAt = item.created_at;
      }
      if (item.type === "lol_match" && !nextCursorObj.lolCreatedAt) {
        nextCursorObj.lolCreatedAt = item.created_at;
      }
    }

    const nextCursor = encodeCursor(nextCursorObj);

    const hasMore = isSingleTypeFeed
      ? mixed.length >= limit
      : mixed.length >= Math.max(1, Math.min(limit, 30));

    return NextResponse.json({
      success: true,
      page,
      limit,
      filter,
      hasMore,
      nextCursor,
      items: mixed,
    });
  } catch (error) {
    console.error("Error en GET /api/feed/home", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
