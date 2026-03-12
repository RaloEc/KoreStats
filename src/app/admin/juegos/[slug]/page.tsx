"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft,
    Gamepad2,
    Loader2,
    Shield,
    Sword,
    Settings,
    ImageIcon,
    Plus,
    Pencil,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Upload,
    X,
    Save,
    Check,
    Package,
    ChevronDown,
    ChevronRight,
    LayoutGrid,
    ListFilter,
    Search,
} from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import WeaponReportsAdmin from "@/components/admin/WeaponReportsAdmin";

// Módulos disponibles (mismos que en la lista general)
const MODULE_TYPES = [
    { key: "profiles", label: "Perfiles", description: "Perfiles de jugadores" },
    { key: "matches", label: "Partidas", description: "Historial de partidas" },
    { key: "builds", label: "Builds/Loadouts", description: "Builds y configuraciones" },
    { key: "champions", label: "Campeones", description: "Catálogo de campeones" },
    { key: "weapons", label: "Armas / Meta", description: "Catálogo y ranking de armas" },
    { key: "news", label: "Noticias", description: "Noticias del juego" },
    { key: "events", label: "Eventos", description: "Eventos y parches" },
    { key: "rotations", label: "Rotaciones", description: "Rotaciones gratuitas" },
    { key: "pro_players", label: "Pro Players", description: "Jugadores profesionales" },
];

const WEAPON_CATEGORIES = ["Assault", "Marksman", "Sniper", "SMG", "LMG", "Secondary", "Shotgun", "Special"];
const CATEGORY_LABELS: Record<string, string> = {
    Assault: "Asalto",
    Marksman: "Tirador",
    Sniper: "Francotirador",
    SMG: "Subfusil",
    LMG: "Ametralladora",
    Secondary: "Secundaria",
    Shotgun: "Escopeta",
    Special: "Arma Especial",
};

interface Juego {
    id: string;
    nombre: string;
    slug: string;
    iconoPublicUrl?: string;
    desarrollador?: string;
}

interface GameModule {
    id: string;
    game_id: string;
    module_type: string;
    enabled: boolean;
}

interface DeltaWeapon {
    id: string;
    name: string;
    slug: string;
    category: string;
    game_mode: "operations" | "warfare" | null;
    image_url: string | null;
    description: string | null;
    is_active: boolean;
    sort_order: number;
}

