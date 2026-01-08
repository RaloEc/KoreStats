/**
 * Panel de moderación unificado para el foro
 * Incluye gestión de hilos, comentarios y acciones por lotes
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  useHilosModeracion,
  useComentariosModeracion,
  useEliminarHilo,
  useEliminarComentario,
  useToggleFijarHilo,
  useToggleCerrarHilo,
  useMoverHilo,
  useEliminarHilosLote,
  useMoverHilosLote,
  useEliminarComentariosLote,
} from "./hooks/useModeracionForo";
import { useEstadisticasCategorias } from "./hooks/useEstadisticasForo";
import {
  Shield,
  MoreVertical,
  Trash2,
  Pin,
  Lock,
  Unlock,
  FolderOpen,
  Search,
  Eye,
  MessageSquare,
  TrendingUp,
  ExternalLink,
  CheckSquare,
  Square,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import TablaReportes from "./moderacion/TablaReportes";

export default function PanelModeracion() {
  const [tabActiva, setTabActiva] = useState<
    "reportes" | "hilos" | "comentarios"
  >("reportes");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("all");
  const [ordenCampo, setOrdenCampo] = useState<
    "created_at" | "vistas" | "votos_conteo"
  >("created_at");
  const [ordenDireccion, setOrdenDireccion] = useState<"ASC" | "DESC">("DESC");
  const [hilosSeleccionados, setHilosSeleccionados] = useState<Set<string>>(
    new Set()
  );
  const [comentariosSeleccionados, setComentariosSeleccionados] = useState<
    Set<string>
  >(new Set());
  const [dialogEliminar, setDialogEliminar] = useState<{
    tipo: "hilo" | "comentario";
    id: string;
  } | null>(null);
  const [dialogMover, setDialogMover] = useState<boolean>(false);
  const [categoriaDestino, setCategoriaDestino] = useState<string>("");

  // Hooks
  const { data: categorias } = useEstadisticasCategorias();
  const {
    data: hilosData,
    fetchNextPage: fetchNextHilos,
    hasNextPage: hasNextHilos,
    isFetchingNextPage: isFetchingNextHilos,
    isLoading: isLoadingHilos,
    error: errorHilos,
  } = useHilosModeracion({
    categoria: filtroCategoria === "all" ? undefined : filtroCategoria,
    ordenCampo,
    ordenDireccion,
  });

  const {
    data: comentariosData,
    fetchNextPage: fetchNextComentarios,
    hasNextPage: hasNextComentarios,
    isFetchingNextPage: isFetchingNextComentarios,
    isLoading: isLoadingComentarios,
    error: errorComentarios,
  } = useComentariosModeracion();

  const eliminarHilo = useEliminarHilo();
  const eliminarComentario = useEliminarComentario();
  const toggleFijar = useToggleFijarHilo();
  const toggleCerrar = useToggleCerrarHilo();
  const moverHilo = useMoverHilo();
  const eliminarHilosLote = useEliminarHilosLote();
  const moverHilosLote = useMoverHilosLote();
  const eliminarComentariosLote = useEliminarComentariosLote();

  // Infinite scroll
  const { ref: refHilos } = useInView({
    onChange: (inView) => {
      if (inView && hasNextHilos && !isFetchingNextHilos) {
        fetchNextHilos();
      }
    },
  });

  const { ref: refComentarios } = useInView({
    onChange: (inView) => {
      if (inView && hasNextComentarios && !isFetchingNextComentarios) {
        fetchNextComentarios();
      }
    },
  });

  // Datos combinados
  const hilos = useMemo(() => hilosData?.pages.flat() || [], [hilosData]);
  const comentarios = useMemo(
    () => comentariosData?.pages.flat() || [],
    [comentariosData]
  );

  // Funciones de selección
  const toggleSeleccionHilo = (hiloId: string) => {
    const nuevaSeleccion = new Set(hilosSeleccionados);
    if (nuevaSeleccion.has(hiloId)) {
      nuevaSeleccion.delete(hiloId);
    } else {
      nuevaSeleccion.add(hiloId);
    }
    setHilosSeleccionados(nuevaSeleccion);
  };

  const seleccionarTodos = () => {
    if (hilosSeleccionados.size === hilos.length) {
      setHilosSeleccionados(new Set());
    } else {
      setHilosSeleccionados(new Set(hilos.map((h) => h.id)));
    }
  };

  const toggleSeleccionComentario = (comentarioId: string) => {
    const nuevaSeleccion = new Set(comentariosSeleccionados);
    if (nuevaSeleccion.has(comentarioId)) {
      nuevaSeleccion.delete(comentarioId);
    } else {
      nuevaSeleccion.add(comentarioId);
    }
    setComentariosSeleccionados(nuevaSeleccion);
  };

  const seleccionarTodosComentarios = () => {
    if (comentariosSeleccionados.size === comentarios.length) {
      setComentariosSeleccionados(new Set());
    } else {
      setComentariosSeleccionados(new Set(comentarios.map((c) => c.id)));
    }
  };

  // Acciones
  const handleEliminar = async () => {
    if (!dialogEliminar) return;

    if (dialogEliminar.tipo === "hilo") {
      await eliminarHilo.mutateAsync(dialogEliminar.id);
    } else {
      await eliminarComentario.mutateAsync(dialogEliminar.id);
    }
    setDialogEliminar(null);
  };

  const handleEliminarLote = async () => {
    if (hilosSeleccionados.size === 0) return;
    await eliminarHilosLote.mutateAsync(Array.from(hilosSeleccionados));
    setHilosSeleccionados(new Set());
  };

  const handleMoverLote = async () => {
    if (hilosSeleccionados.size === 0 || !categoriaDestino) return;
    await moverHilosLote.mutateAsync({
      hiloIds: Array.from(hilosSeleccionados),
      categoriaId: categoriaDestino,
    });
    setHilosSeleccionados(new Set());
    setDialogMover(false);
    setCategoriaDestino("");
  };

  const handleEliminarComentariosLote = async () => {
    if (comentariosSeleccionados.size === 0) return;
    if (
      !confirm(
        `¿Estás seguro de eliminar ${comentariosSeleccionados.size} comentarios?`
      )
    )
      return;

    await eliminarComentariosLote.mutateAsync(
      Array.from(comentariosSeleccionados)
    );
    setComentariosSeleccionados(new Set());
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Panel de Moderación
            </CardTitle>
            <CardDescription className="mt-2">
              Gestiona hilos y comentarios del foro
            </CardDescription>
          </div>
          {tabActiva === "hilos" && hilosSeleccionados.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {hilosSeleccionados.size} seleccionados
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEliminarLote}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogMover(true)}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Mover
              </Button>
            </div>
          )}
          {tabActiva === "comentarios" && comentariosSeleccionados.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {comentariosSeleccionados.size} seleccionados
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEliminarComentariosLote}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={tabActiva}
          onValueChange={(v) =>
            setTabActiva(v as "reportes" | "hilos" | "comentarios")
          }
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reportes">Reportes</TabsTrigger>
            <TabsTrigger value="hilos">Hilos</TabsTrigger>
            <TabsTrigger value="comentarios">Comentarios</TabsTrigger>
          </TabsList>

          {/* Tab de Reportes */}
          <TabsContent value="reportes" className="space-y-4">
            <TablaReportes />
          </TabsContent>

          {/* Tab de Hilos */}
          <TabsContent value="hilos" className="space-y-4">
            {/* Filtros */}
            <div className="flex gap-4 items-center">
              <Select
                value={filtroCategoria}
                onValueChange={setFiltroCategoria}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categorias?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={ordenCampo}
                onValueChange={(v) => setOrdenCampo(v as any)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Fecha de creación</SelectItem>
                  <SelectItem value="vistas">Vistas</SelectItem>
                  <SelectItem value="votos_conteo">Votos</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={ordenDireccion}
                onValueChange={(v) => setOrdenDireccion(v as any)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESC">Descendente</SelectItem>
                  <SelectItem value="ASC">Ascendente</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={seleccionarTodos}
                className="ml-auto"
              >
                {hilosSeleccionados.size === hilos.length ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Deseleccionar todos
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Seleccionar todos
                  </>
                )}
              </Button>
            </div>

            {/* Lista de hilos */}
            <div className="space-y-3">
              {errorHilos && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  <p className="font-semibold">Error al cargar hilos:</p>
                  <p className="text-sm mt-1">{errorHilos.message}</p>
                  <pre className="text-xs mt-2 overflow-auto">
                    {JSON.stringify(errorHilos, null, 2)}
                  </pre>
                </div>
              )}
              {isLoadingHilos && hilos.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando hilos...
                </div>
              )}
              {!isLoadingHilos && !errorHilos && hilos.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay hilos para mostrar
                </div>
              )}
              {hilos.map((hilo) => (
                <div
                  key={hilo.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                    hilosSeleccionados.has(hilo.id)
                      ? "bg-zinc-100 dark:bg-zinc-900/80 border-zinc-300 dark:border-zinc-700"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
                  }`}
                >
                  <Checkbox
                    checked={hilosSeleccionados.has(hilo.id)}
                    onCheckedChange={() => toggleSeleccionHilo(hilo.id)}
                  />

                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={hilo.autor_avatar_url || undefined}
                      alt={hilo.autor_username}
                    />
                    <AvatarFallback>
                      {hilo.autor_username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Link
                          href={`/foro/hilos/${hilo.slug}`}
                          className="font-medium hover:underline line-clamp-2"
                          target="_blank"
                        >
                          {hilo.titulo}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>por {hilo.autor_username}</span>
                          <span>•</span>
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: hilo.categoria_color || undefined,
                            }}
                          >
                            {hilo.categoria_nombre}
                          </Badge>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(hilo.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                          {hilo.es_fijado && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary" className="text-xs">
                                <Pin className="h-3 w-3 mr-1" />
                                Fijado
                              </Badge>
                            </>
                          )}
                          {hilo.es_cerrado && (
                            <>
                              <span>•</span>
                              <Badge variant="destructive" className="text-xs">
                                <Lock className="h-3 w-3 mr-1" />
                                Cerrado
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/foro/hilos/${hilo.slug}`}
                              target="_blank"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver hilo
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              toggleFijar.mutate({
                                hiloId: hilo.id,
                                esFijado: !hilo.es_fijado,
                              })
                            }
                          >
                            <Pin className="h-4 w-4 mr-2" />
                            {hilo.es_fijado ? "Desfijar" : "Fijar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              toggleCerrar.mutate({
                                hiloId: hilo.id,
                                esCerrado: !hilo.es_cerrado,
                              })
                            }
                          >
                            {hilo.es_cerrado ? (
                              <>
                                <Unlock className="h-4 w-4 mr-2" />
                                Abrir
                              </>
                            ) : (
                              <>
                                <Lock className="h-4 w-4 mr-2" />
                                Cerrar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                              setDialogEliminar({ tipo: "hilo", id: hilo.id })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span>{hilo.vistas.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span>{hilo.comentarios_count}</span>
                      </div>
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span>{hilo.votos_conteo}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Trigger para infinite scroll */}
              <div ref={refHilos} className="h-4" />

              {/* Botón manual para cargar más */}
              {hasNextHilos && !isFetchingNextHilos && (
                <div className="text-center py-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextHilos()}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Cargar más hilos
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Mostrando {hilos.length} hilos
                  </p>
                </div>
              )}

              {!hasNextHilos && hilos.length > 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  ✅ Todos los hilos cargados ({hilos.length} total)
                </div>
              )}

              {isFetchingNextHilos && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800"
                    >
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4 mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab de Comentarios */}
          <TabsContent value="comentarios" className="space-y-4">
            <div className="space-y-3">
              {errorComentarios && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  <p className="font-semibold">Error al cargar comentarios:</p>
                  <p className="text-sm mt-1">{errorComentarios.message}</p>
                  <pre className="text-xs mt-2 overflow-auto">
                    {JSON.stringify(errorComentarios, null, 2)}
                  </pre>
                </div>
              )}
              {isLoadingComentarios && comentarios.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando comentarios...
                </div>
              )}
              {!isLoadingComentarios &&
                !errorComentarios &&
                comentarios.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay comentarios para mostrar
                  </div>
                )}
              <div className="flex items-center justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={seleccionarTodosComentarios}
                >
                  {comentariosSeleccionados.size === comentarios.length ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Deseleccionar todos
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Seleccionar todos
                    </>
                  )}
                </Button>
              </div>

              {comentarios.map((comentario) => (
                <div
                  key={comentario.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                    comentariosSeleccionados.has(comentario.id)
                      ? "bg-zinc-100 dark:bg-zinc-900/80 border-zinc-300 dark:border-zinc-700"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
                  }`}
                >
                  <Checkbox
                    checked={comentariosSeleccionados.has(comentario.id)}
                    onCheckedChange={() =>
                      toggleSeleccionComentario(comentario.id)
                    }
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={comentario.autor_avatar_url || undefined}
                      alt={comentario.autor_username}
                    />
                    <AvatarFallback>
                      {comentario.autor_username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {comentario.autor_username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(comentario.created_at),
                              {
                                addSuffix: true,
                                locale: es,
                              }
                            )}
                          </span>
                          {comentario.editado && (
                            <Badge variant="outline" className="text-xs">
                              Editado
                            </Badge>
                          )}
                        </div>
                        <Link
                          href={`/foro/hilos/${comentario.hilo_slug}#comentario-${comentario.id}`}
                          className="text-sm text-muted-foreground hover:underline mt-1 block"
                          target="_blank"
                        >
                          en: {comentario.hilo_titulo}
                        </Link>
                        <p className="text-sm mt-2 line-clamp-3">
                          {comentario.contenido}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/foro/hilos/${comentario.hilo_slug}#comentario-${comentario.id}`}
                              target="_blank"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver comentario
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                              setDialogEliminar({
                                tipo: "comentario",
                                id: comentario.id,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}

              {/* Trigger para infinite scroll */}
              <div ref={refComentarios} className="h-4" />

              {isFetchingNextComentarios && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800"
                    >
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4 mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog
        open={!!dialogEliminar}
        onOpenChange={() => setDialogEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el {dialogEliminar?.tipo} de forma
              permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para mover hilos */}
      <AlertDialog open={dialogMover} onOpenChange={setDialogMover}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover hilos seleccionados</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona la categoría de destino para {hilosSeleccionados.size}{" "}
              hilos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select
              value={categoriaDestino}
              onValueChange={setCategoriaDestino}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMoverLote}
              disabled={!categoriaDestino}
            >
              Mover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
