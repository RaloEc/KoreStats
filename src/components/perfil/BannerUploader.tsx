"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SupabaseImage } from "@/components/ui/SupabaseImage";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Constantes para la configuración del banner
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const BANNER_WIDTH = 1920;
const BANNER_HEIGHT = 480; // Relación de aspecto 4:1 (16:4)
const BANNER_QUALITY = 80;

type BannerUploaderVariant = "overlay" | "compact";

export function BannerUploader({
  userId,
  currentBanner,
  onUpload,
  variant = "overlay",
}: {
  userId: string;
  currentBanner?: string | null;
  onUpload: (url: string) => void;
  variant?: BannerUploaderVariant;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const validateFile = (file: File): boolean => {
    setError(null);

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      setError(
        `El archivo es demasiado grande. El tamaño máximo es ${
          MAX_FILE_SIZE / 1024 / 1024
        }MB.`,
      );
      return false;
    }

    // Validar formato
    if (!ALLOWED_FORMATS.includes(file.type)) {
      setError(
        `Formato no soportado. Formatos permitidos: ${ALLOWED_FORMATS.map(
          (f) => f.split("/")[1],
        ).join(", ")}.`,
      );
      return false;
    }

    return true;
  };

  const uploadBanner = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setError(null);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Debes seleccionar una imagen");
      }

      const file = event.target.files[0];

      // Validar el archivo
      if (!validateFile(file)) {
        setUploading(false);
        return;
      }

      const fileExt = file.name.split(".").pop();
      // Generar un nombre de archivo único con timestamp y un número aleatorio
      const timestamp = new Date().getTime();
      const random = Math.floor(Math.random() * 10000);
      const fileName = `banner_${timestamp}_${random}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Subir el archivo
      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Obtener la URL pública con parámetro de caché
      const cacheBuster = new Date().getTime();
      const {
        data: { publicUrl },
      } = supabase.storage
        .from("banners")
        .getPublicUrl(`${filePath}?v=${cacheBuster}`);

      // Actualizar el perfil con la nueva URL (forzando actualización de caché)
      const { error: updateError } = await supabase
        .from("perfiles")
        .update({
          banner_url: `${publicUrl}?v=${cacheBuster}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      onUpload(publicUrl);
      toast.success("Banner actualizado correctamente");

      // Limpiar el input para permitir subir el mismo archivo nuevamente
      event.target.value = "";
    } catch (error: any) {
      console.error("Error al subir el banner:", error);
      setError(error.message || "Error al subir el banner");
      toast.error("Error al subir el banner");
    } finally {
      setUploading(false);
    }
  };

  const removeBanner = async () => {
    try {
      setUploading(true);
      setError(null);

      // Obtener el nombre del archivo actual (limpiar querystring si existe)
      const cleanUrl = (currentBanner || "").split("?")[0];
      const fileName = cleanUrl.split("/").pop();
      if (!fileName)
        throw new Error("No se pudo determinar el nombre del archivo");

      // Eliminar el archivo del storage
      const { error: deleteError } = await supabase.storage
        .from("banners")
        .remove([`${userId}/${fileName}`]);

      if (deleteError) throw deleteError;

      // Actualizar el perfil
      const { error: updateError } = await supabase
        .from("perfiles")
        .update({ banner_url: null })
        .eq("id", userId);

      if (updateError) throw updateError;

      onUpload("");
      toast.success("Banner eliminado correctamente");
    } catch (error: any) {
      console.error("Error al eliminar el banner:", error);
      setError(error.message || "Error al eliminar el banner");
      toast.error("Error al eliminar el banner");
    } finally {
      setUploading(false);
    }
  };

  if (variant === "compact") {
    return (
      <div>
        <div className="relative h-32 w-full bg-muted overflow-hidden rounded-md border">
          {currentBanner ? (
            <SupabaseImage
              src={currentBanner}
              alt="Banner de perfil"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">
                Sin banner personalizado
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <input
            type="file"
            id="banner-upload"
            accept={ALLOWED_FORMATS.join(",")}
            className="hidden"
            onChange={uploadBanner}
            disabled={uploading}
          />
          <label
            htmlFor="banner-upload"
            className="cursor-pointer bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90 transition-opacity text-sm font-medium shadow-sm"
          >
            <ImagePlus size={16} />
            {currentBanner ? "Cambiar banner" : "Subir banner"}
          </label>

          {currentBanner && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={removeBanner}
              disabled={uploading}
            >
              <X size={16} className="mr-1" />
              Eliminar
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-2 text-xs text-muted-foreground">
          <p>Formatos permitidos: JPG, PNG, WEBP. Tamaño máximo: 5MB.</p>
          <p>Resolución recomendada: 1920x480px (relación 4:1).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="relative h-48 w-full bg-muted overflow-hidden">
        {currentBanner ? (
          <SupabaseImage
            src={currentBanner}
            alt="Banner de perfil"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center justify-center">
            <span className="text-muted-foreground text-sm">
              Sin banner personalizado
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <input
            type="file"
            id="banner-upload"
            accept={ALLOWED_FORMATS.join(",")}
            className="hidden"
            onChange={uploadBanner}
            disabled={uploading}
          />
          <label
            htmlFor="banner-upload"
            className="cursor-pointer bg-white/90 text-black px-4 py-2 rounded-md flex items-center gap-2 hover:bg-white transition-colors"
          >
            <ImagePlus size={16} />
            {currentBanner ? "Cambiar banner" : "Subir banner"}
          </label>

          {currentBanner && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={removeBanner}
              disabled={uploading}
              className="bg-white/90 text-red-600 hover:bg-white hover:text-red-700"
            >
              <X size={16} className="mr-1" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-2 text-xs text-muted-foreground">
        <p>Formatos permitidos: JPG, PNG, WEBP. Tamaño máximo: 5MB.</p>
        <p>Resolución recomendada: 1920x480px (relación 4:1).</p>
      </div>
    </div>
  );
}
