"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
    Search,
    Crosshair,
    Target,
    Shield,
    Zap,
    TrendingUp,
    Gauge,
    Activity,
    Focus,
    Wind,
    Volume2,
    Package,
    Clock,
    Eye,
    Swords,
    Copy,
    Check,
    ThumbsUp,
    ThumbsDown,
    Trophy,
    Medal,
    Flame,
    Scale,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import AddWeaponForm from "./AddWeaponForm";
import ReportWeaponButton from "./ReportWeaponButton";
import WeaponCompareView from "./WeaponCompareView";
import DeltaForceDatabaseView from "./DeltaForceDatabaseView";

/* ─── Types ─── */

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

interface WeaponsResponse {
    weapons: WeaponMeta[];
    top_voted: WeaponMeta[];
    total_analyses: number;
    game_mode: string;
    last_updated: string;
}

type GameMode = "operations" | "warfare";

const GAME_MODES: { id: GameMode; label: string; sublabel: string; color: string; activeBg: string; activeText: string; activeBorder: string }[] = [
    {
        id: "operations",
        label: "Operaciones",
        sublabel: "Táctico / Extracción",
        color: "lime",
        activeBg: "bg-df-green-500/15",
        activeText: "text-df-green-600 dark:text-df-green-400",
        activeBorder: "border-df-green-500/60 dark:border-df-green-400/40",
    },
    {
        id: "warfare",
        label: "Warfare",
        sublabel: "Gran Escala / Facciones",
        color: "blue",
        activeBg: "bg-blue-500/15",
        activeText: "text-blue-600 dark:text-blue-400",
        activeBorder: "border-blue-500/60 dark:border-blue-400/40",
    },
];

/* ─── TTK Formula ─── */
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

/* ─── Constants ─── */

const CATEGORIES = [
    { id: "all", label: "Todas", icon: Swords },
    { id: "Long Range", label: "Largo Alcance", icon: Target },
    { id: "Close Range", label: "Corto Alcance", icon: Crosshair },
    { id: "Sniper", label: "Francotirador", icon: Eye },
    { id: "Secondary", label: "Secundaria", icon: Shield },
];

const TIER_CONFIG = {
    S: {
        label: "META DOMINANTE",
        color: "from-amber-400 to-orange-500",
        textColor: "text-amber-500 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/50 dark:border-amber-500/30",
        glowColor: "shadow-amber-500/20",
        barColor: "#f59e0b",
        badge: "bg-gradient-to-r from-amber-500 to-orange-500",
    },
    A: {
        label: "MUY FUERTE",
        color: "from-emerald-400 to-green-500",
        textColor: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/50 dark:border-emerald-500/30",
        glowColor: "shadow-emerald-500/15",
        barColor: "#10b981",
        badge: "bg-gradient-to-r from-emerald-500 to-green-500",
    },
    B: {
        label: "VIABLE",
        color: "from-blue-400 to-cyan-500",
        textColor: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/50 dark:border-blue-500/30",
        glowColor: "shadow-blue-500/10",
        barColor: "#3b82f6",
        badge: "bg-gradient-to-r from-blue-500 to-cyan-500",
    },
    C: {
        label: "SITUACIONAL",
        color: "from-gray-400 to-slate-500",
        textColor: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-500/10",
        borderColor: "border-gray-400 dark:border-gray-700/50",
        glowColor: "",
        barColor: "#6b7280",
        badge: "bg-gradient-to-r from-gray-500 to-slate-500",
    },
};

const STAT_BARS = [
    { key: "avg_damage", label: "Daño", icon: Crosshair, max: 60, unit: "" },
    { key: "avg_range", label: "Alcance", icon: Target, max: 100, unit: "m" },
    { key: "avg_control", label: "Control", icon: Activity, max: 100, unit: "" },
    { key: "avg_handling", label: "Manejo", icon: Zap, max: 100, unit: "" },
    { key: "avg_stability", label: "Estabilidad", icon: Gauge, max: 100, unit: "" },
    { key: "avg_accuracy", label: "Precisión", icon: Focus, max: 100, unit: "" },
] as const;

const EXTRA_STATS = [
    { key: "avg_fire_rate", label: "Cadencia", icon: Clock, unit: "dpm" },
    { key: "avg_armor_penetration", label: "Perforación", icon: Shield, unit: "" },
    { key: "avg_capacity", label: "Capacidad", icon: Package, unit: "" },
    { key: "avg_muzzle_velocity", label: "Vel. Boca", icon: Wind, unit: "m/s" },
    { key: "avg_sound_range", label: "Sonido", icon: Volume2, unit: "m" },
] as const;

