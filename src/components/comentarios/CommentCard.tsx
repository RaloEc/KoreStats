"use client";

import React, { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import UserAvatar from "@/components/UserAvatar";
import { CommentForm } from "./CommentForm";
import { useAuth } from "@/context/AuthContext";
import type { Comment } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Votacion } from "@/components/ui/Votacion";
import BotonReportarNoticia from "@/components/noticias/BotonReportarNoticia";
import BotonReportar from "@/components/foro/BotonReportar";
import dynamic from "next/dynamic";
import { RichTextRenderer } from "@/components/tiptap-editor/components/RichTextRenderer";

const MinimalEditor = dynamic(
  () => import("@/components/tiptap-editor/MinimalEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[60px] w-full bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
    ),
  },
);

interface CommentCardProps {
  comment: Comment;
  onReply: (
    commentId: string,
    text: string,
    repliedTo?: { id: string; author: string; text: string; color?: string },
    gifUrl?: string | null,
  ) => Promise<boolean> | boolean | void;
  onQuotedReplyClick: (commentId: string) => void;
  onEdit?: (commentId: string, newText: string) => void;
  onDelete?: (commentId: string) => void;
  isAuthor?: boolean;
  currentUser?: any;
  // Props específicas del foro
  canMarkSolution?: boolean;
  onMarkSolution?: (commentId: string) => void;
  // Contexto para determinar qué endpoint de reportes usar
  tipoContexto?: "noticia" | "foro";
}

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// Icono de editar
const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// Icono de eliminar
const DeleteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// Icono de check (solución)
const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// Icono de X (quitar solución)
const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

