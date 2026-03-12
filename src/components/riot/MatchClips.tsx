"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, ExternalLink, Video } from "lucide-react";
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
}

export function MatchClips({ matchId }: { matchId: string }) {
    const [selectedClip, setSelectedClip] = useState<AllstarClip | null>(null);

    const { data: clips = [], isLoading } = useQuery({
        queryKey: ["match-clips", matchId],
        queryFn: async () => {
            const params = new URLSearchParams({ matchId });
            const response = await fetch(`/api/riot/clips?${params.toString()}`);
            if (!response.ok) throw new Error("Error loading match clips");
            const result = await response.json();
            return (result.clips || []) as AllstarClip[];
        },
        enabled: !!matchId,
    });

    if (isLoading) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-2">
                {[1, 2].map((i) => (
                    <div key={i} className="flex-none basis-[280px] aspect-video rounded-xl bg-muted animate-pulse border border-white/5" />
                ))}
            </div>
        );
    }

    if (clips.length === 0) {
        return null;
    }

    return (
        <div className="w-full mb-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2 tracking-tight">
                <Video className="w-5 h-5 text-primary" />
                Highlights de la Partida
                <Badge variant="secondary" className="bg-primary/20 text-primary border-none ml-2 text-xs">
                    {clips.length} Jugadas
                </Badge>
            </h3>

            <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                {clips.map((clip) => (
                    <Card
                        key={clip.id}
                        className="flex-none w-[280px] sm:w-[320px] snap-center overflow-hidden border-white/5 bg-black/40 backdrop-blur-sm group/card hover:border-primary/50 transition-all duration-300 cursor-pointer"
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

                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="p-3 rounded-full bg-primary text-primary-foreground transform scale-90 group-hover/card:scale-110 transition-transform">
                                        <Play className="fill-current w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            <div className="absolute top-2 left-2">
                                <Badge variant="secondary" className="bg-black/60 backdrop-blur-md border-white/10 text-[10px] h-5">
                                    Allstar.gg
                                </Badge>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                <p className="text-sm font-semibold line-clamp-1 text-white">
                                    {clip.clip_title || "Mejor jugada"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={!!selectedClip} onOpenChange={(open) => !open && setSelectedClip(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden border-white/10 bg-black container-tight">
                    <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                        <DialogTitle className="text-white text-lg font-bold truncate pr-8">
                            {selectedClip?.clip_title}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="aspect-video w-full relative group/video">
                        {selectedClip?.allstar_clip_id ? (
                            <iframe
                                src={`https://player.allstar.gg/clip/${selectedClip.allstar_clip_id}`}
                                className="w-full h-full border-0 outline-none"
                                allowFullScreen
                            />
                        ) : selectedClip?.video_url && (
                            <video
                                src={selectedClip.video_url}
                                controls
                                autoPlay
                                className="w-full h-full outline-none"
                                poster={selectedClip.thumbnail_url}
                            />
                        )}

                        <a
                            href={`https://allstar.gg/clip?v=${selectedClip?.allstar_clip_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-4 right-4 p-2 rounded-lg bg-black/60 hover:bg-primary text-white backdrop-blur-sm transition-all flex items-center gap-2 text-xs opacity-0 group-hover/video:opacity-100 z-20"
                        >
                            Ver en Allstar <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
