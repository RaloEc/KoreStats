"use client";

import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Unlink, AlertCircle, RefreshCw } from "lucide-react";
import { LinkedAccountRiot } from "@/types/riot";
import { useState, useEffect } from "react";
import { RiotAccountCardVisual } from "./RiotAccountCardVisual";
import { RiotAccountCardSkeleton } from "./RiotAccountCardSkeleton";
import { useUnifiedRiotSync } from "@/hooks/use-unified-riot-sync";

interface RiotAccountCardProps {
  onUnlink?: () => void;
  onSync?: () => void;
  useVisualDesign?: boolean;
  externalSyncPending?: boolean;
  externalCooldownSeconds?: number;
  initialAccount?: LinkedAccountRiot | null;
  profileColor?: string;
  isPublicProfile?: boolean;
  staticData?: any;
}

/**
 * Tarjeta que muestra la información de la cuenta de Riot vinculada
 */
export function RiotAccountCard({
  onUnlink,
  onSync: propOnSync,
  useVisualDesign = true,
  externalSyncPending = false,
  externalCooldownSeconds = 0,
  initialAccount,
  profileColor,
  isPublicProfile = false,
  staticData,
}: RiotAccountCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [syncError, setSyncError] = useState<string | null>(null);

  // Hook para sincronización unificada (si no se pasa uno externo)
  const {
    sync: unifiedSync,
    isPending: unifiedSyncPending,
    cooldownSeconds: unifiedSyncCooldown,
  } = useUnifiedRiotSync();

  const isSyncing =
    externalSyncPending || (propOnSync ? false : unifiedSyncPending);
  const currentCooldown = Math.max(
    externalCooldownSeconds,
    propOnSync ? 0 : unifiedSyncCooldown,
  );
  const handleSync = propOnSync || unifiedSync;

  // Obtener información de la cuenta de Riot vinculada
  // Solo se habilita si NO es un perfil público o si no tenemos datos iniciales
  const {
    data: riotAccount,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "riot-account",
      isPublicProfile ? "public" : user?.id,
      initialAccount?.puuid,
    ],
    queryFn: async () => {
      if (isPublicProfile && initialAccount) return initialAccount;
      if (!user?.id) throw new Error("No user");

      const response = await fetch("/api/riot/account");

      if (response.status === 404) {
        return null; // No hay cuenta vinculada
      }

      if (!response.ok) {
        throw new Error("Failed to fetch riot account");
      }

      const data = await response.json();

      return data.account as LinkedAccountRiot;
    },
    enabled: isPublicProfile ? true : !!user?.id,
    initialData: initialAccount || undefined,
    staleTime: isPublicProfile ? Infinity : 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // NOTA: Se ha reemplazado la mutación local por useUnifiedRiotSync
  // para asegurar que siempre se actualice tanto la cuenta como el historial.

  if (isLoading && !riotAccount) {
    // Solo mostrar loader si no tenemos datos (ni iniciales ni fetch)
    return useVisualDesign ? (
      <RiotAccountCardSkeleton />
    ) : (
      <Card>
        <CardHeader>
          <CardTitle>Cuenta de Riot Games</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Error al cargar la información de Riot Games
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!riotAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cuenta de Riot Games</CardTitle>
          <CardDescription>No hay cuenta vinculada</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Vincula tu cuenta de Riot Games para acceder a estadísticas de
            League of Legends
          </p>
          <Button asChild>
            <a href="/api/riot/login">Vincular Cuenta</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Usar nuevo diseño visual si está habilitado
  if (useVisualDesign) {
    return (
      <RiotAccountCardVisual
        account={riotAccount}
        isLoading={isLoading && !riotAccount}
        isSyncing={isSyncing}
        syncError={syncError}
        onSync={handleSync}
        onUnlink={onUnlink}
        cooldownSeconds={currentCooldown}
        hideSync={false}
        profileColor={profileColor}
        staticData={staticData}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cuenta de Riot Games</span>
          <Badge variant="secondary">Vinculada</Badge>
        </CardTitle>
        <CardDescription>
          {riotAccount.game_name}#{riotAccount.tag_line}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Información del Jugador */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Nombre
            </p>
            <p className="text-sm font-medium">{riotAccount.game_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Tag
            </p>
            <p className="text-sm font-medium">{riotAccount.tag_line}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Región
            </p>
            <p className="text-sm font-medium uppercase">
              {riotAccount.region}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Shard
            </p>
            <p className="text-sm font-medium uppercase">
              {riotAccount.active_shard || "—"}
            </p>
          </div>
        </div>

        {/* Nivel del Invocador */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Nivel
            </p>
            <p className="text-lg font-bold">
              {riotAccount.summoner_level || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Ícono
            </p>
            <p className="text-lg font-bold">
              {riotAccount.profile_icon_id || "—"}
            </p>
          </div>
        </div>

        {/* Rango Ranked Solo */}
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
            Ranked Solo/Duo
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Rango
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {riotAccount.tier || "UNRANKED"}
                </Badge>
                {riotAccount.rank && (
                  <span className="text-sm font-medium">
                    {riotAccount.rank}
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                LP
              </p>
              <p className="text-sm font-medium">
                {riotAccount.league_points || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Victorias
              </p>
              <p className="text-sm font-medium text-green-600">
                {riotAccount.wins || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Derrotas
              </p>
              <p className="text-sm font-medium text-red-600">
                {riotAccount.losses || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Error de Sincronización */}
        {syncError && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
            {syncError}
          </div>
        )}

        {/* Última Actualización */}
        <div className="text-xs text-muted-foreground">
          Última actualización:{" "}
          {riotAccount.last_updated
            ? new Date(riotAccount.last_updated).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Nunca"}
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleSync}
            disabled={isSyncing || currentCooldown > 0}
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : currentCooldown > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {currentCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar Todo
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
            onClick={onUnlink}
          >
            <Unlink className="mr-2 h-4 w-4" />
            Desvincular
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
