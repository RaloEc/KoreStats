/**
 * Componente para mostrar los usuarios más activos del foro
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
import { useUsuariosActivos } from "./hooks/useEstadisticasForo";
import {
  Users,
  MessageSquare,
  FileText,
  Award,
  TrendingUp,
} from "lucide-react";

type PeriodoType = 7 | 30 | 0;

export default function UsuariosActivos() {
  const [periodo, setPeriodo] = useState<PeriodoType>(30);
  const { data: usuarios, isLoading, error } = useUsuariosActivos(10, periodo);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600">Error al cargar usuarios activos</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !usuarios) {
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
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48 mt-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRolColor = (rol: string) => {
    switch (rol.toLowerCase()) {
      case "admin":
        return "bg-red-500";
      case "moderador":
        return "bg-blue-500";
      case "vip":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-5 w-5" />
              Usuarios Más Activos
            </CardTitle>
            <CardDescription className="mt-2 text-xs sm:text-sm">
              Top 10 usuarios por actividad
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
        <div className="space-y-2 sm:space-y-3 px-4 sm:px-0">
          {usuarios.map((usuario, index) => (
            <div
              key={usuario.usuario_id}
              className="flex items-start sm:items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors text-sm sm:text-base"
            >
              {/* Ranking */}
              <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary font-bold text-xs sm:text-sm flex-shrink-0">
                {index + 1}
              </div>

              {/* Avatar y nombre */}
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Avatar className="h-8 w-8 sm:h-12 sm:w-12 flex-shrink-0">
                  <AvatarImage
                    src={usuario.avatar_url || undefined}
                    alt={usuario.username}
                  />
                  <AvatarFallback>
                    {usuario.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="font-medium truncate text-sm sm:text-base">
                      {usuario.username}
                    </span>
                    {usuario.role && usuario.role !== "usuario" && (
                      <Badge
                        variant="secondary"
                        className={`text-xs flex-shrink-0 ${getRolColor(
                          usuario.role
                        )} text-white`}
                      >
                        {usuario.role}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {usuario.hilos_creados || 0}h
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {usuario.comentarios_creados || 0}c
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {usuario.total_votos_recibidos || 0}v
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actividad Total */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                <div className="text-right">
                  <div className="font-bold text-sm sm:text-lg">
                    {(usuario.hilos_creados || 0) +
                      (usuario.comentarios_creados || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    actividad
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {usuarios.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay usuarios activos en este período
          </div>
        )}
      </CardContent>
    </Card>
  );
}
