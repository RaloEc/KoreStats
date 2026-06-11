"use client";

import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    X,
    Crosshair,
    Shield,
    Zap,
    Clock,
    Package,
    Wind,
    Volume2,
    Check,
    Trophy,
    Info,
    Minimize2,
    Maximize2,
    Scale,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend,
    Tooltip as ChartTooltip,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import {
    DEFAULT_WEAPONS,
    DEFAULT_AMMO,
    DEFAULT_GEAR,
    BaseWeapon,
    BaseAmmo,
    BaseGear,
    BaseCaliber,
    calculateDamagePenetration,
    getDamageProfile,
    calculateDamageFalloff,
    simulateTTK,
} from "@/lib/delta-force/defaultData";

const getCaliberImages = (urlStr: string | null | undefined): string[] => {
    if (!urlStr) return [];
    const trimmed = urlStr.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.filter(url => typeof url === "string" && url.trim() !== "");
            }
        } catch (e) {
            console.error("Error parsing caliber image_url JSON:", e);
        }
    }
    return [trimmed];
};

const getFirstImageUrl = (urlStr: string | null | undefined): string => {
    const urls = getCaliberImages(urlStr);
    return urls.length > 0 ? urls[0] : "";
};

interface WeaponMeta {
    id: string;
    record_id: string;
    weapon_name: string;
    description: string | null;
    analyses_count: number;
    avg_damage: number;
    avg_range: number;
    avg_control: number;
    avg_handling: number;
    avg_stability: number;
    avg_accuracy: number;
    avg_fire_rate: number;
    avg_armor_penetration: number;
    avg_capacity: number;
    avg_muzzle_velocity: number;
    avg_sound_range: number;
    overall_score: number;
    tier: "S" | "A" | "B" | "C";
    category: string;
    share_codes: string[];
    image_url: string | null;
    is_official: boolean;
    upvotes: number;
    downvotes: number;
    community_score: number;
    game_mode?: string;
}

interface WeaponCompareViewProps {
    weapons: WeaponMeta[];
    onBack: () => void;
    isFullPage?: boolean;
    onToggleFullPage?: (full: boolean) => void;
}

const WEAPON_COLORS = [
    { border: "border-amber-500", text: "text-amber-500", hex: "#f59e0b", fill: "rgba(245, 158, 11, 0.15)", bg: "bg-amber-500/10" },
    { border: "border-emerald-500", text: "text-emerald-500", hex: "#10b981", fill: "rgba(16, 185, 129, 0.15)", bg: "bg-emerald-500/10" },
    { border: "border-cyan-500", text: "text-cyan-500", hex: "#06b6d4", fill: "rgba(6, 182, 212, 0.15)", bg: "bg-cyan-500/10" },
];

const STAT_LABELS = [
    { key: "avg_damage", label: "Daño", max: 60, isLowerBetter: false },
    { key: "avg_range", label: "Alcance", max: 100, isLowerBetter: false },
    { key: "avg_control", label: "Control", max: 100, isLowerBetter: false },
    { key: "avg_handling", label: "Manejo", max: 100, isLowerBetter: false },
    { key: "avg_stability", label: "Estabilidad", max: 100, isLowerBetter: false },
    { key: "avg_accuracy", label: "Precisión", max: 100, isLowerBetter: false },
];

const EXTRA_STATS = [
    { key: "avg_fire_rate", label: "Cadencia", unit: " dpm", icon: Clock, isLowerBetter: false },
    { key: "avg_armor_penetration", label: "Perforación", unit: "", icon: Shield, isLowerBetter: false },
    { key: "avg_capacity", label: "Capacidad", unit: "", icon: Package, isLowerBetter: false },
    { key: "avg_muzzle_velocity", label: "Velocidad Boca", unit: " m/s", icon: Wind, isLowerBetter: false },
    { key: "avg_sound_range", label: "Rango de Sonido", unit: " m", icon: Volume2, isLowerBetter: true },
];

const TIER_COLORS: Record<number, { selected: string, unselected: string }> = {
    0: {
        selected: "bg-zinc-200 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm",
        unselected: "bg-white dark:bg-zinc-900 border-border text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
    },
    1: {
        selected: "bg-zinc-400/20 border-zinc-400 text-zinc-500 dark:text-zinc-300 shadow-sm",
        unselected: "bg-white dark:bg-zinc-900 border-border text-zinc-400 dark:text-zinc-500 hover:border-zinc-400/50"
    },
    2: {
        selected: "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm",
        unselected: "bg-white dark:bg-zinc-900 border-border text-zinc-400 dark:text-zinc-500 hover:border-emerald-500/50"
    },
    3: {
        selected: "bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm",
        unselected: "bg-white dark:bg-zinc-900 border-border text-zinc-400 dark:text-zinc-500 hover:border-blue-500/50"
    },
    4: {
        selected: "bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-400 shadow-sm",
        unselected: "bg-white dark:bg-zinc-900 border-border text-zinc-400 dark:text-zinc-500 hover:border-purple-500/50"
    },
    5: {
        selected: "bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm",
        unselected: "bg-white dark:bg-zinc-900 border-border text-zinc-400 dark:text-zinc-500 hover:border-amber-500/50"
    },
    6: {
        selected: "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm",
        unselected: "bg-white dark:bg-zinc-900 border-border text-zinc-400 dark:text-zinc-500 hover:border-rose-500/50"
    }
};

