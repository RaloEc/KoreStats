"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, ArrowRight } from "lucide-react";
import EventosWidget from "@/components/home/EventosWidget";
import { Noticia } from "./types";
import { CATEGORIAS_PREDEFINIDAS } from "./constants";

const ServerStatusWidget = dynamic(
  () => import("@/components/riot/ServerStatusWidget"),
  { ssr: false }
);

interface NewsSidebarProps {
  ultimasNoticias: Noticia[];
  userColor: string;
  adjustedPrimaryColor: string;
  isDarkMode: boolean;
  hoverStyles: React.CSSProperties;
}

export function NewsSidebar({
  ultimasNoticias,
  userColor,
  adjustedPrimaryColor,
  isDarkMode,
  hoverStyles,
}: NewsSidebarProps) {
  return (
    <div
      className="lg:w-1/3 space-y-6"
      style={
        {
          "--primary": adjustedPrimaryColor,
          "--primary-foreground": isDarkMode
            ? "hsl(210 20% 98%)"
            : "hsl(210 40% 98%)",
          "--primary-hover": isDarkMode
            ? `color-mix(in srgb, ${adjustedPrimaryColor} 10%, transparent)`
            : `color-mix(in srgb, ${adjustedPrimaryColor} 5%, transparent)`,
        } as React.CSSProperties
      }
    >
      {/* Estado del servidor de Riot (solo si hay problemas) */}
      <div className="hidden lg:block">
        <ServerStatusWidget />
      </div>

      {/* Últimas noticias */}
      <div
        className="rounded-xl p-4 transition-colors duration-300"
        style={{
          backgroundColor: `hsl(var(--primary) / 0.03)`,
          border: `1px solid hsl(var(--primary) / 0.1)`,
        }}
      >
        <h3
          className="font-bold text-foreground mb-4 flex items-center"
          style={
            {
              "--primary": userColor || "hsl(221.2 83.2% 53.3%)",
            } as React.CSSProperties
          }
        >
          <Clock className="h-4 w-4 mr-2 text-primary" />
          Últimas noticias
        </h3>
        <div className="space-y-4">
          {ultimasNoticias.slice(0, 4).map((noticia) => (
            <Link
              key={noticia.id}
              href={`/noticias/${noticia.id}`}
              className={`block group rounded-lg p-1 -mx-1 transition-all duration-200 
      hover:bg-[--primary-hover] dark:hover:bg-[--primary-hover]`}
              style={hoverStyles}
            >
              <div className="flex gap-3">
                <div
                  className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: `hsl(var(--primary) / 0.1)`,
                  }}
                >
                  {noticia.imagen_url ? (
                    <Image
                      src={noticia.imagen_url}
                      alt={noticia.titulo}
                      fill
                      className="object-cover"
                      sizes="64px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                      <div className="text-2xl">📰</div>
                    </div>
                  )}
                </div>
                <div
                  className="flex-1 min-w-0 transition-all duration-200 group-hover:translate-x-1"
                  style={
                    {
                      color: "inherit",
                      "--tw-text-opacity": "1",
                    } as React.CSSProperties
                  }
                >
                  <h4
                    className={`text-sm font-medium text-foreground 
      group-hover:text-[--primary] dark:group-hover:text-[--primary]
      transition-colors duration-200 line-clamp-2`}
                  >
                    {noticia.titulo}
                  </h4>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <span>
                      {format(new Date(noticia.created_at), "dd MMM", {
                        locale: es,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/noticias"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center"
            style={
              {
                "--primary": userColor || "hsl(221.2 83.2% 53.3%)",
              } as React.CSSProperties
            }
          >
            Ver todas las noticias <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Widget de eventos */}
      <EventosWidget className="mb-6" />

      {/* Widget de categorías */}
      <div
        className="rounded-xl p-4 transition-colors duration-300"
        style={{
          backgroundColor: `hsl(var(--primary) / 0.03)`,
          border: `1px solid hsl(var(--primary) / 0.1)`,
        }}
      >
        <h3 className="font-bold text-foreground mb-4">Categorías</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS_PREDEFINIDAS.map((categoria, index) => (
            <Link
              key={index}
              href={`/noticias?categoria=${categoria.nombre.toLowerCase()}`}
              className="text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105 hover:shadow-sm"
              style={
                {
                  backgroundColor: `${categoria.color}15`,
                  color: categoria.color,
                  "--tw-ring-color": categoria.color,
                  "--tw-ring-opacity": "0.2",
                } as React.CSSProperties
              }
            >
              {categoria.nombre}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
