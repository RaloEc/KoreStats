"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
    subsets: ["latin"],
    weight: ["400", "700", "900"],
    display: "swap",
});
import {
    Newspaper,
    Calendar,
    Hammer,
    Swords,
    Gamepad2,
    MessageSquare,
    Eye,
    ChevronRight,
    ChevronLeft,
    Trophy,
    TrendingUp,
    Copy,
    Check,
    Activity,
    Target,
    Gauge,
    Flame,
    Zap,
    Crosshair,
    Wind,
    Package,
    Shield,
    Volume2,
    Clock,
    ThumbsUp,
    ThumbsDown,
    Medal,
    Focus,
    Edit2,
    Save,
    X,
    Loader2
} from "lucide-react";
import type { GameInfo } from "@/modules/types";
import { WeaponAggregate } from "@/lib/games/delta-force-weapons";
import ServerStatusWidget from "@/components/riot/ServerStatusWidget";
import MapRotationWidget from "@/components/widgets/MapRotationWidget";
import { SupabaseImage } from "@/components/ui/SupabaseImage";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";
import ClanWidget from "@/components/clanes/ClanWidget";
import { createClient } from "@/lib/supabase/client";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { calculateStandardTTK } from "@/lib/delta-force/defaultData";


/* ─── Weapon Card Constants & Helpers ─── */

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
    const bulletLevel = armorLevel > 0 ? armorLevel : 4;
    return calculateStandardTTK(damage, fireRate, armorLevel, bulletLevel, category, gameMode, distance, penetration, range);
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


/* ─── News Card Constants & Helpers ─── */

const getNewsBadgeAndColor = (type: string, title: string) => {
    const lowerType = (type || "").toLowerCase();
    const lowerTitle = (title || "").toLowerCase();

    const isPatch = lowerType.includes("patch") || lowerType.includes("parche") || lowerType.includes("lol_patch") || lowerTitle.includes("patch") || lowerTitle.includes("parche") || lowerTitle.includes("actualización") || lowerTitle.includes("actualizacion") || lowerTitle.includes("deployment");

    if (isPatch) {
        return {
            label: "PATCH NOTES",
            badgeBg: "bg-cyan-400 text-black",
            hoverBorderColor: "hover:border-cyan-500/50",
            titleColor: "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
        };
    } else {
        return {
            label: "COMMUNITY",
            badgeBg: "bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-500/30",
            hoverBorderColor: "hover:border-teal-500/50",
            titleColor: "group-hover:text-teal-600 dark:group-hover:text-teal-400",
        };
    }
};

const formatViews = (views: number) => {
    if (!views) return "0";
    if (views >= 1000) {
        return (views / 1000).toFixed(1).replace(".0", "") + "K";
    }
    return views.toString();
};

const NewsImage = ({ src, alt }: { src: string | null; alt: string }) => {
    if (!src) {
        return (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-purple-950/20 flex items-center justify-center">
                <span className="text-gray-600 text-xs font-black tracking-widest uppercase">KoreStats</span>
            </div>
        );
    }
    if (src.startsWith("http")) {
        return (
            <Image
                src={src}
                alt={alt}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, 400px"
            />
        );
    }
    return (
        <SupabaseImage
            src=""
            bucket="imagenes"
            path={src}
            alt={alt}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 400px"
        />
    );
};

interface GamePageClientProps {
    game: GameInfo;
    activeModules: string[];
    modules?: any[];
    initialNews: any[];
    initialEvents: any[];
    initialBuilds: any[];
    initialThreads: any[];
    weaponsMeta?: {
        weapons: WeaponAggregate[];
        top_voted: WeaponAggregate[];
    } | null;
    stats?: {
        buildsCount: number;
        newsCount: number;
        usersCount: number;
    };
}

