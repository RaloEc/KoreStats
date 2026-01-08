"use client";

import { useState } from "react";
import Image from "next/image";
import { SupabaseImage } from "@/components/ui/SupabaseImage";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageSquare,
  Eye,
  TrendingUp,
  Clock,
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Trash2,
  Code,
  Twitter,
  Youtube,
  AtSign,
  Sword,
} from "lucide-react";
import { Votacion } from "@/components/ui/Votacion";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import React from "react";
import { useUserTheme } from "@/hooks/useUserTheme";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { WeaponStatsCard } from "@/components/weapon/WeaponStatsCard";
import type { WeaponStats } from "@/types/weapon";

export type HiloCardProps = {
  id: string;
  href: string;
  titulo: string;
  contenido?: string | null;
  categoriaNombre?: string;
  categoriaColor?: string;
  autorUsername?: string;
  autorAvatarUrl?: string | null;
  autorId?: string | null;
  autorPublicId?: string | null;
  autorColor?: string;
  createdAt: string;
  vistas?: number;
  respuestas?: number;
  votosIniciales?: number;
  showSinRespuestasAlert?: boolean;
  className?: string;
  weaponStats?: WeaponStats | string | null;
  onDelete?: (hiloId: string) => void;
  excerpt?: string;
  mediaMetadata?: {
    excerpt: string;
    hasImage: boolean;
    hasVideo: boolean;
    hasCode: boolean;
    hasTweet: boolean;
    thumbnailUrl: string | null;
    images: string[];
    youtubeVideoId: string | null;
  };
};

function stripHtml(text?: string | null, maxLen: number = 80): string {
  if (!text) return "";
  const plain = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLen ? plain.substring(0, maxLen) + "..." : plain;
}

// Extraer el ID de video de YouTube de una URL
const getYoutubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

// Función pura para parsear weaponStats
const parseWeaponStats = (
  weaponStats: HiloCardProps["weaponStats"]
): WeaponStats | null => {
  if (!weaponStats) return null;

  // Si ya es un objeto (ha sido pasado así desde un contexto de React/servidor)
  if (typeof weaponStats !== "string") {
    return weaponStats;
  }

  // Intentar parsear el string
  try {
    const parsed = JSON.parse(weaponStats) as WeaponStats;
    // Asegurar que es un objeto válido y no simplemente 'null' como string
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.error(
      "[HiloCard] Error al parsear weaponStats (JSON inválido):",
      error
    );
    return null;
  }
};

