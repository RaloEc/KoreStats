"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { HighlightedContent } from "@/components/ui/HighlightedContent";
import { useRealtimeVotosHilos } from "@/hooks/useRealtimeVotosHilos";
import { useUserTheme } from "@/hooks/useUserTheme";
import { toast } from "sonner";
import { WeaponStatsCard } from "@/components/weapon/WeaponStatsCard";
import { ChevronUp } from "lucide-react";
import type { WeaponStats } from "@/types/weapon";

// Declarar el tipo para el objeto twttr de Twitter
declare global {
  interface Window {
    twttr: {
      widgets: {
        load: (element?: HTMLElement) => Promise<void>;
      };
    };
  }
}

// Hook personalizado para rastrear el valor anterior de una variable
function usePrevious(value: string | undefined) {
  const ref = useRef<string | undefined>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

// Componente para cargar tweets desde la API
const TwitterEmbedLoader = ({ url }: { url: string }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTweet = async () => {
      try {
        const response = await fetch(
          `/api/twitter/oembed?url=${encodeURIComponent(url)}`
        );
        if (!response.ok) throw new Error("Failed to fetch tweet");
        const data = await response.json();
        setHtml(data.html);
        setLoading(false);

        // Cargar el script de Twitter después de obtener el HTML
        setTimeout(() => {
          if (window.twttr && window.twttr.widgets && containerRef.current) {
            window.twttr.widgets.load(containerRef.current);
          }
        }, 100);
      } catch (err) {
        console.error("Error fetching tweet:", err);
        setError("No se pudo cargar el tweet");
        setLoading(false);
      }
    };

    fetchTweet();
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <span className="text-gray-600 dark:text-gray-400">
          Cargando tweet...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <span className="text-red-600 dark:text-red-400">{error}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="twitter-embed-content"
      dangerouslySetInnerHTML={{ __html: html || "" }}
    />
  );
};

// Cargar dinámicamente componentes que dependen del cliente
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

const DynamicHighlightedContent = dynamic<{
  html: string;
  className?: string;
}>(
  () =>
    import("@/components/ui/HighlightedContent").then(
      (mod) => mod.HighlightedContent
    ),
  {
    ssr: false,
    loading: () => <ContentSkeleton />,
  }
);

interface HiloContenidoProps {
  html: string;
  className?: string;
  weaponStatsRecord?: {
    id: string;
    weapon_name: string | null;
    stats: WeaponStats;
  } | null;
}

// Skeleton de carga mejorado
function ContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Título */}
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4"></div>

      {/* Párrafos */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
      </div>

      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-11/12"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
      </div>

      {/* Subtítulo */}
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3 mt-8"></div>

      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    </div>
  );
}

