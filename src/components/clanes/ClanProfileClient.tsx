"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { clanService } from "@/lib/clanes/clanService";
import type { Clan, ClanMember, JoinPolicy, ClanApplication } from "@/types/clanes";
import {
  Shield, Users, MessageSquare, Lock, Unlock, GitMerge,
  Trophy, Crown, Star, ChevronLeft, Loader2, ExternalLink,
  UserPlus, Send, CheckCircle, XCircle, LogIn, Settings, X,
  Flag, Upload, AlertTriangle
} from "lucide-react";

const GAME_LABELS: Record<string, string> = {
  league_of_legends: "League of Legends",
  delta_force: "Delta Force",
};

const GAME_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  league_of_legends: { text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  delta_force: { text: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30" },
};

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  leader: { label: "Líder", icon: Crown, color: "text-amber-500" },
  officer: { label: "Oficial", icon: Star, color: "text-blue-400" },
  member: { label: "Miembro", icon: Shield, color: "text-gray-400" },
};

interface ClanProfileClientProps {
  tag: string;
}

type JoinAction = "none" | "joined" | "applied" | "already_member";

export default function ClanProfileClient({ tag }: ClanProfileClientProps) {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [clan, setClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [loadingClan, setLoadingClan] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [applyMessage, setApplyMessage] = useState("");
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [joinAction, setJoinAction] = useState<JoinAction>("none");
  const [actionError, setActionError] = useState<string | null>(null);

  // Estados para la edición del clan
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDiscordUrl, setEditDiscordUrl] = useState("");
  const [editJoinPolicy, setEditJoinPolicy] = useState<JoinPolicy>("open");
  const [editRequireExclusive, setEditRequireExclusive] = useState(false);
  const [editMinRank, setEditMinRank] = useState("");
  const [editMinKda, setEditMinKda] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Estados para la eliminación del clan
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Estados para la subida de archivos (logo y banner)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);

  // Estados para reporte del clan
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportItem, setReportItem] = useState<'logo' | 'banner' | 'general'>('general');
  const [reportReason, setReportReason] = useState('Contenido inapropiado');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportingLoading, setReportingLoading] = useState(false);

  // Estados para moderación y administración
  const [activeTab, setActiveTab] = useState<'members' | 'admin'>('members');
  const [applications, setApplications] = useState<ClanApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [submittingAppId, setSubmittingAppId] = useState<string | null>(null);

  // Estados para nombres de roles personalizados
  const [roleLeader, setRoleLeader] = useState("");
  const [roleOfficer, setRoleOfficer] = useState("");
  const [roleMember, setRoleMember] = useState("");
  const [updatingRoles, setUpdatingRoles] = useState(false);

  const isOwner = user?.id === clan?.owner_id;
  const isAdmin = members.some((m) => m.user_id === user?.id && ["leader", "officer"].includes(m.role));

  // Cargar solicitudes de ingreso cuando se activa la pestaña de administración
  useEffect(() => {
    if (activeTab === 'admin' && clan && isAdmin) {
      const fetchApps = async () => {
        setLoadingApps(true);
        try {
          const apps = await clanService.getClanApplications(clan.id);
          setApplications(apps);
        } catch (err) {
          console.error("Error al cargar solicitudes:", err);
        } finally {
          setLoadingApps(false);
        }
      };
      fetchApps();
    }
  }, [activeTab, clan, isAdmin]);

  // Inicializar nombres de roles al cargar o cambiar el clan
  useEffect(() => {
    if (clan) {
      setRoleLeader(clan.role_names?.leader || "Líder");
      setRoleOfficer(clan.role_names?.officer || "Oficial");
      setRoleMember(clan.role_names?.member || "Miembro");
    }
  }, [clan]);

  const handleRespondApplication = async (appId: string, status: 'accepted' | 'rejected', applicantUserId: string) => {
    if (!clan) return;
    setSubmittingAppId(appId);
    try {
      await clanService.respondToApplication(appId, status, clan.id, applicantUserId);
      setApplications((prev) => prev.filter((a) => a.id !== appId));
      
      if (status === 'accepted') {
        const updatedMembers = await clanService.getClanMembers(clan.id);
        setMembers(updatedMembers);
      }
    } catch (err) {
      alert("Error al procesar la solicitud.");
    } finally {
      setSubmittingAppId(null);
    }
  };

  const handleKickMember = async (targetUserId: string) => {
    if (!clan) return;
    if (!confirm("¿Estás seguro de que deseas expulsar a este miembro del clan?")) return;
    try {
      await clanService.kickMember(clan.id, targetUserId);
      setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId));
    } catch (err) {
      alert("Error al expulsar al miembro.");
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: 'officer' | 'member') => {
    if (!clan) return;
    try {
      await clanService.updateMemberRole(clan.id, targetUserId, newRole);
      setMembers((prev) => prev.map((m) => m.user_id === targetUserId ? { ...m, role: newRole } : m));
    } catch (err) {
      alert("Error al actualizar el rango del miembro.");
    }
  };

  const handleUpdateRoleNamesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clan) return;
    setUpdatingRoles(true);
    try {
      const updatedClan = await clanService.updateRoleNames(clan.id, {
        leader: roleLeader.trim() || "Líder",
        officer: roleOfficer.trim() || "Oficial",
        member: roleMember.trim() || "Miembro",
      });
      setClan(updatedClan);
      alert("Los nombres de los rangos se han actualizado correctamente.");
    } catch (err) {
      alert("Error al actualizar nombres de rangos.");
    } finally {
      setUpdatingRoles(false);
    }
  };

  // Inicializar campos de edición cuando se abre el modal
  useEffect(() => {
    if (clan) {
      setEditName(clan.name);
      setEditDescription(clan.description || "");
      setEditDiscordUrl(clan.discord_url || "");
      setEditJoinPolicy(clan.join_policy);
      setEditRequireExclusive(clan.require_exclusive);
      setEditMinRank(clan.requirements?.min_rank || "");
      setEditMinKda(clan.requirements?.min_kda?.toString() || "");

      // Limpiar archivos locales y vistas previas
      setLogoFile(null);
      setBannerFile(null);
      setLogoPreview(null);
      setBannerPreview(null);

      // Limpiar estados de eliminación
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
      setDeleteError(null);
    }
  }, [clan, isEditModalOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setEditError('El archivo debe ser una imagen (JPG, PNG o WEBP)');
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setEditError(`La imagen es demasiado grande. El tamaño máximo es de 2MB.`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (type === 'logo') {
      setLogoFile(file);
      setLogoPreview(previewUrl);
    } else {
      setBannerFile(file);
      setBannerPreview(previewUrl);
    }
    setEditError(null);
  };

  const handleUpdateClan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clan) return;
    setActionLoading(true);
    setEditError(null);
    try {
      let uploadedLogoUrl = clan.logo_url;
      let uploadedBannerUrl = clan.banner_url;

      // 1. Subir logo si se seleccionó uno nuevo
      if (logoFile) {
        setUploadingLogo(true);
        const logoFormData = new FormData();
        logoFormData.append('file', logoFile);
        logoFormData.append('clanId', clan.id);
        logoFormData.append('type', 'logo');

        const uploadRes = await fetch('/api/clanes/upload', {
          method: 'POST',
          body: logoFormData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Error al subir el emblema del clan.');
        }
        uploadedLogoUrl = uploadData.url;
        setUploadingLogo(false);
      }

      // 2. Subir banner si se seleccionó uno nuevo
      if (bannerFile) {
        setUploadingBanner(true);
        const bannerFormData = new FormData();
        bannerFormData.append('file', bannerFile);
        bannerFormData.append('clanId', clan.id);
        bannerFormData.append('type', 'banner');

        const uploadRes = await fetch('/api/clanes/upload', {
          method: 'POST',
          body: bannerFormData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Error al subir el banner de portada.');
        }
        uploadedBannerUrl = uploadData.url;
        setUploadingBanner(false);
      }

      const reqs: any = {};
      if (editMinRank.trim()) reqs.min_rank = editMinRank.trim();
      if (editMinKda.trim()) {
        const kdaVal = parseFloat(editMinKda);
        if (!isNaN(kdaVal)) reqs.min_kda = kdaVal;
      }

      const updated = await clanService.updateClan(clan.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        discord_url: editDiscordUrl.trim() || null,
        join_policy: editJoinPolicy,
        require_exclusive: editRequireExclusive,
        requirements: reqs,
        logo_url: uploadedLogoUrl,
        banner_url: uploadedBannerUrl,
      });

      setClan(updated);
      setIsEditModalOpen(false);
    } catch (err: any) {
      setEditError(err?.message || "Error al actualizar el clan.");
    } finally {
      setActionLoading(false);
      setUploadingLogo(false);
      setUploadingBanner(false);
    }
  };

  const handleDeleteClan = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!clan) return;
    if (deleteConfirmText.trim().toUpperCase() !== clan.tag.toUpperCase()) {
      setDeleteError("El tag del clan no coincide.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await clanService.deleteClan(clan.id);
      setIsEditModalOpen(false);
      router.push("/clanes");
    } catch (err: any) {
      setDeleteError(err?.message || "Error al eliminar el clan.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clan) return;
    setReportingLoading(true);
    setReportError(null);
    setReportSuccess(false);

    try {
      await clanService.reportClan(clan.id, reportReason, reportItem, reportDescription.trim() || undefined);
      setReportSuccess(true);
      setReportDescription('');
    } catch (err: any) {
      setReportError(err?.message || 'Error al enviar el reporte');
    } finally {
      setReportingLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoadingClan(true);
      try {
        const [clanData, membersData] = await Promise.all([
          clanService.getClanByTag(tag),
          clanService.getClanes({ limit: 1 }).then(() => clanService.getClanByTag(tag))
            .catch(() => null),
        ]);
        setClan(clanData);

        // Cargar miembros
        const mems = await clanService.getClanMembers(clanData.id);
        setMembers(mems);

        // Verificar si el usuario ya es miembro
        if (user) {
          const isMember = mems.some((m) => m.user_id === user.id);
          if (isMember) setJoinAction("already_member");
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoadingClan(false);
      }
    };
    load();
  }, [tag, user]);

  const handleJoinOpen = async () => {
    if (!user || !clan) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await clanService.joinClan(clan.id, user.id);
      setJoinAction("joined");
      setMembers((prev) => [
        ...prev,
        {
          id: "new",
          clan_id: clan.id,
          user_id: user.id,
          role: "member",
          joined_at: new Date().toISOString(),
          perfil: profile as any,
        },
      ]);
    } catch (e: any) {
      setActionError(e?.message || "Error al unirse al clan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user || !clan) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await clanService.applyToClan(clan.id, user.id, applyMessage);
      setJoinAction("applied");
      setShowApplyForm(false);
    } catch (e: any) {
      setActionError(e?.message || "Error al enviar la solicitud.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loadingClan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (notFound || !clan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <Shield size={56} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Clan no encontrado</h1>
        <p className="text-gray-500 text-sm mb-6">El clan con tag "{tag}" no existe.</p>
        <Link href="/clanes" className="text-sm font-bold text-blue-500 hover:underline">
          ← Ver todos los clanes
        </Link>
      </div>
    );
  }

  const gameConfig = GAME_COLORS[clan.game] ?? { text: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30" };

  const renderJoinButton = () => {
    if (!user) {
      return (
        <div className="text-center md:text-left">
          <p className="text-xs text-gray-400 mb-3">Inicia sesión para unirte o solicitar ingreso</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-blue-500 text-blue-500 hover:bg-blue-500/10 font-bold text-sm transition-all w-full md:w-auto"
          >
            <LogIn size={16} />
            Iniciar Sesión
          </Link>
        </div>
      );
    }

    if (joinAction === "already_member" || joinAction === "joined") {
      return (
        <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold text-sm w-full md:w-auto">
          <CheckCircle size={16} />
          {joinAction === "joined" ? "¡Te has unido!" : "Ya eres miembro"}
        </div>
      );
    }

    if (joinAction === "applied") {
      return (
        <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-sm w-full md:w-auto">
          <CheckCircle size={16} />
          Solicitud enviada
        </div>
      );
    }

    if (clan.join_policy === "invite_only") {
      return (
        <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-400 font-bold text-sm cursor-not-allowed w-full md:w-auto">
          <Lock size={16} />
          Solo por Invitación
        </div>
      );
    }

    if (clan.join_policy === "open") {
      return (
        <button
          onClick={handleJoinOpen}
          disabled={actionLoading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 w-full md:w-auto"
        >
          {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          Unirse al Clan
        </button>
      );
    }

    // apply
    return (
      <div className="w-full">
        {!showApplyForm ? (
          <button
            onClick={() => setShowApplyForm(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 w-full md:w-auto"
          >
            <Send size={16} />
            Solicitar Ingreso
          </button>
        ) : (
          <div className="space-y-3 w-full">
            <textarea
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
              placeholder="Preséntate al clan: tu experiencia, disponibilidad, por qué quieres unirte..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleApply}
                disabled={actionLoading}
                className="flex-grow inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest transition-all active:scale-95"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Enviar Solicitud
              </button>
              <button
                onClick={() => setShowApplyForm(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm font-bold transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 selection:bg-blue-500/20 relative overflow-hidden">

      {/* Glow de fondo dinámico según el juego */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] pointer-events-none -z-10 opacity-35 dark:opacity-20 blur-[120px] transition-all duration-500"
        style={{
          background: `radial-gradient(circle at top, ${clan.game === 'delta_force' ? 'rgba(20, 184, 166, 0.4)' : 'rgba(245, 158, 11, 0.4)'} 0%, transparent 70%)`
        }}
      />

      <main className="container mx-auto px-4 py-6 md:py-10 max-w-6xl relative z-10">

        {/* ── BANNER / PORTADA ── */}
        <div className="relative w-full h-40 md:h-56 rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-900 to-black border border-gray-200 dark:border-white/5 shadow-xl">

          {/* Directorio de clanes superpuesto (esquina superior izquierda) */}
          <Link
            href="/clanes"
            className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-lg border border-white/15 text-[0.625rem] md:text-xs font-black text-white hover:text-blue-400 hover:scale-102 shadow-xl transition-all z-20 uppercase tracking-widest"
          >
            <ChevronLeft size={12} />
            Directorio
          </Link>

          {clan.banner_url && (
            <Image
              src={clan.banner_url}
              alt={`Banner de ${clan.name}`}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
            />
          )}

          {/* Tag destacado estilo badge glassmorphic pequeño */}
          <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-lg border border-white/15 shadow-xl z-20 select-none">
            <span className="text-xs md:text-sm font-black text-white tracking-widest font-mono">
              #{clan.tag}
            </span>
          </div>

          {/* Degradado brillante dinámico */}
          <div
            className="absolute inset-0 opacity-45 mix-blend-color-dodge pointer-events-none z-10"
            style={{
              background: `radial-gradient(circle at 80% 20%, ${clan.game === 'delta_force' ? '#14b8a6' : '#f59e0b'} 0%, transparent 60%)`
            }}
          />
        </div>

        {/* Logo / Avatar superpuesto colocado fuera del banner para evitar que se recorte por el overflow-hidden */}
        <div className="relative z-20">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 md:left-10 md:translate-x-0 w-24 h-24 rounded-2xl border-4 border-white dark:border-black bg-neutral-900 shadow-xl overflow-hidden">
            {clan.logo_url ? (
              <Image
                src={clan.logo_url}
                alt={clan.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center border ${gameConfig.bg} ${gameConfig.border}`}>
                <Shield size={36} className={gameConfig.text} />
              </div>
            )}
          </div>
        </div>
        {/* ── CABECERA / INFORMACIÓN PRINCIPAL ── */}
        <div className="mt-14 md:mt-4 md:pl-40 pb-8 border-b border-gray-200 dark:border-white/10 flex flex-col md:flex-row md:justify-between md:items-end gap-6 text-center md:text-left">
          <div className="space-y-3 flex-grow min-w-0">
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex flex-col md:flex-row md:items-baseline gap-2 justify-center md:justify-start">
              <span className="truncate">{clan.name}</span>
              <span className="text-sm font-black text-gray-400 dark:text-gray-500 font-mono">#{clan.tag}</span>
            </h1>
          </div>

          {/* Botones de acción principales */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 w-full sm:w-auto md:max-w-xs justify-center md:justify-end">
            {isOwner && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.05] text-gray-700 dark:text-gray-300 text-xs font-bold transition-all active:scale-98"
              >
                <Settings size={13} className="opacity-70" />
                Editar detalles
              </button>
            )}

            {!isOwner && !isAdmin && (
              <div className="w-full sm:w-auto">
                {actionError && (
                  <div className="flex items-start gap-2 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-3 text-left">
                    <XCircle size={14} className="shrink-0 mt-0.5" />
                    {actionError}
                  </div>
                )}
                {renderJoinButton()}
              </div>
            )}

            {clan.discord_url && (
              <a
                href={clan.discord_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] hover:shadow-lg hover:shadow-[#5865F2]/20 text-white font-black text-sm uppercase tracking-widest transition-all duration-200 active:scale-95 shadow-md"
              >
                <MessageSquare size={15} />
                Unirse al Discord
                <ExternalLink size={12} className="opacity-70" />
              </a>
            )}

            {!isOwner && user && (
              <button
                onClick={() => {
                  setReportItem('general');
                  setReportReason('Contenido inapropiado');
                  setReportDescription('');
                  setReportSuccess(false);
                  setReportError(null);
                  setIsReportModalOpen(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl border border-rose-500/20 hover:border-rose-500/50 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 font-bold text-xs uppercase tracking-widest transition-all duration-200 active:scale-95"
              >
                <Flag size={14} />
                Reportar Clan
              </button>
            )}
          </div>
        </div>

        {/* ── CUERPO DE CONTENIDO PRINCIPAL ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-10">

          {/* Roster o Administración (2/3 de pantalla en desktop) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Selector de Pestañas de Administración (solo si es oficial o líder) */}
            {isAdmin && (
              <div className="flex gap-2 border-b border-gray-200 dark:border-white/10 pb-4">
                <button
                  onClick={() => setActiveTab('members')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all ${
                    activeTab === 'members'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Miembros
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all ${
                    activeTab === 'admin'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Administración del Clan
                </button>
              </div>
            )}

            {/* Pestaña: Miembros del Clan */}
            {activeTab === 'members' && (
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wider justify-center md:justify-start">
                  <Users size={18} className="text-blue-500" />
                  Roster del Clan ({members.length})
                </h2>

                {members.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-sm">
                    No hay miembros registrados en este clan.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {members
                      .sort((a, b) => {
                        const order = { leader: 0, officer: 1, member: 2 };
                        return (order[a.role] ?? 3) - (order[b.role] ?? 3);
                      })
                      .map((member) => {
                        const roleConfig = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.member;
                        const RoleIcon = roleConfig.icon;
                        const roleLabel = clan.role_names?.[member.role as 'leader' | 'officer' | 'member'] || roleConfig.label;

                        return (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:border-gray-200 dark:hover:border-white/[0.08] transition-all duration-200 group"
                          >
                            {/* Avatar */}
                            {member.perfil?.avatar_url ? (
                              <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                                <Image
                                  src={member.perfil.avatar_url}
                                  alt={member.perfil.username ?? ""}
                                  width={44}
                                  height={44}
                                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                              </div>
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-neutral-800 border border-gray-300 dark:border-white/10 flex items-center justify-center shrink-0">
                                <Shield size={18} className="text-gray-400" />
                              </div>
                            )}

                            {/* Info */}
                            <div className="flex-grow min-w-0">
                              <p className="font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                                {member.perfil?.username ?? "Usuario"}
                              </p>
                              <p className="text-[0.625rem] text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5 font-mono">
                                Unido: {new Date(member.joined_at).toLocaleDateString("es-ES", { month: "short", year: "numeric" })}
                              </p>
                            </div>

                            {/* Rol Badge */}
                            <div className={`flex items-center gap-1 text-[0.5625rem] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-white dark:bg-black shrink-0 ${roleConfig.color} border-gray-200 dark:border-white/10`}>
                              <RoleIcon size={10} />
                              {roleLabel}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Pestaña: Administración del Clan */}
            {activeTab === 'admin' && (
              <div className="space-y-8">
                
                {/* 1. Solicitudes de Ingreso */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                    <Send size={16} className="text-blue-500" />
                    Solicitudes Pendientes ({applications.length})
                  </h3>

                  {loadingApps ? (
                    <div className="py-8 text-center text-xs text-gray-500">Cargando solicitudes...</div>
                  ) : applications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-500 border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                      No hay solicitudes pendientes en este momento.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {applications.map((app) => (
                        <div key={app.id} className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {app.perfil?.avatar_url ? (
                              <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-white/10">
                                <Image src={app.perfil.avatar_url} alt={app.perfil.username ?? ""} width={36} height={36} className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-gray-200 dark:border-white/10">
                                <Shield size={14} className="text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-sm text-gray-900 dark:text-white">{app.perfil?.username ?? "Usuario"}</p>
                              {app.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">"{app.message}"</p>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={submittingAppId !== null}
                              onClick={() => handleRespondApplication(app.id, 'accepted', app.user_id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                            >
                              Aceptar
                            </button>
                            <button
                              disabled={submittingAppId !== null}
                              onClick={() => handleRespondApplication(app.id, 'rejected', app.user_id)}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Gestión de Miembros y Rangos */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                  <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                    <Users size={16} className="text-blue-500" />
                    Gestión de Roster
                  </h3>

                  <div className="space-y-2.5">
                    {members
                      .sort((a, b) => {
                        const order = { leader: 0, officer: 1, member: 2 };
                        return (order[a.role] ?? 3) - (order[b.role] ?? 3);
                      })
                      .map((member) => {
                        const isSelf = member.user_id === user?.id;
                        const targetRole = member.role;
                        const roleConfig = ROLE_CONFIG[targetRole] ?? ROLE_CONFIG.member;
                        const roleLabel = clan.role_names?.[targetRole as 'leader' | 'officer' | 'member'] || roleConfig.label;

                        return (
                          <div key={member.id} className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {member.perfil?.avatar_url ? (
                                <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-white/10">
                                  <Image src={member.perfil.avatar_url} alt={member.perfil.username ?? ""} width={32} height={32} className="object-cover" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-gray-200 dark:border-white/10">
                                  <Shield size={12} className="text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-xs text-gray-900 dark:text-white">{member.perfil?.username ?? "Usuario"}</p>
                                <span className={`inline-block text-[0.5625rem] font-black uppercase tracking-wider mt-0.5 ${roleConfig.color}`}>
                                  {roleLabel}
                                </span>
                              </div>
                            </div>

                            {/* Acciones de administración */}
                            {!isSelf && (
                              <div className="flex items-center gap-2">
                                {/* Cambiar de rol (Solo Líder) */}
                                {isOwner && member.role !== 'leader' && (
                                  <select
                                    value={member.role}
                                    onChange={(e) => handleUpdateRole(member.user_id, e.target.value as 'officer' | 'member')}
                                    className="bg-zinc-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-xs font-bold py-1 px-2 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none"
                                  >
                                    <option value="member">{clan.role_names?.member || "Miembro"}</option>
                                    <option value="officer">{clan.role_names?.officer || "Oficial"}</option>
                                  </select>
                                )}

                                {/* Expulsar miembro (Líder puede expulsar a todos, Oficial solo a miembros) */}
                                {((isOwner && member.role !== 'leader') || (isAdmin && !isOwner && member.role === 'member')) && (
                                  <button
                                    onClick={() => handleKickMember(member.user_id)}
                                    className="p-1 rounded-lg border border-rose-500/20 hover:border-rose-500/50 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 text-[0.625rem] font-bold px-2 py-1 uppercase tracking-wider transition-all"
                                  >
                                    Expulsar
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 3. Configuración de Roles (Solo Líder) */}
                {isOwner && (
                  <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                      <Settings size={16} className="text-blue-500" />
                      Personalización de Roles
                    </h3>
                    <p className="text-[0.6875rem] text-gray-500 dark:text-gray-400">
                      Cambia el nombre visible de los rangos de tu clan. Su nivel de jerarquía y permisos permanecerán intactos.
                    </p>

                    <form onSubmit={handleUpdateRoleNamesSubmit} className="space-y-3 max-w-md">
                      <div>
                        <label className="block text-[0.625rem] font-black uppercase tracking-wider text-gray-400 mb-1">Rango Líder (Nivel 1)</label>
                        <input
                          type="text"
                          value={roleLeader}
                          onChange={(e) => setRoleLeader(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white font-bold"
                          placeholder="Líder"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.625rem] font-black uppercase tracking-wider text-gray-400 mb-1">Rango Oficial (Nivel 2)</label>
                        <input
                          type="text"
                          value={roleOfficer}
                          onChange={(e) => setRoleOfficer(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white font-bold"
                          placeholder="Oficial"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.625rem] font-black uppercase tracking-wider text-gray-400 mb-1">Rango Miembro (Nivel 3)</label>
                        <input
                          type="text"
                          value={roleMember}
                          onChange={(e) => setRoleMember(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white font-bold"
                          placeholder="Miembro"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={updatingRoles}
                        className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        Guardar Nombres
                      </button>
                    </form>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Información del Clan (1/3 de pantalla en desktop) */}
          <div className="space-y-6">

            {/* Detalles del Clan Minimalista (Sin tarjeta ni bordes) */}
            <div className="space-y-4">
              
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Detalles del Clan</h3>
                <span className="text-[0.625rem] font-bold text-gray-400 dark:text-gray-500">
                  Creado: {new Date(clan.created_at).toLocaleDateString("es-ES", { year: "numeric", month: "short" })}
                </span>
              </div>

              {/* Fila de Stats en formato de texto plano y minimalista */}
              <div className="space-y-3">
                
                {/* Miembros */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Users size={14} className="text-gray-400" /> Miembros
                  </span>
                  <span className="font-black text-gray-900 dark:text-white">
                    {members.length}
                  </span>
                </div>

                {/* Política de Ingreso */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    {clan.join_policy === "open" ? (
                      <Unlock size={14} className="text-gray-400" />
                    ) : clan.join_policy === "apply" ? (
                      <GitMerge size={14} className="text-gray-400" />
                    ) : (
                      <Lock size={14} className="text-gray-400" />
                    )}
                    Ingreso
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white capitalize">
                    {clan.join_policy === "open" ? "Abierto" : clan.join_policy === "apply" ? "Por Solicitud" : "Solo Invitación"}
                  </span>
                </div>

                {/* Exclusividad (si aplica) */}
                {clan.require_exclusive && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <Trophy size={14} className="text-gray-400" /> Tipo de Clan
                    </span>
                    <span className="font-black text-amber-500 uppercase tracking-widest text-[0.5625rem] bg-amber-500/10 px-2 py-0.5 rounded">
                      Exclusivo
                    </span>
                  </div>
                )}

              </div>

              {/* Requisitos de Admisión compactos */}
              {clan.requirements && (clan.requirements.min_rank || clan.requirements.min_kda) && (
                <div className="border-t border-gray-200 dark:border-white/10 pt-3.5 space-y-2">
                  <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-gray-400">Requisitos de Admisión</h4>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {clan.requirements.min_rank && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-400">Rango:</span>
                        <span className="font-black text-gray-900 dark:text-white">{clan.requirements.min_rank}</span>
                      </div>
                    )}
                    {clan.requirements.min_kda && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-400">KDA:</span>
                        <span className="font-mono font-black text-teal-500 dark:text-teal-400">{clan.requirements.min_kda}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Panel del administrador */}
            {isAdmin && (
              <div className="p-4 rounded-2xl border border-blue-500/10 bg-blue-500/[0.02] space-y-1.5">
                <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1">
                  <Settings size={12} /> Panel de Control
                </h4>
                <p className="text-[0.6875rem] text-gray-400 leading-normal">
                  Tienes permisos de administración en este clan para moderar miembros y solicitudes.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* MODAL DE EDICIÓN */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c0f11] border border-gray-200 dark:border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative text-gray-900 dark:text-gray-100">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-wider flex items-center gap-2">
              <Settings className="text-blue-500" size={20} />
              Editar Detalles del Clan
            </h2>

            <form onSubmit={handleUpdateClan} className="space-y-4 text-left">
              {editError && (
                <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-1.5">Nombre del Clan</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-1.5">Descripción</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm resize-none"
                  placeholder="Describe los objetivos del clan..."
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-1.5">Enlace de Discord</label>
                <input
                  type="url"
                  value={editDiscordUrl}
                  onChange={(e) => setEditDiscordUrl(e.target.value)}
                  placeholder="https://discord.gg/..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                />
              </div>

              {/* Ocultar inputs nativos de tipo file */}
              <input
                type="file"
                ref={logoInputRef}
                onChange={(e) => handleFileChange(e, "logo")}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />
              <input
                type="file"
                ref={bannerInputRef}
                onChange={(e) => handleFileChange(e, "banner")}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />

              {/* Directrices de subida */}
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <AlertTriangle size={13} />
                  Directrices de Personalización
                </div>
                <p className="space-y-1">
                  <span className="block">• <strong className="font-bold">Formatos:</strong> Escudo/Logo (1:1 cuadrado), Banner de portada (16:9 horizontal).</span>
                  <span className="block">• <strong className="font-bold">Especificaciones:</strong> Máximo 2MB por archivo. Formatos JPG, PNG o WEBP.</span>
                  <span className="block">• <strong className="font-bold">Políticas:</strong> No se permite contenido violento, sexual, ofensivo o inapropiado. Cualquier imagen reportada será eliminada y el clan podrá ser penalizado.</span>
                </p>
              </div>

              {/* Contenedores de subida */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-400">Emblema del Clan (1:1)</label>
                  <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-900 border border-gray-200 dark:border-white/5 flex items-center justify-center shrink-0">
                      {logoPreview || clan.logo_url ? (
                        <Image
                          src={logoPreview || clan.logo_url || ""}
                          alt="Previsualización Emblema"
                          fill
                          className="object-cover"
                          unoptimized={!!logoPreview}
                        />
                      ) : (
                        <Shield size={28} className="text-gray-500" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold transition-all"
                    >
                      <Upload size={12} />
                      {logoPreview || clan.logo_url ? "Cambiar" : "Subir Logo"}
                    </button>
                  </div>
                </div>

                {/* Banner Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-400">Banner de Portada (16:9)</label>
                  <div className="flex flex-col gap-2 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-neutral-900 border border-gray-200 dark:border-white/5 flex items-center justify-center">
                      {bannerPreview || clan.banner_url ? (
                        <Image
                          src={bannerPreview || clan.banner_url || ""}
                          alt="Previsualización Banner"
                          fill
                          className="object-cover"
                          unoptimized={!!bannerPreview}
                        />
                      ) : (
                        <div className="text-[0.625rem] text-gray-500 font-mono text-center flex flex-col items-center gap-1">
                          <Upload size={20} />
                          Sin banner configurado
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold transition-all"
                    >
                      <Upload size={12} />
                      {bannerPreview || clan.banner_url ? "Cambiar Banner" : "Subir Banner"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-1.5">Política de Ingreso</label>
                  <select
                    value={editJoinPolicy}
                    onChange={(e) => setEditJoinPolicy(e.target.value as JoinPolicy)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm appearance-none cursor-pointer"
                  >
                    <option value="open" className="bg-white dark:bg-neutral-900">Abierto</option>
                    <option value="apply" className="bg-white dark:bg-neutral-900">Por Solicitud</option>
                    <option value="invite_only" className="bg-white dark:bg-neutral-900">Solo Invitación</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-1.5">Exclusividad</label>
                  <select
                    value={editRequireExclusive ? "true" : "false"}
                    onChange={(e) => setEditRequireExclusive(e.target.value === "true")}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm appearance-none cursor-pointer"
                  >
                    <option value="false" className="bg-white dark:bg-neutral-900">No Requerida</option>
                    <option value="true" className="bg-white dark:bg-neutral-900">Exclusivo</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Requisitos del Clan</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Rango Mínimo</label>
                    <input
                      type="text"
                      value={editMinRank}
                      onChange={(e) => setEditMinRank(e.target.value)}
                      placeholder="Ej: Oro I, Diamante..."
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">KDA Mínimo</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editMinKda}
                      onChange={(e) => setEditMinKda(e.target.value)}
                      placeholder="Ej: 1.5, 2.0..."
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Zona de Peligro - Eliminar Clan (Solo para el propietario) */}
              {isOwner && (
                <div className="border-t border-rose-500/20 pt-4 mt-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-rose-500 flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={14} />
                    Zona de Peligro: Disolver Clan
                  </h4>
                  <p className="text-[0.6875rem] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                    Esta acción es definitiva y no tiene vuelta atrás. Se disolverá el clan, se expulsará a todos los miembros, y se eliminarán de forma permanente todas las solicitudes y configuraciones relacionadas.
                  </p>

                  {deleteError && (
                    <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-3">
                      {deleteError}
                    </div>
                  )}

                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl border border-rose-500/30 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 text-xs font-bold transition-all"
                    >
                      Disolver este clan...
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/25 space-y-3">
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Para confirmar que realmente deseas disolver el clan, escribe el tag del clan en mayúsculas: <strong className="font-mono text-rose-500 font-black">#{clan.tag}</strong>
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={`Escribe ${clan.tag} para confirmar`}
                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-rose-500/30 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40 text-xs uppercase font-mono font-bold"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={deleteLoading || deleteConfirmText.trim().toUpperCase() !== clan.tag.toUpperCase()}
                          onClick={handleDeleteClan}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest transition-all"
                        >
                          {deleteLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                          Confirmar y disolver clan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText("");
                            setDeleteError(null);
                          }}
                          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs font-bold transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-white/5 mt-6">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest transition-all active:scale-95"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Guardar Cambios"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm font-bold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE REPORTE */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c0f11] border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full shadow-2xl p-6 relative text-gray-900 dark:text-gray-100">
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            {reportSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle size={36} />
                </div>
                <h3 className="text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white">¡Reporte Enviado!</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
                  Gracias por tu reporte. Hemos registrado tu queja y nuestro equipo de moderación revisará los detalles a la brevedad.
                </p>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-95"
                >
                  Cerrar Ventana
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-4 text-left">
                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Flag className="text-rose-500" size={18} />
                  Reportar Clan
                </h2>

                <p className="text-[0.6875rem] text-gray-500 dark:text-gray-400 leading-normal">
                  Ayúdanos a mantener la comunidad segura reportando el contenido que infrinja nuestras normas.
                </p>

                {reportError && (
                  <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                    {reportError}
                  </div>
                )}

                {/* Selección del Item Reportado */}
                <div className="space-y-2">
                  <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-gray-400">¿Qué deseas reportar?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['general', 'logo', 'banner'] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setReportItem(item)}
                        className={`py-2.5 px-2 rounded-xl text-center border text-[0.625rem] font-black uppercase tracking-wider transition-all duration-200 ${reportItem === item
                          ? 'bg-rose-500/10 border-rose-500 text-rose-500'
                          : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white'
                          }`}
                      >
                        {item === 'general' ? 'Clan / Info' : item === 'logo' ? 'Escudo' : 'Banner'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Motivo de Reporte */}
                <div className="space-y-2">
                  <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-gray-400">Motivo del Reporte</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40 text-xs appearance-none cursor-pointer"
                  >
                    <option value="Contenido inapropiado" className="bg-white dark:bg-neutral-900">Contenido inapropiado / obsceno</option>
                    <option value="Lenguaje ofensivo" className="bg-white dark:bg-neutral-900">Lenguaje ofensivo / acoso</option>
                    <option value="Spam o publicidad" className="bg-white dark:bg-neutral-900">Spam o publicidad engañosa</option>
                    <option value="Derechos de autor" className="bg-white dark:bg-neutral-900">Infracción de derechos de autor</option>
                    <option value="Otro motivo" className="bg-white dark:bg-neutral-900">Otro motivo</option>
                  </select>
                </div>

                {/* Detalles / Descripción */}
                <div className="space-y-2">
                  <label className="block text-[0.6875rem] font-black uppercase tracking-wider text-gray-400">Detalles adicionales (Opcional)</label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe detalladamente el problema para ayudarnos a entender el contexto..."
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40 text-xs resize-none"
                  />
                </div>

                {/* Acciones */}
                <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-white/5 mt-4">
                  <button
                    type="submit"
                    disabled={reportingLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                  >
                    {reportingLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={12} />}
                    Enviar Reporte
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-5 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
