"use client";

import AdRectangle from "@/components/ads/AdRectangle";

export default function HiloSidebar() {
  return (
    <aside className="lg:col-span-2 space-y-4 pb-24 lg:pb-0">
      {/* Módulo: Reglas rápidas */}
      <div className="bg-white dark:bg-black amoled:bg-black rounded-lg border border-gray-200 dark:border-gray-700 amoled:border-gray-800 p-3">
        <h3 className="font-semibold mb-1 text-sm">Reglas de la categoría</h3>
        <ul className="text-xs list-disc pl-4 text-gray-700 dark:text-gray-300 amoled:text-gray-200 space-y-0.5">
          <li>Respeta a los demás usuarios.</li>
          <li>Evita spam y contenido fuera de tema.</li>
          <li>Usa etiquetas descriptivas.</li>
          <li>Reporta contenido inapropiado.</li>
        </ul>
      </div>

      <AdRectangle />
    </aside>
  );
}
