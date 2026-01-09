"use client";

import { UseFormReturn } from "react-hook-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EventoFormValues } from "./schemas";

interface EventoPreviewCardProps {
  form: UseFormReturn<EventoFormValues>;
  iconoPreview: string | null;
  imagenPreview: string | null;
}

const tipoStyles = {
  actualizacion:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  parche:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  evento:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  torneo:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

const tipoLabels = {
  actualizacion: "Actualización",
  parche: "Parche",
  evento: "Evento",
  torneo: "Torneo",
};

export function EventoPreviewCard({
  form,
  iconoPreview,
  imagenPreview,
}: EventoPreviewCardProps) {
  const titulo = form.getValues("titulo");
  const descripcion = form.getValues("descripcion");
  const fecha = form.getValues("fecha");
  const tipo = form.getValues("tipo");
  const juegoNombre = form.getValues("juego_nombre");
  const iconoUrl = form.getValues("icono_url");
  const imagenUrl = form.getValues("imagen_url");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista Previa</CardTitle>
        <CardDescription>
          Así se verá el evento en la página principal
        </CardDescription>
      </CardHeader>
      <CardContent>
        {titulo ? (
          <div className="border rounded-lg p-4">
            <div className="flex items-start space-x-4">
              {(iconoPreview || iconoUrl) && (
                <img
                  src={iconoPreview || ""}
                  alt="Icono del evento"
                  className="w-12 h-12 rounded-md object-cover"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{titulo}</h3>
                  <Badge className={tipoStyles[tipo]}>{tipoLabels[tipo]}</Badge>
                </div>

                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {descripcion || "Sin descripción"}
                </p>

                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>
                    {fecha
                      ? format(fecha, "dd MMM yyyy", {
                          locale: es,
                        })
                      : "Fecha no especificada"}
                  </span>

                  {juegoNombre && (
                    <>
                      <span className="mx-2">•</span>
                      <span>{juegoNombre}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {(imagenPreview || imagenUrl) && (
              <div className="mt-3">
                <img
                  src={imagenPreview || ""}
                  alt="Imagen del evento"
                  className="w-full h-40 object-cover rounded-md"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              No hay datos suficientes
            </h3>
            <p className="text-gray-500">
              Completa al menos el título y la descripción para ver una vista
              previa.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
