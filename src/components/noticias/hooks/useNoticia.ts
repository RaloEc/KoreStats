"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Noticia } from "@/types";
import { sanitizeHtml } from "@/lib/utils/sanitize";

// Función para procesar el contenido HTML y corregir URLs de imágenes
export function procesarContenido(contenido: string): string {
  if (!contenido) return "";

  // Sanear el contenido para evitar XSS
  let contenidoProcesado = sanitizeHtml(contenido);

  // Reemplazar atributos src que contengan blob: o data:

  // Reemplazar atributos src que contengan blob: o data:
  contenidoProcesado = contenidoProcesado.replace(
    /(<img[^>]*src=["'])(?:blob:|data:)[^"']+(["'][^>]*>)/gi,
    (match, prefix, suffix) => {
      // Reemplazar con una imagen de fallback
      return `${prefix}https://placehold.co/600x400/333333/FFFFFF?text=Imagen+no+disponible${suffix}`;
    }
  );

  // Añadir atributo loading="lazy" a todas las imágenes para mejorar rendimiento
  contenidoProcesado = contenidoProcesado.replace(
    /(<img[^>]*)>/gi,
    (match, prefix) => {
      if (match.includes("loading=")) {
        return match; // Ya tiene atributo loading
      }
      return `${prefix} loading="lazy">`;
    }
  );

  // Eliminar atributos crossOrigin incorrectos
  contenidoProcesado = contenidoProcesado.replace(
    /(<img[^>]*)crossOrigin=["'][^"']*["']([^>]*>)/gi,
    (match, prefix, suffix) => {
      return `${prefix}${suffix}`;
    }
  );

  return contenidoProcesado;
}

// Tipo para la respuesta de la API
interface NoticiaResponse {
  success: boolean;
  data: Noticia;
  error?: string;
}

// Hook personalizado para gestionar una noticia individual
export function useNoticia(id: string) {
  const queryClient = useQueryClient();

  // Función para obtener la noticia desde la API
  const fetchNoticia = async (): Promise<Noticia> => {
    // Construir URL absoluta para evitar problemas con Next.js
    let baseUrl;

    if (typeof window !== "undefined") {
      // En el navegador, usar la URL actual
      baseUrl = window.location.origin;
    } else {
      // En el servidor, usar variables de entorno o valores por defecto
      baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.NETLIFY_URL
          ? `https://${process.env.NETLIFY_URL}`
          : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000");
    }

    // Obtener la noticia desde nuestra API usando URL absoluta
    const response = await fetch(`${baseUrl}/api/noticias/${id}`, {
      cache: "no-store",
      next: { revalidate: 0 }, // No usar caché
    });

    if (!response.ok) {
      throw new Error(`Error en la respuesta: ${response.status}`);
    }

    const resultado: NoticiaResponse = await response.json();

    if (!resultado.success) {
      throw new Error(resultado.error || "Error al cargar la noticia");
    }

    return resultado.data;
  };

  // Consulta principal de la noticia
  const {
    data: noticia,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["noticia", id],
    queryFn: fetchNoticia,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
  });

  // Función para obtener noticias relacionadas por categoría
  const fetchNoticiasRelacionadas = async (): Promise<Noticia[]> => {
    if (!noticia?.categoria_id) {
      return [];
    }

    const response = await fetch(
      `/api/noticias?categoria=${noticia.categoria_id}&limit=4&exclude=${id}`
    );

    if (!response.ok) {
      throw new Error(
        `Error al obtener noticias relacionadas: ${response.status}`
      );
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  };

  // Consulta para noticias relacionadas
  const { data: noticiasRelacionadas = [], isLoading: isLoadingRelacionadas } =
    useQuery({
      queryKey: ["noticia", id, "relacionadas"],
      queryFn: fetchNoticiasRelacionadas,
      enabled: !!noticia?.categoria_id, // Solo ejecutar si tenemos la noticia principal
      staleTime: 10 * 60 * 1000, // 10 minutos
    });

  // Efecto para manejar la visibilidad de la página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Refrescar datos solo si han pasado 5 minutos desde la última actualización
        const lastUpdate = queryClient.getQueryState([
          "noticia",
          id,
        ])?.dataUpdatedAt;
        const now = Date.now();

        if (lastUpdate && now - lastUpdate > 5 * 60 * 1000) {
          // 5 minutos
          refetch();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id, queryClient, refetch]);

  return {
    noticia,
    noticiasRelacionadas,
    isLoading,
    isLoadingRelacionadas,
    isError,
    error,
    refetch,
    procesarContenido,
  };
}
