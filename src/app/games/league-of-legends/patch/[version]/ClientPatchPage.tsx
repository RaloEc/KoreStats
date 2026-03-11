"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Sword,
    Shield,
    Activity,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronDown,
    ChevronUp,
    ArrowRight,
    Sparkles,
    Zap,
    LayoutDashboard,
    Link as LinkIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// --- Helpers ---
const getStatLabel = (stat: string) => {
    const statMap: Record<string, string> = {
        hp: "Vida", hpperlevel: "Vida/Nv", mp: "Maná", mpperlevel: "Maná/Nv",
        movespeed: "Vel. Mov.", armor: "Armadura", armorperlevel: "Arm/Nv",
        spellblock: "RM", spellblockperlevel: "RM/Nv", attackrange: "Rango",
        hpregen: "Reg. Vida", hpregenperlevel: "RV/Nv", mpregen: "Reg. Maná",
        mpregenperlevel: "RM/Nv", crit: "Crit", critperlevel: "Crit/Nv",
        attackdamage: "AD", attackdamageperlevel: "AD/Nv",
        attackspeedperlevel: "AS/Nv", attackspeed: "AS",
        FlatHPPoolMod: "Vida", FlatMPPoolMod: "Maná", FlatPhysicalDamageMod: "AD",
        FlatMagicDamageMod: "AP", FlatArmorMod: "Armadura", FlatSpellBlockMod: "RM",
        PercentMovementSpeedMod: "% MS", PercentAttackSpeedMod: "% AS",
        PercentLifeStealMod: "% Robo Vida", PercentOmnivamp: "% Omnivamp",
        PercentAbilityHaste: "Haste"
    };
    return statMap[stat] || stat;
};

const getAttributeLabel = (attr: string) => {
    const map: Record<string, string> = {
        cooldown: "CD", cost: "Costo", range: "Rango", damage: "Daño",
        healing: "Curación", shield: "Escudo", speed: "Velocidad", duration: "Duración",
        bugfix: "Error"
    };
    return map[attr] || attr;
};

const getSafeHostname = (urlStr: string) => {
    try {
        if (!urlStr.startsWith("http")) return urlStr;
        const url = new URL(urlStr);
        return url.hostname.replace(/^www\./, "");
    } catch (e) {
        return urlStr;
    }
};

