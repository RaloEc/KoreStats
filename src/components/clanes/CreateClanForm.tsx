"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { clanService } from "@/lib/clanes/clanService";
import type { JoinPolicy } from "@/types/clanes";
import type { GameInfo } from "@/modules/types";
import {
  Shield, ChevronDown, Loader2, CheckCircle, XCircle,
  Link2, Trophy, AlertTriangle
} from "lucide-react";

interface CreateClanFormProps {
  defaultGame?: string;
  games: GameInfo[];
}

const JOIN_POLICY_OPTIONS: { value: JoinPolicy; label: string; description: string }[] = [
  { value: "open", label: "Abierto", description: "Cualquiera que cumpla los requisitos puede unirse directamente." },
  { value: "apply", label: "Por Solicitud", description: "Los interesados envían una solicitud que tú apruebas." },
  { value: "invite_only", label: "Solo por Invitación", description: "Únicamente puedes invitar tú a los miembros." },
];

const PREDEFINED_TAGS = [
  "Micrófono Obligatorio", 
  "Solo +18", 
  "Tóxicos abstenerse", 
  "Actividad diaria", 
  "Competitivo", 
  "Casual",
  "Tryhard"
];

const mapSlugToGameValue = (slug: string) => {
  return slug.replace(/-/g, "_");
};

