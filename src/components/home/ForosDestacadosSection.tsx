"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  MessageSquare,
  Users,
  Eye,
  TrendingUp,
  Clock,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Votacion } from "@/components/ui/Votacion";
import HiloCard from "@/components/foro/HiloCard";
import { useRealtimeVotosHilos } from "@/hooks/useRealtimeVotosHilos";

interface HiloForo {
  id: string;
  titulo: string;
  contenido: string;
  fecha_creacion: string;
  created_at: string;
  ultimo_post_at?: string;
  vistas?: number;
  votos?: number;
  votos_conteo?: number;
  respuestas_count?: number;
  respuestas_conteo?: number;
  autor: {
    id?: string;
    username: string;
    avatar_url?: string;
    public_id?: string | null;
    color?: string | null;
  };
  categoria: {
    nombre: string;
    color?: string;
    slug: string;
  };
  weapon_stats_record?: {
    id: string;
    weapon_name: string | null;
    stats: any;
  } | null;
}

interface CategoriaForo {
  id: string;
  nombre: string;
  descripcion: string;
  slug: string;
  imagen_url?: string;
  color?: string;
  hilos_count?: number;
  posts_count?: number;
}

interface ForosDestacadosSectionProps {
  tipo:
    | "mas-votados"
    | "mas-vistos"
    | "sin-respuestas"
    | "recientes"
    | "categoria-aleatoria";
  titulo: string;
  icono?: React.ReactNode;
  className?: string;
}

