"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface UsuarioStats {
  total: number;
  activos: number;
  inactivos: number;
  admins: number;
  moderators: number;
  usuarios: number;
  nuevos_mes: number;
  nuevos_semana: number;
}

export default function UsuariosStats() {
  const [stats, setStats] = useState<UsuarioStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/usuarios/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card
            key={i}
            className="dark:bg-black dark:border-zinc-800/60 bg-white/90 border-zinc-200/80 rounded-xl"
          >
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 dark:bg-zinc-900 bg-zinc-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 dark:bg-zinc-900 bg-zinc-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="dark:bg-black dark:border-zinc-800/60 bg-white/90 border-zinc-200/80 rounded-xl">
        <CardContent className="p-6 text-center">
          <p className="dark:text-zinc-400 text-zinc-500">
            Error al cargar estadísticas de usuarios
          </p>
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: "Total Usuarios",
      value: stats.total,
      icon: Users,
      description: "Usuarios registrados",
      color: "text-blue-400",
    },
    {
      title: "Usuarios Activos",
      value: stats.activos,
      icon: UserCheck,
      description: `${stats.inactivos} inactivos`,
      color: "text-green-400",
    },
    {
      title: "Administradores",
      value: stats.admins,
      icon: ShieldCheck,
      description: `${stats.moderators} moderadores`,
      color: "text-red-400",
    },
    {
      title: "Nuevos (7 días)",
      value: stats.nuevos_semana,
      icon: TrendingUp,
      description: `${stats.nuevos_mes} este mes`,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="space-y-4 text-gray-900 dark:text-white amoled:text-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white amoled:text-white">
          Estadísticas de Usuarios
        </h3>
        <Badge
          variant="outline"
          className="text-gray-700 dark:text-gray-200 amoled:text-gray-200 dark:border-gray-700 amoled:border-gray-700"
        >
          <Calendar className="w-3 h-3 mr-1" />
          Actualizado ahora
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={index}
              className="dark:bg-black dark:border-zinc-800/60 bg-white/90 border-zinc-200/80 rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col min-h-[110px]"
            >
              <CardHeader className="flex flex-row items-center justify-between py-3 px-3 md:px-4 space-y-0">
                <CardTitle className="text-sm md:text-base font-semibold text-gray-900 dark:text-white amoled:text-white">
                  {card.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent className="flex flex-col justify-center items-center py-3 px-3 md:px-4 flex-grow">
                <div
                  className={`text-3xl md:text-4xl font-bold tracking-tight text-center ${card.color}`}
                >
                  {card.value.toLocaleString()}
                </div>
                {card.description && (
                  <p className="text-[11px] md:text-sm text-muted-foreground text-center mt-1">
                    {card.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Distribución por roles */}
      <Card className="dark:bg-black dark:border-zinc-800/60 bg-white/90 border-zinc-200/80 rounded-xl">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white amoled:text-white">
            Distribución por Roles
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Cantidad de usuarios por tipo de rol
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-red-400" />
                <span className="text-gray-700 dark:text-zinc-200 amoled:text-zinc-200">
                  Administradores
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-red-400 font-semibold">
                  {stats.admins}
                </span>
                <Badge
                  variant="destructive"
                  className="text-xs amoled:text-white"
                >
                  {((stats.admins / stats.total) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-gray-700 dark:text-zinc-200 amoled:text-zinc-200">
                  Moderadores
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-amber-400 font-semibold">
                  {stats.moderators}
                </span>
                <Badge variant="default" className="text-xs amoled:text-white">
                  {((stats.moderators / stats.total) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-gray-700 dark:text-zinc-200 amoled:text-zinc-200">
                  Usuarios
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-400 font-semibold">
                  {stats.usuarios}
                </span>
                <Badge
                  variant="secondary"
                  className="text-xs amoled:text-white"
                >
                  {((stats.usuarios / stats.total) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
