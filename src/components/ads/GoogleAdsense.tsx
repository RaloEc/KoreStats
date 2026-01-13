"use client";

import { useEffect } from "react";
import Script from "next/script";

// Declarar el tipo para window.adsbygoogle
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface GoogleAdsenseProps {
  client: string;
  slot: string;
  format?: string;
  responsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function GoogleAdsense({
  client,
  slot,
  format = "auto",
  responsive = true,
  style = {},
  className = "",
}: GoogleAdsenseProps) {
  useEffect(() => {
    try {
      // Esperar a que el script de AdSense esté disponible
      // Reintentar cada 100ms hasta que esté listo (máx 5 segundos)
      let attempts = 0;
      const maxAttempts = 50;

      const tryPushAd = () => {
        if (window.adsbygoogle) {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (error) {
            console.warn("Error al hacer push del anuncio:", error);
          }
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(tryPushAd, 100);
        } else {
          console.warn("Script de AdSense no se cargó después de 5 segundos");
        }
      };

      tryPushAd();
    } catch (error) {
      console.error("Error al cargar el anuncio:", error);
    }
  }, []);

  return (
    <>
      <div className={`google-adsense ${className}`} style={style}>
        <ins
          className="adsbygoogle"
          style={{
            display: "block",
            ...style,
          }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
      </div>
    </>
  );
}

// Componente para cargar el script de AdSense en el layout principal
export function GoogleAdsenseScript({ clientId }: { clientId: string }) {
  return (
    <>
      {/* Preconnect para mejorar velocidad de conexión */}
      <link
        rel="preconnect"
        href="https://pagead2.googlesyndication.com"
        crossOrigin="anonymous"
      />
      {/* 
        CRÍTICO: Usar strategy="afterInteractive" para AdSense
        - Se carga después de que la página sea interactiva
        - Permite que los anuncios se procesen correctamente
        - Mejor que lazyOnload que es demasiado lento
      */}
      <Script
        id="google-adsense"
        async
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
        crossOrigin="anonymous"
        suppressHydrationWarning
      />
    </>
  );
}
