import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Download, ArrowLeft } from "lucide-react";
import { Textura } from "@/types";
import { createClient } from "@/lib/supabase/server";

// Datos de ejemplo para las texturas (se usarán si no hay datos de la base de datos)
const texturasEjemplo: Textura[] = [
  {
    id: "1",
    nombre: "Faithful 32x",
    descripcion:
      "Una versión mejorada de las texturas vanilla con mayor resolución.",
    version_mc: "1.19",
    autor_id: "faithful-team",
    url_descarga: "https://example.com/faithful",
    url_imagen: "/images/recursos/faithful.jpg",
    resolucion: "32x",
    autor: null,
  },
  {
    id: "2",
    nombre: "Patrix",
    descripcion: "Pack de texturas realistas de alta resolución.",
    version_mc: "1.19.2",
    autor_id: "patrix-team",
    url_descarga: "https://example.com/patrix",
    url_imagen: "/images/recursos/patrix.jpg",
    resolucion: "128x",
    autor: null,
  },
  {
    id: "3",
    nombre: "Bare Bones",
    descripcion:
      "Texturas minimalistas inspiradas en el estilo de los trailers oficiales.",
    version_mc: "1.19",
    autor_id: "robotpants",
    url_descarga: "https://example.com/barebones",
    url_imagen: "/images/recursos/bare-bones.jpg",
    resolucion: "16x",
    autor: null,
  },
  {
    id: "4",
    nombre: "Sphax PureBDCraft",
    descripcion: "Pack de texturas con estilo de cómic y colores vibrantes.",
    version_mc: "1.19.2",
    autor_id: "sphax",
    url_descarga: "https://example.com/sphax",
    url_imagen: "/images/recursos/sphax.jpg",
    resolucion: "64x",
    autor: null,
  },
  {
    id: "5",
    nombre: "Jicklus",
    descripcion: "Pack de texturas medieval con un estilo rústico y detallado.",
    version_mc: "1.19",
    autor_id: "jicklus",
    url_descarga: "https://example.com/jicklus",
    url_imagen: "/images/recursos/jicklus.jpg",
    resolucion: "32x",
    autor: null,
  },
  {
    id: "6",
    nombre: "Dokucraft",
    descripcion: "Pack de texturas de fantasía con un estilo RPG detallado.",
    version_mc: "1.19.2",
    autor_id: "dokucraft-team",
    url_descarga: "https://example.com/dokucraft",
    url_imagen: "/images/recursos/dokucraft.jpg",
    resolucion: "64x",
    autor: null,
  },
];

// Categorías para filtrar
const categorias = [
  "Fiel al juego",
  "Realista",
  "Minimalista",
  "Caricatura",
  "Medieval",
  "Fantasía",
];

export default async function TexturasPage() {
  const supabase = await createClient();

  let texturas: Textura[] = [];

  try {
    // Intentar cargar texturas desde la base de datos
    const { data, error } = await supabase.from("texturas").select("*");

    if (error) {
      console.error("Error al cargar texturas:", error);
      texturas = texturasEjemplo;
    } else if (data && data.length > 0) {
      texturas = data;
    } else {
      texturas = texturasEjemplo;
    }
  } catch (error) {
    console.error("Error al cargar texturas:", error);
    texturas = texturasEjemplo;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/recursos" className="flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                <span>Volver</span>
              </Link>
            </Button>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Packs de Texturas
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl">
              Transforma el aspecto visual de tu mundo de Minecraft con estos
              packs de texturas
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {categorias.map((categoria) => (
              <Badge
                key={categoria}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
              >
                {categoria}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {texturas.map((textura) => (
              <Card
                key={textura.id}
                className="overflow-hidden transition-all hover:shadow-md"
              >
                <div className="h-40 bg-accent/50 flex items-center justify-center">
                  <Palette className="h-12 w-12 text-primary/60" />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{textura.nombre}</CardTitle>
                    <Badge>{textura.resolucion}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <span className="text-xs bg-accent/50 px-2 py-0.5 rounded-full">
                      v{textura.version_mc}
                    </span>
                    <span className="text-xs">Para Minecraft</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{textura.descripcion}</p>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Resolución:</span>
                      <p className="font-medium">{textura.resolucion}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Autor ID:</span>
                      <p className="font-medium">{textura.autor_id}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Versión MC:</span>
                      <p className="font-medium">{textura.version_mc}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <p className="font-medium">Textura</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Link
                      href={`/recursos/texturas/${textura.id}`}
                      className="flex items-center justify-center w-full"
                    >
                      Ver detalles
                    </Link>
                  </Button>
                  <Button className="flex-1" asChild>
                    <a
                      href={textura.url_descarga}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
