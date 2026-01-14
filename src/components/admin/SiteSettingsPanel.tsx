"use client";

import { useState } from "react";
import { Settings, Download, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";

export function SiteSettingsPanel() {
  const { settings, isLoading, updateSetting } = useSiteSettings();
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  const handleToggle = async (
    key: "match_share_png_enabled",
    currentValue: boolean
  ) => {
    setIsUpdating((prev) => ({ ...prev, [key]: true }));
    try {
      await updateSetting(key, !currentValue);
    } finally {
      setIsUpdating((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <Card className="dark:bg-black dark:border-zinc-800/60 bg-white/90 border-zinc-200/80 rounded-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-zinc-500" />
          <CardTitle className="text-base">Configuración del sitio</CardTitle>
        </div>
        <CardDescription>
          Ajustes globales que afectan la experiencia de todos los usuarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuración de Guardar PNG */}
        <div
          className={cn(
            "flex items-center justify-between p-4 rounded-lg border transition-colors",
            "dark:border-zinc-800 dark:bg-zinc-950/50 border-zinc-200 bg-zinc-50/50"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-lg",
                settings.match_share_png_enabled
                  ? "bg-blue-500/20 text-blue-500"
                  : "bg-zinc-500/20 text-zinc-500"
              )}
            >
              <Download className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <Label
                htmlFor="match_share_png"
                className="text-sm font-medium cursor-pointer"
              >
                Botón "Guardar PNG" en partidas
              </Label>
              <p className="text-xs text-muted-foreground">
                Permite a los usuarios guardar una imagen PNG del análisis de
                sus partidas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(isLoading || isUpdating.match_share_png_enabled) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="match_share_png"
              checked={settings.match_share_png_enabled}
              onCheckedChange={() =>
                handleToggle(
                  "match_share_png_enabled",
                  settings.match_share_png_enabled
                )
              }
              disabled={isLoading || isUpdating.match_share_png_enabled}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        </div>

        {/* Aquí se pueden agregar más configuraciones en el futuro */}
      </CardContent>
    </Card>
  );
}
