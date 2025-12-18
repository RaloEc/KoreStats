"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@/components/icons/FontAwesomeIcon";
import { faSync, faTimes } from "@fortawesome/free-solid-svg-icons";

export default function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Función para verificar actualizaciones
    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.update();
        }
      } catch (error) {
        console.error("Error al verificar actualizaciones:", error);
      }
    };

    // Verificar actualizaciones cada 60 minutos
    const updateInterval = setInterval(checkForUpdates, 60 * 60 * 1000);

    // Escuchar cambios en el Service Worker
    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;

        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Hay una nueva versión disponible
              setWaitingWorker(newWorker);
              setShowUpdatePrompt(true);
            }
          });
        }
      });
    });

    // Escuchar mensajes del Service Worker
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // El Service Worker ha sido actualizado, recargar la página
      window.location.reload();
    });

    return () => {
      clearInterval(updateInterval);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Enviar mensaje al Service Worker para que se active
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      setShowUpdatePrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-24 lg:bottom-4 left-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-2xl p-4 border border-green-400">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
        </button>

        <div className="pr-6">
          <h3 className="font-bold text-lg mb-2">¡Nueva versión disponible!</h3>
          <p className="text-sm text-white/90 mb-4">
            Hay una actualización disponible. Actualiza para obtener las últimas
            mejoras.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="flex-1 bg-white text-green-600 font-semibold py-2 px-4 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faSync} className="w-4 h-4" />
              Actualizar
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-white/90 hover:text-white transition-colors"
            >
              Después
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
