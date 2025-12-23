"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Flag } from "lucide-react";
import { toast } from "sonner";

interface BotonReportarProps {
  tipo_contenido: "hilo" | "post" | "comentario";
  contenido_id: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  hideLabelBelow?: "sm" | "md" | "lg" | "xl";
}

const RAZONES_REPORTE = [
  { value: "spam", label: "Spam o publicidad" },
  { value: "acoso", label: "Acoso o intimidación" },
  { value: "contenido_inapropiado", label: "Contenido inapropiado" },
  { value: "desinformacion", label: "Desinformación" },
  { value: "lenguaje_ofensivo", label: "Lenguaje ofensivo" },
  { value: "fuera_de_tema", label: "Fuera de tema" },
  { value: "otro", label: "Otro" },
];

export default function BotonReportar({
  tipo_contenido,
  contenido_id,
  variant = "ghost",
  size = "sm",
  hideLabelBelow,
}: BotonReportarProps) {
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [razon, setRazon] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleReportar = async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token || null;
    if (!razon) {
      toast.error("Selecciona una razón para el reporte");
      return;
    }

    setEnviando(true);

    try {
      // Validar sesión antes de enviar
      if (!session || !accessToken)
        throw new Error("Debes iniciar sesión para reportar contenido");

      const res = await fetch("/api/admin/foro/reportes", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          tipo_contenido,
          contenido_id,
          razon,
          descripcion: descripcion.trim() || null,
        }),
      });

      if (!res.ok) {
        let serverMsg = "Error al enviar el reporte";
        try {
          const errJson = await res.json();
          if (errJson?.error) serverMsg = errJson.error;
        } catch {}
        throw new Error(serverMsg);
      }

      toast.success(
        "Reporte enviado correctamente. Será revisado por un moderador."
      );
      setDialogAbierto(false);
      setRazon("");
      setDescripcion("");
    } catch (error) {
      console.error("Error al reportar:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Error al enviar el reporte. Intenta nuevamente.";
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} aria-label="Reportar">
          <Flag
            className={`h-4 w-4 ${
              size === "icon"
                ? ""
                : hideLabelBelow
                ? `${hideLabelBelow}:mr-2`
                : "mr-2"
            }`}
          />
          <span
            className={
              size === "icon"
                ? "sr-only"
                : hideLabelBelow
                ? `hidden ${hideLabelBelow}:inline`
                : ""
            }
          >
            Reportar
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reportar Contenido</DialogTitle>
          <DialogDescription>
            Ayúdanos a mantener la comunidad segura reportando contenido
            inapropiado
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Razón del reporte</label>
            <Select value={razon} onValueChange={setRazon}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecciona una razón" />
              </SelectTrigger>
              <SelectContent>
                {RAZONES_REPORTE.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">
              Descripción adicional (opcional)
            </label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Proporciona más detalles sobre el problema..."
              className="mt-1"
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleReportar}
              disabled={!razon || enviando}
              className="flex-1"
            >
              {enviando ? "Enviando..." : "Enviar Reporte"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDialogAbierto(false)}
              disabled={enviando}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
