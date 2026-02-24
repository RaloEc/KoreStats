"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, ReactNode, useEffect } from "react";

/**
 * Configuración optimizada de TanStack Query para KoreStats
 *
 * Objetivo: Mantener datos en caché durante la navegación
 * para evitar pantallas blancas y spinners innecesarios
 *
 * Flujo ideal:
 * 1. Usuario en /perfil?tab=lol (datos en caché)
 * 2. Navega a /match/[id] (modal o página)
 * 3. Vuelve a /perfil (datos instantáneos del caché ✅)
 */
const queryClientOptions = {
  defaultOptions: {
    queries: {
      // ✅ 5 minutos: Datos se consideran "frescos" sin refetch automático
      staleTime: 5 * 60 * 1000,

      // ✅ 15 minutos: Garbage collection (aumentado para evitar recargas al navegar)
      gcTime: 15 * 60 * 1000,

      // ✅ false: No refetch cuando la ventana recupera foco
      refetchOnWindowFocus: false,

      // ✅ false: No refetch cuando se recupera la conexión
      refetchOnReconnect: false,

      // ✅ false: No refetch cuando un componente se monta si hay caché
      refetchOnMount: false,

      // ✅ true: Mostrar datos anteriores mientras se revalidan (si ocurre)
      keepPreviousData: true, // Nota: en v5 esto es placeholderData: keepPreviousData, pero dejaremos esto compatible

      // ✅ false: No refrescar datos en segundo plano automáticamente
      refetchInBackground: false,

      // ✅ 1 intento en caso de error
      retry: 1,

      // ✅ Delay exponencial limitado
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
};

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  // Crear una instancia de QueryClient para cada sesión de usuario
  // Esto evita compartir estado entre diferentes usuarios en SSR
  const [queryClient] = useState(() => new QueryClient(queryClientOptions));

  // Optimización: Pausar consultas cuando la página no está visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Pausar/Cancelar consultas activas para ahorrar recursos
        // Se añade .catch para evitar "Uncaught (in promise) CancelledError" en la consola
        queryClient.cancelQueries().catch(() => {
          /* Silent catch for intentional cancellations */
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
