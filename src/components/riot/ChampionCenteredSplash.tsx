"use client";

import { useEffect, useState, memo } from "react";
import Image from "next/image";

interface ChampionCenteredSplashProps {
  champion: string | number | null;
  skinId?: number;
  className?: string;
  focalOffsetY?: string;
  desktopFocalOffsetY?: string;
  priority?: boolean;
}

/**
 * Normaliza el nombre del campeón para Data Dragon
 */
function normalizeChampionName(champion: string | number | null): string {
  if (!champion) return "Unknown";

  const name = String(champion);

  // Mapa de nombres especiales
  const specialNames: Record<string, string> = {
    MonkeyKing: "MonkeyKing",
    Nunu: "Nunu",
    RenataGlasc: "Renata",
    BelVeth: "Belveth",
    KSante: "KSante",
    Fiddlesticks: "FiddleSticks",
    LeBlanc: "Leblanc",
  };

  if (specialNames[name]) {
    return specialNames[name];
  }

  return name.replace(/['\s]/g, "");
}

/**
 * Componente para mostrar el splash art de un campeón
 */
export const ChampionCenteredSplash = memo(function ChampionCenteredSplash({
  champion,
  skinId = 0,
  className = "",
  focalOffsetY = "10%",
  desktopFocalOffsetY,
  priority = false,
}: ChampionCenteredSplashProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [objectPositionY, setObjectPositionY] = useState(focalOffsetY);

  const normalizedChampion = normalizeChampionName(champion);

  // Usar Data Dragon que es más confiable
  const imageUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${normalizedChampion}_${skinId}.jpg`;

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
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
    return (
      <div className={containerClass + " bg-slate-900"}>
        {/* Patrón hexagonal */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Patrón hexagonal de fondo */}
      <div
        className="absolute inset-0 opacity-5 dark:opacity-10 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Skeleton de carga */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 animate-pulse z-10">
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10" />
        </div>
      )}

      {/* Fallback de error */}
      {hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 z-10">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-white/60 text-2xl sm:text-3xl font-black uppercase tracking-wider mb-2">
                {normalizedChampion}
              </div>
              <div className="text-white/30 text-xs uppercase tracking-widest">
                Splash Art No Disponible
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Imagen del campeón */}
      {!hasError && (
        <Image
          src={imageUrl}
          alt={`Champion ${champion} Splash Art`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover z-5"
          style={{ objectPosition: `center ${objectPositionY}` }}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          onLoad={handleLoad}
          onError={handleError}
          quality={85}
        />
      )}
    </div>
  );
});
