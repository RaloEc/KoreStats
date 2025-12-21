"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUserTheme } from "@/hooks/useUserTheme";
import { QueryProvider } from "./QueryProvider";
import { NewsTicker } from "./NewsTicker";
import { NewsHeader } from "./NewsHeader";
import { FeaturedNews } from "./FeaturedNews";
import { NewsGrid } from "./NewsGrid";
import { NewsSidebar } from "./NewsSidebar";
import { NewsSkeleton } from "./NewsSkeleton";
import { useNoticias } from "./hooks/useNoticias";
import { useThemeDetection } from "./hooks/useThemeDetection";
import { Noticia, TabType } from "./types";

interface NoticiasDestacadasProps {
  className?: string;
  initialNoticias?: Noticia[];
  initialRecientes?: Noticia[];
}

function NoticiasDestacadasContent({
  className = "",
  initialNoticias,
  initialRecientes,
}: NoticiasDestacadasProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const { userColor } = useUserTheme();
  const isDarkMode = useThemeDetection();

  // Estado de la pestaña activa
  const [activeTab, setActiveTab] = useState<TabType>("destacadas");

  // Cargar noticias usando el hook personalizado
  const { noticias, ultimasNoticias, loading } = useNoticias(
    activeTab,
    initialNoticias,
    initialRecientes
  );

  // Manejador para el clic en el perfil del autor
  const handleProfileClick = useCallback(
    (e: React.MouseEvent, username: string) => {
      e.stopPropagation();
      e.preventDefault();
      router.push(`/perfil/${encodeURIComponent(username)}`);
    },
    [router]
  );

  // Estilos dinámicos basados en el color del usuario
  const primaryColor = userColor || "#3b82f6";

  // Función para ajustar el brillo del color según el modo
  const getAdjustedColor = (color: string, isDark: boolean) => {
    return isDark
      ? color.replace(/#(..)(..)(..)/, (_, r, g, b) => {
          const factor = 1.4;
          const r2 = Math.min(255, Math.round(parseInt(r, 16) * factor))
            .toString(16)
            .padStart(2, "0");
          const g2 = Math.min(255, Math.round(parseInt(g, 16) * factor))
            .toString(16)
            .padStart(2, "0");
          const b2 = Math.min(255, Math.round(parseInt(b, 16) * factor))
            .toString(16)
            .padStart(2, "0");
          return `#${r2}${g2}${b2}`;
        })
      : color;
  };

  const adjustedPrimaryColor = getAdjustedColor(primaryColor, isDarkMode);

  const hoverStyles = {
    "--tw-ring-color": adjustedPrimaryColor,
    "--tw-ring-opacity": isDarkMode ? "0.2" : "0.1",
    "--tw-ring-offset-color": adjustedPrimaryColor,
    "--tw-ring-offset-shadow":
      "var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)",
    "--tw-ring-shadow":
      "var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color)",
    "--tw-ring":
      "var(--tw-ring-offset-shadow), var(--tw-ring-shadow), 0 0 #0000",
    "--tw-ring-inset": "inset",
  } as React.CSSProperties;

  // Mostrar skeleton mientras carga
  if (loading && noticias?.length === 0) {
    return (
      <div className={className}>
        <NewsSkeleton />
      </div>
    );
  }

  // Mostrar mensaje si no hay noticias
  if (noticias.length === 0) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          No hay noticias disponibles
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Pronto tendremos nuevas noticias para ti
        </p>
      </div>
    );
  }

  // Extraer la noticia principal y secundarias
  const noticiaPrincipal = noticias[0];
  const noticiasSecundarias = noticias?.slice(1, 5) || [];

  return (
    <div className={className}>
      {/* Ticker de noticias */}
      <NewsTicker userColor={userColor} />

      {/* Contenido principal */}
      <div className="bg-white dark:bg-black overflow-hidden">
        {/* Encabezado con pestañas */}
        <NewsHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userColor={userColor}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 dark:bg-black">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Columna principal */}
            <div className="lg:w-2/3">
              {/* Noticia destacada */}
              <FeaturedNews
                noticia={noticiaPrincipal}
                isDarkMode={isDarkMode}
                userColor={userColor}
                profileColor={profile?.color || null}
                onProfileClick={handleProfileClick}
              />

              {/* Grid de noticias secundarias */}
              <NewsGrid
                noticias={noticiasSecundarias}
                isDarkMode={isDarkMode}
                userColor={userColor}
                profileColor={profile?.color || null}
                onProfileClick={handleProfileClick}
              />
            </div>

            {/* Barra lateral */}
            <NewsSidebar
              ultimasNoticias={ultimasNoticias}
              userColor={userColor}
              adjustedPrimaryColor={adjustedPrimaryColor}
              isDarkMode={isDarkMode}
              hoverStyles={hoverStyles}
            />
          </div>
        </div>
      </div>

      {/* Estilos para el efecto de marquesina */}
      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 30s linear infinite;
        }
        .group:hover .animate-marquee {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

// Componente principal que envuelve con QueryProvider
export default function NoticiasDestacadas(props: NoticiasDestacadasProps) {
  return (
    <QueryProvider>
      <NoticiasDestacadasContent {...props} />
    </QueryProvider>
  );
}
