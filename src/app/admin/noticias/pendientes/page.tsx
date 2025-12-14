"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  FileText,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Calendar,
  User,
  Folder,
  Clock,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import AdminProtection from "@/components/AdminProtection";

interface NoticiaBorrador {
  id: string;
  titulo: string;
  slug: string;
  contenido: string;
  imagen_portada?: string;
  autor_id: string;
  created_at: string;
  updated_at: string;
  estado: string;
  categorias: Array<{
    categoria_id: string;
    categoria?: {
      id: string;
      nombre: string;
      color: string;
    };
  }>;
  perfil?: {
    username: string;
    avatar_url?: string;
  };
}

export default function PendientesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [borradores, setBorradores] = useState<NoticiaBorrador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noticiaParaEliminar, setNoticiaParaEliminar] = useState<string | null>(
    null
  );

  useEffect(() => {
    cargarBorradores();
  }, []);

  const cargarBorradores = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("noticias")
        .select(
          `
          id,
          titulo,
          slug,
          contenido,
          imagen_portada,
          autor_id,
          created_at,
          updated_at,
          estado,
          noticias_categorias(
            categoria_id,
            categorias(id, nombre, color)
          ),
          perfiles(username, avatar_url)
        `
        )
        .eq("estado", "borrador")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const normalizados: NoticiaBorrador[] = (data || []).map((d: any) => ({
        id: d.id,
        titulo: d.titulo,
        slug: d.slug,
        contenido: d.contenido,
        imagen_portada: d.imagen_portada || undefined,
        autor_id: d.autor_id,
        created_at: d.created_at,
        updated_at: d.updated_at,
        estado: d.estado,
        categorias:
          d.noticias_categorias?.map((cat: any) => ({
            categoria_id: cat.categoria_id,
            categoria:
              Array.isArray(cat.categorias) && cat.categorias.length > 0
                ? cat.categorias[0]
                : cat.categorias,
          })) || [],
        perfil: Array.isArray(d.perfiles)
          ? d.perfiles[0]
          : d.perfiles || undefined,
      }));

      setBorradores(normalizados);
    } catch (error) {
      console.error("Error al cargar borradores:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los borradores",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEliminar = async (id: string) => {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("noticias")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setBorradores(borradores.filter((b) => b.id !== id));
      toast({
        title: "Éxito",
        description: "Borrador eliminado correctamente",
      });
    } catch (error) {
      console.error("Error al eliminar:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el borrador",
        variant: "destructive",
      });
    } finally {
      setNoticiaParaEliminar(null);
    }
  };

  return (
    <AdminProtection>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-8 w-8 text-amber-500" />
                Noticias Pendientes
              </h1>
              <p className="text-muted-foreground mt-1">
                Gestiona tus borradores y completa las noticias en progreso
              </p>
            </div>
          </div>
          <Button
            onClick={() => router.push("/admin/noticias/crear")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            + Nueva Noticia
          </Button>
        </div>

        {/* Estadísticas rápidas (minimalista) */}
        {!isLoading && (
          <Card className="border border-border/60 bg-card">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total de borradores
                  </p>
                  <p className="text-2xl font-semibold">{borradores.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de borradores */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : borradores.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                No hay noticias pendientes
              </h3>
              <p className="text-muted-foreground mb-6">
                Todos tus borradores han sido publicados. ¡Excelente trabajo!
              </p>
              <Button onClick={() => router.push("/admin/noticias/crear")}>
                Crear nueva noticia
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {borradores.map((borrador) => (
              <Card
                key={borrador.id}
                className="hover:shadow-lg transition-shadow overflow-hidden"
              >
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* Imagen de portada */}
                    {borrador.imagen_portada && (
                      <div className="hidden sm:block flex-shrink-0">
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted">
                          <img
                            src={borrador.imagen_portada}
                            alt={borrador.titulo}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold truncate hover:text-blue-600 cursor-pointer">
                            {borrador.titulo}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {borrador.slug}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 flex-shrink-0"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Borrador
                        </Badge>
                      </div>

                      {/* Metadatos */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        {borrador.perfil && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {borrador.perfil.username}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDistanceToNow(new Date(borrador.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Actualizado{" "}
                          {formatDistanceToNow(new Date(borrador.updated_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </div>
                      </div>

                      {/* Categorías */}
                      {borrador.categorias &&
                        borrador.categorias.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {borrador.categorias.map((cat) => (
                              <Badge
                                key={cat.categoria_id}
                                variant="outline"
                                style={{
                                  borderColor: cat.categoria?.color,
                                  color: cat.categoria?.color,
                                }}
                                className="text-xs"
                              >
                                <Folder className="h-3 w-3 mr-1" />
                                {cat.categoria?.nombre}
                              </Badge>
                            ))}
                          </div>
                        )}

                      {/* Vista previa del contenido */}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {borrador.contenido.replace(/<[^>]*>/g, "")}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex-shrink-0 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/noticias/editar/${borrador.id}`)
                        }
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/admin/noticias/editar/${borrador.id}`
                              )
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setNoticiaParaEliminar(borrador.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog
        open={!!noticiaParaEliminar}
        onOpenChange={() => setNoticiaParaEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              borrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                noticiaParaEliminar && handleEliminar(noticiaParaEliminar)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AdminProtection>
  );
}