/* ─── Voting Hook ─── */

function useWeaponVote(gameMode: GameMode) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [localVotes, setLocalVotes] = useState<Record<string, number | null>>({});
    const [voting, setVoting] = useState<Record<string, boolean>>({});

    const { data: userVotesData } = useQuery({
        queryKey: ["delta-force-user-votes", gameMode],
        queryFn: async () => {
            const res = await fetch(`/api/games/delta-force/vote?mode=${gameMode}`);
            return res.json() as Promise<{ votes: Record<string, number> }>;
        },
        enabled: !!user,
        staleTime: 2 * 60 * 1000,
    });

    const getUserVote = useCallback((weaponName: string) => {
        if (weaponName in localVotes) return localVotes[weaponName];
        return userVotesData?.votes?.[weaponName] ?? null;
    }, [localVotes, userVotesData]);

    const castVote = useCallback(async (weaponName: string, vote: 1 | -1) => {
        if (!user || voting[weaponName]) return;

        // Optimistic update
        const currentVote = getUserVote(weaponName);
        const newVote = currentVote === vote ? null : vote;
        setLocalVotes(prev => ({ ...prev, [weaponName]: newVote }));
        setVoting(prev => ({ ...prev, [weaponName]: true }));

        try {
            await fetch("/api/games/delta-force/vote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ weapon_name: weaponName, game_mode: gameMode, vote }),
            });
            queryClient.invalidateQueries({ queryKey: ["delta-force-weapons-meta", gameMode] });
            queryClient.invalidateQueries({ queryKey: ["delta-force-user-votes", gameMode] });
        } catch (err) {
            // Revert on error
            setLocalVotes(prev => ({ ...prev, [weaponName]: currentVote }));
        } finally {
            setVoting(prev => ({ ...prev, [weaponName]: false }));
        }
    }, [user, voting, gameMode, getUserVote, queryClient]);

    return { getUserVote, castVote, isLoggedIn: !!user };
}

/* ─── Main Component ─── */

const WEAPON_COLORS = ["amber-500", "emerald-500", "cyan-500"];

