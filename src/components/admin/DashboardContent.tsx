// src/app/admin/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Newspaper,
  BookOpen,
  Users,
  TrendingUp,
  MessageSquare,
  RefreshCw,
  Plus,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import UsuariosStats from "@/components/admin/UsuariosStats";
import { RankSyncPanel } from "@/components/admin/RankSyncPanel";
import { SiteSettingsPanel } from "@/components/admin/SiteSettingsPanel";
import { Button } from "@/components/ui/button";

// Componente interno del dashboard
export default function DashboardContent() {
  const router = useRouter();
  type News = {
    id: string | number;
    titulo?: string | null;
    contenido?: string | null;
    imagen_portada?: string | null;
    fecha_publicacion?: string | null;
    created_at?: string | null;
    autor?: string | null;
    autor_id?: string | null;
  };
  const [stats, setStats] = useState({
    noticias: 0,
    foroHilos: 0,
    foroPosts: 0,
    wikiArticulos: 0,
    usuarios: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentNews, setRecentNews] = useState<News[]>([]);
  const [recentLoading, setRecentLoading] = useState<boolean>(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [authorUsernames, setAuthorUsernames] = useState<
    Record<string, string>
  >({});

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setStatsLoading(true);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const supabase = createClient();
      if (!supabase) {
        console.error(
          "[Dashboard] No se pudo obtener el cliente Supabase para estadísticas"
        );
        setStatsLoading(false);
        return;
      }

      const [noticiasResult, foroHilosResult, foroPostsResult, usuariosResult] =
        await Promise.allSettled([
          supabase.from("noticias").select("*", { count: "exact", head: true }),
          supabase
            .from("foro_hilos")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("foro_posts")
            .select("*", { count: "exact", head: true }),
          supabase.from("perfiles").select("*", { count: "exact", head: true }),
        ]);

      const getCount = (
        result: PromiseSettledResult<{ count: number | null }>
      ) =>
        result.status === "fulfilled" && result.value.count
          ? result.value.count
          : 0;

      setStats({
        noticias: getCount(noticiasResult),
        foroHilos: getCount(foroHilosResult),
        foroPosts: getCount(foroPostsResult),
        wikiArticulos: 0, // Placeholder
        usuarios: getCount(usuariosResult),
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
      setStats({
        noticias: 0,
        foroHilos: 0,
        foroPosts: 0,
        wikiArticulos: 0,
        usuarios: 0,
      });
    } finally {
      clearTimeout(timeoutId);
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setStatsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Cargar noticias recientes
  useEffect(() => {
    const loadRecent = async () => {
      setRecentLoading(true);
      setRecentError(null);
      try {
        const supabase = createClient();
        if (!supabase) {
          setRecentError("No se pudo inicializar Supabase");
          setRecentLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("noticias")
          .select(
            "id, titulo, contenido, imagen_portada, fecha_publicacion, created_at, autor, autor_id"
          )
          .order("created_at", { ascending: false })
          .limit(4);

        if (error) {
          setRecentError(error.message);
          setRecentNews([]);
        } else {
          const list = Array.isArray(data) ? data : [];
          setRecentNews(list);
          // Cargar usernames de autores
          const ids = Array.from(
            new Set(
              [
                ...list.map((n) => n.autor_id),
                ...list.map((n) => n.autor),
              ].filter((v): v is string => Boolean(v))
            )
          );
          if (ids.length > 0) {
            const { data: perfiles, error: perfilesError } = await supabase
              .from("perfiles")
              .select("id, username")
              .in("id", ids);
            if (!perfilesError && Array.isArray(perfiles)) {
              const map: Record<string, string> = {};
              for (const p of perfiles as {
                id: string;
                username?: string | null;
              }[]) {
                map[p.id] = p.username || "Autor desconocido";
              }
              setAuthorUsernames(map);
            }
          }
        }
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Error desconocido al cargar noticias";
        setRecentError(msg);
        setRecentNews([]);
      } finally {
        setRecentLoading(false);
      }
    };
    loadRecent();
  }, []);

  // AdminProtection ya maneja la autenticación, mostrar contenido directamente

  const statCards = [
    {
      title: "Noticias",
      value: stats.noticias,
      icon: Newspaper,
      color: "text-green-500",
      href: "/admin/noticias",
    },
    {
      title: "Foro",
      value: stats.foroHilos,
      icon: MessageSquare,
      color: "text-blue-500",
      href: "/admin/foro",
      description: `${stats.foroPosts} respuestas`,
    },
    {
      title: "Usuarios",
      value: stats.usuarios,
      icon: Users,
      color: "text-purple-500",
      href: "/admin/usuarios",
    },
    {
      title: "Eventos",
      value: 0,
      icon: Calendar,
      color: "text-amber-500",
      href: "/admin/eventos",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 text-gray-900 dark:text-white amoled:text-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="w-full">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-[13px] sm:text-sm text-muted-foreground amoled:text-gray-300 mt-1">
            Panel de control general de la comunidad
          </p>
          {lastUpdated && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 amoled:text-zinc-300 mt-1">
              Última actualización: {lastUpdated.toLocaleTimeString("es-ES")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto dark:bg-black dark:border-zinc-800/70 dark:hover:bg-zinc-900 bg-zinc-100 border-zinc-200 hover:bg-zinc-200"
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")}
            />
            {isRefreshing ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg dark:bg-black dark:border-zinc-800/60 bg-white/90 border-zinc-200/80 flex flex-col min-h-[110px] rounded-xl"
              onClick={() => router.push(card.href)}
            >
              <CardHeader className="flex flex-row items-center justify-between py-3 px-3 md:px-4">
                <CardTitle className="text-sm md:text-base font-semibold">
                  {card.title}
                </CardTitle>
                <Icon className={cn("h-5 w-5", card.color)} />
              </CardHeader>
              <CardContent className="flex flex-col justify-center items-center py-3 px-3 md:px-4 flex-grow">
                <div className="text-3xl md:text-4xl font-bold tracking-tight text-center">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-20 dark:bg-zinc-900 bg-zinc-200" />
                  ) : (
                    card.value
                  )}
                </div>
                {card.description && (
                  <div className="text-[11px] md:text-sm text-muted-foreground text-center mt-1">
                    {card.description}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Acciones rápidas */}
      <Card className="dark:bg-black dark:border-zinc-800/60 bg-white/90 border-zinc-200/80 rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Acciones rápidas</CardTitle>
          <CardDescription>Atajos para tareas frecuentes</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <Link href="/admin/noticias/ticker">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 dark:bg-zinc-950 dark:border-zinc-800/70 dark:hover:bg-zinc-900"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Configurar Ticker</span>
              </Button>
            </Link>
            <Link href="/admin/eventos/crear">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 dark:bg-zinc-950 dark:border-zinc-800/70 dark:hover:bg-zinc-900"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Nuevo evento</span>
              </Button>
            </Link>
            <Link href="/admin/foro">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 dark:bg-zinc-950 dark:border-zinc-800/70 dark:hover:bg-zinc-900"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">Ir al foro</span>
              </Button>
            </Link>
            <Link href="/admin/usuarios">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 dark:bg-zinc-950 dark:border-zinc-800/70 dark:hover:bg-zinc-900"
              >
                <Users className="h-4 w-4" />
                <span className="text-sm">Usuarios</span>
              </Button>
            </Link>
            <Link href="/admin/eventos">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 dark:bg-zinc-950 dark:border-zinc-800/70 dark:hover:bg-zinc-900"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Eventos</span>
              </Button>
            </Link>
            <Link href="/admin/noticias">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 dark:bg-zinc-950 dark:border-zinc-800/70 dark:hover:bg-zinc-900"
              >
                <Newspaper className="h-4 w-4" />
                <span className="text-sm">Noticias</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas detalladas de usuarios */}
      <UsuariosStats />

      {/* Panel de sincronización de rangos */}
      <RankSyncPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="dark:bg-black dark:border-zinc-800/60 bg-white/90 border-zinc-200/80 rounded-xl">
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
            <CardDescription>Últimas acciones en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 dark:text-zinc-400 text-zinc-500">
              <p>Próximamente: Registro de actividad</p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-black dark:border-zinc-800/60 bg-white/90 border-zinc-200/80 rounded-xl">
          <CardHeader>
            <CardTitle>Rendimiento</CardTitle>
            <CardDescription>Estadísticas de uso del sitio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px]">
              <div className="text-center dark:text-zinc-400 text-zinc-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="dark:text-zinc-400 text-zinc-500">
                  Próximamente: Gráficos de rendimiento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Noticias recientes */}
      <Card className="dark:bg-black dark:border-zinc-800/60 bg-white/90 border-zinc-200/80 rounded-xl">
        <CardHeader>
          <CardTitle>Noticias recientes</CardTitle>
          <CardDescription>Últimas publicaciones creadas</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800"
                >
                  <Skeleton className="h-10 w-10 rounded-md dark:bg-zinc-900 bg-zinc-200" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 dark:bg-zinc-900 bg-zinc-200" />
                    <Skeleton className="h-3 w-1/2 dark:bg-zinc-900 bg-zinc-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentError ? (
            <div className="text-sm text-red-500">{recentError}</div>
          ) : recentNews.length === 0 ? (
            <div className="text-sm text-muted-foreground amoled:text-gray-300">
              No hay noticias recientes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {recentNews.map((n) => (
                <Link
                  href={`/noticias/${n.id}`}
                  key={n.id}
                  className="group block"
                  aria-label={`Abrir noticia: ${n.titulo || "Sin título"}`}
                >
                  <div className="relative flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer">
                    {n.imagen_portada ? (
                      <img
                        src={n.imagen_portada}
                        alt={n.titulo || "Noticia"}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-zinc-200 dark:bg-zinc-900" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white amoled:text-white truncate group-hover:underline">
                        {n.titulo || "Sin título"}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 amoled:text-zinc-300 truncate">
                        {n.fecha_publicacion || n.created_at
                          ? new Date(
                              n.fecha_publicacion || n.created_at || ""
                            ).toLocaleString("es-ES", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Fecha desconocida"}
                      </p>
                    </div>
                    <span className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300 amoled:bg-zinc-900/70 amoled:text-zinc-300">
                      {authorUsernames[n.autor_id || n.autor || ""] ||
                        "Autor desconocido"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración del sitio */}
      <SiteSettingsPanel />
    </div>
  );
}

// Componente principal exportado con protección
