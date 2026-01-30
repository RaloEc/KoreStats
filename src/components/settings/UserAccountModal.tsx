"use client";

import React, { useState, Suspense, lazy, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useEditProfile } from "@/hooks/use-edit-profile";
import { useCheckUsername } from "@/hooks/use-check-username";
import {
  Loader2,
  User,
  Monitor,
  Settings2,
  Smartphone,
  Layers,
  List,
  ShieldCheck,
  Check,
  AlertCircle,
  Palette,
  Camera,
  Image as ImageIcon,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/hooks/useAuthQuery";
import { useToast } from "@/components/ui/use-toast";

// Lazy loading de sub-componentes pesados
const ImageUploader = lazy(() => import("@/components/ImageUploader"));
const BannerUploader = lazy(() =>
  import("@/components/perfil/BannerUploader").then((mod) => ({
    default: mod.BannerUploader,
  })),
);

// Constantes de colores (Mantenemos las mismas)
const PROFILE_COLORS = [
  { hex: "#4F46E5", name: "Azul" },
  { hex: "#10B981", name: "Verde" },
  { hex: "#EF4444", name: "Rojo" },
  { hex: "#F59E0B", name: "Amarillo" },
  { hex: "#8B5CF6", name: "Violeta" },
  { hex: "#06B6D4", name: "Turquesa" },
  { hex: "#F97316", name: "Naranja" },
  { hex: "#EC4899", name: "Rosa" },
];

interface UserAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "perfil" | "interfaz" | "cuenta";
}

