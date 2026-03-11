"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, ExternalLink, Video, X, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface AllstarClip {
    id: string;
    allstar_clip_id: string;
    clip_title: string;
    video_url: string;
    thumbnail_url: string;
    champion_id?: number;
    created_at: string;
    is_pinned?: boolean;
}

interface AllstarClipsGalleryProps {
    userId?: string;
    puuid?: string;
    className?: string;
    isOwnProfile?: boolean;
}

export function AllstarClipsGallery({ userId, puuid, className, isOwnProfile = false }: AllstarClipsGalleryProps) {
    const [selectedClip, setSelectedClip] = useState<AllstarClip | null>(null);
    const { toast } = useToast();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["allstar-clips", { userId, puuid }],
        queryFn: async () => {
            console.log(`[AllstarClipsGallery] Fetching clips for userId=${userId}, puuid=${puuid}`);
            const params = new URLSearchParams();
            if (userId) params.set("userId", userId);
            if (puuid) params.set("puuid", puuid);
            // If it's not the owner's profile, append guest flag so the API filters pinned clips
            if (!isOwnProfile) {
                params.set("guest", "true");
            }

            const response = await fetch(`/api/riot/clips?${params.toString()}`);
            if (!response.ok) throw new Error("Error loading clips");
            const result = await response.json();
            console.log(`[AllstarClipsGallery] Received ${result.clips?.length || 0} clips`);
            return result as { clips: AllstarClip[] };
        },
        enabled: !!(userId || puuid),
    });

    const clips = data?.clips || [];

    const togglePin = async (e: React.MouseEvent, clip: AllstarClip) => {
        e.stopPropagation();

        try {
            const res = await fetch("/api/riot/clips/pin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clipId: clip.id,
                    isPinned: !clip.is_pinned
                })
            });

            if (!res.ok) throw new Error("No se pudo actualizar");

            toast({
                title: clip.is_pinned ? "Clip no destacado" : "Clip destacado ⭐",
                description: clip.is_pinned
                    ? "El clip dejará de mostrarse en tu perfil para otros."
                    : "El clip ahora está fijo en tu perfil público."
            });

            refetch();
        } catch (error) {
            toast({
                title: "Error",
                description: "Ocurrió un error al actualizar el clip.",
                variant: "destructive"
            });
        }
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="aspect-video rounded-xl bg-muted animate-pulse" />
                ))}
            </div>
        );
    }

    if (clips.length === 0) {
        return null;
    }

    return (
        <section className={cn("space-y-4 py-6", className)}>
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Video className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Highlights de Allstar</h2>
                        <p className="text-sm text-muted-foreground">Jugadas destacadas generadas automáticamente</p>
                    </div>
                </div>
            </div>

            <Carousel
                opts={{
                    align: "start",
                    loop: false,
                }}
                className="w-full relative group"
            >
                <CarouselContent className="-ml-4">
                    {clips.map((clip) => (
                        <CarouselItem key={clip.id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -5 }}
                            >
                                <Card
                                    className="overflow-hidden border-white/5 bg-black/40 backdrop-blur-sm group/card hover:border-primary/50 transition-all duration-300 cursor-pointer"
                                    onClick={() => setSelectedClip(clip)}
                                >
                                    <CardContent className="p-0 relative aspect-video">
                                        <div className="absolute inset-0 bg-muted overflow-hidden">
                                            {clip.thumbnail_url ? (
                                                <img
                                                    src={clip.thumbnail_url}
                                                    alt={clip.clip_title}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                                    <Play className="w-12 h-12 text-zinc-700" />
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <div className="p-3 rounded-full bg-primary text-primary-foreground hover:scale-110 transition-transform">
                                                    <Play className="fill-current w-6 h-6" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute top-2 left-2 flex gap-2">
                                            <Badge variant="secondary" className="bg-black/60 backdrop-blur-md border-white/10 text-[10px] h-5">
                                                Clip de LoL
                                            </Badge>
                                            {clip.is_pinned && (
                                                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50 backdrop-blur-md text-[10px] h-5 px-1.5 flex items-center gap-1">
                                                    <Star className="w-3 h-3 fill-current" />
                                                </Badge>
                                            )}
                                        </div>

                                        {isOwnProfile && (
                                            <button
                                                className={cn(
                                                    "absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black border transition-all z-20",
                                                    clip.is_pinned
                                                        ? "border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                                                        : "border-transparent text-white/50 hover:text-white"
                                                )}
                                                onClick={(e) => togglePin(e, clip)}
                                                title={clip.is_pinned ? "Quitar de destacados" : "Destacar en mi perfil"}
                                            >
                                                <Star className={cn("w-4 h-4", clip.is_pinned && "fill-current")} />
                                            </button>
                                        )}

                                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                            <p className="text-sm font-semibold line-clamp-1 text-white">
                                                {clip.clip_title || "Mejor jugada"}
                                            </p>
                                            <p className="text-[10px] text-zinc-400">
                                                {new Date(clip.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <div className="hidden md:block">
                    <CarouselPrevious className="-left-4 bg-black/50 border-white/10 hover:bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CarouselNext className="-right-4 bg-black/50 border-white/10 hover:bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </Carousel>

            {/* Modal para ver el video */}
            <Dialog open={!!selectedClip} onOpenChange={(open) => !open && setSelectedClip(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden border-white/10 bg-black container-tight">
                    <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                        <DialogTitle className="text-white text-lg font-bold truncate pr-8">
                            {selectedClip?.clip_title}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="aspect-video w-full relative group/video">
                        {selectedClip?.video_url && (
                            <video
                                src={selectedClip.video_url}
                                controls
                                autoPlay
                                className="w-full h-full"
                                poster={selectedClip.thumbnail_url}
                            />
                        )}

                        <a
                            href={`https://allstar.gg/clip?v=${selectedClip?.allstar_clip_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-4 right-4 p-2 rounded-lg bg-black/60 hover:bg-primary text-white backdrop-blur-sm transition-all flex items-center gap-2 text-xs opacity-0 group-hover/video:opacity-100"
                        >
                            Ver en Allstar <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </DialogContent>
            </Dialog>
        </section>
    );
}
