"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Trash2,
  LayoutGrid,
  LayoutList,
} from "lucide-react";
import AdminProtection from "@/components/AdminProtection";
import Link from "next/link";
import {
  useAdminNoticias,
  usePrefetchAdminNoticias,
  useEliminarNoticia,
  NoticiaAdmin,
  FiltrosNoticias,
} from "@/components/noticias/hooks/useAdminNoticias";
import { EstadisticasNoticias } from "@/components/admin/noticias/EstadisticasNoticias";
import { FiltrosAvanzados } from "@/components/admin/noticias/FiltrosAvanzados";
import { AccionesMasivas } from "@/components/admin/noticias/AccionesMasivas";
import { ToggleEstado } from "@/components/admin/noticias/ToggleEstado";
import { VistaPrevia } from "@/components/admin/noticias/VistaPrevia";
import { PaginacionMejorada } from "@/components/admin/noticias/PaginacionMejorada";
import { VistaTarjetas } from "@/components/admin/noticias/VistaTarjetas";
import { FilaNoticiaTabla } from "@/components/admin/noticias/FilaNoticiaTabla";
import { VistaBorrador } from "@/components/admin/noticias/VistaBorrador";

// Tipo para las categorías
type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  color: string;
  es_activa: boolean;
};

// Tipo para autores
type Autor = {
  id: string;
  username: string;
};

