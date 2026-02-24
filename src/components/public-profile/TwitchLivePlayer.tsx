"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Users, Tv } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TwitchLivePlayerProps {
  username: string;
}

export default function TwitchLivePlayer({ username }: TwitchLivePlayerProps) {
  const { data: status, isLoading } = useQuery({
    queryKey: ["twitch-live", username],
    queryFn: async () => {
      const res = await fetch(`/api/social/twitch/live/${username}`);
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60000, // Cada minuto
    enabled: !!username,
  });

  if (isLoading || !status || !status.isLive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full mb-8 relative"
    >
      <div className="relative group overflow-hidden rounded-3xl border-2 border-purple-500/30 bg-black shadow-2xl transition-all hover:border-purple-500/50">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

        <div className="relative bg-[#0e0e10]">
          {/* Header del Directo */}
          <div className="p-4 md:p-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/20">
                  <Tv size={24} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-600 border-2 border-[#0e0e10] rounded-full animate-pulse"></div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg md:text-xl font-bold font-unbounded text-white tracking-tight">
                    {username}{" "}
                    <span className="text-purple-400">está en directo</span>
                  </h3>
                  <Badge className="bg-red-600 hover:bg-red-700 text-[10px] font-black tracking-widest px-1.5 h-4">
                    LIVE
                  </Badge>
                </div>
                <p className="text-slate-400 text-xs md:text-sm font-medium line-clamp-1 max-w-[300px] md:max-w-[500px]">
                  {status.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end px-4 border-r border-white/10">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Espectadores
                </span>
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  {status.viewerCount?.toLocaleString()}
                </span>
              </div>

              <div className="hidden lg:flex flex-col items-end px-4 border-r border-white/10">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Jugando a
                </span>
                <span className="text-sm font-bold text-purple-400">
                  {status.gameName}
                </span>
              </div>

              <Button
                asChild
                variant="outline"
                className="h-10 px-4 bg-purple-600/10 hover:bg-purple-600 text-purple-100 border-purple-600/30 hover:border-purple-600 transition-all rounded-xl"
              >
                <a
                  href={`https://twitch.tv/${username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <span className="font-bold text-xs uppercase tracking-widest">
                    Ver en Twitch
                  </span>
                  <ExternalLink size={14} />
                </a>
              </Button>
            </div>
          </div>

          {/* IFrame de Directo */}
          <div className="relative aspect-video w-full bg-black/40">
            <iframe
              src={`https://player.twitch.tv/?channel=${username}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}&autoplay=true&muted=true`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
