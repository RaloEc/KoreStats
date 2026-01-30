"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: "post" | "comment";
  contentId: string;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam o publicidad no deseada" },
  { value: "harassment", label: "Acoso o intimidación" },
  { value: "hate_speech", label: "Discurso de odio" },
  { value: "violence", label: "Violencia o amenazas" },
  { value: "inappropriate", label: "Contenido inapropiado" },
  { value: "misinformation", label: "Información falsa" },
  { value: "other", label: "Otro motivo" },
];

export default function ReportModal({
  isOpen,
  onClose,
  contentType,
  contentId,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast.error("Selecciona un motivo para el reporte");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/social/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          reason,
          description: description.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al enviar el reporte");
      }

      toast.success(data.message || "Reporte enviado correctamente");
      onClose();
      setReason("");
      setDescription("");
    } catch (error: any) {
      toast.error(error.message || "Error al enviar el reporte");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use a portal to escape parent stacking contexts (e.g. transforms in virtual lists)
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1a1b1e] rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Flag size={20} className="text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Reportar {contentType === "post" ? "publicación" : "comentario"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Reason selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ¿Por qué deseas reportar este contenido?
            </label>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    reason === r.value
                      ? "border-red-500 bg-red-50 dark:bg-red-500/10"
                      : "border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      reason === r.value
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {reason === r.value && (
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {r.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Detalles adicionales (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Proporciona más contexto sobre el problema..."
              rows={3}
              maxLength={500}
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
            <p className="text-xs text-gray-400 mt-1">
              {description.length}/500
            </p>
          </div>

          {/* Submit button */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!reason || isSubmitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Flag size={16} />
                  Enviar reporte
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Los reportes falsos pueden resultar en restricciones de cuenta.
          </p>
        </form>
      </div>
    </div>,
    document.body,
  );
}
