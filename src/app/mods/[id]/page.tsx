import { notFound } from "next/navigation";
import { createClient, getServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  ExternalLink,
  Github,
  Sword,
  FileText,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export async function generateStaticParams() {
  if (process.env.IS_MOBILE !== "true") {
    return [];
  }

  const supabase = getServiceClient();
  const { data: mods } = await supabase.from("mods").select("id");

  return (mods || []).map((mod) => ({
    id: mod.id,
  }));
}

export default async function ModDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  // Obtener los detalles del mod
  const { data: mod, error } = await supabase
    .from("mods")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !mod) {
    return notFound();
  }

  // Transformar los datos para mantener compatibilidad con el código existente
  const transformedMod = {
    ...mod,
    // Campos de compatibilidad
    nombre: mod.name,
    descripcion: mod.description_html || mod.summary || "",
    version: mod.game_versions?.[0] || "Desconocida",
    version_minecraft: mod.game_versions?.[0] || "Desconocida",
    autor: mod.author_name,
    autor_username: mod.author_name,
    descargas: mod.total_downloads || 0,
    imagen_url: mod.logo_url,
    fecha_creacion: mod.date_created_api,
    ultima_actualizacion: mod.date_modified_api,

    // Determinar enlace principal y tipo
    enlace_principal: mod.website_url,
    tipo_enlace_principal:
      mod.source === "curseforge"
        ? "curseforge"
        : mod.source === "modrinth"
        ? "modrinth"
        : mod.source === "github"
        ? "github"
        : undefined,

    // Enlaces específicos
    enlace_curseforge:
      mod.source === "curseforge" ? mod.website_url : undefined,
    enlace_modrinth: mod.source === "modrinth" ? mod.website_url : undefined,
    enlace_github: mod.source === "github" ? mod.website_url : undefined,

    // Categorías como objetos para compatibilidad
    categorias: mod.categories?.map((cat) => ({ id: cat, nombre: cat })) || [],
  };

  // Función para obtener el ícono según el tipo de enlace
  const getPlatformIcon = (type: string | undefined) => {
    switch (type) {
      case "curseforge":
        return <Sword className="h-4 w-4 mr-1" />;
      case "modrinth":
        return <FileText className="h-4 w-4 mr-1" />;
      case "github":
        return <Github className="h-4 w-4 mr-1" />;
      default:
        return <ExternalLink className="h-4 w-4 mr-1" />;
    }
  };

  // Función para obtener el nombre de la plataforma
  const getPlatformName = (type: string | undefined) => {
    switch (type) {
      case "curseforge":
        return "CurseForge";
      case "modrinth":
        return "Modrinth";
      case "github":
        return "GitHub";
      default:
        return "Visitar";
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/mods" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a la lista de mods
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <div className="aspect-square w-full relative rounded-lg overflow-hidden bg-muted mb-4">
              {transformedMod.imagen_url ? (
                <Image
                  src={transformedMod.imagen_url}
                  alt={transformedMod.nombre}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted-foreground/10">
                  <Sword className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold">{transformedMod.nombre}</h1>
                <p className="text-muted-foreground">
                  por {transformedMod.autor_username || transformedMod.autor}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-sm">
                  v{transformedMod.version}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  {transformedMod.version_minecraft}
                </Badge>
                {transformedMod.categorias?.map((categoria: any) => (
                  <Badge
                    key={categoria.id}
                    variant="outline"
                    className="text-sm"
                  >
                    {categoria.nombre}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Download className="h-4 w-4 mr-1" />
                  <span>
                    {transformedMod.descargas.toLocaleString()} descargas
                  </span>
                </div>
                <span>
                  Actualizado el{" "}
                  {new Date(
                    transformedMod.ultima_actualizacion
                  ).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="grid gap-2 mt-4">
                {/* Botón de descarga principal */}
                {transformedMod.enlace_principal && (
                  <Button asChild className="w-full">
                    <a
                      href={transformedMod.enlace_principal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center"
                    >
                      {getPlatformIcon(transformedMod.tipo_enlace_principal)}
                      {getPlatformName(transformedMod.tipo_enlace_principal)}
                    </a>
                  </Button>
                )}

                {transformedMod.enlace_curseforge &&
                  transformedMod.tipo_enlace_principal !== "curseforge" && (
                    <Button variant="outline" className="w-full" asChild>
                      <a
                        href={transformedMod.enlace_curseforge}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                      >
                        <Sword className="h-4 w-4 mr-2" />
                        Ver en CurseForge
                      </a>
                    </Button>
                  )}

                {transformedMod.enlace_modrinth &&
                  transformedMod.tipo_enlace_principal !== "modrinth" && (
                    <Button variant="outline" className="w-full" asChild>
                      <a
                        href={transformedMod.enlace_modrinth}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Ver en Modrinth
                      </a>
                    </Button>
                  )}

                {transformedMod.enlace_github &&
                  transformedMod.tipo_enlace_principal !== "github" && (
                    <Button variant="outline" className="w-full" asChild>
                      <a
                        href={transformedMod.enlace_github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                      >
                        <Github className="h-4 w-4 mr-2" />
                        Ver en GitHub
                      </a>
                    </Button>
                  )}

                {transformedMod.enlace_web_autor && (
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={transformedMod.enlace_web_autor}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Sitio web del autor
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Descripción</h2>
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: transformedMod.descripcion }}
            />
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Información del mod</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Versión
                </h3>
                <p>{transformedMod.version}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Versión de Minecraft
                </h3>
                <p>{transformedMod.version_minecraft}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Autor
                </h3>
                <p>{transformedMod.autor_username || transformedMod.autor}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Última actualización
                </h3>
                <p>
                  {new Date(
                    transformedMod.ultima_actualizacion
                  ).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Categorías
                </h3>
                <div className="flex flex-wrap gap-2">
                  {transformedMod.categorias?.map((categoria: any) => (
                    <Badge
                      key={categoria.id}
                      variant="secondary"
                      className="text-sm"
                    >
                      {categoria.nombre}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
