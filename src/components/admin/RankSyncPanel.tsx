"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncConfig {
  enabled: boolean;
  batch_size: number;
  delay_ms: number;
  last_run: string | null;
  last_result: {
    processed?: number;
    synced?: number;
    failed?: number;
    skipped?: number;
    message?: string;
  } | null;
}

interface SyncStatus {
  config: SyncConfig;
  updatedAt: string | null;
  pendingCount: number;
}

interface SyncResult {
  processed: number;
  synced: number;
  failed: number;
  skipped: number;
  message: string;
  pendingCount: number;
}

export function RankSyncPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/match-rank-sync");
      if (!res.ok) throw new Error("Error al obtener estado");
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleToggle = async (enabled: boolean) => {
    setToggling(true);
    try {
      const res = await fetch("/api/admin/match-rank-sync", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!res.ok) throw new Error("Error al actualizar configuración");

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setToggling(false);
    }
  };

  const handleSync = async (force = false) => {
    setSyncing(true);
    setLastResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/match-rank-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });

      if (!res.ok) throw new Error("Error al ejecutar sincronización");

      const result: SyncResult = await res.json();
      setLastResult(result);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card className="dark:bg-black dark:border-zinc-800/60 bg-white/90 border-zinc-200/80 rounded-xl">
        <CardHeader>
          <Skeleton className="h-6 w-48 dark:bg-zinc-900 bg-zinc-200" />
          <Skeleton className="h-4 w-72 dark:bg-zinc-900 bg-zinc-200" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full dark:bg-zinc-900 bg-zinc-200" />
          <Skeleton className="h-10 w-full dark:bg-zinc-900 bg-zinc-200" />
        </CardContent>
      </Card>
    );
  }

  const config = status?.config || {
    enabled: false,
    batch_size: 25,
    delay_ms: 500,
    last_run: null,
    last_result: null,
  };
  const pendingCount = status?.pendingCount || 0;

  return (
    <Card className="dark:bg-black dark:border-zinc-800/60 bg-white/90 border-zinc-200/80 rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Sincronización de Rangos
            </CardTitle>
            <CardDescription>
              Actualiza los rangos de jugadores en partidas históricas
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {config.enabled ? "Activo" : "Inactivo"}
            </span>
            <Switch
              checked={config.enabled}
              onCheckedChange={handleToggle}
              disabled={toggling}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estado actual */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant={pendingCount === 0 ? "default" : "secondary"}
            className={cn(
              "text-sm",
              pendingCount === 0
                ? "bg-green-500/10 text-green-500 border-green-500/20"
                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
            )}
          >
            {pendingCount === 0 ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Todo al día
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                {pendingCount} pendientes
              </>
            )}
          </Badge>

          {config.last_run && (
            <span className="text-xs text-muted-foreground">
              Última ejecución:{" "}
              {new Date(config.last_run).toLocaleString("es-ES", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          )}
        </div>

        {/* Resultado de última sincronización */}
        {lastResult && (
          <div
            className={cn(
              "p-3 rounded-lg border text-sm",
              lastResult.failed > 0
                ? "bg-red-500/5 border-red-500/20 text-red-400"
                : "bg-green-500/5 border-green-500/20 text-green-400"
            )}
          >
            <div className="flex items-start gap-2">
              {lastResult.failed > 0 ? (
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">{lastResult.message}</p>
                {lastResult.processed > 0 && (
                  <p className="text-xs mt-1 opacity-80">
                    Sincronizados: {lastResult.synced} | Fallidos:{" "}
                    {lastResult.failed} | Omitidos: {lastResult.skipped}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg border bg-red-500/5 border-red-500/20 text-red-400 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={() => handleSync(true)}
            disabled={syncing}
            size="sm"
            className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 border border-transparent"
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {syncing ? "Sincronizando..." : "Ejecutar ahora"}
          </Button>

          <Button
            onClick={() => fetchStatus()}
            variant="outline"
            size="sm"
            className="gap-2 dark:bg-zinc-950 dark:border-zinc-800/70"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar estado
          </Button>
        </div>

        {/* Info adicional */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-muted-foreground">
            Procesa hasta {config.batch_size} registros por ejecución con{" "}
            {config.delay_ms}ms de delay entre peticiones para respetar los
            límites de la API de Riot.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
