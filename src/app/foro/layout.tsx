import Script from "next/script";
import ForoSidebar from "@/components/foro/ForoSidebar";
import { getCategoriasJerarquicas } from "@/lib/foro/server-actions";

export const revalidate = 0;

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return site;
  const netlify = process.env.NETLIFY_URL;
  if (netlify) return `https://${netlify}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export default async function ForoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categorias = await getCategoriasJerarquicas();

  return (
    <div className="bg-white dark:bg-black amoled:bg-black min-h-screen">
      {/* Script para deshabilitar Google Cast */}
      <Script id="disable-google-cast" strategy="beforeInteractive">
        {`
          // Deshabilitar la API de Google Cast
          window.chrome = window.chrome || {};
          window.chrome.cast = window.chrome.cast || {};
          window.chrome.cast.isAvailable = false;

          // Evitar que se cargue el script de Google Cast
          Object.defineProperty(window, '__onGCastApiAvailable', {
            value: function() { return false; },
            writable: false,
            configurable: false
          });
        `}
      </Script>

      <div className="container mx-auto px-2 sm:px-3 lg:px-4 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row lg:gap-8">
          {/* Sidebar Global Persistente */}
          <div className="hidden lg:block lg:w-64 xl:w-72 shrink-0">
            <div className="sticky top-4">
              <ForoSidebar categorias={categorias} />
            </div>
          </div>

          {/* Contenido Principal */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