export default function CreateClanForm({ defaultGame, games }: CreateClanFormProps) {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    tag: "",
    description: "",
    game: defaultGame ?? (games[0]?.slug ? mapSlugToGameValue(games[0].slug) : "delta_force"),
    discord_url: "",
    join_policy: "open" as JoinPolicy,
    require_exclusive: false,
    min_rank: "",
    min_kda: "",
    tags: [] as string[],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ownsClan, setOwnsClan] = useState<boolean | null>(null);
  const [checkingLimit, setCheckingLimit] = useState(true);

  useEffect(() => {
    const checkLimit = async () => {
      if (!user) return;
      try {
        const hasClan = await clanService.hasCreatedClan(user.id);
        setOwnsClan(hasClan);
      } catch (err) {
        console.error("Error al verificar limite de clanes:", err);
      } finally {
        setCheckingLimit(false);
      }
    };
    checkLimit();
  }, [user]);

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">
          Inicia sesión para crear un clan
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Necesitas una cuenta en KoreStats para fundar tu propio clan.
        </p>
      </div>
    );
  }

  if (checkingLimit) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={36} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (ownsClan) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-500 mb-4">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
          Límite de Clanes Alcanzado
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
          Actualmente solo se permite crear **1 clan por usuario**. Ya eres fundador de un clan activo. Si deseas crear uno nuevo, primero debes eliminar o transferir la propiedad de tu clan actual.
        </p>
        <button
          onClick={() => router.push('/clanes')}
          className="px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-95"
        >
          Volver al Directorio
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const requirements: Record<string, any> = {};
      if (formData.min_rank) requirements.min_rank = formData.min_rank;
      if (formData.min_kda) requirements.min_kda = parseFloat(formData.min_kda);
      if (formData.tags.length > 0) requirements.tags = formData.tags;

      const newClan = await clanService.createClan({
        name: formData.name.trim(),
        tag: formData.tag.trim().toUpperCase(),
        description: formData.description.trim(),
        game: formData.game as any,
        discord_url: formData.discord_url.trim() || undefined,
        join_policy: formData.join_policy,
        require_exclusive: formData.require_exclusive,
        requirements,
        owner_id: user.id,
      });

      router.refresh();
      router.push(`/clanes/${newClan.tag}`);
    } catch (err: any) {
      const msg = err?.message || "Error desconocido al crear el clan.";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        setError("El nombre o el tag del clan ya está en uso. Elige otro.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Removido render de success intermedio para ir directo a la página del clan

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Info básica */}
      <section className="space-y-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
          <div className="w-4 h-[2px] bg-blue-500" /> Información Básica
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Nombre */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
              Nombre del Clan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Los Guardianes del Nexus"
              maxLength={50}
              required
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors text-sm font-medium"
            />
          </div>

          {/* Tag */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
              Tag (máx. 5) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tag}
              onChange={(e) => setFormData({ ...formData, tag: e.target.value.toUpperCase() })}
              placeholder="GDN"
              maxLength={5}
              required
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors text-sm font-black uppercase tracking-widest"
            />
          </div>
        </div>

        <div className="space-y-1.5 relative">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
            Descripción
          </label>
          <div className="relative">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Cuéntanos de qué trata tu clan, tu estilo de juego, objetivos..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors text-sm resize-none pb-8"
            />
            <div className={`absolute bottom-3 right-4 text-xs font-medium ${
              formData.description.length >= 500 ? 'text-rose-500' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {formData.description.length}/500
            </div>
          </div>
        </div>
      </section>

      {/* Juego */}
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
          <div className="w-4 h-[2px] bg-amber-500" /> Juego
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {games.map((game) => {
            const gameValue = mapSlugToGameValue(game.slug);
            return (
              <button
                key={game.slug}
                type="button"
                onClick={() => setFormData({ ...formData, game: gameValue, min_rank: "", min_kda: "" })}
                className={`relative flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  formData.game === gameValue
                    ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                    : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                }`}
              >
                {game.icono_url ? (
                  <img src={game.icono_url} alt={game.nombre} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <span className="text-2xl">🎮</span>
                )}
                <span className={`font-bold text-sm ${formData.game === gameValue ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                  {game.nombre}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Política de ingreso */}
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
          <div className="w-4 h-[2px] bg-emerald-500" /> Política de Ingreso
        </h2>
        <div className="space-y-2">
          {JOIN_POLICY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFormData({ ...formData, join_policy: opt.value })}
              className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                formData.join_policy === opt.value
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                formData.join_policy === opt.value
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}>
                {formData.join_policy === opt.value && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-gray-900 dark:text-white">{opt.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Requisitos dinámicos por juego */}
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
          <div className="w-4 h-[2px] bg-purple-500" /> Requisitos
        </h2>

        {/* Etiquetas / Requisitos Predefinidos */}
        <div className="space-y-2 mb-6">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
            Etiquetas y Reglas del Clan
          </label>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_TAGS.map((tag) => {
              const isSelected = formData.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      tags: isSelected
                        ? prev.tags.filter((t) => t !== tag)
                        : [...prev.tags, tag],
                    }));
                  }}
                  className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-colors border ${
                    isSelected
                      ? "bg-purple-500 text-white border-purple-500"
                      : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {formData.game === "league_of_legends" && (
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
              Rango Mínimo
            </label>
            <div className="relative">
              <select
                value={formData.min_rank}
                onChange={(e) => setFormData({ ...formData, min_rank: e.target.value })}
                className="w-full appearance-none px-4 py-3 pr-10 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors text-sm"
              >
                <option value="">Sin requisito de rango</option>
                <option value="IRON">Hierro</option>
                <option value="BRONZE">Bronce</option>
                <option value="SILVER">Plata</option>
                <option value="GOLD">Oro</option>
                <option value="PLATINUM">Platino</option>
                <option value="EMERALD">Esmeralda</option>
                <option value="DIAMOND">Diamante</option>
                <option value="MASTER">Maestro</option>
                <option value="GRANDMASTER">Gran Maestro</option>
                <option value="CHALLENGER">Retador</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {formData.game === "delta_force" && (
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
              KDA Mínimo en Normales
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="50"
              value={formData.min_kda}
              onChange={(e) => setFormData({ ...formData, min_kda: e.target.value })}
              placeholder="Ej: 1.5 (dejar vacío para sin requisito)"
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors text-sm"
            />
          </div>
        )}
      </section>

      {/* Opciones extra */}
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
          <div className="w-4 h-[2px] bg-rose-500" /> Opciones Avanzadas
        </h2>

        {/* Discord URL */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Link2 size={13} /> URL de Discord (Invitación)
          </label>
          <input
            type="url"
            value={formData.discord_url}
            onChange={(e) => setFormData({ ...formData, discord_url: e.target.value })}
            placeholder="https://discord.gg/tuservidor"
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors text-sm"
          />
        </div>

        {/* Exclusividad */}
        <button
          type="button"
          onClick={() => setFormData({ ...formData, require_exclusive: !formData.require_exclusive })}
          className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
            formData.require_exclusive
              ? "border-amber-500 bg-amber-500/5"
              : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
          }`}
        >
          <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${
            formData.require_exclusive
              ? "border-amber-500 bg-amber-500"
              : "border-gray-300 dark:border-gray-600"
          }`}>
            {formData.require_exclusive && <CheckCircle size={10} className="text-white" strokeWidth={3} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Trophy size={13} className="text-amber-500" />
              <span className="font-bold text-sm text-gray-900 dark:text-white">Exclusividad Estricta</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Los miembros de este clan no podrán pertenecer a otros clanes al mismo tiempo.
            </p>
          </div>
        </button>
      </section>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <XCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !formData.name || !formData.tag}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-[0.98]"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Creando clan...
          </>
        ) : (
          <>
            <Shield size={18} />
            Fundar Clan
          </>
        )}
      </button>
    </form>
  );
}
