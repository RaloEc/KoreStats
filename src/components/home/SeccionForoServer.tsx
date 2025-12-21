import Link from "next/link";
import { TrendingUp, Eye, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHilosForo } from "@/lib/foro/hilos-data";
import HiloItem, { HiloDTO } from "@/components/foro/HiloItem";

interface SeccionForoServerProps {
  className?: string;
}

// Convertir respuesta de datos a DTO compatible con UI
function mapToDTO(hilo: any): HiloDTO {
  return {
    id: hilo.id,
    titulo: hilo.titulo,
    created_at: hilo.created_at,
    vistas: hilo.vistas,
    respuestas_count: hilo.respuestas_conteo,
    destacado: false,
    contenido: hilo.contenido,
    excerpt: hilo.excerpt,
    media_metadata: hilo.media_metadata,
    subcategoria: hilo.foro_categorias
      ? {
          id: hilo.foro_categorias.slug,
          nombre: hilo.foro_categorias.nombre,
          slug: hilo.foro_categorias.slug,
          color: hilo.foro_categorias.color,
        }
      : null,
    autor: hilo.perfiles
      ? {
          id: hilo.perfiles.id || hilo.perfiles.username || "",
          username: hilo.perfiles.username,
          avatar_url: hilo.perfiles.avatar_url,
          public_id: hilo.perfiles.public_id ?? null,
          color: hilo.perfiles.color ?? undefined,
        }
      : null,
    votos: hilo.votos_conteo,
    weapon_stats_record: hilo.weapon_stats_record ?? null,
  };
}

export default async function SeccionForoServer({
  className = "",
}: SeccionForoServerProps) {
  // Fetch de datos en paralelo en el servidor
  const [votadosData, vistosData, sinRespuestasData, recientesData] =
    await Promise.all([
      getHilosForo({ tipo: "mas_votados", limit: 6 }),
      getHilosForo({ tipo: "mas_vistos", limit: 6 }),
      getHilosForo({ tipo: "sin_respuesta", limit: 6 }),
      getHilosForo({ tipo: "recientes", limit: 6 }),
    ]);

  const masVotados = votadosData.hilos.map(mapToDTO);
  const masVistos = vistosData.hilos.map(mapToDTO);
  const sinRespuestas = sinRespuestasData.hilos.map(mapToDTO);
  const recientes = recientesData.hilos.map(mapToDTO);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Foro de Discusión
        </h2>
        <Link href="/foro">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Ver todo el foro
          </Button>
        </Link>
      </div>

      <div className="space-y-12">
        {/* Sección Más Votados */}
        {masVotados.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Más Votados
              </h3>
            </div>
            <div className="space-y-4">
              {masVotados.map((hilo) => (
                <HiloItem key={hilo.id} hilo={hilo} />
              ))}
            </div>
          </div>
        )}

        {/* Sección Más Vistos */}
        {masVistos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Eye className="h-5 w-5 text-indigo-500" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Más Vistos
              </h3>
            </div>
            <div className="space-y-4">
              {masVistos.map((hilo) => (
                <HiloItem key={hilo.id} hilo={hilo} />
              ))}
            </div>
          </div>
        )}

        {/* Sección Sin Respuestas */}
        {sinRespuestas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Sin Respuesta
              </h3>
            </div>
            <div className="space-y-4">
              {sinRespuestas.map((hilo) => (
                <HiloItem key={hilo.id} hilo={hilo} />
              ))}
            </div>
          </div>
        )}

        {/* Sección Recientes */}
        {recientes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5 text-blue-500" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recientes
              </h3>
            </div>
            <div className="space-y-4">
              {recientes.map((hilo) => (
                <HiloItem key={hilo.id} hilo={hilo} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
