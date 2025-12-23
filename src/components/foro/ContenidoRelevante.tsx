"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, ThumbsUp, HelpCircle } from "lucide-react";
import { useUserTheme } from "@/hooks/useUserTheme";

type Item = {
  id: string;
  slug: string | null;
  titulo: string;
  ultima_respuesta_at: string | null;
  respuestas: number;
  votos: number;
};

export default function ContenidoRelevante({
  categoriaSlugOrId,
}: {
  categoriaSlugOrId: string;
}) {
  const { userColor } = useUserTheme();
  const [data, setData] = useState<{
    masComentados: Item[];
    masVotados: Item[];
    sinResponder: Item[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/foro/hilos/relevantes?categoriaSlug=${encodeURIComponent(
            categoriaSlugOrId
          )}`
        );
        const json = await res.json();
        if (!cancel) setData(json);
      } catch {
        if (!cancel)
          setData({ masComentados: [], masVotados: [], sinResponder: [] });
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    run();
    return () => {
      cancel = true;
    };
  }, [categoriaSlugOrId]);

  // Directamente usamos 'masComentados' para simplificar
  const items = data?.masComentados || [];

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/50">
        <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-3">
          <span
            className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]"
            style={{ backgroundColor: userColor, color: userColor }}
          ></span>
          Contenido Relevante
        </h3>
      </div>

      {/* Content */}
      <div className="p-2 min-h-[100px]">
        {loading ? (
          <div className="space-y-3 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-opacity-10"
              style={{ backgroundColor: `${userColor}20` }}
            >
              <MessageSquare
                className="w-6 h-6 opacity-60"
                style={{ color: userColor }}
              />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Sin resultados
            </p>
            <p className="text-xs text-gray-500 mt-1">
              No hay hilos destacados por ahora.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {items.slice(0, 5).map((it, idx) => {
              const href = it.slug
                ? `/foro/hilos/${it.slug}`
                : `/foro/hilos/${it.id}`;
              return (
                <li key={it.id}>
                  <Link
                    href={href}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group relative overflow-hidden"
                  >
                    <span
                      className="flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:text-white transition-colors"
                      style={{
                        // @ts-ignore custom property
                        "--hover-bg": userColor,
                      }}
                    >
                      <span className="group-hover:hidden">{idx + 1}</span>
                      <span
                        className="absolute inset-0 hidden group-hover:flex items-center justify-center rounded transition-colors"
                        style={{ backgroundColor: userColor }}
                      >
                        {idx + 1}
                      </span>
                    </span>

                    <div className="flex-1 min-w-0 z-10">
                      <p className="text-sm font-medium leading-snug line-clamp-2 text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {it.titulo}
                      </p>

                      <div className="flex items-center gap-3 mt-1.5">
                        <span
                          className="flex items-center gap-1 text-[11px] text-gray-400"
                          style={{ color: userColor }}
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span className="font-bold">{it.respuestas}</span>
                        </span>

                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <ThumbsUp className="w-3 h-3" />
                          <span>{it.votos}</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer link style */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800/50 text-center">
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
          Más populares
        </span>
      </div>
    </div>
  );
}