export default function ListadoNoticiasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [autores, setAutores] = useState<Autor[]>([]);
  const [busquedaLocal, setBusquedaLocal] = useState("");
  const busqueda = useDebounce(busquedaLocal, 500);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(10);
  const [noticiaParaEliminar, setNoticiaParaEliminar] = useState<string | null>(
    null
  );
  const [ordenarPor, setOrdenarPor] = useState<string>("fecha_desc");
  const [filtrosAvanzados, setFiltrosAvanzados] = useState<
    Partial<FiltrosNoticias>
  >({});
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [vistaPrevia, setVistaPrevia] = useState<NoticiaAdmin | null>(null);
  const [modoVista, setModoVista] = useState<"tabla" | "tarjetas">("tabla");
  const [vistaBorradorAbierta, setVistaBorradorAbierta] = useState(false);
  const [noticiaBorrador, setNoticiaBorrador] = useState<NoticiaAdmin | null>(
    null
  );

  const router = useRouter();
  const { toast } = useToast();

  // Construir filtros completos
  const filtros: FiltrosNoticias = useMemo(
    () => ({
      busqueda,
      categoria: categoriaFiltro || undefined,
      ordenar: ordenarPor,
      ...filtrosAvanzados,
    }),
    [busqueda, categoriaFiltro, ordenarPor, filtrosAvanzados]
  );

  // Usar hooks optimizados
  const { data, isLoading, error } = useAdminNoticias(
    paginaActual,
    elementosPorPagina,
    filtros
  );
  const { mutate: eliminarNoticia } = useEliminarNoticia();

  // Prefetch de páginas adyacentes
  usePrefetchAdminNoticias(
    paginaActual,
    elementosPorPagina,
    filtros,
    data?.total_paginas || 1
  );

  // Cargar categorías
  React.useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const respuesta = await fetch(
          "/api/admin/noticias/categorias?admin=true"
        );
        if (respuesta.ok) {
          const data = await respuesta.json();
          setCategorias(data || []);
        }
      } catch (err) {
        console.error("Error al cargar categorías:", err);
      }
    };
    cargarCategorias();
  }, []);

  // Cargar autores únicos
  React.useEffect(() => {
    const cargarAutores = async () => {
      try {
        const respuesta = await fetch("/api/admin/noticias/autores?admin=true");
        if (respuesta.ok) {
          const data = await respuesta.json();
          setAutores(data || []);
        }
      } catch (err) {
        console.error("Error al cargar autores:", err);
      }
    };
    cargarAutores();
  }, []);

  // Función para eliminar noticia
  const confirmarEliminarNoticia = (id: string) => {
    eliminarNoticia(id, {
      onSuccess: () => {
        toast({
          title: "Noticia eliminada",
          description: "La noticia ha sido eliminada correctamente",
        });
        setNoticiaParaEliminar(null);
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message || "Error al eliminar la noticia",
          variant: "destructive",
        });
        setNoticiaParaEliminar(null);
      },
    });
  };

  // Función para cambiar ordenamiento
  const cambiarOrden = (campo: string) => {
    if (ordenarPor === `${campo}_asc`) {
      setOrdenarPor(`${campo}_desc`);
    } else {
      setOrdenarPor(`${campo}_asc`);
    }
  };

  // Función para formatear fecha
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Manejo de selección
  const toggleSeleccion = (id: string) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSeleccionTodas = () => {
    if (seleccionadas.length === data?.noticias.length) {
      setSeleccionadas([]);
    } else {
      setSeleccionadas(data?.noticias.map((n) => n.id) || []);
    }
  };

  // Renderizar esqueletos de carga
  const renderizarEsqueletos = () => {
    return Array(elementosPorPagina)
      .fill(0)
      .map((_, index) => (
        <TableRow key={`skeleton-${index}`}>
          <TableCell>
            <Skeleton className="h-4 w-4" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[250px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[100px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[80px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[60px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[60px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-[100px]" />
          </TableCell>
        </TableRow>
      ));
  };

  return (
    <AdminProtection>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">
            Listado de Noticias
          </h2>
          <Button asChild>
            <Link href="/admin/noticias/crear">
              <Plus className="mr-2 h-4 w-4" /> Crear Noticia
            </Link>
          </Button>
        </div>

        {/* Estadísticas */}
        <EstadisticasNoticias />

        {/* Acciones masivas */}
        {seleccionadas.length > 0 && (
          <AccionesMasivas
            seleccionadas={seleccionadas}
            onLimpiarSeleccion={() => setSeleccionadas([])}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Noticias</CardTitle>
            <CardDescription>
              Administra todas las noticias del sitio. Puedes filtrar, ordenar y
              buscar noticias específicas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título o contenido..."
                  className="pl-8"
                  value={busquedaLocal}
                  onChange={(e) => setBusquedaLocal(e.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    Categoría
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filtrar por categoría</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCategoriaFiltro("")}>
                    Todas las categorías
                  </DropdownMenuItem>
                  {categorias.map((categoria) => (
                    <DropdownMenuItem
                      key={categoria.id}
                      onClick={() => setCategoriaFiltro(categoria.id)}
                    >
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor: categoria.color || "#3b82f6",
                          }}
                        />
                        {categoria.nombre}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <FiltrosAvanzados
                filtros={filtrosAvanzados}
                onFiltrosChange={setFiltrosAvanzados}
                autores={autores}
              />

              <div className="flex gap-2">
                <Button
                  variant={modoVista === "tabla" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setModoVista("tabla")}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button
                  variant={modoVista === "tarjetas" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setModoVista("tarjetas")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {modoVista === "tabla" ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            seleccionadas.length === data?.noticias.length &&
                            data?.noticias.length > 0
                          }
                          onCheckedChange={toggleSeleccionTodas}
                        />
                      </TableHead>
                      <TableHead className="w-[300px]">
                        <Button
                          variant="ghost"
                          onClick={() => cambiarOrden("titulo")}
                        >
                          Título <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => cambiarOrden("categoria")}
                        >
                          Categoría <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => cambiarOrden("fecha")}
                        >
                          Fecha <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => cambiarOrden("vistas")}
                        >
                          Vistas <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      renderizarEsqueletos()
                    ) : error ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-10 text-muted-foreground"
                        >
                          Error al cargar noticias
                        </TableCell>
                      </TableRow>
                    ) : !data?.noticias || data.noticias.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-10 text-muted-foreground"
                        >
                          No se encontraron noticias
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.noticias.map((noticia) => (
                        <FilaNoticiaTabla
                          key={noticia.id}
                          noticia={noticia}
                          seleccionada={seleccionadas.includes(noticia.id)}
                          onToggleSeleccion={toggleSeleccion}
                          onVerPrevia={setVistaPrevia}
                          onVerBorrador={(noticia) => {
                            setNoticiaBorrador(noticia);
                            setVistaBorradorAbierta(true);
                          }}
                          onEliminar={setNoticiaParaEliminar}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <VistaTarjetas
                noticias={data?.noticias || []}
                seleccionadas={seleccionadas}
                onToggleSeleccion={toggleSeleccion}
                onVerPrevia={setVistaPrevia}
                onEliminar={setNoticiaParaEliminar}
              />
            )}
          </CardContent>
          <CardFooter>
            {data && (
              <PaginacionMejorada
                paginaActual={paginaActual}
                totalPaginas={data.total_paginas}
                elementosPorPagina={elementosPorPagina}
                totalElementos={data.total}
                onCambiarPagina={setPaginaActual}
                onCambiarElementosPorPagina={(elementos) => {
                  setElementosPorPagina(elementos);
                  setPaginaActual(1);
                }}
              />
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Vista previa */}
      <VistaPrevia
        noticia={vistaPrevia}
        open={!!vistaPrevia}
        onOpenChange={(open) => !open && setVistaPrevia(null)}
      />

      {/* Vista de borrador */}
      <VistaBorrador
        noticia={noticiaBorrador}
        open={vistaBorradorAbierta}
        onOpenChange={setVistaBorradorAbierta}
        onEditar={(id) => router.push(`/admin/noticias/editar/${id}`)}
      />

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog
        open={!!noticiaParaEliminar}
        onOpenChange={() => setNoticiaParaEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              noticia del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                noticiaParaEliminar &&
                confirmarEliminarNoticia(noticiaParaEliminar)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminProtection>
  );
}
