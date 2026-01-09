"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Importar componentes y utilidades del módulo de eventos
import {
  EventoBasicInfoCard,
  JuegoSelectorCard,
  IconoUploadCard,
  ImagenUploadCard,
  EventoPreviewCard,
  JuegoFormDialog,
  useJuegos,
  eventoSchema,
  EventoFormValues,
  JuegoListado,
  Juego,
} from "@/components/admin/eventos";

export default function CrearEvento() {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const router = useRouter();
  const supabase = createClient();

  // Estados del componente
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [iconoPreview, setIconoPreview] = useState<string | null>(null);
  const [isFechaPopoverOpen, setIsFechaPopoverOpen] = useState(false);
  const [isJuegoDialogOpen, setIsJuegoDialogOpen] = useState(false);
  const [juegoEditando, setJuegoEditando] = useState<Juego | null>(null);

  // Hook personalizado para gestión de juegos
  const {
    juegos,
    isLoadingJuegos,
    juegosError,
    juegoEliminandoId,
    fetchJuegos,
    handleEliminarJuego,
    guardarJuego,
  } = useJuegos();

  // Inicializar formulario principal
  const form = useForm<EventoFormValues>({
    resolver: zodResolver(eventoSchema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      fecha: new Date(),
      tipo: "evento",
      tipo_icono: "juego_existente",
      juego_id: "",
      juego_nombre: "",
      imagen_url: "",
      icono_url: "",
      url: "",
      estado: "borrador",
    },
  });

  const juegoSeleccionadoId = form.watch("juego_id");

  const selectedJuego = useMemo(() => {
    if (!juegoSeleccionadoId) return null;
    return juegos.find((juego) => juego.id === juegoSeleccionadoId) ?? null;
  }, [juegos, juegoSeleccionadoId]);

  // Redireccionar si no es admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/admin/login");
    }
  }, [isAdmin, authLoading, router]);

  // Cargar juegos desde Supabase
  useEffect(() => {
    fetchJuegos();
  }, [fetchJuegos]);

  // Sincronizar datos cuando se selecciona un juego
  useEffect(() => {
    if (!selectedJuego) {
      return;
    }

    form.setValue("juego_nombre", selectedJuego.nombre);
    form.setValue("icono_url", selectedJuego.icono_url || "");
    setIconoPreview(selectedJuego.iconoPublicUrl);
  }, [selectedJuego, form]);

  // Manejar envío del formulario
  const onSubmit = async (data: EventoFormValues) => {
    try {
      setIsSubmitting(true);
      console.log("[onSubmit] Datos del formulario recibidos:", {
        ...data,
        fecha: data.fecha?.toISOString?.() ?? data.fecha,
      });

      // Crear el evento usando la API protegida
      const payload = {
        titulo: data.titulo,
        descripcion: data.descripcion,
        fecha: data.fecha.toISOString(),
        tipo: data.tipo,
        juego_nombre: data.juego_nombre || null,
        imagen_url: data.imagen_url || null,
        icono_url: data.icono_url || null,
        url: data.url || null,
        estado: data.estado,
        tipo_icono: data.tipo_icono,
        juego_id: data.juego_id || null,
      };

      console.log("[onSubmit] Payload preparado para envío:", payload);

      const response = await fetch("/api/admin/eventos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      console.log(
        "[onSubmit] Respuesta recibida:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[onSubmit] Error en respuesta:", errorData);
        throw new Error(errorData.error || "Error al crear evento");
      }

      const eventoCreado = await response.json();
      console.log("[onSubmit] Evento creado:", eventoCreado);

      toast({
        title: "Evento creado",
        description: `El evento "${data.titulo}" ha sido creado correctamente.`,
        variant: "default",
      });

      router.push("/admin/eventos");
    } catch (error) {
      console.error("[onSubmit] Error capturado:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo crear el evento.",
        variant: "destructive",
      });
      console.log("[onSubmit] Finalizando envío con error");
      setIsSubmitting(false);
    }
  };

  // Manejar carga de imagen
  const handleImagenUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const previewUrl = URL.createObjectURL(file);
        setImagenPreview(previewUrl);

        const fileExt = file.name.split(".").pop();
        const fileName = `evento-imagen-${Date.now()}.${fileExt}`;
        const filePath = `eventos/${fileName}`;

        const { error } = await supabase.storage
          .from("iconos")
          .upload(filePath, file);

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from("iconos")
          .getPublicUrl(filePath);

        form.setValue("imagen_url", publicUrlData.publicUrl);
        console.log(
          "[handleImagenUpload] Imagen subida:",
          publicUrlData.publicUrl
        );
      } catch (error) {
        console.error("[handleImagenUpload] Error:", error);
        toast({
          title: "Error",
          description: "No se pudo subir la imagen.",
          variant: "destructive",
        });
        setImagenPreview(null);
      }
    }
  };

  // Manejar carga de icono 3D
  const handleIconoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const previewUrl = URL.createObjectURL(file);
        setIconoPreview(previewUrl);
        form.setValue("tipo_icono", "personalizado");

        const fileExt = file.name.split(".").pop();
        const fileName = `evento-icono-3d-${Date.now()}.${fileExt}`;
        const filePath = `iconos-3d/${fileName}`;

        const { error } = await supabase.storage
          .from("iconos")
          .upload(filePath, file);

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from("iconos")
          .getPublicUrl(filePath);

        form.setValue("icono_url", publicUrlData.publicUrl);
        form.clearErrors("icono_url");
        console.log(
          "[handleIconoUpload] Icono subido:",
          publicUrlData.publicUrl
        );
      } catch (error) {
        console.error("[handleIconoUpload] Error:", error);
        toast({
          title: "Error",
          description: "No se pudo subir el icono.",
          variant: "destructive",
        });
        setIconoPreview(null);
      }
    }
  };

  // Handlers para el diálogo de juegos
  const handleNuevoJuego = () => {
    setJuegoEditando(null);
    setIsJuegoDialogOpen(true);
  };

  const handleEditarJuego = (juego: Juego) => {
    setJuegoEditando(juego);
    setIsJuegoDialogOpen(true);
  };

  const handleJuegoSelect = useCallback(
    (juego: JuegoListado) => {
      form.setValue("juego_id", juego.id);
      form.setValue("juego_nombre", juego.nombre);
      form.setValue("icono_url", juego.icono_url || "");
      form.setValue("tipo_icono", "juego_existente");
      form.clearErrors(["juego_id", "icono_url"]);
      setIconoPreview(juego.iconoPublicUrl);
    },
    [form]
  );

  const handleIconoRemove = useCallback(() => {
    setIconoPreview(null);
    form.setValue("icono_url", "");
    form.setValue("tipo_icono", "juego_existente");
  }, [form]);

  const handleImagenRemove = useCallback(() => {
    setImagenPreview(null);
    form.setValue("imagen_url", "");
  }, [form]);

  const handleJuegoEliminado = useCallback(
    (juegoId: string) => {
      if (form.getValues("juego_id") === juegoId) {
        form.setValue("juego_id", "");
        form.setValue("juego_nombre", "");
        setIconoPreview(null);
      }
    },
    [form]
  );

  // Estados de carga
  if (authLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Cargando...</h1>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Crear Nuevo Evento</h1>
        <Button variant="outline" onClick={() => router.push("/admin/eventos")}>
          Volver a la lista
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Sección de Información Básica */}
          <EventoBasicInfoCard
            form={form}
            isFechaPopoverOpen={isFechaPopoverOpen}
            setIsFechaPopoverOpen={setIsFechaPopoverOpen}
          />

          {/* Sección de Juego */}
          <JuegoSelectorCard
            form={form}
            juegos={juegos}
            isLoadingJuegos={isLoadingJuegos}
            juegosError={juegosError}
            selectedJuego={selectedJuego}
            juegoEliminandoId={juegoEliminandoId}
            onNuevoJuego={handleNuevoJuego}
            onEditarJuego={handleEditarJuego}
            onEliminarJuego={(juego) =>
              handleEliminarJuego(juego, handleJuegoEliminado)
            }
            onFetchJuegos={fetchJuegos}
            onJuegoSelect={handleJuegoSelect}
          />

          {/* Sección de Icono Personalizado */}
          <IconoUploadCard
            iconoPreview={iconoPreview}
            onIconoUpload={handleIconoUpload}
            onIconoRemove={handleIconoRemove}
          />

          {/* Sección de Imagen Destacada */}
          <ImagenUploadCard
            imagenPreview={imagenPreview}
            onImagenUpload={handleImagenUpload}
            onImagenRemove={handleImagenRemove}
          />

          {/* Vista previa */}
          <EventoPreviewCard
            form={form}
            iconoPreview={iconoPreview}
            imagenPreview={imagenPreview}
          />

          {/* Botones de acción */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/eventos")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Evento"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Diálogo para crear/editar juegos */}
      <JuegoFormDialog
        open={isJuegoDialogOpen}
        onOpenChange={setIsJuegoDialogOpen}
        juegoEditando={juegoEditando}
        onSuccess={fetchJuegos}
        guardarJuego={guardarJuego}
      />
    </div>
  );
}
