"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import HiloItem, { HiloDTO } from "./HiloItem";
import type { WeaponStats } from "@/types/weapon";

// Tipos
type Hilo = {
  id: string;
  titulo: string;
  contenido?: string | null;
  autor_id: string;
  created_at: string;
  ultimo_post_at: string;
  votos_conteo: number | null | { count?: number } | any[];
  respuestas_conteo: number | null | { count?: number } | any[];
  perfiles: {
    username: string;
    public_id?: string | null;
    rol: string;
    avatar_url: string | null;
    color?: string | null;
  } | null;
  foro_categorias: {
    nombre: string;
    color?: string | null;
  } | null;
  weapon_stats_record?: {
    id: string;
    weapon_name: string | null;
    stats: string | WeaponStats;
  } | null;
};

type TabKey = "destacados" | "recientes" | "sin_respuestas";

interface ForosBloqueDesktopProps {
  limit?: number;
}

export default function ForosBloqueDesktop({
  limit = 5,
}: ForosBloqueDesktopProps) {
  const [hilos, setHilos] = useState<Record<TabKey, Hilo[]>>({
    destacados: [],
    recientes: [],
    sin_respuestas: [],
  });
  const [loading, setLoading] = useState<Record<TabKey, boolean>>({
    destacados: true,
    recientes: true,
    sin_respuestas: true,
  });
  const [errors, setErrors] = useState<Record<TabKey, string | null>>({
    destacados: null,
    recientes: null,
    sin_respuestas: null,
  });

  // Formatear fecha relativa
  const formatearFecha = (fecha: string) => {
    try {
      return formatDistanceToNow(new Date(fecha), {
        addSuffix: true,
        locale: es,
      });
    } catch (e) {
      return "fecha desconocida";
    }
  };

  // Cargar hilos para todas las pestañas
  const cargarTodosLosHilos = async () => {
    const tabs: TabKey[] = ["destacados", "recientes", "sin_respuestas"];

    // Iniciar carga para todas las pestañas
    setLoading({
      destacados: true,
      recientes: true,
      sin_respuestas: true,
    });

    // Limpiar errores
    setErrors({
      destacados: null,
      recientes: null,
      sin_respuestas: null,
    });

    // Cargar cada pestaña con un timeout de seguridad
    try {
      // Crear promesas para todas las pestañas
      const promesas = tabs.map((tab) => {
        // Promesa con timeout para cada pestaña
        return Promise.race([
          cargarHilos(tab),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Tiempo de espera agotado al cargar ${tab}`));
            }, 8000); // 8 segundos de timeout
          }),
        ]);
      });

      // Ejecutar todas las promesas en paralelo
      await Promise.allSettled(promesas);
    } catch (error) {
      // Los errores individuales ya se manejan en cargarHilos
    }
  };

  // Cargar hilos para una pestaña específica
  const cargarHilos = async (tab: TabKey) => {
    // Si ya tenemos datos para esta pestaña y no estamos cargando, no hacer nada
    if (hilos[tab].length > 0 && !loading[tab]) {
      return;
    }

    setLoading((prev) => ({ ...prev, [tab]: true }));
    setErrors((prev) => ({ ...prev, [tab]: null }));

    try {
      // Usar la API con el nuevo formato
      const response = await fetch(
        `/api/foro/hilos?tipo=${tab}&limit=${limit}`,
      );

      if (!response.ok) {
        throw new Error(`Error al obtener hilos: ${response.statusText}`);
      }

      const apiData = await response.json();

      // El nuevo formato de la API devuelve { hilos: [...], hasNextPage: boolean, total: number }
      if (!apiData.hilos) {
        throw new Error("Respuesta inválida de la API");
      }

      // Transformar los datos de la API al formato esperado
      const hilosTransformados = apiData.hilos.map((hilo: any) => ({
        id: hilo.id,
        titulo: hilo.titulo,
        contenido: hilo.contenido,
        autor_id: hilo.autor_id,
        created_at: hilo.created_at,
        ultimo_post_at: hilo.ultimo_post_at,
        vistas: hilo.vistas,
        votos_conteo: hilo.votos_conteo,
        respuestas_conteo: hilo.respuestas_conteo,
        perfiles: hilo.autor
          ? {
              username: hilo.autor.username || "Anónimo",
              public_id: hilo.autor.public_id ?? null,
              rol: hilo.autor.role || "usuario",
              avatar_url: hilo.autor.avatar_url,
              color: hilo.autor.color ?? null,
            }
          : null,
        foro_categorias: hilo.categoria
          ? {
              nombre: hilo.categoria.nombre,
              color: hilo.categoria.color,
            }
          : null,
        weapon_stats_record: hilo.weapon_stats_record,
      }));

      // Para la pestaña sin_respuestas, filtramos en el cliente
      let hilosFiltrados = hilosTransformados;
      if (tab === "sin_respuestas") {
        hilosFiltrados = hilosTransformados
          .filter((hilo) => hilo.respuestas_conteo === 0)
          .slice(0, limit);
      }

      // Actualizar estado
      setHilos((prev) => ({ ...prev, [tab]: hilosFiltrados }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [tab]: `No se pudieron cargar los hilos de ${tab}`,
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const cargarDatos = async () => {
      try {
        // Establecer un timeout global para toda la carga
        const timeoutPromise = new Promise<void>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(
              new Error("Tiempo de espera global agotado al cargar los foros"),
            );
          }, 10000); // 10 segundos de timeout global
        });

        // Intentar cargar los datos con un tiempo límite global
        await Promise.race([cargarTodosLosHilos(), timeoutPromise]);

        // Limpiar el timeout ya que la carga se completó
        clearTimeout(timeoutId);
      } catch (err) {
        // Solo actualizar el estado si el componente sigue montado
        if (isMounted) {
          setErrors({
            destacados: "Error al cargar los foros",
            recientes: "Error al cargar los foros",
            sin_respuestas: "Error al cargar los foros",
          });
          setLoading({
            destacados: false,
            recientes: false,
            sin_respuestas: false,
          });
        }
      }
    };

    cargarDatos();

    // Limpiar al desmontar
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [limit]);

  // Convertir el tipo Hilo al tipo HiloDTO para usar con HiloItem
  const convertirAHiloDTO = (hilo: Hilo): HiloDTO => {
    // Extraer el valor numérico de votos_conteo
    let votos = 0;
    if (hilo.votos_conteo !== null) {
      if (
        Array.isArray(hilo.votos_conteo) &&
        hilo.votos_conteo.length > 0 &&
        hilo.votos_conteo[0]
      ) {
        votos = (hilo.votos_conteo[0] as any).count ?? 0;
      } else if (
        hilo.votos_conteo !== null &&
        typeof hilo.votos_conteo === "object" &&
        "count" in (hilo.votos_conteo as any)
      ) {
        votos = ((hilo.votos_conteo as any).count ?? 0) as number;
      } else if (typeof hilo.votos_conteo === "number") {
        votos = hilo.votos_conteo;
      }
    }

    // Extraer el valor numérico de respuestas_conteo
    let respuestas = 0;
    if (hilo.respuestas_conteo !== null) {
      if (
        Array.isArray(hilo.respuestas_conteo) &&
        hilo.respuestas_conteo.length > 0 &&
        hilo.respuestas_conteo[0]
      ) {
        respuestas = (hilo.respuestas_conteo[0] as any).count ?? 0;
      } else if (
        hilo.respuestas_conteo !== null &&
        typeof hilo.respuestas_conteo === "object" &&
        "count" in (hilo.respuestas_conteo as any)
      ) {
        respuestas = ((hilo.respuestas_conteo as any).count ?? 0) as number;
      } else if (typeof hilo.respuestas_conteo === "number") {
        respuestas = hilo.respuestas_conteo;
      }
    }

    // Normalizar weapon_stats_record (puede venir como array o como objeto)
    let record = hilo.weapon_stats_record ?? null;
    if (Array.isArray(record) && record.length > 0) {
      record = record[0];
    } else if (Array.isArray(record)) {
      record = null;
    }

    let parsedStats: WeaponStats | null = null;
    if (record?.stats) {
      if (typeof record.stats === "string") {
        try {
          parsedStats = JSON.parse(record.stats) as WeaponStats;
        } catch (error) {}
      } else {
        parsedStats = record.stats as WeaponStats;
      }
    }

    return {
      id: hilo.id,
      titulo: hilo.titulo,
      created_at: hilo.created_at,
      ultima_respuesta_at: hilo.ultimo_post_at,
      respuestas_count: respuestas,
      vistas: 0, // No tenemos este dato en el tipo Hilo
      votos: votos,
      subcategoria: hilo.foro_categorias
        ? {
            id: "", // No tenemos este dato en el tipo Hilo
            nombre: hilo.foro_categorias.nombre,
            slug: null,
            color: hilo.foro_categorias.color,
          }
        : null,
      autor: hilo.perfiles
        ? {
            id: hilo.autor_id,
            username: hilo.perfiles.username,
            avatar_url: hilo.perfiles.avatar_url,
            public_id: hilo.perfiles.public_id ?? null,
            color: hilo.perfiles.color ?? undefined,
          }
        : null,
      weapon_stats_record:
        record && parsedStats
          ? {
              id: record.id,
              weapon_name: record.weapon_name ?? null,
              stats: parsedStats,
            }
          : null,
    };
  };

  // Renderizar un hilo usando el componente HiloItem
  const renderHilo = (hilo: Hilo) => (
    <div key={hilo.id} className="mb-3">
      <HiloItem hilo={convertirAHiloDTO(hilo)} />
    </div>
  );

  // Renderizar contenido de una columna
  const renderColumnContent = (tab: TabKey, title: string) => {
    if (loading[tab]) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (errors[tab]) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <p>{errors[tab]}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => cargarHilos(tab)}
          >
            Intentar de nuevo
          </Button>
        </div>
      );
    }

    if (hilos[tab].length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <p>No hay hilos disponibles.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        {hilos[tab].map(renderHilo)}
      </div>
    );
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Foros</h2>
        <div className="flex gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/foro/crear-hilo">Crear nuevo hilo</Link>
          </Button>
          <Link
            href="/foro"
            className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Ver todos <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          {renderColumnContent("destacados", "Hilos Destacados")}
        </div>
        <div className="col-span-1">
          {renderColumnContent("recientes", "Hilos Recientes")}
        </div>
        <div className="col-span-1">
          {renderColumnContent("sin_respuestas", "Sin Respuestas")}
        </div>
      </div>
    </section>
  );
}
