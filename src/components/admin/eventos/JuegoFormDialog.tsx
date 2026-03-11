"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Gamepad2,
  Upload,
  XCircle,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Juego } from "./types";
import { juegoSchema, JuegoFormValues } from "./schemas";

interface JuegoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  juegoEditando: Juego | null;
  onSuccess: () => Promise<void>;
  guardarJuego: (
    data: JuegoFormValues,
    juegoEditando: Juego | null
  ) => Promise<boolean>;
}

export function JuegoFormDialog({
  open,
  onOpenChange,
  juegoEditando,
  onSuccess,
  guardarJuego,
}: JuegoFormDialogProps) {
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iconoPreview, setIconoPreview] = useState<string | null>(null);
  const [imagenPortadaPreview, setImagenPortadaPreview] = useState<string | null>(null);

  // Formulario para crear/editar juegos
  const juegoForm = useForm<JuegoFormValues>({
    resolver: zodResolver(juegoSchema),
    defaultValues: {
      nombre: "",
      slug: "",
      descripcion: "",
      desarrollador: "",
      fecha_lanzamiento: null,
      icono_url: "",
      imagen_portada_url: "",
    },
  });

  // Inicializar formulario cuando cambia el juego a editar
  const initializeForm = (juego: Juego | null) => {
    if (juego) {
      // Modo edición
      juegoForm.reset({
        id: juego.id,
        nombre: juego.nombre,
        descripcion: juego.descripcion || "",
        desarrollador: juego.desarrollador || "",
        fecha_lanzamiento: juego.fecha_lanzamiento
          ? new Date(juego.fecha_lanzamiento)
          : null,
        icono_url: juego.icono_url || "",
        imagen_portada_url: juego.imagen_portada_url || "",
      });

      // Si el juego tiene icono, mostrar vista previa
      if (juego.icono_url) {
        if (juego.icono_url.startsWith("http")) {
          setIconoPreview(juego.icono_url);
        } else {
          const { data } = supabase.storage
            .from("iconos")
            .getPublicUrl(juego.icono_url);
          if (data?.publicUrl) {
            setIconoPreview(data.publicUrl);
          }
        }
      } else {
        setIconoPreview(null);
      }

      // Si el juego tiene imagen de portada, mostrar vista previa
      if (juego.imagen_portada_url) {
        if (juego.imagen_portada_url.startsWith("http")) {
          setImagenPortadaPreview(juego.imagen_portada_url);
        } else {
          const { data } = supabase.storage
            .from("imagenes") // Asumiendo que las portadas van al bucket "imagenes"
            .getPublicUrl(juego.imagen_portada_url);
          if (data?.publicUrl) {
            setImagenPortadaPreview(data.publicUrl);
          }
        }
      } else {
        setImagenPortadaPreview(null);
      }
    } else {
      // Modo creación
      juegoForm.reset({
        nombre: "",
        descripcion: "",
        desarrollador: "",
        fecha_lanzamiento: null,
        icono_url: "",
        imagen_portada_url: "",
      });
      setIconoPreview(null);
      setImagenPortadaPreview(null);
    }
  };

  // Manejar carga de icono para juego
  const handleIconoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Crear URL local temporal para vista previa
        const previewUrl = URL.createObjectURL(file);
        setIconoPreview(previewUrl);

        // Subir icono a Supabase Storage
        const fileExt = file.name.split(".").pop();
        const fileName = `juego-icono-${Date.now()}.${fileExt}`;
        const filePath = `iconos-3d/${fileName}`;

        // Si estamos editando un juego y ya tiene un icono, eliminarlo primero
        if (
          juegoEditando?.icono_url &&
          !juegoEditando.icono_url.startsWith("http")
        ) {
          try {
            await supabase.storage
              .from("iconos")
              .remove([juegoEditando.icono_url]);
            console.log("Icono anterior eliminado:", juegoEditando.icono_url);
          } catch (removeError) {
            console.warn("No se pudo eliminar el icono anterior:", removeError);
          }
        }

        // Subir el nuevo icono
        const { error } = await supabase.storage
          .from("iconos")
          .upload(filePath, file, { upsert: true });

        if (error) throw error;

        // Guardar la ruta relativa del archivo en el bucket
        juegoForm.setValue("icono_url", filePath, {
          shouldDirty: true,
          shouldValidate: true,
        });
        console.log("Nuevo icono subido:", filePath);
      } catch (error) {
        console.error("Error al subir icono del juego:", error);
        toast({
          title: "Error",
          description: "No se pudo subir el icono del juego.",
          variant: "destructive",
        });
      }
    }
  };

  // Manejar carga de imagen de portada para el juego
  const handleImagenPortadaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const previewUrl = URL.createObjectURL(file);
        setImagenPortadaPreview(previewUrl);

        const fileExt = file.name.split(".").pop();
        const fileName = `juego-portada-${Date.now()}.${fileExt}`;
        const filePath = `juegos/portadas/${fileName}`;

        if (
          juegoEditando?.imagen_portada_url &&
          !juegoEditando.imagen_portada_url.startsWith("http")
        ) {
          try {
            await supabase.storage
              .from("imagenes")
              .remove([juegoEditando.imagen_portada_url]);
          } catch (removeError) {
            console.warn("No se pudo eliminar la imagen de portada anterior:", removeError);
          }
        }

        const { error } = await supabase.storage
          .from("imagenes")
          .upload(filePath, file, { upsert: true });

        if (error) throw error;

        juegoForm.setValue("imagen_portada_url", filePath, {
          shouldDirty: true,
          shouldValidate: true,
        });
      } catch (error) {
        console.error("Error al subir imagen de portada:", error);
        toast({
          title: "Error",
          description: "No se pudo subir la imagen de portada.",
          variant: "destructive",
        });
      }
    }
  };

  // Guardar juego
  const onSubmit = async (data: JuegoFormValues) => {
    try {
      setIsSubmitting(true);
      const success = await guardarJuego(data, juegoEditando);
      if (success) {
        await onSuccess();
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inicializar formulario cuando se abre el diálogo
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      initializeForm(juegoEditando);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            {juegoEditando ? "Editar juego" : "Crear nuevo juego"}
          </DialogTitle>
          <DialogDescription>
            {juegoEditando
              ? "Modifica los datos del juego seleccionado."
              : "Completa los datos para crear un nuevo juego."}
          </DialogDescription>
        </DialogHeader>

        <Form {...juegoForm}>
          <form
            onSubmit={juegoForm.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden min-h-0"
          >
            <ScrollArea className="flex-1 w-full overflow-hidden">
              <div className="space-y-6 px-6 py-4 pb-20">
                {/* Nombre del juego */}
                <FormField
                  control={juegoForm.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="juego-nombre">
                        Nombre del juego
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="juego-nombre"
                          placeholder="Nombre del juego"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500">
                        El slug para URLs se generará automáticamente a partir
                        del nombre.
                      </p>
                    </FormItem>
                  )}
                />

                {/* Descripción */}
                <FormField
                  control={juegoForm.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="juego-descripcion">
                        Descripción (opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          id="juego-descripcion"
                          placeholder="Descripción del juego"
                          className="min-h-[100px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Desarrollador */}
                <FormField
                  control={juegoForm.control}
                  name="desarrollador"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="juego-desarrollador">
                        Desarrollador (opcional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="juego-desarrollador"
                          placeholder="Nombre del desarrollador"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fecha de lanzamiento */}
                <FormField
                  control={juegoForm.control}
                  name="fecha_lanzamiento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel htmlFor="juego-fecha">
                        Fecha de lanzamiento (opcional)
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              id="juego-fecha"
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Selecciona una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Icono */}
                <div>
                  <div className="flex items-center justify-between">
                    <FormLabel>Icono del juego (opcional)</FormLabel>
                    {juegoEditando?.icono_url && iconoPreview && (
                      <Badge
                        variant="outline"
                        className="px-2 py-1 flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Icono existente</span>
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center w-32 h-32">
                      {iconoPreview ? (
                        <div className="relative w-full h-full">
                          <img
                            src={iconoPreview}
                            alt="Vista previa del icono"
                            className="w-full h-full object-contain rounded-md"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => {
                              setIconoPreview(null);
                              juegoForm.setValue("icono_url", "", {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                          >
                            <span className="sr-only">Eliminar</span>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            <label
                              htmlFor="juego-icono-upload"
                              className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                            >
                              <span>
                                {juegoEditando
                                  ? "Cambiar icono"
                                  : "Subir icono"}
                              </span>
                              <input
                                id="juego-icono-upload"
                                name="juego-icono-upload"
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                onChange={handleIconoUpload}
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {juegoEditando && iconoPreview ? (
                          <>
                            Puedes <strong>cambiar</strong> el icono existente o{" "}
                            <strong>eliminarlo</strong> usando el botón X.
                          </>
                        ) : (
                          <>
                            El icono se mostrará junto al nombre del juego.
                            Idealmente debe ser un icono cuadrado con fondo
                            transparente.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Imagen de Portada */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel className="text-base font-bold">Imagen de portada (Banner)</FormLabel>
                    {juegoEditando?.imagen_portada_url && imagenPortadaPreview && (
                      <Badge
                        variant="outline"
                        className="px-2 py-1 flex items-center gap-1 border-teal-500/50 text-teal-600"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Banner activo</span>
                      </Badge>
                    )}
                  </div>
                  <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl overflow-hidden bg-muted/20 hover:bg-muted/30 transition-colors">
                    {imagenPortadaPreview ? (
                      <div className="relative aspect-[21/9] w-full">
                        <img
                          src={imagenPortadaPreview}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <label
                            htmlFor="juego-portada-upload-replace"
                            className="cursor-pointer bg-white dark:bg-gray-900 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xl"
                          >
                            <Upload size={16} />
                            Cambiar imagen
                            <input
                              id="juego-portada-upload-replace"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleImagenPortadaUpload}
                            />
                          </label>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-lg"
                          onClick={(e) => {
                            e.preventDefault();
                            setImagenPortadaPreview(null);
                            juegoForm.setValue("imagen_portada_url", "", {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                        >
                          <XCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <label
                          htmlFor="juego-portada-upload"
                          className="cursor-pointer text-lg font-bold text-primary hover:text-primary/80 transition-colors"
                        >
                          Subir banner del juego
                          <input
                            id="juego-portada-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleImagenPortadaUpload}
                          />
                        </label>
                        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                          Esta imagen se mostrará como fondo en la cabecera de la página del juego.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="sticky bottom-0 bg-background px-6 py-4 border-t flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Guardar</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
