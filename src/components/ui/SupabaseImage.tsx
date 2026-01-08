"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { Skeleton } from "@nextui-org/react";

interface SupabaseImageProps extends Omit<ImageProps, "loader"> {
  // Props opcionales si queremos construir la URL internamente
  bucket?: string;
  path?: string;
  // Prop estándar de next/image
  src: string;
}

const projectId =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.split("https://")[1]?.split(".")[0];

/**
 * Componente optimizado para cargar imágenes de Supabase
 * Automatiza el uso del loader para reducir el consumo de ancho de banda y Egress
 */
export function SupabaseImage({
  bucket,
  path,
  alt,
  className,
  src: propSrc,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  ...props
}: SupabaseImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Determinar la fuente final
  let finalSrc = propSrc;

  // Si se dan bucket y path, construir la URL de Supabase
  if (bucket && path && projectId) {
    finalSrc = `https://${projectId}.supabase.co/storage/v1/object/public/${bucket}/${path}`;
  }

  // Si usamos fill, necesitamos un wrapper relativo
  if (props.fill) {
    return (
      <div className="relative w-full h-full">
        {isLoading && (
          <Skeleton className="absolute inset-0 z-10 w-full h-full" />
        )}
        <Image
          {...props}
          src={finalSrc}
          alt={alt || "Supabase Image"}
          sizes={sizes}
          onLoad={() => setIsLoading(false)}
          className={`${className} transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
        />
      </div>
    );
  }

  // Sin fill, el comportamiento normal
  return (
    <>
      {isLoading && <Skeleton className="w-full h-full" />}
      <Image
        {...props}
        src={finalSrc}
        alt={alt || "Supabase Image"}
        sizes={sizes}
        onLoad={() => setIsLoading(false)}
        className={`${className} transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      />
    </>
  );
}
