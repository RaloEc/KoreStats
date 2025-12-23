"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUserTheme } from "@/hooks/useUserTheme";
import { ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { HiloCarouselCard } from "./HiloCarouselCard";
import type { ForoHiloRelacionado } from "@/types/foro";
import HiloDivider from "./HiloDivider";

interface HilosRelacionadosInlineProps {
  categoriaId: string;
  categoriaNombre: string;
  hiloActualId: string;
  hilosRelacionadosIniciales?: ForoHiloRelacionado[];
}

export default function HilosRelacionadosInline({
  categoriaId,
  categoriaNombre,
  hiloActualId,
  hilosRelacionadosIniciales = [],
}: HilosRelacionadosInlineProps) {
  const { userColor } = useUserTheme();

  const { data: hilosRelacionados, isLoading } = useQuery({
    queryKey: ["hilos-relacionados", categoriaId, hiloActualId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("foro_hilos")
        .select(
          `
          id,
          slug,
          titulo,
          vistas,
          created_at,
          contenido,
          weapon_stats_id,
          autor:perfiles!foro_hilos_autor_id_fkey ( id, username, avatar_url ),
          weapon_stats_record:weapon_stats_records!weapon_stats_id ( id, weapon_name, stats, created_at, updated_at )
        `
        )
        .eq("categoria_id", categoriaId)
        .neq("id", hiloActualId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw new Error(error.message);

      // Obtener conteos de votos y respuestas
      const hilosConConteos = await Promise.all(
        (data || []).map(async (hilo: any) => {
          const [votosResult, respuestasResult] = await Promise.all([
            supabase.from("foro_votos").select("value").eq("hilo_id", hilo.id),
            supabase
              .from("foro_posts")
              .select("*", { count: "exact", head: true })
              .eq("hilo_id", hilo.id)
              .eq("deleted", false),
          ]);

          const votos = (votosResult.data || []).reduce(
            (sum: number, voto: any) => sum + (voto.value ?? 0),
            0
          );
          const respuestas = respuestasResult.count || 0;

          return {
            ...hilo,
            votos,
            respuestas,
          };
        })
      );

      return (hilosConConteos as ForoHiloRelacionado[]) || [];
    },
    initialData: hilosRelacionadosIniciales,
    staleTime: 1000 * 60 * 5,
  });

  if (!hilosRelacionados || hilosRelacionados.length === 0) {
    return (
      <>
        <div className="mt-8 border-t" style={{ borderColor: userColor }} />
        <section className="mt-6">
          <div className="bg-white dark:bg-black amoled:bg-black rounded-lg border border-gray-200 dark:border-gray-800 amoled:border-gray-900 p-4">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100 amoled:text-white">
              Más en {categoriaNombre}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 amoled:text-gray-500">
              No hay hilos relacionados.
            </p>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <HiloDivider label={`Más en ${categoriaNombre}`} />

      <section>
        <div className="bg-white dark:bg-black amoled:bg-black rounded-lg">
          {/* Header removed from here as it is now in the divider */}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div>
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {hilosRelacionados.map((hilo) => (
                    <CarouselItem
                      key={hilo.id}
                      className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
                    >
                      <HiloCarouselCard hilo={hilo} />
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {hilosRelacionados.length > 3 && (
                  <>
                    <CarouselPrevious className="hidden md:flex -left-12" />
                    <CarouselNext className="hidden md:flex -right-12" />
                  </>
                )}
              </Carousel>

              {/* Indicador de desplizamiento en móvil y tablet */}
              {hilosRelacionados.length > 1 && (
                <div className="flex lg:hidden items-center justify-center gap-2 mt-4 text-gray-500 dark:text-gray-400 amoled:text-gray-500 text-sm">
                  <span>Desliza</span>
                  <ChevronRight className="h-4 w-4 animate-bounce" />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
