"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface SiteSettings {
  match_share_png_enabled: boolean;
}

interface UseSiteSettingsReturn {
  settings: SiteSettings;
  isLoading: boolean;
  updateSetting: (key: keyof SiteSettings, value: boolean) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const DEFAULT_SETTINGS: SiteSettings = {
  match_share_png_enabled: true,
};

export function useSiteSettings(): UseSiteSettingsReturn {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        console.error(
          "[useSiteSettings] No se pudo obtener el cliente Supabase"
        );
        return;
      }

      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", Object.keys(DEFAULT_SETTINGS));

      if (error) {
        console.error(
          "[useSiteSettings] Error al cargar configuraciones:",
          error
        );
        return;
      }

      if (data) {
        const newSettings = { ...DEFAULT_SETTINGS };
        for (const row of data) {
          if (row.key in newSettings) {
            (newSettings as Record<string, boolean>)[row.key] =
              row.value as boolean;
          }
        }
        setSettings(newSettings);
      }
    } catch (error) {
      console.error("[useSiteSettings] Error inesperado:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSetting = useCallback(
    async (key: keyof SiteSettings, value: boolean): Promise<boolean> => {
      try {
        const supabase = createClient();
        if (!supabase) {
          console.error(
            "[useSiteSettings] No se pudo obtener el cliente Supabase"
          );
          return false;
        }

        const { error } = await supabase
          .from("site_settings")
          .upsert(
            { key, value: value as unknown as JSON },
            { onConflict: "key" }
          );

        if (error) {
          console.error(
            "[useSiteSettings] Error al actualizar configuración:",
            error
          );
          return false;
        }

        // Actualizar estado local
        setSettings((prev) => ({ ...prev, [key]: value }));
        return true;
      } catch (error) {
        console.error("[useSiteSettings] Error inesperado:", error);
        return false;
      }
    },
    []
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    updateSetting,
    refetch: fetchSettings,
  };
}

// Hook simplificado solo para leer una configuración específica
export function useSiteSetting(key: keyof SiteSettings): boolean | null {
  const [value, setValue] = useState<boolean | null>(null);

  useEffect(() => {
    const loadSetting = async () => {
      try {
        const supabase = createClient();
        if (!supabase) return;

        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", key)
          .single();

        if (error) {
          console.error(`[useSiteSetting] Error al cargar ${key}:`, error);
          setValue(DEFAULT_SETTINGS[key]);
          return;
        }

        setValue((data?.value as boolean) ?? DEFAULT_SETTINGS[key]);
      } catch {
        setValue(DEFAULT_SETTINGS[key]);
      }
    };

    loadSetting();
  }, [key]);

  return value;
}
