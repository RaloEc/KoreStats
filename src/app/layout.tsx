import type { Metadata } from "next";
import type { Viewport } from "next";
import { Nunito, Inter } from "next/font/google";
import dynamic from "next/dynamic";
import "@/styles/critical.css"; // CSS crítico inyectado inline
import "./globals.css";
import "@/styles/code-highlight.css";
import Header from "@/components/Header";
import Providers from "@/components/Providers";
import { createClient } from "@/lib/supabase/server";
import { GoogleAdsenseScript } from "@/components/ads/GoogleAdsense";

const MobileNavbarWrapper = dynamic(
  () => import("@/components/layout/MobileNavbarWrapper"),
  { ssr: false }
);

// Lazy load PWAManager
const PWAManager = dynamic(() => import("@/components/pwa/PWAManager"), {
  ssr: false,
});

// Optimizar carga de fuentes con font-display: swap para evitar bloqueo de renderizado
// Solo cargar los weights necesarios para reducir tamaño de descarga
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700"],
  display: "swap", // Mostrar fallback mientras se carga la fuente
  preload: true,
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "KoreStats",
  description:
    "Estadísticas avanzadas y análisis para jugadores de videojuegos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KoreStats",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "KoreStats",
    title: "KoreStats",
    description:
      "Estadísticas avanzadas y análisis para jugadores de videojuegos",
    url: "https://korestats.com",
  },
  twitter: {
    card: "summary",
    title: "KoreStats",
    description:
      "Estadísticas avanzadas y análisis para jugadores de videojuegos",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Script para prevenir FOUC (Flash of Unstyled Content)
const ThemeScript = () => {
  // Script que se ejecuta antes de la hidratación para evitar parpadeo
  // Soporta: light, dark, y system (prefers-color-scheme)
  const themeScript = `
    (function() {
      try {
        const storageKey = 'korestats-theme';
        const savedTheme = localStorage.getItem(storageKey);
        
        // Función para aplicar el tema
        function applyTheme(theme) {
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.style.colorScheme = 'dark';
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.colorScheme = 'light';
          }
        }
        
        // Determinar el tema a aplicar
        if (savedTheme === 'light' || savedTheme === 'dark') {
          applyTheme(savedTheme);
        } else {
          // Si no hay tema guardado o es 'system', usar preferencia del sistema
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          applyTheme(prefersDark ? 'dark' : 'light');
        }
      } catch (e) {
        // Fallback: usar preferencia del sistema o dark por defecto
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      }
    })();
  `;

  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
};

// Script para manejar errores de carga de chunks
const ChunkErrorHandlerScript = () => {
  const chunkErrorScript = `
    (function() {
      let isReloading = false;
      let reloadAttempts = 0;
      const MAX_RELOAD_ATTEMPTS = 3;
      
      function isChunkLoadError(error) {
        if (!error) return false;
        const errorString = error.toString();
        const errorMessage = error.message || '';
        const errorName = error.name || '';
        return (
          errorName === 'ChunkLoadError' ||
          errorString.includes('Loading chunk') ||
          errorString.includes('ChunkLoadError') ||
          errorMessage.includes('Loading chunk') ||
          errorMessage.includes('ChunkLoadError')
        );
      }
      
      function isExternalScriptError(error) {
        if (!error) return false;
        const errorString = error.toString();
        const errorMessage = error.message || '';
        // Ignorar errores de scripts externos (YouTube, Google, etc.)
        return (
          errorMessage.includes('Cannot read properties of undefined') ||
          errorString.includes('getArgPos') ||
          errorString.includes('youtube') ||
          errorString.includes('google') ||
          errorString.includes('Extension context invalidated')
        );
      }
      
      function handleChunkLoadError(error) {
        // Ignorar errores de scripts externos
        if (isExternalScriptError(error)) {
          console.debug('Error de script externo ignorado:', error.message);
          return;
        }
        
        if (!isChunkLoadError(error) || isReloading) return;
        if (reloadAttempts >= MAX_RELOAD_ATTEMPTS) {
          console.error('Máximo de intentos de recarga alcanzado');
          return;
        }
        isReloading = true;
        reloadAttempts++;
        console.log('ChunkLoadError detectado. Recargando... (Intento ' + reloadAttempts + '/' + MAX_RELOAD_ATTEMPTS + ')');
        setTimeout(function() {
          window.location.reload();
        }, 1000);
      }
      
      window.addEventListener('error', function(event) {
        handleChunkLoadError(event.error);
      });
      
      window.addEventListener('unhandledrejection', function(event) {
        handleChunkLoadError(event.reason);
      });
      
      window.addEventListener('load', function() {
        setTimeout(function() {
          reloadAttempts = 0;
          isReloading = false;
        }, 5000);
      });
    })();
  `;

  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: chunkErrorScript }}
    />
  );
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ OPTIMIZADO: Solo obtener sesión (sin perfil)
  // El perfil se carga en el cliente con React Query
  // Esto evita doble carga y mantiene SSR rápido
  let session = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (error) {
    console.error("Error al obtener la sesión:", error);
  }

  const adsenseClientId =
    process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-4016510451040715";
  const adsenseEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className="h-screen w-screen overflow-hidden"
    >
      <head>
        <ThemeScript />
        <ChunkErrorHandlerScript />
        {adsenseEnabled && <GoogleAdsenseScript clientId={adsenseClientId} />}
        {adsenseClientId && (
          <meta name="google-adsense-account" content={adsenseClientId} />
        )}
      </head>
      <body
        className={`${nunito.variable} ${inter.variable} font-sans bg-background text-foreground h-screen w-screen overflow-hidden flex flex-col`}
      >
        <Providers session={session}>
          {/* Header: estático, no hace scroll */}
          <Header />

          {/* Main: único elemento que hace scroll */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 lg:pt-16 pb-24 lg:pb-0">
            <div className="container mx-auto px-0">{children}</div>
          </main>

          <MobileNavbarWrapper />
          <PWAManager />
        </Providers>
      </body>
    </html>
  );
}