export default function ClientPatchPage({
    patch,
    versionUrl
}: {
    patch: any;
    versionUrl: string;
}) {
    const { profile } = useAuth();
    const userColor = profile?.color || "#3b82f6";

    const [activeTab, setActiveTab] = useState<"summary" | "champions" | "items" | "systems">("summary");
    const [filterType, setFilterType] = useState<"all" | "buff" | "nerf" | "adjustment">("all");
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [pendingScroll, setPendingScroll] = useState<{ tab: string; id: string } | null>(null);

    const data = patch.data || {};
    const champions = data.champions || [];
    const items = data.items || [];
    const runes = data.runes || [];
    const ddragonVersion = data.version || versionUrl;

    const validSources = [
        ...(Array.isArray(patch.fuentes) ? patch.fuentes : []),
        ...(patch.fuente ? [patch.fuente] : []),
    ].filter((f): f is string => typeof f === "string" && f.trim().length > 0);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const determineChampionType = (champ: any) => {
        const section = champ.developerContext?.section?.toLowerCase() || "";
        if (section.includes("mejorado") || section.includes("buff")) return "buff";
        if (section.includes("debilitado") || section.includes("nerf")) return "nerf";

        let buffs = 0, nerfs = 0;
        (champ.stats || []).forEach((s: any) => { s.type === "buff" ? buffs++ : s.type === "nerf" ? nerfs++ : null; });
        (champ.spells || []).forEach((sp: any) => sp.changes?.forEach((c: any) => { c.type === "buff" ? buffs++ : c.type === "nerf" ? nerfs++ : null; }));

        return buffs > nerfs ? "buff" : nerfs > buffs ? "nerf" : "adjustment";
    };

    const handleNavigate = (tab: "champions" | "items" | "systems", id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: true }));
        setActiveTab(tab);
        setPendingScroll({ tab, id });
    };

    useEffect(() => {
        if (pendingScroll && activeTab === pendingScroll.tab) {
            let attempts = 0;
            const maxAttempts = 10;
            const tryScroll = () => {
                const element = document.getElementById(`item-${pendingScroll.id}`);
                if (element) {
                    setTimeout(() => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setPendingScroll(null);
                    }, 150);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(tryScroll, 100);
                } else {
                    setPendingScroll(null);
                }
            };
            const initialTimer = setTimeout(tryScroll, 200);
            return () => clearTimeout(initialTimer);
        }
    }, [pendingScroll, activeTab]);

    const filteredChampions = champions.filter((c: any) => filterType === "all" || determineChampionType(c) === filterType);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans pb-20 selection:bg-primary/30">
            {/* Header Visual */}
            <div className="relative pt-16 pb-10 border-b border-border bg-muted/5">
                <div className="max-w-4xl mx-auto px-6">
                    <Badge
                        style={{ backgroundColor: `${userColor}15`, color: userColor, borderColor: `${userColor}30` }}
                        className="mb-3 px-3 py-0.5 text-[9px] font-black tracking-[0.15em] uppercase border"
                    >
                        Notas del Parche • Oficial
                    </Badge>
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tighter leading-none mb-2 uppercase">
                        NOTAS DEL PARCHE <span style={{ color: userColor }}>{versionUrl}</span>
                    </h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 mb-8 mt-6 relative z-20">

                {/* Navigation Tabs */}
                <div className="flex bg-card/80 border border-border p-1.5 rounded-2xl mb-8 gap-1 shadow-xl sticky top-4 z-40 backdrop-blur-md">
                    {[
                        { id: "summary", label: "Resumen", icon: LayoutDashboard, count: null },
                        { id: "champions", label: "Campeones", icon: Sword, count: champions.length },
                        { id: "items", label: "Objetos", icon: Shield, count: items.length },
                        { id: "systems", label: "Sistema", icon: Zap, count: runes.length }
                    ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300",
                                    isActive
                                        ? "bg-foreground text-background font-black shadow-lg"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted font-bold"
                                )}
                            >
                                <tab.icon size={16} />
                                <span className="text-xs tracking-tight hidden sm:inline">{tab.label}</span>
                                {tab.count !== null && (
                                    <span className={cn("text-[10px] px-1.5 rounded-md", isActive ? "bg-background/20" : "bg-muted")}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === "summary" && (
                        <motion.div
                            key="summary"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="space-y-8"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-card border border-border rounded-3xl shadow-sm relative overflow-hidden group">
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary group-hover:rotate-12 transition-transform">
                                        <Sparkles size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black tracking-tight">Vistazo Rápido</h2>
                                        <p className="text-[11px] text-muted-foreground font-medium">Navega a los cambios pulsando en los iconos</p>
                                    </div>
                                </div>
                                <div className="px-5 py-1.5 rounded-2xl border border-border bg-muted/30 text-sm font-black tracking-widest text-center relative z-10">
                                    {versionUrl}
                                </div>
                            </div>

                            {/* Champions Grid */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-black flex items-center gap-2">
                                    <Sword size={18} className="text-muted-foreground" />
                                    Campeones Modificados
                                </h3>
                                <div className="bg-card/50 border border-border rounded-3xl p-6 flex flex-wrap gap-3">
                                    {champions.map((champ: any) => {
                                        const cType = determineChampionType(champ);
                                        return (
                                            <button
                                                key={champ.id}
                                                onClick={() => handleNavigate("champions", champ.id)}
                                                className="group relative transition-transform hover:scale-110 active:scale-95"
                                                title={champ.name}
                                            >
                                                <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${champ.id}.png`} className="w-12 h-12 rounded-xl border border-white/10 shadow-lg object-cover" alt={champ.name} />
                                                <div className={cn(
                                                    "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background shadow-sm",
                                                    cType === 'buff' ? 'bg-emerald-500' : cType === 'nerf' ? 'bg-rose-500' : 'bg-amber-500'
                                                )} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Items Grid */}
                            {items.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-black flex items-center gap-2">
                                        <Shield size={18} className="text-muted-foreground" />
                                        Ajustes de Objetos
                                    </h3>
                                    <div className="bg-card/50 border border-border rounded-3xl p-6 flex flex-wrap gap-3">
                                        {items.map((item: any) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleNavigate("items", item.id)}
                                                className="group relative transition-transform hover:scale-110 active:scale-95"
                                                title={item.name}
                                            >
                                                <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/item/${item.id}.png`} className="w-12 h-12 rounded-xl border border-white/10 shadow-lg object-cover" alt={item.name} />
                                                <div className={cn(
                                                    "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background shadow-sm",
                                                    item.type === 'buff' ? 'bg-emerald-500' : item.type === 'nerf' ? 'bg-rose-500' : 'bg-amber-500'
                                                )} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === "champions" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
                                    {[
                                        { id: "all", label: "Todos", color: "zinc" },
                                        { id: "buff", icon: TrendingUp, color: "emerald", label: "Mejoras" },
                                        { id: "nerf", icon: TrendingDown, color: "rose", label: "Nerfeos" },
                                        { id: "adjustment", icon: Minus, color: "amber", label: "Ajustes" }
                                    ].map(f => {
                                        const isSelected = filterType === f.id;
                                        return (
                                            <button
                                                key={f.id}
                                                onClick={() => setFilterType(f.id as any)}
                                                className={cn(
                                                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shrink-0 flex items-center gap-2",
                                                    isSelected
                                                        ? `bg-${f.color}-500/10 border-${f.color}-500/30 text-${f.color}-600 dark:text-${f.color}-400`
                                                        : "text-muted-foreground border-transparent hover:bg-muted"
                                                )}
                                            >
                                                {f.icon && <f.icon size={13} />} {f.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => {
                                        const isAnyExpanded = filteredChampions.some((c: any) => expandedIds[c.id]);
                                        if (isAnyExpanded) {
                                            setExpandedIds({});
                                        } else {
                                            const newExpanded = { ...expandedIds };
                                            filteredChampions.forEach((c: any) => { newExpanded[c.id] = true; });
                                            setExpandedIds(newExpanded);
                                        }
                                    }}
                                    className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-colors shrink-0"
                                >
                                    {filteredChampions.some((c: any) => expandedIds[c.id]) ? (
                                        <><ChevronUp size={14} /> Colapsar</>
                                    ) : (
                                        <><Activity size={14} /> Expandir Todo</>
                                    )}
                                </button>
                            </div>

                            {filteredChampions.map((champ: any) => {
                                const cType = determineChampionType(champ);
                                const isExp = expandedIds[champ.id];
                                const typeStyles = cType === "buff" ? "border-emerald-500/20 bg-emerald-500/[0.03]" : cType === "nerf" ? "border-rose-500/20 bg-rose-500/[0.03]" : "border-amber-500/20 bg-amber-500/[0.03]";

                                return (
                                    <div key={champ.id} id={`item-${champ.id}`} className={cn("rounded-3xl border transition-all duration-300 scroll-mt-24 overflow-hidden shadow-sm", typeStyles, isExp && "ring-1 ring-border")}>
                                        <div className="p-5 lg:p-7 flex gap-5 items-center cursor-pointer" onClick={() => toggleExpand(champ.id)}>
                                            <div className="relative shrink-0">
                                                <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${champ.id}.png`} className="w-16 h-16 rounded-2xl border border-border shadow-xl hover:rotate-3 transition-transform" alt="" />
                                                <div className={cn(
                                                    "absolute -bottom-1 -right-1 p-1.5 rounded-xl border-2 border-background shadow-lg",
                                                    cType === "buff" ? "bg-emerald-500" : cType === "nerf" ? "bg-rose-500" : "bg-amber-500"
                                                )}>
                                                    {cType === "buff" ? <TrendingUp size={12} className="text-white" /> : cType === "nerf" ? <TrendingDown size={12} className="text-white" /> : <Minus size={12} className="text-white" />}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <h2 className="text-xl lg:text-2xl font-black tracking-tight">{champ.name}</h2>
                                                {/* <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1 line-clamp-1 italic">
                                                    {champ.developerContext?.summary || "Actualización de balance"}
                                                </p> */}
                                            </div>
                                            <div className={cn("p-3 rounded-2xl transition-all", isExp ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>
                                                {isExp ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExp && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-muted/10">
                                                    <div className="p-6 lg:p-10 space-y-10 border-t border-border/50">

                                                        {champ.developerContext?.context && (
                                                            <blockquote className="text-sm text-muted-foreground italic border-l-4 border-primary/30 pl-5 py-2 bg-primary/5 rounded-r-lg">
                                                                "{champ.developerContext.context}"
                                                            </blockquote>
                                                        )}

                                                        {champ.passive && (
                                                            <div className="space-y-4">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/80 flex items-center gap-2">
                                                                    <span className="w-2 h-0.5 bg-primary/30 rounded-full" /> Pasiva: {champ.passive.name}
                                                                </h4>
                                                                <div className="flex gap-4 p-5 bg-card/80 border border-border rounded-2xl shadow-sm">
                                                                    <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/passive/${champ.passive.image}`} className="w-12 h-12 rounded-xl h-fit border border-border" alt="" />
                                                                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{champ.passive.descriptionChange?.new}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {champ.developerContext?.changes && champ.developerContext.changes.length > 0 && (
                                                            <div className="space-y-5">
                                                                {/* <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/80 flex items-center gap-2">
                                                                    <span className="w-2 h-0.5 bg-primary/30 rounded-full" /> Cambios Oficiales
                                                                </h4> */}
                                                                <ul className="space-y-4 px-2">
                                                                    {(() => {
                                                                        const statsLabels = (champ.stats || []).map((s: any) => getStatLabel(s.stat).toLowerCase());
                                                                        const commonHeaders = ["estadísticas básicas", "base stats", "estadísticas de base", "estadisticas básicas"];

                                                                        return (champ.developerContext.changes as string[])?.filter(line => {
                                                                            const cleanLine = line.replace(/\*\*/g, '').trim().toLowerCase();
                                                                            const isHeader = line.startsWith("**");
                                                                            if (isHeader && champ.stats?.length > 0 && commonHeaders.includes(cleanLine)) return false;
                                                                            const isStatLine = statsLabels.some(label =>
                                                                                cleanLine.startsWith(label) && (cleanLine.includes(':') || cleanLine.includes('⇒') || cleanLine.includes('=>') || cleanLine.includes('->'))
                                                                            );
                                                                            if (isStatLine) return false;
                                                                            return true;
                                                                        });
                                                                    })().map((line: string, i: number) => {
                                                                        if (line.startsWith("**")) {
                                                                            const weaponName = line.replace(/\*\*/g, '').trim();
                                                                            return (
                                                                                <div key={i} className="flex items-center gap-3 pt-4 pb-2 border-b border-border/50">
                                                                                    <h5 className="text-sm font-black text-foreground uppercase tracking-tight">{weaponName}</h5>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <li key={i} className="flex gap-4 text-sm leading-relaxed text-muted-foreground group">
                                                                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                                                                <span className="group-hover:text-foreground transition-colors" dangerouslySetInnerHTML={{ __html: line.replace(/\*(.*?)\*/g, '<strong class="text-foreground">$1</strong>') }} />
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        <div className="flex flex-col gap-10">
                                                            {champ.stats?.length > 0 && (
                                                                <div className="space-y-4">
                                                                    <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">Atributos Base</span>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                        {champ.stats.map((s: any, i: number) => (
                                                                            <div key={i} className="flex items-center justify-between p-4 bg-card/60 border border-border/60 rounded-2xl shadow-sm hover:border-primary/20 transition-all">
                                                                                <span className="text-xs font-bold text-muted-foreground">{getStatLabel(s.stat)}</span>
                                                                                <div className="flex items-center gap-3 font-mono">
                                                                                    <span className="text-[10px] text-muted-foreground/30 line-through">{s.old}</span>
                                                                                    <ArrowRight size={12} className="text-muted-foreground/20" />
                                                                                    <span className={cn("text-xs font-black", s.type === 'buff' ? 'text-emerald-500' : 'text-rose-500')}>{s.new}</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {champ.spells?.length > 0 && (
                                                                <div className="space-y-4">
                                                                    {/* <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">Cualidades & Habilidades</span> */}
                                                                    <div className="space-y-6">
                                                                        {champ.spells.map((sp: any, i: number) => (
                                                                            <div key={i} className="bg-card/40 border border-border/80 rounded-[2rem] p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group/spell w-full">
                                                                                {/* Decoración de fondo sutil */}
                                                                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover/spell:bg-primary/10 transition-colors" />

                                                                                <div className="flex gap-4 relative z-10">
                                                                                    <div className="relative shrink-0 w-16 h-16">
                                                                                        <img
                                                                                            src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/${(sp.key === "Pasiva" || sp.key === "P") ? "passive" : "spell"}/${sp.image}`}
                                                                                            className="w-full h-full rounded-xl border-2 border-border shadow-md group-hover/spell:scale-105 transition-transform object-cover object-center"
                                                                                            alt=""
                                                                                        />
                                                                                        <div className="absolute -top-2 -left-2 bg-foreground text-background text-[11px] font-black w-7 h-7 rounded-lg flex items-center justify-center border-2 border-background shadow-lg z-20">
                                                                                            {sp.key}
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="flex-1 min-w-0">
                                                                                        <h5 className="text-lg font-black tracking-tight leading-none mb-3">{sp.name}</h5>

                                                                                        <div className="flex flex-col gap-2">
                                                                                            {sp.changes.map((c: any, j: number) => (
                                                                                                <div key={j} className="group/change p-2.5 rounded-lg bg-muted/20 border border-transparent hover:border-border/40 hover:bg-muted/30 transition-all flex flex-col gap-1.5">
                                                                                                    <div className="flex items-center justify-between">
                                                                                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{getAttributeLabel(c.attribute)}</span>
                                                                                                        {(c.type === 'buff' || c.type === 'nerf') && (
                                                                                                            <div className={cn(
                                                                                                                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                                                                                c.type === 'buff' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                                                                                            )}>
                                                                                                                {c.type}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>

                                                                                                    <div className="space-y-1.5 bg-background/40 p-2.5 rounded-lg border border-border/15 shadow-sm">
                                                                                                        {c.attribute === 'description' || c.attribute === 'bugfix' ? (
                                                                                                            <p className="text-[11px] text-foreground/80 leading-snug italic whitespace-normal">{c.new}</p>
                                                                                                        ) : (
                                                                                                            <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                                                                                                                <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-tighter self-center pt-0.5">Antes</span>
                                                                                                                <p className="text-[10px] text-muted-foreground/60 font-mono break-all leading-tight">{c.old}</p>

                                                                                                                <span className="text-[8px] font-black text-primary/40 uppercase tracking-tighter self-center pt-0.5">Ahora</span>
                                                                                                                <p className={cn(
                                                                                                                    "text-[11px] font-mono font-black leading-tight break-all",
                                                                                                                    c.type === 'buff' ? 'text-emerald-500' : c.type === 'nerf' ? 'text-rose-500' : 'text-primary'
                                                                                                                )}>
                                                                                                                    {c.new}
                                                                                                                </p>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}

                    {activeTab === "items" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {items.map((item: any) => (
                                <div key={item.id} id={`item-${item.id}`} className="bg-card border border-border rounded-3xl p-6 flex flex-col items-center text-center group transition-all scroll-mt-24 shadow-sm hover:shadow-xl hover:-translate-y-1">
                                    <div className="relative mb-4">
                                        <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/item/${item.id}.png`} className="w-20 h-20 rounded-2xl border border-border group-hover:scale-105 transition-transform shadow-2xl" alt="" />
                                        <div className={cn("absolute -bottom-1 -right-1 p-1.5 rounded-xl border-2 border-background shadow-lg", item.type === 'buff' ? 'bg-emerald-500' : item.type === 'nerf' ? 'bg-rose-500' : 'bg-amber-500')}>
                                            {item.type === 'buff' ? <TrendingUp size={12} className="text-white" /> : item.type === 'nerf' ? <TrendingDown size={12} className="text-white" /> : <Minus size={12} className="text-white" />}
                                        </div>
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-tight mb-3 line-clamp-1">{item.name}</h3>
                                    {item.goldChange && <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-none font-black">{item.goldChange.new}g</Badge>}

                                    <div className="mt-4 w-full space-y-2">
                                        {item.statChanges?.map((s: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-[10px] px-2 py-1 bg-muted/30 rounded-lg">
                                                <span className="text-muted-foreground font-bold">{getStatLabel(s.stat)}</span>
                                                <span className={s.type === 'buff' ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>{s.new}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === "systems" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {runes.map((rune: any) => (
                                <div key={rune.id} id={`item-${rune.id}`} className="bg-card border border-border rounded-3xl p-6 flex gap-6 items-center shadow-sm hover:shadow-md transition-all scroll-mt-24">
                                    <div className="p-3 bg-muted/50 rounded-2xl border border-border">
                                        <img src={`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`} className="w-10 h-10" alt="" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-black tracking-tight">{rune.name}</h3>
                                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic line-clamp-2">
                                            {rune.descriptionChange?.new || "Ajustes estructurales de sistema."}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Fuentes (Sources) */}
                {validSources.length > 0 && (
                    <div className="mt-16 mb-8">
                        <div className="text-sm text-muted-foreground bg-muted/20 p-4 rounded-2xl border border-border flex items-center gap-3 overflow-hidden flex-wrap shadow-inner">
                            <span className="font-bold shrink-0 flex items-center gap-2 text-foreground/70 text-xs">
                                <LinkIcon size={14} />
                                FUENTES:
                            </span>
                            {validSources.map((fuente, index, arr) => (
                                <span key={index} className="inline-flex items-center text-xs">
                                    {fuente.match(/^https?:\/\//) ? (
                                        <a href={fuente} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary font-bold hover:text-primary/80 transition-colors truncate max-w-[150px] sm:max-w-xs">{getSafeHostname(fuente)}</a>
                                    ) : (
                                        <span className="truncate max-w-[150px] sm:max-w-xs">{fuente}</span>
                                    )}
                                    {index < arr.length - 1 && <span className="mx-2 text-border">•</span>}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