export const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  onReply,
  onQuotedReplyClick,
  onEdit,
  onDelete,
  isAuthor: propIsAuthor,
  currentUser,
  canMarkSolution = false,
  onMarkSolution,
  tipoContexto = "noticia",
}) => {
  const { user: authUser, profile: authProfile } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isQuoteExpanded, setIsQuoteExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReplies, setShowReplies] = useState(false); // Por defecto ocultas
  const [visibleRepliesCount, setVisibleRepliesCount] = useState(10);

  // Función para contar todas las respuestas recursivamente
  const countAllReplies = (replies: Comment[]): number => {
    if (!replies || replies.length === 0) return 0;

    let count = replies.length;
    replies.forEach((reply) => {
      if (reply.replies && reply.replies.length > 0) {
        count += countAllReplies(reply.replies);
      }
    });
    return count;
  };

  const totalRepliesCount = comment.replies
    ? countAllReplies(comment.replies)
    : 0;
  // Usar el usuario proporcionado por props o del contexto de autenticación
  const user = currentUser || authUser;

  // Obtener el color del perfil del usuario desde AuthContext
  const userColor = authProfile?.color || comment.authorColor || "#6B7280";

  // Debug: ver estructura del usuario (solo una vez)
  React.useEffect(() => {
    if (user && !comment.repliedTo) {
    }
  }, []);

  // Verificar si el usuario actual es el autor del comentario
  // Usar la prop isAuthor si se proporciona, de lo contrario calcularla
  const isAuthor =
    propIsAuthor !== undefined
      ? propIsAuthor
      : user && user.id === comment.authorId;

  // Log para debugging de autoría (solo en desarrollo y solo una vez por comentario)
  // Removido para evitar problemas de renderizado

  // Manejar el envío de una respuesta
  const handleReplySubmit = async (text: string, gifUrl?: string | null) => {
    const repliedTo = {
      id: comment.id,
      author: comment.author,
      text: comment.text,
      color: comment.authorColor,
    };

    // Esperar a que se complete la respuesta
    const result = onReply(comment.id, text, repliedTo, gifUrl);

    // Si devuelve una promesa, esperarla
    if (result instanceof Promise) {
      const success = await result;
      if (success) {
        setIsReplying(false);
      }
    } else {
      // Si no devuelve promesa, cerrar inmediatamente
      setIsReplying(false);
    }
  };

  // Manejar la edición de un comentario
  const handleEditSubmit = () => {
    if (onEdit && editText.trim() !== comment.text) {
      onEdit(comment.id, editText);
    }
    setIsEditing(false);
  };

  // Manejar la eliminación de un comentario
  const handleDelete = () => {
    if (onDelete) {
      onDelete(comment.id);
    }
    setShowDeleteConfirm(false);
  };

  const formattedDate = new Date(comment.timestamp).toLocaleDateString(
    "es-ES",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  // Detectar si es un comentario temporal (recién creado)
  const isOptimistic = comment.id.startsWith("temp-");

  return (
    <div
      className={`${
        comment.repliedTo
          ? `mb-2 ${
              comment.isSolution
                ? "border-l-2 border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 pl-3 rounded-lg py-2"
                : ""
            }`
          : `mb-8 py-4 rounded-lg ${
              comment.isSolution
                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-emerald-600 dark:border-emerald-500 pl-4"
                : ""
            }`
      } transition-all duration-300 ease-in-out ${
        isOptimistic ? "animate-fadeIn" : ""
      }`}
      id={`comment-${comment.id}`}
    >
      {/* Banner para soluciones anidadas - enlace al comentario padre */}
      {comment.isSolution && comment.parentCommentId && (
        <button
          onClick={() => {
            const parentElement = document.getElementById(
              `comment-${comment.parentCommentId}`,
            );
            if (parentElement) {
              parentElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              parentElement.classList.add("highlight");
              setTimeout(() => {
                parentElement.classList.remove("highlight");
              }, 1500);
            }
          }}
          className="mb-3 w-full px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 rounded-lg text-left hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors group"
        >
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <span className="font-medium group-hover:underline">
              Ver conversación completa
            </span>
          </div>
        </button>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <UserAvatar
            username={comment.author}
            avatarUrl={comment.avatarUrl}
            size="md"
            className="h-10 w-10"
            color={userColor}
          />
        </div>

        {/* Contenido del comentario */}
        <div className="flex-1 min-w-0">
          {/* Contenido del comentario */}
          <div className="w-full">
            {/* Nombre, fecha, badge de solución y botón marcar solución */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <p
                  id={`comment-author-${comment.id}`}
                  className="font-semibold text-sm text-gray-700 dark:text-gray-300"
                >
                  {comment.author}
                </p>
                {comment.isSolution && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white">
                    <CheckCircleIcon className="w-3 h-3" />
                    Solución
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formattedDate}
                </span>
                {/* Botón marcar/desmarcar como solución */}
                {canMarkSolution && onMarkSolution && (
                  <button
                    onClick={() => onMarkSolution(comment.id)}
                    className={`p-1.5 rounded-lg transition-colors focus:outline-none ${
                      comment.isSolution
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                    title={
                      comment.isSolution
                        ? "Quitar como solución"
                        : "Marcar como solución"
                    }
                    aria-label={
                      comment.isSolution
                        ? "Quitar como solución"
                        : "Marcar como solución"
                    }
                  >
                    {comment.isSolution ? (
                      <XCircleIcon className="w-4 h-4" />
                    ) : (
                      <CheckCircleIcon className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
            {/* Bloque de cita si es una respuesta - DESACTIVADO TEMPORALMENTE */}
            {/* {comment.repliedTo && (
              <div className="mb-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600">
                <button
                  onClick={() => onQuotedReplyClick(comment.repliedTo!.id)}
                  className="text-xs text-gray-600 dark:text-gray-400 focus:outline-none"
                >
                  <span className="font-medium" style={{ color: comment.repliedTo.color }}>
                    {comment.repliedTo.author}
                  </span>
                  {!comment.repliedTo.isDeleted && (
                    <span className="ml-1">
                      {comment.repliedTo.text.length > 50 
                        ? comment.repliedTo.text.substring(0, 50) + '...' 
                        : comment.repliedTo.text}
                    </span>
                  )}
                  {comment.repliedTo.isDeleted && (
                    <span className="ml-1 italic">Comentario eliminado</span>
                  )}
                </button>
              </div>
            )} */}

            {/* Texto del comentario */}
            {isEditing ? (
              <div className="mt-2">
                <MinimalEditor
                  value={editText}
                  onChange={setEditText}
                  className="min-h-[60px]"
                  restrictMentionsToFriends={
                    tipoContexto === "noticia" ? false : false
                  } // Asumimos false para ambos por ahora
                  currentUserId={authUser?.id}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleEditSubmit}
                    className="px-3 py-1 text-xs rounded-full bg-gray-600 dark:bg-gray-500 text-white hover:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(comment.text);
                    }}
                    className="px-3 py-1 text-xs rounded-full bg-gray-500 text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {comment.deleted ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    [Comentario eliminado]
                  </p>
                ) : (
                  <>
                    {comment.text && (
                      <div className="relative mb-2">
                        <RichTextRenderer
                          content={comment.text}
                          className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words prose prose-sm dark:prose-invert max-w-none [&>p]:mb-0"
                        />
                        <style jsx global>{`
                          .prose .lol-mention img {
                            margin: 0 !important;
                            display: inline-block !important;
                          }
                          .prose .lol-mention,
                          .prose .user-mention {
                            vertical-align: middle;
                            line-height: 1.1;
                          }
                        `}</style>
                        {comment.isEdited && (
                          <span className="inline-block ml-1 text-xs text-gray-500 dark:text-gray-400 italic align-top">
                            (editado)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Renderizar GIF si existe */}
                    {comment.gif_url && (
                      <div
                        className={`inline-block rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5 ${
                          comment.repliedTo
                            ? "mt-2 max-w-[130px] sm:max-w-[150px]"
                            : "mt-3 max-w-[160px] sm:max-w-[200px]"
                        }`}
                      >
                        <img
                          src={comment.gif_url}
                          alt="GIF compartido"
                          className={`w-full h-auto object-cover ${
                            comment.repliedTo ? "max-h-40" : "max-h-48"
                          }`}
                          loading="lazy"
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 px-2">
            {/* Botón responder y votación a la izquierda */}
            <div className="flex items-center gap-3 sm:gap-2">
              <button
                onClick={() => {
                  if (user) {
                    const wasReplying = isReplying;
                    setIsReplying(!wasReplying);

                    // Si se está activando el modo de respuesta, hacer scroll al formulario
                    if (!wasReplying) {
                      // Usar setTimeout para asegurar que el DOM se haya actualizado
                      setTimeout(() => {
                        const replyForm = document.getElementById(
                          `reply-form-${comment.id}`,
                        );
                        if (replyForm) {
                          replyForm.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                            inline: "nearest",
                          });
                        }
                      }, 100);
                    }
                  }
                }}
                disabled={!user}
                className={`text-xs sm:text-sm font-medium transition-opacity whitespace-nowrap ${
                  !user ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"
                }`}
                style={{
                  color: user ? userColor : "#9CA3AF",
                }}
                title={
                  !user
                    ? "Inicia sesión para responder"
                    : isReplying
                      ? "Cancelar"
                      : "Responder"
                }
              >
                {isReplying ? "Cancelar" : "Responder"}
              </button>

              {/* Divisor - solo visible en desktop */}
              <div className="hidden sm:block h-5 w-px bg-gray-300 dark:bg-gray-600" />

              {/* Sistema de votación */}
              <Votacion
                id={comment.id}
                tipo="comentario"
                votosIniciales={comment.votos_totales || 0}
                vertical={false}
                size="sm"
              />
            </div>

            {/* Botones editar, eliminar y reportar a la derecha */}
            <div className="flex items-center gap-4">
              {isAuthor && onEdit && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditText(comment.text);
                  }}
                  className="p-2 rounded-lg transition-colors focus:outline-none bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5 sm:gap-0 text-xs sm:text-sm"
                  title="Editar"
                  aria-label="Editar comentario"
                >
                  <EditIcon className="w-4 h-4" />
                  <span className="sr-only">Editar</span>
                </button>
              )}

              {isAuthor && onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-lg transition-colors focus:outline-none bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1.5 sm:gap-0 text-xs sm:text-sm"
                  title="Eliminar"
                  aria-label="Eliminar comentario"
                >
                  <DeleteIcon className="w-4 h-4" />
                  <span className="sr-only">Eliminar</span>
                </button>
              )}

              {/* Botón reportar para todos */}
              {tipoContexto === "foro" ? (
                <BotonReportar
                  tipo_contenido="comentario"
                  contenido_id={comment.id}
                  variant="ghost"
                  size="icon"
                />
              ) : (
                <BotonReportarNoticia
                  tipo_contenido="comentario"
                  contenido_id={comment.id}
                  variant="ghost"
                  size="icon"
                />
              )}
            </div>
          </div>

          {/* Confirmación de eliminación */}
          {showDeleteConfirm && (
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                ¿Eliminar este comentario?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 text-xs rounded-full bg-red-500 text-white"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 text-xs rounded-full bg-gray-500 text-white"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Formulario de respuesta con animación */}
          <AnimatePresence>
            {isReplying && (
              <motion.div
                id={`reply-form-${comment.id}`}
                className="mt-3"
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{
                  opacity: 1,
                  height: "auto",
                  y: 0,
                  transition: {
                    height: { duration: 0.3, ease: "easeOut" },
                    opacity: { duration: 0.25, delay: 0.05 },
                    y: { duration: 0.25, ease: "easeOut" },
                  },
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                  y: -10,
                  transition: {
                    height: { duration: 0.25, ease: "easeIn" },
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2, ease: "easeIn" },
                  },
                }}
              >
                <CommentForm
                  onSubmit={handleReplySubmit}
                  placeholder={`Respondiendo a ${comment.author}...`}
                  ctaText="Publicar"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Botón para ver respuestas con flecha de respuesta */}
      {totalRepliesCount > 0 && (
        <motion.div
          className="mt-3 ml-12"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{
                  rotate: showReplies ? 90 : 0,
                  scale: showReplies ? 1.1 : 1,
                }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </motion.svg>
              {showReplies ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  Ocultar {totalRepliesCount}{" "}
                  {totalRepliesCount === 1 ? "respuesta" : "respuestas"}
                </motion.span>
              ) : (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  Ver {totalRepliesCount}{" "}
                  {totalRepliesCount === 1 ? "respuesta" : "respuestas"}
                </motion.span>
              )}
            </span>
          </button>
        </motion.div>
      )}

      {/* Renderizar respuestas anidadas cuando estén expandidas */}
      <AnimatePresence>
        {showReplies && comment.replies && comment.replies.length > 0 && (
          <motion.div
            className="ml-12 mt-2"
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{
              opacity: 1,
              height: "auto",
              y: 0,
              transition: {
                height: { duration: 0.4, ease: "easeOut" },
                opacity: { duration: 0.3, delay: 0.1 },
                y: { duration: 0.3, ease: "easeOut" },
              },
            }}
            exit={{
              opacity: 0,
              height: 0,
              y: -20,
              transition: {
                height: { duration: 0.3, ease: "easeIn" },
                opacity: { duration: 0.2 },
                y: { duration: 0.2, ease: "easeIn" },
              },
            }}
          >
            {comment.replies.slice(0, visibleRepliesCount).map((reply) => {
              const flatReply = { ...reply, replies: [] };

              return (
                <React.Fragment key={reply.id}>
                  <CommentCard
                    comment={flatReply}
                    onReply={onReply}
                    onQuotedReplyClick={onQuotedReplyClick}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    currentUser={currentUser}
                    canMarkSolution={canMarkSolution}
                    onMarkSolution={onMarkSolution}
                  />
                  {/* Renderizar sub-respuestas al mismo nivel */}
                  {reply.replies &&
                    reply.replies.length > 0 &&
                    reply.replies.map((subReply) => (
                      <CommentCard
                        key={subReply.id}
                        comment={{ ...subReply, replies: [] }}
                        onReply={onReply}
                        onQuotedReplyClick={onQuotedReplyClick}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        currentUser={currentUser}
                        canMarkSolution={canMarkSolution}
                        onMarkSolution={onMarkSolution}
                      />
                    ))}
                </React.Fragment>
              );
            })}

            {/* Botón "Ver más" si hay más de 10 respuestas */}
            {comment.replies.length > visibleRepliesCount && (
              <button
                onClick={() => setVisibleRepliesCount((prev) => prev + 10)}
                className="text-sm font-medium mt-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                Ver más respuestas (
                {comment.replies.length - visibleRepliesCount} restantes)
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
