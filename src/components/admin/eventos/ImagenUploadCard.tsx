"use client";

import { ImageIcon, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ImagenUploadCardProps {
  imagenPreview: string | null;
  onImagenUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImagenRemove: () => void;
}

export function ImagenUploadCard({
  imagenPreview,
  onImagenUpload,
  onImagenRemove,
}: ImagenUploadCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Imagen Destacada</CardTitle>
        <CardDescription>
          Sube una imagen para el evento (opcional)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <div className="mt-2 flex items-center gap-4">
            <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center w-full h-40">
              {imagenPreview ? (
                <div className="relative w-full h-full">
                  <img
                    src={imagenPreview}
                    alt="Vista previa"
                    className="w-full h-full object-cover rounded-md"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={onImagenRemove}
                  >
                    <span className="sr-only">Eliminar</span>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    <label
                      htmlFor="imagen-upload"
                      className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                    >
                      <span>Subir imagen</span>
                      <input
                        id="imagen-upload"
                        name="imagen-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={onImagenUpload}
                      />
                    </label>
                    <p>o arrastra y suelta</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, GIF hasta 5MB
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
