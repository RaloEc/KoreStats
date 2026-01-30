import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getChampionNameById } from "@/lib/riot/helpers";
import { getRoutingRegionFromShard } from "@/lib/riot/sync";

export const dynamic = "force-dynamic";

type SpectatorPerks = {
  perkIds: number[];
  perkStyle: number | null;
  perkSubStyle: number | null;
};

type ActiveParticipant = {
  teamId: 100 | 200;
  position: string | null;
  summonerName: string;
  puuid: string | null;
  championId: number;
  championName: string | null;
  spell1Id: number;
  spell2Id: number;
  perks: SpectatorPerks | null;
};

type SummonerV4Response = {
  name?: string;
  summonerLevel?: number;
  id?: string;
  puuid?: string;
  accountId?: string;
  profileIconId?: number;
  revisionDate?: number;
};

const SUMMONER_NAME_CACHE_TTL_MS = 60 * 60 * 1000;
const summonerNameCache = new Map<
  string,
  { name: string; expiresAt: number }
>();
const encryptedSummonerIdCache = new Map<
  string,
  { id: string; expiresAt: number }
>();
const riotAccountNameCache = new Map<
  string,
  { name: string; expiresAt: number }
>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number | null {
  if (typeof value !== "number") return null;
  return Number.isFinite(value) ? value : null;
}

function toString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value;
}

function toStringLike(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function looksLikeEncryptedSummonerId(value: string | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 30) return false;
  return /^[A-Za-z0-9_-]+$/.test(trimmed);
}

function normalizePosition(value: string | null): string | null {
  if (!value) return null;
  const raw = value.toUpperCase();
  const mapped: Record<string, string> = {
    TOP: "TOP",
    JUNGLE: "JUNGLE",
    MIDDLE: "MIDDLE",
    MID: "MIDDLE",
    BOTTOM: "BOTTOM",
    BOT: "BOTTOM",
    UTILITY: "UTILITY",
    SUPPORT: "UTILITY",
  };
  return mapped[raw] ?? raw;
}

function parsePerks(value: unknown): SpectatorPerks | null {
  if (!isRecord(value)) return null;
  const perkIdsRaw = value["perkIds"];
  const perkStyleRaw = value["perkStyle"];
  const perkSubStyleRaw = value["perkSubStyle"];

  const perkIds: number[] = Array.isArray(perkIdsRaw)
    ? perkIdsRaw
        .map((id) =>
          typeof id === "number" && Number.isFinite(id) ? id : null,
        )
        .filter((id): id is number => id !== null && id > 0)
    : [];

  const perkStyle = toNumber(perkStyleRaw);
  const perkSubStyle = toNumber(perkSubStyleRaw);

  if (perkIds.length === 0 && perkStyle === null && perkSubStyle === null) {
    return null;
  }

  return {
    perkIds,
    perkStyle,
    perkSubStyle,
  };
}

function getPositionFromParticipant(
  participant: Record<string, unknown>,
): string | null {
  const teamPosition = toString(participant["teamPosition"]);
  const individualPosition = toString(participant["individualPosition"]);
  const position = normalizePosition(teamPosition || individualPosition);
  if (!position || position === "INVALID" || position === "NONE") {
    return null;
  }
  return position;
}

async function getSummonerNameFromRiot(params: {
  platformRegion: string;
  riotToken: string;
  summonerId: string | null;
  puuid: string | null;
}): Promise<string | null> {
  const { platformRegion, riotToken, summonerId, puuid } = params;

  const now = Date.now();
  const cacheKey = summonerId
    ? `${platformRegion}:summonerId:${summonerId}`
    : puuid
      ? `${platformRegion}:puuid:${puuid}`
      : null;

  if (cacheKey) {
    const cached = summonerNameCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.name;
    }
  }

  let url: string | null = null;
  if (summonerId) {
    url = `https://${platformRegion}.api.riotgames.com/lol/summoner/v4/summoners/${summonerId}`;
  } else if (puuid) {
    url = `https://${platformRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  }

  if (!url) return null;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Riot-Token": riotToken,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  const body = (await res
    .json()
    .catch(() => null)) as SummonerV4Response | null;
  const name =
    typeof body?.name === "string" && body.name.trim().length > 0
      ? body.name
      : null;
  if (!name) return null;

  if (cacheKey) {
    summonerNameCache.set(cacheKey, {
      name,
      expiresAt: now + SUMMONER_NAME_CACHE_TTL_MS,
    });
  }

  return name;
}

async function getEncryptedSummonerIdForAccount(params: {
  platformRegion: string;
  riotToken: string;
  puuid: string;
}): Promise<string | null> {
  const { platformRegion, riotToken, puuid } = params;
  const cacheKey = `${platformRegion}:accountSummonerIdByPuuid:${puuid}`;
  const now = Date.now();
  const cached = encryptedSummonerIdCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.id;
  }

  const url = `https://${platformRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Riot-Token": riotToken,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  const body = (await res
    .json()
    .catch(() => null)) as SummonerV4Response | null;
  const summonerId =
    typeof body?.id === "string" && body.id.trim().length > 0 ? body.id : null;
  if (!summonerId) return null;

  encryptedSummonerIdCache.set(cacheKey, {
    id: summonerId,
    expiresAt: now + SUMMONER_NAME_CACHE_TTL_MS,
  });
  return summonerId;
}

