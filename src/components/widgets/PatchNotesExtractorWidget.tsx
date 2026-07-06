"use client";

import React, { useState } from "react";
import { FileText, Loader2, Play, Check, AlertCircle, Copy, Code, Save, ArrowRight } from "lucide-react";

export function PatchNotesExtractorWidget() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExtract = async () => {
    if (!text.trim()) {
      setError("Por favor, ingresa el texto de las notas del parche.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setParsedResult(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/extract-patch-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al procesar la solicitud");
      }

      setResult(data.result);

      try {
        const parsed = JSON.parse(data.result);
        setParsedResult(parsed);
      } catch (e) {
        console.error("No se pudo parsear el JSON extraído", e);
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPatch = async () => {
    if (!parsedResult || parsedResult.length === 0) return;

    setApplying(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/weapons/apply-patch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ changes: parsedResult }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al aplicar el parche");
      }

      let msg = data.message;
      if (data.errors && data.errors.length > 0) {
        msg += "\nAdvertencias/Errores:\n- " + data.errors.join("\n- ");
        setError(msg); // Mostramos los errores parciales
      } else {
        setSuccessMsg(msg);
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al aplicar.");
    } finally {
      setApplying(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col shadow-xl">
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-100">
            Extractor y Aplicador de Parches
          </h2>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Sección 1: Input y Extracción */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400 flex justify-between items-center">
              <span>1. Texto de las notas del parche</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Pega aquí las notas del parche de Delta Force..."
              className="w-full h-32 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all resize-none"
              disabled={loading || applying}
            />
          </div>

          <button
            onClick={handleExtract}
            disabled={loading || applying || !text.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            {loading ? "Procesando notas con IA..." : "Extraer Cambios"}
          </button>
        </div>

        {/* Mensajes Globales */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm whitespace-pre-wrap">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{successMsg}</p>
          </div>
        )}

        {/* Sección 2: Vista Previa y Aplicación */}
        {parsedResult && parsedResult.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-neutral-800 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-400 flex justify-between items-center">
                <span>2. Vista Previa de Cambios</span>
              </label>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-neutral-400 bg-neutral-900 border-b border-neutral-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">Arma</th>
                      <th className="px-4 py-3 font-medium">Modo</th>
                      <th className="px-4 py-3 font-medium">Estadística</th>
                      <th className="px-4 py-3 font-medium text-center">Valor Anterior</th>
                      <th className="px-4 py-3 font-medium text-center"></th>
                      <th className="px-4 py-3 font-medium text-center">Valor Nuevo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {parsedResult.flatMap((item: any, itemIdx: number) => 
                      item.changes.map((change: any, changeIdx: number) => {
                        const isUp = change.trend === "up";
                        const isDown = change.trend === "down";
                        const SUPPORTED_STATS = ["Daño", "Perforación de blindaje", "Alcance", "Control", "Manejo", "Estabilidad", "Precisión", "Cadencia", "Capacidad", "Velocidad de boca"];
                        const isVariant = item.weapon_name?.includes("(") || 
                                          item.weapon_name?.includes(")") || 
                                          item.weapon_name?.toLowerCase().includes("combo") ||
                                          item.weapon_name?.toLowerCase().includes("cañón");
                        const isDbMatch = change.db_value !== undefined;
                        const isSupportedStat = SUPPORTED_STATS.includes(change.stat);
                        const isSupported = isSupportedStat && isDbMatch && !isVariant;

                        let badgeText = "Omitido";
                        if (isVariant) {
                          badgeText = "Variante/Accesorio";
                        } else if (!isDbMatch && isSupportedStat) {
                          badgeText = "Arma no encontrada";
                        }
                        return (
                          <tr key={`${itemIdx}-${changeIdx}`} className={`transition-colors ${isSupported ? "hover:bg-neutral-900/50" : "opacity-40 bg-neutral-950/80"}`}>
                            <td className={`px-4 py-3 font-medium ${isSupported ? "text-neutral-200" : "text-neutral-500 line-through"}`}>
                              {item.weapon_name}
                            </td>
                            <td className="px-4 py-3 text-neutral-400">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${isSupported ? "bg-neutral-800 text-neutral-300" : "bg-neutral-900 text-neutral-500"}`}>
                                {item.game_mode?.replace(/Operaci[oó]n:\s*/i, "") || item.game_mode}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-neutral-300 flex items-center gap-2">
                              <span className={!isSupported ? "line-through text-neutral-500" : ""}>{change.stat}</span>
                              {!isSupported && <span className="text-[10px] text-orange-500/70 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">{badgeText}</span>}
                            </td>
                            <td className={`px-4 py-3 text-center font-mono text-xs ${isSupported ? "text-neutral-400" : "text-neutral-600 line-through"}`}>
                              <div>{change.old_value}</div>
                              {isSupported && change.db_value !== undefined && (
                                <div className={`text-[10px] mt-1 px-1 py-0.5 rounded inline-block font-sans ${
                                  // Normalizar para comparación flexible (ej: remover 'x' o espacios)
                                  String(change.old_value).toLowerCase().replace(/[^a-z0-9]/g, "") === String(change.db_value).toLowerCase().replace(/[^a-z0-9]/g, "")
                                    ? "text-emerald-500/80 bg-emerald-500/5 border border-emerald-500/10"
                                    : "text-amber-500 font-bold bg-amber-500/5 border border-amber-500/10"
                                }`}>
                                  BD: {change.db_value}
                                </div>
                              )}
                            </td>
                            <td className="px-1 py-3 text-center">
                              <ArrowRight className={`w-3 h-3 inline ${isSupported ? "text-neutral-600" : "text-neutral-700"}`} />
                            </td>
                            <td className={`px-4 py-3 text-center font-mono text-xs font-semibold ${
                              !isSupported ? "text-neutral-600 line-through" : isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-blue-400"
                            }`}>
                              {change.new_value}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={handleApplyPatch}
              disabled={applying}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all shadow-lg shadow-orange-500/20"
            >
              {applying ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {applying ? "Aplicando en la Base de Datos..." : "Aplicar Cambios a Base de Datos"}
            </button>
          </div>
        )}

        {/* Sección Debug/JSON Bruto */}
        {result && (
          <div className="pt-4 border-t border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
              <span className="flex items-center gap-2">
                <Code className="w-3 h-3" />
                JSON Bruto (Debug)
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 hover:text-neutral-300 transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <div className="relative">
              <pre className="w-full h-32 overflow-auto bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-[10px] text-green-500/70 font-mono">
                {result}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
