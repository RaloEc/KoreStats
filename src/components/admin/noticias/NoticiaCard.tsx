"use client";

import React, { memo, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Eye,
  Clock,
  TrendingUp,
  User,
  Calendar,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type {
  NoticiaReciente,
  NoticiaMasVista,
} from "../hooks/useNoticiasDashboard";
import { usePerformanceMetrics } from "../hooks/useNoticiasDashboard";

// =====================================================
// Tipos
// =====================================================

interface NoticiaCardProps {
  noticia: NoticiaReciente | NoticiaMasVista;
  variant?: "reciente" | "mas-vista" | "borrador";
  showImage?: boolean;
  onHover?: (id: string) => void;
  onClick?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// =====================================================
// Utilidades memoizadas
// =====================================================

const formatearFecha = (fecha: string | null | undefined): string => {
  if (!fecha) return "Sin fecha";
  try {
    return formatDistanceToNow(new Date(fecha), {
      addSuffix: true,
      locale: es,
    });
  } catch {
    return "Fecha inválida";
  }
};

const getEstadoConfig = (estado: string) => {
  const configs: Record<
    string,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      label: string;
      color: string;
    }
  > = {
    publicada: {
      variant: "default",
      label: "Publicada",
      color: "bg-green-500/10 text-green-700 dark:text-green-400",
    },
    borrador: {
      variant: "secondary",
      label: "Borrador",
      color: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    },
    programada: {
      variant: "outline",
      label: "Programada",
      color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    },
  };

  return configs[estado] || configs["borrador"];
};

const formatearNumero = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

// =====================================================
// Componente de Avatar memoizado
// =====================================================

const AutorAvatar = memo(function AutorAvatar({
  avatar,
  username,
}: {
  avatar: string | null;
  username: string | null;
}) {
  const initials = useMemo(() => {
    if (!username) return "?";
    return username.slice(0, 2).toUpperCase();
  }, [username]);

  return (
    <Avatar className="h-6 w-6">
      <AvatarImage src={avatar || undefined} alt={username || "Usuario"} />
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  );
});

// =====================================================
// Componente de Imagen memoizado
// =====================================================

const NoticiaImagen = memo(function NoticiaImagen({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  if (!src) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <Eye className="h-8 w-8 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover transition-transform duration-300 group-hover:scale-105"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      loading="lazy"
    />
  );
});

// =====================================================
// Componente de Tendencia
// =====================================================

const TendenciaIndicador = memo(function TendenciaIndicador({
  tendencia,
}: {
  tendencia: number;
}) {
  if (tendencia <= 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
      <TrendingUp className="h-3 w-3" />
      <span className="font-medium">{tendencia.toFixed(1)}</span>
    </div>
  );
});

// =====================================================
// Componente Principal de Tarjeta
// =====================================================

export const NoticiaCard = memo(
  function NoticiaCard({
    noticia,
    variant = "reciente",
    showImage = true,
    onHover,
    onClick,
    onDelete,
  }: NoticiaCardProps) {
    // Métricas de rendimiento
    usePerformanceMetrics("NoticiaCard");

    // Memoizar valores calculados
    const estadoConfig = useMemo(
      () => getEstadoConfig(noticia.estado || "borrador"),
      [noticia.estado]
    );
    const fechaFormateada = useMemo(
      () => formatearFecha(noticia.publicada_en || noticia.creada_en),
      [noticia.publicada_en, noticia.creada_en]
    );
    const vistasFormateadas = useMemo(
      () => formatearNumero(noticia.vistas),
      [noticia.vistas]
    );

    const esMasVista = "tendencia" in noticia;
    const tendencia = esMasVista ? (noticia as NoticiaMasVista).tendencia : 0;

    // Handlers
    const handleMouseEnter = () => {
      onHover?.(noticia.id);
    };

    const handleClick = () => {
      onClick?.(noticia.id);

      // Enviar evento de analytics
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "noticia_card_click", {
          event_category: "Dashboard",
          event_label: noticia.id,
          value: noticia.vistas,
        });
      }
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete?.(noticia.id);
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -4 }}
        onMouseEnter={handleMouseEnter}
      >
        <Link
          href={`/admin/noticias/editar/${noticia.id}`}
          onClick={handleClick}
        >
          <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 h-full">
            {/* Imagen de portada */}
            {showImage && (
              <div className="relative w-full h-40 overflow-hidden bg-muted">
                <NoticiaImagen
                  src={noticia.imagen_portada}
                  alt={noticia.titulo}
                />

                {/* Overlay con badges */}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                  <Badge className={estadoConfig.color}>
                    {estadoConfig.label}
                  </Badge>

                  {esMasVista && tendencia > 0 && (
                    <TendenciaIndicador tendencia={tendencia} />
                  )}
                </div>

                {/* Categoría */}
                {noticia.categoria_nombre && (
                  <div className="absolute bottom-2 left-2">
                    <Badge
                      variant="secondary"
                      className="backdrop-blur-sm bg-background/80"
                      style={
                        noticia.categoria_color
                          ? {
                              backgroundColor: `${noticia.categoria_color}20`,
                              borderColor: noticia.categoria_color,
                            }
                          : {}
                      }
                    >
                      {noticia.categoria_nombre}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            <CardContent className="p-4 space-y-3">
              {/* Título */}
              <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                {noticia.titulo}
              </h3>

              {/* Metadatos */}
              <div className="space-y-2">
                {/* Vistas y fecha */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    <span className="font-medium">{vistasFormateadas}</span>
                  </div>
                  <span className="text-muted-foreground/50">•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="truncate">{fechaFormateada}</span>
                  </div>
                </div>

                {/* Autor */}
                {noticia.autor_username && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AutorAvatar
                      avatar={noticia.autor_avatar}
                      username={noticia.autor_username}
                    />
                    <span className="truncate">{noticia.autor_username}</span>
                  </div>
                )}
              </div>

              {/* Acción */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  {variant === "mas-vista"
                    ? "Más vista"
                    : variant === "borrador"
                    ? "Borrador"
                    : "Reciente"}
                </span>
                <div className="flex items-center gap-2">
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      className="p-1 rounded-full hover:bg-destructive/10 text-destructive transition-colors z-20"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    // Comparación personalizada para optimizar re-renders
    return (
      prevProps.noticia.id === nextProps.noticia.id &&
      prevProps.noticia.vistas === nextProps.noticia.vistas &&
      prevProps.noticia.estado === nextProps.noticia.estado &&
      prevProps.variant === nextProps.variant &&
      prevProps.showImage === nextProps.showImage
    );
  }
);

// =====================================================
// Componente de Skeleton
// =====================================================

export const NoticiaCardSkeleton = memo(function NoticiaCardSkeleton({
  showImage = true,
}: {
  showImage?: boolean;
}) {
  return (
    <Card className="overflow-hidden h-full">
      {showImage && <div className="w-full h-40 bg-muted animate-pulse" />}
      <CardContent className="p-4 space-y-3">
        <div className="h-5 bg-muted animate-pulse rounded" />
        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
        <div className="flex gap-2">
          <div className="h-3 bg-muted animate-pulse rounded w-16" />
          <div className="h-3 bg-muted animate-pulse rounded w-20" />
        </div>
      </CardContent>
    </Card>
  );
});
