import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export interface EditProfileData {
  username: string;
  bio: string;
  color: string;
  avatar_url: string;
  banner_url: string | null;
  connected_accounts: Record<string, string>;
}

interface PerfilData {
  id: string;
  username: string;
  bio?: string;
  color: string;
  avatar_url: string;
  banner_url?: string | null;
  connected_accounts?: Record<string, string> | string;
}

interface UseEditProfileOptions {
  perfil: PerfilData | null;
  isOpen: boolean;
  onClose: () => void;
  invalidateStaticCache: () => void;
  refreshProfile: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export function useEditProfile({
  perfil,
  isOpen,
  onClose,
  invalidateStaticCache,
  refreshProfile,
  refreshAuth,
}: UseEditProfileOptions) {
  const { toast } = useToast();
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditProfileData>({
    username: "",
    bio: "",
    color: "#64748B",
    avatar_url: "",
    banner_url: "" as string | null,
    connected_accounts: {} as Record<string, string>,
  });

  // Sincronizar datos cuando se abre el modal
  const syncEditDataWithPerfil = useCallback((perfilData: PerfilData) => {
    let connectedAccounts: Record<string, string> = {};
    const rawConnectedAccounts = perfilData.connected_accounts;
    if (rawConnectedAccounts) {
      if (typeof rawConnectedAccounts === "string") {
        try {
          connectedAccounts = JSON.parse(rawConnectedAccounts);
        } catch (e) {
          console.error("Error parsing connected_accounts:", e);
          connectedAccounts = {};
        }
      } else if (typeof rawConnectedAccounts === "object") {
        connectedAccounts = rawConnectedAccounts;
      }
    }

    setEditData({
      username: perfilData.username || "",
      bio: perfilData.bio || "",
      color: perfilData.color,
      avatar_url: perfilData.avatar_url,
      banner_url: perfilData.banner_url || "",
      connected_accounts: connectedAccounts,
    });
  }, []);

  // Efecto para sincronizar cuando se abre el modal
  useEffect(() => {
    if (isOpen && perfil) {
      syncEditDataWithPerfil(perfil);
      setError(null);
    }
  }, [isOpen, perfil, syncEditDataWithPerfil]);

  // Función para guardar cambios
  const handleSave = async () => {
    if (!perfil) return;

    setSaving(true);
    setError(null);

    try {
      const datosActualizados = {
        username: editData.username,
        bio: editData.bio,
        color: editData.color,
        avatar_url: editData.avatar_url,
        banner_url: editData.banner_url,
        connected_accounts: editData.connected_accounts,
      };

      // Cerrar el modal inmediatamente
      onClose();

      // Enviar datos al servidor
      const response = await fetch("/api/perfil/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: perfil.id,
          ...datosActualizados,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar perfil");
      }

      // Invalidar caché para forzar recarga de datos actualizados
      invalidateStaticCache();

      // También actualizamos el contexto de autenticación
      await refreshProfile();
      await refreshAuth();

      // Mostrar notificación de éxito
      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado correctamente.",
      });
    } catch (err) {
      console.error("Error:", err);
      setError("Error al actualizar el perfil");
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil.",
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    editData,
    setEditData,
    isSaving,
    error,
    handleSave,
  };
}
