"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Crosshair,
  Flag,
  Focus,
  Gauge,
  Loader2,
  Search,
  Shield,
  Sword,
  Target,
  Trash2,
  Wind,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

type ReportStatus = "pending" | "resolved" | "dismissed";

interface WeaponReport {
  id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  weapon_stats_record_id: string;
  weapon_stats?: {
    id: string;
    weapon_name: string;
    share_code: string;
    description: string | null;
    game_mode: string;
    damage: number;
    range: number;
    control: number;
    handling: number;
    stability: number;
    accuracy: number;
    fire_rate: number;
    armor_penetration: number;
    capacity: number;
    muzzle_velocity: number;
    sound_range: number;
    category: string;
    tier: string;
    image_url: string | null;
    is_official: boolean;
    overall_score: number;
    perfil?: {
      username: string;
      avatar_url: string | null;
    };
  };
  reporter?: {
    username: string;
  };
}

const STAT_CONFIG = [
  { key: "damage", label: "Daño", icon: Crosshair, max: 60 },
  { key: "range", label: "Alcance", icon: Target, max: 100 },
  { key: "control", label: "Control", icon: Activity, max: 100 },
  { key: "handling", label: "Manejo", icon: Zap, max: 100 },
  { key: "stability", label: "Estabilidad", icon: Gauge, max: 100 },
  { key: "accuracy", label: "Precisión", icon: Focus, max: 100 },
];

const EXTRA_CONFIG = [
  { key: "fire_rate", label: "RPM", icon: Clock },
  { key: "armor_penetration", label: "Pen.", icon: Shield },
  { key: "muzzle_velocity", label: "Vel.", icon: Wind },
];

const REASON_LABELS: Record<string, string> = {
  inappropriate_name: "Nombre inapropiado",
  fake_code: "Código falso o inválido",
  wrong_stats: "Estadísticas troll / erróneas",
  other: "Otro motivo",
};

