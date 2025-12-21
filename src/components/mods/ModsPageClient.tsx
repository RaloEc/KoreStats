"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ModsList } from "@/components/mods/ModsList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ModsPageClient({
  initialMods,
  searchParams,
}: {
  initialMods: any[];
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const [mods, setMods] = useState<any[]>(initialMods);
  // loading is false initially because we have data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Removed useEffect fetch logic as data is passed from server

  // Obtener categorías únicas para el filtro
  const categories = Array.from(
    new Set(
      mods?.flatMap(
        (mod: any) => mod.categorias?.map((c: any) => c.nombre) || []
      ) || []
    )
  )
    .filter((category): category is string => typeof category === "string")
    .sort();

  // Obtener versiones únicas de Minecraft para el filtro
  const minecraftVersions = Array.from(
    new Set(
      mods
        ?.flatMap((mod: any) => mod.game_versions || [mod.version_minecraft])
        .filter(Boolean) || []
    )
  )
    .filter((version): version is string => typeof version === "string")
    .sort()
    .reverse();

  // Filtrar mods según los parámetros de búsqueda
  const searchQuery = searchParams.q
    ? String(searchParams.q).toLowerCase()
    : "";
  const selectedCategory = searchParams.categoria
    ? String(searchParams.categoria)
    : "all_categories";
  const selectedVersion = searchParams.version
    ? String(searchParams.version)
    : "all_versions";

  const filteredMods =
    mods?.filter((mod: any) => {
      // Filtrar por término de búsqueda
      const matchesSearch =
        searchQuery === "" ||
        (mod.nombre || mod.name || "").toLowerCase().includes(searchQuery) ||
        (mod.descripcion || mod.summary || mod.description_html || "")
          .toLowerCase()
          .includes(searchQuery) ||
        (mod.autor || mod.author_name || "")
          .toLowerCase()
          .includes(searchQuery);

      // Filtrar por categoría
      const matchesCategory =
        selectedCategory === "all_categories" ||
        mod.categorias?.some((c: any) => c.nombre === selectedCategory);

      // Filtrar por versión
      const matchesVersion =
        selectedVersion === "all_versions" ||
        (mod.game_versions && mod.game_versions.includes(selectedVersion)) ||
        mod.version_minecraft === selectedVersion;

      return matchesSearch && matchesCategory && matchesVersion;
    }) || [];

  if (loading) {
    return (
      <div className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Cargando mods...
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg border p-4 animate-pulse">
              <div className="h-40 bg-muted rounded mb-4"></div>
              <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Error al cargar los mods
          </h1>
          <p className="text-destructive mt-4">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Mods de Minecraft</h1>
        <p className="text-muted-foreground mt-2">
          Descubre los mejores mods para mejorar tu experiencia de juego
        </p>
      </div>

      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <Input
              type="search"
              placeholder="Buscar mods..."
              defaultValue={searchQuery}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <Select name="version" defaultValue={selectedVersion}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas las versiones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_versions">
                  Todas las versiones
                </SelectItem>
                {minecraftVersions.map((version) => (
                  <SelectItem key={version} value={version}>
                    {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="categoria" defaultValue={selectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_categories">
                  Todas las categorías
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" className="hidden sm:inline-flex">
              Aplicar filtros
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full sm:hidden mt-2">
          Aplicar filtros
        </Button>
      </div>

      <Tabs defaultValue="todos" className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="populares">Más populares</TabsTrigger>
          <TabsTrigger value="recientes">Recientes</TabsTrigger>
        </TabsList>
        <TabsContent value="todos">
          <ModsList mods={filteredMods} />
        </TabsContent>
        <TabsContent value="populares">
          <ModsList
            mods={[...filteredMods].sort((a, b) => b.descargas - a.descargas)}
          />
        </TabsContent>
        <TabsContent value="recientes">
          <ModsList
            mods={[...filteredMods].sort(
              (a, b) =>
                new Date(b.fecha_creacion).getTime() -
                new Date(a.fecha_creacion).getTime()
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
