"use client";

import { useState } from "react";
import { PublicProfileFull } from "@/lib/public-profiles/server-data";
import { updatePublicProfile } from "@/actions/admin-profiles";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Settings,
  Users,
  Twitter,
  Twitch,
  Camera,
} from "lucide-react";

import { useRouter } from "next/navigation";

interface EditPublicProfileDialogProps {
  profile: PublicProfileFull;
  onSuccess?: () => void;
}

export function EditPublicProfileDialog({
  profile,
  onSuccess,
}: EditPublicProfileDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile.avatar_url,
  );
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updatePublicProfile(profile.id, formData);

    setLoading(false);

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Perfil actualizado",
        description: "La información se ha guardado correctamente.",
      });
      setOpen(false);

      // Si el slug cambió, redirigimos a la nueva URL
      if (result.newSlug && result.newSlug !== profile.slug) {
        router.push(`/pro/${result.newSlug}`);
      } else {
        router.refresh();
      }

      onSuccess?.();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white gap-2 font-bold uppercase tracking-wider text-[10px]"
      >
        <Settings size={14} />
        Editar Perfil
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[90vw] md:!w-full !max-w-[1000px] p-0 gap-0 border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden bg-white dark:bg-black rounded-3xl flex flex-col max-h-[95vh] md:max-h-[90vh]">
          {/* Header */}
          <DialogHeader className="p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                <Settings size={22} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Editar Perfil Público
                </DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                  Configura tu identidad pública y redes sociales
                </p>
              </div>
            </div>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar"
          >
            {/* Sección: Identidad Visual y Básica */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Avatar Upload Container */}
                <div className="flex flex-col items-center gap-4 shrink-0">
                  <div className="relative group w-32 h-32">
                    <div className="w-full h-full rounded-2xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm transition-all group-hover:border-blue-500/50">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                          <Users size={40} />
                        </div>
                      )}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all backdrop-blur-[2px]">
                        <Settings size={20} className="text-white mb-1" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                          Actualizar
                        </span>
                        <input
                          id="avatarFile"
                          name="avatarFile"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {/* Hidden input to maintain current avatar if no new one is uploaded */}
                    <input
                      type="hidden"
                      name="avatarUrl"
                      value={profile.avatar_url || ""}
                    />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-lg text-blue-500">
                      <Camera size={14} />
                    </div>
                  </div>
                </div>

                {/* Identity Fields */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
                  <div className="space-y-2">
                    <Label
                      htmlFor="display_name"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                    >
                      Nombre de Pantalla
                    </Label>
                    <Input
                      id="display_name"
                      name="display_name"
                      defaultValue={profile.display_name}
                      placeholder="Ej: Faker"
                      className="h-11 border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-zinc-900/50 rounded-xl focus:ring-blue-500/20"
                      required
                    />
                    <p className="text-[10px] text-gray-500">
                      Este nombre aparecerá en tu perfil público.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="slug"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                    >
                      Slug del Perfil (URL)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-medium">
                        /pro/
                      </span>
                      <Input
                        id="slug"
                        name="slug"
                        defaultValue={profile.slug}
                        className="h-11 pl-12 border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-zinc-900/50 rounded-xl focus:ring-blue-500/20"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Identificador único para tu URL personalizada.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Información y Redes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                  Competitivo
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                      Categoría
                    </Label>
                    <Select name="category" defaultValue={profile.category}>
                      <SelectTrigger className="h-11 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 rounded-xl font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-950">
                        <SelectItem value="pro_player">
                          🎮 Jugador Pro
                        </SelectItem>
                        <SelectItem value="streamer">📺 Streamer</SelectItem>
                        <SelectItem value="high_elo">🌟 High Elo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                      Rol Principal
                    </Label>
                    <Select
                      name="mainRole"
                      defaultValue={profile.main_role || ""}
                    >
                      <SelectTrigger className="h-11 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 rounded-xl font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-950">
                        {["TOP", "JUNGLE", "MID", "BOTTOM", "SUPPORT"].map(
                          (role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                      Equipo / Org
                    </Label>
                    <Input
                      name="teamName"
                      defaultValue={profile.team_name || ""}
                      placeholder="Ej: T1, G2 Esports..."
                      className="h-11 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 rounded-xl focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-2">
                  Social
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5 relative">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                      Twitter / X
                    </Label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-400 transition-colors">
                        <Twitter size={16} />
                      </div>
                      <Input
                        name="twitter"
                        defaultValue={profile.social_links?.twitter || ""}
                        placeholder="Usuario de Twitter"
                        className="h-11 pl-10 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 rounded-xl focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 relative">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                      Canal de Twitch
                    </Label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-purple-400 transition-colors">
                        <Twitch size={16} />
                      </div>
                      <Input
                        name="twitch"
                        defaultValue={profile.social_links?.twitch || ""}
                        placeholder="Nombre del canal"
                        className="h-11 pl-10 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 rounded-xl focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed font-medium">
                      Tu perfil pro aparecerá en las búsquedas y permitirá que
                      otros usuarios vean tu rango y estadísticas de Riot
                      actualizadas.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="h-11 px-6 rounded-xl font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-11 flex-1 sm:flex-none px-10 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold shadow-sm active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <Loader2 className="animate-spin w-5 h-5 mr-2" />
                ) : null}
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
