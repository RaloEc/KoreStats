"use client";

import Image from "next/image";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { calculateDamageFalloff, calculateStandardTTK } from "@/lib/delta-force/defaultData";
import Link from "next/link";
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
    Trash2,
    Heart,
    ArrowLeft,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    user_id?: string | null;
    patch_version: string | null;
}

interface WeaponsResponse {
    weapons: WeaponMeta[];
    top_voted: WeaponMeta[];
    total_analyses: number;
    game_mode: string;
    last_updated: string;
    current_patch: string;
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
const calculateTTK = (
    damage: number,
    fireRate: number,
    penetration: number = 0,
    armorLevel: number = 4,
    category?: string,
    gameMode: string = "operations",
    distance: number = 30,
    range?: number
) => {
    // Para las tarjetas, la comparación estándar es Bala Nivel X contra Chaleco Nivel X (donde X es armorLevel).
    const bulletLevel = armorLevel > 0 ? armorLevel : 4;
    return calculateStandardTTK(damage, fireRate, armorLevel, bulletLevel, category, gameMode, distance, penetration, range);
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
    const [isFullPage, setIsFullPage] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [gameMode, setGameMode] = useState<GameMode>("operations");
    const [sortByTtk, setSortByTtk] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);
    const [selectedCategoryDropdown, setSelectedCategoryDropdown] = useState<string>("all");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [patchFilter, setPatchFilter] = useState<"current" | "all">("current");
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
        queryKey: ["delta-force-weapons-meta", gameMode, patchFilter],
        queryFn: async () => {
            const res = await fetch(`/api/games/delta-force/weapons?mode=${gameMode}&patch=${patchFilter}`);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
        staleTime: 5 * 60 * 1000,
    });

    const currentPatch = data?.current_patch || "Temporada 9 - ECHO";

    const { data: baseWeaponsData } = useQuery({
        queryKey: ["df-base-weapons-for-meta", gameMode],
        queryFn: async () => {
            const res = await fetch(`/api/games/delta-force/base-data?type=weapons&mode=${gameMode}`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.weapons || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const baseWeaponsMap = useMemo(() => {
        const map = new Map<string, any>();
        const normalize = (name: string) => {
            return name
                .replace(/^(Fusil de asalto|Fusil de batalla|Ametralladora ligera|Subfusil|Rifle de francotirador|Rifle de tirador|Pistola|Escopeta)\s+/i, "")
                .trim()
                .toUpperCase()
                .replace(/\s+/g, "-");
        };
        const weaponsList = Array.isArray(baseWeaponsData) ? baseWeaponsData : [];
        weaponsList.forEach((w: any) => {
            if (!w.weapon_name) return;
            map.set(normalize(w.weapon_name), w);
        });
        return map;
    }, [baseWeaponsData]);

    const activeMode = GAME_MODES.find(m => m.id === gameMode)!;

    const weapons = data?.weapons || [];

    // Pre-initialize comparison if "compare" query param exists in the URL
    useEffect(() => {
        if (typeof window === "undefined" || weapons.length === 0) return;
        const params = new URLSearchParams(window.location.search);
        const compareIds = params.get("compare");
        const full = params.get("full");
        if (compareIds) {
            const ids = compareIds.split(",");
            const matchingWeapons = weapons.filter(w => ids.includes(w.id));
            if (matchingWeapons.length > 0) {
                setSelectedCompare(matchingWeapons);
                setIsComparing(true);
                if (full === "true") {
                    setIsFullPage(true);
                }
            }
        }
    }, [weapons]);

    // Get unique weapon categories for the filter dropdown
    const uniqueCategories = useMemo(() => {
        const categories = Array.from(new Set(weapons.map(w => w.category).filter(Boolean)));
        return categories.sort((a, b) => a.localeCompare(b));
    }, [weapons]);

    const filtered = useMemo(() => {
        return weapons.filter((w) => {
            const matchesSearch = w.weapon_name
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
                (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory =
                activeCategory === "all" || w.category === activeCategory;
            const matchesCategoryDropdown =
                selectedCategoryDropdown === "all" || w.category.toLowerCase() === selectedCategoryDropdown.toLowerCase();
            const matchesFavorites = !showFavorites || voteSystem.getUserVote(w.id) === 1;
            return matchesSearch && matchesCategory && matchesCategoryDropdown && matchesFavorites;
        });
    }, [weapons, searchQuery, activeCategory, selectedCategoryDropdown, showFavorites, voteSystem]);

    // Group by tier
    const grouped = useMemo(() => {
        const tiers: Record<string, WeaponMeta[]> = { S: [], A: [], B: [], C: [] };

        let processed = [...filtered];
        if (sortByTtk) {
            const targetArmor = gameMode === "operations" ? 4 : 0;
            processed.sort((a, b) => {
                const ttkA = calculateTTK(a.avg_damage, a.avg_fire_rate, a.avg_armor_penetration, targetArmor, a.category, gameMode) || 9999;
                const ttkB = calculateTTK(b.avg_damage, b.avg_fire_rate, b.avg_armor_penetration, targetArmor, b.category, gameMode) || 9999;
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
            {/* Compare Modal / Full Page view in the same tree */}
            {isComparing && (
                <WeaponCompareView
                    weapons={selectedCompare}
                    onBack={() => {
                        if (isFullPage) {
                            setIsFullPage(false);
                            if (typeof window !== "undefined") {
                                window.history.replaceState({}, "", "/games/delta-force/weapons");
                            }
                        } else {
                            setIsComparing(false);
                        }
                    }}
                    isFullPage={isFullPage}
                    onToggleFullPage={setIsFullPage}
                />
            )}

            <div className={cn("space-y-6 transition-all duration-300", isFullPage && "opacity-0 pointer-events-none h-0 overflow-hidden")}>
                {/* ─── CONTROL BAR: Navigation + Game Mode ─── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Main Navigation Tabs */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Botón Volver con Icono */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href="/games/delta-force"
                                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 border border-gray-200 dark:border-white/5 transition-all duration-200 shrink-0"
                                    >
                                        <ArrowLeft size={16} />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black">
                                    Volver a Delta Force
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <div className="flex-1 sm:flex-initial flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-900/80 border border-gray-200 dark:border-white/5 rounded-xl">
                            <button
                                onClick={() => setActiveTab("meta")}
                                className={cn(
                                    "flex-1 sm:flex-initial px-5 py-2 rounded-lg text-[0.6875rem] font-black uppercase tracking-wider transition-all duration-200",
                                    activeTab === "meta"
                                        ? "bg-white dark:bg-zinc-800 text-foreground shadow border border-gray-200/60 dark:border-gray-700/60"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Builds
                            </button>
                            <button
                                onClick={() => setActiveTab("database")}
                                className={cn(
                                    "flex-1 sm:flex-initial px-5 py-2 rounded-lg text-[0.6875rem] font-black uppercase tracking-wider transition-all duration-200",
                                    activeTab === "database"
                                        ? "bg-white dark:bg-zinc-800 text-foreground shadow border border-gray-200/60 dark:border-gray-700/60"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Wiki
                            </button>
                        </div>
                    </div>

                    {/* Game Mode Toggle — shown only on meta tab */}
                    {activeTab === "meta" && (
                        <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-gray-900/70 border border-gray-200/60 dark:border-white/5 rounded-xl w-full sm:w-auto">
                            {GAME_MODES.map((mode) => {
                                const isActive = gameMode === mode.id;
                                const isOps = mode.id === "operations";
                                return (
                                    <button
                                        key={mode.id}
                                        onClick={() => {
                                            setGameMode(mode.id);
                                            setSearchQuery("");
                                            setActiveCategory("all");
                                            setSelectedCategoryDropdown("all");
                                            setSelectedCompare([]);
                                            setIsComparing(false);
                                        }}
                                        className={cn(
                                            "flex-1 sm:flex-initial flex flex-col items-center px-5 py-2 rounded-lg text-[0.625rem] font-black uppercase tracking-widest transition-all duration-200 gap-0.5 min-w-[90px]",
                                            isActive
                                                ? isOps
                                                    ? "bg-white dark:bg-zinc-800 text-df-green-600 dark:text-df-green-400 shadow border border-df-green-500/30 dark:border-df-green-500/20"
                                                    : "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow border border-blue-500/30 dark:border-blue-500/20"
                                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        )}
                                    >
                                        <span>{mode.label}</span>
                                        {isActive && (
                                            <span className={cn("text-[0.4375rem] font-bold opacity-70 tracking-widest", isOps ? "text-df-green-500" : "text-blue-500")}>
                                                {mode.sublabel}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {activeTab === "database" ? (
                    <DeltaForceDatabaseView />
                ) : (
                    <div className="space-y-5">
                        {/* ─── Sub-header: Title + count + Loadout branding ─── */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                    Meta {gameMode === "operations" ? "Operaciones" : "Warfare"}
                                </h2>
                                <span className="font-mono text-[0.5rem] font-black uppercase tracking-[0.12em] px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400">
                                    {String(data?.total_analyses || 0).padStart(2, '0')} CONFIGS
                                </span>
                            </div>
                            {/* Loadout Manager branding + parche activo */}
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[0.625rem] text-gray-400 dark:text-gray-500 font-medium">
                                    Las estadísticas son una referencia del momento en que se creó la build.
                                </p>
                                <span className="inline-flex items-center gap-1 text-[0.5625rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-df-green-500/10 border border-df-green-500/30 text-df-green-600 dark:text-df-green-400">
                                    ✓ {currentPatch}
                                </span>
                            </div>
                        </div>

                        {/* ─── Toolbar: Search + Dropdown + Patch Filter + Add ─── */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            {/* Search */}
                            <div className="relative flex-1 group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-3.5 w-3.5 text-gray-400 group-focus-within:text-gray-600 dark:group-focus-within:text-gray-300 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar arma..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-9 pr-4 py-2.5 bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 dark:focus:ring-white/10 dark:focus:border-white/20 transition-all dark:text-gray-100"
                                />
                            </div>

                            {/* Weapon Category Dropdown */}
                            <div className="w-full sm:w-52">
                                <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                                    <PopoverTrigger asChild>
                                        <button className="flex items-center justify-between w-full px-3.5 py-2.5 bg-gray-50/80 dark:bg-zinc-950 hover:bg-gray-100/50 dark:hover:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 transition-all cursor-pointer">
                                            <span>
                                                {selectedCategoryDropdown === "all" ? "Todas las categorías" : selectedCategoryDropdown}
                                            </span>
                                            <ChevronDown size={14} className={cn("text-gray-400 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[calc(100vw-2rem)] sm:w-52 p-1 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50">
                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                onClick={() => {
                                                    setSelectedCategoryDropdown("all");
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                                                    selectedCategoryDropdown === "all"
                                                        ? "bg-zinc-100 dark:bg-zinc-900 text-foreground"
                                                        : "text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-foreground"
                                                )}
                                            >
                                                Todas las categorías
                                            </button>
                                            {uniqueCategories.map((category) => (
                                                <button
                                                    key={category}
                                                    onClick={() => {
                                                        setSelectedCategoryDropdown(category);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                                                        selectedCategoryDropdown === category
                                                            ? "bg-zinc-100 dark:bg-zinc-900 text-foreground"
                                                            : "text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-foreground"
                                                    )}
                                                >
                                                    {category}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Patch Filter */}
                            <div className="w-full sm:w-auto flex items-center">
                                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                                    <button
                                        onClick={() => setPatchFilter("current")}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                            patchFilter === "current"
                                                ? "bg-df-green-500 text-white shadow-sm"
                                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                        )}
                                    >
                                        Parche Actual
                                    </button>
                                    <button
                                        onClick={() => setPatchFilter("all")}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                            patchFilter === "all"
                                                ? "bg-amber-500 text-white shadow-sm"
                                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                        )}
                                    >
                                        Todos los Parches
                                    </button>
                                </div>
                            </div>

                            {/* Add Button */}
                            <div className="flex items-center justify-end sm:justify-start">
                                <AddWeaponForm currentPatch={currentPatch} />
                            </div>
                        </div>

                        {/* ─── Category Filter + TTK Toggle ─── */}
                        <div className="relative border-b border-gray-100 dark:border-white/5 pb-0">
                            <div className="flex items-center justify-between overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                                <div className="flex items-center gap-0.5">
                                    {CATEGORIES.map((cat) => {
                                        const Icon = cat.icon;
                                        const isActive = activeCategory === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => setActiveCategory(cat.id)}
                                                className={cn(
                                                    "relative flex items-center gap-1.5 px-3 py-2.5 text-[0.6875rem] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                                    isActive
                                                        ? "text-gray-900 dark:text-white"
                                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                )}
                                            >
                                                <Icon size={12} className={cn("transition-transform", isActive ? "scale-110" : "opacity-50")} />
                                                <span className="hidden xs:inline sm:hidden md:inline">{cat.label}</span>
                                                <span className="xs:hidden sm:inline md:hidden">{cat.id === "all" ? "Todas" : cat.label.split(" ")[0]}</span>
                                                {isActive && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-t-full" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* TTK Quick Toggle & Favorites Toggle */}
                                <div className="flex items-center pl-2 border-l border-gray-200 dark:border-white/10 ml-1 my-2 shrink-0 gap-1.5">
                                    <button
                                        onClick={() => setSortByTtk(!sortByTtk)}
                                        className={cn(
                                            "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                            sortByTtk
                                                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 active:scale-95"
                                                : "bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-transparent hover:border-rose-500/20"
                                        )}
                                    >
                                        <Zap size={10} className={cn(sortByTtk ? "animate-pulse fill-current" : "opacity-50")} />
                                        {gameMode === "operations" ? "TTK NV4" : "TTK BASE"}
                                    </button>

                                    {voteSystem.isLoggedIn && (
                                        <button
                                            onClick={() => setShowFavorites(!showFavorites)}
                                            className={cn(
                                                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                                showFavorites
                                                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 active:scale-95"
                                                    : "bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border border-transparent hover:border-amber-500/20"
                                            )}
                                            title="Ver builds favoritas (votadas positivamente)"
                                        >
                                            <Heart size={10} className={cn(showFavorites ? "fill-current" : "opacity-50")} />
                                            <span>Favoritas</span>
                                        </button>
                                    )}
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
                                {!searchQuery.trim() && activeCategory === "all" && !sortByTtk && !showFavorites && data?.top_voted && data.top_voted.length > 0 && (
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
                                                                <span className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[0.625rem] font-black flex items-center justify-center border border-border shadow-md">
                                                                    {idx + 1}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <WeaponMetaCard
                                                            weapon={weapon}
                                                            config={config}
                                                            baseWeapon={baseWeaponsMap.get(weapon.weapon_name.toUpperCase().replace(/\s+/g, "-"))}
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
                                                            baseWeapon={baseWeaponsMap.get(weapon.weapon_name.toUpperCase().replace(/\s+/g, "-"))}
                                                            voteSystem={voteSystem}
                                                            gameMode={gameMode}
                                                            currentPatch={currentPatch}
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
                                <p className="text-[0.625rem] text-gray-400 dark:text-gray-700 uppercase tracking-widest font-bold">KoreStats • Delta Force Global Meta</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Compare Tray Floating Bar */}
                {selectedCompare.length > 0 && !isComparing && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300 w-[calc(100%-2rem)] max-w-xl">
                        <div className="backdrop-blur-md bg-white/80 dark:bg-zinc-950/75 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.45)]">
                            <div className="flex items-center gap-2">
                                <span className="text-[0.625rem] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
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
                                                    <div className="relative w-full h-full">
                                                        <Image src={w.image_url} alt={w.weapon_name} fill sizes="32px" className="object-contain p-0.5" />
                                                    </div>
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
    baseWeapon,
    voteSystem,
    gameMode,
    currentPatch,
    isCompareSelected,
    onCompareToggle,
    isCompareDisabled,
}: {
    weapon: WeaponMeta;
    config: any;
    baseWeapon?: any;
    voteSystem?: ReturnType<typeof useWeaponVote>;
    gameMode?: GameMode;
    currentPatch?: string;
    isCompareSelected: boolean;
    onCompareToggle: () => void;
    isCompareDisabled: boolean;
}) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const isOwner = user && weapon.user_id === user.id;
    const isOutdated = !!currentPatch && !!weapon.patch_version && weapon.patch_version !== currentPatch;

    const getShortPatch = (patch: string | null | undefined) => {
        if (!patch) return "";
        const match = patch.match(/\d+/);
        return match ? `S${match[0]}` : patch.substring(0, 4).toUpperCase();
    };
    const shortPatch = getShortPatch(weapon.patch_version);

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/weapons/${weapon.record_id}`, { method: "DELETE" });
            if (res.ok) {
                queryClient.invalidateQueries({ queryKey: ["delta-force-weapons-meta"] });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const armorLevel = gameMode === "warfare" ? 0 : 4;
    // Colores del glow de fondo por tier
    const tierGlowStyle: Record<string, { dark: string; light: string }> = {
        S: { dark: "rgba(245,158,11,0.13)", light: "rgba(245,158,11,0.06)" },
        A: { dark: "rgba(16,185,129,0.13)", light: "rgba(16,185,129,0.06)" },
        B: { dark: "rgba(59,130,246,0.13)", light: "rgba(59,130,246,0.06)" },
        C: { dark: "rgba(107,114,128,0.10)", light: "rgba(107,114,128,0.04)" },
    };
    const glow = tierGlowStyle[weapon.tier] ?? tierGlowStyle.C;

    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-2xl border bg-white dark:bg-gray-950/60 shadow-sm dark:shadow-none flex flex-col h-full transition-all duration-300",
                config.borderColor,
                isCompareSelected && "ring-2 ring-df-green-500/50 border-df-green-500/60 dark:border-df-green-500/40 shadow-md shadow-df-green-500/10",
                isOutdated && "opacity-90"
            )}
            style={{ color: config.barColor }}
        >
            {/* Banner de advertencia para builds de parches anteriores */}
            {isOutdated && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-400">
                    <span className="text-sm leading-none">⚠️</span>
                    <p className="text-[0.5625rem] font-bold leading-tight">
                        Los valores de esta build corresponden a <span className="font-black">{weapon.patch_version}</span> y podrían haber cambiado en el juego.
                    </p>
                </div>
            )}
            {/* Background Glow */}
            <div className="relative p-3.5 flex flex-col flex-1 h-full">
                {/* Image Section with Overlays */}
                <div
                    className="relative w-full h-32 flex items-center justify-center group/img rounded-xl overflow-hidden border border-border/30"
                    style={{
                        /* Cuadrícula táctica sutil */
                        backgroundImage: [
                            `repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(128,128,128,0.07) 19px, rgba(128,128,128,0.07) 20px)`,
                            `repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(128,128,128,0.07) 19px, rgba(128,128,128,0.07) 20px)`,
                        ].join(","),
                    }}
                >
                    {/* Glow de tier — modo oscuro */}
                    <div
                        className="absolute inset-0 pointer-events-none hidden dark:block"
                        style={{ background: `radial-gradient(ellipse 85% 65% at 50% 75%, ${glow.dark}, transparent)` }}
                    />
                    {/* Glow de tier — modo claro */}
                    <div
                        className="absolute inset-0 pointer-events-none dark:hidden"
                        style={{ background: `radial-gradient(ellipse 85% 65% at 50% 75%, ${glow.light}, transparent)` }}
                    />
                    {/* Category Tag (Absolute Top-Left) */}
                    <div className="absolute top-2 left-2 z-20 flex gap-1.5 items-center">
                        <span className="text-[0.5625rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-md text-foreground border border-border shadow-sm">
                            {weapon.category}
                        </span>
                    </div>

                    {/* Patch Badge (Absolute Bottom-Right) */}
                    {shortPatch && (
                        <div className="absolute bottom-2 right-2 z-20">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="text-[0.5625rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm backdrop-blur-md cursor-help">
                                            {shortPatch}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-[0.625rem] font-bold bg-popover border border-border/80 text-popover-foreground shadow-md px-2.5 py-1.5 z-50">
                                        Esta build fue registrada en la {weapon.patch_version || "Temporada actual"}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}

                    {/* TTK Badge Overlay */}
                    {(() => {
                        const ttk = calculateTTK(
                            weapon.avg_damage,
                            weapon.avg_fire_rate,
                            weapon.avg_armor_penetration,
                            armorLevel,
                            weapon.category,
                            gameMode,
                            30,
                            weapon.avg_range
                        );
                        if (!ttk) return null;
                        const tooltipText = gameMode === "warfare"
                            ? "TTK en Warfare a 30m contra objetivo sin blindaje (100 HP)"
                            : "TTK en Operaciones a 30m usando bala Nivel 4 contra chaleco Nivel 4";
                        return (
                            <div className="absolute top-2 right-2 z-20">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 flex flex-col items-center cursor-help">
                                                <span className="text-[0.4375rem] font-black text-gray-400 uppercase leading-none">TTK {armorLevel > 0 ? "Nv4" : "Base"}</span>
                                                <span className="text-[0.625rem] font-mono font-black text-white leading-tight">
                                                    {ttk.toFixed(2)}s
                                                </span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-[0.625rem] font-bold bg-popover border border-border/80 text-popover-foreground shadow-md px-2.5 py-1.5 z-50">
                                            {tooltipText}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        );
                    })()}

                    {weapon.image_url && (
                        <Image
                            src={weapon.image_url}
                            alt={weapon.weapon_name}
                            fill
                            sizes="(max-width: 768px) 100vw, 300px"
                            className="z-10 object-contain p-2 transition-transform duration-500 ease-out drop-shadow-md"
                        />
                    )}

                </div>

                {/* Name & Title */}
                <div className="text-center px-1 mt-3 flex flex-col gap-0.5">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white leading-none truncate uppercase tracking-tight">
                        {weapon.description || weapon.weapon_name}
                    </h3>
                    {weapon.description && (
                        <span className="text-[0.5625rem] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            {weapon.weapon_name}
                        </span>
                    )}
                </div>

                {/* Main Stats - 2 Column Grid - Segmented HUD bars */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4">
                    {STAT_BARS.map((stat) => {
                        const value = weapon[stat.key as keyof WeaponMeta] as number;
                        const pct = Math.min((value / stat.max) * 100, 100);
                        const Icon = stat.icon;
                        const SEGMENTS = 20;
                        const filledSegments = Math.round((pct / 100) * SEGMENTS);

                        const baseKey = stat.key.replace("avg_", "base_");
                        const rawBase = baseWeapon?.[baseKey];
                        const baseValue = typeof rawBase === 'string' ? parseInt(rawBase, 10) : typeof rawBase === 'number' ? rawBase : null;
                        const basePct = baseValue !== null ? Math.min((baseValue / stat.max) * 100, 100) : null;
                        const baseSegments = basePct !== null ? Math.round((basePct / 100) * SEGMENTS) : null;

                        return (
                            <div key={stat.key} className="space-y-0.5">
                                <div className="flex justify-between items-end text-[0.5625rem] sm:text-xs">
                                    <div className="flex items-center gap-0.5 text-gray-500 dark:text-gray-400 pb-0.5 leading-none">
                                        <Icon size={10} className="opacity-60" />
                                        <span className="font-bold uppercase tracking-tighter">{stat.label}</span>
                                    </div>
                                    <span className="font-mono font-black text-gray-800 dark:text-gray-200 text-[0.75rem] sm:text-sm leading-none">{value}{(stat as any).unit || ""}</span>
                                </div>
                                {/* Segmented bar */}
                                <div className="flex gap-px h-1.5">
                                    {Array.from({ length: SEGMENTS }).map((_, i) => {
                                        const isFilled = i < filledSegments;
                                        const isBase = baseSegments !== null && i === baseSegments - 1;
                                        return (
                                            <div
                                                key={i}
                                                title={isBase ? `Base: ${baseValue}` : undefined}
                                                className="flex-1 rounded-[1px] transition-all duration-500"
                                                style={{
                                                    backgroundColor: isFilled
                                                        ? config.barColor
                                                        : 'var(--seg-empty)',
                                                    boxShadow: isFilled && i === filledSegments - 1
                                                        ? `0 0 4px ${config.barColor}88`
                                                        : undefined,
                                                }}
                                            >
                                                {/* Marcador base */}
                                                {isBase && (
                                                    <div className="w-full h-full bg-white/80 dark:bg-white/40 rounded-[1px] ring-1 ring-gray-500/30 dark:ring-white/30" />
                                                )}
                                            </div>
                                        );
                                    })}
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
                                <span className="text-[0.625rem] text-muted-foreground leading-none">
                                    {value}{stat.unit}
                                </span>
                                <span className="text-[0.4375rem] text-muted-foreground uppercase font-bold tracking-tighter whitespace-nowrap">{stat.label === 'Vel. Boca' ? 'Vel.' : stat.label}</span>
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
                                            <span className="text-[0.5625rem] font-black uppercase tracking-tighter transition-colors cursor-help hover:opacity-80 text-slate-500 dark:text-slate-400">
                                                {tag.label}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-[0.625rem] font-bold bg-popover border border-border/80 text-popover-foreground shadow-md px-2.5 py-1.5 z-50">
                                            {tag.desc}
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </TooltipProvider>
                    );
                })()}

                {/* Bottom: Action & Vote Buttons (PUSHED TO BOTTOM) */}
                <div className="mt-auto pt-6 space-y-2">
                    <div className="grid grid-cols-3 items-center w-full px-1">
                        {/* Izquierda: Votos */}
                        <div className="flex items-center gap-1 justify-start">
                            {/* Upvote */}
                            <button
                                onClick={() => voteSystem?.castVote(weapon.id, 1)}
                                title={voteSystem?.isLoggedIn ? "Voto positivo" : "Inicia sesión para votar"}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[0.625rem] font-black border transition-all",
                                    voteSystem?.getUserVote(weapon.id) === 1
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
                                onClick={() => voteSystem?.castVote(weapon.id, -1)}
                                title={voteSystem?.isLoggedIn ? "Voto negativo" : "Inicia sesión para votar"}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[0.625rem] font-black border transition-all",
                                    voteSystem?.getUserVote(weapon.id) === -1
                                        ? "bg-rose-500/20 border-rose-500/50 text-rose-600 dark:text-rose-400"
                                        : "bg-gray-100 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 text-gray-500 hover:border-rose-500/40 hover:text-rose-500",
                                    !voteSystem?.isLoggedIn && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <ThumbsDown size={10} />
                                <span>{weapon.downvotes}</span>
                            </button>
                        </div>

                        {/* Centro: Comparar (Mejorado con texto e icono claro) */}
                        <div className="flex items-center justify-center">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onCompareToggle();
                                }}
                                disabled={isCompareDisabled}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-lg border text-[0.5625rem] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 active:scale-95",
                                    isCompareSelected
                                        ? "bg-df-green-500 border-df-green-600 text-white hover:bg-df-green-600 shadow-md shadow-df-green-500/20"
                                        : "bg-gray-100 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                )}
                                title={isCompareSelected ? "Quitar de comparar" : "Comparar arma"}
                            >
                                <Scale size={11} className={cn("transition-transform", isCompareSelected && "scale-110")} />
                                <span>{isCompareSelected ? "Comparando" : "Comparar"}</span>
                            </button>
                        </div>

                        {/* Derecha: Reportar o Eliminar */}
                        <div className="flex items-center justify-end">
                            {isOwner ? (
                                <Popover open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                                    <PopoverTrigger asChild>
                                        <button
                                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-rose-500 hover:border-rose-500/50 transition-colors"
                                            title="Eliminar build"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" align="end" className="w-48 p-3 bg-gray-900 border-white/10 shadow-2xl z-50">
                                        <p className="text-[0.625rem] font-bold text-white uppercase mb-2">¿Eliminar esta build?</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { handleDelete(); setIsDeleteOpen(false); }}
                                                className="flex-1 py-1 rounded-md bg-rose-600 text-white text-[0.5625rem] font-black uppercase hover:bg-rose-700 transition-colors"
                                            >
                                                Sí, borrar
                                            </button>
                                            <button
                                                onClick={() => setIsDeleteOpen(false)}
                                                className="flex-1 py-1 rounded-md bg-gray-800 text-gray-400 text-[0.5625rem] font-black uppercase hover:bg-gray-700 transition-colors"
                                            >
                                                No
                                            </button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <ReportWeaponButton weaponStatsRecordId={weapon.record_id} />
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
                    ? "text-[0.5625rem] text-gray-500 dark:text-gray-500"
                    : "text-[0.625rem] text-gray-600 dark:text-gray-400 group-hover/btn:text-df-green-700 dark:group-hover/btn:text-df-green-300"
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
