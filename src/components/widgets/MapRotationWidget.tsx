"use client";

import React, { useState, useEffect } from "react";
import {
  Map,
  Clock,
  ChevronDown,
  ChevronUp,
  // ShieldAlert, Flame — usados en el selector de evento (oculto temporalmente, Season 10)
  AlertCircle,
  Infinity,
  RotateCcw,
  Calendar,
} from "lucide-react";



// ─── Tipos ──────────────────────────────────────────────────────────────────

interface MapRotationBlock {
  time: string; // "0~2", "2~4", etc. en UTC
  map1: string;
  difficulty1: string;
  map2: string;
  difficulty2: string;
  map3: string;
  difficulty3: string;
}

interface MapMeta {
  label: string;        // Nombre en español
  accent: string;       // Color tailwind (texto)
  accentBg: string;     // Fondo badge
  accentBorder: string; // Borde badge
  dot: string;          // Color del punto de estado
  imagePath: string;
  fallback: string;     // gradiente fallback
}

// ─── Metadatos visuales ─────────────────────────────────────────────────────

const MAP_META: Record<string, MapMeta> = {
  "Zero Dam": {
    label: "Represa Zero",
    accent: "text-teal-400",
    accentBg: "bg-teal-500/10",
    accentBorder: "border-teal-500/20",
    dot: "bg-teal-400",
    imagePath: "/images/widgets/zero_dam.jpg",
    fallback: "from-teal-950 to-neutral-950",
  },
  "Layali Grove": {
    label: "Bosque Layali",
    accent: "text-green-400",
    accentBg: "bg-green-500/10",
    accentBorder: "border-green-500/20",
    dot: "bg-green-400",
    imagePath: "/images/widgets/layali_grove.jpg",
    fallback: "from-green-950 to-neutral-950",
  },
  "Brakkesh": {
    label: "Brakkesh",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/20",
    dot: "bg-amber-400",
    imagePath: "/images/widgets/brakkesh.jpg",
    fallback: "from-amber-950 to-neutral-950",
  },
  "Tide Prison": {
    label: "Tide Prison",
    accent: "text-cyan-400",
    accentBg: "bg-cyan-500/10",
    accentBorder: "border-cyan-500/20",
    dot: "bg-cyan-400",
    imagePath: "/images/widgets/tide_prison.jpg",
    fallback: "from-cyan-950 to-neutral-950",
  },
  "Space City": {
    label: "Space City",
    accent: "text-indigo-400",
    accentBg: "bg-indigo-500/10",
    accentBorder: "border-indigo-500/20",
    dot: "bg-indigo-400",
    imagePath: "/images/widgets/space_city.jpg",
    fallback: "from-indigo-950 to-neutral-950",
  },
};

// ─── Mapas PERMANENTES por modo ──────────────────────────────────────────────

// Operations: Zero Dam Easy+Normal 24h, Layali Grove Easy 24h
const OPERATIONS_PERMANENT = [
  { name: "Zero Dam",     difficulty: "Easy",   label: "Fácil" },
  { name: "Zero Dam",     difficulty: "Normal",  label: "Normal" },
  { name: "Layali Grove", difficulty: "Easy",   label: "Fácil" },
];

// Fiery Owl: Sin permanentes, todos rotan
const FIERY_PERMANENT: typeof OPERATIONS_PERMANENT = [];

// ─── Bloques de Rotación UTC ─────────────────────────────────────────────────

