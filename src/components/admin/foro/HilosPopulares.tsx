/**
 * Componente para mostrar los hilos más populares del foro
 * Con opciones de filtrado por período
 */

"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useHilosPopulares } from "./hooks/useEstadisticasForo";
import {
  Eye,
  MessageSquare,
  TrendingUp,
  ArrowUp,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useUserTheme } from "@/hooks/useUserTheme";

type PeriodoType = 7 | 30 | 0;

export default function HilosPopulares() {
  const [periodo, setPeriodo] = useState<PeriodoType>(30);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { getFadedBackground } = useUserTheme();
  const { data: hilos, isLoading, error } = useHilosPopulares(10, periodo);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600">Error al cargar los hilos populares</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !hilos) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4 mt-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <TrendingUp className="h-5 w-5" />
              Hilos Más Populares
            </CardTitle>
            <CardDescription className="mt-2 text-xs sm:text-sm">
              Top 10 hilos por engagement
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={periodo === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodo(7)}
              className="text-xs sm:text-sm"
            >
              7 días
            </Button>
            <Button
              variant={periodo === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodo(30)}
              className="text-xs sm:text-sm"
            >
              30 días
            </Button>
            <Button
              variant={periodo === 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodo(0)}
              className="text-xs sm:text-sm"
            >
              Todo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="space-y-2 sm:space-y-4 px-4 sm:px-0">
          {hilos.map((hilo, index) => (
            <div
              key={hilo.id}
              className="flex items-start gap-2 sm:gap-4 p-2 sm:p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors"
            >
              {/* Ranking */}
              <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary font-bold text-xs sm:text-sm flex-shrink-0">
                {index + 1}
              </div>

              {/* Avatar del autor */}
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                <AvatarImage
                  src={hilo.autor_avatar_url || undefined}
                  alt={hilo.autor_username}
                />
                <AvatarFallback>
                  {hilo.autor_username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/foro/hilos/${hilo.slug}`}
                      className="font-medium hover:underline line-clamp-2 text-sm sm:text-base"
                    >
                      {hilo.titulo}
                    </Link>
                    <div className="flex items-center gap-1 sm:gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="truncate">
                        por {hilo.autor_username}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <Badge variant="outline" className="text-xs">
                        {hilo.categoria_nombre}
                      </Badge>
                    </div>
                  </div>
                  <Link
                    href={`/foro/hilos/${hilo.slug}`}
                    target="_blank"
                    className="flex-shrink-0"
                  >
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* Métricas */}
                <div className="flex items-center gap-1 sm:gap-3 mt-2 sm:mt-3 text-xs sm:text-sm flex-wrap">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">
                      {hilo.vistas.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{hilo.comentarios_count}</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{hilo.votos_conteo}</span>
                  </div>
                  <div className="ml-auto">
                    <Badge
                      variant="secondary"
                      className="text-xs whitespace-nowrap"
                    >
                      {Math.round(hilo.puntuacion_popularidad)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {hilos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay hilos en este período
          </div>
        )}
      </CardContent>
    </Card>
  );
}
