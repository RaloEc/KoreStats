"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LolPatchPreviewProps {
    data: any;
    variant?: "compact" | "full" | "featured";
    className?: string;
}

function StatChangeRow({ change }: { change: any }) {
    const isBuff = change.type === "buff";
    const isNerf = change.type === "nerf";

    return (
        <div className="flex items-center justify-between gap-4 text-[0.625rem] py-0.5">
            <span className="text-muted-foreground font-medium uppercase tracking-tight">
                {change.stat || change.attribute || "Ajuste"}
            </span>
            <div className="flex items-center gap-1.5 font-bold">
                <span className={cn(isNerf ? "text-red-500" : "text-muted-foreground/60")}>
                    {change.old}
                </span>
                <ArrowRight className="h-2 w-2 text-muted-foreground/40" />
                <span className={cn(
                    isBuff ? "text-green-500" : isNerf ? "text-red-500" : "text-orange-500"
                )}>
                    {change.new}
                </span>
            </div>
        </div>
    );
}

export function LolPatchPreview({ data, variant = "full", className = "" }: LolPatchPreviewProps) {
    if (!data || !data.champions) return null;

    const version = data.version || "14.1.1";

    if (variant === "compact") {
        return (
            <div className={`mt-2 flex flex-wrap gap-1 ${className}`}>
                {data.champions?.slice(0, 4).map((champ: any) => (
                    <img
                        key={champ.id}
                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.image}`}
                        className="w-5 h-5 rounded-full border border-border/50"
                        alt={champ.name}
                        title={champ.name}
                    />
                ))}
                {data.items?.slice(0, 2).map((item: any) => (
                    <img
                        key={item.id}
                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${item.image}`}
                        className="w-5 h-5 rounded border border-border/50 bg-black/20"
                        alt={item.name}
                        title={item.name}
                    />
                ))}
                {(data.champions.length > 4 || (data.items?.length || 0) > 2) && (
                    <span className="text-[0.625rem] text-muted-foreground self-center ml-0.5">
                        +{(data.champions.length - 4) + (Math.max(0, (data.items?.length || 0) - 2))}
                    </span>
                )}
            </div>
        );
    }

    const isFeatured = variant === "featured";
    const maxChamps = isFeatured ? 12 : 6;
    const maxItems = isFeatured ? 10 : 6;

    return (
        <TooltipProvider delayDuration={200}>
            <div className={`space-y-5 ${className}`}>
                <div className={`${isFeatured ? "grid grid-cols-1 md:grid-cols-2 gap-8" : "space-y-6"}`}>
                    {/* Campeones */}
                    {data.champions && data.champions.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-border/10 pb-2">
                                <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    Campeones Ajustados
                                </span>
                                <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[0.625rem] tabular-nums font-bold">
                                    {data.champions.length}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                                {data.champions.slice(0, maxChamps).map((champ: any) => {
                                    const hasBuffs = champ.stats?.some((s: any) => s.type === "buff") ||
                                        champ.spells?.some((sp: any) => sp.changes?.some((c: any) => c.type === "buff"));
                                    const hasNerfs = champ.stats?.some((s: any) => s.type === "nerf") ||
                                        champ.spells?.some((sp: any) => sp.changes?.some((c: any) => c.type === "nerf"));

                                    let indicatorColor = "bg-orange-500";
                                    if (hasBuffs && !hasNerfs) indicatorColor = "bg-green-500";
                                    else if (hasNerfs && !hasBuffs) indicatorColor = "bg-red-500";

                                    return (
                                        <Tooltip key={champ.id}>
                                            <TooltipTrigger asChild>
                                                <div className="relative group/icon cursor-help">
                                                    <img
                                                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.image}`}
                                                        alt={champ.name}
                                                        className={`${isFeatured ? 'w-12 h-12' : 'w-9 h-9'} rounded-xl border border-border/40 group-hover/icon:border-primary/50 group-hover/icon:scale-110 transition-all shadow-md`}
                                                    />
                                                    <div className={`absolute -top-1 -right-1 ${isFeatured ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} rounded-full border-2 border-background shadow-sm ${indicatorColor}`} />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="p-0 border-none bg-transparent shadow-none overflow-visible">
                                                <div className="bg-popover border border-border/60 rounded-xl shadow-xl overflow-hidden min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="px-3 py-2 bg-muted/40 border-b border-border/10 flex items-center justify-between gap-3">
                                                        <span className="font-bold text-xs">{champ.name}</span>
                                                        <div className="flex items-center gap-1">
                                                            {hasBuffs && <TrendingUp className="h-3 w-3 text-green-500" />}
                                                            {hasNerfs && <TrendingDown className="h-3 w-3 text-red-500" />}
                                                            {!hasBuffs && !hasNerfs && <Minus className="h-3 w-3 text-orange-500" />}
                                                        </div>
                                                    </div>
                                                    <div className="p-3 space-y-2">
                                                        {champ.stats && champ.stats.length > 0 && (
                                                            <div className="space-y-1">
                                                                {champ.stats.map((s: any, i: number) => <StatChangeRow key={i} change={s} />)}
                                                            </div>
                                                        )}
                                                        {champ.spells && champ.spells.length > 0 && (
                                                            <div className="space-y-1 pt-1 border-t border-border/10">
                                                                {champ.spells.map((spell: any, i: number) => (
                                                                    <div key={i} className="space-y-0.5">
                                                                        <div className="text-[0.5625rem] font-bold text-muted-foreground/80 uppercase mb-0.5 flex items-center gap-1">
                                                                            <span className="w-1 h-1 rounded-full bg-primary/40" />
                                                                            {spell.name}
                                                                        </div>
                                                                        {spell.changes?.map((c: any, j: number) => <StatChangeRow key={j} change={c} />)}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                                {data.champions.length > maxChamps && (
                                    <div className={`${isFeatured ? 'w-12 h-12 text-sm' : 'w-9 h-9 text-[0.625rem]'} rounded-xl border border-dashed border-border/50 flex items-center justify-center text-muted-foreground bg-muted/10 font-bold`}>
                                        +{data.champions.length - maxChamps}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Objetos */}
                    {data.items && data.items.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-border/10 pb-2">
                                <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                    Ajustes de Objetos
                                </span>
                                <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[0.625rem] tabular-nums font-bold">
                                    {data.items.length}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                                {data.items.slice(0, maxItems).map((item: any) => (
                                    <Tooltip key={item.id}>
                                        <TooltipTrigger asChild>
                                            <div className="relative group/icon cursor-help">
                                                <div className={`${isFeatured ? 'w-12 h-12' : 'w-9 h-9'} rounded-xl overflow-hidden bg-black/40 border border-border/40 group-hover/icon:border-primary/50 group-hover/icon:scale-110 transition-all shadow-md`}>
                                                    <img
                                                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${item.image}`}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover opacity-90 group-hover/icon:opacity-100"
                                                    />
                                                </div>
                                                <div className={`absolute -top-1 -right-1 ${isFeatured ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} rounded-full border-2 border-background shadow-sm ${item.type === 'buff' ? 'bg-green-500' :
                                                    item.type === 'nerf' ? 'bg-red-500' : 'bg-orange-500'
                                                    }`} />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="p-0 border-none bg-transparent shadow-none overflow-visible">
                                            <div className="bg-popover border border-border/60 rounded-xl shadow-xl overflow-hidden min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
                                                <div className="px-3 py-2 bg-muted/40 border-b border-border/10 flex items-center justify-between gap-3">
                                                    <span className="font-bold text-xs">{item.name}</span>
                                                    <div className="flex items-center gap-1">
                                                        {item.type === 'buff' && <TrendingUp className="h-3 w-3 text-green-500" />}
                                                        {item.type === 'nerf' && <TrendingDown className="h-3 w-3 text-red-500" />}
                                                        {item.type === 'adjustment' && <Minus className="h-3 w-3 text-orange-500" />}
                                                    </div>
                                                </div>
                                                <div className="p-3 space-y-2">
                                                    {item.statChanges && item.statChanges.length > 0 && (
                                                        <div className="space-y-1">
                                                            {item.statChanges.map((s: any, i: number) => <StatChangeRow key={i} change={s} />)}
                                                        </div>
                                                    )}
                                                    {item.goldChange && (
                                                        <StatChangeRow change={{
                                                            stat: "Coste de Oro",
                                                            old: item.goldChange.old,
                                                            new: item.goldChange.new,
                                                            type: item.goldChange.new < item.goldChange.old ? "buff" : "nerf"
                                                        }} />
                                                    )}
                                                    {item.descriptionChange && (
                                                        <p className="text-[0.5625rem] text-muted-foreground leading-relaxed italic border-t border-border/10 pt-1">
                                                            Ajustes en la pasiva/activa del objeto.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                                {data.items.length > maxItems && (
                                    <div className={`${isFeatured ? 'w-12 h-12 text-sm' : 'w-9 h-9 text-[0.625rem]'} rounded-xl border border-dashed border-border/50 flex items-center justify-center text-muted-foreground bg-muted/10 font-bold`}>
                                        +{data.items.length - maxItems}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
