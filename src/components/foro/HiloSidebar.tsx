"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ForoHiloRelacionado, ForoCategoria } from "@/types/foro";

interface HiloSidebarProps {
  categoriaId: string;
  categoriaNombre: string;
  hiloActualId: string;
  hilosRelacionadosIniciales?: ForoHiloRelacionado[];
}

export default function HiloSidebar({
  categoriaId,
  categoriaNombre,
  hiloActualId,
  hilosRelacionadosIniciales = [],
}: HiloSidebarProps) {
  // Query para hilos relacionados con caché
  const { data: hilosRelacionados } = useQuery({
    queryKey: ["hilos-relacionados", categoriaId, hiloActualId],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("foro_hilos")
        .select("id, slug, titulo")
        .eq("categoria_id", categoriaId)
        .neq("id", hiloActualId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw new Error(error.message);

      return (data as ForoHiloRelacionado[]) || [];
    },
    initialData: hilosRelacionadosIniciales,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

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
    </aside>
  );
}