// Extraer el ID de video de YouTube de una URL
const getYoutubeVideoId = (url: string): string | null => {
  const regExp =
    /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

/**
 * Componente para renderizar contenido HTML con diseño minimalista optimizado
 */
export default function HiloContenido({
  html,
  className = "",
  weaponStatsRecord,
}: HiloContenidoProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { userColor } = useUserTheme();
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Obtener el tema actual (light o dark)
  const { resolvedTheme } = useTheme();

  // Rastrear el tema anterior para detectar cambios
  const previousTheme = usePrevious(resolvedTheme);

  // Activar sincronización en tiempo real de votos de hilos
  useRealtimeVotosHilos();

  // Procesar imágenes blob cuando se carga el contenido
  useEffect(() => {
    const currentContentRef = contentRef.current;
    if (!html || !currentContentRef || typeof document === "undefined") return;

    const processImages = async () => {
      try {
        const images =
          currentContentRef.querySelectorAll<HTMLImageElement>("img");
        console.log(
          `[HiloContenido] Encontradas ${images.length} imágenes para procesar`
        );

        for (const img of Array.from(images)) {
          const src = img.getAttribute("src");
          if (!src) continue;

          // Omitir imágenes que ya tienen URLs permanentes
          if (src.includes("supabase.co") || src.includes("/api/storage/")) {
            console.log(`[HiloContenido] Omitiendo imagen con URL permanente`);
            continue;
          }

          // Procesar imágenes blob
          if (src.startsWith("blob:")) {
            console.log(
              `[HiloContenido] Procesando imagen blob: ${src.substring(
                0,
                30
              )}...`
            );
            try {
              const response = await fetch(src);
              if (!response.ok)
                throw new Error(`Error al obtener blob: ${response.status}`);

              const blob = await response.blob();
              if (!blob || blob.size === 0) throw new Error("Blob vacío");

              // Determinar extensión
              const fileType = blob.type.split("/")[1] || "png";
              const fileName = `image_${Date.now()}.${fileType}`;
              const file = new File([blob], fileName, { type: blob.type });

              // Subir a Supabase
              console.log(
                `[HiloContenido] Subiendo imagen a Supabase (${file.size} bytes)`
              );
              const formData = new FormData();
              formData.append("file", file);

              const uploadResponse = await fetch("/api/admin/imagenes", {
                method: "POST",
                body: formData,
              });

              if (!uploadResponse.ok) {
                throw new Error(`Error al subir: ${uploadResponse.status}`);
              }

              const uploadData = await uploadResponse.json();
              if (!uploadData.success || !uploadData.url) {
                throw new Error("No se recibió URL después de subir");
              }

              // Actualizar src de la imagen
              console.log(`[HiloContenido] Imagen subida: ${uploadData.url}`);
              img.setAttribute("src", uploadData.url);
              img.setAttribute("data-processed", "true");
            } catch (error) {
              console.error(
                `[HiloContenido] Error procesando imagen blob:`,
                error
              );
              // Dejar la imagen como está si falla
            }
          }
        }
      } catch (error) {
        console.error("[HiloContenido] Error en processImages:", error);
      }
    };

    // Procesar imágenes después de que el contenido se renderice
    const timeoutId = setTimeout(processImages, 100);
    return () => clearTimeout(timeoutId);
  }, [html]);

  // Hidratar tweets en el lugar (sin extraerlos del flujo)
  useEffect(() => {
    // 1. Capturamos la referencia actual
    const currentContentRef = contentRef.current;
    if (!html || !currentContentRef || typeof document === "undefined") return;

    // Pequeño delay para asegurar que HighlightedContent ha renderizado el contenido
    const timeoutId = setTimeout(() => {
      // Ahora encontrar todos los tweets en su lugar
      const tweetNodes = currentContentRef.querySelectorAll<HTMLDivElement>(
        'div[data-type="twitter-embed"]'
      );

      if (tweetNodes.length === 0) {
        console.log("[HiloContenido] No hay tweets para hidratar");
        return;
      }

      const theme = resolvedTheme === "dark" ? "dark" : "light";
      const themeChanged = previousTheme && previousTheme !== resolvedTheme;

      console.log(
        `[HiloContenido] Hidratando ${tweetNodes.length} tweets en el lugar (tema: ${theme})`
      );

      // Procesar cada nodo de tweet DE FORMA NATIVA (Mutación del DOM)
      tweetNodes.forEach((node, index) => {
        const dataTwitterAttribute = node.getAttribute("data-twitter");
        if (!dataTwitterAttribute) {
          console.warn(
            `[HiloContenido] Tweet ${index} - No tiene atributo data-twitter`
          );
          return;
        }

        try {
          const data = JSON.parse(dataTwitterAttribute);
          if (!data.html) {
            console.warn(`[HiloContenido] Tweet ${index} - No tiene HTML`);
            return;
          }

          // Si el tema cambió, preparar la animación
          if (themeChanged) {
            const currentHeight = node.offsetHeight;
            console.log(
              `[HiloContenido] Tweet ${index} - Fijando altura a ${currentHeight}px`
            );
            node.style.minHeight = `${currentHeight}px`;
            node.style.transition = "opacity 0.3s ease-in-out";
            node.style.opacity = "0";
          }

          // Decodificar e inyectar el tema
          let decodedHtml = decodeURIComponent(escape(atob(data.html)));
          decodedHtml = decodedHtml.replace(
            '<blockquote class="twitter-tweet"',
            `<blockquote class="twitter-tweet" data-theme="${theme}"`
          );

          console.log(
            `[HiloContenido] Tweet ${index} - Inyectado data-theme="${theme}"`
          );

          // Inyectar el nuevo HTML (el <blockquote>)
          // Si el tema cambió, esto pasa mientras el nodo es invisible
          node.innerHTML = decodedHtml;
        } catch (e) {
          console.error(`[HiloContenido] Tweet ${index} - Error:`, e);
          node.innerHTML = "<p>Error al cargar el tweet.</p>";
        }
      });

      // Cargar el script de Twitter si no existe
      // El script de Twitter es seguro dejar cargado permanentemente
      // No intentamos eliminarlo en la limpieza para evitar conflictos con React
      let existingScript = document.querySelector(
        'script[src*="platform.twitter.com"]'
      );

      if (!existingScript) {
        console.log("[HiloContenido] Creando script de Twitter");
        const script = document.createElement("script");
        script.src = "https://platform.twitter.com/widgets.js";
        script.async = true;
        script.id = "twitter-wjs"; // ID estándar de Twitter
        document.head.appendChild(script);
        existingScript = script;
      }

      // Esperar a que el script esté disponible y llamar a load()
      const loadTwitterWidgets = () => {
        if (window.twttr && window.twttr.widgets) {
          console.log(
            `[HiloContenido] Hidratando ${tweetNodes.length} tweets con window.twttr.widgets.load()`
          );

          window.twttr.widgets
            .load(currentContentRef)
            .then(() => {
              console.log("[HiloContenido] Tweets hidratados exitosamente");

              // Si el tema cambió, revelar los tweets
              if (themeChanged) {
                tweetNodes.forEach((node) => {
                  node.style.opacity = "1";

                  // Liberar la altura después de que termine la animación
                  setTimeout(() => {
                    node.style.minHeight = "auto";
                  }, 300);
                });
              }
            })
            .catch((e) => {
              console.error("[HiloContenido] Error hidratando tweets:", e);
            });
        } else {
          // Reintentar si window.twttr aún no está disponible
          setTimeout(loadTwitterWidgets, 100);
        }
      };

      // Pequeño delay para asegurar que el script esté cargado
      setTimeout(loadTwitterWidgets, 100);
    }, 100);

    // NO usar función de limpieza que intente modificar el DOM
    // Esto causa conflictos con React durante la reconciliación
    // React maneja el desmontaje automáticamente con suppressHydrationWarning
    return () => clearTimeout(timeoutId);
  }, [html, resolvedTheme, previousTheme]);

  // Manejar scroll para mostrar botón "Volver arriba"
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Manejar clics en elementos copiables
  useEffect(() => {
    const handleClickToCopy = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const copyableElement = target.closest('[data-click-to-copy="true"]');

      if (copyableElement) {
        event.preventDefault();
        event.stopPropagation();

        const textToCopy = (copyableElement as HTMLElement).innerText;

        navigator.clipboard
          .writeText(textToCopy)
          .then(() => {
            toast.success("¡Texto copiado al portapapeles!", {
              duration: 2000,
            });
          })
          .catch((err) => {
            console.error("Error al copiar:", err);
            toast.error("No se pudo copiar el texto.");
          });
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener("click", handleClickToCopy);
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener("click", handleClickToCopy);
      }
    };
  }, []);

  // Procesar iframes de YouTube para hacerlos responsive
  useEffect(() => {
    const currentContentRef = contentRef.current;
    if (!html || !currentContentRef || typeof document === "undefined") return;

    const timeoutId = setTimeout(() => {
      // Encontrar todos los iframes de YouTube
      const youtubeIframes =
        currentContentRef.querySelectorAll<HTMLIFrameElement>(
          'iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"]'
        );

      console.log(
        `[HiloContenido] Encontrados ${youtubeIframes.length} iframes de YouTube`
      );

      youtubeIframes.forEach((iframe, index) => {
        // Eliminar atributos width y height para permitir CSS responsive
        if (iframe.hasAttribute("width")) {
          console.log(
            `[HiloContenido] Removiendo width="${iframe.getAttribute(
              "width"
            )}" del iframe ${index}`
          );
          iframe.removeAttribute("width");
        }
        if (iframe.hasAttribute("height")) {
          console.log(
            `[HiloContenido] Removiendo height="${iframe.getAttribute(
              "height"
            )}" del iframe ${index}`
          );
          iframe.removeAttribute("height");
        }

        // Asegurar que el iframe tenga los estilos correctos
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.style.position = "absolute";
        iframe.style.top = "0";
        iframe.style.left = "0";

        // Asegurar que el contenedor padre tenga los estilos correctos
        const wrapper = iframe.closest(
          ".youtube-embed-wrapper, [data-youtube-video]"
        );
        if (wrapper instanceof HTMLElement) {
          wrapper.style.width = "100%";
          wrapper.style.maxWidth = "640px";
          wrapper.style.margin = "1rem auto";
        }

        const innerContainer = iframe.parentElement;
        if (innerContainer) {
          innerContainer.style.position = "relative";
          innerContainer.style.width = "100%";
          innerContainer.style.aspectRatio = "16 / 9";
          innerContainer.style.height = "auto";
        }
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [html]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Estilos para embeds de Twitter */
            div[data-type="twitter-embed"] {
              overflow: hidden;
              border-radius: 12px;
              width: var(--twitter-embed-width, 100%);
              max-width: var(--twitter-embed-max-width, 600px);
              margin: var(--twitter-embed-margin, 1.5rem auto);
            }

            div[data-type="twitter-embed"] iframe {
              border: none !important;
              border-radius: 12px !important;
            }

            div[data-type="twitter-embed"] blockquote.twitter-tweet {
              border: none !important;
              border-radius: 12px !important;
              margin: 0 !important;
              width: 100% !important;
            }

            /* Remover bordes de Twitter en todos los niveles */
            div[data-type="twitter-embed"] * {
              border: none !important;
            }

            /* Asegurar que los iframes tengan bordes redondeados */
            div[data-type="twitter-embed"] iframe {
              display: block;
              width: 100%;
              border-radius: 12px !important;
            }

            /* Estilos para imágenes con caption - respetar alineación */
            figure[data-type="image-with-caption"] {
              display: block;
              width: fit-content;
              margin-top: 1.5rem;
              margin-bottom: 1.5rem;
            }

            figure[data-type="image-with-caption"][style*="text-align: left"] {
              text-align: left;
              margin-left: 0;
              margin-right: auto;
            }

            figure[data-type="image-with-caption"][style*="text-align: center"] {
              text-align: center;
              margin-left: auto;
              margin-right: auto;
            }

            figure[data-type="image-with-caption"][style*="text-align: right"] {
              text-align: right;
              margin-left: auto;
              margin-right: 0;
            }

            figure[data-type="image-with-caption"] img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
              display: inline-block;
            }

            figure[data-type="image-with-caption"] figcaption {
              margin-top: 0.5rem;
              font-size: 0.875rem;
              color: #666;
              text-align: center;
              font-style: italic;
            }
          `,
        }}
      />
      <div
        className={`relative ${className}`}
        ref={contentRef}
        suppressHydrationWarning
        style={
          {
            "--user-color": userColor,
            "--user-color-rgb": userColor
              ? userColor
                  .replace("#", "")
                  .match(/.{1,2}/g)
                  ?.map((x) => parseInt(x, 16))
                  .join(", ")
              : "59, 130, 246",
          } as React.CSSProperties
        }
      >
        <HighlightedContent
          html={html}
          className="foro-hilo-content text-base leading-relaxed space-y-4 text-gray-800 dark:text-gray-200 amoled:text-gray-100"
        />

        {/* Tarjeta de estadísticas del arma */}
        {weaponStatsRecord?.stats && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <WeaponStatsCard
              stats={weaponStatsRecord.stats}
              className="w-auto max-w-xs mx-auto "
            />
          </div>
        )}

        {/* Botón volver arriba */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-24 lg:bottom-8 right-8 z-50 bg-gray-900 dark:bg-gray-700 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            aria-label="Volver arriba"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
        )}
      </div>
    </>
  );
}
