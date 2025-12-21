"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Blocks, Palette, Sparkles } from "lucide-react";

// Componente para la tarjeta de recurso
function ResourceCard({ resource, type }: { resource: any; type: string }) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="h-40 bg-accent/50 flex items-center justify-center">
        <div className="text-4xl">
          {type === "mods" && <Blocks className="h-12 w-12 text-primary/60" />}
          {type === "texturas" && (
            <Palette className="h-12 w-12 text-primary/60" />
          )}
          {type === "shaders" && (
            <Sparkles className="h-12 w-12 text-primary/60" />
          )}
        </div>
      </div>
      <CardHeader>
        <CardTitle>{resource.nombre}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <span className="text-xs bg-accent/50 px-2 py-0.5 rounded-full">
            v{resource.version}
          </span>
          <span className="text-xs">Para MC {resource.compatibilidad}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{resource.descripcion}</p>
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Autor:</span>
            <p className="font-medium">{resource.autor}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Descargas:</span>
            <p className="font-medium">{resource.descargas}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/recursos/${type}/${resource.id}`}>Ver detalles</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Componente para estado vacío
function EmptyState({ setSearchTerm }: { setSearchTerm: (s: string) => void }) {
  return (
    <div className="text-center py-12 space-y-4">
      <p className="text-xl text-muted-foreground">
        No se encontraron recursos que coincidan con tu búsqueda
      </p>
      <Button variant="outline" onClick={() => setSearchTerm("")}>
        Mostrar todos los recursos
      </Button>
    </div>
  );
}

export default function RecursosList({ recursos }: { recursos: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("mods");

  // Filtrar recursos basados en búsqueda
  const filteredResources = recursos[activeTab].filter(
    (item: any) =>
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Barra de búsqueda */}
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar recursos..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabs de categorías */}
      <Tabs
        defaultValue="mods"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="flex justify-center mb-8">
          <TabsList>
            <TabsTrigger value="mods" className="flex items-center gap-2">
              <Blocks className="h-4 w-4" />
              <span>Mods</span>
            </TabsTrigger>
            <TabsTrigger value="texturas" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span>Texturas</span>
            </TabsTrigger>
            <TabsTrigger value="shaders" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Shaders</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="mods" className="mt-0">
          {filteredResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((mod: any) => (
                <ResourceCard key={mod.id} resource={mod} type="mods" />
              ))}
            </div>
          ) : (
            <EmptyState setSearchTerm={setSearchTerm} />
          )}
        </TabsContent>

        <TabsContent value="texturas" className="mt-0">
          {filteredResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((textura: any) => (
                <ResourceCard
                  key={textura.id}
                  resource={textura}
                  type="texturas"
                />
              ))}
            </div>
          ) : (
            <EmptyState setSearchTerm={setSearchTerm} />
          )}
        </TabsContent>

        <TabsContent value="shaders" className="mt-0">
          {filteredResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map((shader: any) => (
                <ResourceCard
                  key={shader.id}
                  resource={shader}
                  type="shaders"
                />
              ))}
            </div>
          ) : (
            <EmptyState setSearchTerm={setSearchTerm} />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