export function UserAccountModal({
  open,
  onOpenChange,
  defaultTab = "perfil",
}: UserAccountModalProps) {
  const { profile, user, refreshProfile, refreshAuth, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [updatingPrefs, setUpdatingPrefs] = useState(false);
  const isMobile = useIsMobile();

  // Hook de edición de perfil principal
  const {
    editData,
    setEditData,
    isSaving: isSavingProfile,
    error: profileError,
    handleSave,
  } = useEditProfile({
    perfil: profile as any,
    isOpen: open,
    onClose: () => onOpenChange(false),
    invalidateStaticCache: () => {
      queryClient.invalidateQueries({
        queryKey: authKeys.profile(user?.id || ""),
      });
    },
    refreshProfile,
    refreshAuth,
  });

  // Validación de username
  const usernameCheck = useCheckUsername(editData.username, user?.id);
  const accentColor = editData.color || profile?.color || "#3b82f6";

  // Efecto para Resetear tab al abrir si se especifica
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  // Handler para ajustes de interfaz (mismo que antes pero optimizado)
  const handlePrefToggle = async (key: string, value: any) => {
    if (!user || updatingPrefs) return;
    setUpdatingPrefs(true);
    const supabase = createClient();
    const newSettings = { ...(profile?.settings || {}), [key]: value };

    try {
      const { error } = await supabase
        .from("perfiles")
        .update({ settings: newSettings })
        .eq("id", user.id);

      if (error) throw error;
      await queryClient.invalidateQueries({
        queryKey: authKeys.profile(user.id),
      });
      toast({ title: "Preferencias actualizadas" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los ajustes.",
      });
    } finally {
      setUpdatingPrefs(false);
    }
  };

  const mobileMatchViewMode =
    profile?.settings?.mobile_match_view_mode || "carousel";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[650px] md:w-full md:max-w-[1000px] lg:max-w-[1100px] md:h-[700px] p-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[95vh] md:max-h-[90vh]">
        {/* Header Decorativo Dinámico */}
        <div
          className="h-1.5 w-full shrink-0 transition-colors duration-500"
          style={{ backgroundColor: accentColor }}
        />

        <Tabs
          value={activeTab}
          onValueChange={(v: any) => setActiveTab(v)}
          orientation={isMobile ? "horizontal" : "vertical"}
          className="flex flex-col md:flex-row flex-1 overflow-hidden"
        >
          {/* Sidebar Area (Escritorio) o Header (Móvil) */}
          <div className="md:w-60 md:border-r border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col shrink-0 min-h-0">
            <div className="px-4 py-6 md:py-8 shrink-0">
              <div className="flex items-center gap-3 px-2 mb-8">
                <div
                  className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800 flex items-center justify-center shrink-0"
                  style={{ color: accentColor }}
                >
                  <Settings2 className="w-4 h-4" />
                </div>
                <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Ajustes
                </DialogTitle>
              </div>

              <div className="space-y-1 px-2 mb-4">
                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.15em]">
                  Mi Cuenta
                </p>
              </div>

              <TabsList className="grid grid-cols-3 md:flex md:flex-col w-full h-auto bg-zinc-100/80 dark:bg-zinc-900/80 p-1 md:p-0 md:gap-1 rounded-xl md:bg-transparent md:dark:bg-transparent">
                <TabsTrigger
                  value="perfil"
                  className="rounded-xl text-xs gap-3 py-2 md:py-2.5 md:justify-start md:px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm md:data-[state=active]:ring-1 md:data-[state=active]:ring-zinc-200/50 dark:md:data-[state=active]:ring-zinc-800 transition-all duration-200 group/tab hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800/50 group-data-[state=active]/tab:bg-indigo-500/10 dark:group-data-[state=active]/tab:bg-indigo-500/20 transition-colors">
                    <User className="w-4 h-4 text-zinc-500 group-data-[state=active]/tab:text-indigo-500" />
                  </div>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400 group-data-[state=active]/tab:text-zinc-900 dark:group-data-[state=active]/tab:text-zinc-100">
                    Perfil
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="interfaz"
                  className="rounded-xl text-xs gap-3 py-2 md:py-2.5 md:justify-start md:px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm md:data-[state=active]:ring-1 md:data-[state=active]:ring-zinc-200/50 dark:md:data-[state=active]:ring-zinc-800 transition-all duration-200 group/tab hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800/50 group-data-[state=active]/tab:bg-indigo-500/10 dark:group-data-[state=active]/tab:bg-indigo-500/20 transition-colors">
                    <Monitor className="w-4 h-4 text-zinc-500 group-data-[state=active]/tab:text-indigo-500" />
                  </div>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400 group-data-[state=active]/tab:text-zinc-900 dark:group-data-[state=active]/tab:text-zinc-100">
                    Interfaz
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="cuenta"
                  className="rounded-xl text-xs gap-3 py-2 md:py-2.5 md:justify-start md:px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm md:data-[state=active]:ring-1 md:data-[state=active]:ring-zinc-200/50 dark:md:data-[state=active]:ring-zinc-800 transition-all duration-200 group/tab hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800/50 group-data-[state=active]/tab:bg-indigo-500/10 dark:group-data-[state=active]/tab:bg-indigo-500/20 transition-colors">
                    <ShieldCheck className="w-4 h-4 text-zinc-500 group-data-[state=active]/tab:text-indigo-500" />
                  </div>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400 group-data-[state=active]/tab:text-zinc-900 dark:group-data-[state=active]/tab:text-zinc-100">
                    Cuenta
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            {!isMobile && (
              <div className="mt-auto p-4 shrink-0 border-t border-zinc-100 dark:border-zinc-900/50">
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-500/5 transition-all duration-200 group/logout"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 group-hover/logout:bg-red-500/20 transition-colors">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Cerrar Sesión
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-10 scrollbar-hide">
              {/* PESTAÑA: PERFIL */}
              <TabsContent
                value="perfil"
                className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="flex flex-col gap-1 mb-2">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Personalización de Perfil
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Actualiza tu imagen y presencia en BitArena
                  </p>
                </div>

                {/* Media Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50">
                  <div className="space-y-4">
                    <Label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-2 px-1">
                      <Camera className="w-3 h-3" /> Foto de Perfil
                    </Label>
                    <div className="relative group flex justify-center sm:justify-start">
                      <Suspense
                        fallback={
                          <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
                        }
                      >
                        <ImageUploader
                          currentImageUrl={editData.avatar_url}
                          userId={user?.id || ""}
                          onImageUploaded={(url) =>
                            setEditData((prev) => ({
                              ...prev,
                              avatar_url: url,
                            }))
                          }
                          className="scale-90 sm:scale-100"
                        />
                      </Suspense>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-2 px-1">
                      <ImageIcon className="w-3 h-3" /> Banner de Perfil
                    </Label>
                    <Suspense
                      fallback={
                        <div className="h-24 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
                      }
                    >
                      <BannerUploader
                        variant="compact"
                        userId={user?.id || ""}
                        currentBanner={editData.banner_url || ""}
                        onUpload={(url) =>
                          setEditData((prev) => ({ ...prev, banner_url: url }))
                        }
                      />
                    </Suspense>
                  </div>
                </div>

                {/* Bio Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <Label className="text-sm font-semibold">Biografía</Label>
                    <span className="text-[10px] text-zinc-400">
                      {editData.bio.length}/200
                    </span>
                  </div>
                  <Textarea
                    placeholder="Cuéntanos sobre ti..."
                    value={editData.bio}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    className="resize-none h-20 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 rounded-2xl transition-all"
                    maxLength={200}
                  />
                </div>

                {/* Color Palette Section */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold flex items-center gap-2 px-1">
                    <Palette className="w-4 h-4 text-zinc-400" /> Color de
                    Identidad
                  </Label>
                  <div className="flex flex-wrap gap-2.5 p-4 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50">
                    {PROFILE_COLORS.map(({ hex, name }) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() =>
                          setEditData((prev) => ({ ...prev, color: hex }))
                        }
                        className={`
                          w-8 h-8 rounded-full transition-all duration-300 relative
                          ${editData.color === hex ? "ring-2 ring-zinc-900 dark:ring-white scale-110 shadow-lg" : "hover:scale-110 opacity-70 hover:opacity-100"}
                        `}
                        style={{ backgroundColor: hex }}
                        title={name}
                      >
                        {editData.color === hex && (
                          <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* PESTAÑA: INTERFAZ */}
              <TabsContent
                value="interfaz"
                className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="flex flex-col gap-1 mb-4">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Preferencias de Interfaz
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Personaliza cómo ves la información
                  </p>
                </div>

                <div className="group relative flex flex-col gap-5 p-6 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50 transition-all hover:border-zinc-200 dark:hover:border-zinc-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 text-left">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-zinc-400" />
                        Vista de Equipos (Móvil)
                      </Label>
                      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-[280px]">
                        Cambia cómo se muestran los jugadores en el detalle de
                        partida en dispositivos móviles.
                      </p>
                    </div>
                    {updatingPrefs && (
                      <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
                    <button
                      onClick={() =>
                        handlePrefToggle("mobile_match_view_mode", "carousel")
                      }
                      className={`flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition-all ${mobileMatchViewMode === "carousel" ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white ring-1 ring-zinc-200/20" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      <Layers className="w-4 h-4" /> Carrusel
                    </button>
                    <button
                      onClick={() =>
                        handlePrefToggle("mobile_match_view_mode", "list")
                      }
                      className={`flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl transition-all ${mobileMatchViewMode === "list" ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white ring-1 ring-zinc-200/20" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      <List className="w-4 h-4" /> Lista
                    </button>
                  </div>
                </div>
              </TabsContent>

              {/* PESTAÑA: CUENTA */}
              <TabsContent
                value="cuenta"
                className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="flex flex-col gap-1 mb-4">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Seguridad y Cuenta
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Gestiona tus datos de acceso e identidad
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold px-1">
                      Nombre de Usuario
                    </Label>
                    <div className="relative group">
                      <Input
                        value={editData.username}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            username: e.target.value,
                          }))
                        }
                        className={`pr-10 h-11 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition-all ${usernameCheck.available === false ? "border-red-500 focus:border-red-500" : ""}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameCheck.loading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                        ) : usernameCheck.available === true ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : usernameCheck.available === false ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 px-1">
                      {usernameCheck.message && (
                        <p
                          className={`text-[10px] font-bold ${usernameCheck.available ? "text-green-600" : "text-red-500"}`}
                        >
                          {usernameCheck.message}
                        </p>
                      )}
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        Este es el nombre que verán los demás en la plataforma.
                        Solo puedes cambiarlo ocasionalmente.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <Label className="text-sm font-semibold block mb-3 px-1 text-zinc-400 uppercase tracking-widest text-[10px]">
                      Información Legal
                    </Label>
                    <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        BitArena utiliza datos públicos brindados por las APIs
                        oficiales de Riot Games. No estamos afiliados,
                        asociados, autorizados ni respaldados oficialmente por
                        Riot Games.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>

            {/* Footer Unificado */}
            <div className="p-4 md:px-8 md:py-5 border-t border-zinc-100 dark:border-zinc-800 shrink-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md mt-auto">
              <div className="flex flex-row justify-end gap-3">
                <Button
                  variant="ghost"
                  className="px-6 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 h-9 text-xs font-semibold"
                  onClick={() => onOpenChange(false)}
                > 
                  Descartar
                </Button>
                <Button
                  className="px-6 h-9 rounded-xl text-white dark:text-zinc-950 text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.98] shadow-lg shadow-indigo-500/10 disabled:opacity-50 flex-none"
                  style={{ backgroundColor: accentColor }}
                  disabled={
                    isSavingProfile ||
                    (editData.username !== profile?.username &&
                      usernameCheck.available !== true)
                  }
                  onClick={handleSave}
                >
                  {isSavingProfile ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Guardar Cambios
                </Button>
              </div>
              {profileError && (
                <div className="flex items-center justify-center gap-2 mt-4 text-red-500 bg-red-500/5 p-2 rounded-xl border border-red-500/10">
                  <AlertCircle className="w-3 h-3" />
                  <p className="text-[10px] font-bold">{profileError}</p>
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