// ─── Weapon Form Dialog ───────────────────────────────────────────────────────
function WeaponFormDialog({
    open,
    onOpenChange,
    weapon,
    gameId,
    existingWeapons,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    weapon: DeltaWeapon | null;
    gameId: string;
    existingWeapons: DeltaWeapon[];
    onSuccess: () => void;
}) {
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [category, setCategory] = useState("Assault");
    const [description, setDescription] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
        if (weapon) {
            setName(weapon.name);
            setSlug(weapon.slug);
            setCategory(weapon.category);
            setDescription(weapon.description || "");
            setIsActive(weapon.is_active);
            setImagePreview(weapon.image_url);
            setImageFile(null);
        } else {
            setName("");
            setSlug("");
            setCategory("Assault");
            setDescription("");
            setIsActive(true);
            setImagePreview(null);
            setImageFile(null);
        }
    }, [weapon, open]);

    const isDuplicateName = name.trim() !== "" && existingWeapons.some(w =>
        w.name.toLowerCase() === name.trim().toLowerCase() && w.id !== weapon?.id
    );
    const isDuplicateSlug = slug.trim() !== "" && existingWeapons.some(w =>
        w.slug.toLowerCase() === slug.trim().toLowerCase() && w.id !== weapon?.id
    );

    // Auto-generar slug desde el nombre
    const normalizeSlug = (str: string) => {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Elimina acentos/tildes
            .toUpperCase()
            .replace(/Ñ/g, "N")
            .replace(/[^A-Z0-9-]/g, "-") // Solo letras, números y guiones
            .replace(/-+/g, "-") // Elimina guiones repetidos
            .replace(/^-|-$/g, ""); // Elimina guiones al inicio o final
    };

    const handleNameChange = (val: string) => {
        setName(val);
        if (!weapon) {
            setSlug(normalizeSlug(val));
        }
    };

    const handleImageSelect = (file: File) => {
        if (!file.type.startsWith("image/")) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleImageSelect(file);
    };

    const handleSave = async () => {
        if (!name || !slug || !category) {
            toast({ title: "Faltan datos", description: "Nombre, slug y categoría son obligatorios.", variant: "destructive" });
            return;
        }

        // Validación de duplicados (excluyendo el arma actual si se está editando)
        const isDuplicateName = existingWeapons.some(w =>
            w.name.toLowerCase() === name.toLowerCase() && w.id !== weapon?.id
        );
        if (isDuplicateName || isDuplicateSlug) {
            toast({
                title: "No se puede guardar",
                description: isDuplicateName ? "Ya existe un arma con este nombre." : "Ya existe un arma con este slug.",
                variant: "destructive"
            });
            return;
        }

        setSaving(true);
        try {
            let imageUrl = weapon?.image_url || null;

            // 1. Subir imagen si hay una nueva
            if (imageFile) {
                const formData = new FormData();
                formData.append("image", imageFile);
                formData.append("slug", slug);

                const uploadRes = await fetch("/api/admin/weapons/upload-image", {
                    method: "POST",
                    body: formData,
                });
                if (!uploadRes.ok) {
                    const err = await uploadRes.json();
                    throw new Error(err.error || "Error al subir imagen");
                }
                const uploadData = await uploadRes.json();
                imageUrl = uploadData.url;
            }

            // 2. Crear o editar el registro
            const payload = { name, slug, category, description, image_url: imageUrl, is_active: isActive, game_id: gameId };

            const url = weapon ? `/api/admin/weapons/${weapon.id}` : "/api/admin/weapons";
            const method = weapon ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al guardar");
            }

            toast({ title: weapon ? "Arma actualizada" : "Arma creada", description: `${name} guardada correctamente.` });
            onSuccess();
            onOpenChange(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error desconocido";
            toast({ title: "Error", description: msg, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg border-zinc-200/50 dark:border-white/10 shadow-2xl">
                <DialogHeader>
                    <DialogTitle>{weapon ? "Editar Arma" : "Nueva Arma"}</DialogTitle>
                    <DialogDescription>
                        {weapon ? "Modifica los datos del arma." : "Agrega una nueva arma al catálogo de Delta Force."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Imagen */}
                    <div className="space-y-2">
                        <Label className="text-foreground font-medium">Imagen del arma</Label>
                        <div
                            className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer h-36 flex items-center justify-center overflow-hidden
                                ${dragOver
                                    ? "border-primary bg-primary/10 dark:bg-primary/5"
                                    : "border-border bg-muted/40 hover:border-primary/60 hover:bg-muted/60"
                                }`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById("weapon-img-input")?.click()}
                        >
                            {imagePreview ? (
                                <>
                                    <Image src={imagePreview} alt="preview" fill className="object-contain p-2" unoptimized />
                                    <button
                                        className="absolute top-2 right-2 bg-background border border-border rounded-full p-1 shadow-sm hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null); }}
                                    >
                                        <X className="h-3 w-3 text-foreground" />
                                    </button>
                                </>
                            ) : (
                                <div className="text-center">
                                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-60" />
                                    <p className="text-xs font-medium text-muted-foreground">Arrastra o haz clic para subir</p>
                                    <p className="text-[10px] mt-1 text-muted-foreground/70">WebP recomendado · Fondo transparente</p>
                                </div>
                            )}
                        </div>
                        <input
                            id="weapon-img-input"
                            type="file"
                            accept="image/webp,image/png,image/jpeg"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(f); }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5 text-left">
                            <Label className={isDuplicateName ? "text-destructive" : ""}>
                                Nombre <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                placeholder="CI-19"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className={isDuplicateName ? "border-destructive focus-visible:ring-destructive" : ""}
                            />
                            {isDuplicateName && (
                                <p className="text-[10px] font-bold text-destructive animate-in fade-in slide-in-from-top-1">
                                    ¡Nombre duplicado! Ya existe.
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5 text-left">
                            <Label className={isDuplicateSlug ? "text-destructive" : ""}>
                                Slug (archivo)
                            </Label>
                            <Input
                                placeholder="CI-19"
                                value={slug}
                                onChange={(e) => setSlug(normalizeSlug(e.target.value))}
                                className={`font-mono text-sm ${isDuplicateSlug ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            />
                            {isDuplicateSlug ? (
                                <p className="text-[10px] font-bold text-destructive animate-in fade-in slide-in-from-top-1">
                                    Slug ya en uso.
                                </p>
                            ) : (
                                <p className="text-[10px] text-muted-foreground">Se usa para vincular estadísticas</p>
                            )}
                        </div>
                    </div>


                    {/* Categoría */}
                    <div className="space-y-1.5">
                        <Label>Categoría <span className="text-destructive">*</span></Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {WEAPON_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {CATEGORY_LABELS[cat]} ({cat})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Descripción */}
                    <div className="space-y-1.5">
                        <Label>Descripción (opcional)</Label>
                        <Input placeholder="Fusil de asalto versátil..." value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>

                    {/* Activa */}
                    <div className={`flex items-center justify-between rounded-lg p-3 border transition-colors ${isActive ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
                        <div>
                            <p className="text-sm font-medium text-foreground">Arma activa</p>
                            <p className="text-xs text-muted-foreground">Si está inactiva, no aparece en la web</p>
                        </div>
                        <button onClick={() => setIsActive(!isActive)} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
                            {isActive
                                ? <ToggleRight className="h-8 w-8 text-primary" />
                                : <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                            }
                        </button>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving || isDuplicateName || isDuplicateSlug}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                        {weapon ? "Guardar cambios" : "Crear arma"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GameConfigPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;
    const supabase = createClient();

    const [juego, setJuego] = useState<Juego | null>(null);
    const [modules, setModules] = useState<GameModule[]>([]);
    const [weapons, setWeapons] = useState<DeltaWeapon[]>([]);
    const [activeTab, setActiveTab] = useState<"modules" | "weapons" | "reports">("modules");
    const [loading, setLoading] = useState(true);
    const [togglingModule, setTogglingModule] = useState<string | null>(null);
    const [weaponDialogOpen, setWeaponDialogOpen] = useState(false);
    const [editingWeapon, setEditingWeapon] = useState<DeltaWeapon | null>(null);
    const [deleteWeapon, setDeleteWeapon] = useState<DeltaWeapon | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    // Inicializar categorías expandidas
    useEffect(() => {
        if (weapons.length > 0 && Object.keys(expandedCategories).length === 0) {
            const initial: Record<string, boolean> = {};
            WEAPON_CATEGORIES.forEach(cat => {
                initial[cat] = true;
            });
            setExpandedCategories(initial);
        }
    }, [weapons]);

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const toggleAllCategories = (expand: boolean) => {
        const updated: Record<string, boolean> = {};
        WEAPON_CATEGORIES.forEach(cat => {
            updated[cat] = expand;
        });
        setExpandedCategories(updated);
    };

    const fetchAll = useCallback(async (isInitial = false) => {
        if (!slug) return;
        if (isInitial) setLoading(true);
        try {
            // Obtener juego (solo en la carga inicial o si no lo tenemos)
            if (!juego || isInitial) {
                const { data: juegoData, error: juegoError } = await supabase
                    .from("juegos")
                    .select("id, nombre, slug, desarrollador, icono_url")
                    .eq("slug", slug)
                    .single();

                if (juegoError || !juegoData) {
                    console.error("[GameConfigPage] No se encontró el juego:", slug, juegoError);
                    router.push("/admin/juegos");
                    return;
                }

                setJuego({
                    id: juegoData.id,
                    nombre: juegoData.nombre,
                    slug: juegoData.slug,
                    desarrollador: juegoData.desarrollador,
                    iconoPublicUrl: (() => {
                        if (!juegoData.icono_url) return undefined;
                        if (juegoData.icono_url.startsWith("http")) return juegoData.icono_url;
                        const { data: urlData } = supabase.storage
                            .from("iconos")
                            .getPublicUrl(juegoData.icono_url);
                        return urlData?.publicUrl || undefined;
                    })(),
                });
            }

            const currentJuegoId = juego?.id || (await supabase.from("juegos").select("id").eq("slug", slug).single()).data?.id;

            // Obtener módulos
            if (currentJuegoId) {
                const { data: modulesData } = await supabase
                    .from("game_modules")
                    .select("id, game_id, module_type, enabled")
                    .eq("game_id", currentJuegoId);
                setModules(modulesData || []);

                // Si el juego tiene módulo de armas, obtenerlas
                const hasWeapons = ["delta-force"].includes(slug);
                if (hasWeapons) {
                    const res = await fetch(`/api/admin/weapons?gameId=${currentJuegoId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setWeapons(data.weapons || []);
                    }
                }
            }
        } catch (err) {
            console.error("[GameConfigPage]", err);
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [slug, supabase, router, juego]);

    useEffect(() => { fetchAll(true); }, []);

    const isModuleEnabled = (moduleType: string) =>
        modules.find((m) => m.module_type === moduleType)?.enabled ?? false;

    const handleToggleModule = async (moduleType: string) => {
        if (!juego) return;
        const currentlyEnabled = isModuleEnabled(moduleType);
        setTogglingModule(moduleType);
        try {
            const existing = modules.find((m) => m.module_type === moduleType);
            if (existing) {
                await supabase
                    .from("game_modules")
                    .update({ enabled: !currentlyEnabled, updated_at: new Date().toISOString() })
                    .eq("id", existing.id);
            } else {
                await supabase.from("game_modules").insert({
                    game_id: juego.id, module_type: moduleType, enabled: true, config: {},
                });
            }
            await fetchAll(false);
            toast({ title: currentlyEnabled ? "Módulo desactivado" : "Módulo activado" });
        } catch (err) {
            toast({ title: "Error", description: "No se pudo cambiar el estado.", variant: "destructive" });
        } finally {
            setTogglingModule(null);
        }
    };

    const handleDeleteWeapon = async () => {
        if (!deleteWeapon) return;
        setDeletingId(deleteWeapon.id);
        try {
            const res = await fetch(`/api/admin/weapons/${deleteWeapon.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast({ title: "Arma eliminada" });
            setDeleteWeapon(null);
            fetchAll(false);
        } catch {
            toast({ title: "Error", description: "No se pudo eliminar el arma.", variant: "destructive" });
        } finally {
            setDeletingId(null);
        }
    };

    const filteredWeapons = useMemo(() => {
        if (!searchTerm) return weapons;
        const lowSearch = searchTerm.toLowerCase();
        return weapons.filter(w =>
            w.name.toLowerCase().includes(lowSearch) ||
            w.slug.toLowerCase().includes(lowSearch)
        );
    }, [weapons, searchTerm]);

    const isDeltaForce = slug === "delta-force";

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!juego) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/admin/juegos")} className="mt-0.5">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3 flex-1">
                    {juego.iconoPublicUrl ? (
                        <img src={juego.iconoPublicUrl} alt={juego.nombre} className="h-12 w-12 rounded-xl object-contain bg-muted/50 p-1" />
                    ) : (
                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                            <Gamepad2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{juego.nombre}</h1>
                        <p className="text-muted-foreground text-sm">/games/{juego.slug}</p>
                    </div>
                </div>
                <Link href={`/games/${juego.slug}`} target="_blank">
                    <Button variant="outline" size="sm">Ver página</Button>
                </Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit overflow-x-auto hide-scrollbar max-w-full">
                {[
                    { key: "modules", label: "Módulos", icon: Settings },
                    ...(isDeltaForce ? [
                        { key: "weapons", label: "Armas / Meta", icon: Sword },
                        { key: "reports", label: "Reportes", icon: Shield }
                    ] : []),
                ].map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key as typeof activeTab)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === key
                            ? "bg-background shadow text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* ─── Tab: Módulos ─────────────────────────────────────────── */}
            {activeTab === "modules" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {MODULE_TYPES.map((modType) => {
                        const enabled = isModuleEnabled(modType.key);
                        const isToggling = togglingModule === modType.key;
                        return (
                            <div
                                key={modType.key}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${enabled ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-muted"}`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold ${enabled ? "text-foreground" : "text-muted-foreground"}`}>
                                        {modType.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{modType.description}</p>
                                </div>
                                <button
                                    onClick={() => handleToggleModule(modType.key)}
                                    disabled={isToggling}
                                    className="ml-3 flex-shrink-0 focus:outline-none"
                                >
                                    {isToggling
                                        ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        : enabled
                                            ? <ToggleRight className="h-8 w-8 text-primary" />
                                            : <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                                    }
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Tab: Reportes (Delta Force) ───────────────────────────── */}
            {activeTab === "reports" && isDeltaForce && (
                <WeaponReportsAdmin gameId={juego.id} />
            )}

            {/* ─── Tab: Armas (Delta Force) ─────────────────────────────── */}
            {activeTab === "weapons" && isDeltaForce && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-blue-600/10 flex items-center justify-center">
                                <Sword className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Catálogo de Armas</h2>
                                <p className="text-xs text-muted-foreground">
                                    {searchTerm ? (
                                        <span className="text-blue-600 font-bold">{filteredWeapons.length} resultados para "{searchTerm}"</span>
                                    ) : (
                                        `${weapons.length} armas registradas en ${WEAPON_CATEGORIES.filter(c => weapons.some(w => w.category === c)).length} categorías`
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre o slug..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-10 bg-background border-border/50 focus:border-blue-600/50 transition-all text-sm"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>

                            <div className="hidden sm:flex border bg-background rounded-lg p-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-[11px] font-bold px-2"
                                    onClick={() => toggleAllCategories(true)}
                                >
                                    Expandir todo
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-[11px] font-bold px-2 text-muted-foreground"
                                    onClick={() => toggleAllCategories(false)}
                                >
                                    Contraer todo
                                </Button>
                            </div>
                            <Button
                                onClick={() => { setEditingWeapon(null); setWeaponDialogOpen(true); }}
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95 h-10"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Nueva Arma
                            </Button>
                        </div>
                    </div>

                    {filteredWeapons.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <Package className="h-14 w-14 text-muted-foreground opacity-30 mb-4" />
                                <p className="text-muted-foreground font-medium">{searchTerm ? "No se encontraron resultados" : "No hay armas en el catálogo"}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {searchTerm
                                        ? "Buscamos por nombre y slug, pero no hubo suerte."
                                        : "Agrega la primera arma para que aparezca en el Meta de Delta Force"}
                                </p>
                                {searchTerm ? (
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => setSearchTerm("")}
                                    >
                                        Limpiar búsqueda
                                    </Button>
                                ) : (
                                    <Button
                                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => { setEditingWeapon(null); setWeaponDialogOpen(true); }}
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Agregar primera arma
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {WEAPON_CATEGORIES.map((catKey) => {
                                const categoryWeapons = filteredWeapons.filter(w => w.category === catKey);
                                if (categoryWeapons.length === 0) return null;
                                const isExpanded = expandedCategories[catKey] ?? true;

                                return (
                                    <Collapsible
                                        key={catKey}
                                        open={isExpanded}
                                        onOpenChange={() => toggleCategory(catKey)}
                                        className="space-y-4"
                                    >
                                        <CollapsibleTrigger asChild>
                                            <button className="flex items-center gap-4 w-full group text-left">
                                                <div className="flex items-center gap-3 flex-1 py-1">
                                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-3">
                                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${isExpanded ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-muted text-muted-foreground'}`}>
                                                            {categoryWeapons.length}
                                                        </span>
                                                        {CATEGORY_LABELS[catKey] || catKey}
                                                    </h3>
                                                    <div className={`h-px flex-1 transition-all duration-500 ${isExpanded ? 'bg-gradient-to-r from-blue-600/30 via-border to-transparent' : 'bg-border/40'}`} />
                                                </div>
                                                <div className={`p-1.5 rounded-full transition-all ${isExpanded ? 'bg-blue-600/10 text-blue-600' : 'bg-muted text-muted-foreground group-hover:bg-muted/80'}`}>
                                                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? '' : '-rotate-90'}`} />
                                                </div>
                                            </button>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent className="data-[state=closed]:animate-fadeOut data-[state=open]:animate-fadeIn overflow-hidden">
                                            <motion.div
                                                layout
                                                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-2"
                                            >
                                                <AnimatePresence mode="popLayout">
                                                    {categoryWeapons.map((weapon) => (
                                                        <motion.div
                                                            key={weapon.id}
                                                            layout
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0, transition: { duration: 0.2 } }}
                                                            transition={{ duration: 0.3 }}
                                                        >
                                                            <Card
                                                                className={`h-full overflow-hidden transition-all border group/card ${!weapon.is_active
                                                                    ? "opacity-60 border-border bg-muted/30"
                                                                    : "border-border hover:border-blue-600/40 hover:shadow-md hover:shadow-blue-500/5 bg-background"
                                                                    }`}
                                                            >
                                                                {/* Imagen */}
                                                                <div className="relative h-28 bg-muted/40 flex items-center justify-center overflow-hidden border-b border-border group-hover/card:bg-muted/20 transition-colors">
                                                                    {weapon.image_url ? (
                                                                        <img
                                                                            src={weapon.image_url}
                                                                            alt={weapon.name}
                                                                            className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover/card:scale-105"
                                                                        />
                                                                    ) : (
                                                                        <div className="text-center">
                                                                            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
                                                                            <p className="text-[10px] mt-1 text-muted-foreground/60">Sin imagen</p>
                                                                        </div>
                                                                    )}
                                                                    {!weapon.is_active && (
                                                                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                                                                            <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground bg-background/50">Inactiva</Badge>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <CardContent className="p-4 space-y-3">
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <p className="font-bold text-sm leading-tight truncate text-foreground group-hover/card:text-blue-600 transition-colors">{weapon.name}</p>
                                                                            {weapon.is_active ? (
                                                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                                            ) : null}
                                                                        </div>
                                                                    </div>

                                                                    {/* Slug indicator */}
                                                                    <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/50 border border-border/50">
                                                                        <Package className="h-3 w-3 text-muted-foreground" />
                                                                        <p className="text-[10px] font-mono text-muted-foreground truncate">
                                                                            {weapon.slug}
                                                                        </p>
                                                                    </div>

                                                                    {/* Actions */}
                                                                    <div className="flex gap-2 pt-1 border-t border-border/30">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="flex-1 h-8 text-[11px] font-bold hover:bg-blue-600/5 hover:text-blue-600 border border-transparent hover:border-blue-600/20"
                                                                            onClick={() => { setEditingWeapon(weapon); setWeaponDialogOpen(true); }}
                                                                        >
                                                                            <Pencil className="h-3 w-3 mr-1.5" />
                                                                            Editar
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 border border-transparent"
                                                                            onClick={() => setDeleteWeapon(weapon)}
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                            </motion.div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Dialogs ────────────────────────────────────────────────── */}
            <WeaponFormDialog
                open={weaponDialogOpen}
                onOpenChange={setWeaponDialogOpen}
                weapon={editingWeapon}
                gameId={juego.id}
                existingWeapons={weapons}
                onSuccess={() => fetchAll(false)}
            />

            <AlertDialog open={!!deleteWeapon} onOpenChange={(v) => !v && setDeleteWeapon(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar {deleteWeapon?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el arma y su imagen del servidor. Las estadísticas históricas de la comunidad se conservarán pero no se asociarán a ningún arma del catálogo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteWeapon}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deletingId ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
