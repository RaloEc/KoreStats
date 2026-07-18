"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Crosshair,
  Focus,
  Gauge,
  Image as ImageIcon,
  Loader2,
  Shield,
  Sword,
  Target,
  Trash2,
  Wind,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
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

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const slug = params?.slug as string;
  const reportId = params?.reportId as string;

  const [processingAction, setProcessingAction] = useState(false);

  const [deletingOpen, setDeletingOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("fake_code");
  const [deleteDetails, setDeleteDetails] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editedStats, setEditedStats] = useState<Record<string, number>>({});
  const [savingStats, setSavingStats] = useState(false);

  // Magnifier state
  const [magnifierActive, setMagnifierActive] = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const LENS_SIZE = 200;   // px size of the lens
  const ZOOM_FACTOR = 2;   // how much to zoom

  const { data: report, isLoading, error } = useQuery({
    queryKey: ["admin-report-detail", reportId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/juegos/${slug}/reports/${reportId}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      return data.report;
    },
    enabled: !!reportId && !!slug,
  });

  const handleAction = async (action: "dismiss" | "delete_weapon", reason?: string, details?: string) => {
    if (!report) return;
    setProcessingAction(true);
    try {
      const res = await fetch(`/api/admin/juegos/${slug}/reports/${report.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, weapon_record_id: report.weapon_stats_record_id, reason, details }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Action failed");
      }

      toast({
        title: "Éxito",
        description: action === "delete_weapon" ? "Arma eliminada y reporte resuelto." : "Reporte descartado e ignorado.",
      });

      queryClient.invalidateQueries({ queryKey: ["admin-weapon-reports"] });
      router.push(`/admin/juegos/${slug}?tab=reports`);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
      setProcessingAction(false);
    }
  };

  const handleEditClick = () => {
    if (!report?.weapon_stats) return;
    const ws = report.weapon_stats;
    setEditedStats({
      damage: ws.damage,
      range: ws.range,
      control: ws.control,
      handling: ws.handling,
      stability: ws.stability,
      accuracy: ws.accuracy,
      fire_rate: ws.fire_rate,
      armor_penetration: ws.armor_penetration,
      capacity: ws.capacity,
      muzzle_velocity: ws.muzzle_velocity,
      sound_range: ws.sound_range,
    });
    setIsEditing(true);
  };

  const handleSaveStats = async () => {
    if (!report) return;
    setSavingStats(true);
    try {
      const res = await fetch(`/api/admin/juegos/${slug}/reports/${report.id}/update-stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weapon_record_id: report.weapon_stats_record_id,
          stats: editedStats,
        }),
      });

      if (!res.ok) throw new Error("Failed to save stats");
      
      toast({ title: "Estadísticas actualizadas", description: "Se han guardado los cambios en el arma." });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin-report-detail", reportId] });
    } catch (err) {
      toast({ title: "Error", description: "No se pudieron actualizar las estadísticas.", variant: "destructive" });
    } finally {
      setSavingStats(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive opacity-50" />
        <h2 className="text-xl font-bold">Reporte no encontrado</h2>
        <Button variant="outline" onClick={() => router.push(`/admin/juegos/${slug}?tab=reports`)}>
          Volver a reportes
        </Button>
      </div>
    );
  }

  const ws = report.weapon_stats;
  const isPast = report.status !== "pending";

  let screenshotUrl = null;
  if (ws?.screenshot_url) {
    screenshotUrl = ws.screenshot_url;
  }

  return (
    <div className="space-y-3 max-w-6xl mx-auto">
      {/* Header Container */}
      <div className="flex flex-col gap-2 sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 py-2 px-3">
        {/* Top Row: Title and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/admin/juegos/${slug}?tab=reports`}>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:bg-muted/60">
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black flex items-center gap-2">
                Detalle del Reporte
                <Badge variant={isPast ? "secondary" : "destructive"} className="uppercase text-[0.55rem] px-1.5 py-0 h-4">
                  {isPast ? "Resuelto" : "Pendiente"}
                </Badge>
              </h1>
              <span className="text-border mx-1">|</span>
              <p className="text-[0.65rem] text-muted-foreground font-mono">ID: {report.id.split('-')[0]}</p>
            </div>
          </div>
          {!isPast && ws && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={processingAction}
                onClick={() => handleAction("dismiss")}
                className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 h-7 text-xs px-2.5"
              >
                {processingAction ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} className="mr-1.5" />}
                Ignorar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={processingAction}
                onClick={() => setDeletingOpen(true)}
                className="shadow-lg shadow-red-500/20 h-7 text-xs px-2.5"
              >
                {processingAction ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} className="mr-1.5" />}
                Eliminar Arma
              </Button>
            </div>
          )}
        </div>

        {/* Bottom Row: Report Info Banner */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-muted/30 rounded-md px-3 py-1.5 border border-border/40 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[0.6rem] uppercase text-muted-foreground tracking-widest">Motivo:</span>
            <span className="font-medium text-foreground">{REASON_LABELS[report.reason] || report.reason}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[0.6rem] uppercase text-muted-foreground tracking-widest">Fecha:</span>
            <span className="font-medium flex items-center gap-1 text-foreground">
              <Clock size={10} className="text-muted-foreground/60" />
              {(() => {
                const raw = formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: es });
                return raw
                  .replace("alrededor de ", "")
                  .replace("aproximadamente ", "")
                  .replace("cerca de ", "")
                  .replace("hace menos de un minuto", "hace un momento");
              })()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[0.6rem] uppercase text-muted-foreground tracking-widest">Por:</span>
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 rounded-full bg-primary/10 flex items-center justify-center text-[0.5rem] font-black text-primary">
                {report.reporter?.username?.charAt(0) || "U"}
              </div>
              <span className="font-bold text-foreground">{report.reporter?.username || "Anónimo"}</span>
            </div>
          </div>
          {report.details && (
             <div className="flex items-center gap-1.5 text-red-500/80">
               <span className="font-bold text-[0.6rem] uppercase tracking-widest">Nota:</span>
               <span className="italic">"{report.details}"</span>
             </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
        {/* Columna Izquierda: Detalles del reporte y la tarjeta del arma */}
        <div className="lg:col-span-5 space-y-4">
          {/* Estadísticas de la Build (Ahora Arriba) */}
          <div className="bg-muted/10 rounded-2xl border border-border/50 p-3 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2">
                <Sword size={14} /> Estadísticas de la Build
              </h3>
              {ws && !isPast && !isEditing && (
                <Button variant="outline" size="sm" onClick={handleEditClick} className="h-7 text-xs px-2.5">
                  Editar Valores
                </Button>
              )}
              {isEditing && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 text-xs" disabled={savingStats}>
                    Cancelar
                  </Button>
                  <Button variant="default" size="sm" onClick={handleSaveStats} className="h-7 text-xs px-3" disabled={savingStats}>
                    {savingStats ? <Loader2 size={12} className="animate-spin mr-1.5" /> : null}
                    Guardar
                  </Button>
                </div>
              )}
            </div>
            
            {ws ? (
              <div className="relative rounded-2xl bg-zinc-50/50 dark:bg-black/40 border border-border/60 shadow-inner p-3 overflow-hidden">
                
                <div className="relative space-y-3">
                  {/* Imagen y Categoría */}
                  <div className="relative aspect-[21/9] rounded-xl overflow-hidden bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-900 dark:to-black border border-border/50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-grid-zinc-950/[0.03] dark:bg-grid-white/[0.02]" />
                    <span className="absolute top-2 left-2 text-[0.6rem] font-black uppercase bg-background/80 backdrop-blur-md text-foreground px-2 py-1 rounded-md border border-border/50 z-10 shadow-sm">
                      {ws.category}
                    </span>
                    {ws.image_url ? (
                      <img src={ws.image_url} alt="" className="w-full h-full object-contain drop-shadow-xl" />
                    ) : (
                      <Sword className="opacity-20 w-10 h-10 text-muted-foreground" />
                    )}
                    <span className="absolute bottom-2 right-2 text-[0.55rem] font-mono bg-black/60 text-white/90 px-1.5 py-0.5 rounded backdrop-blur-md">
                      {ws.share_code}
                    </span>
                  </div>

                  {/* Título y Autor */}
                  <div className="text-center space-y-1.5">
                    <h4 className="font-black text-lg text-foreground uppercase tracking-tight leading-none truncate drop-shadow-sm">
                      {ws.description || ws.weapon_name}
                    </h4>
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="outline" className="text-[0.6rem] font-bold border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase px-2 py-0">
                        {ws.weapon_name}
                      </Badge>
                      <span className="text-[0.65rem] font-medium text-muted-foreground uppercase">
                        Por <span className="text-foreground font-black">{ws.perfil?.username || "Desconocido"}</span>
                      </span>
                    </div>
                  </div>

                  {/* Grid de Stats */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-1">
                    {STAT_CONFIG.map((s) => {
                      const val = (ws as any)[s.key] || 0;
                      const pct = Math.max(2, Math.min((val / s.max) * 100, 100));
                      const Icon = s.icon;
                      const unit = s.key === "range" ? "m" : "";
                      
                      return (
                        <div key={s.key} className="space-y-1.5">
                          <div className="flex justify-between items-center text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Icon size={10} className="text-blue-500/70" />
                              <span>{s.label}</span>
                            </div>
                            {isEditing ? (
                              <input 
                                type="number" 
                                className="w-14 h-5 text-right bg-background border border-border rounded px-1 py-0 text-foreground font-mono font-bold"
                                value={editedStats[s.key] ?? val}
                                onChange={(e) => setEditedStats({ ...editedStats, [s.key]: Number(e.target.value) })}
                              />
                            ) : (
                              <span className="font-mono font-black text-foreground">{val}{unit}</span>
                            )}
                          </div>
                          <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden border border-border/50">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full relative overflow-hidden" 
                              style={{ width: `${pct}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Extra Bar */}
                  <div className="flex justify-around py-1.5 border-t border-border/50 bg-background/50 backdrop-blur-sm rounded-lg mt-2">
                    {EXTRA_CONFIG.map(s => {
                      const val = (ws as any)[s.key] || 0;
                      let unit = "";
                      if (s.key === "muzzle_velocity") unit = " m/s";
                      
                      return (
                        <div key={s.key} className="flex flex-col items-center gap-0.5">
                          <span className="text-[0.55rem] font-black text-muted-foreground uppercase tracking-widest">{s.label}</span>
                          {isEditing ? (
                            <input 
                              type="number" 
                              className="w-16 h-5 text-center bg-background border border-border rounded px-1 py-0 text-xs text-foreground font-mono font-bold mt-0.5"
                              value={editedStats[s.key] ?? val}
                              onChange={(e) => setEditedStats({ ...editedStats, [s.key]: Number(e.target.value) })}
                            />
                          ) : (
                            <span className="text-xs font-mono font-black text-foreground drop-shadow-sm">{val}{unit}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-red-500/80 gap-3 border border-dashed border-red-500/20 rounded-2xl bg-red-500/5">
                <Trash2 className="w-8 h-8 animate-bounce opacity-50" />
                <span className="text-xs font-black uppercase tracking-widest opacity-80">Arma no encontrada</span>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Captura de pantalla original */}
        <div className="lg:col-span-7">
          <div className="bg-muted/10 rounded-2xl border border-border/50 p-3 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2">
                <ImageIcon size={14} /> Captura Original del Usuario
              </h3>
              {screenshotUrl && (
                <div className="flex items-center gap-2">
                  {magnifierActive && (
                    <span className="text-[0.6rem] text-muted-foreground font-medium animate-pulse">Modo lupa activo — mueve el cursor</span>
                  )}
                  <button
                    onClick={() => setMagnifierActive(v => !v)}
                    className={cn(
                      "h-7 px-2.5 rounded-md border text-xs font-bold transition-all flex items-center gap-1.5",
                      magnifierActive
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
                        : "bg-background hover:bg-muted border-border text-muted-foreground"
                    )}
                  >
                    🔍 {magnifierActive ? "Desactivar lupa" : "Activar lupa"}
                  </button>
                  <a
                    href={screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-7 px-2.5 rounded-md border border-border bg-background hover:bg-muted text-xs font-bold text-muted-foreground transition-all flex items-center gap-1.5"
                  >
                    <ImageIcon size={12} /> Ver original
                  </a>
                </div>
              )}
            </div>
            
            <div
              ref={imgContainerRef}
              className={cn(
                "flex-1 rounded-xl bg-black/5 dark:bg-black/20 border border-border/40 overflow-hidden min-h-[300px] flex items-center justify-center relative select-none",
                magnifierActive && screenshotUrl ? "cursor-crosshair" : ""
              )}
              onMouseMove={(e) => {
                if (!magnifierActive || !imgContainerRef.current || !imgRef.current || !lensRef.current) return;
                const containerRect = imgContainerRef.current.getBoundingClientRect();
                const imgRect = imgRef.current.getBoundingClientRect();
                const mouseX = e.clientX - containerRect.left;
                const mouseY = e.clientY - containerRect.top;

                // Mouse position relative to the rendered image
                const relX = mouseX - (imgRect.left - containerRect.left);
                const relY = mouseY - (imgRect.top - containerRect.top);

                // Bounds check
                if (relX < 0 || relY < 0 || relX > imgRect.width || relY > imgRect.height) {
                  lensRef.current.style.opacity = "0";
                  return;
                }

                lensRef.current.style.opacity = "1";

                // Background position for the zoomed image inside the lens
                const bgX = -(relX * ZOOM_FACTOR - LENS_SIZE / 2);
                const bgY = -(relY * ZOOM_FACTOR - LENS_SIZE / 2);
                const bgW = imgRect.width * ZOOM_FACTOR;
                const bgH = imgRect.height * ZOOM_FACTOR;

                // Lens position (centered on cursor, clamped within container)
                const lensLeft = Math.max(LENS_SIZE / 2, Math.min(containerRect.width - LENS_SIZE / 2, mouseX));
                const lensTop = Math.max(LENS_SIZE / 2, Math.min(containerRect.height - LENS_SIZE / 2, mouseY));

                // Apply styles directly
                lensRef.current.style.left = `${lensLeft - LENS_SIZE / 2}px`;
                lensRef.current.style.top = `${lensTop - LENS_SIZE / 2}px`;
                lensRef.current.style.backgroundSize = `${bgW}px ${bgH}px`;
                lensRef.current.style.backgroundPosition = `${bgX}px ${bgY}px`;
              }}
              onMouseLeave={() => {
                if (lensRef.current) {
                  lensRef.current.style.opacity = "0";
                }
              }}
            >
              {screenshotUrl ? (
                <>
                  <img
                    ref={imgRef}
                    src={screenshotUrl}
                    alt="Screenshot de las stats"
                    className="max-w-full max-h-[800px] object-contain"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                    }}
                    draggable={false}
                  />

                  {/* Magnifier Lens - Always rendered, hidden/shown via opacity */}
                  <div
                    ref={lensRef}
                    className="absolute pointer-events-none rounded-md border-2 border-primary shadow-2xl shadow-black/60 overflow-hidden transition-opacity duration-150"
                    style={{
                      width: LENS_SIZE,
                      height: LENS_SIZE,
                      backgroundImage: `url(${screenshotUrl})`,
                      backgroundRepeat: "no-repeat",
                      zIndex: 20,
                      opacity: 0,
                      display: magnifierActive ? "block" : "none",
                    }}
                  />
                </>
              ) : (
                <div className="text-center text-muted-foreground space-y-3 opacity-60">
                  <ImageIcon className="w-12 h-12 mx-auto opacity-50" />
                  <p className="text-sm font-medium">El usuario no subió una captura de pantalla.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog para confirmar eliminación */}
      <Dialog open={deletingOpen} onOpenChange={setDeletingOpen}>
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
            <Button variant="outline" onClick={() => setDeletingOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={processingAction}
              onClick={async () => {
                setDeletingOpen(false);
                await handleAction("delete_weapon", deleteReason, deleteDetails);
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
