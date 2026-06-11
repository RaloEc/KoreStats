"use client";

import React, { useEffect, useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeltaForceWeapons, type WeaponItem } from "../extensions/weapon-service";
import { Swords, Activity, Zap, Shield, Eye, HelpCircle } from "lucide-react";

interface WeaponHoverCardProps {
  weaponName: string;
  children: React.ReactNode;
}

const STAT_CONFIG = [
  { key: "base_damage", label: "Daño", icon: Zap, max: 100 },
  { key: "base_fire_rate", label: "Cadencia", icon: Activity, max: 1200 },
  { key: "base_control", label: "Control", icon: Swords, max: 100 },
  { key: "base_stability", label: "Estabilidad", icon: Shield, max: 100 },
  { key: "base_range", label: "Alcance", icon: Eye, max: 100 },
];

export function WeaponHoverCard({ weaponName, children }: WeaponHoverCardProps) {
  const [loading, setLoading] = useState(true);
  const [weapon, setWeapon] = useState<WeaponItem | null>(null);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const list = await getDeltaForceWeapons();
        if (!active) return;
        const found = list.find(
          (w) => w.weapon_name.toLowerCase().trim() === weaponName.toLowerCase().trim()
        );
        setWeapon(found || null);
      } catch (err) {
        console.error("Error loading weapon details for hovercard", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [weaponName]);

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      Assault: "Fusil de Asalto",
      Marksman: "Fusil de Tirador",
      Sniper: "Fusil de Francotirador",
      SMG: "Subfusil",
      LMG: "Ametralladora Ligera",
      Secondary: "Pistola / Secundaria",
      Shotgun: "Escopeta",
      Special: "Arma Especial",
    };
    return labels[cat] || cat;
  };

  return (
    <HoverCard openDelay={200} closeDelay={150}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="w-80 p-0 overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl bg-white dark:bg-[#0c0d0e] rounded-xl"
        side="top"
        align="center"
      >
        {loading ? (
          <div className="p-4 space-y-3 bg-[#0c0d0e]/5 dark:bg-black/40">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800" />
                <Skeleton className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-2 w-full bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="h-2 w-full bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="h-2 w-full bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        ) : weapon ? (
          <div className="flex flex-col relative">
            {/* Header con gradiente militar */}
            <div className="relative h-20 w-full bg-gradient-to-br from-[#1c1d1f] to-[#0d0e10] overflow-hidden flex items-center justify-between px-4 border-b border-zinc-850">
              {/* Overlay sutil de cuadrícula militar */}
              <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px]" />
              
              <div className="z-10 flex flex-col justify-center">
                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-[#0eea8e] mb-0.5">
                  Arma Oficial
                </span>
                <h4 className="text-base font-black uppercase text-white tracking-tight truncate max-w-[180px]">
                  {weapon.weapon_name}
                </h4>
                <span className="text-[0.625rem] text-zinc-400 font-semibold mt-0.5">
                  Calibre {weapon.caliber || "N/A"}
                </span>
              </div>
              
              <div className="z-10">
                <span className="text-[0.5625rem] font-black uppercase tracking-wider px-2 py-1 rounded border border-zinc-700 bg-zinc-900/80 text-zinc-300">
                  {getCategoryLabel(weapon.category)}
                </span>
              </div>
            </div>

            {/* Contenedor central (Imagen y Estadísticas) */}
            <div className="p-4 bg-zinc-50/50 dark:bg-[#090a0b]/40">
              {/* Imagen del Arma */}
              {weapon.image_url ? (
                <div className="relative w-full h-24 mb-4 flex items-center justify-center bg-zinc-100 dark:bg-black/30 rounded-lg p-2 border border-zinc-200/50 dark:border-zinc-850">
                  <img
                    src={weapon.image_url}
                    alt={weapon.weapon_name}
                    className="max-h-full max-w-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]"
                  />
                </div>
              ) : (
                <div className="w-full h-12 mb-3 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200/50 dark:border-zinc-850">
                  <Swords className="w-6 h-6 text-zinc-400" />
                </div>
              )}

              {/* Estadísticas */}
              <div className="space-y-2.5">
                {STAT_CONFIG.map((stat) => {
                  const rawVal = (weapon as any)[stat.key];
                  const numericVal = typeof rawVal === "string" ? parseInt(rawVal, 10) : Number(rawVal);
                  const safeVal = isNaN(numericVal) ? 0 : numericVal;
                  const pct = Math.min((safeVal / stat.max) * 100, 100);
                  const Icon = stat.icon;

                  return (
                    <div key={stat.key} className="space-y-1">
                      <div className="flex justify-between items-center text-[0.625rem]">
                        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                          <Icon size={12} className="opacity-80 text-[#0eea8e]" />
                          <span className="font-bold uppercase tracking-tight">{stat.label}</span>
                        </div>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {safeVal}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#03ba6d] to-[#0eea8e] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-zinc-500 dark:text-zinc-400 flex flex-col items-center justify-center space-y-2 bg-[#0c0d0e]/5 dark:bg-black/20">
            <HelpCircle className="w-6 h-6 text-zinc-400" />
            <p className="font-bold">Arma no encontrada</p>
            <p className="text-[0.625rem] text-zinc-400">No se pudieron recuperar las estadísticas oficiales del arma "{weaponName}".</p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
