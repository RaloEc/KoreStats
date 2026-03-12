"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Newspaper,
    Calendar,
    Hammer,
    Swords,
    Gamepad2,
    MessageSquare,
    Eye,
    ChevronRight,
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
} from "lucide-react";
import type { GameInfo } from "@/modules/types";
import { WeaponAggregate } from "@/lib/games/delta-force-weapons";
import ServerStatusWidget from "@/components/riot/ServerStatusWidget";
import { SupabaseImage } from "@/components/ui/SupabaseImage";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";

/* ─── Weapon Card Constants & Helpers ─── */

const TIER_CONFIG = {
    S: {
        label: "META DOMINANTE",
        color: "from-amber-400 to-orange-500",
        textColor: "text-amber-500 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/50 dark:border-amber-500/30",
        barColor: "#f59e0b",
        badge: "bg-gradient-to-r from-amber-500 to-orange-500",
    },
    A: {
        label: "MUY FUERTE",
        color: "from-emerald-400 to-green-500",
        textColor: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/50 dark:border-emerald-500/30",
        barColor: "#10b981",
        badge: "bg-gradient-to-r from-emerald-500 to-green-500",
    },
    B: {
        label: "VIABLE",
        color: "from-blue-400 to-cyan-500",
        textColor: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/50 dark:border-blue-500/30",
        barColor: "#3b82f6",
        badge: "bg-gradient-to-r from-blue-500 to-cyan-500",
    },
    C: {
        label: "SITUACIONAL",
        color: "from-gray-400 to-slate-500",
        textColor: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-500/10",
        borderColor: "border-gray-400 dark:border-gray-700/50",
        barColor: "#6b7280",
        badge: "bg-gradient-to-r from-gray-500 to-slate-500",
    },
};

const calculateTTK = (damage: number, fireRate: number, penetration: number = 0, armorLevel: number = 0) => {
    if (!damage || !fireRate || damage <= 0 || fireRate <= 0) return 0;
    const hp = 100;
    const rps = fireRate / 60;
    let mu = 1.0;
    if (armorLevel > 0) {
        const armorThreshold = armorLevel * 10;
        if (penetration >= armorThreshold) mu = 1.0;
        else if (penetration >= armorThreshold - 5) mu = 0.75;
        else mu = 0.45;
    }
    const effectiveDamage = damage * mu;
    const btk = Math.ceil(hp / effectiveDamage);
    const ttkSeconds = (btk - 1) / rps;
    return Math.round(ttkSeconds * 1000);
};

const STAT_DISPLAY = [
    { key: "avg_damage", label: "DAÑO", icon: Flame, max: 60 },
    { key: "avg_control", label: "CONTROL", icon: Activity, max: 100 },
    { key: "avg_stability", label: "ESTABILIDAD", icon: Gauge, max: 100 },
    { key: "avg_accuracy", label: "PRECISIÓN", icon: Focus, max: 100 },
] as const;

interface GamePageClientProps {
    game: GameInfo;
    activeModules: string[];
    initialNews: any[];
    initialEvents: any[];
    initialBuilds: any[];
    initialThreads: any[];
    weaponsMeta?: {
        weapons: WeaponAggregate[];
        top_voted: WeaponAggregate[];
    } | null;
}

