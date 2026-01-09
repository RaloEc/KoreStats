"use client";

import { UseFormReturn } from "react-hook-form";
import {
  AlertCircle,
  Gamepad2,
  PlusCircle,
  Edit as EditIcon,
  Trash2,
  RefreshCcw,
  Loader2,
  Check,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { Juego, JuegoListado } from "./types";
import type { EventoFormValues } from "./schemas";

interface JuegoSelectorCardProps {
  form: UseFormReturn<EventoFormValues>;
  juegos: JuegoListado[];
  isLoadingJuegos: boolean;
  juegosError: string | null;
  selectedJuego: JuegoListado | null;
  juegoEliminandoId: string | null;
  onNuevoJuego: () => void;
  onEditarJuego: (juego: Juego) => void;
  onEliminarJuego: (juego: JuegoListado) => void;
  onFetchJuegos: () => void;
  onJuegoSelect: (juego: JuegoListado) => void;
}

export function JuegoSelectorCard({
  form,
  juegos,
  isLoadingJuegos,
  juegosError,
  selectedJuego,
  juegoEliminandoId,
  onNuevoJuego,
  onEditarJuego,
  onEliminarJuego,
  onFetchJuegos,
  onJuegoSelect,
}: JuegoSelectorCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Seleccionar Juego</CardTitle>
          <CardDescription>
            Elige un juego para asociarlo con este evento
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={onNuevoJuego}
        >
          <PlusCircle className="h-4 w-4" />
          <span>Nuevo Juego</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoadingJuegos ? (
          <div className="flex items-center justify-center py-12 border rounded-md bg-gray-50 dark:bg-gray-900/50">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">
              Cargando juegos...
            </span>
          </div>
        ) : juegosError ? (
          <div className="flex flex-col items-center justify-center py-12 border border-red-200 dark:border-red-900/50 rounded-md bg-red-50 dark:bg-red-900/10">
            <AlertCircle className="h-5 w-5 text-red-500 mb-2" />
            <p className="text-sm text-red-700 dark:text-red-400 text-center">
              {juegosError}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onFetchJuegos}
            >
              <RefreshCcw className="h-3 w-3 mr-1" />
              Reintentar
            </Button>
          </div>
        ) : juegos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-md bg-gray-50 dark:bg-gray-900/50">
            <Gamepad2 className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              No hay juegos disponibles
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onNuevoJuego}
            >
              <PlusCircle className="h-3 w-3 mr-1" />
              Crear el primer juego
            </Button>
          </div>
        ) : (
          <FormField
            control={form.control}
            name="juego_id"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {juegos.map((juego) => {
                    const isSelected = field.value === juego.id;
                    const isDeleting = juegoEliminandoId === juego.id;

                    return (
                      <div
                        key={juego.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onJuegoSelect(juego)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onJuegoSelect(juego);
                          }
                        }}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary/60",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                      >
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditarJuego(juego);
                            }}
                          >
                            <EditIcon className="h-4 w-4" />
                            <span className="sr-only">Editar juego</span>
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEliminarJuego(juego);
                            }}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="sr-only">Eliminar juego</span>
                          </Button>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 left-2 rounded-full bg-primary text-primary-foreground p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}

                        {juego.iconoPublicUrl ? (
                          <img
                            src={juego.iconoPublicUrl}
                            alt={juego.nombre}
                            className="h-12 w-12 rounded-md object-cover"
                            onError={(e) => {
                              console.warn(
                                `Error cargando icono de ${juego.nombre}`
                              );
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Gamepad2 className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <span className="text-xs font-medium text-center line-clamp-2 w-full">
                          {juego.nombre}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {selectedJuego && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-md">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-900 dark:text-green-300">
                Juego seleccionado:{" "}
                <span className="font-medium">{selectedJuego.nombre}</span>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