async function getRiotIdFromAccountByPuuid(params: {
  routingRegion: string;
  riotToken: string;
  puuid: string;
}): Promise<string | null> {
  const { routingRegion, riotToken, puuid } = params;
  const now = Date.now();
  const cacheKey = `${routingRegion}:accountV1:${puuid}`;
  const cached = riotAccountNameCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.name;
  }

  const url = `https://${routingRegion}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Riot-Token": riotToken,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const body = (await res.json().catch(() => null)) as {
    gameName?: string;
    tagLine?: string;
  } | null;
  const gameName =
    typeof body?.gameName === "string" ? body.gameName.trim() : "";
  const tagLine = typeof body?.tagLine === "string" ? body.tagLine.trim() : "";
  if (!gameName) return null;

  const name = tagLine ? `${gameName}#${tagLine}` : gameName;
  riotAccountNameCache.set(cacheKey, {
    name,
    expiresAt: now + SUMMONER_NAME_CACHE_TTL_MS,
  });
  return name;
}

function getSummonerDisplayName(participant: Record<string, unknown>): string {
  const summonerName = toString(participant["summonerName"]);
  if (summonerName && summonerName.trim().length > 0) {
    return summonerName;
  }

  const riotIdRaw = participant["riotId"];
  if (typeof riotIdRaw === "string" && riotIdRaw.trim().length > 0) {
    return riotIdRaw;
  }
  if (isRecord(riotIdRaw)) {
    const gameName =
      toString(riotIdRaw["gameName"]) ||
      toString(riotIdRaw["game_name"]) ||
      toString(riotIdRaw["name"]) ||
      toString(riotIdRaw["riotIdGameName"]);
    const tagLine =
      toString(riotIdRaw["tagLine"]) ||
      toString(riotIdRaw["tagline"]) ||
      toString(riotIdRaw["tag_line"]) ||
      toString(riotIdRaw["riotIdTagline"]);

    if (gameName && gameName.trim().length > 0) {
      if (tagLine && tagLine.trim().length > 0) {
        return `${gameName}#${tagLine}`;
      }
      return gameName;
    }
  }

  const riotIdGameName = toString(participant["riotIdGameName"]);
  const riotIdTagline = toString(participant["riotIdTagline"]);
  if (riotIdGameName && riotIdGameName.trim().length > 0) {
    if (riotIdTagline && riotIdTagline.trim().length > 0) {
      return `${riotIdGameName}#${riotIdTagline}`;
    }
    return riotIdGameName;
  }

  const fallbackName =
    toString(participant["gameName"]) ||
    toString(participant["riotIdName"]) ||
    toString(participant["name"]);
  if (fallbackName && fallbackName.trim().length > 0) {
    return fallbackName;
  }

  /* console.warn(
    "[GET /api/riot/matches/active] Unable to resolve participant name; using fallback",
    {
      keys: Object.keys(participant),
    },
  ); */

  return "Invocador";
}

