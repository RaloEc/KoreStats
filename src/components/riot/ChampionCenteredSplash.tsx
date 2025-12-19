"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface ChampionCenteredSplashProps {
  champion: string | number | null; // Acepta nombre o ID
  skinId?: number;
  className?: string;
  focalOffsetY?: string;
  desktopFocalOffsetY?: string;
}

/**
 * Componente reutilizable para mostrar el splash art centrado de un campeón
 * desde Community Dragon con optimización de imagen y manejo de errores
 */
export function ChampionCenteredSplash({
  champion,
  skinId = 0,
  className = "",
  focalOffsetY = "10%",
  desktopFocalOffsetY,
}: ChampionCenteredSplashProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [objectPositionY, setObjectPositionY] = useState(focalOffsetY);

  // Si no hay campeón, no intentamos cargar nada
  const safeChampion = champion ?? "Unknown";

  // Community Dragon acepta tanto ID como nombre en la URL
  const imageUrl = `https://cdn.communitydragon.org/latest/champion/${safeChampion}/splash-art/centered/skin/${skinId}`;

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  useEffect(() => {
    if (!desktopFocalOffsetY) {
      setObjectPositionY(focalOffsetY);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 768px)");

    const syncObjectPosition = (mq: MediaQueryList | MediaQueryListEvent) => {
      setObjectPositionY(
        mq.matches ? desktopFocalOffsetY ?? focalOffsetY : focalOffsetY
      );
    };

    syncObjectPosition(mediaQuery);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncObjectPosition);
      return () => mediaQuery.removeEventListener("change", syncObjectPosition);
    }

    mediaQuery.addListener(syncObjectPosition);
    return () => mediaQuery.removeListener(syncObjectPosition);
  }, [desktopFocalOffsetY, focalOffsetY]);

  const containerClass = [
    "relative w-full h-full min-h-[220px] overflow-hidden",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!champion) {
    return <div className={containerClass + " bg-slate-900"} />;
  }

  return (
    <div className={containerClass}>
      {/* Skeleton de carga */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 animate-pulse" />
      )}

      {/* Fallback de error */}
      {hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900" />
      )}

      {/* Imagen del campeón */}
      {!hasError && (
        <Image
          src={imageUrl}
          alt={`Champion ${champion} Splash Art`}
          fill
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: `center ${objectPositionY}` }}
          priority={false}
          onLoad={handleLoad}
          onError={handleError}
          unoptimized
        />
      )}
    </div>
  );
}
