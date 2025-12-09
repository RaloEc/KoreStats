"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { ProfileData } from "@/hooks/use-perfil-usuario";
import { WeaponStatsCard } from "@/components/weapon/WeaponStatsCard";
import React from "react";

interface TabsActividadProps {
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
  ultimasPartidas?: ProfileData["ultimasPartidas"];
  userColor?: string;
}

export const TabsActividad = ({
  ultimosHilos,
  ultimosPosts,
  weaponStatsRecords,
  ultimasPartidas,
  userColor = "#3b82f6",
}: TabsActividadProps) => {
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
      if (!contenido || typeof document === "undefined") {
        return {
          hasCode: false,
          hasTweet: false,
          hasYoutube: false,
          hasImages: false,
          hasMentions: false,
          hasAny: false,
        };
      }

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = contenido;

      const hasCode =
        tempDiv.querySelector("pre") !== null ||
        tempDiv.querySelector("code") !== null;
      const hasTweet =
        tempDiv.querySelector('[data-type="twitter-embed"]') !== null;
      const hasYoutube = Array.from(tempDiv.querySelectorAll("iframe")).some(
        (iframe) => {
          const src = iframe.getAttribute("src") ?? "";
          return /youtube\.com|youtu\.be/.test(src);
        }
      );
      const hasImages = tempDiv.querySelector("img") !== null;
      const hasMentions =
        tempDiv.querySelector(".editor-mention") !== null ||
        /@\w+/.test(tempDiv.textContent ?? "");

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

  const getContentPreview = (contenido: string, lines: number = 3) => {
    if (!contenido || typeof document === "undefined") return "";

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = contenido;

    // Remover elementos que no queremos mostrar
    tempDiv
      .querySelectorAll('iframe, [data-type="twitter-embed"], img, pre, code')
      .forEach((el) => el.remove());

    // Obtener el texto limpio
    const text = tempDiv.textContent?.trim() || "";
    if (!text) return "";

    // Dividir por líneas y tomar las primeras N
    const textLines = text.split("\n").filter((line) => line.trim().length > 0);
    const preview = textLines.slice(0, lines).join("\n");

    // Limitar a 300 caracteres aproximadamente
    return preview.substring(0, 300) + (preview.length > 300 ? "..." : "");
  };

  return (
    <Tabs defaultValue="hilos" className="w-full" style={colorStyle}>
      <TabsList className="grid w-full grid-cols-4 sm:grid-cols-4">
        <TabsTrigger
          value="hilos"
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
        >
          <Newspaper className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Hilos</span>
          <span className="sm:hidden">Hilos</span>
          <span className="text-xs">({ultimosHilos?.length || 0})</span>
        </TabsTrigger>
        <TabsTrigger
          value="respuestas"
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
        >
          <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Respuestas</span>
          <span className="sm:hidden">Resp.</span>
          <span className="text-xs">({ultimosPosts?.length || 0})</span>
        </TabsTrigger>
        <TabsTrigger
          value="stats"
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
        >
          <Crosshair className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Armas Delta Force</span>
          <span className="sm:hidden">Armas Delta Force</span>
          <span className="text-xs">({weaponStatsRecords?.length || 0})</span>
        </TabsTrigger>
        <TabsTrigger
          value="partidas"
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
        >
          <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Partidas</span>
          <span className="sm:hidden">Partidas</span>
          <span className="text-xs">({ultimasPartidas?.length || 0})</span>
        </TabsTrigger>
      </TabsList>

      {/* Tab de Hilos */}
      <TabsContent value="hilos" className="mt-4">
        <Card className="transition-shadow hover:shadow-lg dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Newspaper className="h-4 w-4 sm:h-5 sm:w-5" />
              Últimos Hilos Creados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ultimosHilos?.length > 0 ? (
              <ul className="space-y-2 sm:space-y-3">
                {ultimosHilos.map((hilo) => (
                  <li
                    key={hilo.id}
                    className="group p-3 sm:p-4 rounded-lg border bg-card dark:border-gray-700 transition-all hover:shadow-md"
                    style={{
                      borderColor: `color-mix(in srgb, var(--user-color) 30%, transparent)`,
                      backgroundColor: `color-mix(in srgb, var(--user-color) 3%, transparent)`,
                      ...colorStyle,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-grow min-w-0">
                        <Link
                          href={`/foro/hilos/${hilo.slug || hilo.id}`}
                          className="font-semibold text-sm sm:text-base transition-colors line-clamp-2 text-foreground hover:text-foreground/80"
                        >
                          {hilo.titulo}
                        </Link>

                        {/* Preview del contenido */}
                        {(() => {
                          const preview = getContentPreview(hilo.contenido, 3);
                          return preview ? (
                            <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap break-words">
                              {preview}
                            </p>
                          ) : null;
                        })()}

                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(--user-color) 20%, transparent)`,
                              color: `var(--user-color)`,
                              ...colorStyle,
                            }}
                          >
                            {hilo.categoria_titulo}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatearFecha(hilo.created_at)}
                          </span>
                        </div>

                        {/* Contadores y multimedia */}
                        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border/50">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                            <span className="text-foreground font-medium">
                              {hilo.vistas}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs">
                            <MessageCircle className="h-3 w-3 text-muted-foreground" />
                            <span className="text-foreground font-medium">
                              {hilo.respuestas}
                            </span>
                          </span>

                          {/* Iconos de multimedia */}
                          {(() => {
                            const indicators = getContentIndicators(
                              hilo.contenido
                            );
                            return (
                              (indicators.hasAny || hilo.hasWeaponStats) && (
                                <div className="flex items-center gap-2 ml-auto text-gray-500 dark:text-gray-400">
                                  {hilo.hasWeaponStats && (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full border"
                                      style={{
                                        backgroundColor: `color-mix(in srgb, var(--user-color) 12%, transparent)`,
                                        color: `var(--user-color)`,
                                        borderColor: `color-mix(in srgb, var(--user-color) 35%, transparent)`,
                                        ...colorStyle,
                                      }}
                                    >
                                      <Crosshair
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                      />
                                      Stats
                                    </span>
                                  )}
                                  {indicators.hasCode && (
                                    <Code
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  )}
                                  {indicators.hasTweet && (
                                    <Twitter
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  )}
                                  {indicators.hasYoutube && (
                                    <Youtube
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  )}
                                  {indicators.hasImages && (
                                    <ImageIcon
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  )}
                                  {indicators.hasMentions && (
                                    <AtSign
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  )}
                                </div>
                              )
                            );
                          })()}
                        </div>
                      </div>
                      <Link
                        href={`/foro/hilos/${hilo.slug || hilo.id}`}
                        className="flex-shrink-0 p-2 rounded-md transition-colors hover:bg-muted"
                        aria-label="Ver hilo"
                      >
                        <ExternalLink
                          className="h-4 w-4 transition-colors text-muted-foreground hover:text-foreground"
                          style={{
                            ...colorStyle,
                          }}
                        />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Este usuario no ha creado ningún hilo todavía.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab de Respuestas */}
      <TabsContent value="respuestas" className="mt-4">
        <Card className="transition-shadow hover:shadow-lg dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
              Últimas Respuestas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ultimosPosts?.length > 0 ? (
              <ul className="space-y-2 sm:space-y-3">
                {ultimosPosts.map((post) => (
                  <li
                    key={post.id}
                    className="group p-3 sm:p-4 rounded-lg border bg-card dark:border-gray-700 transition-all hover:shadow-md"
                    style={{
                      borderColor: `color-mix(in srgb, var(--user-color) 30%, transparent)`,
                      backgroundColor: `color-mix(in srgb, var(--user-color) 3%, transparent)`,
                      ...colorStyle,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-grow min-w-0">
                        <p className="text-xs sm:text-sm italic text-muted-foreground line-clamp-2 mb-2">
                          "{post.contenido}"
                        </p>
                        <Link
                          href={`/foro/hilos/${post.hilo_id}#post-${post.id}`}
                          className="text-xs font-semibold hover:underline inline-flex items-center gap-1 transition-colors text-foreground"
                        >
                          en {post.hilo_titulo}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatearFecha(post.created_at)}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Este usuario no ha publicado ninguna respuesta todavía.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab de Armas Delta Force */}
      <TabsContent value="stats" className="mt-4">
        <Card className="transition-shadow hover:shadow-lg dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Crosshair className="h-4 w-4 sm:h-5 sm:w-5" />
              Armas Delta Force
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weaponStatsRecords?.length ? (
              <ul className="space-y-3 sm:space-y-4">
                {weaponStatsRecords.map((record) => {
                  return (
                    <li
                      key={record.hilo.id}
                      className="group p-3 sm:p-4 rounded-lg border bg-card dark:border-gray-800 transition-all hover:shadow-md"
                      style={{
                        borderColor: `color-mix(in srgb, var(--user-color) 30%, transparent)`,
                        backgroundColor: `color-mix(in srgb, var(--user-color) 3%, transparent)`,
                        ...colorStyle,
                      }}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide rounded-full border"
                                style={{
                                  backgroundColor: `color-mix(in srgb, var(--user-color) 12%, transparent)`,
                                  color: `var(--user-color)`,
                                  borderColor: `color-mix(in srgb, var(--user-color) 35%, transparent)`,
                                  ...colorStyle,
                                }}
                              >
                                <Crosshair
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                                {record.weapon_name ?? "Arma sin nombre"}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border text-muted-foreground">
                                {record.hilo.categoria_titulo}
                              </span>
                            </div>
                            <Link
                              href={`/foro/hilos/${
                                record.hilo.slug || record.hilo.id
                              }`}
                              className="text-sm sm:text-base font-semibold text-foreground hover:text-foreground/80 line-clamp-2"
                            >
                              {record.hilo.titulo}
                            </Link>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatearFecha(record.hilo.created_at)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {record.hilo.vistas}
                              </span>
                            </div>
                          </div>

                          <Link
                            href={`/foro/hilos/${
                              record.hilo.slug || record.hilo.id
                            }`}
                            className="flex-shrink-0 p-2 rounded-md transition-colors hover:bg-muted"
                            aria-label="Ver hilo con estadísticas"
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                          </Link>
                        </div>

                        {record.stats ? (
                          <div className="mt-2">
                            <WeaponStatsCard
                              stats={record.stats as any}
                              className="max-w-full bg-card border-border/40 dark:bg-slate-950/40"
                            />
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            No se encontraron estadísticas para esta arma.
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-8">
                <Crosshair className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Este usuario aún no ha publicado estadísticas de armas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab de Partidas LoL */}
      <TabsContent value="partidas" className="mt-4">
        <Card className="transition-shadow hover:shadow-lg dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
              Partidas Compartidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ultimasPartidas?.length > 0 ? (
              <ul className="space-y-2 sm:space-y-3">
                {ultimasPartidas.map((partida) => {
                  const isWin = partida.result === "win";

                  return (
                    <li
                      key={partida.id}
                      className="group p-3 sm:p-4 rounded-lg border bg-card dark:border-gray-700 transition-all hover:shadow-md"
                      style={{
                        borderColor: `color-mix(in srgb, var(--user-color) 30%, transparent)`,
                        backgroundColor: `color-mix(in srgb, var(--user-color) 3%, transparent)`,
                        ...colorStyle,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground">
                              {partida.championName}
                            </h3>
                            <span
                              className="inline-block text-xs px-2 py-1 rounded-full font-medium"
                              style={{
                                backgroundColor: isWin
                                  ? "rgba(34, 197, 94, 0.15)"
                                  : "rgba(239, 68, 68, 0.15)",
                                color: isWin ? "#22c55e" : "#ef4444",
                              }}
                            >
                              {isWin ? "Victoria" : "Derrota"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span
                              className="inline-block text-xs px-2 py-1 rounded-full text-foreground"
                              style={{
                                backgroundColor: `color-mix(in srgb, var(--user-color) 20%, transparent)`,
                                color: `var(--user-color)`,
                                ...colorStyle,
                              }}
                            >
                              {partida.role}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatearFecha(partida.created_at)}
                            </span>
                          </div>
                        </div>
                        <Trophy
                          className="w-5 h-5 flex-shrink-0"
                          style={{
                            color: `var(--user-color)`,
                            ...colorStyle,
                          }}
                        />
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 pt-3 border-t dark:border-gray-700">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {partida.kda.toFixed(2)}
                          </span>
                          <span>KDA</span>
                        </div>
                        <Link
                          href={`/match/${partida.matchId}`}
                          className="ml-auto flex items-center gap-1 text-xs hover:underline"
                          style={{
                            color: `var(--user-color)`,
                            ...colorStyle,
                          }}
                        >
                          Ver detalles
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Este usuario aún no ha compartido partidas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
