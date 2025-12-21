"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Servidor } from "@/types";
import ServidorCard from "@/components/servidores/ServidorCard";
import ConsultaServidorInline from "@/components/servidores/ConsultaServidorInline";

// Tipos de servidores para filtrar
const tiposServidores = [
  "Todos",
  "Supervivencia",
  "Creativo",
  "SkyBlock",
  "PvP",
  "Mods",
  "Factions",
];

interface ServidoresContainerProps {
  initialServidores: Servidor[];
}

export default function ServidoresContainer({
  initialServidores,
}: ServidoresContainerProps) {
  const supabase = createClient();
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [servidores, setServidores] = useState<Servidor[]>(initialServidores);
  const [cargando, setCargando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Función para cargar servidores desde Supabase (Refetch manual)
  const cargarServidores = async () => {
    try {
      setCargando(true);

      let query = supabase.from("servidores").select("*");

      const { data, error } = await query;

      if (error) {
        console.error("Error al cargar servidores:", error);
        return;
      }

      setServidores(data || []);
    } catch (error) {
      console.error("Error al cargar servidores:", error);
    } finally {
      setCargando(false);
    }
  };

  // Filtrar servidores por tipo y búsqueda
  const servidoresFiltrados = servidores.filter(
    (servidor) =>
      (filtroTipo === "Todos" || servidor.tipo === filtroTipo) &&
      (servidor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        servidor.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Sección para agregar servidor */}
      <div className="mb-8 bg-muted/30 dark:bg-amoled-gray/60 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              ¿Tienes un servidor de Minecraft?
            </h2>
            <p className="text-muted-foreground mt-1">
              Añade tu servidor a nuestra lista y llega a miles de jugadores
            </p>
          </div>
          <Button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="whitespace-nowrap"
          >
            {mostrarFormulario ? "Ocultar formulario" : "Agregar servidor"}
          </Button>
        </div>

        {mostrarFormulario && (
          <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <ConsultaServidorInline
              onServerAdded={() => {
                cargarServidores();
                setMostrarFormulario(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar servidores..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {tiposServidores.map((tipo) => (
            <Button
              key={tipo}
              variant={filtroTipo === tipo ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroTipo(tipo)}
              className={filtroTipo === tipo ? "" : "hover:bg-accent"}
            >
              {tipo}
            </Button>
          ))}
        </div>
      </div>

      {/* Botón para actualizar todos los servidores */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={cargarServidores}
          disabled={cargando}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${cargando ? "animate-spin" : ""}`}
          />
          Actualizar lista
        </Button>
      </div>

      {/* Lista de servidores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cargando ? (
          // Mostrar esqueletos de carga
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <div className="h-40 bg-muted animate-pulse" />
              <div className="p-6 space-y-4">
                <div className="h-6 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-12 bg-muted animate-pulse rounded" />
                  <div className="h-12 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-12 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))
        ) : servidoresFiltrados.length > 0 ? (
          servidoresFiltrados.map((servidor) => (
            <ServidorCard
              key={servidor.id}
              servidor={servidor}
              onRefresh={cargarServidores}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-xl text-muted-foreground mb-4">
              No se encontraron servidores con estos criterios
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setFiltroTipo("Todos");
                setBusqueda("");
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
