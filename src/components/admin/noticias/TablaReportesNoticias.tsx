"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

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
  prioridad: string;
  created_at: string;
  reportador_nombre: string;
  reportador_avatar: string;
  contenido_preview: string;
  noticia_id: string;
  noticia_titulo: string;
}

export default function TablaReportesNoticias() {
  const [tabActiva, setTabActiva] = useState<"pendientes" | "procesados">(
    "pendientes"
  );
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [reportesSeleccionados, setReportesSeleccionados] = useState<string[]>(
    []
  );
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [reporteActual, setReporteActual] = useState<Reporte | null>(null);
  const [resolucion, setResolucion] = useState("");
  const [modalNoticiaAbierto, setModalNoticiaAbierto] = useState(false);
  const [noticiaPreview, setNoticiaPreview] = useState<any>(null);
  const [cargandoNoticia, setCargandoNoticia] = useState(false);
  const [tipoContenidoPreview, setTipoContenidoPreview] = useState<
    "noticia" | "comentario"
  >("noticia");
  const [noticiasExpandidas, setNoticiasExpandidas] = useState<Set<string>>(
    new Set()
  );
  const [tabMobileActiva, setTabMobileActiva] = useState<
    "contenido" | "reporte"
  >("contenido");
  const queryClient = useQueryClient();

  // Función para cargar la noticia o comentario en el modal
  const cargarContenidoPreview = async (
    reporte: Reporte,
    opciones: { abrirModal?: boolean } = {}
  ) => {
    const { abrirModal = true } = opciones;
    setCargandoNoticia(true);
    try {
      if (reporte.tipo_contenido === "comentario") {
        setTipoContenidoPreview("comentario");
        // Cargar comentario desde la API
        const res = await fetch(`/api/comentarios/${reporte.contenido_id}`);
        if (!res.ok) throw new Error("Error al cargar el comentario");
        const response = await res.json();
        const comentario = response.data || response;
        setNoticiaPreview(comentario);
      } else {
        setTipoContenidoPreview("noticia");
        // Cargar noticia desde la API
        const res = await fetch(`/api/noticias/${reporte.noticia_id}`);
        if (!res.ok) throw new Error("Error al cargar la noticia");
        const response = await res.json();
        const noticia = response.data || response;
        setNoticiaPreview(noticia);
      }
      if (abrirModal) {
        setModalNoticiaAbierto(true);
      }
    } catch (error) {
      console.error("Error cargando contenido:", error);
      toast.error("Error al cargar el contenido");
    } finally {
      setCargandoNoticia(false);
    }
  };

  useEffect(() => {
    if (!dialogAbierto || !reporteActual) {
      return;
    }

    setNoticiaPreview(null);
    cargarContenidoPreview(reporteActual, { abrirModal: false });
  }, [dialogAbierto, reporteActual]);

  // Función para generar la URL del contenido reportado
  const generarUrlReporte = (reporte: Reporte): string => {
    if (!reporte.noticia_id) return "#";

    const baseUrl = `/noticias/${reporte.noticia_id}`;

    // Si es un comentario, agregar el hash para resaltar
    if (reporte.tipo_contenido === "comentario") {
      return `${baseUrl}?highlight=${reporte.contenido_id}#comment-${reporte.contenido_id}`;
    }

    // Si es una noticia, solo retornar la URL base
    return baseUrl;
  };

  const { data: reportesData, isLoading } = useQuery({
    queryKey: ["reportes-noticias", filtroTipo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtroTipo && filtroTipo !== "todos")
        params.append("tipo_contenido", filtroTipo);

      const res = await fetch(`/api/admin/noticias/reportes?${params}`);
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
      const res = await fetch("/api/admin/noticias/reportes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporte_id, accion, resolucion }),
      });
      if (!res.ok) throw new Error("Error al procesar reporte");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["reportes-noticias"],
        exact: false,
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
      const res = await fetch("/api/admin/noticias/reportes/masivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporte_ids, accion, resolucion }),
      });
      if (!res.ok) throw new Error("Error al procesar reportes");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["reportes-noticias"],
        exact: false,
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

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "critica":
        return "destructive";
      case "alta":
        return "destructive";
      case "media":
        return "default";
      case "baja":
        return "secondary";
      default:
        return "default";
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200";
      case "en_revision":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200";
      case "resuelto":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
      case "desestimado":
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200";
    }
  };

  const toggleNoticia = (noticiaId: string) => {
    const nuevas = new Set(noticiasExpandidas);
    if (nuevas.has(noticiaId)) {
      nuevas.delete(noticiaId);
    } else {
      nuevas.add(noticiaId);
    }
    setNoticiasExpandidas(nuevas);
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando reportes...</div>;
  }

  const reportes = reportesData?.reportes || [];

  // Filtrar reportes según la tab activa y el tipo seleccionado
  const reportesFiltrados = reportes.filter((reporte: Reporte) => {
    // Filtrar por estado según la tab
    const filtroEstado =
      tabActiva === "pendientes"
        ? reporte.estado === "pendiente" || reporte.estado === "en_revision"
        : reporte.estado === "resuelto" || reporte.estado === "desestimado";

    // Filtrar por tipo
    const filtroTipoValido =
      filtroTipo === "todos" || reporte.tipo_contenido === filtroTipo;

    return filtroEstado && filtroTipoValido;
  });

  // Agrupar reportes por noticia_id + contenido_id (para separar noticias de comentarios)
  const reportesAgrupados = reportesFiltrados.reduce(
    (acc: Record<string, Reporte[]>, reporte: Reporte) => {
      const grupoId = `${reporte.noticia_id}_${reporte.contenido_id}`;
      if (!acc[grupoId]) {
        acc[grupoId] = [];
      }
      acc[grupoId].push(reporte);
      return acc;
    },
    {}
  );

  // Obtener el primer reporte de cada grupo (para mostrar en la fila principal)
  const reportesPrincipales = Object.entries(reportesAgrupados).map(
    ([grupoId, reportesGrupo]: [string, Reporte[]]) => ({
      grupoId,
      reportePrincipal: reportesGrupo[0],
      cantidad: reportesGrupo.length,
      reportesRelacionados: reportesGrupo.slice(1),
    })
  );

  // Contar reportes por estado
  const reportesPendientes = reportes.filter(
    (r: Reporte) => r.estado === "pendiente" || r.estado === "en_revision"
  ).length;
  const reportesProcesados = reportes.filter(
    (r: Reporte) => r.estado === "resuelto" || r.estado === "desestimado"
  ).length;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs
        value={tabActiva}
        onValueChange={(val) =>
          setTabActiva(val as "pendientes" | "procesados")
        }
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pendientes" className="flex items-center gap-2">
            Pendientes
            <Badge variant="secondary" className="ml-2">
              {reportesPendientes}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="procesados" className="flex items-center gap-2">
            Procesados
            <Badge variant="secondary" className="ml-2">
              {reportesProcesados}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <motion.div
          key={tabActiva}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <TabsContent value={tabActiva} className="space-y-4">
            {/* Filtros - Group Button para Tipo */}
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm font-medium">
                Filtrar por:
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filtroTipo === "todos" ? "default" : "outline"}
                  onClick={() => setFiltroTipo("todos")}
                  className="text-xs sm:text-sm"
                >
                  Todos
                </Button>
                <Button
                  size="sm"
                  variant={filtroTipo === "noticia" ? "default" : "outline"}
                  onClick={() => setFiltroTipo("noticia")}
                  className="text-xs sm:text-sm"
                >
                  Noticias
                </Button>
                <Button
                  size="sm"
                  variant={filtroTipo === "comentario" ? "default" : "outline"}
                  onClick={() => setFiltroTipo("comentario")}
                  className="text-xs sm:text-sm"
                >
                  Comentarios
                </Button>
              </div>
            </div>

            {/* Acciones masivas */}
            {reportesSeleccionados.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium">
                  {reportesSeleccionados.length} reportes seleccionados
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      procesarMasivoMutation.mutate({
                        reporte_ids: reportesSeleccionados,
                        accion: "resolver",
                        resolucion: "Resuelto en lote",
                      });
                    }}
                    disabled={procesarMasivoMutation.isPending}
                  >
                    Resolver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      procesarMasivoMutation.mutate({
                        reporte_ids: reportesSeleccionados,
                        accion: "desestimar",
                        resolucion: "Desestimado en lote",
                      });
                    }}
                    disabled={procesarMasivoMutation.isPending}
                  >
                    Desestimar
                  </Button>
                </div>
              </div>
            )}

            {/* Vista de tabla para desktop y tarjetas para móviles */}

            {/* Tabla para desktop (md y superior) */}
            <motion.div
              className="border rounded-lg overflow-x-auto hidden md:block"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left">
                      <Checkbox
                        checked={
                          reportes.length > 0 &&
                          reportesSeleccionados.length === reportes.length
                        }
                        onCheckedChange={handleSeleccionarTodo}
                      />
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium">
                      Contenido
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium hidden sm:table-cell">
                      Razón
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium hidden md:table-cell">
                      Reportado por
                    </th>
                    {tabActiva === "pendientes" && (
                      <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium">
                        Estado
                      </th>
                    )}
                    <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium">
                      {tabActiva === "procesados" ? "Acciones" : "Acciones"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportesPrincipales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No hay reportes
                      </td>
                    </tr>
                  ) : (
                    reportesPrincipales.map((grupo) => {
                      const reporte = grupo.reportePrincipal;
                      const tieneRelacionados = grupo.cantidad > 1;
                      const expandido = noticiasExpandidas.has(grupo.grupoId);

                      return (
                        <React.Fragment key={grupo.grupoId}>
                          {/* Fila de encabezado del contenido (solo si hay múltiples reportes) */}
                          {tieneRelacionados && (
                            <tr className="border-t hover:bg-gray-50 dark:hover:bg-gray-900/50 font-semibold">
                              <td className="px-2 sm:px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => toggleNoticia(grupo.grupoId)}
                                  >
                                    <motion.div
                                      animate={{ rotate: expandido ? 180 : 0 }}
                                      transition={{
                                        duration: 0.3,
                                        ease: "easeInOut",
                                      }}
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </motion.div>
                                  </Button>
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-3" colSpan={6}>
                                <div className="text-xs sm:text-sm">
                                  {reporte.tipo_contenido === "comentario" ? (
                                    <>
                                      <p className="font-medium truncate max-w-xs">
                                        {reporte.contenido_preview ||
                                          "Comentario"}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                        Comentario
                                        {` (${grupo.cantidad} reportes)`}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="font-medium truncate max-w-xs">
                                        {reporte.noticia_titulo}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                        Noticia
                                        {` (${grupo.cantidad} reportes)`}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Fila de reportes individuales (se muestran siempre si no hay relacionados, o al desplegar si hay múltiples) */}
                          <AnimatePresence>
                            {(expandido || !tieneRelacionados) &&
                              [reporte, ...grupo.reportesRelacionados].map(
                                (reporteRelacionado) => (
                                  <motion.tr
                                    key={reporteRelacionado.id}
                                    className="border-t bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-900/50"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{
                                      duration: 0.3,
                                      ease: "easeInOut",
                                    }}
                                  >
                                    <td className="px-2 sm:px-4 py-3 pl-8 sm:pl-12">
                                      <Checkbox
                                        checked={reportesSeleccionados.includes(
                                          reporteRelacionado.id
                                        )}
                                        onCheckedChange={(checked) =>
                                          handleSeleccionarReporte(
                                            reporteRelacionado.id,
                                            checked as boolean
                                          )
                                        }
                                      />
                                    </td>
                                    <td className="px-2 sm:px-4 py-3">
                                      <div className="text-xs sm:text-sm space-y-1">
                                        {reporteRelacionado.tipo_contenido ===
                                        "comentario" ? (
                                          <>
                                            <p className="font-medium truncate max-w-xs">
                                              {reporteRelacionado.contenido_preview ||
                                                "Comentario"}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              Comentario en "
                                              {reporteRelacionado.noticia_titulo ||
                                                "Noticia"}
                                              "
                                            </p>
                                          </>
                                        ) : (
                                          <>
                                            <p className="font-medium truncate max-w-xs">
                                              {
                                                reporteRelacionado.noticia_titulo
                                              }
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              Noticia
                                            </p>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-3 hidden sm:table-cell">
                                      <div className="text-xs sm:text-sm space-y-1">
                                        <p className="font-medium truncate max-w-xs capitalize">
                                          {reporteRelacionado.razon.replace(
                                            /_/g,
                                            " "
                                          )}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                          {reporteRelacionado.descripcion ||
                                            "Sin descripción"}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-3 hidden md:table-cell">
                                      <div className="flex items-center gap-2">
                                        <img
                                          src={
                                            reporteRelacionado.reportador_avatar ||
                                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${reporteRelacionado.reportador_nombre}`
                                          }
                                          alt={
                                            reporteRelacionado.reportador_nombre
                                          }
                                          className="w-6 h-6 rounded-full"
                                        />
                                        <span className="text-xs sm:text-sm truncate">
                                          {reporteRelacionado.reportador_nombre}
                                        </span>
                                      </div>
                                    </td>
                                    {tabActiva === "pendientes" && (
                                      <td className="px-2 sm:px-4 py-3">
                                        <div
                                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${getEstadoColor(
                                            reporteRelacionado.estado
                                          )}`}
                                        >
                                          {reporteRelacionado.estado}
                                        </div>
                                      </td>
                                    )}
                                    <td className="px-2 sm:px-4 py-3">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setReporteActual(reporteRelacionado);
                                          setResolucion(
                                            reporteRelacionado.resolucion || ""
                                          );
                                          setDialogAbierto(true);
                                        }}
                                        className="h-8 px-2 text-xs sm:text-sm"
                                      >
                                        {tabActiva === "procesados"
                                          ? "Revisar"
                                          : "Procesar"}
                                      </Button>
                                    </td>
                                  </motion.tr>
                                )
                              )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </motion.div>

            {/* Vista de tarjetas para móviles (md y inferior) */}
            <motion.div
              className="md:hidden space-y-3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {reportesPrincipales.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay reportes
                </div>
              ) : (
                <AnimatePresence>
                  {reportesPrincipales.map((grupo) => {
                    const reporte = grupo.reportePrincipal;
                    const tieneRelacionados = grupo.cantidad > 1;
                    const expandido = noticiasExpandidas.has(grupo.grupoId);

                    return (
                      <div key={grupo.grupoId} className="space-y-2">
                        {/* Tarjeta principal */}
                        <motion.div
                          className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                        >
                          {/* Encabezado de la tarjeta */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                  checked={reportesSeleccionados.includes(
                                    reporte.id
                                  )}
                                  onCheckedChange={(checked) =>
                                    handleSeleccionarReporte(
                                      reporte.id,
                                      checked as boolean
                                    )
                                  }
                                />
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${getEstadoColor(
                                    reporte.estado
                                  )}`}
                                >
                                  {reporte.estado}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                                {reporte.tipo_contenido === "comentario"
                                  ? reporte.contenido_preview || "Comentario"
                                  : reporte.noticia_titulo}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {reporte.tipo_contenido === "comentario"
                                  ? "Comentario"
                                  : "Noticia"}
                                {tieneRelacionados &&
                                  ` (${grupo.cantidad} reportes)`}
                              </p>
                            </div>
                          </div>

                          {/* Razón */}
                          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                              Razón
                            </p>
                            <p className="text-sm font-medium capitalize">
                              {reporte.razon.replace(/_/g, " ")}
                            </p>
                          </div>

                          {/* Reportado por */}
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                reporte.reportador_avatar ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${reporte.reportador_nombre}`
                              }
                              alt={reporte.reportador_nombre}
                              className="w-6 h-6 rounded-full"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Reportado por
                              </p>
                              <p className="text-sm font-medium truncate">
                                {reporte.reportador_nombre}
                              </p>
                            </div>
                          </div>

                          {/* Botón de acción */}
                          <Button
                            size="sm"
                            onClick={() => {
                              setReporteActual(reporte);
                              setDialogAbierto(true);
                            }}
                            className="w-full"
                          >
                            Procesar
                          </Button>
                        </motion.div>

                        {/* Tarjetas de reportes relacionados */}
                        <AnimatePresence>
                          {tieneRelacionados && expandido && (
                            <div className="space-y-2 pl-2 border-l-2 border-gray-200 dark:border-gray-800">
                              {grupo.reportesRelacionados.map(
                                (reporteRelacionado) => (
                                  <motion.div
                                    key={reporteRelacionado.id}
                                    className="bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 rounded-lg p-3 space-y-2"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Checkbox
                                            checked={reportesSeleccionados.includes(
                                              reporteRelacionado.id
                                            )}
                                            onCheckedChange={(checked) =>
                                              handleSeleccionarReporte(
                                                reporteRelacionado.id,
                                                checked as boolean
                                              )
                                            }
                                          />
                                          <span
                                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getEstadoColor(
                                              reporteRelacionado.estado
                                            )}`}
                                          >
                                            {reporteRelacionado.estado}
                                          </span>
                                        </div>
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2">
                                          {reporteRelacionado.tipo_contenido ===
                                          "comentario"
                                            ? reporteRelacionado.contenido_preview ||
                                              "Comentario"
                                            : reporteRelacionado.noticia_titulo}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant={
                                        tabActiva === "procesados"
                                          ? "outline"
                                          : "default"
                                      }
                                      onClick={() => {
                                        setReporteActual(reporteRelacionado);
                                        setResolucion(
                                          reporteRelacionado.resolucion || ""
                                        );
                                        setDialogAbierto(true);
                                      }}
                                      className="w-full text-xs"
                                    >
                                      {tabActiva === "procesados"
                                        ? "Revisar"
                                        : "Procesar"}
                                    </Button>
                                  </motion.div>
                                )
                              )}
                            </div>
                          )}
                        </AnimatePresence>

                        {/* Botón para expandir/contraer si hay relacionados */}
                        {tieneRelacionados && (
                          <button
                            onClick={() => toggleNoticia(grupo.grupoId)}
                            className="w-full text-center text-xs font-medium text-primary hover:text-primary/80 py-2 transition-colors"
                          >
                            {expandido
                              ? "Ocultar reportes relacionados"
                              : `Ver ${grupo.cantidad - 1} reportes más`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </AnimatePresence>
              )}
            </motion.div>
          </TabsContent>
        </motion.div>
      </Tabs>

      {/* Dialog para procesar reporte */}
      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="w-full max-w-6xl xl:max-w-[90vw] max-h-[90vh] md:!w-[48rem] lg:!w-[64rem] xl:!w-[72rem] flex flex-col p-0 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogHeader>
              <DialogTitle>Procesar Reporte</DialogTitle>
              <DialogDescription>
                Revisa la información del reporte y el contenido reportado
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Contenido scrolleable */}
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
              `}
            </style>

            {/* En móviles: Tabs para cambiar entre contenido y reporte */}
            <div className="lg:hidden mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setTabMobileActiva("contenido")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  tabMobileActiva === "contenido"
                    ? "border-b-2 border-primary text-primary"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Contenido
              </button>
              <button
                onClick={() => setTabMobileActiva("reporte")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  tabMobileActiva === "reporte"
                    ? "border-b-2 border-primary text-primary"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Reporte
              </button>
            </div>

            {/* Sección izquierda: Contenido reportado (en móviles aparece primero) */}
            <div
              className={`flex-1 overflow-y-auto space-y-4 scrollbar-hide ${
                tabMobileActiva === "contenido" ? "block" : "hidden lg:block"
              } lg:order-first`}
            >
              <h3 className="font-semibold text-base sticky top-0 bg-background">
                Contenido Reportado
              </h3>

              {cargandoNoticia ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mt-2 text-sm text-gray-600">
                      Cargando contenido...
                    </p>
                  </div>
                </div>
              ) : noticiaPreview ? (
                <div className="space-y-4">
                  {tipoContenidoPreview === "comentario" ? (
                    // Vista de comentario
                    <div className="space-y-4">
                      {noticiaPreview.comentarioPadre && (
                        <div className="border-l-4 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                            Comentario padre
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                            {noticiaPreview.comentarioPadre.contenido}
                          </p>
                        </div>
                      )}
                      <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg space-y-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                          {noticiaPreview.contenido}
                        </p>
                        {noticiaPreview.gif_url && (
                          <img
                            src={noticiaPreview.gif_url}
                            alt="GIF"
                            className="w-full h-auto rounded-lg max-h-64 object-cover"
                          />
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-[0.6875rem] uppercase tracking-wide text-gray-400">
                            Votos
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-200/60 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                            {noticiaPreview.votos_totales ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Vista de noticia
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-base mb-2">
                          {noticiaPreview.titulo}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          {new Date(
                            noticiaPreview.created_at
                          ).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      {noticiaPreview.imagen_url && (
                        <img
                          src={noticiaPreview.imagen_url}
                          alt={noticiaPreview.titulo}
                          className="w-full h-auto rounded-lg max-h-64 object-cover"
                        />
                      )}
                      <div
                        className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-bold [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_iframe]:w-full [&_iframe]:rounded-lg"
                        dangerouslySetInnerHTML={{
                          __html: noticiaPreview.contenido,
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase mb-2">
                    {reporteActual?.tipo_contenido === "comentario"
                      ? "Comentario"
                      : "Noticia"}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {reporteActual?.tipo_contenido === "comentario"
                      ? reporteActual?.contenido_preview ||
                        "Comentario sin vista previa"
                      : reporteActual?.noticia_titulo}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cargarContenidoPreview(reporteActual!)}
                    disabled={cargandoNoticia}
                    className="w-full text-xs"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver contenido completo
                  </Button>
                </div>
              )}
            </div>

            {/* Sección derecha: Información del reporte (en móviles aparece segundo) */}
            <div
              className={`flex-1 overflow-y-auto pr-4 lg:pr-0 lg:pl-4 space-y-4 scrollbar-hide lg:border-l border-gray-200 dark:border-gray-800 ${
                tabMobileActiva === "reporte" ? "block" : "hidden lg:block"
              } lg:order-last`}
            >
              <h3 className="font-semibold text-base sticky top-0 bg-background">
                Información del Reporte
              </h3>

              {/* Usuario que reporta */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Reportado por
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <img
                    src={
                      reporteActual?.reportador_avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${reporteActual?.reportador_nombre}`
                    }
                    alt={reporteActual?.reportador_nombre}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm font-medium">
                    {reporteActual?.reportador_nombre}
                  </span>
                </div>
              </div>

              {/* Razón del reporte */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Razón
                </label>
                <p className="text-sm font-medium mt-2 capitalize">
                  {reporteActual?.razon.replace(/_/g, " ")}
                </p>
              </div>

              {/* Descripción */}
              {reporteActual?.descripcion && (
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
                      {reporteActual?.estado === "pendiente" ||
                      reporteActual?.estado === "en_revision"
                        ? "Tu resolución"
                        : "Resolución"}
                    </p>
                    <p className="text-[0.6875rem] text-gray-400 dark:text-gray-500">
                      {reporteActual?.estado === "pendiente" ||
                      reporteActual?.estado === "en_revision"
                        ? "Describe la acción tomada o la decisión final"
                        : `Procesado por ${
                            reporteActual?.resuelto_nombre || "Admin"
                          }`}
                    </p>
                  </div>
                  {(reporteActual?.estado === "pendiente" ||
                    reporteActual?.estado === "en_revision") && (
                    <span className="text-[0.625rem] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-300 uppercase tracking-wide">
                      Requerido
                    </span>
                  )}
                  {reporteActual?.estado !== "pendiente" &&
                    reporteActual?.estado !== "en_revision" && (
                      <span className="text-[0.625rem] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 uppercase tracking-wide">
                        {reporteActual?.estado === "resuelto"
                          ? "Resuelto"
                          : "Desestimado"}
                      </span>
                    )}
                </div>
                {reporteActual?.estado === "pendiente" ||
                reporteActual?.estado === "en_revision" ? (
                  <>
                    <Textarea
                      value={resolucion}
                      onChange={(e) => setResolucion(e.target.value)}
                      placeholder="Escribe la resolución del reporte..."
                      rows={5}
                      className="mt-3 text-sm resize-none bg-transparent border-gray-300 dark:border-gray-700 focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    <p className="text-[0.6875rem] text-gray-400 dark:text-gray-500 mt-2">
                      Esta información se enviará al usuario para informarle del
                      resultado.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg whitespace-pre-wrap break-words">
                    {reporteActual?.resolucion ||
                      "No hay resolución registrada"}
                  </p>
                )}
              </div>
            </div>
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
              {reporteActual?.estado === "pendiente" ||
              reporteActual?.estado === "en_revision" ? (
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
                        reporte_id: reporteActual!.id,
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
                        reporte_id: reporteActual!.id,
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

      {/* Modal para vista previa de noticia o comentario */}
      <Dialog open={modalNoticiaAbierto} onOpenChange={setModalNoticiaAbierto}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {tipoContenidoPreview === "comentario"
                ? "Vista previa de comentario"
                : "Vista previa de noticia"}
            </DialogTitle>
            <DialogDescription>
              {tipoContenidoPreview === "comentario"
                ? "Visualiza el contenido del comentario reportado"
                : "Visualiza el contenido de la noticia reportada"}
            </DialogDescription>
          </DialogHeader>
          {cargandoNoticia ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-sm text-gray-600">
                  Cargando{" "}
                  {tipoContenidoPreview === "comentario"
                    ? "comentario"
                    : "noticia"}
                  ...
                </p>
              </div>
            </div>
          ) : noticiaPreview ? (
            <div className="space-y-4">
              {tipoContenidoPreview === "comentario" ? (
                // Vista de comentario
                <div className="space-y-4">
                  {/* Comentario padre si existe */}
                  {noticiaPreview.comentarioPadre && (
                    <div className="border-l-4 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <img
                          src={
                            noticiaPreview.comentarioPadre.autor?.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${
                              noticiaPreview.comentarioPadre.autor?.username ||
                              "usuario"
                            }`
                          }
                          alt={
                            noticiaPreview.comentarioPadre.autor?.username ||
                            "Usuario"
                          }
                          className="w-8 h-8 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-xs">
                              {noticiaPreview.comentarioPadre.autor?.username ||
                                "Usuario"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(
                                noticiaPreview.comentarioPadre.created_at
                              ).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                            {noticiaPreview.comentarioPadre.contenido}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Respuesta */}
                  <div className="flex items-start gap-4">
                    <img
                      src={
                        noticiaPreview.autor?.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${
                          noticiaPreview.autor?.username || "usuario"
                        }`
                      }
                      alt={noticiaPreview.autor?.username || "Usuario"}
                      className="w-12 h-12 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-sm">
                          {noticiaPreview.autor?.username || "Usuario"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(
                            noticiaPreview.created_at
                          ).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <span className="text-[0.6875rem] uppercase tracking-wide text-gray-400">
                          Votos
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-200/60 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                          {noticiaPreview.votos_totales ?? 0}
                        </span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words">
                          {noticiaPreview.texto || noticiaPreview.text}
                        </p>
                        {noticiaPreview.gif_url && (
                          <img
                            src={noticiaPreview.gif_url}
                            alt="GIF"
                            className="mt-3 rounded-lg max-w-full max-h-64 object-cover"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Vista de noticia
                <>
                  {noticiaPreview.imagen_url && (
                    <img
                      src={noticiaPreview.imagen_url}
                      alt={noticiaPreview.titulo}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      {noticiaPreview.titulo}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Por {noticiaPreview.autor_nombre} •{" "}
                      {noticiaPreview.fecha || noticiaPreview.fecha_publicacion
                        ? new Date(
                            noticiaPreview.fecha ||
                              noticiaPreview.fecha_publicacion
                          ).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Fecha desconocida"}
                    </p>
                  </div>
                  {noticiaPreview.resumen && (
                    <div>
                      <h3 className="font-semibold mb-2">Resumen</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {noticiaPreview.resumen}
                      </p>
                    </div>
                  )}
                  <div className="prose dark:prose-invert max-w-none text-sm">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: noticiaPreview.contenido,
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No se pudo cargar el contenido
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
