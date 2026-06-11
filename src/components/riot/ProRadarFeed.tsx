"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Flame, Trophy, Clock } from "lucide-react";
import Image from "next/image";
import { getChampionImageUrl } from "@/components/riot/match-card/helpers";

// Función dummy para el tiempo relativo
function getRelative(dateString: string) {
    const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
    const elapsed = (new Date(dateString).getTime() - new Date().getTime()) / 1000;

    if (Math.abs(elapsed) < 3600) return rtf.format(Math.round(elapsed / 60), "minute");
    if (Math.abs(elapsed) < 86400) return rtf.format(Math.round(elapsed / 3600), "hour");
    return rtf.format(Math.round(elapsed / 86400), "day");
}

export function ProRadarFeed() {
    const { data: insights, isLoading, isError } = useQuery({
        queryKey: ["pro-insights"],
        queryFn: async () => {
            const res = await fetch("/api/riot/pro-insights");
            if (!res.ok) throw new Error("Error loading insights");
            const data = await res.json();
            return data.insights || [];
        }
    });

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse h-24 bg-muted/50" />
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <Card className="bg-destructive/10 border-destructive/20">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <Activity className="w-8 h-8 text-destructive opacity-50 mb-2" />
                    <p className="text-sm font-medium text-destructive">No se pudo cargar el radar</p>
                </CardContent>
            </Card>
        );
    }

    if (!insights || insights.length === 0) {
        return (
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                    <Activity className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                    <h3 className="font-bold text-lg mb-2 text-foreground">Aún no hay tendencias</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">No tenemos suficientes datos recientes de los pros que sigues, o no has seguido a ninguno aún.</p>
                </CardContent>
            </Card>
        );
    }

    const version = "14.4.1"; // Idealmente dinámica

    const getIcon = (type: string) => {
        switch (type) {
            case "trend": return <Flame className="w-5 h-5 text-orange-500" />;
            case "build": return <Activity className="w-5 h-5 text-sky-500" />;
            case "performance": return <Trophy className="w-5 h-5 text-yellow-500" />;
            default: return <Flame className="w-5 h-5" />;
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {insights.map((insight: any) => (
                <Card key={insight.id} className="overflow-hidden hover:shadow-md transition-shadow group cursor-pointer border-l-4 border-l-primary/50 hover:border-l-primary">
                    <CardContent className="p-4 sm:p-5 flex items-center gap-4 bg-gradient-to-r from-background to-muted/20">
                        {/* Icono del Insight */}
                        <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden relative shadow-sm border border-border">
                            {insight.champion ? (
                                <Image
                                    src={getChampionImageUrl(insight.champion, version)}
                                    alt={insight.champion}
                                    fill
                                    className="object-cover transition-transform group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                    {getIcon(insight.type)}
                                </div>
                            )}

                            {/* Badgetito superpuesto */}
                            {insight.champion && (
                                <div className="absolute -bottom-1 -right-1 bg-background rounded-tl-lg p-1 shadow-sm border-t border-l border-border z-10">
                                    {getIcon(insight.type)}
                                </div>
                            )}
                        </div>

                        {/* Texto */}
                        <div className="flex flex-col flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-black text-sm sm:text-base text-foreground truncate" title={insight.title}>
                                    {insight.title}
                                </h3>
                                <span className="flex-shrink-0 text-[0.625rem] text-muted-foreground font-bold flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3" />
                                    {getRelative(insight.date)}
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                                {insight.description}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