// Importar dinámicamente el componente YoutubePlayer para evitar problemas de hidratación
const YoutubePlayer = dynamic<{
  videoId: string;
  title?: string;
  className?: string;
}>(
  () =>
    import("@/components/ui/YoutubePlayer").then((mod) => mod.YoutubePlayer),
  {
    ssr: false,
    loading: () => (
      <div
        className="youtube-placeholder w-full bg-gray-100 dark:bg-gray-800 rounded-lg"
        style={{
          aspectRatio: "16/9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="animate-pulse text-gray-400">Cargando video...</div>
      </div>
    ),
  }
);

// Componente simplificado para renderizar preview de contenido
const HiloPreviewSimple = ({
  excerpt,
  thumbnailUrl,
  youtubeVideoId,
  images = [],
}: {
  excerpt?: string;
  thumbnailUrl?: string | null;
  youtubeVideoId?: string | null;
  images?: string[];
}) => {
  return (
    <div className="space-y-3">
      {/* Video de YouTube */}
      {youtubeVideoId && (
        <div className="mb-3">
          <YoutubePlayer
            videoId={youtubeVideoId}
            className="rounded-lg aspect-video w-full"
          />
        </div>
      )}

      {/* Imagen Destacada (solo si no hay video) */}
      {!youtubeVideoId && thumbnailUrl && (
        <div className="mb-3 w-full flex justify-center">
          <div className="w-full max-w-4xl">
            <div className="relative w-full h-[300px] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
              <SupabaseImage
                src={thumbnailUrl}
                alt="Imagen destacada"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 896px"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      )}

      {/* Galería pequeña si hay múltiples imágenes y no hay video */}
      {!youtubeVideoId && !thumbnailUrl && images.length > 0 && (
        <div className="mb-3 w-full flex justify-center">
          <div className="relative w-full h-[300px] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <SupabaseImage
              src={images[0]}
              alt="Imagen destacada"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 896px"
              loading="lazy"
            />
            {images.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                +{images.length - 1}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Texto - Usamos line-clamp nativo de Tailwind */}
      {excerpt && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
          {excerpt}
        </p>
      )}
    </div>
  );
};

function HiloCard(props: HiloCardProps) {
  const {
    id,
    href,
    titulo,
    contenido,
    categoriaNombre,
    categoriaColor,
    autorUsername = "Anónimo",
    autorAvatarUrl,
    autorId,
    autorPublicId,
    autorColor,
    createdAt,
    vistas = 0,
    respuestas = 0,
    votosIniciales = 0,
    showSinRespuestasAlert = false,
    className = "",
    weaponStats,
    onDelete,
    excerpt,
    mediaMetadata,
  } = props;

  // Validación defensiva
  if (!titulo) return null;

  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Usamos ref para la animación de salida para evitar re-renderizados innecesarios
  const [isExiting, setIsExiting] = useState(false);

  const isAuthor = user?.id === autorId;
  const router = useRouter();

  const normalizedUsername = autorUsername?.trim();
  const profileId = autorPublicId
    ? autorPublicId
    : normalizedUsername && normalizedUsername.toLowerCase() !== "anónimo"
    ? normalizedUsername
    : null;
  const hasProfileLink = Boolean(profileId);

  // Funciones de eliminación (sin cambios significativos en lógica)
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/foro/hilos/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Error al eliminar");

      setShowDeleteModal(false);
      setIsExiting(true);

      setTimeout(() => {
        if (onDelete) onDelete(id);
      }, 300);
    } catch (error) {
      console.error(error);
      alert("No se pudo eliminar el hilo");
    } finally {
      setIsDeleting(false);
    }
  };

  const parsedWeaponStats = parseWeaponStats(weaponStats);
  const { userColor, getFadedBackground, getColorWithOpacity } = useUserTheme();
  const fadedBgColor = getFadedBackground();

  // Lógica de indicadores simplificada usando metadatos del servidor
  const indicators = React.useMemo(() => {
    if (mediaMetadata) {
      return {
        hasCode: mediaMetadata.hasCode,
        hasTweet: mediaMetadata.hasTweet,
        hasYoutube: mediaMetadata.hasVideo,
        hasImages: mediaMetadata.hasImage,
        hasMentions: false, // Omitimos mentions por ahora para no parsear
        hasWeapon: parsedWeaponStats !== null,
        hasAny:
          mediaMetadata.hasCode ||
          mediaMetadata.hasTweet ||
          mediaMetadata.hasVideo ||
          mediaMetadata.hasImage ||
          parsedWeaponStats !== null,
      };
    }

    // Fallback simple si no hay metadatos (solo si hay contenido string)
    if (!contenido) return { hasAny: false };

    return {
      hasCode: contenido.includes("<pre") || contenido.includes("<code"),
      hasTweet: contenido.includes('data-type="twitter-embed"'),
      hasYoutube:
        contenido.includes("youtube.com") || contenido.includes("youtu.be"),
      hasImages: contenido.includes("<img"),
      hasMentions: contenido.includes("@"),
      hasWeapon: parsedWeaponStats !== null,
      hasAny: true, // Asumimos true si hay algo complejo para verificar rápido
    };
  }, [mediaMetadata, contenido, parsedWeaponStats]);

  const badgeBg = (categoriaColor || "#3B82F6") + "20";
  const badgeFg = categoriaColor || "#3B82F6";

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!hasProfileLink || !profileId) return;
    e.preventDefault();
    e.stopPropagation();
    router.push(`/perfil/${encodeURIComponent(profileId)}`);
  };

  const handleProfileKeyDown = (e: React.KeyboardEvent) => {
    if (!hasProfileLink || !profileId) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/perfil/${encodeURIComponent(profileId)}`);
    }
  };

  return (
    <motion.div
      className={`${className} block my-3`}
      // Validar si podemos simplificar esta animación
      initial={{ opacity: 1, x: 0 }}
      animate={isExiting ? { opacity: 0, x: -100 } : { opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }} // Reducir duración
    >
      <Card
        suppressHydrationWarning={true}
        className="group flex flex-col overflow-hidden bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-200 rounded-xl"
        style={{
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: userColor
            ? `${userColor}40`
            : "rgba(156, 163, 175, 0.5)",
        }}
      >
        <Link href={href} className="block flex-1 group-link">
          <CardContent className="p-0 flex flex-col">
            <article className="flex flex-col">
              <div className="p-5 flex flex-col">
                {/* Header: Autor y Categoría */}
                <div className="flex items-center justify-between mb-3">
                  {/* Autor */}
                  <div className="flex items-center gap-2">
                    <div
                      onClick={hasProfileLink ? handleProfileClick : undefined}
                      onKeyDown={
                        hasProfileLink ? handleProfileKeyDown : undefined
                      }
                      role={hasProfileLink ? "link" : undefined}
                      tabIndex={hasProfileLink ? 0 : -1}
                      aria-disabled={!hasProfileLink}
                      data-prevent-card-navigation="true"
                      className={`flex items-center gap-2 group/author ${
                        hasProfileLink
                          ? "cursor-pointer hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          : "cursor-default"
                      }`}
                    >
                      <Avatar className="h-6 w-6">
                        {autorAvatarUrl && (
                          <AvatarImage
                            src={autorAvatarUrl}
                            alt={autorUsername}
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700">
                          {autorUsername.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {autorUsername}
                      </span>
                    </div>
                  </div>

                  {/* Categoría */}
                  <div className="flex items-center gap-2">
                    {(categoriaNombre || indicators.hasAny) && (
                      <div className="flex items-center gap-2">
                        {categoriaNombre && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 whitespace-nowrap"
                            style={{ backgroundColor: badgeBg, color: badgeFg }}
                          >
                            {categoriaNombre}
                          </Badge>
                        )}
                        {indicators.hasAny && (
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            {indicators.hasCode && (
                              <Code
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                            {indicators.hasTweet && (
                              <Twitter
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                            {indicators.hasYoutube && (
                              <Youtube
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                            {indicators.hasImages && (
                              <ImageIcon
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                            {indicators.hasMentions && (
                              <AtSign
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                            {indicators.hasWeapon && (
                              <Sword
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {showSinRespuestasAlert && (
                      <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                    )}
                  </div>
                </div>

                {/* Título y extracto */}
                <div className="space-y-4 flex-1 flex flex-col">
                  <h3
                    className="font-semibold text-base text-gray-900 dark:text-white break-words whitespace-normal"
                    title={titulo.length > 80 ? titulo : undefined}
                  >
                    {titulo}
                  </h3>

                  {(contenido || excerpt) && (
                    <div className="hilo-preview text-sm text-gray-600 dark:text-gray-400 flex-1 mt-2">
                      <HiloPreviewSimple
                        excerpt={excerpt || stripHtml(contenido, 200)}
                        thumbnailUrl={mediaMetadata?.thumbnailUrl}
                        youtubeVideoId={mediaMetadata?.youtubeVideoId}
                        images={mediaMetadata?.images}
                      />

                      {parsedWeaponStats && (
                        <div className="mb-4 md:flex md:justify-center mt-4">
                          <WeaponStatsCard
                            stats={parsedWeaponStats}
                            className="max-w-sm md:max-w-xl md:w-72 md:h-96  md:mx-auto  "
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Barra inferior con estadísticas */}
              <div
                suppressHydrationWarning={true}
                className="border-t p-2 transition-colors duration-300 flex flex-wrap items-center gap-x-4 gap-y-2"
                style={{
                  borderColor: getColorWithOpacity(0.1),
                  backgroundColor: fadedBgColor,
                }}
              >
                {/* Izquierda: Vistas y comentarios */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <Eye className="h-3 w-3" />
                    {vistas || 0}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <MessageSquare className="h-3 w-3" />
                    {respuestas || 0}
                  </span>
                </div>

                {/* Centro: Votos */}
                <div
                  className="order-last w-full flex justify-center sm:order-none sm:w-auto sm:flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Votacion
                    id={id}
                    tipo="hilo"
                    votosIniciales={votosIniciales}
                    vertical={false}
                    size="sm"
                    className="h-6"
                  />
                </div>

                {/* Derecha: Fecha y botón de eliminar */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
                  <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    {new Date(createdAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {isAuthor && (
                    <button
                      onClick={handleDeleteClick}
                      disabled={isDeleting}
                      className="ml-2 p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
                      title="Eliminar hilo"
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          </CardContent>
        </Link>
      </Card>

      {/* Modal de confirmación de eliminación */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Eliminar hilo"
        description={`¿Estás seguro de que deseas eliminar el hilo "${titulo}"? Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDangerous={true}
      />
    </motion.div>
  );
}

// Función de comparación mejorada para memoización
const arePropsEqual = (
  prevProps: HiloCardProps,
  nextProps: HiloCardProps
): boolean => {
  // Comparación de propiedades principales que afectan al renderizado
  const basicPropsEqual =
    prevProps.id === nextProps.id &&
    prevProps.titulo === nextProps.titulo &&
    prevProps.votosIniciales === nextProps.votosIniciales &&
    prevProps.respuestas === nextProps.respuestas &&
    prevProps.vistas === nextProps.vistas;

  // Si las propiedades básicas son diferentes, definitivamente hay que re-renderizar
  if (!basicPropsEqual) return false;

  // Comparación de contenido solo si ambos tienen contenido
  // Si uno tiene contenido y el otro no, o si el contenido cambió, hay que re-renderizar
  if (prevProps.contenido || nextProps.contenido) {
    // Si uno tiene contenido y el otro no, son diferentes
    if (!prevProps.contenido || !nextProps.contenido) return false;

    // Si el contenido cambió significativamente (más de 10 caracteres de diferencia)
    // o si contiene diferentes videos/imágenes, hay que re-renderizar
    const prevHasVideo = prevProps.contenido?.includes("<iframe") || false;
    const nextHasVideo = nextProps.contenido?.includes("<iframe") || false;
    const prevHasImage = prevProps.contenido?.includes("<img") || false;
    const nextHasImage = nextProps.contenido?.includes("<img") || false;

    if (prevHasVideo !== nextHasVideo || prevHasImage !== nextHasImage)
      return false;

    // Si la longitud del contenido cambió significativamente, hay que re-renderizar
    const lengthDiff = Math.abs(
      (prevProps.contenido?.length || 0) - (nextProps.contenido?.length || 0)
    );
    if (lengthDiff > 10) return false;
  }

  // Comparación de otras propiedades que podrían afectar la apariencia
  if (prevProps.categoriaColor !== nextProps.categoriaColor) return false;
  if (prevProps.categoriaNombre !== nextProps.categoriaNombre) return false;
  if (prevProps.autorUsername !== nextProps.autorUsername) return false;
  if (prevProps.autorAvatarUrl !== nextProps.autorAvatarUrl) return false;
  if (prevProps.autorId !== nextProps.autorId) return false;
  if (prevProps.showSinRespuestasAlert !== nextProps.showSinRespuestasAlert)
    return false;
  if (prevProps.weaponStats !== nextProps.weaponStats) return false;
  if (prevProps.onDelete !== nextProps.onDelete) return false;

  // Si todas las comparaciones pasaron, las props son iguales
  return true;
};

export default React.memo(HiloCard, arePropsEqual);