export default function WeaponReportsAdmin({ gameId }: { gameId: string }) {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: reports = [], isLoading } = useQuery<WeaponReport[]>({
    queryKey: ["admin-weapon-reports"],
    queryFn: async () => {
      const res = await fetch("/api/admin/juegos/delta-force/reports");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.reports || [];
    },
    // Auto-actualizar cada 10 segundos
    refetchInterval: 10000,
    // Refrescar al reenfocar la ventana
    refetchOnWindowFocus: true,
  });

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const query = searchQuery.toLowerCase();
    
    return reports.filter((r) => {
      const weaponName = r.weapon_stats?.weapon_name?.toLowerCase() || "";
      const weaponTitle = r.weapon_stats?.description?.toLowerCase() || "";
      const reporterName = r.reporter?.username?.toLowerCase() || "";
      const creatorName = r.weapon_stats?.perfil?.username?.toLowerCase() || "";
      
      return (
        weaponName.includes(query) || 
        weaponTitle.includes(query) || 
        reporterName.includes(query) || 
        creatorName.includes(query)
      );
    });
  }, [reports, searchQuery]);

  const handleAction = async (reportId: string, weaponRecordId: string, action: "dismiss" | "delete_weapon") => {
    setProcessingId(reportId);
    try {
      const res = await fetch(`/api/admin/juegos/delta-force/reports/${reportId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, weapon_record_id: weaponRecordId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Action failed");
      }

      toast({
        title: "Éxito",
        description: action === "delete_weapon" ? "Arma eliminada y reportes resueltos." : "Reporte descartado e ignorado.",
      });

      queryClient.invalidateQueries({ queryKey: ["admin-weapon-reports"] });
      if (action === "delete_weapon") {
        queryClient.invalidateQueries({ queryKey: ["delta-force-weapons-meta"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingReports = filteredReports.filter((r) => r.status === "pending");
  const pastReports = filteredReports.filter((r) => r.status !== "pending");
  const realPendingCount = reports.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Flag className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
                Moderación de Armas
                {realPendingCount > 0 && (
                  <span className="bg-red-500 text-white text-[0.625rem] px-2 py-0.5 rounded-full animate-pulse">
                    {realPendingCount} PENDIENTES
                  </span>
                )}
              </h2>
              <p className="text-sm text-muted-foreground">Revisa y limpia configuraciones que violan las reglas.</p>
            </div>
          </div>

          {/* Buscador Avanzado */}
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Buscar arma, reportador o creador..." 
              className="pl-10 h-11 bg-muted/40 border-border/60 rounded-xl focus:bg-background transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </Button>
            )}
          </div>
        </div>

        {pendingReports.length === 0 ? (
          <div className="text-center py-20 border rounded-[2.5rem] bg-muted/20 border-dashed border-border">
            <CheckCircle className="w-16 h-16 text-emerald-500 opacity-20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-muted-foreground">
              {searchQuery ? "No se encontraron reportes" : "¡Todo en orden!"}
            </h3>
            <p className="text-sm text-muted-foreground/60">
              {searchQuery 
                ? "Prueba con otros términos de búsqueda." 
                : "No hay reportes nuevos en la fila."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pendingReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                isProcessing={processingId === report.id}
                onAction={(action) => handleAction(report.id, report.weapon_stats_record_id, action)}
              />
            ))}
          </div>
        )}
      </div>

      {pastReports.length > 0 && (
        <div className="pt-8 border-t">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
            <Clock size={14} /> Historial de Acciones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-60 grayscale-[0.5] hover:grayscale-0 transition-all duration-500">
            {pastReports.map((report) => (
              <ReportCard key={report.id} report={report} isPast />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportCard({
  report,
  isProcessing,
  isPast = false,
  onAction,
}: {
  report: WeaponReport;
  isProcessing?: boolean;
  isPast?: boolean;
  onAction?: (action: "dismiss" | "delete_weapon") => void;
}) {
  const ws = report.weapon_stats;

  return (
    <div className={cn(
      "group relative flex flex-col rounded-[2rem] border transition-all duration-500 overflow-hidden h-full",
      isPast 
        ? "bg-muted/30 border-border/50" 
        : "bg-background border-border hover:border-red-500/40 hover:shadow-[0_20px_50px_rgba(239,68,68,0.1)] active:scale-[0.99]"
    )}>
      {/* Banner de Estado del Reporte */}
      <div className={cn(
        "px-6 py-3 flex items-center justify-between border-b",
        isPast ? "bg-muted/50" : "bg-red-50 dark:bg-red-500/5"
      )}>
        <Badge variant={isPast ? "secondary" : "destructive"} className="uppercase font-black text-[0.5625rem] px-2">
          {REASON_LABELS[report.reason] || report.reason}
        </Badge>
        <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest">
          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: es })}
        </span>
      </div>

      {/* Info del Reportador (Minimal) */}
      <div className="px-6 py-4 flex items-center justify-between bg-muted/10 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[0.5rem] font-black text-primary">
            {report.reporter?.username?.charAt(0) || "U"}
          </div>
          <span className="text-[0.625rem] font-bold text-muted-foreground">
            Reportado por <span className="text-foreground">{report.reporter?.username || "Anónimo"}</span>
          </span>
        </div>
        {!isPast && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      </div>

      <div className="flex-1 flex flex-col p-6 gap-6">
        {/* LA TARJETA DE ESTADÍSTICA (Versión vertical recreada) */}
        {/* LA TARJETA DE ESTADÍSTICA (Versión vertical mejorada) */}
        <div className="relative rounded-3xl border-2 bg-white dark:bg-black p-5 shadow-sm transition-colors group-hover:border-primary/40 border-border/80">
          {ws ? (
            <div className="space-y-5">
              {/* Imagen y Categoría */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-900 border border-border/60 flex items-center justify-center p-4">
                <span className="absolute top-3 left-3 text-[0.625rem] font-black uppercase bg-black text-white px-2 py-1 rounded-lg border border-white/20 z-10 shadow-lg">
                  {ws.category}
                </span>
                {ws.image_url ? (
                  <img src={ws.image_url} alt="" className="w-full h-full object-contain drop-shadow-2xl" />
                ) : (
                  <Sword className="opacity-20 w-12 h-12" />
                )}
              </div>

              {/* Título y Autor del Arma */}
              <div className="text-center space-y-1">
                <h4 className="font-black text-base text-gray-900 dark:text-white uppercase tracking-tight leading-none truncate">
                  {ws.description || ws.weapon_name}
                </h4>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className="text-[0.625rem] font-black border-primary/20 bg-primary/5 text-primary uppercase px-2 py-0">
                    {ws.weapon_name}
                  </Badge>
                  <span className="text-[0.625rem] font-bold text-gray-500 dark:text-gray-400 uppercase">
                    Por: <span className="text-gray-900 dark:text-white font-black">{ws.perfil?.username || "Desconocido"}</span>
                  </span>
                </div>
              </div>

              {/* Grid de Stats principales */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {STAT_CONFIG.map((s) => {
                  const val = (ws as any)[s.key] || 0;
                  const pct = Math.max(5, Math.min((val / s.max) * 100, 100));
                  const Icon = s.icon;
                  // Agregar unidad si es Alcance
                  const unit = s.key === "range" ? "m" : "";
                  
                  return (
                    <div key={s.key} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[0.625rem] font-black uppercase tracking-tight">
                        <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                          <Icon size={12} className="text-blue-600 dark:text-blue-400 stroke-[2.5]" />
                          <span>{s.label}</span>
                        </div>
                        <span className="text-zinc-950 dark:text-white font-mono text-xs">{val}{unit}</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-300/30 dark:border-white/5 shadow-inner">
                        <div 
                          className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-1000 relative overflow-hidden shadow-[0_0_10px_rgba(37,99,235,0.4)]" 
                          style={{ width: `${pct}%` }} 
                        >
                          {/* Sutil brillo metalico */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" 
                            style={{ animation: 'shimmer 2.5s infinite linear' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Extra Bar */}
              <div className="flex justify-around py-3 border-t border-border/80 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl mt-2 border border-border/40">
                {EXTRA_CONFIG.map(s => {
                   const val = (ws as any)[s.key] || 0;
                   let unit = "";
                   if (s.key === "fire_rate") unit = ""; // Ya dice RPM arriba o es valor puro
                   if (s.key === "muzzle_velocity") unit = "m/s";
                   
                   return (
                    <div key={s.key} className="flex flex-col items-center">
                      <span className="text-[0.5rem] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{s.label}</span>
                      <span className="text-xs font-mono font-black text-zinc-950 dark:text-white">{val}{unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-red-500 gap-2">
              <Trash2 className="animate-bounce" />
              <span className="text-xs font-black uppercase tracking-widest">Arma ya eliminada</span>
            </div>
          )}
        </div>

        {/* Comentario del reportador */}
        {report.details && (
          <div className="relative p-4 rounded-2xl bg-muted/30 border border-muted-foreground/10 text-sm leading-relaxed text-muted-foreground italic">
             <span className="absolute -top-2 left-4 text-[0.4375rem] font-black uppercase bg-background px-1.5 py-0.5 rounded border">Comentario</span>
             "{report.details}"
          </div>
        )}

        {/* Acciones */}
        {!isPast && ws && onAction && (
          <div className="mt-auto grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="destructive"
              className="h-11 font-black uppercase text-[0.625rem] tracking-widest rounded-xl hover:scale-105 transition-transform"
              disabled={isProcessing}
              onClick={() => onAction("delete_weapon")}
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} className="mr-2" />}
              Eliminar
            </Button>

            <Button
              variant="outline"
              className="h-11 font-black uppercase text-[0.625rem] tracking-widest rounded-xl hover:bg-muted transition-all"
              disabled={isProcessing}
              onClick={() => onAction("dismiss")}
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} className="mr-2" />}
              Ingorar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