// Operations Season 10: bloques pares → Tide Prison Hard + Space City Normal
//                       bloques impares → Space City Hard + Brakkesh Normal
const OPERATIONS_BLOCKS_UTC: MapRotationBlock[] = [
  { time: "0~2",   map1: "Tide Prison", difficulty1: "Hard",   map2: "Space City", difficulty2: "Normal", map3: "", difficulty3: "" },
  { time: "2~4",   map1: "Space City",  difficulty1: "Hard",   map2: "Brakkesh",   difficulty2: "Normal", map3: "", difficulty3: "" },
  { time: "4~6",   map1: "Tide Prison", difficulty1: "Hard",   map2: "Space City", difficulty2: "Normal", map3: "", difficulty3: "" },
  { time: "6~8",   map1: "Space City",  difficulty1: "Hard",   map2: "Brakkesh",   difficulty2: "Normal", map3: "", difficulty3: "" },
  { time: "8~10",  map1: "Tide Prison", difficulty1: "Hard",   map2: "Space City", difficulty2: "Normal", map3: "", difficulty3: "" },
  { time: "10~12", map1: "Space City",  difficulty1: "Hard",   map2: "Brakkesh",   difficulty2: "Normal", map3: "", difficulty3: "" },
  { time: "12~14", map1: "Tide Prison", difficulty1: "Hard",   map2: "Space City", difficulty2: "Normal", map3: "", difficulty3: "" },
  { time: "14~16", map1: "Space City",  difficulty1: "Hard",   map2: "Brakkesh",   difficulty2: "Normal", map3: "", difficulty3: "" },
  { time: "16~18", map1: "Tide Prison", difficulty1: "Hard",   map2: "Space City", difficulty2: "Normal", map3: "", difficulty3: "" },
  { time: "18~20", map1: "Space City",  difficulty1: "Hard",   map2: "Brakkesh",   difficulty2: "Normal", map3: "", difficulty3: "" },
  { time: "20~22", map1: "Tide Prison", difficulty1: "Hard",   map2: "Space City", difficulty2: "Normal", map3: "", difficulty3: "" },
  { time: "22~24", map1: "Space City",  difficulty1: "Hard",   map2: "Brakkesh",   difficulty2: "Normal", map3: "", difficulty3: "" },
];

