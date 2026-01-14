"use client";

import React, { useState, useEffect } from "react";
import { getQueueName } from "@/components/riot/match-card/helpers";
import {
  resolveDDragonAssetVersion,
  getSpellImg,
  getRuneStyleImg,
  getPerkImg,
} from "@/lib/riot/helpers";
import { usePerkAssets } from "@/components/riot/match-card/RunesTooltip";

interface MatchShareCardProps {
  participant: any;
  match: any;
  gameVersion: string;
  userColor?: string | null;
}

const DEFAULT_COLOR = "#6366F1"; // Indigo default
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// Pixel de error (gris oscuro, no rojo para evitar ser muy llamativo)
const ERROR_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Cache robusto con TTL para evitar contaminación
interface CacheEntry {
  data: string;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const imageCache: Map<string, CacheEntry> = new Map();
const pendingLoads: Map<string, Promise<string>> = new Map();

// Limpiar entradas expiradas del cache periódicamente
function cleanExpiredCache() {
  const now = Date.now();
  const entries = Array.from(imageCache.entries());
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > CACHE_TTL) {
      imageCache.delete(key);
    }
  }
}

// Limpiar cada minuto
if (typeof window !== "undefined") {
  setInterval(cleanExpiredCache, 60000);
}

/**
 * Genera URL del icono del campeón
 */
