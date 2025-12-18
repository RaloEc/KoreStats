"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@/components/icons/FontAwesomeIcon";
import { faDownload, faTimes } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar si ya está instalada
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Escuchar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Mostrar el prompt después de 30 segundos si el usuario no lo ha rechazado antes
      const hasRejected = localStorage.getItem("pwa-install-rejected");
      if (!hasRejected) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 30000); // 30 segundos
      }
    };

    // Escuchar cuando la app se instala
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem("pwa-install-rejected");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostrar el prompt de instalación
    await deferredPrompt.prompt();

    // Esperar a que el usuario responda
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("Usuario aceptó la instalación");
    } else {
      console.log("Usuario rechazó la instalación");
      localStorage.setItem("pwa-install-rejected", "true");
    }

    // Limpiar el prompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem("pwa-install-rejected", "true");
  };

  // No mostrar nada si ya está instalada o no hay prompt
  if (isInstalled || !showInstallPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-24 lg:bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="bg-white dark:bg-black text-foreground rounded-xl shadow-2xl p-5 border-2 border-primary/60 backdrop-blur-sm">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cerrar"
        >
          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
        </button>

        <div className="pr-6">
          <h3 className="font-bold text-lg mb-2">¡Lleva KoreStats contigo!</h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Accede instantáneamente desde tu pantalla de inicio, disfruta de
            carga ultra-rápida y consulta tus estadísticas incluso sin conexión.
          </p>

          <Button
            onClick={handleInstallClick}
            className="w-full gap-2"
            size="lg"
          >
            <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
            Instalar Ahora
          </Button>
        </div>
      </div>
    </div>
  );
}
