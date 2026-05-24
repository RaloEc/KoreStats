"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
    Plus,
    Upload,
    Loader2,
    CheckCircle,
    AlertCircle,
    X,
    Crosshair,
    ClipboardPaste,
    ImageIcon,
    Target,
    Activity,
    Zap,
    Gauge,
    Focus,
    Clock,
    Shield,
    Package,
    Wind,
    Volume2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWeaponAnalyzer } from "@/hooks/useWeaponAnalyzer";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const calculateTTK = (damage: number, fireRate: number, penetration: number = 0, armorLevel: number = 0) => {
    if (!damage || !fireRate || damage <= 0 || fireRate <= 0) return 0;

    // Simulación Híbrida Proporcional (Calibración Final con Datos de Campo)
    let hp = 100;
    let armor = armorLevel > 0 ? 100 : 0;
    let b = 0;
    const rps = fireRate / 60;
    const thr = armorLevel * 10;

    const dmgMitigated = damage * 0.45;
    const dmgBody = damage * 0.9;

    while (hp > 0 && b < 50) {
        b++;
        let d = 0;

        if (armor > 0) {
            if (penetration >= armor) {
                // Bala de RUPTURA: Parte del daño es mitigado, parte es pleno
                const ratioArmored = armor / penetration;
                const ratioBody = (penetration - armor) / penetration;
                d = (ratioArmored * dmgMitigated) + (ratioBody * dmgBody);
                armor = 0;
            } else {
                // Bala totalmente bloqueada por blindaje
                d = dmgMitigated;
                armor -= penetration;
            }

            // Ajuste por perforación extrema (Bala V vs Chaleco IV por ej)
            if (penetration >= thr) d = damage * 0.95;
        } else {
            d = dmgBody;
        }
        hp -= d;
    }

    const ttkSeconds = (b - 1) / rps;
    return Math.round(ttkSeconds * 1000);
};

interface AddWeaponFormProps {
    onSuccess?: () => void;
}

