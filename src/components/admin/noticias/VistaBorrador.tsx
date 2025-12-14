"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Send, Calendar, Clock, Eye, EyeOff } from "lucide-react";
import { NoticiaAdmin } from "@/components/noticias/hooks/useAdminNoticias";
import {
  useCambiarEstadoPublicacion,
  useEliminarNoticia,
} from "@/components/noticias/hooks/useAdminNoticias";
import Link from "next/link";

interface VistaBorradorProps {
  noticia: NoticiaAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditar?: (id: string) => void;
}

const getEstadoConfig = (estado?: string) => {
  const configs: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    borrador: {
      label: "Borrador",
      color: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
      icon: <EyeOff className="h-4 w-4" />,
    },
    publicada: {
      label: "Publicada",
      color: "bg-green-500/10 text-green-700 dark:text-green-400",
      icon: <Eye className="h-4 w-4" />,
    },
    programada: {
      label: "Programada",
      color: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      icon: <Calendar className="h-4 w-4" />,
    },
  };

  return configs[estado || "borrador"] || configs["borrador"];
};

export function VistaBorrador({
  noticia,
  open,
  onOpenChange,
  onEditar,
}: VistaBorradorProps) {
  const { toast } = useToast();
  const [mostrarConfirmEliminar, setMostrarConfirmEliminar] = useState(false);
  const { mutate: cambiarEstado, isPending: isCambiandoEstado } =
    useCambiarEstadoPublicacion();
  const { mutate: eliminarNoticia, isPending: isEliminando } =
    useEliminarNoticia();

  if (!noticia) return null;

  const estadoConfig = getEstadoConfig(noticia.estado);

  const handlePublicar = () => {
    cambiarEstado(
      { id: noticia.id, nuevoEstado: "publicada" },
      {
        onSuccess: () => {
          toast({
            title: "Éxito",
            description: "Noticia publicada correctamente",
          });
          onOpenChange(false);
        },
        onError: (error: Error) => {
          toast({
            title: "Error",
            description: error.message || "Error al publicar",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleProgramar = () => {
    cambiarEstado(
      { id: noticia.id, nuevoEstado: "programada" },
      {
        onSuccess: () => {
          toast({
            title: "Éxito",
            description: "Noticia programada correctamente",
          });
          onOpenChange(false);
        },
        onError: (error: Error) => {
          toast({
            title: "Error",
            description: error.message || "Error al programar",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleEliminar = () => {
    eliminarNoticia(noticia.id, {
      onSuccess: () => {
        toast({
          title: "Éxito",
          description: "Noticia eliminada correctamente",
        });
        setMostrarConfirmEliminar(false);
        onOpenChange(false);
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message || "Error al eliminar",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl">{noticia.titulo}</DialogTitle>
                <DialogDescription className="mt-2">
                  {noticia.categoria_nombre && (
                    <span className="text-sm">{noticia.categoria_nombre}</span>
                  )}
                </DialogDescription>
              </div>
              <Badge
                className={`${estadoConfig.color} flex items-center gap-2`}
              >
                {estadoConfig.icon}
                {estadoConfig.label}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Portada */}
            {noticia.imagen_url && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={noticia.imagen_url}
                  alt={noticia.titulo}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {/* Metadatos */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Autor</p>
                <p className="font-medium">
                  {noticia.autor_nombre || noticia.autor}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Vistas</p>
                <p className="font-medium">{noticia.vistas.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Creada</p>
                <p className="font-medium">
                  {new Date(noticia.fecha_publicacion).toLocaleDateString(
                    "es-ES"
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Destacada</p>
                <p className="font-medium">{noticia.destacada ? "Sí" : "No"}</p>
              </div>
            </div>

            {/* Contenido */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Contenido</h3>
              <div
                className="prose dark:prose-invert max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: noticia.contenido }}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setMostrarConfirmEliminar(true)}
                disabled={isEliminando || isCambiandoEstado}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>

            <div className="flex gap-2">
              {noticia.estado === "borrador" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleProgramar}
                    disabled={isCambiandoEstado || isEliminando}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Programar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePublicar}
                    disabled={isCambiandoEstado || isEliminando}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Publicar
                  </Button>
                </>
              )}

              {noticia.estado === "programada" && (
                <Button
                  size="sm"
                  onClick={handlePublicar}
                  disabled={isCambiandoEstado || isEliminando}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publicar ahora
                </Button>
              )}

              {noticia.estado !== "borrador" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    cambiarEstado(
                      { id: noticia.id, nuevoEstado: "borrador" },
                      {
                        onSuccess: () => {
                          toast({
                            title: "Éxito",
                            description: "Noticia movida a borrador",
                          });
                          onOpenChange(false);
                        },
                      }
                    );
                  }}
                  disabled={isCambiandoEstado || isEliminando}
                >
                  <EyeOff className="h-4 w-4 mr-2" />A borrador
                </Button>
              )}

              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/noticias/editar/${noticia.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Link>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog
        open={mostrarConfirmEliminar}
        onOpenChange={setMostrarConfirmEliminar}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              noticia del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              className="bg-red-600 hover:bg-red-700"
            >
              {isEliminando ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
