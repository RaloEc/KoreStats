"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { clanService } from "@/lib/clanes/clanService";
import type { Clan, ClanGame, JoinPolicy } from "@/types/clanes";
import ClanCard from "@/components/clanes/ClanCard";
import {
  Shield, Search, Plus, Loader2, SlidersHorizontal, X,
  Users, ChevronRight
} from "lucide-react";

type GameFilter = ClanGame | "all";

export default function ClanesPageClient() {
  const { user } = useAuth();
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [policyFilter, setPolicyFilter] = useState<JoinPolicy | "all">("all");

  useEffect(() => {
    const fetchClans = async () => {
      setLoading(true);
      try {
        const result = await clanService.getClanes({
          game: gameFilter !== "all" ? gameFilter : undefined,
          searchQuery: searchQuery || undefined,
        });
        let filtered = result;
        if (policyFilter !== "all") {
          filtered = result.filter((c) => c.join_policy === policyFilter);
        }
        setClans(filtered);
      } catch (e) {
        console.error("Error cargando clanes:", e);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchClans, 300);
    return () => clearTimeout(debounce);
  }, [gameFilter, searchQuery, policyFilter]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100">
      <main className="container mx-auto px-4 py-10 max-w-7xl">

        {/* ── Header ── */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-[0.625rem] font-black uppercase tracking-[0.4em] text-blue-500 mb-2">
              Comunidades
            </p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900 dark:text-white leading-none">
              Directorio de Clanes
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 leading-relaxed">
              Encuentra tu equipo ideal para League of Legends y Delta Force.
            </p>
          </div>

          {/* Botón crear — solo si está logueado */}
          {user ? (
            <Link
              href="/clanes/crear"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 shrink-0"
            >
              <Plus size={16} />
              Crear Clan
            </Link>
          ) : (
            <div className="text-center md:text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                ¿Quieres crear tu propio clan?
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-500 font-bold text-sm transition-all"
              >
                Iniciar Sesión
                <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* ── Búsqueda y filtros ── */}
        <div className="mb-8 flex flex-col sm:flex-row gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar clanes por nombre..."
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro juego */}
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value as GameFilter)}
            className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors text-sm font-medium"
          >
            <option value="all">Todos los juegos</option>
            <option value="league_of_legends">League of Legends</option>
            <option value="delta_force">Delta Force</option>
          </select>

          {/* Filtro política */}
          <select
            value={policyFilter}
            onChange={(e) => setPolicyFilter(e.target.value as JoinPolicy | "all")}
            className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors text-sm font-medium"
          >
            <option value="all">Cualquier tipo de ingreso</option>
            <option value="open">Abiertos</option>
            <option value="apply">Por Solicitud</option>
            <option value="invite_only">Solo Invitación</option>
          </select>
        </div>

        {/* ── Contenido ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={36} className="animate-spin text-blue-500" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Cargando clanes...</p>
          </div>
        ) : clans.length > 0 ? (
          <>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">
              {clans.length} clan{clans.length !== 1 ? "es" : ""} encontrado{clans.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {clans.map((clan) => (
                <ClanCard key={clan.id} clan={clan} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center mb-5">
              <Shield size={32} className="text-gray-300 dark:text-gray-700" />
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">
              {searchQuery || gameFilter !== "all" || policyFilter !== "all"
                ? "No hay clanes con esos filtros"
                : "Aún no hay clanes registrados"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm">
              {searchQuery || gameFilter !== "all" || policyFilter !== "all"
                ? "Intenta con otros filtros o una búsqueda diferente."
                : "¡Sé el primero en fundar una comunidad en KoreStats!"}
            </p>
            {user ? (
              <Link
                href="/clanes/crear"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <Plus size={16} />
                Crear Primer Clan
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-bold text-sm transition-all"
              >
                Inicia sesión para crear un clan
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