export default function AddWeaponForm({ onSuccess }: AddWeaponFormProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [shareCode, setShareCode] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitStatus, setSubmitStatus] = useState<
        "idle" | "submitting" | "success" | "error"
    >("idle");
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [buildName, setBuildName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        status: analyzerStatus,
        stats,
        weaponStatsRecordId,
        startAnalysis,
        clear: clearAnalyzer,
        error: analyzerError,
    } = useWeaponAnalyzer();

    const isAnalyzing =
        analyzerStatus === "uploading" || analyzerStatus === "analyzing";
    const hasStats = analyzerStatus === "success" && stats;

    // Manejar pegado de imagen (Ctrl+V)
    const handlePaste = useCallback(
        (e: ClipboardEvent) => {
            if (!isOpen) return;
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        const file = new File([blob], `pasted-image-${Date.now()}.png`, {
                            type: blob.type,
                        });
                        setSelectedFile(file);
                        clearAnalyzer();

                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            setImagePreview(ev.target?.result as string);
                        };
                        reader.readAsDataURL(file);

                        // Iniciar análisis automáticamente al pegar
                        startAnalysis(file);
                    }
                }
            }
        },
        [isOpen, clearAnalyzer, startAnalysis]
    );

    // Escuchar el evento paste globalmente cuando el form está abierto
    useEffect(() => {
        if (isOpen) {
            window.addEventListener("paste", handlePaste);
            return () => window.removeEventListener("paste", handlePaste);
        }
    }, [isOpen, handlePaste]);

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setSelectedFile(file);
            clearAnalyzer();

            const reader = new FileReader();
            reader.onload = (ev) => {
                setImagePreview(ev.target?.result as string);
            };
            reader.readAsDataURL(file);

            // Iniciar análisis automáticamente al seleccionar
            startAnalysis(file);
        },
        [clearAnalyzer, startAnalysis]
    );

    const handleRemoveFile = useCallback(() => {
        setSelectedFile(null);
        setImagePreview(null);
        clearAnalyzer();
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [clearAnalyzer]);

    const handleSubmit = useCallback(async () => {
        if (!shareCode.trim()) {
            setSubmitError("El código del arma es obligatorio.");
            return;
        }

        if (!weaponStatsRecordId) {
            setSubmitError("Debes analizar una captura de pantalla antes.");
            return;
        }

        setSubmitStatus("submitting");
        setSubmitError(null);

        try {
            const response = await fetch("/api/weapons/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shareCode: shareCode.trim(),
                    weaponStatsRecordId,
                    description: buildName.trim() || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Error al enviar");
            }

            setSubmitStatus("success");

            queryClient.invalidateQueries({
                queryKey: ["delta-force-weapons-meta"],
            });
            queryClient.invalidateQueries({
                queryKey: ["delta-force-weapons"],
            });

            onSuccess?.();

            setTimeout(() => {
                setIsOpen(false);
                setShareCode("");
                setBuildName("");
                setSelectedFile(null);
                setImagePreview(null);
                clearAnalyzer();
                setSubmitStatus("idle");
            }, 2000);
        } catch (err) {
            setSubmitError(
                err instanceof Error ? err.message : "Error desconocido"
            );
            setSubmitStatus("error");
        }
    }, [shareCode, weaponStatsRecordId, buildName, queryClient, onSuccess, clearAnalyzer]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setShareCode("");
        setBuildName("");
        setSelectedFile(null);
        setImagePreview(null);
        clearAnalyzer();
        setSubmitStatus("idle");
        setSubmitError(null);
    }, [clearAnalyzer]);

    if (!user) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="cursor-not-allowed">
                            <Button
                                disabled
                                variant="outline"
                                size="sm"
                                className="h-9 gap-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-400"
                            >
                                <Plus size={14} />
                                <span className="hidden sm:inline">Registrar Arma</span>
                                <span className="sm:hidden">Registrar</span>
                            </Button>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Inicia sesión para registrar armas</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    className="h-9 gap-2 bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all shadow-md border-none font-bold"
                >
                    <Plus size={14} strokeWidth={3} />
                    <span className="hidden sm:inline">Registrar Arma</span>
                    <span className="sm:hidden">Registrar</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="w-[calc(100%-2rem)] md:w-full md:max-w-[950px] p-0 overflow-hidden border-none bg-transparent shadow-2xl">
                <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black overflow-hidden shadow-2xl">
                    <DialogHeader className="hidden">
                        <DialogTitle>Registrar Nueva Arma</DialogTitle>
                    </DialogHeader>
                    {/* Header Display */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <Crosshair size={18} className="text-df-green-500" />
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                Registrar Nueva Arma
                            </h3>
                        </div>
                        {/* <button
                            onClick={handleClose}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button> */}
                    </div>

                    <div className="p-4 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        {/* Step 1: Image Upload (MANDATORY) */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex justify-between">
                                <span className="flex items-center">
                                    <ImageIcon size={12} className="inline mr-1" />
                                    Captura de estadísticas (Obligatoria)
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                                    Sugerencia: puedes pegar con Ctrl+V
                                </span>
                            </label>

                            {!selectedFile ? (
                                <label className="flex flex-col items-center justify-center gap-2 w-full px-4 py-8 rounded-lg border-2 border-dashed border-gray-300 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 cursor-pointer hover:border-df-green-500/40 hover:bg-df-green-500/5 transition-all outline-none">
                                    <Upload size={24} className="text-gray-400 dark:text-gray-500" />
                                    <div className="text-center">
                                        <p className="text-xs text-gray-900 dark:text-gray-100 font-medium">Haz clic o pega la imagen aquí</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Sube la captura de la pantalla de accesorios</p>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </label>
                            ) : (
                                <div className="space-y-3">
                                    {/* Grid Layout: Image + Stats */}
                                    <div className={cn(
                                        "grid grid-cols-1 gap-8",
                                        hasStats ? "md:grid-cols-2 lg:grid-cols-[1fr_1.5fr]" : "grid-cols-1"
                                    )}>
                                        {/* Image Preview Container */}
                                        <div className={cn(
                                            "relative rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-950 group w-fit mx-auto",
                                            "h-64 md:h-[450px]" // Altura mayor para que se vea mejor
                                        )}>
                                            <img
                                                src={imagePreview || ""}
                                                alt="Preview"
                                                className={cn(
                                                    "w-auto h-full object-contain transition-all duration-500",
                                                    isAnalyzing ? "opacity-40 scale-105" : "opacity-100 scale-100",
                                                    analyzerStatus === "error" ? "grayscale opacity-50 contrast-125" : ""
                                                )}
                                            />

                                            {/* Scanning Overlay */}
                                            {isAnalyzing && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                    {/* Scanning Line Animation - Puesta antes para estar detrás */}
                                                    <div className="absolute inset-x-0 h-[2px] bg-df-green-500/50 shadow-[0_0_15px_rgba(132,204,22,0.8)] animate-scan z-0" />

                                                    <div className="relative z-10 flex flex-col items-center gap-2 bg-gray-900/90 px-5 py-3 rounded-xl border border-white/10 shadow-2xl backdrop-blur-sm">
                                                        <Loader2 size={28} className="animate-spin text-df-green-400" />
                                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] animate-pulse">
                                                            Escaneando
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Error Overlay (Comic Error from AI) */}
                                            {analyzerStatus === "error" && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-red-950/20 backdrop-blur-[2px] animate-in fade-in duration-300 z-20">
                                                    <div className="flex flex-col items-center gap-3 bg-red-600/95 px-6 py-5 rounded-2xl border border-red-400 shadow-[0_0_30px_rgba(220,38,38,0.5)] text-white text-center max-w-[280px]">
                                                        <div className="p-2 rounded-full bg-white/20">
                                                            <AlertCircle size={28} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                                                                Captura no válida
                                                            </span>
                                                            <p className="text-xs font-bold leading-tight italic">
                                                                "{analyzerError || "Eso no parece un arma..."}"
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={handleRemoveFile}
                                                            className="mt-1 px-4 py-1.5 bg-white text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-gray-100 transition-colors"
                                                        >
                                                            Subir otra imagen
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={handleRemoveFile}
                                                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100 z-30"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        {/* Stats Preview Card */}
                                        {hasStats && stats && (
                                            <div className="p-4 rounded-xl border border-gray-700/50 dark:border-white/10 bg-[#0a0c10] dark:bg-zinc-950/50 space-y-4 animate-in fade-in slide-in-from-right-4 duration-500 shadow-2xl">
                                                {/* Weapon Name Header */}
                                                {(stats as any).nombreArma && (
                                                    <div className="flex items-center gap-2 pb-2 border-b border-gray-800/50">
                                                        <Target size={16} className="text-emerald-400" />
                                                        <h4 className="text-sm font-black text-white uppercase tracking-wider truncate">
                                                            {(stats as any).nombreArma}
                                                        </h4>
                                                    </div>
                                                )}

                                                {/* Primary Stats */}
                                                <div className="space-y-3">
                                                    {[
                                                        { key: 'dano', label: 'Daño', icon: Crosshair, max: 60, unit: '' },
                                                        { key: 'alcance', label: 'Alcance', icon: Target, max: 100, unit: 'm' },
                                                        { key: 'control', label: 'Control', icon: Activity, max: 100, unit: '' },
                                                        { key: 'manejo', label: 'Manejo', icon: Zap, max: 100, unit: '' },
                                                        { key: 'estabilidad', label: 'Estabilidad', icon: Gauge, max: 100, unit: '' },
                                                        { key: 'precision', label: 'Precisión', icon: Focus, max: 100, unit: '' },
                                                    ].map((stat) => {
                                                        const value = (stats as any)[stat.key] || (stats as any)[stat.key.replace('precision', 'accuracy').replace('manejo', 'handling').replace('estabilidad', 'stability').replace('alcance', 'range').replace('dano', 'damage')] || 0;
                                                        const pct = Math.min((value / stat.max) * 100, 100);
                                                        const Icon = stat.icon;

                                                        return (
                                                            <div key={stat.key} className="flex items-center gap-3">
                                                                <Icon size={14} className="text-gray-500 flex-shrink-0" />
                                                                <span className="text-[11px] font-medium text-gray-400 w-16 flex-shrink-0 text-left">
                                                                    {stat.label}
                                                                </span>
                                                                <div className="flex-1 h-1.5 bg-gray-800/60 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[11px] text-white w-auto text-right whitespace-nowrap">
                                                                    {value}{stat.unit}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Secondary Stats Structured Grid */}
                                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-4 border-t border-gray-800/30">
                                                    {[
                                                        { key: 'cadenciaDisparo', label: 'Cadencia', icon: Clock, unit: 'dpm' },
                                                        { key: 'perforacionBlindaje', label: 'Perforación', icon: Shield, unit: '' },
                                                        { key: 'capacidad', label: 'Capacidad', icon: Package, unit: '' },
                                                        { key: 'velocidadBoca', label: 'Vel. Boca', icon: Wind, unit: ' m/s' },
                                                        { key: 'sonidoDisparo', label: 'Sonido', icon: Volume2, unit: 'm' },
                                                    ].map((stat) => {
                                                        const value = (stats as any)[stat.key] || (stats as any)[stat.key.replace('cadenciaDisparo', 'fireRate').replace('perforacionBlindaje', 'armorPenetration').replace('capacidad', 'capacity').replace('velocidadBoca', 'muzzleVelocity').replace('sonidoDisparo', 'soundRange')] || 0;
                                                        if (!value) return null;
                                                        const Icon = stat.icon;

                                                        return (
                                                            <div key={stat.key} className="flex flex-col items-center text-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
                                                                <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                                                                    <Icon size={14} className="text-gray-400 flex-shrink-0" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <p className="text-[7px] text-gray-500 leading-none uppercase font-bold tracking-tight mb-0.5">
                                                                        {stat.label}
                                                                    </p>
                                                                    <p className="text-[11px] text-gray-100 leading-tight">
                                                                        {value}{stat.unit}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Performance Analysis Insights */}
                                                <div className="pt-3 border-t border-gray-800/30">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Zap size={10} className="text-amber-400" />
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Análisis de Perfil</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        {(() => {
                                                            const s = stats as any;
                                                            const damage = s.damage ?? s.dano ?? 0;
                                                            const handling = s.handling ?? s.manejo ?? 0;
                                                            const accuracy = s.accuracy ?? s.precision ?? 0;
                                                            const fireRate = s.fireRate ?? s.cadenciaDisparo ?? 0;
                                                            const armorPen = s.armorPenetration ?? s.perforacionBlindaje ?? 0;

                                                            let profile = "";
                                                            let color = "";

                                                            if (fireRate > 800 && (s.handling > 70 || s.manejo > 70)) {
                                                                profile = "CQC / Agresiva";
                                                                color = "text-rose-500";
                                                            } else if (accuracy > 80 || s.precision > 80) {
                                                                profile = "Precisión / Larga Distancia";
                                                                color = "text-emerald-500";
                                                            } else if (damage > 40 && fireRate < 600) {
                                                                profile = "Alto Poder / Marksman";
                                                                color = "text-amber-500";
                                                            } else {
                                                                profile = "Versátil / Equilibrada";
                                                                color = "text-df-green-400";
                                                            }

                                                            // Función local para BTK con lógica Proporcional
                                                            const getBTK = (dmg: number, pen: number, armorLvl: number) => {
                                                                if (!dmg) return 0;
                                                                let hp = 100;
                                                                let arm = armorLvl > 0 ? 100 : 0;
                                                                let b = 0;
                                                                const dM = dmg * 0.45;
                                                                const dB = dmg * 0.9;
                                                                while (hp > 0 && b < 50) {
                                                                    b++;
                                                                    let d = 0;
                                                                    if (arm > 0) {
                                                                        if (pen >= arm) {
                                                                            d = (arm / pen * dM) + ((pen - arm) / pen * dB);
                                                                            arm = 0;
                                                                        } else {
                                                                            d = dM;
                                                                            arm -= pen;
                                                                        }
                                                                    } else d = dB;
                                                                    hp -= d;
                                                                }
                                                                return b;
                                                            };

                                                            const dps = Math.round((fireRate / 60) * damage);
                                                            const muzzleVel = s.muzzleVelocity ?? s.velocidadBoca ?? 0; const agilityScore = Math.round(((handling * 0.7) + (muzzleVel / 20)));

                                                            return (
                                                                <>
                                                                    <div className={`col-span-2 py-1 px-3 border-t border-gray-800/20 flex items-center justify-between transition-all`}>
                                                                        <span className={cn("text-[9px] font-black uppercase tracking-wider", color)}>{profile}</span>
                                                                        <span className="text-[8px] text-gray-400 opacity-70 font-bold uppercase italic rounded-md">Recomendado</span>
                                                                    </div>

                                                                    {/* Row 1: Time to Kill & Fire Power */}
                                                                    <TooltipProvider delayDuration={100}>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center cursor-help transition-colors hover:bg-white/10">
                                                                                    <p className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">TTK vs Nivel 4</p>
                                                                                    <div className="flex items-baseline gap-1">
                                                                                        <span className="text-sm font-black text-amber-400">
                                                                                            {(calculateTTK(damage, fireRate, armorPen, 4) / 1000).toFixed(2)}
                                                                                        </span>
                                                                                        <span className="text-[8px] text-gray-400 font-bold uppercase">s</span>
                                                                                    </div>
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="bg-zinc-900 border-white/10 text-[10px] p-2 leading-tight">
                                                                                <p>Tiempo teórico para eliminar a un enemigo con Blindaje Nivel 4.</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>

                                                                    <TooltipProvider delayDuration={100}>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center cursor-help transition-colors hover:bg-white/10">
                                                                                    <p className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">Poder de Fuego</p>
                                                                                    <div className="flex items-baseline gap-1">
                                                                                        <span className="text-sm font-black text-rose-500">
                                                                                            {dps}
                                                                                        </span>
                                                                                        <span className="text-[8px] text-gray-400 font-bold uppercase">dps</span>
                                                                                    </div>
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="bg-zinc-900 border-white/10 text-[10px] p-2 leading-tight">
                                                                                <p>Daño por segundo bruto. Potencial de daño del arma sin blindaje.</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>

                                                                    {/* Row 2: Bullets to Kill & Agility */}
                                                                    <TooltipProvider delayDuration={100}>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center cursor-help transition-colors hover:bg-white/10">
                                                                                    <p className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">Balas p/ Matar</p>
                                                                                    <div className="flex items-baseline gap-1">
                                                                                        <span className="text-sm font-black text-indigo-400">
                                                                                            {getBTK(damage, armorPen, 4)}
                                                                                        </span>
                                                                                        <span className="text-[8px] text-gray-400 font-bold uppercase">BTK</span>
                                                                                    </div>
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="bg-zinc-900 border-white/10 text-[10px] p-2 leading-tight">
                                                                                <p>Cantidad de impactos necesarios contra un chaleco Nivel 4.</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>

                                                                    <TooltipProvider delayDuration={100}>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center cursor-help transition-colors hover:bg-white/10">
                                                                                    <p className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">Movilidad / ADS</p>
                                                                                    <div className="flex items-baseline gap-1">
                                                                                        <span className="text-sm font-black text-emerald-400">
                                                                                            {Math.min(agilityScore, 100)}
                                                                                        </span>
                                                                                        <span className="text-[8px] text-gray-400 font-bold uppercase">pts</span>
                                                                                    </div>
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="bg-zinc-900 border-white/10 text-[10px] p-2 leading-tight">
                                                                                <p>Índice de agilidad. Combina velocidad de apuntado y respuesta táctica.</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Banners */}
                                    {hasStats && (
                                        <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-[10px] text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle size={12} />
                                            <span className="font-medium">
                                                IA: {(stats as any).nombreArma || "Arma detectada correctamente"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Step 2: Share Code */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex justify-between">
                                <span className="flex items-center">
                                    <ClipboardPaste size={12} className="inline mr-1" />
                                    Código del Arma (Obligatorio)
                                </span>
                                {!hasStats && !isAnalyzing && (
                                    <span className="text-[10px] text-orange-500 font-normal">
                                        * Requiere análisis previo
                                    </span>
                                )}
                            </label>
                            <input
                                type="text"
                                value={shareCode}
                                onChange={(e) => setShareCode(e.target.value)}
                                placeholder="Ej: CI-19 Assault Rifle-Warfare-6HLOANO09MFFCME3G7LT2"
                                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-df-green-500/50 focus:ring-1 focus:ring-df-green-500/20 text-sm font-mono transition-all"
                            />
                            <div className="mt-1.5 flex items-center justify-between">
                                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                    {hasStats ? "✓ Listo para registrar" : "Pega el código mientras esperas el análisis"}
                                </p>
                                {shareCode.trim() && (() => {
                                    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                    const lc = norm(shareCode);
                                    const warfareKw = ["warfare", "warzone", "conflict", "conflicto belico", "conflicto bélico", "guerra total", "guerra"];
                                    const opsKw = ["operations", "operation", "extraction", "operacion", "operación", "operaciones", "extraccion", "extracción"];
                                    const isWarfare = warfareKw.some(k => lc.includes(norm(k)));
                                    const isOps = !isWarfare && opsKw.some(k => lc.includes(norm(k)));
                                    if (isWarfare) return (
                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30">
                                            ⚔ Warfare detectado
                                        </span>
                                    );
                                    if (isOps) return (
                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border text-df-green-600 dark:text-df-green-400 bg-df-green-500/10 border-df-green-500/30">
                                            🎯 Operaciones
                                        </span>
                                    );
                                    return (
                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border text-gray-500 bg-gray-500/10 border-gray-500/20 dark:border-white/10">
                                            ? Desconocido
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Step 3: Optional Name (Always Visible) */}
                        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1.5 flex justify-between">
                                <span className="flex items-center">
                                    <Zap size={12} className="inline mr-1 text-amber-500" />
                                    Título de la Build / Nombre (Opcional)
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                                    Máx 25 carac.
                                </span>
                            </label>
                            <input
                                type="text"
                                value={buildName}
                                onChange={(e) => setBuildName(e.target.value.slice(0, 25))}
                                maxLength={25}
                                placeholder="Ej: PvP Beam, Control Extremo, Mi Build..."
                                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 text-sm transition-all shadow-sm"
                            />
                        </div>

                        {/* Submit */}
                        <div className="pt-2 border-t border-gray-100 dark:border-white/10">
                            {submitError && (
                                <div className="flex items-center gap-2 mb-2 py-2 px-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400">
                                    <AlertCircle size={12} />
                                    {submitError}
                                </div>
                            )}

                            {submitStatus === "success" ? (
                                <div className="flex items-center justify-center gap-2 py-2 text-sm text-green-600 dark:text-green-400 font-medium">
                                    <CheckCircle size={16} />
                                    ¡Bravo! Arma y estadísticas registradas.
                                </div>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={
                                        !shareCode.trim() ||
                                        !hasStats ||
                                        submitStatus === "submitting" ||
                                        isAnalyzing
                                    }
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all",
                                        shareCode.trim() && hasStats && submitStatus !== "submitting" && !isAnalyzing
                                            ? "bg-df-green-600 hover:bg-df-green-700 text-white shadow-sm shadow-df-green-600/20"
                                            : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                                    )}
                                >
                                    {submitStatus === "submitting" ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Guardando todo...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={14} />
                                            Finalizar Registro
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
