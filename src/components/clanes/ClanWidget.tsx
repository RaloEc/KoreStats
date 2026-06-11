"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
    subsets: ["latin"],
    weight: ["400", "700", "900"],
    display: "swap",
});
import Image from "next/image";
import { clanService } from "@/lib/clanes/clanService";
import type { Clan, ClanGame } from "@/types/clanes";
import {
  Shield, Users, Plus, ChevronRight, Loader2,
  Unlock, GitMerge, Lock
} from "lucide-react";

interface ClanWidgetProps {
  game: ClanGame;
  gameSlug: string;
}

export default function ClanWidget({ game, gameSlug }: ClanWidgetProps) {
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clanService
      .getClanes({ game, limit: 5 })
      .then(setClans)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [game]);

  const gameLabel = game === "league_of_legends" ? "League of Legends" : "Delta Force";
  const accentColor = game === "league_of_legends"
    ? { 
        text: "text-amber-500", 
        bg: "bg-amber-500/10", 
        border: "border-amber-500/20", 
        borderHover: "hover:border-amber-500/30 dark:hover:border-amber-500/30",
        gradientHover: "hover:from-white hover:to-amber-50/10 dark:hover:from-white/[0.01] dark:hover:to-amber-500/[0.02]",
        shadowHover: "hover:shadow-amber-500/[0.03] dark:hover:shadow-amber-500/[0.02]",
        dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
      }
    : { 
        text: "text-teal-400", 
        bg: "bg-teal-500/10", 
        border: "border-teal-500/20", 
        borderHover: "hover:border-teal-500/30 dark:hover:border-teal-500/30",
        gradientHover: "hover:from-white hover:to-teal-50/10 dark:hover:from-white/[0.01] dark:hover:to-teal-500/[0.02]",
        shadowHover: "hover:shadow-teal-500/[0.03] dark:hover:shadow-teal-500/[0.02]",
        dot: "bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]" 
      };

  const PolicyIcon = ({ policy }: { policy: string }) => {
    if (policy === "open") return (
      <span className="flex items-center gap-1 text-[0.5rem] font-black tracking-widest text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/[0.06] border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
        <Unlock size={8} /> ABIERTO
      </span>
    );
    if (policy === "apply") return (
      <span className="flex items-center gap-1 text-[0.5rem] font-black tracking-widest text-blue-500 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/[0.06] border border-blue-500/20 px-1.5 py-0.5 rounded-md">
        <GitMerge size={8} /> SOLICITUD
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-[0.5rem] font-black tracking-widest text-rose-500 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/[0.06] border border-rose-500/20 px-1.5 py-0.5 rounded-md">
        <Lock size={8} /> CERRADO
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.04] pb-3">
        {game === "delta_force" ? (
          <div className="flex items-center gap-3">
            <div className="w-4 h-[2px] bg-teal-500 shrink-0" />
            <h2 className={`text-base font-black text-gray-900 dark:text-white tracking-wider uppercase ${orbitron.className}`}>
              Clanes Activos
            </h2>
          </div>
        ) : (
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className={`w-1.5 h-6 rounded-full ${accentColor.dot}`} />
            Clanes Activos
          </h2>
        )}
        <Link
          href={`/clanes?game=${game}`}
          className={`text-[0.5625rem] font-black uppercase tracking-widest ${accentColor.text} hover:opacity-80 transition-opacity flex items-center gap-0.5`}
        >
          Ver Directorio <ChevronRight size={10} />
        </Link>
      </div>

      {/* Lista de clanes */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={20} className={`animate-spin ${accentColor.text}`} />
        </div>
      ) : clans.length > 0 ? (
        <div className="space-y-2.5">
          {clans.map((clan) => (
            <Link
              key={clan.id}
              href={`/clanes/${clan.tag}`}
              className={`group flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-white/[0.01] border border-gray-100 dark:border-white/[0.04] hover:-translate-y-0.5 hover:bg-gradient-to-r ${accentColor.gradientHover} ${accentColor.borderHover} ${accentColor.shadowHover} transition-all duration-300`}
            >
              {/* Logo */}
              {clan.logo_url ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-white/10 group-hover:scale-105 transition-transform duration-300">
                  <Image src={clan.logo_url} alt={clan.name} width={40} height={40} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accentColor.bg} border ${accentColor.border} group-hover:scale-105 transition-transform duration-300`}>
                  <Shield size={18} className={accentColor.text} />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {clan.name}
                  </p>
                  <span className="text-[0.5625rem] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest shrink-0">
                    [{clan.tag}]
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[0.625rem] text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1">
                    <Users size={11} className="text-gray-400 dark:text-gray-500" /> {clan.members_count ?? 0}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                  <PolicyIcon policy={clan.join_policy} />
                </div>
              </div>

              <ChevronRight size={14} className="text-gray-300 dark:text-gray-700 group-hover:text-gray-500 dark:group-hover:text-gray-300 translate-x-0 group-hover:translate-x-0.5 shrink-0 transition-all duration-300" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
          <Shield size={24} className="mx-auto mb-2 opacity-30 text-gray-400" />
          <p className="text-[0.625rem] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">No hay clanes fundados</p>
        </div>
      )}

    </div>
  );
}
