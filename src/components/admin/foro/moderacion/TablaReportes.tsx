"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import type { WeaponStats } from "@/types/weapon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  MoreHorizontal,
  Flag,
  User,
  Calendar,
  FileText,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// Cargar dinámicamente HiloContenido para renderizar contenido con tweets, videos, etc.
const HiloContenido = dynamic(() => import("@/components/foro/HiloContenido"), {
  ssr: false,
  loading: () => (
    <div className="text-sm text-muted-foreground">Cargando contenido...</div>
  ),
});

interface Reporte {
  id: string;
  tipo_contenido: string;
  contenido_id: string;
  reportado_por: string;
  razon: string;
  descripcion: string;
  estado: string;
  resolucion?: string;
  resuelto_por?: string;
  resuelto_nombre?: string;
  created_at: string;
  reportador_nombre: string;
  reportador_avatar: string;
  contenido_preview: string;
  hilo_slug: string;
  hilo_id: string;
}

interface ContenidoReportado {
  tipo: "hilo" | "post" | "comentario";
  titulo?: string;
  contenido?: string;
  autor?: string;
  fecha?: string;
  votos?: number;
  vistas?: number;
  gif_url?: string | null;
  weaponStatsRecord?: {
    id: string;
    weapon_name: string | null;
    stats: WeaponStats | null;
  } | null;
}

