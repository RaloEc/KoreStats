"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import "@/components/layout/mobile-navbar.css";

/**
 * Botón flotante móvil global (solo visible en < md)
 * Acciones iniciales:
 * - Crear noticia (ruta: /admin/noticias/crear)
 * - Crear hilo (ruta: /foro/crear)
 *
 * Ajusta las rutas si tu app usa otras.
 */
export default function FABMobile() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden pwa-hidden fixed z-50 bottom-5 right-5 select-none">
      {/* Backdrop para cerrar al tocar fuera */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/20 dark:bg-black/40"
          aria-hidden
        />
      )}

      {/* Contenedor acciones */}
      <div className="relative">
        <div
          className={cn(
            "absolute bottom-20 right-0 flex flex-col gap-3 transition-opacity",
            open
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          )}
        >
          <Link
            href="/admin/noticias/crear"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-full px-6 py-3 text-base font-semibold shadow-lg border bg-white text-gray-900 border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 amoled:bg-black amoled:text-zinc-100 amoled:border-zinc-800 amoled:hover:bg-zinc-900 hover:shadow-xl active:scale-[0.98] whitespace-nowrap"
          >
            {/*    */}
            <span>Crear noticia</span>
          </Link>

          <Link
            href="/foro/crear"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-full px-6 py-3 text-base font-semibold shadow-lg border bg-white text-gray-900 border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 amoled:bg-black amoled:text-zinc-100 amoled:border-zinc-800 amoled:hover:bg-zinc-900 hover:shadow-xl active:scale-[0.98] whitespace-nowrap"
          >
            {/* <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-sky-600 text-white text-lg">💬</span> */}
            <span>Crear hilo</span>
          </Link>
        </div>

        {/* Botón principal */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Acciones rápidas"
          className={cn(
            "h-16 w-16 rounded-full shadow-2xl border flex items-center justify-center",
            // Modo claro: botón oscuro
            "text-white bg-gradient-to-b from-zinc-800 to-zinc-900 border-zinc-700",
            // Modo AMOLED (usando clases dark): degradado oscuro
            "dark:text-zinc-100 dark:bg-gradient-to-b dark:from-zinc-800 dark:to-zinc-900 dark:border-zinc-800",
            // Modo AMOLED: botón clarito
            "amoled:text-zinc-900 amoled:bg-white amoled:border-gray-300 amoled:hover:bg-gray-50",
            // Sutilezas de interacción
            open
              ? "ring-4 ring-emerald-500/30 dark:ring-emerald-500/20 amoled:ring-emerald-500/15"
              : ""
          )}
        >
          <span
            className={cn(
              "text-3xl transition-transform",
              open ? "rotate-45" : "rotate-0"
            )}
          >
            +
          </span>
        </button>
      </div>
    </div>
  );
}
