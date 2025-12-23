"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CommentForm } from "@/components/comentarios/CommentForm";
import { CommentCard } from "@/components/comentarios/CommentCard";
import { AuthModal } from "@/components/auth/AuthModal";
import { useHiloComentarios } from "./hooks/useHiloComentarios";
import { useInView } from "react-intersection-observer";
import {
  MessageSquare,
  Lock,
  ArrowUp,
  Clock,
  MessageCircle,
  ThumbsUp,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useRealtimeComments } from "@/hooks/useRealtimeComments";
import { useRealtimeVotos } from "@/hooks/useRealtimeVotos";
import { useUserTheme } from "@/hooks/useUserTheme";
import { useAuth } from "@/context/AuthContext";

interface HiloComentariosOptimizadoProps {
  hiloId: string;
  autorHiloId: string;
  hiloCerrado?: boolean;
  pageSize?: number;
  order?: "asc" | "desc";
}

const HiloComentariosOptimizado: React.FC<HiloComentariosOptimizadoProps> = ({
  hiloId,
  autorHiloId,
  hiloCerrado = false,
  pageSize = 20,
  order = "asc",
}) => {
  // Estado para el modal de autenticación
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { userColor } = useUserTheme();

  const { user: authUser, profile } = useAuth();

  const initialComentariosUser = useMemo(() => {
    if (!authUser) {
      return null;
    }

    return {
      ...authUser,
      username: profile?.username ?? authUser.user_metadata?.username ?? null,
      avatar_url:
        profile?.avatar_url ?? authUser.user_metadata?.avatar_url ?? null,
      color: profile?.color ?? authUser.user_metadata?.color ?? null,
    };
  }, [authUser, profile]);

  // Estado para el ordenamiento (ANTES del hook que lo usa)
  const [sortBy, setSortBy] = useState<"recent" | "votes">("recent");

  // Usar el hook personalizado para gestionar comentarios
  const {
    comentarios,
    total,
    isLoading,
    error,
    user,
    submitting,
    loadMoreComentarios,
    hasNextPage,
    isFetchingNextPage,
    handleAddComment,
    handleAddReply,
    handleDeleteComment,
    handleMarkSolution,
  } = useHiloComentarios(
    hiloId,
    pageSize,
    order,
    sortBy,
    initialComentariosUser
  );

  // Activar actualizaciones en tiempo real
  useRealtimeComments("hilo", hiloId);
  useRealtimeVotos(hiloId);

  const esAutorHilo = user?.id === autorHiloId;

  // Estado para mostrar el botón "Volver arriba"
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Configurar el observador de intersección para carga infinita
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
    rootMargin: "200px 0px",
  });

  // Cargar más comentarios cuando el elemento sea visible
  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      loadMoreComentarios();
    }
  }, [inView, hasNextPage, isFetchingNextPage, loadMoreComentarios]);

  // Detectar scroll para mostrar botón "Volver arriba"
  React.useEffect(() => {
    const handleScroll = () => {
      // Mostrar botón si hay más de 20 comentarios cargados y se ha scrolleado más de 500px
      if (comentarios.length > 20 && window.scrollY > 500) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [comentarios.length]);

  // Función para volver arriba
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Manejar el clic en una respuesta citada
  const handleQuotedReplyClick = (commentId: string) => {
    const element = document.getElementById(`comment-${commentId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("highlight");
      setTimeout(() => {
        element.classList.remove("highlight");
      }, 1500);
    }
  };

  // Extraer y priorizar soluciones (ANTES del return condicional)
  const sortedComentarios = React.useMemo(() => {
    // Función recursiva para encontrar todas las soluciones (incluyendo respuestas anidadas)
    const findSolutions = (
      comments: typeof comentarios,
      parentId?: string
    ): typeof comentarios => {
      const solutions: typeof comentarios = [];

      comments.forEach((comment) => {
        if (comment.isSolution) {
          // Si es una respuesta anidada (tiene parentId), agregar metadata del padre
          if (parentId) {
            solutions.push({
              ...comment,
              parentCommentId: parentId, // Guardar ID del comentario padre
            });
          } else {
            // Si es un comentario principal, agregarlo normalmente
            solutions.push(comment);
          }
        }
        // Buscar en respuestas anidadas, pasando el ID actual como padre
        if (comment.replies && comment.replies.length > 0) {
          solutions.push(...findSolutions(comment.replies, comment.id));
        }
      });

      return solutions;
    };

    // Función para remover SOLO soluciones de comentarios principales (no respuestas anidadas)
    const removePrimarySolutions = (
      comments: typeof comentarios
    ): typeof comentarios => {
      return comments
        .filter((c) => !c.isSolution) // Solo filtrar soluciones principales
        .map((comment) => ({
          ...comment,
          // Mantener las respuestas anidadas intactas (incluyendo soluciones)
          replies: comment.replies || [],
        }));
    };

    // Extraer todas las soluciones (comentarios y respuestas)
    const solutions = findSolutions(comentarios);

    // Obtener comentarios sin las soluciones PRINCIPALES (mantener respuestas anidadas)
    const nonPrimarySolutions = removePrimarySolutions(comentarios);

    // Los comentarios ya vienen ordenados del servidor según sortBy
    // Solo necesitamos poner las soluciones primero
    const flatSolutions = solutions.map((s) => ({ ...s, replies: [] }));
    return [...flatSolutions, ...nonPrimarySolutions];
  }, [comentarios]);

  if (isLoading && comentarios.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare size={24} />
            Respuestas
          </h2>
        </div>
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
              <span className="text-gray-600 dark:text-gray-400">
                Cargando respuestas...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de respuestas con selector de ordenamiento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare size={24} />
          {total} {total === 1 ? "Respuesta" : "Respuestas"}
        </h2>

        {/* Selector de ordenamiento */}
        {total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Ordenar por:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy("recent")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  sortBy === "recent"
                    ? "shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                style={{
                  backgroundColor: sortBy === "recent" ? userColor : undefined,
                  color: sortBy === "recent" ? "white" : undefined,
                }}
              >
                <Clock className="h-4 w-4" />
                Más recientes
              </button>
              <button
                onClick={() => setSortBy("votes")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  sortBy === "votes"
                    ? "shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                style={{
                  backgroundColor: sortBy === "votes" ? userColor : undefined,
                  color: sortBy === "votes" ? "white" : undefined,
                }}
              >
                <ThumbsUp className="h-4 w-4" />
                Mejores votados
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        {/* Mostrar errores */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Mensaje si el hilo está cerrado */}
        {hiloCerrado && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-yellow-800 dark:text-yellow-300">
                Este hilo está cerrado. No se pueden agregar nuevas respuestas.
              </p>
            </div>
          </div>
        )}

        {/* Formulario principal para añadir comentarios */}
        {!hiloCerrado && (
          <div className="mb-6 mt-6" id="responder">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              {user ? "" : "Inicia sesión para responder"}
            </h3>

            {user ? (
              <CommentForm
                onSubmit={handleAddComment}
                placeholder="Escribe tu respuesta..."
                ctaText="Publicar respuesta"
                isLoading={submitting}
              />
            ) : (
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  Debes iniciar sesión para responder
                </p>
                <Button
                  variant="outline"
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  Iniciar sesión
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Lista de comentarios */}
        <div className="space-y-4">
          {comentarios.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <div className="w-32 h-32 mx-auto mb-4">
                <DotLottieReact
                  src="https://lottie.host/0947ffac-d843-43e4-9135-cf650aedbddb/qvVE4Zvsu6.lottie"
                  loop
                  autoplay
                />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Aún no hay respuestas en este hilo
              </p>
              {!hiloCerrado && user && (
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Sé el primero en responder arriba
                </p>
              )}
            </div>
          ) : (
            sortedComentarios.map((comment) => {
              const isAuthor = user && user.id === comment.authorId;
              const canDelete = isAuthor || esAutorHilo;
              const canMarkSolution = esAutorHilo && !comment.deleted;

              return (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onReply={!hiloCerrado ? handleAddReply : undefined}
                  onQuotedReplyClick={handleQuotedReplyClick}
                  // onEdit deshabilitado - no se permite editar comentarios
                  onDelete={canDelete ? handleDeleteComment : undefined}
                  isAuthor={isAuthor}
                  currentUser={user}
                  // Props adicionales para funcionalidad del foro
                  canMarkSolution={canMarkSolution}
                  onMarkSolution={
                    canMarkSolution ? handleMarkSolution : undefined
                  }
                  tipoContexto="foro"
                />
              );
            })
          )}

          {/* Botón para cargar más comentarios */}
          {hasNextPage && (
            <div className="text-center pt-8">
              <Button
                variant="outline"
                size="lg"
                onClick={() => loadMoreComentarios()}
                disabled={isFetchingNextPage}
                className="min-w-[200px] border-2 font-bold uppercase tracking-wider transition-all hover:scale-105"
                style={{
                  color: user?.color || "inherit",
                  borderColor: user?.color || "currentColor",
                }}
              >
                {isFetchingNextPage ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                    Cargando...
                  </>
                ) : (
                  "Mostrar más comentarios"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de autenticación */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode="login"
      />

      {/* Botón "Volver arriba" */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 lg:bottom-6 right-6 z-50 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          aria-label="Volver arriba"
          title="Volver arriba"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default React.memo(HiloComentariosOptimizado);
