"use client";

import { useState, useMemo, useEffect } from "react";
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
}

interface WeaponCompareViewProps {
    weapons: WeaponMeta[];
    onBack: () => void;
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

const simulateTTK = (
    weaponDamage: number,
    fireRate: number,
    ammo: BaseAmmo | undefined,
    armor: BaseGear | undefined,
    zoneMultiplier: number,
    baseW: BaseWeapon | undefined
) => {
    if (!weaponDamage || !fireRate || weaponDamage <= 0 || fireRate <= 0) return { ttk: 0, btk: 0 };

    const rps = fireRate / 60;
    let hp = 100;
    
    // Scale damage based on build's performance relative to base weapon
    const bulletDamage = ammo ? weaponDamage * (ammo.damage_ratio / 100) : weaponDamage;
    const penetrationLevel = ammo ? ammo.penetration_level : 3;
    const penetration = penetrationLevel * 10 + 5;
    
    // Get armor durability damage multiplier based on armor tier
    const armorTier = armor ? armor.tier : 0;
    const armorDamageMult = ammo ? calculateDamagePenetration(penetrationLevel, armorTier) / 100 : 1.0;
    const armorDamage = 15 * armorDamageMult;
    
    let durability = armor ? armor.max_durability : 0;
    
    // Material multiplier for durability damage
    let materialMult = 1.0;
    if (armor) {
        switch (armor.material.toLowerCase()) {
            case "acero": materialMult = 0.7; break;
            case "titanio": materialMult = 0.6; break;
            case "cerámica": materialMult = 1.3; break;
            case "polietileno": materialMult = 0.9; break;
            case "aramida": default: materialMult = 1.0; break;
        }
    }

    let btk = 0;
    
    while (hp > 0 && btk < 30) {
        btk++;
        let currentDamage = bulletDamage * zoneMultiplier;
        
        if (armorTier > 0 && durability > 0) {
            // Check penetration: comparing penetration rating vs (armorTier * 10)
            const penetrationDiff = penetration - (armorTier * 10);
            
            if (penetrationDiff >= 0) {
                // Bullet penetrates armor
                // We scale mitigation based on how easily the bullet penetrates:
                // - Same tier (diff <= 5, e.g. Nv.5 vs Nv.5): 50% mitigation (multiplier 0.50)
                // - 1 tier above (diff <= 15, e.g. Nv.5 vs Nv.4): 25% mitigation (multiplier 0.75, matches M995 vs Nv.4)
                // - 2+ tiers above (diff >= 25): clean pen, very little mitigation (~5%)
                let mitigation = 0.95;
                if (penetrationDiff <= 5) {
                    mitigation = 0.50;
                } else if (penetrationDiff <= 15) {
                    mitigation = 0.75;
                } else if (penetrationDiff <= 25) {
                    mitigation = 0.88;
                }
                
                currentDamage = currentDamage * mitigation;
                // Armor takes durability damage based on ammo efficiency and material multiplier
                durability -= Math.max(2, armorDamage * materialMult);
            } else {
                // Bullet fails to penetrate (mitigated to 0 direct HP damage in Delta Force)
                currentDamage = 0;
                // Armor takes durability damage (no artificial 1.5x multiplier since efficiency is defined by database stats)
                durability -= Math.max(2, armorDamage * materialMult);
            }
            if (durability < 0) durability = 0;
        }
        
        hp -= currentDamage;
    }

    const ttkSeconds = (btk - 1) / rps;
    return {
        ttk: Math.round(ttkSeconds * 1000),
        btk,
    };
};

export default function WeaponCompareView({ weapons, onBack }: WeaponCompareViewProps) {
    const [armorLevel, setArmorLevel] = useState<number>(4);
    const [bulletLevel, setBulletLevel] = useState<number>(4);
    const [hitZone, setHitZone] = useState<string>("torso");
    const [isMinimized, setIsMinimized] = useState(false);

    // Database states initialized with static defaults
    const [baseWeapons, setBaseWeapons] = useState<BaseWeapon[]>(DEFAULT_WEAPONS);
    const [ammos, setAmmos] = useState<BaseAmmo[]>(DEFAULT_AMMO);
    const [gears, setGears] = useState<BaseGear[]>(DEFAULT_GEAR);
    const [calibers, setCalibers] = useState<BaseCaliber[]>([]);
    const [isLoadingDb, setIsLoadingDb] = useState(true);

    // Fetch official assets in the background to override static defaults
    useEffect(() => {
        let isMounted = true;
        Promise.all([
            fetch("/api/games/delta-force/base-data?type=weapons").then(r => r.json()),
            fetch("/api/games/delta-force/base-data?type=ammo").then(r => r.json()),
            fetch("/api/games/delta-force/base-data?type=gear").then(r => r.json()),
            fetch("/api/games/delta-force/base-data?type=calibers").then(r => r.json())
        ]).then(([weaponsRes, ammoRes, gearRes, calibersRes]) => {
            if (!isMounted) return;
            if (weaponsRes.weapons) setBaseWeapons(weaponsRes.weapons);
            if (ammoRes.ammo) setAmmos(ammoRes.ammo);
            if (gearRes.gear) setGears(gearRes.gear);
            if (calibersRes.calibers) setCalibers(calibersRes.calibers);
            setIsLoadingDb(false);
        }).catch(err => {
            console.error("Error fetching comparison database assets:", err);
            if (isMounted) setIsLoadingDb(false);
        });
        return () => { isMounted = false; };
    }, []);

    // Lock body scroll while modal is open
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    const hitZones = [
        { id: "head", label: "Cabeza (1.5x)", multiplier: 1.5 },
        { id: "torso", label: "Torso (1.0x)", multiplier: 1.0 },
        { id: "legs", label: "Extremidades (0.75x)", multiplier: 0.75 },
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
            // Find base weapon to check caliber
            const baseW = baseWeapons.find(
                (b) => b.weapon_name.toLowerCase() === w.weapon_name.toLowerCase()
            );
            const caliber = baseW?.caliber || "5.56x45mm";

            // Find matching bullet from delta_force_ammo using case-insensitive check
            const ammo = ammos.find(
                (a) => a.caliber.toLowerCase() === caliber.toLowerCase() && a.penetration_level === bulletLevel
            );

            // Find matching armor from delta_force_gear
            const armor = gears.find(
                (g) => g.type === "armor" && g.tier === armorLevel
            );

            // Simulate TTK using official database stats
            const { ttk, btk } = simulateTTK(
                w.avg_damage,
                w.avg_fire_rate,
                ammo,
                armor,
                activeZone.multiplier,
                baseW
            );

            const actualDamage = ammo ? w.avg_damage * (ammo.damage_ratio / 100) : w.avg_damage;
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
                ammoName: ammo?.name || `Bala Nv.${bulletLevel}`,
                armorName: armor?.name || (armorLevel === 0 ? "Sin Chaleco" : `Chaleco Nv.${armorLevel}`),
                caliberImageUrl,
                caliberName: caliber
            };
        });
    }, [weapons, baseWeapons, ammos, gears, calibers, bulletLevel, armorLevel, activeZone]);

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
            <AnimatePresence>
                {!isMinimized && (
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
                )}
            </AnimatePresence>

            {/* Modal Panel */}
            <div className="fixed left-0 right-0 top-[88px] bottom-6 z-50 flex flex-col pointer-events-none">
                <div className="mx-auto w-full max-w-6xl px-4 flex flex-col h-full pointer-events-auto">
                    <motion.div
                        initial={{ opacity: 0, y: "100%", scale: 0.95 }}
                        animate={{
                            opacity: 1,
                            y: isMinimized ? "calc(100% - 60px)" : "0px",
                            scale: 1,
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 280,
                            damping: 32
                        }}
                        style={{
                            height: "calc(100vh - 112px)"
                        }}
                        className="relative flex flex-col bg-white dark:bg-zinc-950 border border-gray-200/70 dark:border-white/8 shadow-2xl overflow-hidden rounded-2xl"
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
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-none mt-0.5">
                                        {weapons.length} builds seleccionadas
                                    </p>
                                </div>

                                {/* Weapon name chips */}
                                <div className="hidden sm:flex items-center gap-1.5 ml-2">
                                    {weapons.map((w, idx) => (
                                        <span
                                            key={w.id}
                                            className={cn(
                                                "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
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
                                {/* TTK quick summary when minimized */}
                                {isMinimized && (
                                    <div className="hidden sm:flex items-center gap-3 mr-3">
                                        {weapons.map((w, idx) => (
                                            <div key={w.id} className="flex items-center gap-1.5">
                                                <div className={cn("w-2 h-2 rounded-full", WEAPON_COLORS[idx].bg, WEAPON_COLORS[idx].border, "border")} />
                                                <span className={cn("text-[10px] font-black font-mono", WEAPON_COLORS[idx].text)}>
                                                    {(computedCombatStats[idx].ttk / 1000).toFixed(2)}s
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                                    title={isMinimized ? "Restaurar comparador" : "Minimizar"}
                                >
                                    {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                                </button>
                                <button
                                    onClick={onBack}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                    title="Cerrar comparador"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <motion.div
                            animate={{
                                opacity: isMinimized ? 0 : 1,
                                pointerEvents: isMinimized ? "none" : "auto",
                            }}
                            transition={{ duration: 0.25 }}
                            className="flex-1 overflow-y-auto overscroll-contain"
                        >
                                <div className="p-5 space-y-6">

                                    {/* Top Section: Radar + Simulator */}
                                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                                        {/* Radar Chart */}
                                        <div className="lg:col-span-3 rounded-xl border border-border/60 bg-gray-50 dark:bg-zinc-900/40 p-4 flex flex-col items-center min-h-[360px] sm:min-h-[440px]">
                                            <h4 className="text-xs font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-3 text-center">
                                                Distribución de Estadísticas
                                            </h4>
                                            <div className="w-full h-[280px] sm:h-[340px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart 
                                                        cx="50%" 
                                                        cy="50%" 
                                                        outerRadius="80%" 
                                                        data={radarData}
                                                        margin={{ top: 10, right: 30, bottom: 10, left: 30 }}
                                                    >
                                                        <PolarGrid stroke="#27272a" strokeDasharray="3 3" />
                                                        <PolarAngleAxis
                                                            dataKey="subject"
                                                            tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: "bold" }}
                                                        />
                                                        <PolarRadiusAxis 
                                                            angle={30} 
                                                            domain={[0, 100]} 
                                                            tick={{ fill: "#52525b", fontSize: 8 }} 
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
                                                                strokeWidth={2.5}
                                                                dot={{ r: 3.5, strokeWidth: 1.5, fill: WEAPON_COLORS[idx].hex }}
                                                            />
                                                        ))}
                                                        <Legend
                                                            verticalAlign="bottom"
                                                            height={36}
                                                            wrapperStyle={{ fontSize: 10, fontWeight: "bold", textTransform: "uppercase", paddingTop: "12px" }}
                                                        />
                                                        <ChartTooltip
                                                            contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: "8px" }}
                                                            labelStyle={{ fontWeight: "bold", color: "#fff", fontSize: 11 }}
                                                            itemStyle={{ fontSize: 10, fontWeight: "bold" }}
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
                                        </div>

                                        {/* TTK Simulator */}
                                        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-gray-50 dark:bg-zinc-900/40 p-4 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Crosshair className="text-rose-500 w-4 h-4" />
                                                    <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                                        Simulador TTK Táctico
                                                    </h4>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed">
                                                    Ajusta el nivel de blindaje y la zona de impacto para simular el TTK en tiempo real.
                                                </p>

                                                <div className="space-y-3">
                                                    {/* Bullet Level Selector */}
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                                            Nivel de Bala (Tuyo)
                                                        </label>
                                                        <div className="flex flex-wrap gap-1">
                                                            {[1, 2, 3, 4, 5, 6].map((lvl) => (
                                                                <button
                                                                    key={lvl}
                                                                    onClick={() => setBulletLevel(lvl)}
                                                                    className={cn(
                                                                        "px-2.5 py-1.5 rounded-lg text-xs font-black transition-all flex-1 text-center min-w-[32px] border",
                                                                        bulletLevel === lvl
                                                                            ? "bg-df-green-500 border-df-green-500 text-white shadow-md shadow-df-green-500/20"
                                                                            : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                                    )}
                                                                >
                                                                    {`Nv.${lvl}`}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Armor Level */}
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                                            Nivel de Blindaje (Oponente)
                                                        </label>
                                                        <div className="flex flex-wrap gap-1">
                                                            {[0, 1, 2, 3, 4, 5, 6].map((lvl) => (
                                                                <button
                                                                    key={lvl}
                                                                    onClick={() => setArmorLevel(lvl)}
                                                                    className={cn(
                                                                        "px-2.5 py-1.5 rounded-lg text-xs font-black transition-all flex-1 text-center min-w-[32px] border",
                                                                        armorLevel === lvl
                                                                            ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/20"
                                                                            : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                                    )}
                                                                >
                                                                    {lvl === 0 ? "Sin" : `Nv.${lvl}`}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Hit Zone */}
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                                            Zona de Impacto
                                                        </label>
                                                        <div className="flex gap-1.5">
                                                            {hitZones.map((zone) => (
                                                                <button
                                                                    key={zone.id}
                                                                    onClick={() => setHitZone(zone.id)}
                                                                    className={cn(
                                                                        "py-2 rounded-xl text-[10px] font-black transition-all flex-1 text-center border",
                                                                        hitZone === zone.id
                                                                            ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/20"
                                                                            : "bg-white dark:bg-zinc-900 border-border text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                                    )}
                                                                >
                                                                    {zone.label.split(" ")[0]}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    <p className="text-[9px] text-gray-400 dark:text-zinc-500 italic leading-snug">
                                                        * Simula el desgaste de durabilidad del chaleco bala tras bala. Proyectiles de menor nivel infligen daño mitigado hasta romper el blindaje.
                                                    </p>
                                                </div>
                                            </div>

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
                                                                    : `${WEAPON_COLORS[idx].border} ${WEAPON_COLORS[idx].bg}`
                                                            )}
                                                        >
                                                            <div>
                                                                <span className={cn("text-[9px] font-black uppercase tracking-tight truncate block", WEAPON_COLORS[idx].text)}>
                                                                    {w.description || w.weapon_name}
                                                                </span>
                                                                <p className="text-sm font-black font-mono leading-none text-foreground flex items-baseline gap-1 mt-0.5">
                                                                    {(computedCombatStats[idx].ttk / 1000).toFixed(2)}
                                                                    <span className="text-[9px] text-muted-foreground font-bold">s</span>
                                                                    {isTtkWinner && <Check size={11} strokeWidth={3} className="text-df-green-500 ml-0.5" />}
                                                                </p>
                                                                <p className="text-[9px] font-bold text-muted-foreground leading-none mt-0.5">
                                                                    {computedCombatStats[idx].btk} balas
                                                                </p>
                                                            </div>
                                                            <div className="mt-1.5 pt-1 border-t border-border/20 text-[8px] text-muted-foreground space-y-1.5 leading-none">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <div className="w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-900 border border-border/50 shrink-0 flex items-center justify-center">
                                                                        {computedCombatStats[idx].caliberImageUrl ? (
                                                                            <img
                                                                                src={computedCombatStats[idx].caliberImageUrl}
                                                                                alt={computedCombatStats[idx].caliberName}
                                                                                className="w-full h-full object-contain p-0.5"
                                                                            />
                                                                        ) : (
                                                                            <Package className="w-2.5 h-2.5 text-zinc-400" />
                                                                        )}
                                                                    </div>
                                                                    <span className="truncate block font-semibold text-foreground text-[9px] flex-1" title={computedCombatStats[idx].ammoName}>
                                                                        {computedCombatStats[idx].ammoName}
                                                                    </span>
                                                                </div>
                                                                <p className="truncate block pl-0.5" title={computedCombatStats[idx].armorName}>🛡️ {computedCombatStats[idx].armorName}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stat Matrix Table */}
                                    <div className="rounded-xl border border-border overflow-hidden bg-gray-50 dark:bg-zinc-900/20">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse min-w-[600px]">
                                                <thead>
                                                    <tr className="border-b border-border bg-gray-100 dark:bg-zinc-900/60">
                                                        <th className="p-3.5 text-[10px] font-black uppercase text-muted-foreground tracking-wider w-[200px]">
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
                                                                        <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-tighter">
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
                                                                        <TooltipContent className="bg-zinc-900 border-white/10 text-[10px] p-2">
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
                                                                        <span>{(computedCombatStats[idx].ttk / 1000).toFixed(2)}s</span>
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
                                                        <td className="p-2 pl-3.5 text-[9px] font-black uppercase text-muted-foreground tracking-widest" colSpan={weapons.length + 1}>
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
                                                        <td className="p-2 pl-3.5 text-[9px] font-black uppercase text-muted-foreground tracking-widest" colSpan={weapons.length + 1}>
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
                                                        <td className="p-2 pl-3.5 text-[9px] font-black uppercase text-muted-foreground tracking-widest" colSpan={weapons.length + 1}>
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
                                                                        <span className="text-[10px] text-muted-foreground italic">Sin código</span>
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
                <span className="text-[9px] font-black text-df-green-500 flex-shrink-0 animate-pulse">Copiado</span>
            ) : (
                <span className="text-[9px] font-black text-muted-foreground flex-shrink-0">Copiar</span>
            )}
        </button>
    );
}
