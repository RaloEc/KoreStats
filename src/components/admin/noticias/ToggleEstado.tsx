import React from "react";
import { Switch } from "@/components/ui/switch";
import { useActualizarEstadoNoticia } from "@/components/noticias/hooks/useAdminNoticias";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToggleEstadoProps {
  noticiaId: string;
  campo: "destacada" | "es_activa";
  valorActual: boolean;
  etiqueta?: string;
}

export function ToggleEstado({
  noticiaId,
  campo,
  valorActual,
  etiqueta,
}: ToggleEstadoProps) {
  const { mutate: actualizarEstado, isPending } = useActualizarEstadoNoticia();
  const { toast } = useToast();

  const handleChange = (checked: boolean) => {
    actualizarEstado(
      { id: noticiaId, campo, valor: checked },
      {
        onError: (error: Error) => {
          toast({
            title: "Error",
            description: error.message || "Error al actualizar el estado",
            variant: "destructive",
          });
        },
      }
    );
  };

  const isActiva = campo === "es_activa";

  return (
    <div className="flex items-center gap-3 group">
      <div className="relative flex items-center">
        {isPending ? (
          <div className="h-5 w-10 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Switch
            checked={valorActual}
            onCheckedChange={handleChange}
            disabled={isPending}
            className={cn(
              "transition-all duration-200",
              valorActual
                ? isActiva
                  ? "data-[state=checked]:bg-emerald-500 hover:data-[state=checked]:bg-emerald-600"
                  : "data-[state=checked]:bg-amber-500 hover:data-[state=checked]:bg-amber-600"
                : "data-[state=unchecked]:bg-zinc-300 dark:data-[state=unchecked]:bg-zinc-700"
            )}
          />
        )}
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            "text-xs font-semibold transition-colors duration-200",
            valorActual
              ? isActiva
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
              : "text-zinc-500 dark:text-zinc-400"
          )}
        >
          {etiqueta}
        </span>
        <span className="text-[10px] text-muted-foreground leading-none">
          {valorActual
            ? isActiva
              ? "Visible para todos"
              : "Noticia resaltada"
            : isActiva
              ? "Borrador/Oculta"
              : "Normal"}
        </span>
      </div>
    </div>
  );
}