function getChampionIconUrl(championName: string, version: string): string {
  let name = championName;
  if (name === "FiddleSticks") name = "Fiddlesticks";
  if (name === "Wukong") name = "MonkeyKing";
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${name}.png`;
}

/**
 * Genera URL del item
 */
function getItemUrl(itemId: number, version: string): string | null {
  if (!itemId || itemId <= 0) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}

/**
 * Convierte HEX a RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 99, g: 102, b: 241 };
}

/**
 * Convierte una imagen a base64 usando un canvas
 * Versión robusta para producción con manejo de errores mejorado
 */
async function imageToBase64(originalUrl: string): Promise<string> {
  if (!originalUrl || originalUrl === "null" || originalUrl === "undefined") {
    return TRANSPARENT_PIXEL;
  }

  // Verificar cache válido
  const cached = imageCache.get(originalUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Si ya se está cargando esta URL específica, esperar
  const pending = pendingLoads.get(originalUrl);
  if (pending) {
    return pending;
  }

  // Crear promesa de carga única para esta URL
  const loadPromise = new Promise<string>((resolve) => {
    // Usar Image con timestamp único para evitar cache del navegador
    const img = new Image();
    img.crossOrigin = "anonymous";

    let resolved = false;
    const safeResolve = (result: string) => {
      if (resolved) return;
      resolved = true;
      pendingLoads.delete(originalUrl);

      // Solo cachear si es un resultado exitoso (no error pixel)
      if (result !== ERROR_PIXEL && result !== TRANSPARENT_PIXEL) {
        imageCache.set(originalUrl, { data: result, timestamp: Date.now() });
      }
      resolve(result);
    };

    // Timeout más corto para fallar rápido
    const timeoutId = setTimeout(() => {
      console.warn(
        `[MatchShareCard] Timeout: ${originalUrl.substring(0, 60)}...`
      );
      safeResolve(ERROR_PIXEL);
    }, 8000);

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        // Verificar que la imagen tenga dimensiones válidas
        if (img.width === 0 || img.height === 0) {
          console.warn(`[MatchShareCard] Zero dimensions for: ${originalUrl}`);
          safeResolve(ERROR_PIXEL);
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          console.error(`[MatchShareCard] No canvas context`);
          safeResolve(ERROR_PIXEL);
          return;
        }

        ctx.drawImage(img, 0, 0);

        // Verificar que el canvas no esté vacío
        try {
          const dataUrl = canvas.toDataURL("image/png");
          if (dataUrl && dataUrl.length > 100) {
            safeResolve(dataUrl);
          } else {
            safeResolve(ERROR_PIXEL);
          }
        } catch (e) {
          // Error de seguridad (tainted canvas)
          console.error(`[MatchShareCard] Canvas tainted:`, e);
          safeResolve(ERROR_PIXEL);
        }
      } catch (err) {
        console.error(`[MatchShareCard] Canvas error:`, err);
        safeResolve(ERROR_PIXEL);
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      console.warn(
        `[MatchShareCard] Image load failed: ${originalUrl.substring(0, 60)}...`
      );
      safeResolve(ERROR_PIXEL);
    };

    // Construir URL del proxy
    let finalUrl = originalUrl;
    if (
      originalUrl.includes("ddragon.leagueoflegends.com") ||
      originalUrl.includes("communitydragon.org")
    ) {
      // Añadir cachebuster para evitar cache problemático
      const cacheBuster = Date.now().toString(36);
      finalUrl = `/api/proxy-image?url=${encodeURIComponent(
        originalUrl
      )}&_=${cacheBuster}`;
    }

    img.src = finalUrl;
  });

  pendingLoads.set(originalUrl, loadPromise);
  return loadPromise;
}

/**
 * Imagen con fallback robusto para html-to-image
 * Convierte las imágenes a base64 para evitar problemas de CORS
 * NOTA: No usar loading="lazy" ya que las imágenes se renderizan off-screen
 */
function ProxiedImage({
  src,
  alt,
  style,
}: {
  src: string;
  alt: string;
  style?: React.CSSProperties;
}) {
  const [hasError, setHasError] = useState(false);
  const [imgSrc, setImgSrc] = useState(TRANSPARENT_PIXEL);
  const [isLoading, setIsLoading] = useState(true);
  // Track the current src to reset state when it changes
  const [currentSrc, setCurrentSrc] = useState(src);

  // Reset state when src changes
  useEffect(() => {
    if (src !== currentSrc) {
      setCurrentSrc(src);
      setImgSrc(TRANSPARENT_PIXEL);
      setIsLoading(true);
      setHasError(false);
    }
  }, [src, currentSrc]);

  useEffect(() => {
    let isMounted = true;

    // Generate a unique request ID for this load
    const requestId = `${src}-${Date.now()}`;

    const loadImage = async () => {
      if (!src) {
        setIsLoading(false);
        return;
      }

      try {
        // Si la URL es del proxy, extraer la URL original
        let finalUrl = src;
        if (src.includes("/api/proxy-image?url=")) {
          try {
            const urlParam = new URL(
              src,
              typeof window !== "undefined"
                ? window.location.origin
                : "https://korestats.com"
            ).searchParams.get("url");
            if (urlParam) {
              finalUrl = decodeURIComponent(urlParam);
            }
          } catch (e) {
            console.warn("Error al extraer URL del proxy:", e);
          }
        }

        // Convertir a base64 para evitar problemas de CORS con html-to-image
        const base64 = await imageToBase64(finalUrl);

        if (isMounted) {
          setImgSrc(base64);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn("Error al cargar imagen:", src, err);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [src]); // Only depend on src

  return (
    <img
      src={imgSrc}
      alt={alt}
      // NO usar loading="lazy" - rompe la captura off-screen
      style={{
        ...style,
        backgroundColor: hasError ? "rgba(30, 41, 59, 0.5)" : undefined,
        opacity: isLoading ? 0.3 : 1,
        transition: "opacity 0.2s ease-in-out",
      }}
      onError={() => setHasError(true)}
    />
  );
}

const MatchShareCardComponent = ({
  participant,
  match,
  gameVersion,
  userColor,
}: MatchShareCardProps) => {
  const isWin = participant.win;
  const championName = participant.championName || "Unknown";
  const accentColor = userColor || DEFAULT_COLOR;
  const rgb = hexToRgb(accentColor);

  // Normalizar la versión del parche para DDragon
  // DDragon usa versiones como "16.1.1", no "15.24.734.7485"
  const normalizeVersion = (v: string): string => {
    if (!v) return "16.1.1";
    const parts = v.split(".");
    // Si tiene más de 3 partes o la tercera parte es muy larga, normalizar
    if (parts.length >= 2) {
      const major = parts[0];
      const minor = parts[1];
      // Usar "1" como tercer dígito por defecto
      return `${major}.${minor}.1`;
    }
    return "16.1.1";
  };

  const rawVersion = gameVersion || match.game_version || "16.1.1";
  const version = normalizeVersion(rawVersion);

  // Metadata
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

  // Stats Base
  const kills = participant.kills || 0;
  const deaths = participant.deaths || 0;
  const assists = participant.assists || 0;
  const kdaRatio = ((kills + assists) / Math.max(1, deaths)).toFixed(2);
  const cs =
    (participant.totalMinionsKilled || 0) +
    (participant.neutralMinionsKilled || 0);
  const damage = participant.totalDamageDealtToChampions || 0;
  const gold = participant.goldEarned || 0;
  const vision = participant.visionScore || 0;

  // Items (0-5 are main items, 6 is trinket/ward)
  const mainItems = [
    participant.item0 || 0,
    participant.item1 || 0,
    participant.item2 || 0,
    participant.item3 || 0,
    participant.item4 || 0,
    participant.item5 || 0,
  ];
  const trinket = participant.item6 || 0;

  // Cálculos de Equipo (Para el espacio inferior)
  const teamId = participant.teamId;
  const participants = match.full_json?.info?.participants || [];
  const teamMates = participants.filter((p: any) => p.teamId === teamId);
  const teamKills = teamMates.reduce((sum: number, p: any) => sum + p.kills, 0);
  const teamDamage = teamMates.reduce(
    (sum: number, p: any) => sum + p.totalDamageDealtToChampions,
    0
  );

  const kp =
    teamKills > 0 ? (((kills + assists) / teamKills) * 100).toFixed(0) : "0";
  const damageShare =
    teamDamage > 0 ? ((damage / teamDamage) * 100).toFixed(0) : "0";

  // Badges de Multi-kill
  let multiKillBadge = "";
  if (participant.pentaKills > 0) multiKillBadge = "PENTAKILL";
  else if (participant.quadraKills > 0) multiKillBadge = "QUADRAKILL";
  else if (participant.tripleKills > 0) multiKillBadge = "TRIPLEKILL";
  else if (participant.doubleKills > 0) multiKillBadge = "DOUBLEKILL";

  // Assets
  const spell1Id = participant.summoner1Id || participant.summoner1_id;
  const spell2Id = participant.summoner2Id || participant.summoner2_id;
  const spell1Url = spell1Id ? getSpellImg(spell1Id, version) : null;
  const spell2Url = spell2Id ? getSpellImg(spell2Id, version) : null;

  // Corrección Runas (Asegurando obtener la Keystone correcta)
  const primaryPerkId =
    participant.perks?.styles?.[0]?.selections?.[0]?.perk ||
    participant.perkPrimaryStyle;
  const subStyleId =
    participant.perks?.styles?.[1]?.style || participant.perkSubStyle;

  // Hook para assets de runas confiables
  const { perkIconById } = usePerkAssets([primaryPerkId]);
  const primaryPerkUrl = primaryPerkId
    ? perkIconById[primaryPerkId] || getPerkImg(primaryPerkId)
    : null;

  const subStyleUrl = subStyleId ? getRuneStyleImg(subStyleId) : null;

  // State for random skin
  // Usar skinId del match (feed) o default 0
  const skinId = (match as any).skinId || 0;

  // Update getSplashUrl to use dynamic skinId
  const getDynamicSplashUrl = (name: string, skin: number) => {
    let n = name;
    if (n === "FiddleSticks") n = "Fiddlesticks";
    if (n === "Wukong") n = "MonkeyKing";
    return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${n}_${skin}.jpg`;
  };

  // Usar URLs directas sin proxy para que html-to-image pueda capturarlas
  const splashUrl = getDynamicSplashUrl(championName, skinId);
  const championIconUrl = getChampionIconUrl(championName, version);

  return (
    <div
      id="match-share-card"
      style={{
        width: "450px",
        height: "800px",
        backgroundColor: "#0a101a",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
        color: "white",
      }}
    >
      {/* Background with Blur */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {/* Usamos un div contenedor para el filtro de blur, más seguro para html-to-image */}
        <div style={{ position: "absolute", inset: 0, filter: "blur(8px)" }}>
          <ProxiedImage
            src={splashUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              transform: "scale(1.1)", // Escalar para evitar bordes blancos por el blur
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, 
              rgba(10, 16, 26, 0.85) 0%,
              rgba(10, 16, 26, 0.6) 30%,
              rgba(10, 16, 26, 0.95) 70%,
              rgba(10, 16, 26, 1) 100%)`, // Degradado más oscuro
          }}
        />
      </div>

      {/* Main Container */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "24px",
        }}
      >
        {/* Header Minimalist */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}88 100%)`,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "900",
                fontSize: "16px",
                boxShadow: `0 0 15px ${accentColor}44`,
              }}
            >
              K
            </div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "800",
                letterSpacing: "0.1em",
                opacity: 0.9,
              }}
            >
              KORESTATS
            </span>
          </div>
          <div style={{ textAlign: "right", opacity: 0.8 }}>
            <span style={{ fontSize: "12px", fontWeight: "700" }}>
              {gameMode}
            </span>
            <span style={{ margin: "0 6px", opacity: 0.5 }}>•</span>
            <span style={{ fontSize: "11px" }}>
              {durationStr} • {dateStr}
            </span>
          </div>
        </div>

        {/* Avatar Wings */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px",
            marginTop: "10px",
            marginBottom: "20px",
          }}
        >
          {/* Spells */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[spell1Url, spell2Url].map(
              (url, i) =>
                url && (
                  <div
                    key={i}
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.15)",
                      backgroundColor: "#000",
                    }}
                  >
                    <ProxiedImage
                      src={url}
                      alt=""
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                )
            )}
          </div>

          {/* Core Avatar */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: "106px",
                height: "106px",
                borderRadius: "50%",
                border: `3px solid ${accentColor}`,
                boxShadow: `0 0 30px ${accentColor}55`,
                overflow: "hidden",
                backgroundColor: "#000",
              }}
            >
              <ProxiedImage
                src={championIconUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "-6px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#0a101a",
                border: `1.5px solid ${accentColor}`,
                borderRadius: "5px",
                padding: "1px 6px",
                fontSize: "10px",
                fontWeight: "900",
              }}
            >
              {participant.champLevel || 18}
            </div>
          </div>

          {/* Runes */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.15)",
                backgroundColor: "rgba(0,0,0,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {primaryPerkUrl && (
                <ProxiedImage
                  src={primaryPerkUrl}
                  alt=""
                  style={{ width: "90%", height: "90%", objectFit: "contain" }}
                />
              )}
            </div>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.15)",
                backgroundColor: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {subStyleUrl && (
                <ProxiedImage
                  src={subStyleUrl}
                  alt=""
                  style={{
                    width: "60%",
                    height: "60%",
                    objectFit: "contain",
                    opacity: 0.9,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Player Name & Champion */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "30px",
              fontWeight: "900",
              letterSpacing: "-0.01em",
            }}
          >
            {participant.riotIdGameName || participant.summonerName}
            <span
              style={{
                fontSize: "18px",
                color: "#94a3b8",
                fontWeight: "300",
                marginLeft: "4px",
                fontFamily: "monospace",
              }}
            >
              #{participant.riotIdTagline || "RIOT"}
            </span>
          </div>
          <div
            style={{
              fontSize: "16px",
              color: accentColor,
              fontWeight: "700",
              textTransform: "uppercase",
              marginTop: "2px",
            }}
          >
            {championName}
          </div>

          <div
            style={{
              display: "inline-block",
              marginTop: "12px",
              padding: "4px 20px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "900",
              border: `1px solid ${isWin ? "#10b98144" : "#ef444444"}`,
              background: `${isWin ? "#10b98115" : "#ef444415"}`,
              color: isWin ? "#10b981" : "#ef4444",
            }}
          >
            {isWin ? "VICTORIA" : "DERROTA"}
          </div>
        </div>

        {/* KDA Section */}
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <div
            style={{
              display: "inline-block",
              borderBottom: `2px solid rgba(255,255,255,0.05)`,
              paddingBottom: "10px",
            }}
          >
            <span style={{ fontSize: "42px", fontWeight: "950" }}>{kills}</span>
            <span
              style={{
                fontSize: "24px",
                color: "rgba(255,255,255,0.15)",
                margin: "0 8px",
              }}
            >
              /
            </span>
            <span
              style={{ fontSize: "42px", fontWeight: "950", color: "#ef4444" }}
            >
              {deaths}
            </span>
            <span
              style={{
                fontSize: "24px",
                color: "rgba(255,255,255,0.15)",
                margin: "0 8px",
              }}
            >
              /
            </span>
            <span style={{ fontSize: "42px", fontWeight: "950" }}>
              {assists}
            </span>
          </div>
          <div
            style={{
              marginTop: "8px",
              fontSize: "18px",
              color: "#94a3b8",
              fontWeight: "600",
            }}
          >
            <span
              style={{
                color: accentColor,
                fontSize: "24px",
                fontWeight: "900",
              }}
            >
              {kdaRatio}
            </span>{" "}
            KDA
          </div>
        </div>

        {/* Items */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginBottom: "30px",
          }}
        >
          {mainItems.map((itemId, i) => {
            const url = getItemUrl(itemId, version);
            return (
              <div
                key={i}
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.08)",
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
          <div
            style={{
              width: "1px",
              height: "24px",
              background: "rgba(255,255,255,0.15)",
              margin: "0 4px",
            }}
          />
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {getItemUrl(trinket, version) && (
              <ProxiedImage
                src={getItemUrl(trinket, version)!}
                alt=""
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </div>
        </div>

        {/* Stats Grid - One Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.05)",
            marginBottom: "25px",
            backdropFilter: "blur(10px)",
          }}
        >
          {[
            { label: "DAÑO", value: `${(damage / 1000).toFixed(1)}k` },
            { label: "ORO", value: `${(gold / 1000).toFixed(1)}k` },
            { label: "CS", value: cs },
            { label: "VISIÓN", value: vision },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: "800",
                  marginBottom: "4px",
                }}
              >
                {stat.label}
              </div>
              <div style={{ fontSize: "20px", fontWeight: "900" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* --- PERFORMANCE ANALYSIS (SPACE FILLER) --- */}
        <div style={{ marginTop: "auto", marginBottom: "30px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "900",
              letterSpacing: "0.2em",
              color: "#64748b",
              textAlign: "center",
              marginBottom: "20px",
              textTransform: "uppercase",
            }}
          >
            ANÁLISIS DE RENDIMIENTO
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
            }}
          >
            {/* KP Circle */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  position: "relative",
                  width: "70px",
                  height: "70px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="70" height="70" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="8"
                    strokeDasharray={`${parseInt(kp) * 2.82} 282`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    fontSize: "18px",
                    fontWeight: "900",
                  }}
                >
                  {kp}
                  <span style={{ fontSize: "10px" }}>%</span>
                </div>
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "#94a3b8",
                  fontWeight: "700",
                  marginTop: "8px",
                }}
              >
                PARTICIPACIÓN
              </div>
            </div>

            {/* Multi-kill Badge (If exists) */}
            {multiKillBadge && (
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    background: `linear-gradient(135deg, ${accentColor} 0%, #000 100%)`,
                    padding: "6px 12px", // Menos padding
                    borderRadius: "8px",
                    border: `1px solid ${accentColor}`,
                    boxShadow: `0 0 20px ${accentColor}33`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px", // Fuente más pequeña
                      fontWeight: "900",
                      textShadow: "0 0 10px white",
                    }}
                  >
                    {multiKillBadge}
                  </div>
                </div>
              </div>
            )}

            {/* DMG Share Circle */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  position: "relative",
                  width: "70px",
                  height: "70px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="70" height="70" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="8"
                    strokeDasharray={`${parseInt(damageShare) * 2.82} 282`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    fontSize: "18px",
                    fontWeight: "900",
                  }}
                >
                  {damageShare}
                  <span style={{ fontSize: "10px" }}>%</span>
                </div>
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "#94a3b8",
                  fontWeight: "700",
                  marginTop: "8px",
                }}
              >
                DAÑO DE EQ.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            opacity: 0.4,
          }}
        >
          <div
            style={{
              height: "1px",
              flex: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.2))",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              fontWeight: "900",
              letterSpacing: "0.2em",
            }}
          >
            KORESTATS.COM
          </span>
          <div
            style={{
              height: "1px",
              flex: 1,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.2), transparent)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const MatchShareCard = React.memo(MatchShareCardComponent);
