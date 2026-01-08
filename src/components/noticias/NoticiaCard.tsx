"use client";

import React from "react";
import Image from "next/image";
import { SupabaseImage } from "@/components/ui/SupabaseImage";
import Link from "next/link";
import { CalendarIcon, ArrowRightIcon, Eye, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Noticia } from "@/types";
import { motion } from "framer-motion";

interface NoticiaCardProps {
  noticia: Noticia;
  mostrarResumen?: boolean;
  prioridad?: boolean;
  index?: number;
}

// Componente de tarjeta de noticia optimizado con React.memo
const NoticiaCard = React.forwardRef<HTMLDivElement, NoticiaCardProps>(
  ({ noticia, mostrarResumen = true, prioridad = false, index = 0 }, ref) => {
    // Función para renderizar la categoría principal
    const renderCategoria = () => {
      if (noticia.categorias && noticia.categorias.length > 0) {
        // Buscar categorías padres (sin parent_id)
        const categoriasPadre = noticia.categorias.filter((c) => !c.parent_id);

        // Si hay categorías padre, mostrar la primera
        if (categoriasPadre.length > 0) {
          const cat = categoriasPadre[0];
          return (
            <Badge
              key={cat.id}
              className="text-xs font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
              variant="outline"
            >
              {cat.icono && <span className="mr-1">{cat.icono}</span>}
              {cat.nombre}
            </Badge>
          );
        }
        // Si no hay categorías padre, buscar la primera subcategoría y su padre
        else {
          const primerSubcategoria = noticia.categorias[0];
          const categoriaPadre = primerSubcategoria.parent_id
            ? noticia.categorias.find(
                (c) => c.id === primerSubcategoria.parent_id
              )
            : null;

          if (categoriaPadre) {
            return (
              <Badge
                key={categoriaPadre.id}
                className="text-xs font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
                variant="outline"
              >
                {categoriaPadre.icono && (
                  <span className="mr-1">{categoriaPadre.icono}</span>
                )}
                {categoriaPadre.nombre}
              </Badge>
            );
          } else {
            return (
              <Badge
                key={primerSubcategoria.id}
                className="text-xs font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
                variant="outline"
              >
                {primerSubcategoria.icono && (
                  <span className="mr-1">{primerSubcategoria.icono}</span>
                )}
                {primerSubcategoria.nombre}
              </Badge>
            );
          }
        }
      } else if (noticia.categoria) {
        return (
          <Badge
            className="text-xs font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
            variant="outline"
          >
            {noticia.categoria.icono && (
              <span className="mr-1">{noticia.categoria.icono}</span>
            )}
            {noticia.categoria.nombre}
          </Badge>
        );
      }
      return null;
    };

    // Formatear fecha
    const formatearFecha = (fecha: string) => {
      const date = new Date(fecha);
      const ahora = new Date();
      const diffMs = ahora.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHoras = Math.floor(diffMs / 3600000);
      const diffDias = Math.floor(diffMs / 86400000);

      if (diffMins < 60) {
        return `Hace ${diffMins} min${diffMins !== 1 ? "s" : ""}`;
      } else if (diffHoras < 24) {
        return `Hace ${diffHoras} hora${diffHoras !== 1 ? "s" : ""}`;
      } else if (diffDias < 7) {
        return `Hace ${diffDias} día${diffDias !== 1 ? "s" : ""}`;
      } else {
        return date.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
        layout
      >
        <Card className="group overflow-hidden border border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg bg-card dark:bg-card h-full flex flex-col">
          <Link
            href={`/noticias/${noticia.id}`}
            className="flex flex-1 flex-col"
          >
            {/* Imagen de portada */}
            <div className="relative w-full aspect-video overflow-hidden bg-muted">
              {noticia.imagen_url || noticia.imagen_portada ? (
                <SupabaseImage
                  src={
                    noticia.imagen_url ||
                    noticia.imagen_portada ||
                    "/placeholder.jpg"
                  }
                  alt={noticia.titulo}
                  fill
                  priority={prioridad}
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <span className="text-primary-foreground text-lg font-medium">
                    KoreStats
                  </span>
                </div>
              )}

              {/* Badge de categoría sobre la imagen */}
              <div className="absolute top-3 left-3 z-10">
                {renderCategoria()}
              </div>
            </div>

            {/* Contenido de la tarjeta */}
            <CardContent className="p-4 flex-1 flex flex-col">
              {/* Título */}
              <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {noticia.titulo}
              </h3>

              {/* Resumen */}
              {mostrarResumen && (
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-1">
                  {noticia.resumen ||
                    (noticia.contenido
                      ? noticia.contenido
                          .replace(/<[^>]*>/g, "")
                          .substring(0, 150) + "..."
                      : "")}
                </p>
              )}

              {/* Footer con información del autor y estadísticas */}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                {/* Autor */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {noticia.autor?.avatar_url && (
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage
                        src={noticia.autor.avatar_url}
                        alt={
                          noticia.autor.username ||
                          noticia.autor_nombre ||
                          "Autor"
                        }
                      />
                      <AvatarFallback className="text-xs">
                        {(noticia.autor.username ||
                          noticia.autor_nombre ||
                          "A")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className="text-xs font-medium truncate hover:underline"
                      style={{
                        color:
                          noticia.autor?.color ||
                          noticia.autor_color ||
                          "inherit",
                      }}
                    >
                      {noticia.autor?.username ||
                        noticia.autor_nombre ||
                        "Anónimo"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatearFecha(
                        noticia.fecha_publicacion || noticia.created_at
                      )}
                    </span>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                  {noticia.vistas !== undefined && (
                    <div className="flex items-center gap-1" title="Vistas">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{noticia.vistas}</span>
                    </div>
                  )}
                  {noticia.comentarios_count !== undefined && (
                    <div
                      className="flex items-center gap-1"
                      title="Comentarios"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{noticia.comentarios_count}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </motion.div>
    );
  }
);

// Función de comparación personalizada para React.memo
const areEqual = (prevProps: NoticiaCardProps, nextProps: NoticiaCardProps) => {
  // Comparar solo los campos relevantes para evitar re-renderizados innecesarios
  return (
    prevProps.noticia.id === nextProps.noticia.id &&
    prevProps.noticia.titulo === nextProps.noticia.titulo &&
    prevProps.noticia.resumen === nextProps.noticia.resumen &&
    prevProps.noticia.imagen_url === nextProps.noticia.imagen_url &&
    prevProps.noticia.imagen_portada === nextProps.noticia.imagen_portada &&
    prevProps.noticia.fecha_publicacion ===
      nextProps.noticia.fecha_publicacion &&
    prevProps.noticia.vistas === nextProps.noticia.vistas &&
    prevProps.noticia.comentarios_count ===
      nextProps.noticia.comentarios_count &&
    prevProps.mostrarResumen === nextProps.mostrarResumen &&
    prevProps.prioridad === nextProps.prioridad &&
    JSON.stringify(prevProps.noticia.categorias) ===
      JSON.stringify(nextProps.noticia.categorias)
  );
};

// Configurar displayName para mejor depuración
NoticiaCard.displayName = "NoticiaCard";

// Exportar el componente memoizado
export default React.memo(NoticiaCard, areEqual);