export default function GamePageClient({
    game,
    activeModules,
    initialNews,
    initialEvents,
    initialBuilds,
    initialThreads,
    weaponsMeta,
}: GamePageClientProps) {

    // COMPACT Tactical Weapon Card
    const WeaponCard = ({ weapon }: { weapon: WeaponAggregate }) => {
        const [copied, setCopied] = useState(false);
        const shareCode = weapon.share_codes?.[0];
        const config = TIER_CONFIG[weapon.tier];
        const ttk = calculateTTK(weapon.avg_damage, weapon.avg_fire_rate, weapon.avg_armor_penetration, 4);

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
                    "group relative overflow-hidden rounded-2xl border bg-gray-50 dark:bg-gray-950/40 shadow-sm dark:shadow-none flex flex-col h-full",
                    config.borderColor
                )}
            >
                <div className="relative p-3.5 flex flex-col flex-1 h-full">
                    {/* Image Section */}
                    <div className="relative w-full h-32 flex items-center justify-center group/img rounded-xl bg-gray-100/50 dark:bg-white/5 border border-border/40 overflow-hidden">
                        {/* Category Tag */}
                        <div className="absolute top-2 left-2 z-20">
                            <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-md text-foreground border border-border shadow-sm">
                                {weapon.category}
                            </span>
                        </div>

                        {/* TTK Badge Overlay */}
                        {ttk > 0 && (
                            <div className="absolute top-2 right-2 z-20">
                                <div className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 flex flex-col items-center">
                                    <span className="text-[7px] font-black text-gray-400 uppercase leading-none">TTK Nv4</span>
                                    <span className="text-[10px] font-mono font-black text-white leading-tight">
                                        {(ttk / 1000).toFixed(2)}s
                                    </span>
                                </div>
                            </div>
                        )}

                        {weapon.image_url ? (
                            <Image
                                src={weapon.image_url}
                                alt={weapon.weapon_name}
                                fill
                                className="object-contain p-2 group-hover:scale-110 transition-transform duration-500"
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

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-2">
                        {STAT_DISPLAY.map((stat) => {
                            const value = weapon[stat.key as keyof WeaponAggregate] as number;
                            const pct = Math.min((value / stat.max) * 100, 100);
                            const Icon = stat.icon;

                            return (
                                <div key={stat.key} className="space-y-0.5">
                                    <div className="flex justify-between items-center text-[9px]">
                                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                            <Icon size={10} className="opacity-70" />
                                            <span className="font-bold uppercase tracking-tighter">{stat.label}</span>
                                        </div>
                                        <span className="text-gray-800 dark:text-gray-200 font-bold">{Math.round(value)}</span>
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

                    {/* Tactical Tags */}
                    {(() => {
                        const tags: { label: string }[] = [];
                        const fireRate = weapon.avg_fire_rate || 0;
                        const handling = weapon.avg_handling || 0;
                        const accuracy = weapon.avg_accuracy || 0;
                        const damage = weapon.avg_damage || 0;
                        const stability = weapon.avg_stability || 0;
                        const range = weapon.avg_range || 0;
                        const armorPen = weapon.avg_armor_penetration || 0;

                        if (fireRate > 750) tags.push({ label: "Alta Cadencia" });
                        if (damage > 35) tags.push({ label: "Alto Poder" });
                        if (accuracy > 70) tags.push({ label: "Láser" });
                        if (handling > 65) tags.push({ label: "Ágil" });
                        if (stability > 75) tags.push({ label: "Sin Retroceso" });
                        if (range > 75) tags.push({ label: "Largo Alcance" });
                        if (armorPen > 45) tags.push({ label: "Perforante" });

                        if (tags.length === 0) return null;

                        return (
                            <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mb-2 h-auto">
                                {tags.slice(0, 3).map(tag => (
                                    <span key={tag.label} className="text-[8px] font-black uppercase tracking-tighter text-slate-500 dark:text-slate-400">
                                        {tag.label}
                                    </span>
                                ))}
                            </div>
                        );
                    })()}

                    {/* Action Footer */}
                    <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                        <button
                            onClick={handleCopy}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
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

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">

            {/* Premium Game Hero Section */}
            <div className="relative mb-10">
                {/* Main Hero Card */}
                <div className="relative h-64 md:h-[350px] w-full rounded-[3rem] overflow-hidden border border-gray-200 dark:border-white/5 shadow-2xl bg-gray-900">

                    {/* Background Layer */}
                    {game.imagen_portada_url ? (
                        game.imagen_portada_url.startsWith('http') ? (
                            <Image
                                src={game.imagen_portada_url}
                                alt={game.nombre}
                                fill
                                className="object-cover"
                                priority
                            />
                        ) : (
                            <SupabaseImage
                                src=""
                                bucket="imagenes"
                                path={game.imagen_portada_url}
                                alt={game.nombre}
                                fill
                                className="object-cover"
                                priority
                            />
                        )
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900/20 to-black">
                            {/* Mesh Gradient Effect */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
                        </div>
                    )}

                    {/* Content Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent hidden md:block" />

                    {/* Tactical Noise/Texture Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grain-y.com/assets/grain.png')] mix-blend-overlay" />

                    {/* Bottom Info Bar (Inside Card) */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-4 flex flex-col md:flex-row md:items-end justify-between gap-0">

                        {/* Game Identity Group */}
                        <div className="flex items-center gap-8">
                            {/* Modern Icon Frame */}
                            <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0 group/icon">
                                <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-blue-600 rounded-[2rem] blur-xl opacity-20 group-hover/icon:opacity-40 transition-all duration-500" />
                                <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-white/5 backdrop-blur-md border border-white/20 p-2 shadow-2xl shadow-black/50">
                                    {game.icono_url ? (
                                        game.icono_url.startsWith('http') ? (
                                            <Image
                                                src={game.icono_url}
                                                alt={game.nombre}
                                                width={128}
                                                height={128}
                                                className="w-full h-full object-cover rounded-[1.5rem]"
                                                priority
                                            />
                                        ) : (
                                            <SupabaseImage
                                                src=""
                                                bucket="iconos"
                                                path={game.icono_url}
                                                alt={game.nombre}
                                                className="w-full h-full object-cover rounded-[1.5rem]"
                                                width={128}
                                                height={128}
                                                priority
                                            />
                                        )
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center rounded-[1.5rem]">
                                            <Gamepad2 className="text-white" size={36} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Text Info */}
                            <div className="flex flex-col gap-0">
                                <h1 className="text-4xl md:text-5xl lg:text-6xl text-white tracking-[0.1em] leading-none font-black-ops uppercase drop-shadow-[0_6px_6px_rgba(0,0,0,0.6)] py-1">
                                    {game.nombre}
                                </h1>
                                <p className="hidden md:block text-gray-300 text-sm font-medium max-w-lg mt-3 line-clamp-2 leading-relaxed opacity-70 border-l-2 border-teal-500/50 pl-4">
                                    {game.descripcion}
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons (Integrated) */}
                        <div className="flex flex-wrap gap-4">
                            {activeModules.includes("builds") && (
                                <Link
                                    href={`/games/${game.slug}/builds`}
                                    className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 backdrop-blur-xl text-white border border-white/20 hover:bg-white/10 transition-all font-black text-sm uppercase tracking-widest active:scale-95"
                                >
                                    <Hammer size={20} />
                                    <span>Builds</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Description (Shown outside for clarity) */}
                <div className="md:hidden mt-8 px-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed">
                        {game.descripcion}
                    </p>
                </div>
            </div>

            {/* Weapon Showcase Section (Only for Delta Force) */}
            {game.slug === "delta-force" && weaponsMeta && (
                <div className="mb-16 px-2">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-[2px] bg-teal-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-teal-500 shrink-0">Inteligencia del Meta</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                                Armamento Destacado
                            </h2>
                        </div>
                        <Link 
                            href={`/games/${game.slug}/weapons`} 
                            className="group relative inline-flex items-center gap-3 px-7 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-white/10 dark:border-black/10 hover:border-teal-500/50 hover:shadow-[0_0_20px_rgba(20,184,166,0.2)] active:scale-95"
                        >
                            <span>Ver Meta</span>
                            <Swords size={16} className="text-teal-500 group-hover:rotate-12 transition-transform" />
                        </Link>
                    </div>

                    {/* Featured COMPACT Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Elite Top */}
                        {weaponsMeta.weapons.filter(w => w.tier === 'S').slice(0, 2).map(w => (
                            <WeaponCard key={w.weapon_name} weapon={w} />
                        ))}
                        {/* Community Choices */}
                        {weaponsMeta.top_voted.slice(0, 2).map(w => (
                            <WeaponCard key={w.weapon_name} weapon={w} />
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="min-h-[400px]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* News Feed */}
                    {activeModules.includes("news") && (
                        <div className="lg:col-span-2">
                            <div className="flex items-center justify-between mb-10">
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-4">
                                    <div className="w-2 h-8 bg-teal-600 rounded-full shadow-lg shadow-teal-600/20" />
                                    Últimas noticias
                                </h2>
                                <Link
                                    href={`/games/${game.slug}/news`}
                                    className="text-xs font-bold text-teal-600 hover:text-teal-500 dark:text-teal-400 transition-colors uppercase tracking-[0.2em] flex items-center gap-2"
                                >
                                    VER TODO
                                    <ChevronRight size={16} />
                                </Link>
                            </div>

                            {initialNews.length > 0 ? (
                                <div className="space-y-6">
                                    {initialNews.map((noticia: any) => {
                                        const cleanPreview = noticia.contenido
                                            ? noticia.contenido.replace(/<[^>]*>/g, '').substring(0, 160)
                                            : "";

                                        return (
                                            <Link
                                                key={noticia.id}
                                                href={noticia.type === 'lol_patch' && noticia.slug
                                                    ? `/games/league-of-legends/patch/${noticia.slug.replace('parche-', '')}`
                                                    : `/noticias/${noticia.id}`}
                                                className="block group relative p-4 md:p-5 rounded-[2rem] bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] hover:border-teal-500/40 dark:hover:border-teal-500/40 hover:bg-white dark:hover:bg-white/[0.04] transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-1"
                                            >
                                                <div className="flex flex-col md:flex-row gap-6 md:items-center">
                                                    {noticia.imagen_portada && (
                                                        <div className="w-full md:w-44 h-48 md:h-32 rounded-[1.5rem] overflow-hidden flex-shrink-0 relative shadow-lg group-hover:shadow-teal-500/10 transition-shadow duration-500">
                                                            <Image
                                                                src={noticia.imagen_portada}
                                                                alt={noticia.titulo}
                                                                fill
                                                                sizes="(max-width: 768px) 100vw, 176px"
                                                                className="object-cover group-hover:scale-110 transition-transform duration-1000"
                                                            />
                                                            {/* Overlay gradient inside image for depth */}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    )}

                                                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                                                        {/* Category or Type Badge if available (Small & Subtle) */}
                                                        {noticia.type && (
                                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400 mb-1">
                                                                {noticia.type === 'lol_patch' ? 'Nota del Parche' : 'Actualización'}
                                                            </span>
                                                        )}

                                                        <h3 className="font-black text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2 text-lg md:text-xl tracking-tighter leading-[1.1]">
                                                            {noticia.titulo}
                                                        </h3>

                                                        <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                                                            {cleanPreview}...
                                                        </p>

                                                        <div className="flex items-center gap-5 mt-2">
                                                            <span className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                                <Calendar size={12} className="text-teal-500/70" />
                                                                {noticia.fecha_publicacion
                                                                    ? new Date(noticia.fecha_publicacion).toLocaleDateString("es-ES", {
                                                                        day: "numeric",
                                                                        month: "short",
                                                                    })
                                                                    : ""}
                                                            </span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-800" />
                                                            <span className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                                <Eye size={12} className="text-gray-400" />
                                                                {noticia.vistas ?? 0}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Desktop Arrow Indicator */}
                                                    <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:bg-teal-500 group-hover:text-white transition-all duration-300">
                                                        <ChevronRight size={20} />
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
                        {game.slug === "league-of-legends" && (
                            <ServerStatusWidget />
                        )}

                        {activeModules.includes("events") && (
                            <div className="p-1">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-10 flex items-center gap-4">
                                    <div className="w-2 h-8 bg-purple-600 rounded-full shadow-lg shadow-purple-600/20" />
                                    Calendario táctico
                                </h2>
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
                                                            <span className={`text-[8px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest ${evento.tipo === "parche"
                                                                ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                                                : evento.tipo === "evento"
                                                                    ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                                                                    : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                                                                }`}>
                                                                {evento.tipo}
                                                            </span>
                                                            {diffDays <= 7 && diffDays >= 0 && (
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-orange-500 animate-pulse">
                                                                    Inminente
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="block text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">
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
                                                            <span className="text-[14px] font-black text-gray-900 dark:text-white leading-none">
                                                                {diffDays === 0 ? "HOY" : diffDays === 1 ? "MAÑANA" : diffDays}
                                                            </span>
                                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">
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
                                    <Link href="/foro" className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest border-b-2 border-teal-500/20">
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
                                                        <img src={thread.autor.avatar_url} className="w-6 h-6 rounded-lg object-cover shadow-md" alt="" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-800" />
                                                    )}
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                        {thread.autor?.username || 'Anónimo'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-400">
                                                    <MessageSquare size={12} className="text-teal-500/60" />
                                                    <span className="text-[10px] font-black">{thread.vistas || 0}</span>
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
