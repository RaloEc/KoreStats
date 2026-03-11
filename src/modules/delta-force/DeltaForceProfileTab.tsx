"use client";

/**
 * Pestaña de perfil para Delta Force — Redesign.
 *
 * Muestra los análisis de armas del usuario agrupados por nombre,
 * con diseño premium, stat bars coloreadas y mejor jerarquía visual.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Swords,
    Camera,
    BarChart3,
    Crosshair,
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
    Copy,
    Check,
    Search,
    Trash2,
    Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import AddWeaponForm from "@/components/weapon/AddWeaponForm";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

/* ─── Interfaces ─── */

interface DeltaForceProfileTabProps {
    userId: string;
    isOwnProfile: boolean;
    profileColor?: string;
}

interface WeaponRecord {
    id: string;
    weapon_name: string | null;
    stats: Record<string, any>;
    created_at: string;
    share_code?: string | null;
    description?: string | null;
}

interface GroupedWeapon {
    name: string;
    records: WeaponRecord[];
    bestStats: Record<string, number>;
    latestDate: string;
    shareCodes: string[];
    description: string | null;
}

/* ─── Constants Shared with Meta (Keep Synced) ─── */

const STAT_BARS = [
    { key: "damage", label: "Daño", icon: Crosshair, max: 60, unit: "" },
    { key: "range", label: "Alcance", icon: Target, max: 100, unit: "m" },
    { key: "control", label: "Control", icon: Activity, max: 100, unit: "" },
    { key: "handling", label: "Manejo", icon: Zap, max: 100, unit: "" },
    { key: "stability", label: "Estabilidad", icon: Gauge, max: 100, unit: "" },
    { key: "accuracy", label: "Precisión", icon: Focus, max: 100, unit: "" },
] as const;

const EXTRA_STATS = [
    { key: "fireRate", label: "Cadencia", icon: Clock, unit: "dpm" },
    { key: "armorPenetration", label: "Perforación", icon: Shield, unit: "" },
    { key: "capacity", label: "Capacidad", icon: Package, unit: "" },
    { key: "muzzleVelocity", label: "Vel. Boca", icon: Wind, unit: "m/s" },
    { key: "soundRange", label: "Sonido", icon: Volume2, unit: "m" },
] as const;

const STAT_MAP: Record<string, string> = {
    dano: "damage",
    alcance: "range",
    manejo: "handling",
    estabilidad: "stability",
    precision: "accuracy",
    control: "control",
    capacidad: "capacity",
    perforacionBlindaje: "armorPenetration",
    cadenciaDisparo: "fireRate",
    velocidadBoca: "muzzleVelocity",
    sonidoDisparo: "soundRange",
};

/* ─── Helper Functions ─── */

function normalizeStats(raw: Record<string, any>): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(raw)) {
        const mappedKey = STAT_MAP[key] || key;
        if (typeof value === "number" && !isNaN(value)) {
            result[mappedKey] = value;
        }
    }
    return result;
}

const calculateTTK = (damage: number, fireRate: number, penetration: number = 0, armorLevel: number = 0) => {
    if (!damage || !fireRate || damage <= 0 || fireRate <= 0) return 0;
    const hp = 100;
    const rps = fireRate / 60;

    // 1. Determinar el Coeficiente de Mitigación (mu)
    let mu = 1.0;
    if (armorLevel > 0) {
        const armorThreshold = armorLevel * 10;
        if (penetration >= armorThreshold) {
            mu = 1.0; // Perforación limpia
        } else if (penetration >= armorThreshold - 5) {
            mu = 0.75; // Mitigación por nivel cercano
        } else {
            mu = 0.45; // Blindaje superior al daño
        }
    }

    // 2. Calcular Daño Efectivo por bala
    const effectiveDamage = damage * mu;

    // 3. Balas para matar (BTK) - Siempre redondear hacia arriba
    const btk = Math.ceil(hp / effectiveDamage);

    // 4. TTK Final (El primer disparo es instante 0, por eso btk - 1)
    const ttkSeconds = (btk - 1) / rps;

    return Math.round(ttkSeconds * 1000);
};