export default function DeltaForceWeaponsMeta() {
    const [activeTab, setActiveTab] = useState<"meta" | "database">("meta");
    const [selectedCompare, setSelectedCompare] = useState<WeaponMeta[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [gameMode, setGameMode] = useState<GameMode>("operations");
    const [sortByTtk, setSortByTtk] = useState(false);
    const [selectedWeapon, setSelectedWeapon] = useState<string>("all");
    const voteSystem = useWeaponVote(gameMode);
    const queryClient = useQueryClient();

    const handleCompareToggle = useCallback((weapon: WeaponMeta) => {
        setSelectedCompare((prev) => {
            const exists = prev.some((w) => w.id === weapon.id);
            if (exists) {
                return prev.filter((w) => w.id !== weapon.id);
            }
            if (prev.length >= 3) return prev; // max 3
            return [...prev, weapon];
        });
    }, []);

    useEffect(() => {
        const supabase = createClient();
        const channel = supabase.channel("weapon_stats_changes_meta")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "weapon_stats_records" },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["delta-force-weapons-meta"] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    // Clear compare list when game mode changes to prevent cross-mode comparison
    useEffect(() => {
        setSelectedCompare([]);
        setIsComparing(false);
    }, [gameMode]);

    const { data, isLoading } = useQuery<WeaponsResponse>({
        queryKey: ["delta-force-weapons-meta", gameMode],
        queryFn: async () => {
            const res = await fetch(`/api/games/delta-force/weapons?mode=${gameMode}`);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
        staleTime: 5 * 60 * 1000,
    });

    const activeMode = GAME_MODES.find(m => m.id === gameMode)!;

    const weapons = data?.weapons || [];

    // Get unique weapon models for the filter dropdown
    const uniqueWeaponNames = useMemo(() => {
        const names = Array.from(new Set(weapons.map(w => w.weapon_name)));
        return names.sort((a, b) => a.localeCompare(b));
    }, [weapons]);

    const filtered = useMemo(() => {
        return weapons.filter((w) => {
            const matchesSearch = w.weapon_name
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) || 
                (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory =
                activeCategory === "all" || w.category === activeCategory;
            const matchesWeapon =
                selectedWeapon === "all" || w.weapon_name === selectedWeapon;
            return matchesSearch && matchesCategory && matchesWeapon;
        });
    }, [weapons, searchQuery, activeCategory, selectedWeapon]);

    // Group by tier
    const grouped = useMemo(() => {
        const tiers: Record<string, WeaponMeta[]> = { S: [], A: [], B: [], C: [] };

        let processed = [...filtered];
        if (sortByTtk) {
            const targetArmor = gameMode === "operations" ? 4 : 0;
            processed.sort((a, b) => {
                const ttkA = calculateTTK(a.avg_damage, a.avg_fire_rate, a.avg_armor_penetration, targetArmor) || 9999;
                const ttkB = calculateTTK(b.avg_damage, b.avg_fire_rate, b.avg_armor_penetration, targetArmor) || 9999;
                return ttkA - ttkB;
            });
        }

        processed.forEach((w) => {
            tiers[w.tier]?.push(w);
        });
        return tiers;
    }, [filtered, sortByTtk]);

    return (
        <>
            {/* Compare Modal */}
            {isComparing && (
                <WeaponCompareView
                    weapons={selectedCompare}
                    onBack={() => setIsComparing(false)}
                />
            )}

            <div className="space-y-8">
                {/* Main Navigation Tabs */}
                <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/5 rounded-2xl w-full sm:w-fit mb-6">
                    <button
                        onClick={() => setActiveTab("meta")}
                        className={cn(
                            "flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                            activeTab === "meta"
                                ? "bg-white dark:bg-zinc-800 text-foreground shadow-md border border-gray-200/50 dark:border-gray-700/50"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Meta Builds de la Comunidad
                    </button>
                    <button
                        onClick={() => setActiveTab("database")}
                        className={cn(
                            "flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                            activeTab === "database"
                                ? "bg-white dark:bg-zinc-800 text-foreground shadow-md border border-gray-200/50 dark:border-gray-700/50"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Enciclopedia y Simulador Base
                    </button>
                </div>

                {activeTab === "database" ? (
                    <DeltaForceDatabaseView />
                ) : (
                    <div className="space-y-8">
            {/* Header Mini & Game Mode Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800/80">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        Meta {gameMode === "operations" ? "Operaciones" : "Warfare"}
                    </h2>
                    <span className="text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400">
                        {data?.total_analyses || 0} CONFIGURACIONES
                    </span>
                </div>

                {/* ─── Game Mode Toggle Minimalist ─── */}
                <div className="flex items-center p-1 bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200/50 dark:border-white/5 rounded-xl shadow-inner-sm">
                    {GAME_MODES.map((mode) => {
                        const isActive = gameMode === mode.id;
                        return (
                            <button
                                key={mode.id}
                                onClick={() => { 
                                    setGameMode(mode.id); 
                                    setSearchQuery(""); 
                                    setActiveCategory("all"); 
                                    setSelectedWeapon("all"); 
                                    setSelectedCompare([]);
                                    setIsComparing(false);
                                }}
                                className={cn(
                                    "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all w-36",
                                    isActive
                                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xl border border-gray-200/50 dark:border-gray-700/50 translate-y-[-1px]"
                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    )}
                            >
                                {mode.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filters & Search - Tactical Redesign */}
            <div className="flex flex-col gap-6">
                {/* Search & Main Action Row */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por nombre de arma..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-4 py-3 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all dark:text-gray-100 shadow-sm"
                            />
                        </div>

                        {/* Weapon Model Filter Dropdown */}
                        <div className="w-full sm:w-60">
                            <select
                                value={selectedWeapon}
                                onChange={(e) => setSelectedWeapon(e.target.value)}
                                className="block w-full px-4 py-3 bg-gray-50/50 dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all dark:text-gray-100 shadow-sm cursor-pointer"
                            >
                                <option value="all">Todas las armas</option>
                                {uniqueWeaponNames.map((name) => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <AddWeaponForm />
                    </div>
                </div>

                {/* Category & TTK Row - Horizontal Scroll on Mobile */}
                <div className="relative border-b border-gray-100 dark:border-white/5 pb-1">
                    <div className="flex items-center justify-between overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 gap-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                            {CATEGORIES.map((cat) => {
                                const Icon = cat.icon;
                                const isActive = activeCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={cn(
                                            "relative flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                            isActive
                                                ? "text-gray-900 dark:text-white"
                                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        )}
                                    >
                                        <Icon size={14} className={cn("transition-transform", isActive ? "scale-110" : "opacity-60")} />
                                        {cat.label}
                                        {isActive && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 dark:bg-white rounded-t-full shadow-[0_-4px_12px_rgba(255,255,255,0.3)]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* TTK Quick Toggle */}
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
                                {gameMode === "operations" ? "TTK NV4" : "TTK BASE"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-6">
                    <div className="h-12 bg-gray-200 dark:bg-gray-800/50 rounded-xl animate-pulse" />
                    <div className="h-10 bg-gray-100 dark:bg-gray-800/40 rounded-lg animate-pulse" />
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800/30 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : weapons.length === 0 ? (
                <div className="p-16 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-900/30">
                    <Swords className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Sin datos de armas aún
                    </h3>
                    <p className="text-gray-500 dark:text-gray-500 max-w-md mx-auto">
                        Los datos del meta se generarán cuando los usuarios analicen armas
                        usando el analizador en los hilos del foro.
                    </p>
                </div>
            ) : (
                <>
                    {/* Top Voted Section */}
                    {!searchQuery.trim() && activeCategory === "all" && !sortByTtk && data?.top_voted && data.top_voted.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500/20 to-orange-600/20 flex items-center justify-center border border-rose-500/20">
                                    <Flame className="w-5 h-5 text-rose-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                        Más Votadas por la Comunidad
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-500">
                                        Las armas mejor valoradas por los operadores
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {data.top_voted.map((weapon, idx) => {
                                    const medalIcons = [Trophy, Medal, Medal, Medal, Medal];
                                    const medalColors = ["text-amber-400", "text-slate-400", "text-amber-700", "text-gray-500", "text-gray-500"];
                                    const MedalIcon = medalIcons[idx];
                                    const config = TIER_CONFIG[weapon.tier];
                                    return (
                                        <div key={weapon.id} className="relative">
                                            <div className="absolute -top-3 -left-3 z-30">
                                                <div className={cn("w-8 h-8 rounded-xl bg-white dark:bg-gray-900 border-2 flex items-center justify-center shadow-xl", config.borderColor)}>
                                                    <MedalIcon size={16} className={medalColors[idx]} />
                                                    <span className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black flex items-center justify-center border border-border shadow-md">
                                                        {idx + 1}
                                                    </span>
                                                </div>
                                            </div>
                                            <WeaponMetaCard
                                                weapon={weapon}
                                                config={config}
                                                voteSystem={voteSystem}
                                                gameMode={gameMode}
                                                isCompareSelected={selectedCompare.some((w) => w.id === weapon.id)}
                                                onCompareToggle={() => handleCompareToggle(weapon)}
                                                isCompareDisabled={selectedCompare.length >= 3 && !selectedCompare.some((w) => w.id === weapon.id)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent my-8" />
                        </div>
                    )}

                    {/* Weapon Tiers */}
                    <div className="space-y-12">
                        {(["S", "A", "B", "C"] as const).map((tier) => {
                            const tierWeapons = grouped[tier];
                            if (tierWeapons.length === 0) return null;
                            const config = TIER_CONFIG[tier];
                            return (
                                <div key={tier} className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("px-4 py-1.5 rounded-lg text-sm font-black text-white shadow-lg", config.badge)}>
                                            TIER {tier}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={cn("text-sm font-bold tracking-wider", config.textColor)}>{config.label}</span>
                                            <div className="h-px w-32 bg-gradient-to-r from-current to-transparent opacity-20" style={{ color: config.barColor }} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {tierWeapons.map((weapon) => (
                                            <WeaponMetaCard
                                                key={weapon.id}
                                                weapon={weapon}
                                                config={config}
                                                voteSystem={voteSystem}
                                                gameMode={gameMode}
                                                isCompareSelected={selectedCompare.some((w) => w.id === weapon.id)}
                                                onCompareToggle={() => handleCompareToggle(weapon)}
                                                isCompareDisabled={selectedCompare.length >= 3 && !selectedCompare.some((w) => w.id === weapon.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* No Results (Filtrado local) */}
            {!isLoading && weapons.length > 0 && filtered.length === 0 && (
                <div className="p-16 text-center rounded-2xl border border-gray-200 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-950/20">
                    <Search className="mx-auto text-gray-300 dark:text-gray-700 mb-4" size={48} />
                    <p className="text-gray-500 dark:text-gray-500 font-medium">No se encontraron armas con los filtros actuales.</p>
                </div>
            )}

            {/* Footer Info */}
            {data?.last_updated && (
                <div className="pt-8 border-t border-gray-200 dark:border-gray-800/50 flex flex-col items-center gap-2">
                    <p className="text-xs text-gray-400 dark:text-gray-600">
                        Actualizado: {new Date(data.last_updated).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-700 uppercase tracking-widest font-bold">KoreStats • Delta Force Global Meta</p>
                </div>
            )}
                    </div>
                )}

                {/* Compare Tray Floating Bar */}
                {selectedCompare.length > 0 && !isComparing && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300 w-[calc(100%-2rem)] max-w-xl">
                        <div className="backdrop-blur-md bg-white/80 dark:bg-zinc-950/75 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.45)]">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                    Comparar ({selectedCompare.length}/3)
                                </span>
                                <div className="flex items-center gap-1">
                                    {selectedCompare.map((w, idx) => (
                                        <div key={w.id} className="relative group/thumb">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-900 border overflow-hidden flex items-center justify-center border-l-2",
                                                WEAPON_COLORS[idx] ? `border-l-2 border-${WEAPON_COLORS[idx]}` : "border-border"
                                            )}>
                                                {w.image_url ? (
                                                    <img src={w.image_url} alt={w.weapon_name} className="w-full h-full object-contain p-0.5" />
                                                ) : (
                                                    <Swords size={12} className="text-gray-400" />
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setSelectedCompare(prev => prev.filter(item => item.id !== w.id))}
                                                className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                                                title="Eliminar"
                                            >
                                                <X size={8} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {selectedCompare.length >= 2 && (
                                    <button
                                        onClick={() => setIsComparing(true)}
                                        className="px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-df-green-500 hover:bg-df-green-600 text-white transition-all shadow-md shadow-df-green-500/20 active:scale-95 flex items-center gap-1"
                                    >
                                        <Scale size={12} />
                                        <span>Comparar</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedCompare([])}
                                    className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

/* ─── Weapon Meta Card Component ─── */

function WeaponMetaCard({
    weapon,
    config,
    voteSystem,
    gameMode,
    isCompareSelected,
    onCompareToggle,
    isCompareDisabled,
}: {
    weapon: WeaponMeta;
    config: any;
    voteSystem?: ReturnType<typeof useWeaponVote>;
    gameMode?: GameMode;
    isCompareSelected: boolean;
    onCompareToggle: () => void;
    isCompareDisabled: boolean;
}) {
    const armorLevel = gameMode === "warfare" ? 0 : 4;
    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-2xl border bg-gray-50 dark:bg-gray-950/40 shadow-sm dark:shadow-none flex flex-col h-full transition-all duration-300",
                config.borderColor,
                isCompareSelected && "ring-2 ring-df-green-500/50 border-df-green-500/60 dark:border-df-green-500/40 shadow-md shadow-df-green-500/10"
            )}
            style={{ color: config.barColor }}
        >
            {/* Background Glow */}
            <div className="relative p-3.5 flex flex-col flex-1 h-full">
                {/* Image Section with Overlays */}
                <div className="relative w-full h-32 flex items-center justify-center group/img rounded-xl bg-transparent overflow-hidden border border-border/40">
                    {/* Category Tag (Absolute Top-Left) */}
                    <div className="absolute top-2 left-2 z-20 flex gap-1.5 items-center">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-md text-foreground border border-border shadow-sm">
                            {weapon.category}
                        </span>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onCompareToggle();
                            }}
                            disabled={isCompareDisabled}
                            className={cn(
                                "p-1 rounded-md border transition-all shadow-sm",
                                isCompareSelected
                                    ? "bg-df-green-500 border-df-green-600 text-white hover:bg-df-green-600 shadow-df-green-500/25"
                                    : "bg-background/80 backdrop-blur-md border-border text-muted-foreground hover:text-foreground hover:bg-background/90"
                            )}
                            title={isCompareSelected ? "Quitar de comparar" : "Comparar arma"}
                        >
                            <Scale size={10} />
                        </button>
                    </div>

                    {/* TTK Badge Overlay */}
                    {(() => {
                        const ttk = calculateTTK(weapon.avg_damage, weapon.avg_fire_rate, weapon.avg_armor_penetration, armorLevel);
                        if (!ttk) return null;
                        return (
                            <div className="absolute top-2 right-2 z-20">
                                <div className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 flex flex-col items-center" title={armorLevel > 0 ? "TTK frente a chaleco Nivel 4" : "TTK Base (Sin Armadura)"}>
                                    <span className="text-[7px] font-black text-gray-400 uppercase leading-none">TTK {armorLevel > 0 ? "Nv4" : "Base"}</span>
                                    <span className="text-[10px] font-mono font-black text-white leading-tight">
                                        {(ttk / 1000).toFixed(2)}s
                                    </span>
                                </div>
                            </div>
                        );
                    })()}

                    {weapon.image_url && (
                        <img
                            src={weapon.image_url}
                            alt={weapon.weapon_name}
                            className="relative z-10 w-full h-full object-contain p-2"
                            loading="lazy"
                        />
                    )}

                    {/* Report Button (Hidden unless hovered) */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm rounded-lg p-0.5 shadow-xl border border-white/10">
                        <ReportWeaponButton weaponStatsRecordId={weapon.record_id} />
                    </div>
                </div>

                {/* Name & Title */}
                <div className="text-center px-1 mt-3 flex flex-col gap-0.5">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white leading-none truncate uppercase tracking-tight">
                        {weapon.description || weapon.weapon_name}
                    </h3>
                    {weapon.description && (
                        <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            {weapon.weapon_name}
                        </span>
                    )}
                </div>

                {/* Main Stats - 2 Column Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                    {STAT_BARS.map((stat) => {
                        const value = weapon[stat.key as keyof WeaponMeta] as number;
                        const pct = Math.min((value / stat.max) * 100, 100);
                        const Icon = stat.icon;

                        return (
                            <div key={stat.key} className="space-y-0.5">
                                <div className="flex justify-between items-center text-[9px]">
                                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                        <Icon size={10} className="opacity-70" />
                                        <span className="font-bold uppercase tracking-tighter">{stat.label}</span>
                                    </div>
                                    <span className="text-gray-800 dark:text-gray-200">{value}{(stat as any).unit || ""}</span>
                                </div>
                                <div className="h-1 w-full bg-gray-200 dark:bg-gray-900/60 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${pct}%`,
                                            backgroundColor: config.barColor,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Extra Stats - Compact Row */}
                <div className="flex items-center justify-around py-3 border-y border-border/40 mt-4 gap-1 overflow-hidden">
                    {EXTRA_STATS.map((stat) => {
                        const value = weapon[stat.key as keyof WeaponMeta] as number;
                        const Icon = stat.icon;
                        if (!value) return null;
                        return (
                            <div key={stat.key} className="flex flex-col items-center gap-0.5 min-w-[40px]">
                                <Icon size={10} className="text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground leading-none">
                                    {value}{stat.unit}
                                </span>
                                <span className="text-[7px] text-muted-foreground uppercase font-bold tracking-tighter whitespace-nowrap">{stat.label === 'Vel. Boca' ? 'Vel.' : stat.label}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Share Codes */}
                {weapon.share_codes && weapon.share_codes.length > 0 && (
                    <div className="flex gap-1 pt-3">
                        {weapon.share_codes.slice(0, 1).map((code, idx) => (
                            <ShareCodeChip key={idx} code={code} isCompact />
                        ))}
                    </div>
                )}

                {/* Tags Section */}
                {(() => {
                    const fireRate = weapon.avg_fire_rate || 0;
                    const handling = weapon.avg_handling || 0;
                    const accuracy = weapon.avg_accuracy || 0;
                    const damage = weapon.avg_damage || 0;
                    const stability = weapon.avg_stability || 0;
                    const range = weapon.avg_range || 0;
                    const armorPen = weapon.avg_armor_penetration || 0;

                    const tags: { label: string; desc: string }[] = [];

                    if (fireRate > 750) tags.push({ label: "Alta Cadencia", desc: "Velocidad de disparo extrema (superior a 750 RPM)." });
                    else if (fireRate < 500) tags.push({ label: "Baja Cadencia", desc: "Disparos lentos pero muy controlables." });

                    if (damage > 35) tags.push({ label: "Alto Poder", desc: "Daño por bala muy elevado (ideal para tiros precisos)." });
                    if (accuracy > 70) tags.push({ label: "Láser", desc: "Precisión máxima; las balas van exactamente donde apuntas." });
                    if (handling > 65) tags.push({ label: "Ágil", desc: "Rapidez excepcional al apuntar y cambiar de arma." });
                    if (stability > 75) tags.push({ label: "Sin Retroceso", desc: "Estructura muy estable que apenas se mueve al disparar." });
                    if (range > 75) tags.push({ label: "Largo Alcance", desc: "Efectividad garantizada a distancias muy largas." });
                    if (armorPen > 45) tags.push({ label: "Perforante", desc: "Ignora gran parte del blindaje corporal enemigo." });

                    if (tags.length === 0) return null;

                    return (
                        <TooltipProvider>
                            <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-3">
                                {tags.map(tag => (
                                    <Tooltip key={tag.label}>
                                        <TooltipTrigger asChild>
                                            <span className="text-[9px] font-black uppercase tracking-tighter transition-colors cursor-help hover:opacity-80 text-slate-500 dark:text-slate-400">
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
                    );
                })()}

                {/* Bottom: Votes + Info (PUSHED TO BOTTOM) */}
                <div className="mt-auto pt-6 space-y-2">
                    {/* Vote Buttons */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                            {/* Upvote */}
                            <button
                                onClick={() => voteSystem?.castVote(weapon.weapon_name, 1)}
                                title={voteSystem?.isLoggedIn ? "Voto positivo" : "Inicia sesión para votar"}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all",
                                    voteSystem?.getUserVote(weapon.weapon_name) === 1
                                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                                        : "bg-gray-100 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 text-gray-500 hover:border-emerald-500/40 hover:text-emerald-500",
                                    !voteSystem?.isLoggedIn && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <ThumbsUp size={10} />
                                <span>{weapon.upvotes}</span>
                            </button>
                            {/* Downvote */}
                            <button
                                onClick={() => voteSystem?.castVote(weapon.weapon_name, -1)}
                                title={voteSystem?.isLoggedIn ? "Voto negativo" : "Inicia sesión para votar"}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all",
                                    voteSystem?.getUserVote(weapon.weapon_name) === -1
                                        ? "bg-rose-500/20 border-rose-500/50 text-rose-600 dark:text-rose-400"
                                        : "bg-gray-100 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 text-gray-500 hover:border-rose-500/40 hover:text-rose-500",
                                    !voteSystem?.isLoggedIn && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <ThumbsDown size={10} />
                                <span>{weapon.downvotes}</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-1">
                            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tight opacity-70">
                                {weapon.analyses_count} ANÁLISIS
                            </span>
                            {weapon.is_official && (
                                <Badge className="text-[7px] px-1.5 h-4 bg-cyan-600/90 dark:bg-cyan-500/80 hover:bg-cyan-600 flex items-center gap-0.5 border-none shadow-sm shadow-cyan-500/20">
                                    <Check size={8} strokeWidth={4} />
                                    VERIFICADA
                                </Badge>
                            )}
                        </div>
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
                "group/btn w-full flex items-center gap-2 border hover:border-df-green-500/40 transition-all text-left relative overflow-hidden",
                isCompact
                    ? "px-2 py-1 rounded-lg bg-gray-100/50 dark:bg-gray-950/40 border-border/40"
                    : "px-2.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-900/60 border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-gray-900"
            )}
            title="Haz clic para copiar"
        >
            <code className={cn(
                "font-mono truncate flex-1 leading-none",
                isCompact
                    ? "text-[9px] text-gray-500 dark:text-gray-500"
                    : "text-[10px] text-gray-600 dark:text-gray-400 group-hover/btn:text-df-green-700 dark:group-hover/btn:text-df-green-300"
            )}>
                {code}
            </code>
            <div className="flex-shrink-0">
                {copied ? (
                    <Check size={isCompact ? 10 : 12} className="text-df-green-600 dark:text-df-green-400 animate-in zoom-in duration-300" />
                ) : (
                    <Copy size={isCompact ? 10 : 12} className="text-gray-400 dark:text-gray-600 group-hover/btn:text-gray-600 dark:group-hover/btn:text-gray-400" />
                )}
            </div>
            {copied && <div className="absolute inset-x-0 bottom-0 h-[1px] bg-df-green-500 animate-out fade-out duration-1000" />}
        </button>
    );
}