export default function ForosDestacadosSection({
  tipo,
  titulo,
  icono,
  className = "",
}: ForosDestacadosSectionProps) {
  const [hilos, setHilos] = useState<HiloForo[]>([]);
  const [categorias, setCategorias] = useState<CategoriaForo[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState<string>("");

  // Activar sincronización en tiempo real de votos de hilos
  useRealtimeVotosHilos();

  useEffect(() => {
    const loadContent = async () => {
      try {
        const supabase = createClient();

        if (tipo === "categoria-aleatoria") {
          // Cargar categorías aleatorias
          const { data: categoriasData } = await supabase
            .from("foro_categorias")
            .select("*")
            .eq("es_activa", true)
            .order("orden")
            .limit(4);

          setCategorias(categoriasData || []);
        } else {
          // Cargar hilos según el tipo
          let query = supabase
            .from("foro_hilos")
            .select(
              `
              id,
              titulo,
              contenido,
              created_at,
              ultimo_post_at,
              vistas,
              votos_conteo:foro_votos_hilos(count),
              respuestas_conteo:foro_posts(count),
              autor:perfiles!autor_id(id, username, avatar_url, public_id, color),
              categoria:foro_categorias!categoria_id(nombre, color, slug),
              weapon_stats_record:weapon_stats_records!weapon_stats_id(id, weapon_name, stats)
            `
            )
            .is("deleted_at", null);

          switch (tipo) {
            case "mas-votados":
              query = query.order("votos_conteo", { ascending: false });
              break;
            case "mas-vistos":
              query = query.order("vistas", { ascending: false });
              break;
            case "sin-respuestas":
              query = query
                .eq("respuestas_conteo", 0)
                .order("created_at", { ascending: false });
              break;
            case "recientes":
              query = query.order("created_at", { ascending: false });
              break;
          }

          const { data } = await query.limit(4);

          // Transformar datos
          const hilosTransformados =
            data?.map((hilo) => {
              // Normalizar los conteos (convertir de objetos a números)
              const votos = Array.isArray(hilo.votos_conteo)
                ? hilo.votos_conteo[0]?.count ?? 0
                : (hilo.votos_conteo as any)?.count ?? 0;

              const respuestas = Array.isArray(hilo.respuestas_conteo)
                ? hilo.respuestas_conteo[0]?.count ?? 0
                : (hilo.respuestas_conteo as any)?.count ?? 0;

              // Normalizar weapon_stats_record
              let weaponStatsRecord = null;
              if (
                Array.isArray(hilo.weapon_stats_record) &&
                hilo.weapon_stats_record.length > 0
              ) {
                const record = hilo.weapon_stats_record[0] as any;
                let stats = record.stats;
                if (typeof stats === "string") {
                  try {
                    stats = JSON.parse(stats);
                  } catch (e) {
                    stats = null;
                  }
                }
                if (stats) {
                  weaponStatsRecord = {
                    id: record.id,
                    weapon_name: record.weapon_name,
                    stats,
                  };
                }
              } else if (
                hilo.weapon_stats_record &&
                !Array.isArray(hilo.weapon_stats_record)
              ) {
                let stats = (hilo.weapon_stats_record as any).stats;
                if (typeof stats === "string") {
                  try {
                    stats = JSON.parse(stats);
                  } catch (e) {
                    stats = null;
                  }
                }
                if (stats) {
                  weaponStatsRecord = hilo.weapon_stats_record as any;
                }
              }

              // Normalizar autor
              const autorNormalizado = Array.isArray(hilo.autor)
                ? hilo.autor[0]
                : hilo.autor;

              return {
                ...hilo,
                votos_conteo: votos,
                respuestas_conteo: respuestas,
                autor: autorNormalizado,
                categoria: Array.isArray(hilo.categoria)
                  ? hilo.categoria[0]
                  : hilo.categoria,
                weapon_stats_record: weaponStatsRecord,
                fecha_creacion: hilo.created_at, // Para compatibilidad con el código existente
              };
            }) || [];

          setHilos(hilosTransformados);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error al cargar contenido del foro:", error);
        setLoading(false);
      }
    };

    loadContent();
  }, [tipo]);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  if (loading) {
    return (
      <motion.section className={`space-y-6 ${className}`} variants={fadeInUp}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icono}
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {titulo}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-800 rounded-xl h-32"></div>
            </div>
          ))}
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className={`space-y-6 ${className}`}
      initial="initial"
      animate="animate"
      variants={fadeInUp}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icono}
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {titulo}
            {categoriaSeleccionada && (
              <span className="text-blue-600 dark:text-blue-400">
                {" "}
                - {categoriaSeleccionada}
              </span>
            )}
          </h2>
        </div>
        <Link href="/foro">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Ver más <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {tipo === "categoria-aleatoria" ? (
        // Mostrar categorías
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categorias.map((categoria) => (
            <motion.div
              key={categoria.id}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              <Link href={`/foro/categoria/${categoria.slug}`}>
                <Card className="h-full bg-white/80 backdrop-blur-sm border-gray-200 dark:bg-black/80 dark:border-gray-800 hover:shadow-lg transition-all duration-300 rounded-xl cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {categoria.imagen_url ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                          <Image
                            src={categoria.imagen_url}
                            alt={categoria.nombre}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: categoria.color + "20" }}
                        >
                          <MessageSquare
                            className="h-5 w-5"
                            style={{ color: categoria.color || "#3B82F6" }}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {categoria.nombre}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                          {categoria.descripcion}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {categoria.hilos_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {categoria.posts_count || 0}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        // Mostrar hilos
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hilos.map((hilo) => {
            return (
              <motion.div
                key={hilo.id}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
              >
                <HiloCard
                  id={hilo.id}
                  href={`/foro/hilos/${hilo.id}`}
                  titulo={hilo.titulo}
                  contenido={hilo.contenido}
                  categoriaNombre={hilo.categoria?.nombre}
                  categoriaColor={hilo.categoria?.color}
                  autorUsername={hilo.autor?.username || "Anónimo"}
                  autorAvatarUrl={hilo.autor?.avatar_url || null}
                  autorId={hilo.autor?.id || null}
                  autorPublicId={hilo.autor?.public_id || null}
                  autorColor={hilo.autor?.color || undefined}
                  createdAt={hilo.fecha_creacion}
                  vistas={hilo.vistas || 0}
                  respuestas={hilo.respuestas_conteo || 0}
                  votosIniciales={hilo.votos_conteo || 0}
                  showSinRespuestasAlert={tipo === "sin-respuestas"}
                  weaponStats={hilo.weapon_stats_record?.stats ?? null}
                />
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
