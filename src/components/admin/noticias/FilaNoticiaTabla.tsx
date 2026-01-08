import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Edit,
  Eye,
  MoreHorizontal,
  Trash2,
  FileText,
} from "lucide-react";
import { NoticiaAdmin } from "@/components/noticias/hooks/useAdminNoticias";
import { ToggleEstado } from "./ToggleEstado";
import Link from "next/link";

interface FilaNoticiaTablaProps {
  noticia: NoticiaAdmin;
  seleccionada: boolean;
  onToggleSeleccion: (id: string) => void;
  onVerPrevia: (noticia: NoticiaAdmin) => void;
  onVerBorrador?: (noticia: NoticiaAdmin) => void;
  onEliminar: (id: string) => void;
}

export const FilaNoticiaTabla = React.memo(
  function FilaNoticiaTabla({
    noticia,
    seleccionada,
    onToggleSeleccion,
    onVerPrevia,
    onVerBorrador,
    onEliminar,
  }: FilaNoticiaTablaProps) {
    const formatearFecha = (fecha: string) => {
      return new Date(fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    };

    return (
      <TableRow className="hover:bg-zinc-100 dark:hover:bg-zinc-900/50">
        <TableCell>
          <Checkbox
            checked={seleccionada}
            onCheckedChange={() => onToggleSeleccion(noticia.id)}
          />
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex flex-col">
            <span className="truncate max-w-[300px]">{noticia.titulo}</span>
            {noticia.destacada && (
              <Badge variant="secondary" className="w-fit mt-1">
                Destacada
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          {noticia.categorias && noticia.categorias.length > 0 ? (
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{
                  backgroundColor:
                    noticia.categorias[0].categoria?.color || "#3b82f6",
                }}
              />
              <span>
                {noticia.categorias[0].categoria?.nombre || "Sin nombre"}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Sin categoría</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            {formatearFecha(noticia.fecha_publicacion)}
          </div>
        </TableCell>
        <TableCell>{noticia.vistas || 0}</TableCell>
        <TableCell>
          <div className="flex flex-col gap-2">
            <ToggleEstado
              noticiaId={noticia.id}
              campo="es_activa"
              valorActual={noticia.es_activa !== false}
            />
            <ToggleEstado
              noticiaId={noticia.id}
              campo="destacada"
              valorActual={noticia.destacada}
            />
          </div>
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {noticia.estado === "borrador" && onVerBorrador && (
                <>
                  <DropdownMenuItem onClick={() => onVerBorrador(noticia)}>
                    <FileText className="mr-2 h-4 w-4" /> Ver borrador
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => onVerPrevia(noticia)}>
                <Eye className="mr-2 h-4 w-4" /> Vista previa
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/noticias/editar/${noticia.id}`}>
                  <Edit className="mr-2 h-4 w-4" /> Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/noticias/${noticia.slug}`} target="_blank">
                  <Eye className="mr-2 h-4 w-4" /> Ver en sitio
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
        </TableCell>
      </TableRow>
    );
  },
  (prevProps, nextProps) => {
    // Solo re-renderizar si cambian estos valores
    return (
      prevProps.noticia.id === nextProps.noticia.id &&
      prevProps.noticia.titulo === nextProps.noticia.titulo &&
      prevProps.noticia.destacada === nextProps.noticia.destacada &&
      prevProps.noticia.es_activa === nextProps.noticia.es_activa &&
      prevProps.noticia.vistas === nextProps.noticia.vistas &&
      prevProps.seleccionada === nextProps.seleccionada
    );
  }
);