const getAmmoLevelStyle = (level: number, isSelected: boolean) => {
    switch (level) {
        case 2:
            return isSelected
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-sm"
                : "border-emerald-500/10 bg-emerald-500/[0.01] hover:bg-emerald-500/5 hover:border-emerald-500/20 text-emerald-600/70 dark:text-emerald-400/60";
        case 3:
            return isSelected
                ? "border-blue-500 bg-blue-500/20 text-blue-700 dark:text-blue-300 shadow-sm"
                : "border-blue-500/10 bg-blue-500/[0.01] hover:bg-blue-500/5 hover:border-blue-500/20 text-blue-600/70 dark:text-blue-400/60";
        case 4:
            return isSelected
                ? "border-purple-500 bg-purple-500/20 text-purple-700 dark:text-purple-300 shadow-sm"
                : "border-purple-500/10 bg-purple-500/[0.01] hover:bg-purple-500/5 hover:border-purple-500/20 text-purple-600/70 dark:text-purple-400/60";
        case 5:
            return isSelected
                ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-sm"
                : "border-amber-500/10 bg-amber-500/[0.01] hover:bg-amber-500/5 hover:border-amber-500/20 text-amber-600/70 dark:text-amber-400/60";
        case 6:
            return isSelected
                ? "border-rose-500 bg-rose-500/20 text-rose-700 dark:text-rose-300 shadow-sm"
                : "border-rose-500/10 bg-rose-500/[0.01] hover:bg-rose-500/5 hover:border-rose-500/20 text-rose-600/70 dark:text-rose-400/60";
        default: // Nivel 1 u otros
            return isSelected
                ? "border-zinc-500 bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 shadow-sm"
                : "border-zinc-300/10 bg-zinc-50/[0.01] hover:bg-zinc-100/10 dark:border-zinc-700/20 dark:bg-zinc-900/[0.01] text-zinc-500/60 dark:text-zinc-400/50";
    }
};