function getWeaponTags(stats: Record<string, number>) {
    const fireRate = stats.fireRate || 0;
    const handling = stats.handling || 0;
    const accuracy = stats.accuracy || 0;
    const damage = stats.damage || 0;
    const stability = stats.stability || 0;
    const range = stats.range || 0;
    const armorPen = stats.armorPenetration || 0;

    const tags: { label: string; color: string; desc: string }[] = [];

    // TTK Tags
    const ttk = calculateTTK(damage, fireRate, armorPen, 4);
    if (ttk > 0) {
        if (ttk <= 200) tags.push({ label: "TTK Instantáneo", color: "text-rose-600 dark:text-rose-400", desc: "Eliminación casi inmediata (menos de 0.200s) contra chaleco Nv. 4." });
        else if (ttk <= 280) tags.push({ label: "TTK Competitivo", color: "text-orange-500", desc: "Rendimiento óptimo para combates contra blindaje (0.200 - 0.280s)." });
        else if (ttk <= 380) tags.push({ label: "TTK Sólido", color: "text-amber-500", desc: "Daño consistente contra objetivos blindados (0.280 - 0.380s)." });
    }

    if (fireRate > 750) tags.push({ label: "Alta Cadencia", color: "text-rose-500", desc: "Velocidad de disparo extrema (superior a 750 RPM)." });
    else if (fireRate < 500) tags.push({ label: "Baja Cadencia", color: "text-orange-500", desc: "Disparos lentos pero muy controlables." });

    if (damage > 35) tags.push({ label: "Alto Poder", color: "text-red-500", desc: "Daño por bala muy elevado (ideal para tiros precisos)." });
    if (accuracy > 70) tags.push({ label: "Láser", color: "text-emerald-500", desc: "Precisión máxima; las balas van exactamente donde apuntas." });
    if (handling > 65) tags.push({ label: "Ágil", color: "text-amber-500", desc: "Rapidez excepcional al apuntar y cambiar de arma." });
    if (stability > 75) tags.push({ label: "Sin Retroceso", color: "text-blue-500", desc: "Estructura muy estable que apenas se mueve al disparar." });
    if (range > 75) tags.push({ label: "Largo Alcance", color: "text-purple-500", desc: "Efectividad garantizada a distancias muy largas." });
    if (armorPen > 45) tags.push({ label: "Perforante", color: "text-slate-500", desc: "Ignora gran parte del blindaje corporal enemigo." });

    return tags;
}

/* ─── Fetching Logic ─── */

async function fetchUserWeaponRecords(userId: string): Promise<WeaponRecord[]> {
    const response = await fetch(`/api/perfil/${userId}/weapons?_t=${Date.now()}`);
    if (!response.ok) return [];
    return response.json();
}

async function fetchGlobalMeta() {
    const res = await fetch("/api/games/delta-force/weapons");
    if (!res.ok) return [];
    const data = await res.json();
    return data.weapons || [];
}

/* ─── Main Component ─── */

