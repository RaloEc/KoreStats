"use client";

import Link from "next/link";

export default function FloatingCreateButton({
  categoriaId,
}: {
  categoriaId: string;
}) {
  return (
    <>
      {/* Desktop button */}
      <div className="hidden md:block fixed bottom-6 right-6 z-30">
        <Link
          href={`/foro/crear-hilo?categoria=${encodeURIComponent(categoriaId)}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-colors"
        >
          Crear hilo
        </Link>
      </div>
      {/* Mobile FAB */}
      <div className="md:hidden fixed bottom-24 right-5 z-30">
        <Link
          href={`/foro/crear-hilo?categoria=${encodeURIComponent(categoriaId)}`}
          className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl text-2xl"
          aria-label="Crear nuevo hilo"
        >
          +
        </Link>
      </div>
    </>
  );
}
