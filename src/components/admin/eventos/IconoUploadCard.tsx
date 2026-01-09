"use client";

import { Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface IconoUploadCardProps {
  iconoPreview: string | null;
  onIconoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onIconoRemove: () => void;
}

export function IconoUploadCard({
  iconoPreview,
  onIconoUpload,
  onIconoRemove,
}: IconoUploadCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Icono Personalizado (Opcional)</CardTitle>
        <CardDescription>
          Sube un icono personalizado si no quieres usar el del juego
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center w-32 h-32">
            {iconoPreview ? (
              <div className="relative w-full h-full">
                <img
                  src={iconoPreview}
                  alt="Vista previa del icono"
                  className="w-full h-full object-cover rounded-md"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={onIconoRemove}
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
                    htmlFor="icono-upload"
                    className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                  >
                    <span>Subir icono</span>
                    <input
                      id="icono-upload"
                      name="icono-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={onIconoUpload}
                    />
                  </label>
                </div>
              </>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              El icono se mostrará junto al nombre del evento. Idealmente debe
              ser un icono cuadrado con fondo transparente.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