export default function DeltaForceProfileTab({
    userId,
    isOwnProfile,
    profileColor = "#10b981",
}: DeltaForceProfileTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [sortByTtk, setSortByTtk] = useState(false);
    const queryClient = useQueryClient();

    const { data: weaponRecords = [], isLoading } = useQuery({
        queryKey: ["delta-force-weapons", userId],
        queryFn: () => fetchUserWeaponRecords(userId),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
    });

    const { data: metaData = [] } = useQuery({
        queryKey: ["delta-force-weapons-meta"],
        queryFn: fetchGlobalMeta,
        staleTime: 5 * 60 * 1000,
    });

    // Map meta to weapon name for quick lookup
    const metaMap = useMemo(() => {
        const map = new Map<string, any>();
        if (!metaData || !Array.isArray(metaData)) return map;
        metaData.forEach((m: any) => {
            if (!m.weapon_name) return;
            const normalizedName = m.weapon_name.replace(/^(Fusil de asalto|Fusil de batalla|Ametralladora ligera|Subfusil|Rifle de francotirador|Rifle de tirador|Pistola|Escopeta)\s+/i, "").trim().toUpperCase();
            map.set(normalizedName, m);
        });
        return map;
    }, [metaData]);

    const categorizedWeapons = useMemo(() => {
        const groups = new Map<string, WeaponRecord[]>();

        for (const record of weaponRecords) {
            const name = record.weapon_name || "Arma sin nombre";
            const normalizedName = name
                .replace(/^(Fusil de asalto|Fusil de batalla|Ametralladora ligera|Subfusil|Rifle de francotirador|Rifle de tirador|Pistola|Escopeta)\s+/i, "")
                .trim();

            // Search filter
            if (searchQuery && !normalizedName.toLowerCase().includes(searchQuery.toLowerCase())) {
                continue;
            }

            // Hacemos que CADA arma registrada sea su propia "tarjeta" en vez de agruparlas por nombre.
            // Asi el usuario puede tener varias builds de una misma arma.
            const key = record.id;

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(record);
        }

        const weaponList: GroupedWeapon[] = [];
        for (const [, records] of Array.from(groups)) {
            records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            const bestStats: Record<string, number> = {};
            for (const record of records) {
                const normalized = normalizeStats(record.stats);
                for (const [key, value] of Object.entries(normalized)) {
                    if (bestStats[key] === undefined || value > (bestStats[key] || 0)) {
                        bestStats[key] = value;
                    }
                }
            }

            const displayName = records[0].weapon_name?.replace(/^(Fusil de asalto|Fusil de batalla|Ametralladora ligera|Subfusil|Rifle de francotirador|Rifle de tirador|Pistola|Escopeta)\s+/i, "").trim() || "Arma sin nombre";

            weaponList.push({
                name: displayName,
                records,
                bestStats,
                latestDate: records[0].created_at,
                shareCodes: records.map((r) => r.share_code).filter((c): c is string => !!c),
                description: records[0].description || null,
            });
        }

        // Apply Sorting by TTK if active
        if (sortByTtk) {
            weaponList.sort((a, b) => {
                const ttkA = calculateTTK(a.bestStats.damage, a.bestStats.fireRate) || 9999;
                const ttkB = calculateTTK(b.bestStats.damage, b.bestStats.fireRate) || 9999;
                return ttkA - ttkB;
            });
        }

        // Apply Tag Filter
        const filtered = activeTag
            ? weaponList.filter(w => getWeaponTags(w.bestStats).some(t => t.label === activeTag))
            : weaponList;

        // Group by category
        const categorized = new Map<string, GroupedWeapon[]>();
        filtered.forEach(w => {
            const meta = metaMap.get(w.name.toUpperCase());
            const cat = meta?.category || "Otros";
            if (!categorized.has(cat)) categorized.set(cat, []);
            categorized.get(cat)!.push(w);
        });

        // Sorting categories
        return Array.from(categorized).sort(([a], [b]) => a.localeCompare(b));
    }, [weaponRecords, metaMap, activeTag, searchQuery, sortByTtk]);

    const allAvailableTags = useMemo(() => {
        const tagSet = new Set<string>();
        weaponRecords.forEach(r => {
            const stats = normalizeStats(r.stats);
            getWeaponTags(stats).forEach(t => tagSet.add(t.label));
        });
        return Array.from(tagSet).sort();
    }, [weaponRecords]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[1, 2].map((i) => (
                    <div key={i} className="space-y-4">
                        <div className="h-6 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((j) => (
                                <div key={j} className="h-64 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/weapons/${id}`, { method: "DELETE" });
            if (res.ok) {
                queryClient.invalidateQueries({ queryKey: ["delta-force-weapons", userId] });
            }
        } catch (e) { console.error(e); }
    };

    const handleSaveName = async (id: string, newName: string) => {
        if (!newName.trim()) return;
        try {
            const res = await fetch(`/api/weapons/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: newName.trim() }),
            });
            if (res.ok) {
                queryClient.invalidateQueries({ queryKey: ["delta-force-weapons", userId] });
            }
        } catch (e) { console.error(e); }
    };

    if (weaponRecords.length === 0) {
        return (
            <div className="text-center py-20 px-4 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-[2.5rem] bg-gray-50/30 dark:bg-white/[0.02]">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-inner">
                    <Swords className="text-gray-400 dark:text-gray-500" size={36} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-3">
                    {isOwnProfile ? "No tienes análisis aún" : "Sin análisis de armas"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto font-medium text-sm leading-relaxed mb-8">
                    {isOwnProfile
                        ? "Analiza tus estadísticas subiendo capturas del juego directamente o desde los hilos del foro."
                        : "Este usuario aún no ha compartido análisis de armas."}
                </p>
                {isOwnProfile && (
                    <div className="flex justify-center">
                        <AddWeaponForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["delta-force-weapons", userId] })} />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Redesigned Header & Search Row */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
                            <BarChart3 size={24} style={{ color: profileColor }} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                Arsenal Analizado
                            </h2>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[0.2em] leading-none mt-1.5">
                                {weaponRecords.length} Variantes Registradas
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64 group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar arma..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-4 py-2.5 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500/40 transition-all dark:text-gray-100 shadow-sm"
                            />
                        </div>
                        {isOwnProfile && (
                            <AddWeaponForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["delta-force-weapons", userId] })} />
                        )}
                    </div>
                </div>

                {/* Tactical Tags Filters */}
                {allAvailableTags.length > 0 && (
                    <div className="relative">
                        <div className="flex items-center justify-between overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 gap-4">
                            <div className="flex items-center gap-1 sm:gap-2">
                                <button
                                    onClick={() => setActiveTag(null)}
                                    className={cn(
                                        "relative flex items-center px-4 py-3 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        !activeTag
                                            ? "text-gray-900 dark:text-white"
                                            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    )}
                                >
                                    Todos
                                    {!activeTag && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 dark:bg-white rounded-t-full" />
                                    )}
                                </button>
                                {allAvailableTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                                        className={cn(
                                            "relative flex items-center px-4 py-3 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                            activeTag === tag
                                                ? "text-gray-900 dark:text-white"
                                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        )}
                                    >
                                        {tag}
                                        {activeTag === tag && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 dark:bg-white rounded-t-full shadow-[0_-4px_12px_rgba(255,255,255,0.3)]" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* TTK Sort Toggle */}
                            <div className="flex items-center pl-3 border-l border-gray-100 dark:border-white/10 my-2">
                                <button
                                    onClick={() => setSortByTtk(!sortByTtk)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        sortByTtk
                                            ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 active:scale-95"
                                            : "bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-transparent hover:border-rose-500/20"
                                    )}
                                >
                                    <Zap size={11} className={cn(sortByTtk ? "animate-pulse fill-current" : "opacity-50")} />
                                    TTK NV4
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Categorized Sections */}
            {categorizedWeapons.length > 0 ? (
                <div className="space-y-12">
                    {categorizedWeapons.map(([category, weapons]) => (
                        <div key={category} className="space-y-4">
                            <div className="flex items-center gap-4 px-1">
                                <h3 className="text-xs font-black text-gray-900 dark:text-gray-500 uppercase tracking-[0.2em] whitespace-nowrap">
                                    {category}
                                </h3>
                                <div className="h-px w-full bg-gradient-to-r from-border/50 to-transparent" />
                                <span className="text-[10px] font-bold text-gray-900 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-2 py-0.5 rounded-md">
                                    {weapons.length}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {weapons.map((weapon) => (
                                    <WeaponGroupCard
                                        key={weapon.records[0].id}
                                        weapon={weapon}
                                        meta={metaMap.get(weapon.name.toUpperCase())}
                                        isOwnProfile={isOwnProfile}
                                        onDelete={() => handleDelete(weapon.records[0].id)}
                                        onSave={(newName) => handleSaveName(weapon.records[0].id, newName)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-3xl opacity-50">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Sin resultados para "{activeTag}"</p>
                </div>
            )}
        </div>
    );
}

/* ─── Weapon Group Card ─── */

function WeaponGroupCard({
    weapon,
    meta,
    isOwnProfile,
    onSave,
    onDelete,
}: {
    weapon: GroupedWeapon;
    meta?: any;
    isOwnProfile?: boolean;
    onSave?: (newName: string) => void;
    onDelete?: () => void;
}) {
    const tags = getWeaponTags(weapon.bestStats);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(weapon.description || weapon.name);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editValue.trim() && editValue !== (weapon.description || weapon.name)) {
            onSave?.(editValue);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setEditValue(weapon.description || weapon.name);
            setIsEditing(false);
        }
    };

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-white dark:bg-gray-950/40 shadow-sm transition-all hover:shadow-md dark:hover:border-gray-700 flex flex-col h-full">
            <div className="relative p-3.5 flex flex-col flex-1 h-full">
                {/* Image Section */}
                <div className="relative w-full h-32 flex items-center justify-center rounded-xl overflow-hidden border border-border/40">
                    {/* TTK Badge Overlay */}
                    {(() => {
                        const ttk = calculateTTK(weapon.bestStats.damage, weapon.bestStats.fireRate, weapon.bestStats.armorPenetration, 4);
                        if (!ttk) return null;
                        return (
                            <div className="absolute top-2 right-2 z-20">
                                <div className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 flex flex-col items-center" title="TTK frente a chaleco Nivel 4">
                                    <span className="text-[7px] font-black text-gray-400 uppercase leading-none">TTK Nv4</span>
                                    <span className="text-[10px] font-mono font-black text-white leading-tight">
                                        {(ttk / 1000).toFixed(2)}s
                                    </span>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Controles de Administración */}
                    {isOwnProfile && (
                        <div className="absolute top-2 left-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 rounded-md bg-black/60 backdrop-blur-md border border-white/20 text-gray-300 hover:text-white transition-colors"
                                title="Editar nombre"
                            >
                                <Edit3 size={11} />
                            </button>

                            <Popover open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                                <PopoverTrigger asChild>
                                    <button className="p-1.5 rounded-md bg-black/60 backdrop-blur-md border border-white/20 text-gray-300 hover:text-rose-500 hover:border-rose-500/50 transition-colors" title="Eliminar arma">
                                        <Trash2 size={11} />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent side="bottom" align="start" className="w-48 p-3 bg-gray-900 border-white/10 shadow-2xl">
                                    <p className="text-[10px] font-bold text-white uppercase mb-2">¿Eliminar esta build?</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { onDelete?.(); setIsDeleteOpen(false); }}
                                            className="flex-1 py-1 rounded-md bg-rose-600 text-white text-[9px] font-black uppercase hover:bg-rose-700 transition-colors"
                                        >
                                            Sí, borrar
                                        </button>
                                        <button
                                            onClick={() => setIsDeleteOpen(false)}
                                            className="flex-1 py-1 rounded-md bg-gray-800 text-gray-400 text-[9px] font-black uppercase hover:bg-gray-700 transition-colors"
                                        >
                                            No
                                        </button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    {meta?.image_url ? (
                        <img
                            src={meta.image_url}
                            alt={weapon.name}
                            className="relative z-10 w-full h-full object-contain p-2"
                            loading="lazy"
                        />
                    ) : (
                        <div className="relative z-10 flex flex-col items-center opacity-30">
                            <Swords size={32} />
                            <span className="text-[8px] font-bold mt-1 uppercase">Imagen Pendiente</span>
                        </div>
                    )}
                </div>

                {/* Name & Model Title */}
                <div className="text-center px-1 mt-4 mb-2 flex flex-col gap-0.5">
                    {isEditing ? (
                        <Input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={handleKeyDown}
                            className="h-7 text-sm font-black text-center bg-gray-100 dark:bg-gray-900 border-lime-500/50 focus-visible:ring-lime-500 uppercase"
                        />
                    ) : (
                        <h3
                            className="text-lg font-black text-gray-900 dark:text-white leading-none truncate uppercase tracking-tight cursor-text group-hover:text-lime-500 transition-colors"
                            onClick={() => isOwnProfile && setIsEditing(true)}
                        >
                            {weapon.description || weapon.name}
                        </h3>
                    )}
                    {weapon.description && (
                        <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            {weapon.name}
                        </span>
                    )}
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                    {STAT_BARS.map((stat) => {
                        const value = weapon.bestStats[stat.key] || 0;
                        const pct = Math.min((value / stat.max) * 100, 100);
                        const Icon = stat.icon;

                        return (
                            <div key={stat.key} className="space-y-0.5">
                                <div className="flex justify-between items-center text-[9px]">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Icon size={10} className="stroke-[2.5px]" />
                                        <span className="font-bold uppercase tracking-tighter">{stat.label}</span>
                                    </div>
                                    <span className="text-muted-foreground font-bold">{value}{stat.unit}</span>
                                </div>
                                <div className="h-1 w-full bg-gray-100 dark:bg-gray-900/60 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gray-400 dark:bg-gray-600 transition-all duration-700"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Extra Stats - Compact Row (Unified Design) */}
                <div className="flex items-center justify-around py-3 border-y border-border/40 mt-4 gap-1 overflow-hidden">
                    {EXTRA_STATS.map((stat) => {
                        const value = weapon.bestStats[stat.key];
                        const Icon = stat.icon;
                        if (!value) return null;
                        return (
                            <div key={stat.key} className="flex flex-col items-center gap-0.5 min-w-[40px]">
                                <Icon size={10} className="text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground leading-none font-bold">
                                    {value}{stat.unit}
                                </span>
                                <span className="text-[7px] text-muted-foreground uppercase font-bold tracking-tighter whitespace-nowrap">
                                    {stat.label === 'Vel. Boca' ? 'Vel.' : stat.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Section */}
                <div className="mt-auto pt-5 space-y-4">
                    {/* Share Codes moved up */}
                    {weapon.shareCodes && weapon.shareCodes.length > 0 && (
                        <div className="flex flex-col gap-1">
                            {weapon.shareCodes.slice(0, 1).map((code, idx) => (
                                <ShareCodeChip key={idx} code={code} isCompact />
                            ))}
                        </div>
                    )}

                    {/* Performance Tags Section moved down */}
                    {tags.length > 0 && (
                        <TooltipProvider>
                            <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
                                {tags.map(tag => (
                                    <Tooltip key={tag.label}>
                                        <TooltipTrigger asChild>
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-tighter cursor-help transition-opacity hover:opacity-80",
                                                tag.color
                                            )}>
                                                {tag.label}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-[10px] font-bold bg-black dark:bg-white text-white dark:text-black border-none">
                                            {tag.desc}
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </TooltipProvider>
                    )}

                    <div className="flex items-center justify-between text-[8px] text-gray-900 dark:text-gray-400 font-black uppercase tracking-tight pt-1">
                        <span>{new Date(weapon.latestDate).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Share Code Chip ─── */

function ShareCodeChip({ code, isCompact }: { code: string; isCompact?: boolean }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed:", err);
        }
    }, [code]);

    return (
        <button
            onClick={handleCopy}
            className={cn(
                "group/btn w-full flex items-center gap-2 border hover:border-lime-500/40 transition-all text-left relative overflow-hidden",
                isCompact
                    ? "px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800/40 border-border/40"
                    : "px-2.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border-border hover:bg-gray-100 dark:hover:bg-gray-900"
            )}
            title="Copiar código"
        >
            <code className={cn(
                "font-mono truncate flex-1 leading-none text-gray-500",
                isCompact ? "text-[8px]" : "text-[9px]"
            )}>
                {code}
            </code>
            <div className="flex-shrink-0">
                {copied ? <Check size={10} className="text-lime-500" /> : <Copy size={10} className="text-gray-400 group-hover/btn:text-gray-600" />}
            </div>
        </button>
    );
}
