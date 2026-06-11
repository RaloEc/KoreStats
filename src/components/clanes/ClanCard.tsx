"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Shield, Users, Lock, Unlock, GitMerge, Trophy } from "lucide-react";
import type { Clan, ClanGame, JoinPolicy } from "@/types/clanes";

interface ClanCardProps {
  clan: Clan;
}

const GAME_CONFIG: Record<ClanGame, { label: string; color: string; bg: string; border: string }> = {
  league_of_legends: {
    label: "League of Legends",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  delta_force: {
    label: "Delta Force",
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
  },
};

const JOIN_POLICY_CONFIG: Record<JoinPolicy, { label: string; icon: React.ElementType; color: string }> = {
  open: { label: "Abierto", icon: Unlock, color: "text-emerald-400" },
  apply: { label: "Por Solicitud", icon: GitMerge, color: "text-blue-400" },
  invite_only: { label: "Solo Invitación", icon: Lock, color: "text-rose-400" },
};

export default function ClanCard({ clan }: ClanCardProps) {
  const gameConfig = GAME_CONFIG[clan.game];
  const policyConfig = JOIN_POLICY_CONFIG[clan.join_policy];
  const PolicyIcon = policyConfig.icon;

  return (
    <Link href={`/clanes/${clan.tag}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-white/[0.07] hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5 h-full flex flex-col">
        {/* Glow accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-500/[0.03] group-hover:to-blue-500/[0.07] transition-all duration-300 pointer-events-none rounded-2xl" />

        {/* Header con logo */}
        <div className="relative p-5 flex items-start gap-4">
          {/* Logo / Avatar del clan */}
          <div className="relative shrink-0">
            {clan.logo_url ? (
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-md">
                <Image
                  src={clan.logo_url}
                  alt={`Logo de ${clan.name}`}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${gameConfig.bg} ${gameConfig.border} shadow-sm`}>
                <Shield size={24} className={gameConfig.color} />
              </div>
            )}
          </div>

          {/* Nombre y tag */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-gray-900 dark:text-white text-base leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {clan.name}
              </h3>
              <span className="shrink-0 text-[0.625rem] font-black text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                #{clan.tag}
              </span>
            </div>

            {/* Juego badge */}
            <span className={`inline-flex items-center mt-1.5 text-[0.625rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg ${gameConfig.bg} ${gameConfig.color} border ${gameConfig.border}`}>
              {gameConfig.label}
            </span>
          </div>

          {/* Exclusividad badge */}
          {clan.require_exclusive && (
            <div title="Clan Exclusivo — no puedes estar en otros clanes" className="shrink-0">
              <div className="flex items-center gap-1 text-[0.5625rem] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                <Trophy size={9} />
                Exclusivo
              </div>
            </div>
          )}
        </div>

        {/* Descripción */}
        {clan.description && (
          <p className="px-5 pb-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {clan.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto px-5 py-3 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between gap-3">
          {/* Miembros */}
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <Users size={13} />
            <span className="text-[0.6875rem] font-bold">
              {clan.members_count ?? 0} miembro{(clan.members_count ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Política de ingreso */}
          <div className={`flex items-center gap-1 text-[0.625rem] font-bold ${policyConfig.color}`}>
            <PolicyIcon size={11} />
            <span>{policyConfig.label}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
