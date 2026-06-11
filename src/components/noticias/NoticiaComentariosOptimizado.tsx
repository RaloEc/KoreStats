'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CommentForm } from '@/components/comentarios/CommentForm';
import { CommentCard } from '@/components/comentarios/CommentCard';
import { AuthModal } from '@/components/auth/AuthModal';
import { useNoticiaComentarios } from './hooks/useNoticiaComentarios';
import { useInView } from 'react-intersection-observer';
import { useRealtimeComments } from '@/hooks/useRealtimeComments';

interface NoticiaComentariosOptimizadoProps {
  noticiaId: string;
  pageSize?: number;
  order?: 'asc' | 'desc';
  juegoAsociado?: 'lol' | 'delta-force';
}

const NoticiaComentariosOptimizado: React.FC<NoticiaComentariosOptimizadoProps> = ({
  noticiaId,
  pageSize = 10,
  order = 'desc',
  juegoAsociado = 'lol'
}) => {
  // Estado para el modal de autenticación
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
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
    handleEditComment,
    handleDeleteComment
  } = useNoticiaComentarios(noticiaId, pageSize, order);

  // Activar actualizaciones en tiempo real
  useRealtimeComments('noticia', noticiaId);

  // Configurar el observador de intersección para carga infinita
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
    rootMargin: '200px 0px',
  });

  // Cargar más comentarios cuando el elemento sea visible
  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      loadMoreComentarios();
    }
  }, [inView, hasNextPage, isFetchingNextPage, loadMoreComentarios]);

  // Manejar el clic en una respuesta citada
  const handleQuotedReplyClick = (commentId: string) => {
    const element = document.getElementById(`comment-${commentId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight');
      setTimeout(() => {
        element.classList.remove('highlight');
      }, 1500);
    }
  };

  if (isLoading && comentarios.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
          <span className="text-gray-600 dark:text-gray-400">Cargando comentarios...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-4">
          {/* Mostrar errores */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Formulario principal para añadir comentarios */}
          <div className="mb-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              {total > 0 ? `Comentarios (${total})` : 'Escribe tu comentario'}
            </h3>
            
            {user ? (
              <CommentForm
                onSubmit={handleAddComment}
                placeholder="Escribe tu comentario..."
                ctaText="Comentar"
                isLoading={submitting}
                juegoAsociado={juegoAsociado}
              />
            ) : (
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  Debes iniciar sesión para comentar
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

          {/* Lista de comentarios */}
          <div className="space-y-4">
            {comentarios.length === 0 && !isLoading ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No hay comentarios aún. ¡Sé el primero en comentar!
              </p>
            ) : (
              comentarios.map(comment => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onReply={handleAddReply}
                  onQuotedReplyClick={handleQuotedReplyClick}
                  // onEdit deshabilitado - no se permite editar comentarios
                  onDelete={handleDeleteComment}
                  isAuthor={user && user.id === comment.authorId}
                  currentUser={user}
                  juegoAsociado={juegoAsociado}
                />
              ))
            )}
            
            {/* Elemento observador para carga infinita */}
            {hasNextPage && (
              <div 
                ref={ref} 
                className="text-center pt-4"
              >
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                    <span className="text-sm text-muted-foreground">Cargando más comentarios...</span>
                  </div>
                )}
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
    </div>
  );
};

export default React.memo(NoticiaComentariosOptimizado);