// Fiery Owl Hunt: Brakkesh Normal + Zero Dam Normal + (Space City Normal O Space City Hard)
const FIERY_OWL_BLOCKS_UTC: MapRotationBlock[] = [
  { time: "0~2",   map1: "Brakkesh", difficulty1: "Normal", map2: "Zero Dam", difficulty2: "Normal", map3: "Space City", difficulty3: "Normal" },
  { time: "2~4",   map1: "Space City", difficulty1: "Hard", map2: "Zero Dam", difficulty2: "Normal", map3: "",           difficulty3: ""       },
  { time: "4~6",   map1: "Brakkesh", difficulty1: "Normal", map2: "Zero Dam", difficulty2: "Normal", map3: "Space City", difficulty3: "Normal" },
  { time: "6~8",   map1: "Space City", difficulty1: "Hard", map2: "Zero Dam", difficulty2: "Normal", map3: "",           difficulty3: ""       },
  { time: "8~10",  map1: "Brakkesh", difficulty1: "Normal", map2: "Zero Dam", difficulty2: "Normal", map3: "Space City", difficulty3: "Normal" },
  { time: "10~12", map1: "Space City", difficulty1: "Hard", map2: "Zero Dam", difficulty2: "Normal", map3: "",           difficulty3: ""       },
  { time: "12~14", map1: "Brakkesh", difficulty1: "Normal", map2: "Zero Dam", difficulty2: "Normal", map3: "Space City", difficulty3: "Normal" },
  { time: "14~16", map1: "Space City", difficulty1: "Hard", map2: "Zero Dam", difficulty2: "Normal", map3: "",           difficulty3: ""       },
  { time: "16~18", map1: "Brakkesh", difficulty1: "Normal", map2: "Zero Dam", difficulty2: "Normal", map3: "Space City", difficulty3: "Normal" },
  { time: "18~20", map1: "Space City", difficulty1: "Hard", map2: "Zero Dam", difficulty2: "Normal", map3: "",           difficulty3: ""       },
  { time: "20~22", map1: "Brakkesh", difficulty1: "Normal", map2: "Zero Dam", difficulty2: "Normal", map3: "Space City", difficulty3: "Normal" },
  { time: "22~24", map1: "Space City", difficulty1: "Hard", map2: "Zero Dam", difficulty2: "Normal", map3: "",           difficulty3: ""       },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDifficultyStyle(diff: string) {
  const d = diff.toLowerCase();
  if (d === "hard")   return { text: "text-red-400",    bg: "bg-red-500/15",    border: "border-red-500/25",    label: "Hard" };
  if (d === "normal") return { text: "text-sky-400",    bg: "bg-sky-500/15",    border: "border-sky-500/25",    label: "Normal" };
  if (d === "easy")   return { text: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/25", label: "Fácil" };
  return { text: "text-neutral-400", bg: "bg-neutral-500/15", border: "border-neutral-500/25", label: diff };
}

// Season 10: todos los mapas en rotación están disponibles durante su bloque, sin restricciones horarias adicionales.
function getMapStatus(_mapName: string, _difficulty: string, _timezoneOffset: number): { isOpen: boolean; opensAt?: string } {
  return { isOpen: true, opensAt: "" };
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function MapRotationWidget() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeMode, setActiveMode] = useState<"operations" | "fieryOwlHunt">("operations");
  const [timezoneName, setTimezoneName] = useState("UTC");
  const [timezoneOffset, setTimezoneOffset] = useState(0);
  const [countdown, setCountdown] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezoneName(zone || "UTC");
      setTimezoneOffset(-new Date().getTimezoneOffset() / 60);
    } catch {/* silencioso */}
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const update = () => {
      const now = new Date();
      const utcH = now.getUTCHours();
      const nextUtcH = utcH % 2 === 0 ? utcH + 2 : utcH + 1;
      const target = new Date(now);
      target.setUTCHours(nextUtcH, 0, 0, 0);
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { setCountdown("—"); return; }
      const totalMin = Math.floor(diff / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      setCountdown(h > 0 ? `${h}h ${m}m` : `${m > 0 ? m : 1}m`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [isMounted]);

  const handleImgError = (key: string) =>
    setImgErrors(p => ({ ...p, [key]: true }));

  if (!isMounted) return null;

  // Bloques y permanentes según modo
  const blocksUTC   = activeMode === "operations" ? OPERATIONS_BLOCKS_UTC   : FIERY_OWL_BLOCKS_UTC;
  const permanentMaps = activeMode === "operations" ? OPERATIONS_PERMANENT : FIERY_PERMANENT;

  // Convertir bloques a hora local
  const localBlocks = blocksUTC.map(block => {
    const utcStart = Number(block.time.split("~")[0]);
    const localStart = (utcStart + timezoneOffset + 24) % 24;
    const localEnd   = (localStart + 2) % 24;
    return {
      ...block,
      localStart,
      localEnd,
      localRange: `${String(localStart).padStart(2, "0")}:00 – ${String(localEnd).padStart(2, "0")}:00`,
    };
  });

  // Bloque activo
  const nowH = new Date().getHours();
  const activeIdx = (() => {
    const i = localBlocks.findIndex(b => {
      const { localStart: s, localEnd: e } = b;
      return s < e ? nowH >= s && nowH < e : nowH >= s || nowH < e;
    });
    return i !== -1 ? i : 0;
  })();

  const current  = localBlocks[activeIdx];
  const nextIdx  = (activeIdx + 1) % 12;
  const upcoming = localBlocks[nextIdx];

  // Mapas en rotación del bloque activo
  const currentRotating = [
    { name: current.map1, difficulty: current.difficulty1 },
    { name: current.map2, difficulty: current.difficulty2 },
    { name: current.map3, difficulty: current.difficulty3 },
  ].filter(m => m.name !== "");

  const upcomingRotating = [
    { name: upcoming.map1, difficulty: upcoming.difficulty1 },
    { name: upcoming.map2, difficulty: upcoming.difficulty2 },
    { name: upcoming.map3, difficulty: upcoming.difficulty3 },
  ].filter(m => m.name !== "");

  const tzLabel = timezoneName.split("/").pop()?.replace(/_/g, " ") ?? "UTC";
  const tzSuffix = `UTC${timezoneOffset >= 0 ? `+${timezoneOffset}` : timezoneOffset}`;

  return (
    <div className="w-full rounded-2xl bg-card border border-border/70 shadow-xl overflow-hidden">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-border/50 flex flex-col gap-2.5">

        {/* Título + countdown */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
              <Map className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-foreground flex items-center gap-1.5">
                Rotación de Mapas
                <span className="text-[0.5rem] font-mono bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                  LIVE
                </span>
              </h2>
              <p className="text-[0.625rem] text-muted-foreground leading-none mt-0.5">
                {tzLabel} ({tzSuffix})
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-1 text-[0.625rem] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
            <Clock className="w-3 h-3" />
            <span>{countdown || "—"}</span>
          </div>
        </div>

        {/* Selector de modo — Evento Búho oculto temporalmente (Season 10: sin evento activo) */}
        {/* TODO: Descomentar cuando haya un nuevo evento de rotación disponible */}
        {/*
        <div className="flex bg-muted/50 p-0.5 rounded-lg border border-border/40 text-[0.625rem]">
          <button
            onClick={() => setActiveMode("operations")}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md font-bold uppercase tracking-wide transition-all duration-200 ${
              activeMode === "operations"
                ? "bg-card text-foreground shadow border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-primary" />
            Operaciones
          </button>
          <button
            onClick={() => setActiveMode("fieryOwlHunt")}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md font-bold uppercase tracking-wide transition-all duration-200 ${
              activeMode === "fieryOwlHunt"
                ? "bg-card text-foreground shadow border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="w-3 h-3 text-orange-400" />
            Evento Búho
          </button>
        </div>
        */}
      </div>

      {/* ── CUERPO ─────────────────────────────────────────────────── */}
      <div className="p-4 space-y-4">

        {/* ── MAPAS PERMANENTES (solo modo Operations) ─────────────── */}
        {permanentMaps.length > 0 && (
          <div>
            {/* Etiqueta de sección */}
            <div className="flex items-center gap-1.5 mb-2">
              <Infinity className="w-3 h-3 text-muted-foreground" />
              <span className="text-[0.5625rem] font-bold uppercase tracking-widest text-muted-foreground">
                Disponibles 24h
              </span>
            </div>

            {/* Grilla minimalista: agrupa por mapa */}
            {(() => {
              // Agrupar dificultades por mapa
              const byMap: Record<string, string[]> = {};
              for (const pm of permanentMaps) {
                if (!byMap[pm.name]) byMap[pm.name] = [];
                byMap[pm.name].push(pm.difficulty);
              }
              return (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(byMap).map(([mapName, diffs]) => {
                    const meta = MAP_META[mapName];
                    return (
                      <div
                        key={mapName}
                        className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors px-3 py-1.5"
                      >
                        {/* Dot de color */}
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta?.dot ?? "bg-neutral-400"}`} />
                        {/* Nombre */}
                        <span className="text-[0.6875rem] font-semibold text-foreground/80">
                          {meta?.label ?? mapName}
                        </span>
                        {/* Dificultades */}
                        <div className="flex gap-1">
                          {diffs.map(d => {
                            const ds = getDifficultyStyle(d);
                            return (
                              <span
                                key={d}
                                className={`text-[0.5rem] font-bold uppercase px-1.5 py-0.5 rounded border ${ds.bg} ${ds.text} ${ds.border}`}
                              >
                                {ds.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Divisor si hay permanentes */}
        {permanentMaps.length > 0 && (
          <div className="border-t border-border/40" />
        )}

        {/* ── ROTACIÓN ACTIVA ───────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <RotateCcw className="w-3 h-3 text-primary" />
              <span className="text-[0.5625rem] font-bold uppercase tracking-widest text-muted-foreground">
                En rotación ahora
              </span>
            </div>
            <span className="text-[0.5625rem] font-mono text-muted-foreground/70">
              {current.localRange}
            </span>
          </div>

          <div className="space-y-2">
            {currentRotating.map((map, idx) => {
              const meta = MAP_META[map.name];
              const ds   = getDifficultyStyle(map.difficulty);
              const imgKey = `${map.name}-${map.difficulty}`;
              const hasImg = !imgErrors[map.name] && !!meta?.imagePath;
              const status = getMapStatus(map.name, map.difficulty, timezoneOffset);

              return (
                <div
                  key={`rot-${idx}`}
                  className={`relative flex items-center justify-between rounded-xl overflow-hidden border border-white/5 min-h-[54px] px-3 transition-all duration-200 hover:border-white/10 group ${
                    !status.isOpen ? "opacity-60 saturate-50" : ""
                  }`}
                >
                  {/* Fondo imagen */}
                  {hasImg && (
                    <>
                      <img
                        src={meta.imagePath}
                        alt={map.name}
                        onError={() => handleImgError(map.name)}
                        className="absolute inset-0 w-full h-full object-cover brightness-[0.22] saturate-75 -z-10 transition-all duration-300 group-hover:brightness-[0.28]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent -z-10" />
                    </>
                  )}
                  {/* Fallback degradado */}
                  {!hasImg && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${meta?.fallback ?? "from-neutral-900 to-neutral-950"} opacity-60 -z-10`} />
                  )}

                  {/* Info */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta?.dot ?? "bg-neutral-400"} ring-1 ring-white/10`} />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate leading-tight">
                        {meta?.label ?? map.name}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {/* Estado */}
                    {status.isOpen ? (
                      <span className="text-[0.5rem] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        Abierto
                      </span>
                    ) : (
                      <span className="text-[0.5rem] font-bold text-amber-400 flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        <span className="w-1 h-1 rounded-full bg-amber-400" />
                        Abre {status.opensAt}
                      </span>
                    )}
                    {/* Dificultad */}
                    <span className={`text-[0.5rem] font-black uppercase px-1.5 py-0.5 rounded border ${ds.bg} ${ds.text} ${ds.border}`}>
                      {ds.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PRÓXIMA ROTACIÓN ─────────────────────────────────────── */}
        <div className="rounded-xl border border-border/50 bg-muted/15 px-3 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[0.5625rem] font-bold uppercase tracking-widest text-muted-foreground">
              <Calendar className="w-3 h-3 text-primary/70" />
              Siguiente bloque
            </div>
            <div className="flex items-center gap-1 text-[0.5625rem] font-bold text-amber-400">
              <Clock className="w-3 h-3" />
              <span>en {countdown}</span>
              <span className="text-muted-foreground font-normal ml-1">({upcoming.localRange})</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {upcomingRotating.map((map, idx) => {
              const meta = MAP_META[map.name];
              const ds   = getDifficultyStyle(map.difficulty);
              return (
                <div
                  key={`up-${idx}`}
                  className="flex items-center gap-1 rounded border border-border/40 bg-card/50 px-2 py-0.5 text-[0.5625rem] font-semibold text-foreground/70"
                >
                  <span className={`w-1 h-1 rounded-full ${meta?.dot ?? "bg-neutral-400"}`} />
                  {meta?.label ?? map.name}
                  <span className={`text-[0.5rem] ${ds.text}`}>({ds.label[0]})</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── HORARIO COMPLETO (acordeón) ──────────────────────────── */}
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Horario completo (24h)
            </div>
            {showSchedule
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            }
          </button>

          {showSchedule && (
            <div className="border-t border-border/30 bg-muted/10 divide-y divide-border/20 max-h-[220px] overflow-y-auto">
              {/* Cabecera */}
              <div className="grid grid-cols-12 text-[0.5rem] font-bold uppercase text-muted-foreground/60 tracking-wider px-3 py-1.5">
                <div className="col-span-3">Hora</div>
                <div className="col-span-9">Mapas en rotación</div>
              </div>
              {localBlocks.map((block, idx) => {
                const isActive   = idx === activeIdx;
                const isUpcoming = idx === nextIdx;
                const maps = [
                  { n: block.map1, d: block.difficulty1 },
                  { n: block.map2, d: block.difficulty2 },
                  { n: block.map3, d: block.difficulty3 },
                ].filter(m => m.n !== "");

                return (
                  <div
                    key={`sch-${idx}`}
                    className={`grid grid-cols-12 items-center px-3 py-2 text-[0.5625rem] transition-colors ${
                      isActive
                        ? "bg-primary/8 border-l-2 border-primary font-bold text-foreground"
                        : isUpcoming
                        ? "bg-primary/4 text-foreground/80"
                        : "text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <div className="col-span-3 font-mono text-[0.5rem]">
                      {block.localRange.split(" – ")[0]}
                      {isActive && <span className="ml-1 text-emerald-400 text-[0.4375rem]">●</span>}
                    </div>
                    <div className="col-span-9 flex flex-wrap gap-1">
                      {maps.map((m, mi) => {
                        const meta = MAP_META[m.n];
                        const ds   = getDifficultyStyle(m.d);
                        return (
                          <span key={mi} className="flex items-center gap-0.5">
                            <span className={`font-semibold ${isActive ? "text-foreground" : ""}`}>
                              {meta?.label ?? m.n}
                            </span>
                            <span className={`${ds.text} text-[0.4375rem]`}>({ds.label[0]})</span>
                            {mi < maps.length - 1 && <span className="text-border mx-0.5">·</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-border/30 bg-muted/10 flex items-center justify-between text-[0.5625rem] text-muted-foreground">
        <span className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-primary/50" />
          Horarios en UTC·0 (banners oficiales)
        </span>
        <span className="font-mono text-muted-foreground/60">KoreStats</span>
      </div>
    </div>
  );
}
