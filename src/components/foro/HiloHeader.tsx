"use client";

import { useState } from "react";
import { useUserTheme } from "@/hooks/useUserTheme";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Star,
  Lock,
  Eye,
  Clock,
  ExternalLink,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import BotonReportar from "@/components/foro/BotonReportar";
import { Votacion } from "@/components/ui/Votacion";
import ContadorRespuestasRealtime from "@/components/foro/ContadorRespuestasRealtime";
import HiloContenido from "@/components/foro/HiloContenido";
import { useAuth } from "@/context/AuthContext";
import type { ForoHiloCompleto } from "@/types/foro";
import dynamic from "next/dynamic";
import { ShareButton } from "@/components/shared/ShareButton";

// Importar dinámicamente el editor para evitar problemas de SSR
const TiptapEditor = dynamic(() => import("@/components/tiptap-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
  ),
});

interface HiloHeaderProps {
  hilo: ForoHiloCompleto;
  etiquetas: Array<{ id: string; nombre: string; color: string | null }>;
}

export default function HiloHeader({ hilo, etiquetas }: HiloHeaderProps) {
  const { user } = useAuth();
  const { userColor, getHoverTextColor, hexToRgba, getColorWithOpacity } =
    useUserTheme();
  const [modoEdicion, setModoEdicion] = useState(false);
  const [contenidoEditado, setContenidoEditado] = useState(hilo.contenido);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const esAutor = user?.id === hilo.autor_id;
  const groupedButtonClasses =
    "inline-flex items-center justify-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted/70 hover:text-foreground sm:text-sm sm:min-w-[120px]";

  const handleEliminar = async () => {
    if (
      !confirm(
        "¿Estás seguro de que deseas eliminar este hilo? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    setEliminando(true);
    try {
      const response = await fetch(`/api/foro/hilos/${hilo.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar el hilo");
      }

      // Redirigir al foro después de eliminar
      window.location.href = "/foro";
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("No se pudo eliminar el hilo. Por favor, intenta de nuevo.");
    } finally {
      setEliminando(false);
    }
  };

  const handleGuardarEdicion = async () => {
    if (!contenidoEditado.trim()) {
      return;
    }

    setGuardando(true);

    try {
      const response = await fetch(`/api/foro/hilos/${hilo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contenido: contenidoEditado,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar el hilo");
      }

      setModoEdicion(false);
      // Recargar la página para mostrar el contenido actualizado
      window.location.reload();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar los cambios. Por favor, intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelarEdicion = () => {
    setContenidoEditado(hilo.contenido);
    setModoEdicion(false);
  };

  return (
    <article className="bg-white dark:bg-black amoled:bg-black">
      <header className="pb-6">
        {/* Título del hilo */}
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-gray-900 dark:text-gray-100 amoled:text-white break-words mb-4">
          {hilo.titulo}
        </h1>

        {/* Etiquetas y badges de estado */}
        {(etiquetas.length > 0 || hilo.es_fijado || hilo.es_cerrado) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {etiquetas.map((tag) => (
              <span
                key={tag.id}
                className="text-xs font-medium px-3 py-1 rounded-full border bg-white dark:bg-gray-800 amoled:bg-black"
                style={{
                  borderColor: tag.color || "#64748b",
                  color: tag.color || "#64748b",
                }}
              >
                {tag.nombre}
              </span>
            ))}
            {hilo.es_fijado && (
              <span className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-full border border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                <Star size={14} fill="currentColor" /> Fijado
              </span>
            )}
            {hilo.es_cerrado && (
              <span className="text-xs inline-flex items-center gap-1 px-3 py-1 rounded-full border border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <Lock size={14} /> Cerrado
              </span>
            )}
          </div>
        )}

        {/* Información del autor y estadísticas */}
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="absolute right-0 top-0 sm:hidden">
            <BotonReportar
              tipo_contenido="hilo"
              contenido_id={hilo.id}
              variant="outline"
              size="sm"
              hideLabelBelow="lg"
            />
          </div>

          {/* Autor */}
          <div className="flex items-center gap-3 pr-14 sm:pr-0">
            <Link
              href={`/perfil/${hilo.autor?.public_id ?? hilo.autor?.username ?? ""}`}
              className="group flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <Avatar
                className="h-12 w-12 ring-2 transition-all"
                style={{
                  borderColor: hilo.autor?.color
                    ? `color-mix(in srgb, ${hilo.autor.color} 35%, transparent)`
                    : undefined,
                  boxShadow: hilo.autor?.color
                    ? `0 0 0 1px color-mix(in srgb, ${hilo.autor.color} 40%, transparent)`
                    : undefined,
                }}
              >
                <AvatarImage
                  src={hilo.autor?.avatar_url ?? undefined}
                  alt={hilo.autor?.username ?? "Autor"}
                />
                <AvatarFallback
                  className="text-white font-semibold"
                  style={{
                    background: hilo.autor?.color
                      ? `linear-gradient(135deg, color-mix(in srgb, ${hilo.autor.color} 70%, transparent), color-mix(in srgb, ${hilo.autor.color} 30%, transparent))`
                      : undefined,
                  }}
                >
                  {hilo.autor?.username?.substring(0, 2).toUpperCase() ?? "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span
                  className="font-semibold text-gray-900 dark:text-gray-100 amoled:text-white flex items-center gap-1 transition-colors"
                  style={{
                    color: hilo.autor?.color ?? undefined,
                  }}
                >
                  {hilo.autor?.username ?? "Autor desconocido"}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <time className="text-xs text-gray-500 dark:text-gray-400">
                  {format(
                    new Date(hilo.created_at),
                    "d 'de' MMMM 'de' yyyy, HH:mm",
                    {
                      locale: es,
                    }
                  )}
                </time>
              </div>
            </Link>
          </div>

          {/* Estadísticas */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="font-medium">{hilo.vistas ?? 0}</span>
            </div>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
            <ContadorRespuestasRealtime
              hiloId={hilo.id}
              respuestasIniciales={hilo.respuestas ?? 0}
            />
            <div className="hidden sm:flex h-4 w-px bg-gray-300 dark:bg-gray-600" />
            <div className="hidden sm:inline-flex">
              <Votacion
                id={hilo.id}
                tipo="hilo"
                votosIniciales={hilo.votos ?? 0}
                vertical={false}
                size="md"
                className="h-10"
              />
            </div>
            {hilo.updated_at && hilo.updated_at !== hilo.created_at && (
              <>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                <div
                  className="flex items-center gap-1.5"
                  title="Última edición"
                >
                  <Clock className="h-4 w-4" />
                  <time className="text-xs">
                    {format(new Date(hilo.updated_at), "d MMM, HH:mm", {
                      locale: es,
                    })}
                  </time>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Botones de acción y votación */}
        <div className="flex w-full items-center gap-2 overflow-x-auto sm:gap-3 md:flex-wrap md:overflow-visible">
          <div className="sm:hidden flex items-center flex-shrink-0">
            <Votacion
              id={hilo.id}
              tipo="hilo"
              votosIniciales={hilo.votos ?? 0}
              vertical={false}
              size="md"
              className="h-10"
            />
          </div>

          <div className="flex flex-row flex-nowrap gap-2 flex-shrink-0">
            <Link
              href="#responder"
              className={groupedButtonClasses}
              aria-label="Responder"
            >
              <MessageSquare size={16} />
              <span className="hidden lg:inline">Responder</span>
            </Link>
            <button
              type="button"
              className={groupedButtonClasses}
              aria-label="Seguir hilo"
            >
              <Star size={16} />
              <span className="hidden lg:inline">Seguir</span>
            </button>
            <ShareButton
              url={`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
                }/foro/hilos/${hilo.slug}`}
              title={hilo.titulo}
              description={hilo.contenido
                .substring(0, 160)
                .replace(/<[^>]*>/g, "")}
              shareText="Compartir"
              variant="outline"
              size="default"
              hideLabelBelow="lg"
              className={`${groupedButtonClasses} !font-medium`}
            />
          </div>

          {esAutor && (
            <div className="flex flex-row flex-nowrap gap-2 ml-auto flex-shrink-0">
              <button
                type="button"
                className={groupedButtonClasses}
                aria-label="Editar hilo"
                onClick={() => setModoEdicion(true)}
              >
                <Pencil size={16} />
                <span className="hidden lg:inline">Editar</span>
              </button>
              <button
                type="button"
                className={groupedButtonClasses}
                onClick={handleEliminar}
                disabled={eliminando}
                aria-label={eliminando ? "Eliminando hilo" : "Eliminar hilo"}
              >
                <Trash2 size={16} />
                <span className="hidden lg:inline">
                  {eliminando ? "Eliminando..." : "Eliminar"}
                </span>
              </button>
            </div>
          )}

          <div className="hidden sm:block sm:ml-auto">
            <BotonReportar
              tipo_contenido="hilo"
              contenido_id={hilo.id}
              variant="outline"
              size="sm"
              hideLabelBelow="lg"
            />
          </div>
        </div>
      </header>

      {/* Contenido del post inicial */}
      <div className="pt-0">
        {!modoEdicion ? (
          <HiloContenido
            html={hilo.contenido ?? ""}
            className="prose max-w-none prose-headings:my-4 prose-p:my-3 prose-strong:text-gray-900 dark:prose-strong:text-white amoled:prose-invert amoled:prose-strong:text-white"
            weaponStatsRecord={hilo.weapon_stats_record ?? undefined}
            statsDeleted={(hilo as any).stats_deleted}
          />
        ) : (
          <div className="space-y-4">
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
              <TiptapEditor
                value={contenidoEditado}
                onChange={setContenidoEditado}
                placeholder="Edita el contenido de tu hilo..."
              />
            </div>

            {/* Botones de guardar y cancelar */}
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelarEdicion}
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={16} />
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarEdicion}
                disabled={guardando || !contenidoEditado.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
