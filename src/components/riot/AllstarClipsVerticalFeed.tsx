"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, ExternalLink, Video, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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

interface AllstarClipsVerticalFeedProps {
    puuid?: string;
    className?: string;
    followedOnly?: boolean;
}

export function AllstarClipsVerticalFeed({ puuid, className, followedOnly }: AllstarClipsVerticalFeedProps) {
    const [selectedClip, setSelectedClip] = useState<AllstarClip | null>(null);
    const { toast } = useToast();

    // Estado local simulado para votos por ahora
    const [votes, setVotes] = useState<Record<string, { up: number; down: number; userVote: 1 | -1 | 0 }>>({});

    const { data, isLoading } = useQuery({
        queryKey: ["allstar-clips", { puuid, followedOnly }],
        queryFn: async () => {
            if (followedOnly) {
                const response = await fetch('/api/riot/clips/followed');
                if (!response.ok) throw new Error("Error loading followed clips");
                const result = await response.json();
                return result as { clips: AllstarClip[] };
            }

            const params = new URLSearchParams();
            if (puuid) params.set("puuid", puuid);

            const response = await fetch(`/api/riot/clips?${params.toString()}`);
            if (!response.ok) throw new Error("Error loading clips");
            const result = await response.json();
            return result as { clips: AllstarClip[] };
        },
        enabled: !!puuid || !!followedOnly,
    });

    const clips = data?.clips || [];

    const handleVote = (clipId: string, type: 1 | -1) => {
        setVotes(prev => {
            const current = prev[clipId] || { up: Math.floor(Math.random() * 50) + 10, down: Math.floor(Math.random() * 5), userVote: 0 };

            if (current.userVote === type) {
                // Remove vote
                return {
                    ...prev,
                    [clipId]: {
                        up: type === 1 ? current.up - 1 : current.up,
                        down: type === -1 ? current.down - 1 : current.down,
                        userVote: 0
                    }
                };
            }

            // Change or add vote
            return {
                ...prev,
                [clipId]: {
                    up: type === 1 ? current.up + 1 : (current.userVote === 1 ? current.up - 1 : current.up),
                    down: type === -1 ? current.down + 1 : (current.userVote === -1 ? current.down - 1 : current.down),
                    userVote: type
                }
            };
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="aspect-[4/5] rounded-xl bg-muted animate-pulse" />
                ))}
            </div>
        );
    }

    if (clips.length === 0) {
        return (
            <Card className="bg-muted/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <Video className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-medium">No hay clips recientes</p>
                    <p className="text-xs text-muted-foreground">Las mejores jugadas aparecerán aquí automáticamente.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <section className={cn("flex flex-col gap-6", className)}>
            <div className="flex items-center gap-2 px-2 sticky top-0 bg-background/95 backdrop-blur-md z-10 py-3 border-b border-slate-200 dark:border-white/10 shadow-sm">
                <div className="p-2 rounded-lg bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                    <Video className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">Pro Feed</h2>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mejores jugadas</p>
                </div>
            </div>

            <div className="flex flex-col gap-8 pb-8">
                {clips.map((clip) => {
                    const clipVotes = votes[clip.id] || { up: Math.floor(Math.random() * 50) + 10, down: Math.floor(Math.random() * 5), userVote: 0 };

                    return (
                        <Card key={clip.id} className="overflow-hidden border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-0 flex flex-col">
                                {/* Video Header */}
                                <div className="p-3 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 line-clamp-1">{clip.clip_title || "Mejor jugada"}</h3>
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">
                                            {new Date(clip.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Video Player / Thumbnail */}
                                <div
                                    className="relative aspect-video bg-slate-100 dark:bg-zinc-900 cursor-pointer group"
                                    onClick={() => setSelectedClip(clip)}
                                >
                                    {clip.thumbnail_url ? (
                                        <img
                                            src={clip.thumbnail_url}
                                            alt={clip.clip_title}
                                            className="w-full h-full object-cover transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Play className="w-12 h-12 text-slate-300 dark:text-zinc-700" />
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <div className="p-4 rounded-full bg-primary text-primary-foreground transform scale-90 group-hover:scale-100 transition-all">
                                            <Play className="fill-current w-8 h-8" />
                                        </div>
                                    </div>
                                </div>

                                {/* Social Interactions (Simulated) */}
                                <div className="p-3 bg-slate-50/80 dark:bg-zinc-950/50 flex items-center justify-between border-t border-slate-200 dark:border-white/5">
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("h-8 px-2 gap-1.5 font-bold text-slate-700 dark:text-slate-300", clipVotes.userVote === 1 && "text-emerald-600 bg-emerald-500/10 dark:text-green-500")}
                                            onClick={() => handleVote(clip.id, 1)}
                                        >
                                            <ThumbsUp className="w-4 h-4" />
                                            <span className="text-xs font-bold">{clipVotes.up}</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("h-8 px-2 gap-1.5 font-bold text-slate-700 dark:text-slate-300", clipVotes.userVote === -1 && "text-rose-600 bg-rose-500/10 dark:text-red-500")}
                                            onClick={() => handleVote(clip.id, -1)}
                                        >
                                            <ThumbsDown className="w-4 h-4" />
                                            <span className="text-xs font-bold">{clipVotes.down}</span>
                                        </Button>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-bold">
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="text-xs font-bold">{Math.floor(Math.random() * 20)}</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

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
