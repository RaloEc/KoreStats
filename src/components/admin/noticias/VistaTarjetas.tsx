import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Eye,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { NoticiaAdmin } from "@/components/noticias/hooks/useAdminNoticias";
import { ToggleEstado } from "./ToggleEstado";
import Image from "next/image";
import Link from "next/link";

interface VistaTarjetasProps {
  noticias: NoticiaAdmin[];
  seleccionadas: string[];
  onToggleSeleccion: (id: string) => void;
  onVerPrevia: (noticia: NoticiaAdmin) => void;
  onEliminar: (id: string) => void;
}

export const VistaTarjetas = React.memo(function VistaTarjetas({
  noticias,
  seleccionadas,
  onToggleSeleccion,
  onVerPrevia,
  onEliminar,
}: VistaTarjetasProps) {
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {noticias.map((noticia) => (
        <Card
          key={noticia.id}
          className="overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors"
        >
          <CardHeader className="p-0">
            <div className="relative">
              {noticia.imagen_url && (
                <div className="relative w-full h-48">
                  <Image
                    src={noticia.imagen_url}
                    alt={noticia.titulo}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="absolute top-2 left-2">
                <Checkbox
                  checked={seleccionadas.includes(noticia.id)}
                  onCheckedChange={() => onToggleSeleccion(noticia.id)}
                  className="bg-white"
                />
              </div>
              {noticia.destacada && (
                <Badge className="absolute top-2 right-2" variant="default">
                  Destacada
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4">
            <h3 className="font-semibold line-clamp-2 mb-2">
              {noticia.titulo}
            </h3>

            {noticia.categorias && noticia.categorias.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {noticia.categorias.slice(0, 2).map((cat) => (
                  <Badge
                    key={cat.categoria_id}
                    variant="outline"
                    style={{
                      borderColor: cat.categoria?.color,
                      color: cat.categoria?.color,
                    }}
                    className="text-xs"
                  >
                    {cat.categoria?.nombre}
                  </Badge>
                ))}
                {noticia.categorias.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{noticia.categorias.length - 2}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatearFecha(noticia.fecha_publicacion)}
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {noticia.vistas || 0}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ToggleEstado
                noticiaId={noticia.id}
                campo="es_activa"
                valorActual={noticia.es_activa !== false}
                etiqueta="Activa"
              />
              <ToggleEstado
                noticiaId={noticia.id}
                campo="destacada"
                valorActual={noticia.destacada}
                etiqueta="Destacada"
              />
            </div>
          </CardContent>

          <CardFooter className="p-4 pt-0 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onVerPrevia(noticia)}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Ver
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/admin/noticias/editar/${noticia.id}`}>
                    <Edit className="mr-2 h-4 w-4" /> Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/noticias/${noticia.slug}`} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" /> Ver en sitio
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onEliminar(noticia.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
});
