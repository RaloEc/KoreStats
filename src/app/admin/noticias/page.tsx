"use client";

import { memo, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import AdminProtection from "@/components/AdminProtection";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import EstadisticaCard from "@/components/admin/EstadisticaCard";
import RealTimeIndicator from "@/components/admin/RealTimeIndicator";
import { useAdminEstadisticas } from "@/components/admin/hooks/useAdminEstadisticas";
import { useNoticiasDashboard } from "@/components/admin/hooks/useNoticiasDashboard";
import { useEstadisticasDetalladas } from "@/components/admin/hooks/useEstadisticasDetalladas";
import {
  NoticiaCard,
  NoticiaCardSkeleton as NoticiaCardSkeletonComponent,
} from "@/components/admin/noticias/NoticiaCard";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import {
  EstadisticasTabla,
  EstadisticasTablaLoading,
} from "@/components/admin/noticias/EstadisticasTabla";
import {
  EstadisticasGraficos,
  EstadisticasGraficosLoading,
} from "@/components/admin/noticias/EstadisticasGraficos";
import {
  Newspaper,
  Plus,
  BarChart2,
  Tag,
  ListFilter,
  Eye,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  FileText,
  Settings,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  BarChart3,
  Flag,
  Trash2,
  Wand2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// Componente para enlaces de navegación
const NavCard = memo(function NavCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full hover:bg-[var(--primary-hover,oklch(var(--muted)))] transition-all hover:shadow-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
});

// Los componentes de tarjetas ahora están en archivos separados y optimizados

function AdminNoticiasContent() {
  const router = useRouter();
  const { estadisticas, isLoading, error, isRealTimeActive, lastUpdate } =
    useAdminEstadisticas();
  const {
    recientes: noticiasRecientes,
    masVistas: noticiasMasVistas,
    borradores: noticiasBorradores,
    isLoading: loadingNoticias,
    prefetchNoticia,
    refetch: refetchNoticias,
  } = useNoticiasDashboard({
    limiteRecientes: 4,
    limiteVistas: 4,
    incluirBorradores: false, // Explicitly exclude drafts from Recientes
    enableRealtime: true,
  });
  const { profile } = useAuth();
  const { toast } = useToast();
  // const supabase = createClient(); // No longer needed for deletion if using API

  // Estado para el modal de eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const confirmDeleteBorrador = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/noticias?id=${itemToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar la noticia");
      }

      toast({
        title: "Borrador eliminado",
        description: "El borrador ha sido eliminado correctamente.",
      });
      refetchNoticias();
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error al eliminar borrador:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el borrador.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const executeDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const response = await fetch(`/api/admin/noticias/masivas?admin=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accion: "eliminar_borradores",
        }),
      });

      if (!response.ok) {
        throw new Error("Error al eliminar los borradores");
      }

      toast({
        title: "Borradores eliminados",
        description: "Todos los borradores han sido eliminados correctamente.",
      });
      refetchNoticias();
      setIsDeleteAllModalOpen(false);
    } catch (error) {
      console.error("Error al eliminar todos los borradores:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar los borradores.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Estado para la tabla de estadísticas
  const [mostrarEstadisticas, setMostrarEstadisticas] = useState(false);
  const [periodoEstadisticas, setPeriodoEstadisticas] = useState<
    "semanal" | "mensual" | "anual"
  >("mensual");
  const [vistaEstadisticas, setVistaEstadisticas] = useState<
    "tabla" | "graficos"
  >("graficos");

  // Hook para estadísticas detalladas (solo se carga cuando se abre)
  const {
    data: estadisticasDetalladas,
    isLoading: loadingEstadisticasDetalladas,
  } = useEstadisticasDetalladas({
    periodo: periodoEstadisticas,
    enabled: mostrarEstadisticas,
  });

  // Estilos dinámicos basados en el color del perfil
  const userColorStyles = useMemo(() => {
    if (!profile?.color) return {};

    const color = profile.color.startsWith("#")
      ? profile.color
      : `#${profile.color}`;
    const hoverColor = `${color}1a`; // 10% de opacidad para hovers

    return {
      "--primary": color,
      "--primary-hover": hoverColor,
      "--ring": `${color}80`, // 50% de opacidad para anillos
    } as React.CSSProperties;
  }, [profile?.color]);

  // Memoizar valores formateados
  const valoresFormateados = useMemo(() => {
    if (!estadisticas) return null;

    return {
      total_noticias: estadisticas.total_noticias.toLocaleString("es-ES"),
      total_vistas: estadisticas.total_vistas.toLocaleString("es-ES"),
      total_categorias: estadisticas.total_categorias.toLocaleString("es-ES"),
      noticias_recientes:
        estadisticas.noticias_recientes.toLocaleString("es-ES"),
      noticias_pendientes:
        estadisticas.noticias_pendientes.toLocaleString("es-ES"),
    };
  }, [estadisticas]);

  // Manejo de errores
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Panel de Noticias
            </h1>
            <p className="text-muted-foreground">
              Gestiona todos los aspectos de las noticias del sitio
            </p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">
              Error al cargar estadísticas. Por favor, intenta de nuevo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={userColorStyles}>
      {/* Encabezado con indicador de tiempo real */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Panel de Noticias
          </h1>
          <p className="text-muted-foreground">
            Gestiona todos los aspectos de las noticias del sitio
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <RealTimeIndicator
            isActive={isRealTimeActive}
            lastUpdate={lastUpdate}
          />
          <Button
            onClick={() => router.push("/admin/noticias/parche-preview")}
            variant="outline"
            className="hover:bg-accent"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Manual de Parche
          </Button>
          <Button
            onClick={() => router.push("/admin/noticias/crear")}
            style={
              profile?.color
                ? { backgroundColor: `var(--primary, hsl(var(--primary)))` }
                : {}
            }
            className="hover:opacity-90 transition-opacity"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Noticia
          </Button>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <EstadisticaCard
          icon={Newspaper}
          title="Total Noticias"
          value={valoresFormateados?.total_noticias || "0"}
          loading={isLoading}
          trend={
            estadisticas?.trends?.total_noticias
              ? {
                  value: Math.abs(estadisticas.trends.total_noticias),
                  isPositive: estadisticas.trends.total_noticias > 0,
                }
              : undefined
          }
        />
        <EstadisticaCard
          icon={Eye}
          title="Total Vistas"
          value={valoresFormateados?.total_vistas || "0"}
          loading={isLoading}
          trend={
            estadisticas?.trends?.total_vistas
              ? {
                  value: Math.abs(estadisticas.trends.total_vistas),
                  isPositive: estadisticas.trends.total_vistas > 0,
                }
              : undefined
          }
        />
        <EstadisticaCard
          icon={Tag}
          title="Categorías"
          value={valoresFormateados?.total_categorias || "0"}
          loading={isLoading}
        />
        <EstadisticaCard
          icon={Clock}
          title="Últimos 30 días"
          value={valoresFormateados?.noticias_recientes || "0"}
          loading={isLoading}
          trend={
            estadisticas?.trends?.ultimos_30_dias
              ? {
                  value: Math.abs(estadisticas.trends.ultimos_30_dias),
                  isPositive: estadisticas.trends.ultimos_30_dias > 0,
                }
              : undefined
          }
        />
        <button
          onClick={() => router.push("/admin/noticias/pendientes")}
          className="block w-full h-full"
        >
          <EstadisticaCard
            icon={Calendar}
            title="Pendientes"
            value={valoresFormateados?.noticias_pendientes || "0"}
            loading={isLoading}
            trend={
              estadisticas?.trends?.pendientes
                ? {
                    value: Math.abs(estadisticas.trends.pendientes),
                    isPositive: estadisticas.trends.pendientes > 0,
                  }
                : undefined
            }
          />
        </button>
      </div>

      {/* Contenido principal */}
      <div className="space-y-6">
        {/* Sección de Accesos Rápidos */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Accesos Rápidos</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <NavCard
              href="/admin/noticias/listado"
              icon={ListFilter}
              title="Listado de Noticias"
              description="Gestiona todas las noticias publicadas"
            />
            <NavCard
              href="/admin/noticias/crear"
              icon={FileText}
              title="Crear Noticia"
              description="Publica una nueva noticia"
            />
            <NavCard
              href="/admin/noticias/categorias"
              icon={Tag}
              title="Categorías"
              description="Organiza las categorías de noticias"
            />
            <NavCard
              href="/admin/noticias/estadisticas"
              icon={BarChart2}
              title="Estadísticas"
              description="Visualiza métricas detalladas"
            />
            <NavCard
              href="/admin/noticias/reportes"
              icon={Flag}
              title="Reportes"
              description="Gestiona reportes de contenido"
            />
          </div>
        </div>

        {/* Sección de Estadísticas Detalladas (Colapsable) */}
        <Collapsible
          open={mostrarEstadisticas}
          onOpenChange={setMostrarEstadisticas}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Análisis de Rendimiento</h2>
            <div className="flex items-center gap-2">
              {/* Switch entre Tabla y Gráficos */}
              {mostrarEstadisticas && (
                <div className="flex items-center gap-1 mr-2 border rounded-md p-1">
                  <Button
                    variant={
                      vistaEstadisticas === "graficos" ? "default" : "ghost"
                    }
                    size="sm"
                    onClick={() => setVistaEstadisticas("graficos")}
                    className="h-8 px-3"
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Gráficos
                  </Button>
                  <Button
                    variant={
                      vistaEstadisticas === "tabla" ? "default" : "ghost"
                    }
                    size="sm"
                    onClick={() => setVistaEstadisticas("tabla")}
                    className="h-8 px-3"
                  >
                    <TableIcon className="h-4 w-4 mr-1" />
                    Tabla
                  </Button>
                </div>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {mostrarEstadisticas ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {mostrarEstadisticas ? "Ocultar" : "Mostrar"} estadísticas
                  </span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CollapsibleContent className="space-y-4">
            {loadingEstadisticasDetalladas ? (
              vistaEstadisticas === "graficos" ? (
                <EstadisticasGraficosLoading />
              ) : (
                <EstadisticasTablaLoading />
              )
            ) : estadisticasDetalladas ? (
              vistaEstadisticas === "graficos" ? (
                <EstadisticasGraficos
                  datos={estadisticasDetalladas}
                  periodo={periodoEstadisticas}
                  onPeriodoChange={setPeriodoEstadisticas}
                  isLoading={loadingEstadisticasDetalladas}
                />
              ) : (
                <EstadisticasTabla
                  datos={estadisticasDetalladas}
                  periodo={periodoEstadisticas}
                  onPeriodoChange={setPeriodoEstadisticas}
                />
              )
            ) : null}
          </CollapsibleContent>
        </Collapsible>

        {/* Sección de Borradores */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Borradores</h2>
            {noticiasBorradores && noticiasBorradores.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteAllModalOpen(true)}
                className="text-destructive hover:text-destructive-foreground hover:bg-destructive gap-2 h-8"
              >
                <Trash2 className="h-4 w-4" />
                Borrar todos
              </Button>
            )}
          </div>
          {loadingNoticias ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(2)].map((_, i) => (
                <NoticiaCardSkeletonComponent key={i} showImage={true} />
              ))}
            </div>
          ) : noticiasBorradores && noticiasBorradores.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {noticiasBorradores.map((noticia) => (
                <NoticiaCard
                  key={noticia.id}
                  noticia={noticia}
                  variant="borrador"
                  showImage={true}
                  onHover={prefetchNoticia}
                  onDelete={confirmDeleteBorrador}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No hay borradores pendientes
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sección de Noticias Recientes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Noticias Recientes</h2>
            <Link href="/admin/noticias/listado">
              <Button variant="ghost" size="sm">
                Ver todas
              </Button>
            </Link>
          </div>
          {loadingNoticias ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <NoticiaCardSkeletonComponent key={i} showImage={true} />
              ))}
            </div>
          ) : noticiasRecientes && noticiasRecientes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {noticiasRecientes.map((noticia) => (
                <NoticiaCard
                  key={noticia.id}
                  noticia={noticia}
                  variant="reciente"
                  showImage={true}
                  onHover={prefetchNoticia}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No hay noticias recientes
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sección de Noticias Más Vistas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Noticias Más Vistas</h2>
            <Badge variant="secondary" className="text-xs">
              Últimos 30 días
            </Badge>
          </div>
          {loadingNoticias ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <NoticiaCardSkeletonComponent key={i} showImage={true} />
              ))}
            </div>
          ) : noticiasMasVistas && noticiasMasVistas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {noticiasMasVistas.map((noticia) => (
                <NoticiaCard
                  key={noticia.id}
                  noticia={noticia}
                  variant="mas-vista"
                  showImage={true}
                  onHover={prefetchNoticia}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No hay datos suficientes
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sección de estadísticas adicionales */}
      {estadisticas && (
        <div className="grid grid-cols-1 gap-6">
          {/* Distribución por categoría */}
          {estadisticas.noticias_por_categoria &&
            estadisticas.noticias_por_categoria.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Distribución por Categoría
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {estadisticas.noticias_por_categoria
                      .slice(0, 6)
                      .map((cat) => (
                        <div
                          key={cat.categoria}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <span className="text-sm font-medium">
                            {cat.categoria}
                          </span>
                          <Badge variant="secondary">
                            {cat.total} noticias
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      )}

      <ConfirmDeleteModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="¿Eliminar borrador?"
        description="Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar este borrador permanentemente?"
        onConfirm={executeDelete}
        isLoading={isDeleting}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDangerous={true}
      />

      <ConfirmDeleteModal
        open={isDeleteAllModalOpen}
        onOpenChange={setIsDeleteAllModalOpen}
        title="¿Eliminar todos los borradores?"
        description="Esta acción eliminará permanentemente TODOS los borradores de noticias. Esta operación no se puede deshacer."
        onConfirm={executeDeleteAll}
        isLoading={isDeletingAll}
        confirmText="Eliminar todos"
        cancelText="Cancelar"
        isDangerous={true}
      />
    </div>
  );
}

export default function AdminNoticias() {
  return (
    <AdminProtection>
      <AdminNoticiasContent />
    </AdminProtection>
  );
}