function sortByRoleOrder(a: ActiveParticipant, b: ActiveParticipant): number {
  const order: Record<string, number> = {
    TOP: 1,
    JUNGLE: 2,
    MIDDLE: 3,
    BOTTOM: 4,
    UTILITY: 5,
  };

  const aKey = a.position ? (order[a.position] ?? 99) : 99;
  const bKey = b.position ? (order[b.position] ?? 99) : 99;

  if (aKey !== bKey) return aKey - bKey;

  // Secondary sort by Smite if positions are null
  const hasSmiteA = a.spell1Id === 11 || a.spell2Id === 11;
  const hasSmiteB = b.spell1Id === 11 || b.spell2Id === 11;
  if (hasSmiteA && !hasSmiteB) return -1;
  if (!hasSmiteA && hasSmiteB) return 1;

  return 0;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const RIOT_API_KEY = process.env.RIOT_API_KEY;

    const requestUrl = new URL(request.url);
    const debug = requestUrl.searchParams.get("debug") === "1";

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener userId del query param (para perfiles públicos)
    const queryUserId = requestUrl.searchParams.get("userId");

    let targetUserId: string;

    if (queryUserId) {
      // Si se proporciona userId, no requerimos autenticación (perfil público)
      targetUserId = queryUserId;
    } else {
      // Si no hay userId, requerimos autenticación para obtener el del usuario actual
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Missing or invalid authorization header" },
          { status: 401 },
        );
      }

      const token = authHeader.slice(7);

      // Verificar el token y obtener el usuario
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      targetUserId = user.id;
    }

    if (!RIOT_API_KEY) {
      return NextResponse.json(
        { error: "RIOT_API_KEY no configurada" },
        { status: 500 },
      );
    }

    // Obtener la cuenta Riot vinculada del usuario objetivo
    const { data: riotAccount, error: riotError } = await supabase
      .from("linked_accounts_riot")
      .select("puuid, active_shard, summoner_id")
      .eq("user_id", targetUserId)
      .single();

    if (riotError || !riotAccount) {
      return NextResponse.json(
        { hasActiveMatch: false, reason: "No linked Riot account" },
        { status: 200 },
      );
    }

    if (!riotAccount.puuid) {
      return NextResponse.json(
        { hasActiveMatch: false, reason: "Missing puuid" },
        { status: 200 },
      );
    }

    const platformRegion = (riotAccount.active_shard || "la1").toLowerCase();

    // Spectator API v5 acepta PUUID directamente en /by-summoner/{encryptedPUUID}
    const spectatorUrl = `https://${platformRegion}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${riotAccount.puuid}`;

    const spectatorResponse = await fetch(spectatorUrl, {
      method: "GET",
      headers: {
        "X-Riot-Token": RIOT_API_KEY,
      },
      cache: "no-store",
    });

    // 404 = no está en partida (caso normal)
    if (spectatorResponse.status === 404) {
      return NextResponse.json(
        { hasActiveMatch: false, reason: "No active game" },
        { status: 200 },
      );
    }

    // 200 = en partida
    if (spectatorResponse.status === 200) {
      const data = await spectatorResponse.json().catch(() => null);

      const payload = isRecord(data) ? data : null;
      const rawParticipants =
        payload && Array.isArray(payload["participants"])
          ? (payload["participants"] as unknown[])
          : [];

      const parsedParticipantsBase: Array<{
        teamId: 100 | 200;
        position: string | null;
        summonerName: string;
        summonerId: string | null;
        puuid: string | null;
        championId: number;
        spell1Id: number;
        spell2Id: number;
        perks: SpectatorPerks | null;
      }> = [];

      const debugNameFields: Array<Record<string, unknown>> = [];

      for (const entry of rawParticipants) {
        if (!isRecord(entry)) continue;
        const teamIdRaw = toNumber(entry["teamId"]);
        const teamId =
          teamIdRaw === 100 || teamIdRaw === 200 ? teamIdRaw : null;
        if (!teamId) continue;

        const summonerName = getSummonerDisplayName(entry);
        const participantSummonerId =
          toStringLike(entry["summonerId"]) ??
          toStringLike(entry["encryptedSummonerId"]) ??
          toStringLike(entry["summoner_id"]) ??
          toStringLike(entry["id"]);
        const participantPuuid =
          toStringLike(entry["puuid"]) ?? toStringLike(entry["playerId"]);
        const championId = toNumber(entry["championId"]) ?? 0;
        const spell1Id = toNumber(entry["spell1Id"]) ?? 0;
        const spell2Id = toNumber(entry["spell2Id"]) ?? 0;

        // Note: Spectator API v5 does NOT provide live stats like items, KDA, or gold
        // These are only available through the Live Client Data API (localhost only)

        parsedParticipantsBase.push({
          teamId,
          position: getPositionFromParticipant(entry),
          summonerName,
          summonerId: participantSummonerId,
          puuid: participantPuuid,
          championId,
          spell1Id,
          spell2Id,
          perks: parsePerks(entry["perks"]),
        });

        if (debug) {
          debugNameFields.push({
            summonerName: entry["summonerName"],
            summonerId: entry["summonerId"],
            encryptedSummonerId: entry["encryptedSummonerId"],
            puuid: entry["puuid"],
            riotId: entry["riotId"],
            riotIdGameName: entry["riotIdGameName"],
            riotIdTagline: entry["riotIdTagline"],
            gameName: entry["gameName"],
            name: entry["name"],
            keys: Object.keys(entry),
          });
        }
      }

      const championNamePromises = parsedParticipantsBase.map(async (p) => {
        if (!p.championId) return null;
        return getChampionNameById(p.championId);
      });

      const championNames = await Promise.all(championNamePromises);

      const routingRegion = getRoutingRegionFromShard(platformRegion);

      const resolvedNames = await Promise.all(
        parsedParticipantsBase.map(async (p) => {
          if (p.summonerName !== "Invocador") return p.summonerName;
          const resolved = await getSummonerNameFromRiot({
            platformRegion,
            riotToken: RIOT_API_KEY,
            summonerId: p.summonerId,
            puuid: p.puuid,
          });
          if (resolved) return resolved;
          if (p.puuid) {
            const riotId = await getRiotIdFromAccountByPuuid({
              routingRegion,
              riotToken: RIOT_API_KEY,
              puuid: p.puuid,
            });
            if (riotId) return riotId;
          }
          return p.summonerName;
        }),
      );

      const participants: ActiveParticipant[] = parsedParticipantsBase.map(
        (p, idx) => ({
          teamId: p.teamId,
          position: p.position,
          summonerName: resolvedNames[idx] ?? p.summonerName,
          puuid: p.puuid,
          championId: p.championId,
          championName: championNames[idx] ?? null,
          spell1Id: p.spell1Id,
          spell2Id: p.spell2Id,
          perks: p.perks,
        }),
      );

      const team100 = participants
        .filter((p) => p.teamId === 100)
        .sort(sortByRoleOrder);
      const team200 = participants
        .filter((p) => p.teamId === 200)
        .sort(sortByRoleOrder);

      const gameStartTime = toNumber(payload?.["gameStartTime"]) ?? null;
      const elapsedSeconds =
        typeof gameStartTime === "number" && Number.isFinite(gameStartTime)
          ? Math.max(0, Math.floor((Date.now() - gameStartTime) / 1000))
          : null;

      return NextResponse.json(
        {
          hasActiveMatch: true,
          reason: "Active game (Spectator API)",
          gameId: data?.gameId ?? null,
          gameStartTime: data?.gameStartTime ?? null,
          gameLength: data?.gameLength ?? null,
          queueId: data?.gameQueueConfigId ?? null,
          mapId:
            payload && typeof payload["mapId"] === "number"
              ? payload["mapId"]
              : null,
          gameMode:
            payload && typeof payload["gameMode"] === "string"
              ? payload["gameMode"]
              : null,
          gameType:
            payload && typeof payload["gameType"] === "string"
              ? payload["gameType"]
              : null,
          platformId:
            payload && typeof payload["platformId"] === "string"
              ? payload["platformId"]
              : null,
          elapsedSeconds,
          teams: {
            team100,
            team200,
          },
          ...(debug
            ? {
                debugNameFields,
              }
            : {}),
        },
        { status: 200 },
      );
    }

    // Otros errores (rate limit / permisos / etc)
    const riotErrorBody = await spectatorResponse.json().catch(() => ({}));
    /* console.error("[GET /api/riot/matches/active] Riot Spectator error:", {
      status: spectatorResponse.status,
      error: riotErrorBody,
    }); */

    return NextResponse.json(
      {
        hasActiveMatch: false,
        reason: "Riot API error",
        riotStatus: spectatorResponse.status,
      },
      { status: 200 },
    );
  } catch (error) {
    // console.error("[GET /api/riot/matches/active] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