export default function WeaponCompareView({ weapons, onBack, isFullPage = false, onToggleFullPage }: WeaponCompareViewProps) {
    const [armorLevel, setArmorLevel] = useState<number>(4);
    const [bulletLevel, setBulletLevel] = useState<number>(4);
    const [hitZone, setHitZone] = useState<string>("torso");
    const [distance, setDistance] = useState<number>(30);
    const [selectedArmorId, setSelectedArmorId] = useState<string | null>(null);
    const [selectedAmmoMap, setSelectedAmmoMap] = useState<Record<string, string>>({});
    const [armorTab, setArmorTab] = useState<string>("4");

    // Database queries using TanStack Query to reuse cache
    const { data: weaponsData, isLoading: loadingWeapons } = useQuery({
        queryKey: ["df-base-weapons", "operations"], // Asegurar que coincida con el modo de juego activo
        queryFn: () => fetch("/api/games/delta-force/base-data?type=weapons&mode=operations").then(r => r.json()),
        staleTime: 1000 * 60 * 10, // 10 minutos de caché
    });

    const { data: ammoData, isLoading: loadingAmmo } = useQuery({
        queryKey: ["df-base-ammo"],
        queryFn: () => fetch("/api/games/delta-force/base-data?type=ammo").then(r => r.json()),
        staleTime: 1000 * 60 * 10,
    });

    const { data: gearData, isLoading: loadingGear } = useQuery({
        queryKey: ["df-base-gear"],
        queryFn: () => fetch("/api/games/delta-force/base-data?type=gear").then(r => r.json()),
        staleTime: 1000 * 60 * 10,
    });

    const { data: calibersData, isLoading: loadingCalibers } = useQuery({
        queryKey: ["df-base-calibers"],
        queryFn: () => fetch("/api/games/delta-force/base-data?type=calibers").then(r => r.json()),
        staleTime: 1000 * 60 * 10,
    });

    const baseWeapons = weaponsData?.weapons || DEFAULT_WEAPONS;
    const ammos = ammoData?.ammo || DEFAULT_AMMO;
    const gears = gearData?.gear || DEFAULT_GEAR;
    const calibers = calibersData?.calibers || [];
    const isLoadingDb = loadingWeapons || loadingAmmo || loadingGear || loadingCalibers;

    // Sync selectedArmorId when armorLevel or gears change
    useEffect(() => {
        const matchingArmors = gears.filter(g => g.type === "armor" && g.tier === armorLevel);
        if (matchingArmors.length > 0) {
            const isValid = matchingArmors.some(g => g.id === selectedArmorId);
            if (!isValid) {
                setSelectedArmorId(matchingArmors[0].id);
            }
        } else {
            setSelectedArmorId(null);
        }
    }, [armorLevel, gears, selectedArmorId]);

    // Sincronizar/inicializar la munición seleccionada por arma
    useEffect(() => {
        if (!weapons || weapons.length === 0 || !ammos || ammos.length === 0) return;

        const normalizeName = (name: string) => {
            return name
                .replace(/^(Fusil de asalto|Fusil de batalla|Ametralladora ligera|Subfusil|Rifle de francotirador|Rifle de tirador|Pistola|Escopeta)\s+/i, "")
                .trim()
                .toLowerCase();
        };

        const newMap = { ...selectedAmmoMap };
        let updated = false;

        weapons.forEach((w) => {
            if (newMap[w.id]) {
                const exists = ammos.some(a => a.id === newMap[w.id]);
                if (exists) return;
            }

            const baseW = baseWeapons.find((b) => {
                const bName = normalizeName(b.weapon_name);
                const wName = normalizeName(w.weapon_name);
                const bTokens = bName.split(/[^a-z0-9]+/).filter(t => t.length > 0);
                const wTokens = wName.split(/[^a-z0-9]+/).filter(t => t.length > 0);
                if (bTokens.length > 0 && wTokens.length > 0) {
                    return bTokens[0] === wTokens[0];
                }
                return bName === wName;
            });
            const caliber = baseW?.caliber || "5.56x45mm";

            const caliberAmmos = ammos.filter(
                (a) => a.caliber.toLowerCase() === caliber.toLowerCase()
            );

            if (caliberAmmos.length > 0) {
                const defaultBullet = caliberAmmos.find(a => a.penetration_level === 4) || caliberAmmos[0];
                newMap[w.id] = defaultBullet.id;
                updated = true;
            }
        });

        if (updated) {
            setSelectedAmmoMap(newMap);
        }
    }, [weapons, ammos, baseWeapons, selectedAmmoMap]);

    // Lock body scroll while modal is open (only if not full page)
    useEffect(() => {
        if (isFullPage) {
            document.body.style.overflow = "";
            return;
        }
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [isFullPage]);

    const hitZones = [
        { id: "head", label: "Cabeza" },
        { id: "torso", label: "Torso" },
        { id: "abdomen", label: "Abdomen" },
        { id: "legs", label: "Extremidades" },
    ];

    const activeZone = useMemo(() => hitZones.find((z) => z.id === hitZone)!, [hitZone]);

    const radarData = useMemo(() => {
        return STAT_LABELS.map((stat) => {
            const dataPoint: Record<string, any> = { subject: stat.label };
            weapons.forEach((w, idx) => {
                const val = w[stat.key as keyof WeaponMeta] as number;
                const scaledVal = Math.min((val / stat.max) * 100, 100);
                dataPoint[`weapon_${idx}`] = Math.round(scaledVal);
                dataPoint[`weapon_${idx}_raw`] = val;
            });
            return dataPoint;
        });
    }, [weapons]);

    const computedCombatStats = useMemo(() => {
        return weapons.map((w) => {
            // Normalizar nombres para comparación robusta (ej. "Fusil de asalto AKM" -> "akm")
            const normalizeName = (name: string) => {
                return name
                    .replace(/^(Fusil de asalto|Fusil de batalla|Ametralladora ligera|Subfusil|Rifle de francotirador|Rifle de tirador|Pistola|Escopeta)\s+/i, "")
                    .trim()
                    .toLowerCase();
            };

            // Find base weapon to check caliber
            const baseW = baseWeapons.find((b) => {
                const bName = normalizeName(b.weapon_name);
                const wName = normalizeName(w.weapon_name);
                const bTokens = bName.split(/[^a-z0-9]+/).filter(t => t.length > 0);
                const wTokens = wName.split(/[^a-z0-9]+/).filter(t => t.length > 0);
                if (bTokens.length > 0 && wTokens.length > 0) {
                    return bTokens[0] === wTokens[0];
                }
                return bName === wName;
            });
            const caliber = baseW?.caliber || "5.56x45mm";

            // Find matching bullet from delta_force_ammo using selectedAmmoMap
            const ammoId = selectedAmmoMap[w.id];
            const ammo = ammos.find((a) => a.id === ammoId) || ammos.find(
                (a) => a.caliber.toLowerCase() === caliber.toLowerCase() && a.penetration_level === 4
            );

            // Find matching armor from delta_force_gear
            const armor = gears.find(
                (g) => g.id === selectedArmorId
            ) || gears.find(
                (g) => g.type === "armor" && g.tier === armorLevel
            );

            // Calcular multiplicador de zona dinámico según categoría
            const profile = getDamageProfile(w.category);
            let zoneMultiplier = 1.0;
            if (hitZone === "head") zoneMultiplier = profile.head;
            else if (hitZone === "abdomen") zoneMultiplier = profile.abdomen;
            else if (hitZone === "legs") zoneMultiplier = profile.limbs;
            else zoneMultiplier = profile.torso;

            // Simulate TTK using official database stats
            const { ttk, btk } = simulateTTK(
                w.avg_damage,
                w.avg_fire_rate,
                ammo,
                armor,
                zoneMultiplier,
                baseW,
                distance,
                w.category,
                w.game_mode || "operations",
                undefined,
                w.avg_range
            );

            // Caída de daño base para el cálculo de DPS (usando rango del arma)
            const damageAfterFalloff = calculateDamageFalloff(w.avg_damage, distance, w.category, w.avg_range);
            const actualDamage = ammo ? damageAfterFalloff * (ammo.damage_ratio / 100) : damageAfterFalloff;
            const dps = Math.round((w.avg_fire_rate / 60) * actualDamage * 10) / 10;

            // Find matching caliber image
            const caliberObj = calibers.find(
                (c) => c.name.toLowerCase() === caliber.toLowerCase()
            );
            const caliberImageUrl = caliberObj ? getFirstImageUrl(caliberObj.image_url) : null;

            return {
                ttk,
                btk,
                dps,
                ammoName: ammo?.name || "Bala Nv.4",
                armorName: armor?.name || (armorLevel === 0 ? "Sin Chaleco" : `Chaleco Nv.${armorLevel}`),
                caliberImageUrl,
                caliberName: caliber
            };
        });
    }, [weapons, baseWeapons, ammos, gears, calibers, selectedAmmoMap, selectedArmorId, armorLevel, hitZone, distance]);

    const getWinners = (key: string, isLowerBetter: boolean = false) => {
        if (weapons.length < 2) return [];
        let bestValue = isLowerBetter ? Infinity : -Infinity;
        weapons.forEach((w) => {
            const val = w[key as keyof WeaponMeta];
            if (typeof val !== "number") return;
            if (isLowerBetter ? val < bestValue : val > bestValue) bestValue = val;
        });
        const winners: number[] = [];
        weapons.forEach((w, idx) => {
            if (w[key as keyof WeaponMeta] === bestValue) winners.push(idx);
        });
        if (winners.length === weapons.length) return [];
        return winners;
    };

    const getWinnerCalculated = (statKey: "ttk" | "btk" | "dps", isLowerBetter: boolean = false) => {
        if (weapons.length < 2) return [];
        let bestValue = isLowerBetter ? Infinity : -Infinity;
        computedCombatStats.forEach((s) => {
            const val = s[statKey];
            if (isLowerBetter ? val < bestValue : val > bestValue) bestValue = val;
        });
        const winners: number[] = [];
        computedCombatStats.forEach((s, idx) => {
            if (s[statKey] === bestValue) winners.push(idx);
        });
        if (winners.length === weapons.length) return [];
        return winners;
    };

    const winnersMap = useMemo(() => {
        const map: Record<string, number[]> = {};
        STAT_LABELS.forEach((stat) => { map[stat.key] = getWinners(stat.key, stat.isLowerBetter); });
        EXTRA_STATS.forEach((stat) => { map[stat.key] = getWinners(stat.key, stat.isLowerBetter); });
        map["overall_score"] = getWinners("overall_score", false);
        map["ttk"] = getWinnerCalculated("ttk", true);
        map["btk"] = getWinnerCalculated("btk", true);
        map["dps"] = getWinnerCalculated("dps", false);
        return map;
    }, [weapons, computedCombatStats]);

    return (
        <>
            {/* Backdrop — blur only, no dark overlay */}
            {!isFullPage && (
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-40 backdrop-blur-sm"
                        style={{ top: "64px" }}
                        onClick={onBack}
                        aria-hidden="true"
                    />
                </AnimatePresence>
            )}

            {/* Modal/Full-page Panel */}
            <div className={cn(
                isFullPage
                    ? "relative w-full flex flex-col"
                    : "fixed left-0 right-0 top-[88px] bottom-6 z-50 flex flex-col pointer-events-none"
            )}>
                <div className={cn(
                    isFullPage
                        ? "w-full max-w-6xl mx-auto flex flex-col"
                        : "mx-auto w-full max-w-6xl px-4 flex flex-col h-full pointer-events-auto"
                )}>
                    <motion.div
                        initial={isFullPage ? { opacity: 1 } : { opacity: 0, y: "100%", scale: 0.95 }}
                        animate={isFullPage ? { opacity: 1 } : {
                            opacity: 1,
                            y: "0px",
                            scale: 1,
                        }}
                        transition={isFullPage ? { duration: 0 } : {
                            type: "spring",
                            stiffness: 280,
                            damping: 32
                        }}
                        style={{
                            height: isFullPage ? "auto" : "calc(100vh - 112px)"
                        }}
                        className={cn(
                            "relative flex flex-col bg-white dark:bg-zinc-950 border border-gray-200/70 dark:border-white/8 shadow-2xl overflow-hidden rounded-2xl",
                            isFullPage ? "shadow-none border-none dark:bg-black" : ""
                        )}
                    >
                        {/* Modal Header Bar */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/6 flex-shrink-0 bg-white dark:bg-zinc-950 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-df-green-500/15 flex items-center justify-center border border-df-green-500/25">
                                    <Scale size={14} className="text-df-green-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white leading-none">
                                        Comparación Táctica
                                    </p>
                                    <p className="text-[0.625rem] text-gray-400 dark:text-gray-500 font-medium leading-none mt-0.5">
                                        {weapons.length} builds seleccionadas
                                    </p>
                                </div>

                                {/* Weapon name chips */}
                                <div className="hidden sm:flex items-center gap-1.5 ml-2">
                                    {weapons.map((w, idx) => (
                                        <span
                                            key={w.id}
                                            className={cn(
                                                "text-[0.5625rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                                WEAPON_COLORS[idx].bg,
                                                WEAPON_COLORS[idx].border,
                                                WEAPON_COLORS[idx].text
                                            )}
                                        >
                                            {w.description || w.weapon_name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                {!isFullPage && (
                                    <button
                                        onClick={() => {
                                            if (onToggleFullPage) {
                                                onToggleFullPage(true);
                                            }
                                        }}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                                        title="Maximizar a pantalla completa"
                                    >
                                        <ExternalLink size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={onBack}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                    title={isFullPage ? "Volver" : "Cerrar comparador"}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <motion.div
                            transition={{ duration: 0.25 }}
                            className={cn(
                                "flex-1",
                                isFullPage ? "" : "overflow-y-auto overscroll-contain"
                            )}
                        >
                            <div className="p-5 space-y-5">
                                {/* Top Row: Combat Settings + Radar Chart */}
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                                    {/* Combat Settings (Left) */}
                                    <div className="lg:col-span-3 rounded-xl border border-border/60 bg-gray-50 dark:bg-zinc-900/40 p-4 flex flex-col justify-between space-y-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Crosshair className="text-rose-500 w-4 h-4" />
                                                <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                                    Simulador TTK Táctico
                                                </h4>
                                            </div>
                                            <p className="text-[0.625rem] text-muted-foreground mb-4 leading-relaxed">
                                                Ajusta la distancia de combate y la zona de impacto para simular el TTK.
                                            </p>

                                            <div className="space-y-4">
                                                {/* Combat Distance Slider */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <label className="block text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
                                                            Distancia de Combate
                                                        </label>
                                                        <span className="text-xs font-black font-mono text-rose-500">{distance}m</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="5"
                                                        max="150"
                                                        step="5"
                                                        value={distance}
                                                        onChange={(e) => setDistance(parseInt(e.target.value))}
                                                        className="w-full h-1 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                                    />
                                                </div>

                                                {/* Hit Zone */}
                                                <div>
                                                    <label className="block text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                                        Zona de Impacto
                                                    </label>
                                                    <div className="flex gap-1.5">
                                                        {hitZones.map((zone) => (
                                                            <button
                                                                key={zone.id}
                                                                onClick={() => setHitZone(zone.id)}
                                                                className={cn(
                                                                    "py-2 rounded-xl text-[0.625rem] font-black transition-all flex-1 text-center border",
                                                                    hitZone === zone.id
                                                                        ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/20"
                                                                        : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                                )}
                                                            >
                                                                {zone.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Radar Chart (Right) */}
                                    <div className="lg:col-span-2 rounded-xl border border-border/60 bg-gray-50 dark:bg-zinc-900/40 p-4 flex flex-col justify-center items-center">
                                        <div className="w-full h-[220px] sm:h-[240px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart 
                                                    cx="50%" 
                                                    cy="50%" 
                                                    outerRadius="72%" 
                                                    data={radarData}
                                                    margin={{ top: 15, right: 25, bottom: 5, left: 25 }}
                                                >
                                                    <PolarGrid stroke="#27272a" strokeDasharray="3 3" />
                                                    <PolarAngleAxis
                                                        dataKey="subject"
                                                        tick={{ fill: "#a1a1aa", fontSize: 9, fontWeight: "bold" }}
                                                    />
                                                    <PolarRadiusAxis 
                                                        angle={30} 
                                                        domain={[0, 100]} 
                                                        tick={{ fill: "#52525b", fontSize: 7 }} 
                                                        axisLine={false}
                                                        tickLine={false}
                                                    />
                                                    {weapons.map((w, idx) => (
                                                        <Radar
                                                            key={w.id}
                                                            name={w.description || w.weapon_name}
                                                            dataKey={`weapon_${idx}`}
                                                            stroke={WEAPON_COLORS[idx].hex}
                                                            fill={WEAPON_COLORS[idx].hex}
                                                            fillOpacity={0.15}
                                                            strokeWidth={2}
                                                            dot={{ r: 3, strokeWidth: 1, fill: WEAPON_COLORS[idx].hex }}
                                                        />
                                                    ))}
                                                    <ChartTooltip
                                                        contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: "8px" }}
                                                        labelStyle={{ fontWeight: "bold", color: "#fff", fontSize: 10 }}
                                                        itemStyle={{ fontSize: 9, fontWeight: "bold" }}
                                                        formatter={(value: any, name: any, props: any) => {
                                                            const dataKey = props.dataKey as string;
                                                            const idxStr = dataKey.split("_")[1] || "0";
                                                            const idx = parseInt(idxStr);
                                                            const rawVal = props.payload[`weapon_${idx}_raw`];
                                                            const displayName = weapons[idx]?.description || weapons[idx]?.weapon_name || name;
                                                            return [`${rawVal} pts (${value}%)`, displayName];
                                                        }}
                                                    />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Custom Legend outside SVG */}
                                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2 pt-2 border-t border-border/40 w-full">
                                            {weapons.map((w, idx) => (
                                                <div key={w.id} className="flex items-center gap-1.5">
                                                    <span className={cn("w-2.5 h-2.5 rounded-sm border", WEAPON_COLORS[idx].bg, WEAPON_COLORS[idx].border)} />
                                                    <span className={cn("text-[0.5625rem] font-black uppercase tracking-wider", WEAPON_COLORS[idx].text)}>
                                                        {w.description || w.weapon_name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* Vest Selection (Full Width) */}
                                {!weapons.every(w => w.game_mode === 'warfare') && (
                                    <div className="space-y-3 pt-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                                            <label className="block text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
                                                Chaleco del Oponente (Filtro por Nivel)
                                            </label>
                                            
                                            {/* Pestañas de Nivel */}
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    { id: "all", label: "Todos" },
                                                    { id: "0", label: "Sin Blindaje" },
                                                    { id: "1", label: "Nv.1" },
                                                    { id: "2", label: "Nv.2" },
                                                    { id: "3", label: "Nv.3" },
                                                    { id: "4", label: "Nv.4" },
                                                    { id: "5", label: "Nv.5" },
                                                    { id: "6", label: "Nv.6" }
                                                ].map((tab) => {
                                                    const isActive = armorTab === tab.id;
                                                    let activeClass = "bg-zinc-800 text-white border-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100";
                                                    if (tab.id === "0") activeClass = "bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 border-zinc-400";
                                                    else if (tab.id === "1") activeClass = "bg-zinc-400/20 text-zinc-700 dark:text-zinc-300 border-zinc-400";
                                                    else if (tab.id === "2") activeClass = "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500";
                                                    else if (tab.id === "3") activeClass = "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500";
                                                    else if (tab.id === "4") activeClass = "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500";
                                                    else if (tab.id === "5") activeClass = "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500";
                                                    else if (tab.id === "6") activeClass = "bg-rose-500/20 text-rose-600 dark:text-rose-450 border-rose-500";

                                                    return (
                                                        <button
                                                            key={tab.id}
                                                            onClick={() => setArmorTab(tab.id)}
                                                            className={cn(
                                                                "px-2.5 py-1 rounded-md border text-[0.5625rem] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm",
                                                                isActive
                                                                    ? `${activeClass} border-2`
                                                                    : "border-border/60 bg-white dark:bg-zinc-950 text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-foreground"
                                                            )}
                                                        >
                                                            {tab.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Rejilla de Opciones */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
                                            {(armorTab === "all" || armorTab === "0") && (
                                                <button
                                                    onClick={() => {
                                                        setArmorLevel(0);
                                                        setSelectedArmorId(null);
                                                    }}
                                                    className={cn(
                                                        "flex flex-row items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer shadow-sm w-full",
                                                        armorLevel === 0
                                                            ? "border-rose-500 bg-rose-500/10 shadow-sm border-2"
                                                            : "border-border/60 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                                    )}
                                                >
                                                    <div className="w-11 h-11 rounded bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-border/50 overflow-hidden shrink-0">
                                                        <Shield size={18} className="text-zinc-400" />
                                                    </div>
                                                    <div className="min-w-0 leading-tight">
                                                        <span className="text-[0.625rem] font-black uppercase text-foreground block truncate">Sin Chaleco</span>
                                                        <span className="text-[0.5rem] font-bold text-muted-foreground mt-0.5 block">Nivel 0 · 0 Dur.</span>
                                                    </div>
                                                </button>
                                            )}

                                            {gears
                                                .filter((g) => g.type === "armor" && (armorTab === "all" || g.tier === parseInt(armorTab)))
                                                .sort((a, b) => a.tier - b.tier)
                                                .map((g) => {
                                                    const isSelected = selectedArmorId === g.id || (selectedArmorId === null && armorLevel === g.tier && armorLevel !== 0);
                                                    
                                                    let activeBorder = "border-zinc-400 bg-zinc-500/10";
                                                    if (g.tier === 1) activeBorder = "border-zinc-400 bg-zinc-400/10";
                                                    else if (g.tier === 2) activeBorder = "border-emerald-500 bg-emerald-500/10";
                                                    else if (g.tier === 3) activeBorder = "border-blue-500 bg-blue-500/10";
                                                    else if (g.tier === 4) activeBorder = "border-purple-500 bg-purple-500/10";
                                                    else if (g.tier === 5) activeBorder = "border-amber-500 bg-amber-500/10";
                                                    else if (g.tier === 6) activeBorder = "border-rose-500 bg-rose-500/10";

                                                    return (
                                                        <button
                                                            key={g.id}
                                                            onClick={() => {
                                                                setArmorLevel(g.tier);
                                                                setSelectedArmorId(g.id);
                                                            }}
                                                            className={cn(
                                                                "flex flex-row items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer shadow-sm w-full",
                                                                isSelected
                                                                    ? `${activeBorder} border-2 shadow-sm`
                                                                    : "border-border/60 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                                            )}
                                                        >
                                                            <div className="w-11 h-11 rounded bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-border/50 overflow-hidden shrink-0">
                                                                {g.image_url ? (
                                                                    <div className="relative w-full h-full">
                                                                        <Image
                                                                            src={getFirstImageUrl(g.image_url)}
                                                                            alt={g.name}
                                                                            fill
                                                                            sizes="44px"
                                                                            className="object-contain p-0.5"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <Shield size={16} className="text-zinc-400" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 leading-tight">
                                                                <span className="text-[0.625rem] font-black uppercase text-foreground block truncate" title={g.name}>
                                                                    {g.name}
                                                                </span>
                                                                <span className="text-[0.5rem] font-bold text-muted-foreground mt-0.5 block">
                                                                    Nivel {g.tier} · {g.max_durability} Dur.
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}

                                {/* Ammo Selection per Weapon (Full Width) */}
                                {!weapons.every(w => w.game_mode === 'warfare') && (
                                    <div className="space-y-2 pt-1">
                                        <label className="block text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest">
                                            Munición por Arma
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {weapons.map((w, idx) => {
                                                const normalizeName = (name: string) => {
                                                    return name
                                                        .replace(/^(Fusil de asalto|Fusil de batalla|Ametralladora ligera|Subfusil|Rifle de francotirador|Rifle de tirador|Pistola|Escopeta)\s+/i, "")
                                                        .trim()
                                                        .toLowerCase();
                                                };
                                                const baseW = baseWeapons.find((b) => {
                                                     const bName = normalizeName(b.weapon_name);
                                                     const wName = normalizeName(w.weapon_name);
                                                     const bTokens = bName.split(/[^a-z0-9]+/).filter(t => t.length > 0);
                                                     const wTokens = wName.split(/[^a-z0-9]+/).filter(t => t.length > 0);
                                                     if (bTokens.length > 0 && wTokens.length > 0) {
                                                         return bTokens[0] === wTokens[0];
                                                     }
                                                     return bName === wName;
                                                 });
                                                const caliber = baseW?.caliber || "5.56x45mm";
                                                const caliberAmmos = ammos.filter(
                                                    (a) => a.caliber.toLowerCase() === caliber.toLowerCase()
                                                ).sort((a, b) => a.penetration_level - b.penetration_level);

                                                const selectedAmmoId = selectedAmmoMap[w.id];

                                                return (
                                                    <div key={w.id} className="p-3 bg-white dark:bg-zinc-950 border border-border/85 rounded-xl space-y-2 flex flex-col justify-between shadow-sm">
                                                        <div className="flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                                                            <div className={cn("w-1.5 h-3.5 rounded-full", WEAPON_COLORS[idx].bg, WEAPON_COLORS[idx].border, "border")} />
                                                            <div className="min-w-0 leading-none">
                                                                <span className="text-[0.625rem] font-black uppercase text-zinc-700 dark:text-zinc-300 truncate block">
                                                                    {w.description || w.weapon_name}
                                                                </span>
                                                                <span className="text-[0.5rem] font-bold text-muted-foreground block mt-0.5">
                                                                    Calibre: {caliber}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap gap-1.5">
                                                            {caliberAmmos.map((a) => {
                                                                const isSelected = selectedAmmoId === a.id;
                                                                const levelStyle = getAmmoLevelStyle(a.penetration_level, isSelected);

                                                                return (
                                                                    <button
                                                                        key={a.id}
                                                                        onClick={() => setSelectedAmmoMap(prev => ({ ...prev, [w.id]: a.id }))}
                                                                        className={cn(
                                                                            "flex items-center gap-2 p-1.5 rounded-lg border text-left shrink-0 transition-all cursor-pointer w-[calc(50%-4px)] sm:w-[145px]",
                                                                            levelStyle,
                                                                            isSelected ? "border-2 shadow-sm scale-[1.02]" : "border hover:brightness-105"
                                                                        )}
                                                                    >
                                                                        <div className="w-11 h-11 rounded bg-white dark:bg-zinc-950 border border-border/50 shrink-0 flex items-center justify-center overflow-hidden">
                                                                            {a.image_url ? (
                                                                                <div className="relative w-full h-full">
                                                                                    <Image
                                                                                        src={getFirstImageUrl(a.image_url)}
                                                                                        alt={a.name}
                                                                                        fill
                                                                                        sizes="44px"
                                                                                        className="object-contain p-0.5"
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <Package className="w-5 h-5 text-zinc-400" />
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0 leading-none flex-1">
                                                                            <span className="text-[0.5625rem] font-bold text-foreground truncate block w-full" title={a.name}>
                                                                                {a.name}
                                                                            </span>
                                                                            <span className="text-[0.45rem] font-extrabold text-muted-foreground block mt-1">
                                                                                Nv.{a.penetration_level}
                                                                            </span>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                         </div>
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                     </div>
                                 )}

                                 {/* Info Footnote */}
                                 <p className="text-[0.5625rem] text-gray-400 dark:text-zinc-500 italic leading-snug">
                                     * Simula el desgaste de durabilidad del chaleco bala tras bala. Proyectiles de menor nivel infligen daño mitigado hasta romper el blindaje.
                                 </p>

                                {/* TTK result cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/60">
                                    {weapons.map((w, idx) => {
                                        const isTtkWinner = winnersMap["ttk"].includes(idx);
                                        return (
                                            <div
                                                key={w.id}
                                                className={cn(
                                                    "p-2.5 rounded-xl border flex flex-col gap-0.5 justify-between min-h-[96px]",
                                                    isTtkWinner
                                                        ? "border-df-green-500/40 bg-df-green-500/8"
                                                        : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40"
                                                )}
                                            >
                                                            <div>
                                                                <span className={cn(
                                                                    "text-[0.5625rem] font-black uppercase tracking-tight truncate block",
                                                                    isTtkWinner ? "text-df-green-500" : "text-gray-400 dark:text-zinc-500"
                                                                )}>
                                                                    {w.description || w.weapon_name}
                                                                </span>
                                                                <p className="text-sm font-black font-mono leading-none text-foreground flex items-baseline gap-1 mt-0.5">
                                                                    {computedCombatStats[idx].ttk.toFixed(2)}
                                                                    <span className="text-[0.5625rem] text-muted-foreground font-bold">s</span>
                                                                    {isTtkWinner && <Check size={11} strokeWidth={3} className="text-df-green-500 ml-0.5" />}
                                                                </p>
                                                                <p className="text-[0.5625rem] font-bold text-muted-foreground leading-none mt-0.5">
                                                                    {computedCombatStats[idx].btk} balas
                                                                </p>
                                                            </div>
                                                            <div className="mt-1.5 pt-1 border-t border-border/20 text-[0.5rem] text-muted-foreground space-y-1.5 leading-none">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <div className="w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-900 border border-border/50 shrink-0 flex items-center justify-center">
                                                                        {computedCombatStats[idx].caliberImageUrl ? (
                                                                            <div className="relative w-full h-full">
                                                                                <Image
                                                                                    src={computedCombatStats[idx].caliberImageUrl}
                                                                                    alt={computedCombatStats[idx].caliberName}
                                                                                    fill
                                                                                    sizes="20px"
                                                                                    className="object-contain p-0.5"
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <Package className="w-2.5 h-2.5 text-zinc-400" />
                                                                        )}
                                                                    </div>
                                                                    <span className="truncate block font-semibold text-foreground text-[0.5625rem] flex-1" title={computedCombatStats[idx].ammoName}>
                                                                        {computedCombatStats[idx].ammoName}
                                                                    </span>
                                                                </div>
                                                                <p className="truncate block pl-0.5" title={computedCombatStats[idx].armorName}>🛡️ {computedCombatStats[idx].armorName}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                    {/* Stat Matrix Table */}
                                    <div className="rounded-xl border border-border overflow-hidden bg-gray-50 dark:bg-zinc-900/20">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse min-w-[600px]">
                                                <thead>
                                                    <tr className="border-b border-border bg-gray-100 dark:bg-zinc-900/60">
                                                        <th className="p-3.5 text-[0.625rem] font-black uppercase text-muted-foreground tracking-wider w-[200px]">
                                                            Atributos y Métricas
                                                        </th>
                                                        {weapons.map((w, idx) => (
                                                            <th
                                                                key={w.id}
                                                                className={cn("p-3.5 text-center border-l border-border", WEAPON_COLORS[idx].text)}
                                                            >
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className="text-xs font-black uppercase tracking-wider block truncate max-w-[180px]">
                                                                        {w.description || w.weapon_name}
                                                                    </span>
                                                                    {w.description && (
                                                                        <span className="text-[0.5625rem] text-gray-400 font-bold block uppercase tracking-tighter">
                                                                            {w.weapon_name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/60">
                                                    {/* Overall Score */}
                                                    <tr className="hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                                                        <td className="p-3.5 text-xs font-bold text-foreground flex items-center gap-2">
                                                            <Trophy size={13} className="text-amber-500" />
                                                            <span>Puntaje de Eficacia</span>
                                                        </td>
                                                        {weapons.map((w, idx) => {
                                                            const isWin = winnersMap["overall_score"].includes(idx);
                                                            return (
                                                                <td key={w.id} className={cn("p-3.5 text-center font-mono text-sm border-l border-border font-black", isWin && "bg-df-green-500/10 text-df-green-500")}>
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <span>{w.overall_score}</span>
                                                                        {isWin && <Check size={13} strokeWidth={3} className="text-df-green-500" />}
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>

                                                    {/* TTK */}
                                                    <tr className="hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                                                        <td className="p-3.5 text-xs font-bold text-foreground">
                                                            <div className="flex items-center gap-2">
                                                                <Crosshair size={13} className="text-rose-500" />
                                                                <span>Tiempo para Matar (TTK)</span>
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Info size={10} className="text-muted-foreground cursor-help" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="bg-zinc-900 border-white/10 text-[0.625rem] p-2">
                                                                            <p>Vs Chaleco Nv.{armorLevel} · {activeZone.label.split(" ")[0]}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </div>
                                                        </td>
                                                        {weapons.map((w, idx) => {
                                                            const isWin = winnersMap["ttk"].includes(idx);
                                                            return (
                                                                <td key={w.id} className={cn("p-3.5 text-center font-mono text-sm border-l border-border font-black", isWin && "bg-df-green-500/10 text-df-green-500")}>
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <span>{computedCombatStats[idx].ttk.toFixed(2)}s</span>
                                                                        {isWin && <Check size={13} strokeWidth={3} />}
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>

                                                    {/* BTK */}
                                                    <tr className="hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                                                        <td className="p-3.5 text-xs font-bold text-foreground">
                                                            <div className="flex items-center gap-2">
                                                                <Shield size={13} className="text-blue-400" />
                                                                <span>Balas para Matar (BTK)</span>
                                                            </div>
                                                        </td>
                                                        {weapons.map((w, idx) => {
                                                            const isWin = winnersMap["btk"].includes(idx);
                                                            return (
                                                                <td key={w.id} className={cn("p-3.5 text-center font-mono text-sm border-l border-border font-black", isWin && "bg-df-green-500/10 text-df-green-500")}>
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <span>{computedCombatStats[idx].btk}</span>
                                                                        {isWin && <Check size={13} strokeWidth={3} />}
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>

                                                    {/* DPS */}
                                                    <tr className="hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                                                        <td className="p-3.5 text-xs font-bold text-foreground">
                                                            <div className="flex items-center gap-2">
                                                                <Zap size={13} className="text-amber-500" />
                                                                <span>Daño por Segundo (DPS)</span>
                                                            </div>
                                                        </td>
                                                        {weapons.map((w, idx) => {
                                                            const isWin = winnersMap["dps"].includes(idx);
                                                            return (
                                                                <td key={w.id} className={cn("p-3.5 text-center font-mono text-sm border-l border-border font-black", isWin && "bg-df-green-500/10 text-df-green-500")}>
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <span>{computedCombatStats[idx].dps}</span>
                                                                        {isWin && <Check size={13} strokeWidth={3} />}
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>

                                                    {/* Section: Primary Stats */}
                                                    <tr className="bg-gray-100/50 dark:bg-zinc-900/30">
                                                        <td className="p-2 pl-3.5 text-[0.5625rem] font-black uppercase text-muted-foreground tracking-widest" colSpan={weapons.length + 1}>
                                                            Estadísticas Base y Manejo
                                                        </td>
                                                    </tr>

                                                    {STAT_LABELS.map((stat) => (
                                                        <tr key={stat.key} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                                                            <td className="p-3.5 text-xs font-bold text-foreground">{stat.label}</td>
                                                            {weapons.map((w, idx) => {
                                                                const val = w[stat.key as keyof WeaponMeta] as number;
                                                                const isWin = winnersMap[stat.key].includes(idx);
                                                                return (
                                                                    <td key={w.id} className={cn("p-3.5 text-center font-mono text-xs border-l border-border", isWin && "bg-df-green-500/10 text-df-green-500 font-bold")}>
                                                                        <div className="flex items-center justify-center gap-1.5">
                                                                            <span>{val}</span>
                                                                            {isWin && <Check size={11} strokeWidth={3} />}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}

                                                    {/* Section: Secondary Stats */}
                                                    <tr className="bg-gray-100/50 dark:bg-zinc-900/30">
                                                        <td className="p-2 pl-3.5 text-[0.5625rem] font-black uppercase text-muted-foreground tracking-widest" colSpan={weapons.length + 1}>
                                                            Cargador y Munición
                                                        </td>
                                                    </tr>

                                                    {EXTRA_STATS.map((stat) => (
                                                        <tr key={stat.key} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                                                            <td className="p-3.5 text-xs font-bold text-foreground">
                                                                <div className="flex items-center gap-2">
                                                                    <stat.icon size={12} className="text-gray-400" />
                                                                    <span>{stat.label}</span>
                                                                </div>
                                                            </td>
                                                            {weapons.map((w, idx) => {
                                                                const val = w[stat.key as keyof WeaponMeta] as number;
                                                                const isWin = winnersMap[stat.key].includes(idx);
                                                                return (
                                                                    <td key={w.id} className={cn("p-3.5 text-center font-mono text-xs border-l border-border", isWin && "bg-df-green-500/10 text-df-green-500 font-bold")}>
                                                                        <div className="flex items-center justify-center gap-1.5">
                                                                            <span>{val}{stat.unit}</span>
                                                                            {isWin && <Check size={11} strokeWidth={3} />}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}

                                                    {/* Section: Share Codes */}
                                                    <tr className="bg-gray-100/50 dark:bg-zinc-900/30">
                                                        <td className="p-2 pl-3.5 text-[0.5625rem] font-black uppercase text-muted-foreground tracking-widest" colSpan={weapons.length + 1}>
                                                            Códigos de Armería
                                                        </td>
                                                    </tr>
                                                    <tr className="hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                                                        <td className="p-3.5 text-xs font-bold text-foreground">Código del Armero</td>
                                                        {weapons.map((w) => {
                                                            const code = w.share_codes?.[0];
                                                            return (
                                                                <td key={w.id} className="p-3.5 text-center border-l border-border">
                                                                    {code ? (
                                                                        <div className="max-w-[200px] mx-auto">
                                                                            <ShareCodeCompareChip code={code} />
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[0.625rem] text-muted-foreground italic">Sin código</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </>
    );
}

function ShareCodeCompareChip({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed:", err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/80 text-xs font-black uppercase transition-all bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground truncate shadow-sm"
            title={code}
        >
            <span className="truncate w-full block text-left font-mono">{code}</span>
            {copied ? (
                <span className="text-[0.5625rem] font-black text-df-green-500 flex-shrink-0 animate-pulse">Copiado</span>
            ) : (
                <span className="text-[0.5625rem] font-black text-muted-foreground flex-shrink-0">Copiar</span>
            )}
        </button>
    );
}
