"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  // Estados para modal de confirmación de eliminación
  const [deletingReport, setDeletingReport] = useState<{ reportId: string; weaponRecordId: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("fake_code");
  const [deleteDetails, setDeleteDetails] = useState<string>("");

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

  const handleAction = async (
    reportId: string,
    weaponRecordId: string,
    action: "dismiss" | "delete_weapon",
    reason?: string,
    details?: string
  ) => {
    setProcessingId(reportId);
    try {
      const res = await fetch(`/api/admin/juegos/delta-force/reports/${reportId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, weapon_record_id: weaponRecordId, reason, details }),
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
                onDeleteClick={() => setDeletingReport({ reportId: report.id, weaponRecordId: report.weapon_stats_record_id })}
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

      {/* Dialog para confirmar eliminación */}
      <Dialog open={deletingReport !== null} onOpenChange={(open) => { if (!open) setDeletingReport(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Eliminar Build de Arma</DialogTitle>
            <DialogDescription>
              Esta acción eliminará permanentemente la configuración de arma seleccionada y enviará una alerta al creador.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="reason" className="text-sm font-bold">Motivo de eliminación</label>
              <Select value={deleteReason} onValueChange={setDeleteReason}>
                <SelectTrigger id="reason" className="w-full">
                  <SelectValue placeholder="Selecciona un motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fake_code">Código falso o inválido</SelectItem>
                  <SelectItem value="wrong_stats">Estadísticas troll / erróneas</SelectItem>
                  <SelectItem value="inappropriate_name">Nombre inapropiado</SelectItem>
                  <SelectItem value="other">Otro motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="details" className="text-sm font-bold">Detalles adicionales (opcional)</label>
              <textarea
                id="details"
                placeholder="Explica brevemente por qué se borra..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={deleteDetails}
                onChange={(e) => setDeleteDetails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingReport(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deletingReport) return;
                const { reportId, weaponRecordId } = deletingReport;
                setDeletingReport(null);
                await handleAction(reportId, weaponRecordId, "delete_weapon", deleteReason, deleteDetails);
                // Reset inputs
                setDeleteReason("fake_code");
                setDeleteDetails("");
              }}
            >
              Confirmar y Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportCard({
  report,
  isProcessing,
  isPast = false,
  onAction,
  onDeleteClick,
}: {
  report: WeaponReport;
  isProcessing?: boolean;
  isPast?: boolean;
  onAction?: (action: "dismiss" | "delete_weapon") => void;
  onDeleteClick?: () => void;
}) {
  const ws = report.weapon_stats;

  return (
    <div className={cn(
      "group relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden h-full shadow-sm bg-card hover:shadow-md hover:border-border/80",
      isPast && "opacity-75 bg-muted/40"
    )}>
      {/* Header del Reporte */}
      <div className="px-5 py-3 flex flex-col gap-3 border-b border-border/40 bg-muted/20 pt-4">
        <div className="flex items-center justify-between gap-3">
          <Badge 
            variant="outline" 
            className={cn(
              "uppercase font-bold text-[0.6rem] tracking-wider w-fit px-2 py-0.5 rounded-md",
              isPast 
                ? "border-zinc-200 dark:border-zinc-800 text-zinc-500" 
                : "border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400"
            )}
          >
            {REASON_LABELS[report.reason] || report.reason}
          </Badge>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3 h-3 opacity-60" />
            <span className="text-[0.65rem] font-bold uppercase tracking-widest opacity-80">
              {(() => {
                const raw = formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: es });
                return raw
                  .replace("alrededor de ", "")
                  .replace("aproximadamente ", "")
                  .replace("cerca de ", "")
                  .replace("hace menos de un minuto", "hace un momento");
              })()}
            </span>
            {!isPast && <div className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-5 gap-4">
        {ws ? (
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Sword className="w-4 h-4 text-blue-500/80" />
              <h4 className="font-black text-lg text-foreground uppercase tracking-tight leading-none truncate">
                {ws.description || ws.weapon_name}
              </h4>
            </div>
            
            <div className="flex flex-col gap-2 bg-muted/20 p-3 rounded-xl border border-border/40">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Arma Base:</span>
                <span className="font-semibold text-foreground uppercase">{ws.weapon_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Creador:</span>
                <span className="font-semibold text-foreground">{ws.perfil?.username || "Desconocido"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Reportado por:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[0.5rem] font-black text-primary ring-1 ring-primary/10">
                    {report.reporter?.username?.charAt(0) || "U"}
                  </div>
                  <span className="text-foreground font-semibold">{report.reporter?.username || "Anónimo"}</span>
                </div>
              </div>
            </div>
            
            {/* Comentario del reportador */}
            {report.details && (
              <div className="relative px-4 py-3 rounded-xl bg-muted/30 border border-border/40 text-sm text-foreground/80 italic shadow-inner">
                 <div className="absolute -top-2 left-4 text-[0.5rem] font-black uppercase tracking-wider bg-background px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground shadow-sm flex items-center gap-1">
                    <AlertCircle size={8} /> Nota
                 </div>
                 <p className="mt-1 line-clamp-2">"{report.details}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-red-500/80 gap-3 flex-1">
            <Trash2 className="w-8 h-8 animate-bounce opacity-50" />
            <span className="text-xs font-black uppercase tracking-widest opacity-80">Arma no encontrada</span>
          </div>
        )}

        <div className="mt-auto space-y-2">
          {/* Botón Ver Detalles (enlace) */}
          <Link href={`/admin/juegos/delta-force/reports/${report.id}`}>
            <Button
              variant="outline"
              className="w-full h-10 font-bold uppercase text-[0.65rem] tracking-wider rounded-xl transition-all hover:bg-muted"
            >
              <Search size={13} className="mr-2 opacity-75" />
              Ver Detalles del Reporte
            </Button>
          </Link>

          {/* Acciones */}
          {!isPast && ws && onAction && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-9 font-bold uppercase text-[0.65rem] tracking-wider rounded-xl border-red-500/20 text-red-600 hover:bg-red-500/10 hover:border-red-500/30 transition-all dark:text-red-400"
                disabled={isProcessing}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onDeleteClick) {
                    onDeleteClick();
                  } else {
                    onAction("delete_weapon");
                  }
                }}
              >
                {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} className="mr-1.5" />}
                Eliminar
              </Button>

              <Button
                variant="outline"
                className="flex-1 h-9 font-bold uppercase text-[0.65rem] tracking-wider rounded-xl bg-background hover:bg-muted transition-all border-border"
                disabled={isProcessing}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAction("dismiss");
                }}
              >
                {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} className="mr-1.5 text-emerald-500/80" />}
                Ignorar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
