"use client";

import React, { useState, useEffect } from "react";
import { getQueueName } from "@/components/riot/match-card/helpers";
import { getSpellImg, getPerkImg } from "@/lib/riot/helpers";
import { usePerkAssets } from "@/components/riot/match-card/RunesTooltip";
import {
  computeParticipantScores,
  getParticipantKey,
} from "@/components/riot/match-card/performance-utils";
import {
  organizeMatchParticipants,
  type RiotParticipant,
} from "@/lib/riot/organize-participants";

interface MatchSummaryCardProps {
  match: any;
  gameVersion: string;
}

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// Pixel de error rojo para indicar que la imagen falló
const ERROR_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAgQHFUgAAAABJRU5ErkJggg==";

// Cache global para evitar re-procesar las mismas imágenes a Base64 múltiples veces
// Usamos un Map para poder limpiar entradas fallidas
const imageCache: Map<string, string> = new Map();
const pendingLoads: Map<string, Promise<string>> = new Map();
const failedUrls: Set<string> = new Set(); // Track URLs que han fallado

// --- Helper Functions ---

function getChampionIconUrl(championName: string, version: string): string {
  let name = championName;
  if (name === "FiddleSticks") name = "Fiddlesticks";
  if (name === "Wukong") name = "MonkeyKing";
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${name}.png`;
}

function getItemUrl(itemId: number, version: string): string | null {
  if (!itemId || itemId <= 0) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}

async function imageToBase64(url: string): Promise<string> {
  // Si la URL ya falló antes, no reintentar
  if (failedUrls.has(url)) {
    return ERROR_PIXEL;
  }

  // Si ya está en caché, devolverlo
  const cached = imageCache.get(url);
  if (cached) return cached;

  // Si ya se está cargando, esperar a esa promesa
  const pending = pendingLoads.get(url);
  if (pending) return pending;

  const loadPromise = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    // Timeout para evitar que imágenes se queden cargando indefinidamente
    const timeoutId = setTimeout(() => {
      console.warn(`[MatchSummaryCard] Timeout loading image: ${url}`);
      failedUrls.add(url);
      pendingLoads.delete(url);
      resolve(ERROR_PIXEL);
    }, 10000); // 10 segundos timeout

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error(`[MatchSummaryCard] No canvas context for: ${url}`);
          failedUrls.add(url);
          pendingLoads.delete(url);
          resolve(ERROR_PIXEL);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        imageCache.set(url, dataUrl);
        pendingLoads.delete(url);
        resolve(dataUrl);
      } catch (err) {
        console.error(`[MatchSummaryCard] Canvas error for ${url}:`, err);
        failedUrls.add(url);
        pendingLoads.delete(url);
        resolve(ERROR_PIXEL);
      }
    };

    img.onerror = (e) => {
      clearTimeout(timeoutId);
      console.error(`[MatchSummaryCard] Image load error for ${url}:`, e);
      failedUrls.add(url);
      pendingLoads.delete(url);
      resolve(ERROR_PIXEL);
    };

    let finalUrl = url;
    if (
      url.includes("ddragon.leagueoflegends.com") ||
      url.includes("communitydragon.org") ||
      url.includes("raw.communitydragon.org")
    ) {
      finalUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    img.src = finalUrl;
  });

  pendingLoads.set(url, loadPromise);
  return loadPromise;
}

function ProxiedImage({
  src,
  alt,
  style,
  className,
}: {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [imgSrc, setImgSrc] = useState(TRANSPARENT_PIXEL);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!src) return;
      try {
        let finalUrl = src;
        if (src.includes("/api/proxy-image?url=")) {
          try {
            const urlParam = new URL(
              src,
              window.location.origin
            ).searchParams.get("url");
            if (urlParam) finalUrl = decodeURIComponent(urlParam);
          } catch (e) {}
        }
        const base64 = await imageToBase64(finalUrl);
        if (isMounted) {
          setImgSrc(base64);
          setIsLoading(false);
        }
      } catch (e) {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      style={{
        ...style,
        opacity: isLoading ? 0.3 : 1,
        transition: "opacity 0.2s ease-in-out",
      }}
      className={className}
    />
  );
}

const MatchSummaryCardComponent = ({
  match,
  gameVersion,
}: MatchSummaryCardProps) => {
  // Normalize Version
  const normalizeVersion = (v: string): string => {
    if (!v) return "16.1.1";
    const parts = v.split(".");
    if (parts.length >= 2) return `${parts[0]}.${parts[1]}.1`;
    return "16.1.1";
  };
  const version = normalizeVersion(gameVersion || match?.game_version);

  // Match Info
  const queueId = match.queue_id || match.full_json?.info?.queueId;
  const gameMode = queueId ? getQueueName(queueId) : match.game_mode || "Match";
  const durationMins = Math.floor((match.game_duration || 0) / 60);
  const durationSecs = (match.game_duration || 0) % 60;
  const durationStr = `${durationMins}:${durationSecs
    .toString()
    .padStart(2, "0")}`;
  const gameDate = new Date(match.game_creation || Date.now());
  const dateStr = gameDate.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  // Helper for sorting by lane
  const laneOrder: Record<string, number> = {
    TOP: 0,
    JUNGLE: 1,
    MIDDLE: 2,
    MID: 2,
    BOTTOM: 3,
    BOT: 3,
    ADC: 3,
    UTILITY: 4,
    SUPPORT: 4,
    SUP: 4,
  };

  const sortByLane = (list: any[]) => {
    return [...list].sort((a, b) => {
      const laneA = (
        a.lane ||
        a.teamPosition ||
        a.individualPosition ||
        a.role ||
        ""
      ).toUpperCase();
      const laneB = (
        b.lane ||
        b.teamPosition ||
        b.individualPosition ||
        b.role ||
        ""
      ).toUpperCase();
      return (laneOrder[laneA] ?? 999) - (laneOrder[laneB] ?? 999);
    });
  };

  // Participants & Sorting
  const rawParticipants = (match.full_json?.info?.participants ||
    match.participants ||
    []) as RiotParticipant[];

  const { blueTeam, redTeam } = organizeMatchParticipants(rawParticipants);

  // Determine winners/losers for display (Team 1 = Winners, Team 2 = Losers)
  const isBlueWin = blueTeam.length > 0 && blueTeam[0].win;
  const team1 = isBlueWin ? blueTeam : redTeam;
  const team2 = isBlueWin ? redTeam : blueTeam;

  // Re-unified list for ranking calculations (now sorted by team then role)
  const participants = [...team1, ...team2];

  // Ranking Logic Standardized
  const scoreEntries = computeParticipantScores(
    participants,
    match.game_duration || 0,
    match.full_json?.info
  );

  const sortedEntries = [...scoreEntries].sort((a, b) => b.score - a.score);
  const rankingMap = new Map<string, number>();
  sortedEntries.forEach((entry, index) => {
    rankingMap.set(entry.key, index + 1);
  });

  const getRank = (p: any) => {
    const key = getParticipantKey(p);
    return rankingMap.get(key) || 10;
  };

  // Highlight Logic
  const maxDamage = Math.max(
    ...participants.map((p: any) => p.totalDamageDealtToChampions)
  );

  // MVP is the highest score
  const mvpKey = sortedEntries[0]?.key;
  const mvp =
    participants.find((p: any) => getParticipantKey(p) === mvpKey) ||
    participants[0];

  // Bulk Load Rune Assets
  // We extract all valid rune IDs to prime the hook
  const allPerkIds = participants
    .map((p: any) => p.perks?.styles?.[0]?.selections?.[0]?.perk)
    .filter((id: any) => !!id);

  // This hook will fetch the correct URL map for all these IDs
  const { perkIconById } = usePerkAssets(allPerkIds);

  const renderPlayerRow = (p: any, index: number, isWin: boolean) => {
    const championIcon = getChampionIconUrl(p.championName, version);
    const rank = getRank(p);

    // Spells
    const spell1Url = getSpellImg(p.summoner1Id, version);
    const spell2Url = getSpellImg(p.summoner2Id, version);

    // Robust Perk Extraction using Hook
    let primaryRuneId = null;
    if (p.perks?.styles?.[0]?.selections?.[0]?.perk) {
      primaryRuneId = p.perks.styles[0].selections[0].perk;
    }

    // Priority: Hook Map -> CommunityDragon Fallback -> null
    let runeUrl = null;
    if (primaryRuneId) {
      if (perkIconById[primaryRuneId]) {
        runeUrl = perkIconById[primaryRuneId];
      } else {
        // Second effort fallback
        runeUrl = `https://cdn.communitydragon.org/latest/perk/${primaryRuneId}`;
      }
    }

    // Trinket & Items
    const items = [0, 1, 2, 3, 4, 5].map((idx) => p[`item${idx}`]);
    const trinket = p.item6;
    const trinketUrl = getItemUrl(trinket, version);

    // Rank Colors
    const getRankColor = (r: number) => {
      if (r === 1) return "#fbbf24"; // Gold
      if (r === 2) return "#94a3b8"; // Silver
      if (r === 3) return "#b45309"; // Bronze
      return "rgba(255,255,255,0.3)"; // Grey
    };

    return (
      <div
        key={index}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          marginBottom: "2px",
          backgroundColor: isWin
            ? "rgba(16, 185, 129, 0.05)"
            : "rgba(239, 68, 68, 0.05)",
          borderLeft: isWin ? "3px solid #10b981" : "3px solid #ef4444",
          borderRadius: "4px",
          height: "60px",
        }}
      >
        {/* Rank & Champ & Name */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Rank Badge */}
          <div
            style={{
              width: "18px",
              textAlign: "center",
              fontSize: "12px",
              fontWeight: "900",
              color: getRankColor(rank),
              fontStyle: "italic",
              textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            <span
              style={{ fontSize: "9px", verticalAlign: "top", opacity: 0.7 }}
            >
              #
            </span>
            {rank}
          </div>

          {/* Champion Icon + Level Badge */}
          <div style={{ position: "relative", width: "36px", height: "36px" }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <ProxiedImage
                src={championIcon}
                alt={p.championName}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            {/* Level Badge */}
            <div
              style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "50%",
                width: "16px",
                height: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "9px",
                fontWeight: "bold",
                color: "white",
              }}
            >
              {p.champLevel}
            </div>
          </div>

          {/* Spells & Runes - Now closer to name or between champ/name */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "2px" }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                {spell1Url && (
                  <ProxiedImage
                    src={spell1Url}
                    alt="Spell1"
                    style={{ width: "100%", height: "100%" }}
                  />
                )}
              </div>
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                {spell2Url && (
                  <ProxiedImage
                    src={spell2Url}
                    alt="Spell2"
                    style={{ width: "100%", height: "100%" }}
                  />
                )}
              </div>
            </div>
            <div
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                overflow: "hidden",
                background: "rgba(0,0,0,0.3)",
                padding: "2px",
              }}
            >
              {runeUrl && (
                <ProxiedImage
                  src={runeUrl}
                  alt="Rune"
                  style={{ width: "100%", height: "100%" }}
                />
              )}
            </div>
          </div>

          {/* Name */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: "2px",
              minWidth: "60px",
              maxWidth: "70px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "white",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {p.riotIdGameName || p.summonerName}
            </span>
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.6)" }}>
              {p.championName}
            </span>
          </div>
        </div>

        {/* Stats compact */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ textAlign: "center", width: "45px" }}>
            <div
              style={{ fontSize: "12px", fontWeight: "800", color: "white" }}
            >
              {p.kills}/{p.deaths}/{p.assists}
            </div>
          </div>

          <div style={{ textAlign: "center", width: "28px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: "700",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {(p.totalDamageDealtToChampions / 1000).toFixed(1)}k
            </div>
          </div>

          <div style={{ textAlign: "center", width: "28px" }}>
            <div
              style={{ fontSize: "10px", fontWeight: "700", color: "#fbbf24" }}
            >
              {(p.goldEarned / 1000).toFixed(1)}k
            </div>
          </div>
        </div>

        {/* Items & Ward */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {/* Items Grid (2 rows of 3) */}
          <div
            style={{
              display: "flex",
              width: "66px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              gap: "2px",
              alignContent: "center",
            }}
          >
            {items.map((itemId, idx) => {
              const url = getItemUrl(itemId, version);
              return (
                <div
                  key={idx}
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "3px",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    overflow: "hidden",
                  }}
                >
                  {url && (
                    <ProxiedImage
                      src={url}
                      alt=""
                      style={{ width: "100%", height: "100%" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Separator Line */}
          <div
            style={{
              width: "1px",
              height: "24px",
              background: "rgba(255,255,255,0.1)",
              margin: "0 2px",
            }}
          ></div>

          {/* Ward (Trinket) - Centered Right */}
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "3px",
              backgroundColor: "rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}
          >
            {trinketUrl && (
              <ProxiedImage
                src={trinketUrl}
                alt="Ward"
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      id="match-summary-card"
      style={{
        width: "450px", // 9:16 approx width to match other card
        height: "800px",
        backgroundColor: "#0a101a",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
        color: "white",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(circle at 50% 0%, #1e293b 0%, #0a101a 80%)",
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "900",
              fontSize: "14px",
            }}
          >
            K
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "800",
              letterSpacing: "1px",
            }}
          >
            KORESTATS
          </div>
        </div>
        <div style={{ textAlign: "right", opacity: 0.8 }}>
          <span
            style={{ fontSize: "10px", fontWeight: "700", display: "block" }}
          >
            {gameMode}
          </span>
          <span style={{ fontSize: "9px", opacity: 0.7 }}>
            {durationStr} • {dateStr}
          </span>
        </div>
      </div>

      {/* Content Container - Vertical Flex */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        {/* Team 1 (Winners) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "4px",
              paddingLeft: "2px",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            <h3
              style={{ fontSize: "12px", fontWeight: "800", color: "#10b981" }}
            >
              VICTORIA
            </h3>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "11px",
                fontWeight: "700",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {team1.reduce((acc: number, p: any) => acc + p.kills, 0)} Kills
            </span>
          </div>
          {team1.map((p: any, i: number) => renderPlayerRow(p, i, true))}
        </div>

        {/* Separator */}
        <div
          style={{
            height: "1px",
            backgroundColor: "rgba(255,255,255,0.1)",
            margin: "4px 0",
          }}
        />

        {/* Team 2 (Losers) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "4px",
              paddingLeft: "2px",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                boxShadow: "0 0 8px #ef4444",
              }}
            />
            <h3
              style={{ fontSize: "12px", fontWeight: "800", color: "#ef4444" }}
            >
              DERROTA
            </h3>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "11px",
                fontWeight: "700",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {team2.reduce((acc: number, p: any) => acc + p.kills, 0)} Kills
            </span>
          </div>
          {team2.map((p: any, i: number) => renderPlayerRow(p, i, false))}
        </div>
      </div>

      {/* Footer Highlights - Keep basic but maybe compact it more if needed */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          marginTop: "10px",
          paddingTop: "10px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.5)",
              fontWeight: "700",
              textTransform: "uppercase",
            }}
          >
            MVP
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid #fbbf24",
              }}
            >
              <ProxiedImage
                src={getChampionIconUrl(mvp.championName, version)}
                alt=""
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <span
              style={{ fontSize: "11px", fontWeight: "800", color: "#fbbf24" }}
            >
              {mvp.riotIdGameName}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.5)",
              fontWeight: "700",
              textTransform: "uppercase",
            }}
          >
            DAÑO
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {participants
              .filter((p: any) => p.totalDamageDealtToChampions === maxDamage)
              .slice(0, 1)
              .map((p: any, i: number) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "1px solid #f87171",
                    }}
                  >
                    <ProxiedImage
                      src={getChampionIconUrl(p.championName, version)}
                      alt=""
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      color: "#f87171",
                    }}
                  >
                    {Math.round(p.totalDamageDealtToChampions / 100) / 10}k
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const MatchSummaryCard = React.memo(MatchSummaryCardComponent);
