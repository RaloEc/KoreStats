"use client";

import { useAuth } from "@/context/AuthContext";
import { AllstarClipsVerticalFeed } from "@/components/riot/AllstarClipsVerticalFeed";
import { ProRadarFeed } from "@/components/riot/ProRadarFeed";

export default function ProFeedPage() {
    const { user } = useAuth();

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-black mb-8 text-foreground tracking-tight">Tu Pro Feed</h1>

            {!user ? (
                <div className="p-8 text-center bg-muted/50 rounded-xl">
                    <p className="text-muted-foreground">Inicia sesión para ver tu feed personalizado de los profesionales que sigues.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Columna Izquierda: Radar Pro (Meta Insights) */}
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                                <span className="bg-primary text-primary-foreground p-1.5 rounded-md">📡</span>
                                Radar de Tendencias
                            </h2>
                            <p className="text-sm text-muted-foreground mb-6">Descubre lo que están jugando los profesionales que sigues.</p>
                            <ProRadarFeed />
                        </div>
                    </div>

                    {/* Columna Derecha: Pro Feed TikTok Style */}
                    <div className="lg:col-span-1">
                        <AllstarClipsVerticalFeed followedOnly={true} />
                    </div>
                </div>
            )}
        </div>
    );
}
