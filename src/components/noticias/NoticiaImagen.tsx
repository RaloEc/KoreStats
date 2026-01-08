"use client";

import React, { useState } from "react";
import Image from "next/image";
import { SupabaseImage } from "@/components/ui/SupabaseImage";

interface NoticiaImagenProps {
  src: string;
  alt: string;
  priority?: boolean;
}

const NoticiaImagen: React.FC<NoticiaImagenProps> = ({
  src,
  alt,
  priority = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Manejar error de carga de imagen
  const handleError = () => {
    console.error("Error al cargar la imagen de portada");
    setHasError(true);
    setIsLoading(false);
  };

  // Manejar carga completa de imagen
  const handleLoad = () => {
    setIsLoading(false);
  };

  // Si hay error, no mostrar nada
  if (hasError) {
    return null;
  }

  return (
    <div className="relative w-full md:w-3/4 lg:w-2/3 aspect-video mb-8 rounded-lg overflow-hidden mx-auto">
      {/* Placeholder de carga */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Imagen real */}
      <SupabaseImage
        src={src}
        alt={alt}
        fill
        className={`object-cover transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onError={handleError}
        onLoad={handleLoad}
        priority={priority}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 66vw"
      />
    </div>
  );
};

// Memoizar el componente para evitar re-renderizados innecesarios
export default React.memo(NoticiaImagen);
