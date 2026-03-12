"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Flag, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const REPORT_REASONS = [
  { id: "inappropriate_name", label: "Nombre inapropiado u ofensivo" },
  { id: "fake_code", label: "El código es falso/inválido" },
  { id: "wrong_stats", label: "Las estadísticas son completamente erróneas o troll" },
  { id: "other", label: "Otro motivo" },
] as const;

export default function ReportWeaponButton({ weaponStatsRecordId }: { weaponStatsRecordId: string }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!user) return null; // Only logged in users can report

  const handleReport = async () => {
    if (!reason) {
      setErrorMessage("Por favor selecciona un motivo.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch(`/api/weapons/${weaponStatsRecordId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Error al enviar reporte");
      }

      setStatus("success");
      setTimeout(() => {
        setIsOpen(false);
        setStatus("idle");
        setReason("");
        setDetails("");
      }, 2500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error desconocido");
      setStatus("error");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md"
          title="Reportar esta estadística de arma"
        >
          <Flag size={14} />
        </button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md bg-white dark:bg-black border-2 border-red-500/20 dark:border-red-900/30 rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase text-red-600 dark:text-red-500 flex items-center gap-2">
            <Flag size={20} />
            Reportar Arma
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-gray-500 dark:text-gray-400">
            ¿Por qué consideras que este análisis debe ser revisado o eliminado?
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mb-2">
              <CheckCircle size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Reporte Enviado</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Gracias por ayudarnos a mantener la comunidad limpia.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                Motivo del Reporte *
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setReason(r.id); setStatus("idle"); setErrorMessage(""); }}
                    className={`text-left px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                      reason === r.id
                        ? "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                        : "border-gray-200 dark:border-white/10 hover:border-red-300 dark:hover:border-red-500/50 bg-gray-50/50 dark:bg-white/5 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                Detalles Adicionales (Opcional)
              </label>
              <Textarea
                placeholder="Escribe más detalles si es necesario..."
                className="resize-none h-20 text-sm bg-gray-50/50 dark:bg-white/5 border-gray-200 dark:border-white/10 focus:border-red-500/50"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            {status === "error" && errorMessage && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg text-sm font-medium">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {status !== "success" && (
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsOpen(false)}
              className="border-gray-200 dark:border-white/10"
              disabled={status === "submitting"}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReport}
              disabled={status === "submitting" || !reason}
              className="bg-red-600 hover:bg-red-700 text-white font-bold tracking-tight uppercase"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                "Enviar Reporte"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
