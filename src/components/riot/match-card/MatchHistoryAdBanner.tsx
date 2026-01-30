"use client";

import { useEffect, useRef, useState } from "react";

interface MatchHistoryAdBannerProps {
  className?: string;
}

/**
 * Banner de anuncio con el estilo visual de las tarjetas de partidas
 * para integrarse naturalmente en el historial de partidas.
 */
export function MatchHistoryAdBanner({
  className = "",
}: MatchHistoryAdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "";
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT || "";

  /* Detección de visibilidad para evitar carga en contenedores ocultos (width=0) */
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!adRef.current) return;

    // Si ya tiene ancho, es visible
    if (adRef.current.offsetWidth > 0) {
      setIsVisible(true);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setIsVisible(true);
          observer.disconnect();
        }
      }
    });

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    if (!clientId || !slotId) {
      setAdError(true);
      return;
    }

    // Evitar duplicados
    if (adRef.current && adRef.current.querySelector("ins.adsbygoogle")) {
      return;
    }

    try {
      const adElement = document.createElement("ins");
      adElement.className = "adsbygoogle";
      adElement.style.display = "block";
      adElement.style.width = "100%";
      adElement.style.height = "auto";
      adElement.style.minHeight = "90px";
      adElement.setAttribute("data-ad-client", clientId);
      adElement.setAttribute("data-ad-slot", slotId);
      adElement.setAttribute("data-ad-format", "fluid");
      adElement.setAttribute("data-full-width-responsive", "true");

      if (adRef.current) {
        adRef.current.appendChild(adElement);

        // Push el anuncio
        try {
          ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
            (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle ||
            []).push({});
          setAdLoaded(true);
        } catch (pushError) {
          console.warn("[MatchHistoryAdBanner] Error pushing ad:", pushError);
          setAdError(true);
        }
      }
    } catch (error) {
      console.warn("[MatchHistoryAdBanner] Error creating ad:", error);
      setAdError(true);
    }
  }, [isVisible, clientId, slotId]);

  // Si no hay configuración de AdSense, no mostrar nada
  if (!clientId || !slotId) {
    return null;
  }

  // Si hay error, renderizar contenedor vacío pero con altura para evitar saltos en el Virtualizer
  if (adError) {
    return (
      <div
        className={`hidden md:block min-h-[90px] ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`
        hidden md:block rounded-lg border-l-4 border-l-blue-500/50 
        bg-gradient-to-r from-blue-500/5 to-transparent
        p-3 transition-all
        ${className}
      `}
    >
      {/* Contenedor del anuncio con estilo de tarjeta */}
      <div className="flex items-center gap-3">
        {/* Indicador sutil de que es contenido patrocinado */}
        <div className="flex flex-col gap-1 text-[11px] w-[60px] flex-shrink-0">
          <span className="uppercase tracking-wide font-semibold text-blue-500/70">
            Anuncio
          </span>
        </div>

        {/* Contenedor del anuncio de Google */}
        <div
          ref={adRef}
          className="flex-1 min-h-[90px] flex items-center justify-center overflow-hidden"
        />
      </div>
    </div>
  );
}

/**
 * Versión móvil del banner de anuncio
 */
export function MobileMatchHistoryAdBanner({
  className = "",
}: MatchHistoryAdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [adError, setAdError] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "";
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT || "";

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!adRef.current) return;

    if (adRef.current.offsetWidth > 0) {
      setIsVisible(true);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setIsVisible(true);
          observer.disconnect();
        }
      }
    });

    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    if (!clientId || !slotId) {
      setAdError(true);
      return;
    }

    if (adRef.current && adRef.current.querySelector("ins.adsbygoogle")) {
      return;
    }

    try {
      const adElement = document.createElement("ins");
      adElement.className = "adsbygoogle";
      adElement.style.display = "block";
      adElement.style.width = "100%";
      adElement.style.height = "auto";
      adElement.style.minHeight = "100px";
      adElement.setAttribute("data-ad-client", clientId);
      adElement.setAttribute("data-ad-slot", slotId);
      adElement.setAttribute("data-ad-format", "fluid");
      adElement.setAttribute("data-full-width-responsive", "true");

      if (adRef.current) {
        adRef.current.appendChild(adElement);

        try {
          ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
            (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle ||
            []).push({});
        } catch (pushError) {
          console.warn(
            "[MobileMatchHistoryAdBanner] Error pushing ad:",
            pushError,
          );
          setAdError(true);
        }
      }
    } catch (error) {
      console.warn("[MobileMatchHistoryAdBanner] Error creating ad:", error);
      setAdError(true);
    }
  }, [isVisible, clientId, slotId]);

  if (!clientId || !slotId) {
    return null;
  }

  // Si hay error, mantener espacio para evitar re-cálculos infinitos del virtualizer
  if (adError) {
    return (
      <div
        className={`md:hidden w-full min-h-[100px] ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`
        md:hidden w-full rounded-xl p-4 border transition-all
        border-blue-200/50 dark:border-blue-500/30 
        bg-blue-50/50 dark:bg-blue-500/5
        ${className}
      `}
    >
      {/* Indicador sutil */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wide font-semibold text-blue-500/60">
          Anuncio
        </span>
      </div>

      {/* Contenedor del anuncio */}
      <div
        ref={adRef}
        className="min-h-[100px] flex items-center justify-center overflow-hidden"
      />
    </div>
  );
}