export default function GamePageClient({
    game,
    activeModules,
    modules = [],
    initialNews,
    initialEvents,
    initialBuilds,
    initialThreads,
    weaponsMeta,
    stats,
}: GamePageClientProps) {

    const carouselRef = useRef<HTMLDivElement>(null);

    const { data: baseWeaponsData } = useQuery({
        queryKey: ["df-base-weapons-ops-war"],
        queryFn: async () => {
            const [opsRes, warRes] = await Promise.all([
                fetch("/api/games/delta-force/base-data?type=weapons&mode=operations"),
                fetch("/api/games/delta-force/base-data?type=weapons&mode=warfare")
            ]);
            const opsData = opsRes.ok ? await opsRes.json() : { weapons: [] };
            const warData = warRes.ok ? await warRes.json() : { weapons: [] };
            return [...(opsData.weapons || []), ...(warData.weapons || [])];
        },
        enabled: game.slug === "delta-force",
        staleTime: 5 * 60 * 1000,
    });

    const baseWeaponsMap = useMemo(() => {
        const map = new Map<string, any>();
        if (!baseWeaponsData) return map;
        const normalize = (name: string) => {
            return name
                .replace(/^(Fusil de asalto|Fusil de batalla|Ametralladora ligera|Subfusil|Rifle de francotirador|Rifle de tirador|Pistola|Escopeta)\s+/i, "")
                .trim()
                .toUpperCase()
                .replace(/\s+/g, "-");
        };
        baseWeaponsData.forEach((w: any) => {
            if (!w.weapon_name) return;
            const key = `${normalize(w.weapon_name)}_${w.game_mode || "operations"}`;
            map.set(key, w);
        });
        return map;
    }, [baseWeaponsData]);

    const scrollLeft = () => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: -340, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: 340, behavior: "smooth" });
        }
    };

    // Módulo Command Center
    const commandCenterModule = modules?.find(m => m.module_type === "command_center" && m.enabled);
    const hasCommandCenter = !!commandCenterModule;
    const bannerConfig = commandCenterModule?.config || {};
    const bannerImageSrc = bannerConfig.banner_image_url || "";
    const seasonNameText = bannerConfig.season_name || "ECO Season";
    const seasonVersionText = bannerConfig.season_version || "v1.0.4";

    const [seasonName, setSeasonName] = useState(seasonNameText);
    const [seasonVersion, setSeasonVersion] = useState(seasonVersionText);

    useEffect(() => {
        setSeasonName(seasonNameText);
        setSeasonVersion(seasonVersionText);
    }, [seasonNameText, seasonVersionText]);

    // Verificar si el usuario es Admin
    const [isAdmin, setIsAdmin] = useState(false);
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from("perfiles")
                        .select("role")
                        .eq("id", user.id)
                        .single();
                    if (profile?.role === "admin") {
                        setIsAdmin(true);
                    }
                }
            } catch (err) {
                console.error("Error checking admin role:", err);
            }
        };
        checkAdmin();
    }, []);

    // Rotación del mapa activa para el banner
    const [currentMapName, setCurrentMapName] = useState("Represa Zero");
    const [timeLeftStr, setTimeLeftStr] = useState("02:00:00");

    useEffect(() => {
        if (!hasCommandCenter) return;
        const updateRotation = () => {
            const now = new Date();
            const utcH = now.getUTCHours();
            const nextUtcH = utcH % 2 === 0 ? utcH + 2 : utcH + 1;
            const target = new Date(now);
            target.setUTCHours(nextUtcH, 0, 0, 0);

            const diff = target.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeLeftStr("00:00:00");
                return;
            }

            const totalSecs = Math.floor(diff / 1000);
            const hrs = Math.floor(totalSecs / 3600);
            const mins = Math.floor((totalSecs % 3600) / 60);
            const secs = totalSecs % 60;

            setTimeLeftStr(
                `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
            );

            const blockIndex = Math.floor(utcH / 2);
            // Rotamos nombres en español de mapas
            const maps = ["Layali Grove", "Tide Prison", "Brakkesh", "Zero Dam", "Space City"];
            const translationMap: Record<string, string> = {
                "Zero Dam": "Represa Zero",
                "Layali Grove": "Bosque Layali",
                "Brakkesh": "Brakkesh",
                "Tide Prison": "Prisión Tide",
                "Space City": "Ciudad Espacial"
            };
            const mapSelected = maps[blockIndex % maps.length] || "Zero Dam";
            setCurrentMapName(translationMap[mapSelected] || mapSelected);
        };

        updateRotation();
        const interval = setInterval(updateRotation, 1000);
        return () => clearInterval(interval);
    }, [hasCommandCenter]);

    // Auto-scroll táctico para el carrusel de armas (con rebote al final y pausa por Hover/Touch)
    useEffect(() => {
        let animationFrameId: number;
        let timeoutId: NodeJS.Timeout;
        let isHovered = false;

        const handleMouseEnter = () => { 
            // Ignorar en pantallas táctiles para evitar hover ficticio permanente
            if (window.matchMedia("(pointer: coarse)").matches) return;
            isHovered = true; 
        };
        const handleMouseLeave = () => { 
            if (window.matchMedia("(pointer: coarse)").matches) return;
            isHovered = false; 
        };
        const handleTouchStart = () => { isHovered = true; };
        const handleTouchEnd = () => {
            // Delay de 1 segundo tras soltar la pantalla táctil para reanudar el autoscroll
            setTimeout(() => { isHovered = false; }, 1000);
        };

        // Damos un pequeño delay para asegurar que React haya montado el carrusel en el DOM
        timeoutId = setTimeout(() => {
            const carousel = carouselRef.current;
            if (!carousel) return;

            let direction: "forward" | "backward" = "forward";

            const scrollStep = () => {
                if (!isHovered && carousel) {
                    const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
                    if (maxScrollLeft > 0) {
                        const currentScroll = carousel.scrollLeft;

                        if (direction === "forward" && currentScroll >= maxScrollLeft - 1) {
                            direction = "backward";
                        } else if (direction === "backward" && currentScroll <= 1) {
                            direction = "forward";
                        }

                        const speed = 0.45; // Ajuste de velocidad para un efecto ultra-suave
                        if (direction === "forward") {
                            carousel.scrollLeft += speed;
                        } else {
                            carousel.scrollLeft -= speed;
                        }
                    }
                }
                animationFrameId = requestAnimationFrame(scrollStep);
            };

            carousel.addEventListener("mouseenter", handleMouseEnter);
            carousel.addEventListener("mouseleave", handleMouseLeave);
            carousel.addEventListener("touchstart", handleTouchStart, { passive: true });
            carousel.addEventListener("touchend", handleTouchEnd, { passive: true });
            carousel.addEventListener("touchcancel", handleTouchEnd, { passive: true });

            animationFrameId = requestAnimationFrame(scrollStep);
        }, 600);

        return () => {
            clearTimeout(timeoutId);
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            const carousel = carouselRef.current;
            if (carousel) {
                carousel.removeEventListener("mouseenter", handleMouseEnter);
                carousel.removeEventListener("mouseleave", handleMouseLeave);
                carousel.removeEventListener("touchstart", handleTouchStart);
                carousel.removeEventListener("touchend", handleTouchEnd);
                carousel.removeEventListener("touchcancel", handleTouchEnd);
            }
        };
    }, [weaponsMeta?.weapons?.length]);

    const formatStatNumber = (num: number) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(".0", "") + "k";
        }
        return num.toString();
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">

            {game.slug === "delta-force" && hasCommandCenter && (
                <DeltaForceHeader 
                    bannerImageSrc={bannerImageSrc}
                    seasonNameText={seasonName}
                    seasonVersionText={seasonVersion}
                    currentMapName={currentMapName}
                    timeLeftStr={timeLeftStr}
                    activeModules={activeModules}
                    gameSlug={game.slug}
                    stats={stats}
                    isAdmin={isAdmin}
                    moduleId={commandCenterModule?.id}
                    moduleConfig={bannerConfig}
                    onUpdateSeason={(newName, newVersion) => {
                        setSeasonName(newName);
                        setSeasonVersion(newVersion);
                    }}
                />
            )}

            {/* Weapon Showcase Section (Only for Delta Force) */}
            {game.slug === "delta-force" && activeModules.includes("weapons") && weaponsMeta && (
                <div className="mb-16 px-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-[2px] bg-teal-500 shrink-0" />
                            <h2 className={`text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-wider uppercase ${orbitron.className}`}>
                                Armamento Destacado
                            </h2>
                        </div>
                        
                        {/* Controles y Botón Ver Meta en una sola línea para móvil */}
                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                            {/* Navigation controls for Carousel */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={scrollLeft}
                                    className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-border/40 hover:border-teal-500/50 text-gray-600 dark:text-gray-400 dark:hover:text-teal-400 transition-all active:scale-90"
                                    aria-label="Anterior"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button 
                                    onClick={scrollRight}
                                    className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-border/40 hover:border-teal-500/50 text-gray-600 dark:text-gray-400 dark:hover:text-teal-400 transition-all active:scale-90"
                                    aria-label="Siguiente"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            <Link
                                href={`/games/${game.slug}/weapons`}
                                className="group relative inline-flex items-center gap-3 px-5 md:px-7 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-teal-600 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-gray-300 dark:hover:text-teal-400 font-black text-[0.625rem] uppercase tracking-[0.2em] transition-all border border-slate-200 dark:border-white/5 hover:border-teal-500/50 dark:hover:border-teal-500/50 hover:shadow-[0_0_20px_rgba(20,184,166,0.1)] dark:hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] active:scale-95 shrink-0"
                            >
                                <span>Ver Meta</span>
                                <Swords size={16} className="text-teal-600 dark:text-teal-500 group-hover:rotate-12 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Featured COMPACT Carousel Layout */}
                    {(() => {
                        // 1. Obtener las 3 armas elite (S-Tier o mejores del ranking general)
                        let eliteWeapons = weaponsMeta.weapons.filter(w => w.tier === 'S');
                        if (eliteWeapons.length < 3) {
                            eliteWeapons = weaponsMeta.weapons.slice(0, 3);
                        } else {
                            eliteWeapons = eliteWeapons.slice(0, 3);
                        }

                        // 2. Obtener las 3 armas de la comunidad evitando duplicados con elite
                        const eliteNames = new Set(eliteWeapons.map(w => w.weapon_name));
                        let communityChoices = weaponsMeta.top_voted.filter(w => !eliteNames.has(w.weapon_name));
                        
                        if (communityChoices.length < 3) {
                            const remaining = weaponsMeta.weapons.filter(w => !eliteNames.has(w.weapon_name));
                            communityChoices = [...communityChoices, ...remaining].slice(0, 3);
                        } else {
                            communityChoices = communityChoices.slice(0, 3);
                        }

                        const allFeatured = [...eliteWeapons, ...communityChoices];

                        return (
                            <div 
                                ref={carouselRef}
                                className="flex gap-6 overflow-x-auto scroll-smooth pb-4 scrollbar-none touch-pan-x select-none"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {allFeatured.map((w, index) => (
                                    <div 
                                        key={`${index < 3 ? 'elite' : 'comm'}-${w.weapon_name}-${w.game_mode}`}
                                        className="w-[290px] md:w-[330px] shrink-0 snap-start snap-always"
                                    >
                                        <WeaponCard 
                                            weapon={w} 
                                            baseWeapon={baseWeaponsMap.get(`${w.weapon_name.toUpperCase().replace(/\s+/g, "-")}_${w.game_mode || "operations"}`)} 
                                        />
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Main Content Grid */}
            <div className="min-h-[400px]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* News Feed */}
                    {activeModules.includes("news") && (
                        <div id="noticias-seccion" className="lg:col-span-2 scroll-mt-24">
                            <div className="flex items-center justify-between mb-10">
                                {game.slug === "delta-force" ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-[2px] bg-teal-500 shrink-0" />
                                        <h2 className={`text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-wider uppercase ${orbitron.className}`}>
                                            Ultimas noticias
                                        </h2>
                                    </div>
                                ) : (
                                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-wider flex items-center uppercase">
                                        <div className="w-1.5 h-7 bg-cyan-400 mr-3 shrink-0" />
                                        Ultimas noticias
                                    </h2>
                                )}
                                <Link
                                    href={`/games/${game.slug}/news`}
                                    className="text-xs font-bold text-teal-600 hover:text-teal-500 dark:text-teal-400 transition-colors uppercase tracking-[0.2em] flex items-center gap-2"
                                >
                                    VER TODO
                                    <ChevronRight size={16} />
                                </Link>
                            </div>

                            {initialNews.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {initialNews.map((noticia: any) => {
                                        const cleanPreview = noticia.contenido
                                            ? noticia.contenido.replace(/<[^>]*>/g, '').substring(0, 160)
                                            : "";
                                        const config = getNewsBadgeAndColor(noticia.type, noticia.titulo);

                                        return (
                                            <Link
                                                key={noticia.id}
                                                href={noticia.type === 'lol_patch' && noticia.slug
                                                    ? `/games/league-of-legends/patch/${noticia.slug.replace('parche-', '')}`
                                                    : `/noticias/${noticia.id}`}
                                                className={cn(
                                                    "block group relative rounded-2xl bg-slate-50 dark:bg-[#090f11] border border-slate-200 dark:border-white/5 transition-all duration-300 overflow-hidden flex flex-col h-full",
                                                    config.hoverBorderColor
                                                )}
                                            >
                                                {/* Image Section */}
                                                <div className="relative w-full h-48 md:h-52 overflow-hidden bg-slate-200 dark:bg-slate-900 shrink-0">
                                                    {/* Badge */}
                                                    <div className="absolute top-4 left-4 z-20">
                                                        <span className={cn("text-[0.5625rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-sm", config.badgeBg)}>
                                                            {config.label}
                                                        </span>
                                                    </div>
                                                    <NewsImage src={noticia.imagen_portada} alt={noticia.titulo} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-[#090f11] via-transparent to-transparent opacity-85" />
                                                </div>

                                                {/* Content Section */}
                                                <div className="p-5 flex flex-col flex-grow">
                                                    <h3 className={cn(
                                                        "text-lg font-black tracking-tight leading-snug mb-2 transition-colors duration-300 text-slate-950 dark:text-white",
                                                        config.titleColor
                                                    )}>
                                                        {noticia.titulo}
                                                    </h3>

                                                    <p className="text-slate-600 dark:text-gray-400 text-xs line-clamp-2 font-medium leading-relaxed mb-4 flex-grow">
                                                        {cleanPreview}...
                                                    </p>

                                                    {/* Footer */}
                                                    <div className="flex items-center justify-between text-[0.625rem] font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest pt-3 border-t border-slate-200 dark:border-white/5 mt-auto">
                                                        <span className="flex items-center gap-1.5">
                                                            {noticia.fecha_publicacion
                                                                ? new Date(noticia.fecha_publicacion).toLocaleDateString("es-ES", {
                                                                    day: "numeric",
                                                                    month: "short",
                                                                    year: "numeric"
                                                                })
                                                                : ""}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Eye size={12} className="opacity-60" />
                                                            {formatViews(noticia.vistas ?? 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-20 text-center rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                                    <Newspaper className="mx-auto text-gray-300 dark:text-gray-700 mb-6" size={64} />
                                    <p className="text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest text-sm">
                                        Sin actualizaciones recientes
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sidebar Area */}
                    <div className="space-y-12">
                        {game.slug === "delta-force" && activeModules.includes("rotations") && (
                            <MapRotationWidget />
                        )}

                        {game.slug === "league-of-legends" && (
                            <ServerStatusWidget />
                        )}

                        {/* Widget de Clanes — disponible para todos los juegos con el módulo clanes habilitado */}
                        {(game.slug === "delta-force" || game.slug === "league-of-legends") && activeModules.includes("clans") && (
                            <ClanWidget
                                game={game.slug === "delta-force" ? "delta_force" : "league_of_legends"}
                                gameSlug={game.slug}
                            />
                        )}

                        {activeModules.includes("events") && (
                            <div className="p-1">
                                {game.slug === "delta-force" ? (
                                    <div className="flex items-center gap-3 mb-10">
                                        <div className="w-4 h-[2px] bg-teal-500 shrink-0" />
                                        <h2 className={`text-base font-black text-gray-900 dark:text-white tracking-wider uppercase ${orbitron.className}`}>
                                            Calendario táctico
                                        </h2>
                                    </div>
                                ) : (
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-10 flex items-center gap-4">
                                        <div className="w-2 h-8 bg-purple-600 rounded-full shadow-lg shadow-purple-600/20" />
                                        Calendario táctico
                                    </h2>
                                )}
                                {initialEvents.length > 0 ? (
                                    <div className="space-y-4">
                                        {initialEvents.map((evento: any) => {
                                            const eventDate = new Date(evento.fecha);
                                            const today = new Date();
                                            const diffTime = eventDate.getTime() - today.getTime();
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                            return (
                                                <div
                                                    key={evento.id}
                                                    className="group relative p-5 rounded-[2rem] bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] hover:border-purple-500/30 dark:hover:border-purple-500/30 hover:bg-white dark:hover:bg-white/[0.05] transition-all shadow-sm hover:shadow-xl hover:-translate-y-1"
                                                >
                                                    <div className="flex items-center justify-between gap-3 mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[0.5rem] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest ${evento.tipo === "parche"
                                                                ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                                                : evento.tipo === "evento"
                                                                    ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                                                                    : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                                                                }`}>
                                                                {evento.tipo}
                                                            </span>
                                                            {diffDays <= 7 && diffDays >= 0 && (
                                                                <span className="text-[0.5rem] font-black uppercase tracking-widest text-orange-500 animate-pulse">
                                                                    Inminente
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="block text-[0.625rem] text-gray-400 font-black uppercase tracking-widest leading-none">
                                                                {eventDate.toLocaleDateString("es-ES", {
                                                                    day: "numeric", month: "short"
                                                                })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start justify-between gap-4">
                                                        <p className="font-black text-gray-900 dark:text-white text-base tracking-tight leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                            {evento.titulo}
                                                        </p>

                                                        <div className="flex flex-col items-end shrink-0">
                                                            <span className="text-[0.875rem] font-black text-gray-900 dark:text-white leading-none">
                                                                {diffDays === 0 ? "HOY" : diffDays === 1 ? "MAÑANA" : diffDays}
                                                            </span>
                                                            <span className="text-[0.5rem] font-black text-gray-400 uppercase tracking-tighter">
                                                                {diffDays > 1 ? "DÍAS" : ""}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Decorative background pulse for imminent events */}
                                                    {diffDays <= 3 && (
                                                        <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-purple-500 shadow-[0_0_10px_purple] animate-ping" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-16 text-center rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.01]">
                                        <Calendar size={32} className="mx-auto text-gray-300 dark:text-gray-800 mb-4 opacity-50" />
                                        <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Sin operaciones planeadas</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {initialThreads && initialThreads.length > 0 && (
                            <div className="pt-4">
                                <div className="flex items-center justify-between mb-10">
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-4">
                                        <div className="w-2 h-8 bg-orange-600 rounded-full shadow-lg shadow-orange-600/20" />
                                        Comunidad
                                    </h2>
                                    <Link href="/foro" className="text-[0.625rem] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest border-b-2 border-teal-500/20">
                                        VER FORO
                                    </Link>
                                </div>
                                <div className="space-y-5">
                                    {initialThreads.map((thread: any) => (
                                        <Link
                                            key={thread.id}
                                            href={`/foro/hilos/${thread.slug || thread.id}`}
                                            className="block p-5 rounded-[1.5rem] bg-gray-50 dark:bg-white/[0.02] border border-transparent hover:border-teal-500/20 hover:bg-white dark:hover:bg-white/[0.04] transition-all group shadow-sm"
                                        >
                                            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 line-clamp-2 leading-tight tracking-tight mb-4">
                                                {thread.es_fijado && <span className="mr-2">📌</span>}
                                                {thread.titulo}
                                            </h3>
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
                                                <div className="flex items-center gap-2">
                                                    {thread.autor?.avatar_url ? (
                                                        <Image src={thread.autor.avatar_url} width={24} height={24} className="w-6 h-6 rounded-lg object-cover shadow-md" alt={thread.autor?.username || 'Avatar'} />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-800" />
                                                    )}
                                                    <span className="text-[0.625rem] font-black text-gray-500 uppercase tracking-widest">
                                                        {thread.autor?.username || 'Anónimo'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-400">
                                                    <MessageSquare size={12} className="text-teal-500/60" />
                                                    <span className="text-[0.625rem] font-black">{thread.vistas || 0}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Componentes Autónomos (para evitar re-creación y parpadeos en renderizado del padre) ─── */

interface DeltaForceHeaderProps {
    bannerImageSrc: string;
    seasonNameText: string;
    seasonVersionText: string;
    currentMapName: string;
    timeLeftStr: string;
    activeModules: string[];
    gameSlug: string;
    stats?: {
        buildsCount: number;
        newsCount: number;
        usersCount: number;
    };
    isAdmin: boolean;
    moduleId?: string;
    moduleConfig?: any;
    onUpdateSeason: (name: string, version: string) => void;
}

const DeltaForceHeader = ({
    bannerImageSrc,
    seasonNameText,
    seasonVersionText,
    currentMapName,
    timeLeftStr,
    activeModules,
    gameSlug,
    stats,
    isAdmin,
    moduleId,
    moduleConfig,
    onUpdateSeason,
}: DeltaForceHeaderProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempSeasonName, setTempSeasonName] = useState(seasonNameText);
    const [tempSeasonVersion, setTempSeasonVersion] = useState(seasonVersionText);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        setTempSeasonName(seasonNameText);
        setTempSeasonVersion(seasonVersionText);
    }, [seasonNameText, seasonVersionText]);

    const handleSave = async () => {
        if (!moduleId) return;
        setIsSaving(true);
        setSaveError(null);
        try {
            const supabase = createClient();
            const newConfig = {
                ...moduleConfig,
                season_name: tempSeasonName,
                season_version: tempSeasonVersion,
            };
            const { error } = await supabase
                .from("game_modules")
                .update({ config: newConfig })
                .eq("id", moduleId);

            if (error) {
                throw error;
            }

            onUpdateSeason(tempSeasonName, tempSeasonVersion);
            setIsEditing(false);
        } catch (err: any) {
            console.error("Error updating season info:", err);
            setSaveError(err.message || "Error al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    const formatStatNumber = (num: number) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(".0", "") + "k";
        }
        return num.toString();
    };

    return (
        <div
            className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-teal-500/20 bg-slate-50 dark:bg-[#090f11] shadow-md dark:shadow-[0_0_50px_rgba(20,184,166,0.1)] mt-0 mb-12 p-8 md:p-12 min-h-[350px] flex flex-col justify-between"
            style={
                bannerImageSrc
                    ? { backgroundImage: `url(${bannerImageSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : {}
            }
        >
            {/* Gradiente dinámico de fondo (Light Mode: Blanco/Grisáceo traslúcido, Dark Mode: Oscuro traslúcido) */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent dark:from-black dark:via-black/85 dark:to-transparent z-0 pointer-events-none" />

            {/* Overlay de rejilla táctica militar */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.06)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-50 z-0" />

            {/* Efecto de escaneo superior */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-40 animate-pulse pointer-events-none z-10" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full z-10">
                {/* Sección Izquierda: Título y Botones */}
                <div className="lg:col-span-7 space-y-6 text-left">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                            <span className="text-[0.625rem] font-black uppercase tracking-[0.3em] text-teal-600 dark:text-teal-400">Canal de Inteligencia Activo</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase font-mono">
                            CENTRO DE MANDO DELTA FORCE
                        </h1>
                        <p className="text-slate-600 dark:text-gray-400 text-sm md:text-base font-medium max-w-xl leading-relaxed">
                            Última información de inteligencia, meta de armas, operaciones activas y actividad comunitaria de KoreStats.
                        </p>
                    </div>

                    {/* Botones de acción rápida con micro-animaciones */}
                    <div className="flex flex-wrap gap-3 pt-2">
                        {activeModules.includes("weapons") && (
                            <Link
                                href={`/games/${gameSlug}/weapons`}
                                className="group relative inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-500 text-black font-black text-[0.625rem] uppercase tracking-widest transition-all hover:bg-teal-400 active:scale-95 shadow-[0_0_15px_rgba(20,184,166,0.25)]"
                            >
                                <Swords size={12} className="group-hover:rotate-12 transition-transform" />
                                <span>Ver Meta</span>
                            </Link>
                        )}

                        {activeModules.includes("builds") && (
                            <Link
                                href={`/games/${gameSlug}/weapons`}
                                className="group relative inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-black text-[0.625rem] uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                            >
                                <Hammer size={12} className="group-hover:-rotate-12 transition-transform text-teal-600 dark:text-teal-400" />
                                <span>Builds de Armas</span>
                            </Link>
                        )}

                        {activeModules.includes("news") && (
                            <a
                                href="#noticias-seccion"
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById("noticias-seccion")?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="group relative inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-transparent border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white font-black text-[0.625rem] uppercase tracking-widest transition-all active:scale-95"
                            >
                                <Newspaper size={12} className="text-slate-500 dark:text-gray-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                                <span>Últimas Noticias</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* Sección Derecha: Widgets */}
                <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    {/* Tarjeta 1: Meta Weapon */}
                    {activeModules.includes("weapons") && (
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#090f11]/85 backdrop-blur-md text-left flex flex-col justify-between min-h-[90px] shadow-sm dark:shadow-lg animate-in fade-in zoom-in-95 duration-200">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500 dark:text-gray-500">Arma Meta</span>
                                    <span className="text-[0.5rem] font-black uppercase bg-teal-500/20 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/30">S-TIER</span>
                                </div>
                                <p className="text-lg font-black text-teal-600 dark:text-teal-400 leading-tight tracking-tight uppercase">K437</p>
                            </div>
                            <span className="text-[0.5625rem] font-medium text-slate-500 dark:text-gray-500 uppercase tracking-tight">Build Más Usada</span>
                        </div>
                    )}

                    {/* Tarjeta 2: Current Season */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#090f11]/85 backdrop-blur-md text-left flex flex-col justify-between min-h-[90px] shadow-sm dark:shadow-lg">
                        {isEditing ? (
                            <div className="flex flex-col gap-2 w-full h-full justify-between">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500 dark:text-gray-500">Editando Season</span>
                                        <button 
                                            onClick={() => setIsEditing(false)} 
                                            className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                                            disabled={isSaving}
                                            title="Cancelar"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={tempSeasonName} 
                                        onChange={(e) => setTempSeasonName(e.target.value)}
                                        className="w-full text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-neutral-900 border border-teal-500/30 rounded px-1.5 py-0.5 uppercase focus:outline-none focus:border-teal-500"
                                        placeholder="Nombre de la Season"
                                        disabled={isSaving}
                                    />
                                    <input 
                                        type="text" 
                                        value={tempSeasonVersion} 
                                        onChange={(e) => setTempSeasonVersion(e.target.value)}
                                        className="w-full text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 bg-slate-100 dark:bg-neutral-900 border border-teal-500/30 rounded px-1.5 py-0.5 focus:outline-none focus:border-teal-500"
                                        placeholder="Versión (ej: v1.0.4)"
                                        disabled={isSaving}
                                    />
                                </div>
                                {saveError && <p className="text-[9px] text-red-500 font-bold leading-tight">{saveError}</p>}
                                <div className="flex justify-end gap-1 pt-1 border-t border-slate-200 dark:border-white/5">
                                    <button 
                                        onClick={handleSave} 
                                        className="px-2 py-0.5 rounded bg-teal-500 text-black hover:bg-teal-400 transition-colors text-[9px] font-black uppercase tracking-wider flex items-center gap-1"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <Loader2 size={8} className="animate-spin" />
                                        ) : (
                                            <Save size={8} />
                                        )}
                                        <span>Guardar</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col justify-between h-full min-h-[66px] relative group">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500 dark:text-gray-500">Season Actual</span>
                                        {isAdmin && (
                                            <button 
                                                onClick={() => {
                                                    setTempSeasonName(seasonNameText);
                                                    setTempSeasonVersion(seasonVersionText);
                                                    setIsEditing(true);
                                                    setSaveError(null);
                                                }}
                                                className="text-slate-400 hover:text-teal-500 transition-colors p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="Editar Temporada"
                                            >
                                                <Edit2 size={10} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight uppercase truncate">{seasonNameText}</p>
                                </div>
                                <span className="text-[0.5625rem] font-mono font-bold text-teal-600 dark:text-teal-400 block mt-1">{seasonVersionText}</span>
                            </div>
                        )}
                    </div>

                    {/* Tarjeta 3: Active Rotation */}
                    {activeModules.includes("rotations") && (
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#090f11]/85 backdrop-blur-md text-left flex flex-col justify-between min-h-[90px] shadow-sm dark:shadow-lg animate-in fade-in zoom-in-95 duration-200">
                            <div>
                                <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500 dark:text-gray-500 block mb-1">Rotación Activa</span>
                                <p className="text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight uppercase truncate">{currentMapName}</p>
                            </div>
                            <div className="flex items-center gap-1 text-[0.5625rem] font-bold text-amber-600 dark:text-amber-500">
                                <Clock size={10} />
                                <span>{timeLeftStr}</span>
                            </div>
                        </div>
                    )}

                    {/* Tarjeta 4: Platform Stats */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#090f11]/85 backdrop-blur-md text-left flex flex-col justify-between min-h-[90px] shadow-sm dark:shadow-lg">
                        <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500 dark:text-gray-500 block mb-1.5">Estadísticas</span>
                        <div className="grid grid-cols-3 gap-2 text-center text-slate-900 dark:text-white">
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-black text-teal-600 dark:text-teal-400 leading-none">{formatStatNumber(stats?.buildsCount || 0)}</span>
                                <span className="text-[0.4375rem] text-slate-500 dark:text-gray-500 font-bold uppercase tracking-tight mt-0.5">Builds</span>
                            </div>
                            <div className="flex flex-col items-center border-x border-slate-200 dark:border-white/5">
                                <span className="text-xs font-black text-teal-600 dark:text-teal-400 leading-none">{formatStatNumber(stats?.newsCount || 0)}</span>
                                <span className="text-[0.4375rem] text-slate-500 dark:text-gray-500 font-bold uppercase tracking-tight mt-0.5">Noticias</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-black text-teal-600 dark:text-teal-400 leading-none">{formatStatNumber(stats?.usersCount || 0)}</span>
                                <span className="text-[0.4375rem] text-slate-500 dark:text-gray-500 font-bold uppercase tracking-tight mt-0.5">Users</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const WeaponCard = ({ weapon, baseWeapon }: { weapon: WeaponAggregate; baseWeapon?: any }) => {
    const [copied, setCopied] = useState(false);
    const shareCode = weapon.share_codes?.[0];
    const config = TIER_CONFIG[weapon.tier];
    const armorLevel = weapon.game_mode === "warfare" ? 0 : 4;
    const ttk = calculateTTK(
        weapon.avg_damage,
        weapon.avg_fire_rate,
        weapon.avg_armor_penetration,
        armorLevel,
        weapon.category,
        weapon.game_mode || "operations",
        30,
        weapon.avg_range
    );

    const getShortPatch = (patch: string | null | undefined) => {
        if (!patch) return "";
        const match = patch.match(/\d+/);
        return match ? `S${match[0]}` : patch.substring(0, 4).toUpperCase();
    };
    const shortPatch = getShortPatch(weapon.patch_version);

    const tierGlowStyle: Record<string, { dark: string; light: string }> = {
        S: { dark: "rgba(245,158,11,0.13)", light: "rgba(245,158,11,0.06)" },
        A: { dark: "rgba(16,185,129,0.13)", light: "rgba(16,185,129,0.06)" },
        B: { dark: "rgba(59,130,246,0.13)", light: "rgba(59,130,246,0.06)" },
        C: { dark: "rgba(107,114,128,0.10)", light: "rgba(107,114,128,0.04)" },
    };
    const glow = tierGlowStyle[weapon.tier] ?? tierGlowStyle.C;

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!shareCode) return;
        navigator.clipboard.writeText(shareCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-2xl border bg-white dark:bg-gray-950/60 shadow-sm dark:shadow-none flex flex-col h-full transition-all duration-300",
                config.borderColor
            )}
            style={{ color: config.barColor }}
        >
            <div className="relative p-3.5 flex flex-col flex-1 h-full">
                {/* Image Section with Overlays */}
                <div
                    className="relative w-full h-32 flex items-center justify-center group/img rounded-xl overflow-hidden border border-border/30 bg-gray-100/50 dark:bg-white/5"
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
                    {/* Category Tag & Mode (Absolute Top-Left) */}
                    <div className="absolute top-2 left-2 z-20 flex flex-wrap gap-1.5 items-center max-w-[200px]">
                        <span className="text-[0.5625rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-md text-foreground border border-border shadow-sm">
                            {weapon.category}
                        </span>
                        {weapon.game_mode && (
                            <span className={cn(
                                "text-[0.5rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-sm backdrop-blur-md",
                                weapon.game_mode === "operations" 
                                    ? "bg-teal-500/10 text-teal-400 border-teal-500/30" 
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            )}>
                                {weapon.game_mode === "operations" ? "Operaciones" : "Warfare"}
                            </span>
                        )}
                    </div>

                    {/* Patch Badge (Absolute Bottom-Right) */}
                    {shortPatch && (
                        <div className="absolute bottom-2 right-2 z-20">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="text-[0.5rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm backdrop-blur-md animate-in fade-in duration-300 cursor-help">
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
                    {ttk > 0 && (
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
                                        {weapon.game_mode === "warfare"
                                            ? "TTK en Warfare a 30m contra objetivo sin blindaje (100 HP)"
                                            : "TTK en Operaciones a 30m usando bala Nivel 4 contra chaleco Nivel 4"}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}

                    {weapon.image_url ? (
                        <Image
                            src={weapon.image_url}
                            alt={weapon.weapon_name}
                            fill
                            sizes="(max-width: 768px) 100vw, 300px"
                            className="z-10 object-contain p-2 transition-transform duration-500 ease-out drop-shadow-md group-hover:scale-110"
                        />
                    ) : (
                        <Swords size={32} className="text-gray-400 dark:text-gray-800" />
                    )}
                </div>

                {/* Title */}
                <div className="text-center mt-3 mb-4">
                    <h3 className="text-base font-black text-gray-900 dark:text-white leading-none truncate uppercase tracking-tight">
                        {weapon.weapon_name}
                    </h3>
                </div>

                {/* Main Stats - 2 Column Grid - Segmented HUD bars */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-2">
                    {STAT_BARS.map((stat) => {
                        const value = weapon[stat.key as keyof WeaponAggregate] as number;
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
                                <div className="flex justify-between items-end text-[0.5625rem]">
                                    <div className="flex items-center gap-0.5 text-gray-500 dark:text-gray-400 pb-0.5 leading-none">
                                        <Icon size={10} className="opacity-65" />
                                        <span className="font-bold uppercase tracking-tighter">{stat.label}</span>
                                    </div>
                                    <span className="text-gray-800 dark:text-gray-200 font-bold">{Math.round(value)}</span>
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
                <div className="flex items-center justify-around py-2.5 border-y border-border/40 my-2 gap-1 overflow-hidden">
                    {EXTRA_STATS.map((stat) => {
                        const value = weapon[stat.key as keyof WeaponAggregate] as number;
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

                {/* Tactical Tags */}
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
                            <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 my-2">
                                {tags.slice(0, 3).map(tag => (
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

                {/* Action Footer */}
                <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                    <button
                        onClick={handleCopy}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[0.5625rem] font-black uppercase tracking-widest transition-all border",
                            copied
                                ? "bg-teal-500 border-teal-500 text-white shadow-lg"
                                : "bg-gray-100 dark:bg-gray-900 border-border/50 text-gray-500 hover:border-teal-500/50 hover:text-teal-600 dark:hover:text-teal-400"
                        )}
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copied ? '¡HECHO!' : 'COPIAR'}</span>
                    </button>

                    <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-900 text-teal-600 dark:text-teal-400 border border-border/50">
                        <TrendingUp size={12} />
                        <span className="text-xs font-black">{weapon.community_score}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