export default function TablaReportes() {
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("pendientes");
  const [busqueda, setBusqueda] = useState<string>("");
  const [reportesSeleccionados, setReportesSeleccionados] = useState<string[]>(
    []
  );
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [reporteActual, setReporteActual] = useState<Reporte | null>(null);
  const [resolucion, setResolucion] = useState("");
  const [contenidoReportado, setContenidoReportado] =
    useState<ContenidoReportado | null>(null);
  const [cargandoContenido, setCargandoContenido] = useState(false);
  const [errorContenido, setErrorContenido] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );
  const queryClient = useQueryClient();

  // Función para generar la URL del contenido reportado
  const generarUrlReporte = (reporte: Reporte): string => {
    if (!reporte.hilo_slug) return "#";

    const baseUrl = `/foro/hilos/${reporte.hilo_slug}`;

    // Si es un post/comentario, agregar el hash para resaltar
    if (
      reporte.tipo_contenido === "post" ||
      reporte.tipo_contenido === "comentario"
    ) {
      return `${baseUrl}?highlight=${reporte.contenido_id}#post-${reporte.contenido_id}`;
    }

    // Si es un hilo, solo retornar la URL base
    return baseUrl;
  };

  const normalizarWeaponStatsRecord = (
    raw: any
  ): ContenidoReportado["weaponStatsRecord"] => {
    if (!raw) return null;
    const record = Array.isArray(raw) ? raw[0] : raw;
    if (!record) return null;

    let stats: WeaponStats | null = record.stats ?? null;
    if (stats && typeof stats === "string") {
      try {
        stats = JSON.parse(stats);
      } catch (error) {
        console.warn(
          "[TablaReportes] No se pudieron parsear las weapon stats",
          {
            error,
          }
        );
        stats = null;
      }
    }

    return {
      id: record.id,
      weapon_name: record.weapon_name ?? null,
      stats,
    };
  };

  const { data: reportesData, isLoading } = useQuery({
    queryKey: ["reportes-foro", filtroTipo, filtroEstado],
    queryFn: async () => {
      const params = new URLSearchParams();

      // Filtro de estado - solo enviar si es pendientes
      if (filtroEstado === "pendientes") {
        params.append("estado", "pendiente");
      }
      // Si es "procesados", no filtramos por estado en la API
      // y lo hacemos en cliente después

      // Filtro de tipo
      if (filtroTipo && filtroTipo !== "todos")
        params.append("tipo_contenido", filtroTipo);

      const res = await fetch(`/api/admin/foro/reportes?${params}`);
      if (!res.ok) throw new Error("Error al cargar reportes");
      return res.json();
    },
  });

  const resolverMutation = useMutation({
    mutationFn: async ({
      reporte_id,
      accion,
      resolucion,
    }: {
      reporte_id: string;
      accion: string;
      resolucion: string;
    }) => {
      const res = await fetch("/api/admin/foro/reportes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporte_id, accion, resolucion }),
      });
      if (!res.ok) throw new Error("Error al procesar reporte");
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidar todas las variaciones del query de reportes
      queryClient.invalidateQueries({
        queryKey: ["reportes-foro"],
        exact: false, // Invalida todas las variaciones con este prefijo
      });
      const accionTexto =
        variables.accion === "resolver" ? "resuelto" : "desestimado";
      toast.success(`Reporte ${accionTexto} correctamente`);
      setDialogAbierto(false);
      setResolucion("");
      setReporteActual(null);
    },
    onError: () => {
      toast.error("Error al procesar el reporte");
    },
  });

  const procesarMasivoMutation = useMutation({
    mutationFn: async ({
      reporte_ids,
      accion,
      resolucion,
    }: {
      reporte_ids: string[];
      accion: string;
      resolucion: string;
    }) => {
      const res = await fetch("/api/admin/foro/reportes/masivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporte_ids, accion, resolucion }),
      });
      if (!res.ok) throw new Error("Error al procesar reportes");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["reportes-foro"],
        exact: false, // Invalida todas las variaciones con este prefijo
      });
      toast.success(`${data.procesados} reportes procesados correctamente`);
      setReportesSeleccionados([]);
    },
    onError: () => {
      toast.error("Error al procesar los reportes");
    },
  });

  const handleSeleccionarTodo = (checked: boolean) => {
    if (checked) {
      setReportesSeleccionados(
        reportesData?.reportes?.map((r: Reporte) => r.id) || []
      );
    } else {
      setReportesSeleccionados([]);
    }
  };

  const handleSeleccionarReporte = (id: string, checked: boolean) => {
    if (checked) {
      setReportesSeleccionados([...reportesSeleccionados, id]);
    } else {
      setReportesSeleccionados(
        reportesSeleccionados.filter((rid) => rid !== id)
      );
    }
  };

  // Filtrar reportes por estado y búsqueda
  const reportesFiltrados = (reportesData?.reportes || [])
    .sort(
      (a: Reporte, b: Reporte) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .filter((reporte: Reporte) => {
      // Filtrar por estado en cliente si es "procesados"
      if (filtroEstado === "procesados") {
        return (
          reporte.estado === "resuelto" || reporte.estado === "desestimado"
        );
      }
      return true;
    })
    .filter((reporte: Reporte) => {
      // Filtrar por búsqueda en cliente
      if (!busqueda) return true;
      const busquedaLower = busqueda.toLowerCase();
      return (
        reporte.reportador_nombre.toLowerCase().includes(busquedaLower) ||
        reporte.razon.toLowerCase().includes(busquedaLower) ||
        reporte.contenido_preview?.toLowerCase().includes(busquedaLower) ||
        reporte.descripcion?.toLowerCase().includes(busquedaLower)
      );
    });

  const reportes = reportesFiltrados;

  const handleCarouselScroll = () => {
    const container = carouselContainerRef.current;
    if (!container) return;
    const slideWidth = container.clientWidth || 1;
    const newIndex = Math.round(container.scrollLeft / slideWidth);
    if (newIndex !== carouselIndex) {
      setCarouselIndex(newIndex);
    }
  };

  useEffect(() => {
    if (!dialogAbierto) return;
    const container = carouselContainerRef.current;
    setCarouselIndex(0);
    if (container) {
      container.scrollTo({ left: 0, behavior: "auto" });
    }
  }, [dialogAbierto]);

  useEffect(() => {
    const actualizarBreakpoint = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    if (typeof window !== "undefined") {
      actualizarBreakpoint();
      window.addEventListener("resize", actualizarBreakpoint);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", actualizarBreakpoint);
      }
    };
  }, []);

  const cargarContenidoHilo = async (hiloId: string) => {
    console.log("[TablaReportes] Cargando hilo", { hiloId });
    const res = await fetch(`/api/foro/hilo/${hiloId}`);
    if (!res.ok) throw new Error("No se pudo cargar el hilo");
    const hilo = await res.json();
    console.log("[TablaReportes] Hilo cargado desde API", {
      id: hilo.id,
      titulo: hilo.titulo,
      contenidoLength: hilo.contenido?.length || 0,
      tieneWeaponStats: Boolean(hilo.weapon_stats_record),
      weaponStatsRecordType: typeof hilo.weapon_stats_record,
      weaponStatsRecordValue: hilo.weapon_stats_record,
    });
    return hilo;
  };

  const cargarPostDesdeHilo = async (hiloId: string, postId: string) => {
    if (!hiloId) {
      throw new Error("ID del hilo no disponible");
    }
    const url = `/api/foro/hilo/${hiloId}/posts?orden=asc&limite=200&postId=${postId}`;
    console.log("[TablaReportes] Buscando post", { hiloId, postId, url });
    const res = await fetch(url);
    if (!res.ok) {
      const errorData = await res.json();
      console.error("Error en API de posts:", errorData);
      throw new Error("No se pudo cargar el post");
    }
    const data = await res.json();
    console.log("[TablaReportes] Respuesta posts", {
      cantidad: data?.data?.length,
      ids: data?.data?.map((p: any) => p.id),
    });
    const postEncontrado = data?.data?.find((p: any) => p.id === postId);
    if (!postEncontrado) {
      console.warn("[TablaReportes] Post no encontrado en respuesta", {
        postId,
        hiloId,
      });
    }
    return postEncontrado;
  };

  const cargarPostPorId = async (postId: string) => {
    console.log("[TablaReportes] Cargando post directo", { postId });
    const res = await fetch(`/api/foro/post/${postId}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error("[TablaReportes] Error API post por id", errorData);
      throw new Error("No se pudo cargar el post por ID");
    }
    const data = await res.json();
    console.log("[TablaReportes] Post directo encontrado", {
      postId: data?.data?.id,
      hilo_id: data?.data?.hilo_id,
    });
    return data?.data;
  };

  const cargarContenidoReporte = async (reporte: Reporte) => {
    try {
      setCargandoContenido(true);
      setErrorContenido(null);
      setContenidoReportado(null);
      console.log("[TablaReportes] Procesando reporte", {
        tipo: reporte.tipo_contenido,
        contenidoId: reporte.contenido_id,
        hiloId: reporte.hilo_id,
      });

      if (reporte.tipo_contenido === "hilo") {
        const hilo = await cargarContenidoHilo(reporte.contenido_id);
        setContenidoReportado({
          tipo: "hilo",
          titulo: hilo.titulo,
          contenido: hilo.contenido,
          autor: hilo.autor?.username,
          fecha: hilo.created_at,
          vistas: hilo.vistas,
          votos: hilo.votos_conteo,
          gif_url: hilo.gif_url || null,
          weaponStatsRecord: normalizarWeaponStatsRecord(
            hilo.weapon_stats_record
          ),
        });
        console.log("[TablaReportes] Contenido del hilo listo para modal", {
          reporteId: reporte.id,
          contenidoId: reporte.contenido_id,
          tieneGif: Boolean(hilo.gif_url),
          longitudHtml: hilo.contenido?.length || 0,
          tieneWeaponStats: Boolean(hilo.weapon_stats_record),
          contenidoPreview: hilo.contenido?.substring(0, 100) || "vacío",
        });
      } else if (
        reporte.tipo_contenido === "post" ||
        reporte.tipo_contenido === "comentario"
      ) {
        // Primero intentar cargar desde el hilo_id si existe
        let post = null;
        if (reporte.hilo_id) {
          post = await cargarPostDesdeHilo(
            reporte.hilo_id,
            reporte.contenido_id
          ).catch((err) => {
            console.warn("[TablaReportes] Error buscando post en hilo", err);
            return null;
          });
        } else {
          console.warn("[TablaReportes] Reporte de post sin hilo_id", {
            reporteId: reporte.id,
            contenidoId: reporte.contenido_id,
          });
        }

        if (!post) {
          post = await cargarPostPorId(reporte.contenido_id).catch((err) => {
            console.warn("[TablaReportes] Error en fallback por ID", err);
            return null;
          });
          if (post?.hilo_id && !reporte.hilo_id) {
            console.log("[TablaReportes] Fallback obtuvo hilo_id", {
              postId: reporte.contenido_id,
              hilo_id: post.hilo_id,
            });
          }
        }

        if (post) {
          setContenidoReportado({
            tipo: "post",
            contenido: post.contenido,
            autor: post.autor?.username,
            fecha: post.created_at,
            votos: 0,
            gif_url: post.gif_url || null,
            weaponStatsRecord: null,
          });
          console.log("[TablaReportes] Contenido del post listo para modal", {
            reporteId: reporte.id,
            contenidoId: reporte.contenido_id,
            hiloId: post.hilo_id,
            tieneGif: Boolean(post.gif_url),
            longitudHtml: post.contenido?.length || 0,
            tieneWeaponStats: false,
          });
          return;
        }

        // Si no se pudo cargar, usar la vista previa
        throw new Error("No se pudo cargar el contenido completo del post");
      }
    } catch (error: any) {
      console.error("Error cargando contenido reportado:", error);
      setErrorContenido(error.message || "No se pudo cargar el contenido");
    } finally {
      setCargandoContenido(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <div className="space-y-3">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Buscar por usuario, razón o contenido..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
            />
          </div>
        </div>

        {/* Filtros por estado */}
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            variant={filtroEstado === "pendientes" ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroEstado("pendientes")}
          >
            Pendientes
          </Button>
          <Button
            variant={filtroEstado === "procesados" ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroEstado("procesados")}
          >
            Procesados
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          {/* Filtros por tipo */}
          <Button
            variant={filtroTipo === "todos" ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroTipo("todos")}
          >
            Todos
          </Button>
          <Button
            variant={filtroTipo === "hilo" ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroTipo("hilo")}
          >
            Hilos
          </Button>
          <Button
            variant={filtroTipo === "comentario" ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroTipo("comentario")}
          >
            Comentarios
          </Button>

          {reportesSeleccionados.length > 0 && (
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (
                    confirm(
                      `¿Resolver ${reportesSeleccionados.length} reportes?`
                    )
                  ) {
                    const resolucionMasiva = prompt("Ingresa la resolución:");
                    if (resolucionMasiva) {
                      procesarMasivoMutation.mutate({
                        reporte_ids: reportesSeleccionados,
                        accion: "resolver",
                        resolucion: resolucionMasiva,
                      });
                    }
                  }
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolver ({reportesSeleccionados.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (
                    confirm(
                      `¿Desestimar ${reportesSeleccionados.length} reportes?`
                    )
                  ) {
                    const razonMasiva = prompt("Ingresa la razón:");
                    if (razonMasiva) {
                      procesarMasivoMutation.mutate({
                        reporte_ids: reportesSeleccionados,
                        accion: "desestimar",
                        resolucion: razonMasiva,
                      });
                    }
                  }
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Desestimar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabla para escritorio y tarjetas para móvil */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-muted-foreground">Cargando reportes...</p>
        </div>
      ) : reportes.length === 0 ? (
        <div className="text-center py-8 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <p className="text-muted-foreground">
            No hay reportes con los filtros seleccionados
          </p>
        </div>
      ) : (
        <>
          {/* Tabla para escritorio */}
          <div className="hidden md:block border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        reportesSeleccionados.length === reportes.length &&
                        reportes.length > 0
                      }
                      onCheckedChange={handleSeleccionarTodo}
                    />
                  </TableHead>
                  <TableHead>Contenido</TableHead>
                  <TableHead>Razón</TableHead>
                  <TableHead>Reportado por</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportes.map((reporte: Reporte) => (
                  <TableRow
                    key={reporte.id}
                    className="hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
                  >
                    <TableCell>
                      <Checkbox
                        checked={reportesSeleccionados.includes(reporte.id)}
                        onCheckedChange={(checked) =>
                          handleSeleccionarReporte(
                            reporte.id,
                            checked as boolean
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{reporte.tipo_contenido}</p>
                        {reporte.contenido_preview && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {reporte.contenido_preview}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <p className="font-medium capitalize">
                          {reporte.razon.replace(/_/g, " ")}
                        </p>
                        {reporte.descripcion && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {reporte.descripcion}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            reporte.reportador_avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${reporte.reportador_nombre}`
                          }
                          alt={reporte.reportador_nombre}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-sm truncate">
                          {reporte.reportador_nombre || "Usuario"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(
                          new Date(reporte.created_at),
                          "dd/MM/yyyy HH:mm",
                          { locale: es }
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex items-center gap-2"
                        onClick={() => {
                          setReporteActual(reporte);
                          setResolucion(reporte.resolucion || "");
                          cargarContenidoReporte(reporte);
                          setDialogAbierto(true);
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4 sm:hidden" />
                        <span className="hidden sm:inline-flex">
                          {reporte.estado === "pendiente"
                            ? "Procesar"
                            : "Revisar"}
                        </span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Tarjetas para móvil */}
          <div className="md:hidden space-y-3">
            {reportes.map((reporte: Reporte) => (
              <div
                key={reporte.id}
                className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-card space-y-3"
              >
                {/* Header con checkbox y tipo */}
                <div className="flex items-start justify-between gap-3">
                  <Checkbox
                    checked={reportesSeleccionados.includes(reporte.id)}
                    onCheckedChange={(checked) =>
                      handleSeleccionarReporte(reporte.id, checked as boolean)
                    }
                  />
                  <Badge variant="outline">{reporte.tipo_contenido}</Badge>
                </div>

                {/* Razón */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Razón
                  </p>
                  <p className="font-medium text-sm">{reporte.razon}</p>
                  {reporte.contenido_preview && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {reporte.contenido_preview}
                    </p>
                  )}
                </div>

                {/* Reportado por */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Reportado por
                  </p>
                  <p className="text-sm">
                    {reporte.reportador_nombre || "Usuario"}
                  </p>
                </div>

                {/* Fecha */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Fecha
                  </p>
                  <p className="text-sm">
                    {format(new Date(reporte.created_at), "dd/MM/yyyy HH:mm", {
                      locale: es,
                    })}
                  </p>
                </div>

                {/* Botón Procesar/Revisar */}
                <Button
                  className="w-full"
                  variant={
                    reporte.estado === "pendiente" ? "default" : "outline"
                  }
                  onClick={() => {
                    setReporteActual(reporte);
                    setResolucion(reporte.resolucion || "");
                    cargarContenidoReporte(reporte);
                    setDialogAbierto(true);
                  }}
                >
                  {reporte.estado === "pendiente" ? "Procesar" : "Revisar"}
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Dialog global para procesar reportes */}
      {reporteActual && (
        <Dialog
          open={dialogAbierto}
          onOpenChange={(open) => {
            setDialogAbierto(open);
            if (!open) {
              setResolucion("");
              setReporteActual(null);
              setContenidoReportado(null);
              setErrorContenido(null);
            }
          }}
        >
          <DialogContent className="w-full max-w-6xl xl:max-w-[90vw] max-h-[90vh] md:!w-[48rem] lg:!w-[64rem] xl:!w-[72rem] flex flex-col p-0 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
              <DialogHeader>
                <DialogTitle>Procesar Reporte</DialogTitle>
                <DialogDescription>
                  Revisa la información del reporte y el contenido reportado
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Contenido scrolleable - dos columnas en desktop, carrusel en móvil */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6 px-6 py-4">
              <style>
                {`
                  .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                  }
                  .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                  .carousel-slide {
                    scroll-snap-align: start;
                    scroll-behavior: smooth;
                  }
                `}
              </style>

              {!isDesktop ? (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div
                    className="flex-1 overflow-x-auto snap-x snap-mandatory flex carousel-container"
                    ref={carouselContainerRef}
                    onScroll={handleCarouselScroll}
                  >
                    {/* Slide 1: Contenido Reportado */}
                    <div className="carousel-slide flex-shrink-0 w-full overflow-y-auto space-y-4 scrollbar-hide">
                      <h3 className="font-semibold text-base sticky top-0 bg-background">
                        Contenido Reportado
                      </h3>

                      <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg space-y-3">
                        {cargandoContenido ? (
                          <p className="text-sm text-muted-foreground">
                            Cargando contenido...
                          </p>
                        ) : errorContenido ? (
                          <p className="text-sm text-red-500">
                            {errorContenido}
                          </p>
                        ) : contenidoReportado ? (
                          <>
                            {contenidoReportado.titulo && (
                              <p className="text-sm font-semibold">
                                {contenidoReportado.titulo}
                              </p>
                            )}
                            {(contenidoReportado.contenido ||
                              reporteActual.contenido_preview) && (
                              <div className="space-y-4">
                                <HiloContenido
                                  html={
                                    contenidoReportado.contenido ||
                                    reporteActual.contenido_preview ||
                                    "Sin vista previa"
                                  }
                                  className="text-sm text-gray-700 dark:text-gray-300"
                                  weaponStatsRecord={
                                    contenidoReportado.weaponStatsRecord ||
                                    undefined
                                  }
                                />
                              </div>
                            )}
                            {contenidoReportado.gif_url && (
                              <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5 max-w-xs">
                                <img
                                  src={contenidoReportado.gif_url}
                                  alt="GIF compartido"
                                  className="w-full h-auto object-cover max-h-64"
                                  loading="lazy"
                                />
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                              <span>
                                {contenidoReportado.autor || "Usuario"}
                              </span>
                              <span>
                                {contenidoReportado.fecha
                                  ? format(
                                      new Date(contenidoReportado.fecha),
                                      "dd/MM/yyyy HH:mm",
                                      { locale: es }
                                    )
                                  : ""}
                              </span>
                              <a
                                href={generarUrlReporte(reporteActual)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Ver origen
                              </a>
                            </div>
                          </>
                        ) : (
                          <HiloContenido
                            html={
                              reporteActual.contenido_preview ||
                              "No hay vista previa disponible"
                            }
                            className="text-sm text-muted-foreground"
                          />
                        )}
                      </div>
                    </div>

                    {/* Slide 2: Información del Reporte */}
                    <div className="carousel-slide flex-shrink-0 w-full overflow-y-auto space-y-4 scrollbar-hide pr-4">
                      <h3 className="font-semibold text-base sticky top-0 bg-background">
                        Información del Reporte
                      </h3>

                      {/* Reportado por */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Reportado por
                        </label>
                        <div className="flex items-center gap-2 mt-2">
                          <img
                            src={
                              reporteActual.reportador_avatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${reporteActual.reportador_nombre}`
                            }
                            alt={reporteActual.reportador_nombre}
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium block">
                              {reporteActual.reportador_nombre || "Usuario"}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {format(
                                new Date(reporteActual.created_at),
                                "d 'de' MMMM, yyyy",
                                { locale: es }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Razón */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Razón
                        </label>
                        <p className="text-sm font-medium mt-2 capitalize">
                          {reporteActual.razon.replace(/_/g, " ")}
                        </p>
                      </div>

                      {/* Descripción */}
                      {reporteActual.descripcion && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Descripción del reporte
                          </label>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg whitespace-pre-wrap break-words">
                            {reporteActual.descripcion}
                          </p>
                        </div>
                      )}

                      {/* Resolución */}
                      <div className="bg-white dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {reporteActual.estado === "pendiente"
                                ? "Tu resolución"
                                : "Resolución"}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">
                              {reporteActual.estado === "pendiente"
                                ? "Describe la acción tomada o la decisión final"
                                : `Procesado por ${
                                    reporteActual.resuelto_nombre || "Admin"
                                  }`}
                            </p>
                          </div>
                          {reporteActual.estado === "pendiente" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-300 uppercase tracking-wide">
                              Requerido
                            </span>
                          )}
                          {reporteActual.estado !== "pendiente" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 uppercase tracking-wide">
                              {reporteActual.estado === "resuelto"
                                ? "Resuelto"
                                : "Desestimado"}
                            </span>
                          )}
                        </div>
                        {reporteActual.estado === "pendiente" ? (
                          <>
                            <Textarea
                              value={resolucion}
                              onChange={(e) => setResolucion(e.target.value)}
                              placeholder="Escribe la resolución del reporte..."
                              rows={5}
                              className="mt-3 text-sm resize-none bg-transparent border-gray-300 dark:border-gray-700 focus-visible:ring-1 focus-visible:ring-primary"
                            />
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                              Esta información se enviará al usuario para
                              informarle del resultado.
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg whitespace-pre-wrap break-words">
                            {reporteActual.resolucion ||
                              "No hay resolución registrada"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Indicadores de slides */}
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      onClick={() => {
                        const container = carouselContainerRef.current;
                        if (container) {
                          container.scrollTo({ left: 0, behavior: "smooth" });
                        }
                      }}
                      className={`h-2 rounded-full transition-all ${
                        carouselIndex === 0
                          ? "bg-primary w-6"
                          : "bg-gray-300 dark:bg-gray-600 w-2"
                      }`}
                    />
                    <button
                      onClick={() => {
                        const container = carouselContainerRef.current;
                        if (container) {
                          container.scrollTo({
                            left: container.scrollWidth,
                            behavior: "smooth",
                          });
                        }
                      }}
                      className={`h-2 rounded-full transition-all ${
                        carouselIndex === 1
                          ? "bg-primary w-6"
                          : "bg-gray-300 dark:bg-gray-600 w-2"
                      }`}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 overflow-hidden flex-col lg:flex-row gap-6">
                  {/* Sección izquierda: Contenido reportado */}
                  <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide lg:order-first">
                    <h3 className="font-semibold text-base sticky top-0 bg-background">
                      Contenido Reportado
                    </h3>

                    <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg space-y-3">
                      {cargandoContenido ? (
                        <p className="text-sm text-muted-foreground">
                          Cargando contenido...
                        </p>
                      ) : errorContenido ? (
                        <p className="text-sm text-red-500">{errorContenido}</p>
                      ) : contenidoReportado ? (
                        <>
                          {contenidoReportado.titulo && (
                            <p className="text-sm font-semibold">
                              {contenidoReportado.titulo}
                            </p>
                          )}
                          {(contenidoReportado.contenido ||
                            reporteActual.contenido_preview) && (
                            <div className="space-y-4">
                              <HiloContenido
                                html={
                                  contenidoReportado.contenido ||
                                  reporteActual.contenido_preview ||
                                  "Sin vista previa"
                                }
                                className="text-sm text-gray-700 dark:text-gray-300"
                                weaponStatsRecord={
                                  contenidoReportado.weaponStatsRecord ||
                                  undefined
                                }
                              />
                            </div>
                          )}
                          {contenidoReportado.gif_url && (
                            <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5 max-w-xs">
                              <img
                                src={contenidoReportado.gif_url}
                                alt="GIF compartido"
                                className="w-full h-auto object-cover max-h-64"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                            <span>{contenidoReportado.autor || "Usuario"}</span>
                            <span>
                              {contenidoReportado.fecha
                                ? format(
                                    new Date(contenidoReportado.fecha),
                                    "dd/MM/yyyy HH:mm",
                                    { locale: es }
                                  )
                                : ""}
                            </span>
                            <a
                              href={generarUrlReporte(reporteActual)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ver origen
                            </a>
                          </div>
                        </>
                      ) : (
                        <HiloContenido
                          html={
                            reporteActual.contenido_preview ||
                            "No hay vista previa disponible"
                          }
                          className="text-sm text-muted-foreground"
                        />
                      )}
                    </div>
                  </div>

                  {/* Sección derecha: Información del reporte */}
                  <div className="flex-1 overflow-y-auto pr-4 lg:pr-0 lg:pl-4 space-y-4 scrollbar-hide lg:border-l border-gray-200 dark:border-gray-800 lg:order-last">
                    <h3 className="font-semibold text-base sticky top-0 bg-background">
                      Información del Reporte
                    </h3>

                    {/* Reportado por */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Reportado por
                      </label>
                      <div className="flex items-center gap-2 mt-2">
                        <img
                          src={
                            reporteActual.reportador_avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${reporteActual.reportador_nombre}`
                          }
                          alt={reporteActual.reportador_nombre}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium block">
                            {reporteActual.reportador_nombre || "Usuario"}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format(
                              new Date(reporteActual.created_at),
                              "d 'de' MMMM, yyyy",
                              { locale: es }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Razón */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Razón
                      </label>
                      <p className="text-sm font-medium mt-2 capitalize">
                        {reporteActual.razon.replace(/_/g, " ")}
                      </p>
                    </div>

                    {/* Descripción */}
                    {reporteActual.descripcion && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Descripción del reporte
                        </label>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg whitespace-pre-wrap break-words">
                          {reporteActual.descripcion}
                        </p>
                      </div>
                    )}

                    {/* Resolución */}
                    <div className="bg-white dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {reporteActual.estado === "pendiente"
                              ? "Tu resolución"
                              : "Resolución"}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {reporteActual.estado === "pendiente"
                              ? "Describe la acción tomada o la decisión final"
                              : `Procesado por ${
                                  reporteActual.resuelto_nombre || "Admin"
                                }`}
                          </p>
                        </div>
                        {reporteActual.estado === "pendiente" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-300 uppercase tracking-wide">
                            Requerido
                          </span>
                        )}
                        {reporteActual.estado !== "pendiente" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 uppercase tracking-wide">
                            {reporteActual.estado === "resuelto"
                              ? "Resuelto"
                              : "Desestimado"}
                          </span>
                        )}
                      </div>
                      {reporteActual.estado === "pendiente" ? (
                        <>
                          <Textarea
                            value={resolucion}
                            onChange={(e) => setResolucion(e.target.value)}
                            placeholder="Escribe la resolución del reporte..."
                            rows={5}
                            className="mt-3 text-sm resize-none bg-transparent border-gray-300 dark:border-gray-700 focus-visible:ring-1 focus-visible:ring-primary"
                          />
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                            Esta información se enviará al usuario para
                            informarle del resultado.
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg whitespace-pre-wrap break-words">
                          {reporteActual.resolucion ||
                            "No hay resolución registrada"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción fijos abajo */}
            <div className="border-t px-6 py-4 bg-background flex-shrink-0">
              <div className="w-full flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end items-stretch sm:items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDialogAbierto(false);
                    setResolucion("");
                    setReporteActual(null);
                  }}
                  className="sm:w-auto w-full border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                >
                  Cancelar
                </Button>
                {reporteActual.estado === "pendiente" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!resolucion.trim()) {
                          toast.error("Escribe una razón");
                          return;
                        }
                        resolverMutation.mutate({
                          reporte_id: reporteActual.id,
                          accion: "desestimar",
                          resolucion,
                        });
                      }}
                      disabled={resolverMutation.isPending}
                      className="sm:w-auto w-full border-gray-200 dark:border-gray-700"
                    >
                      Desestimar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!resolucion.trim()) {
                          toast.error("Escribe una resolución");
                          return;
                        }
                        resolverMutation.mutate({
                          reporte_id: reporteActual.id,
                          accion: "resolver",
                          resolucion,
                        });
                      }}
                      disabled={resolverMutation.isPending}
                      className="sm:w-auto w-full shadow-none border border-transparent hover:border-primary/20"
                    >
                      Resolver
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="sm:w-auto w-full"
                  >
                    Reporte ya procesado
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
