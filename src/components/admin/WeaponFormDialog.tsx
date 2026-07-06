"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ToggleLeft, ToggleRight } from "lucide-react";

export interface DeltaWeapon {
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

export function WeaponFormDialog({
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

    const [configureBaseStats, setConfigureBaseStats] = useState(false);
    const [calibersList, setCalibersList] = useState<any[]>([]);
    const [baseStats, setBaseStats] = useState({
        caliber: "",
        base_damage: "",
        base_fire_rate: 0,
        base_control: 0,
        base_handling: 0,
        base_stability: 0,
        base_accuracy: 0,
        base_range: 0,
        base_capacity: 0,
        base_muzzle_velocity: 0,
        base_armor_penetration: "0",
    });

    useEffect(() => {
        if (configureBaseStats && calibersList.length === 0) {
            fetch("/api/games/delta-force/base-data?type=calibers")
                .then(res => res.json())
                .then(data => {
                    if (data.calibers) {
                        setCalibersList(data.calibers);
                        if (!baseStats.caliber && data.calibers.length > 0) {
                            setBaseStats(prev => ({ ...prev, caliber: data.calibers[0].name }));
                        }
                    }
                })
                .catch(err => console.error(err));
        }
    }, [configureBaseStats, calibersList.length, baseStats.caliber]);

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
        const duplicateNameFound = existingWeapons.some(w =>
            w.name.toLowerCase() === name.toLowerCase() && w.id !== weapon?.id
        );
        if (duplicateNameFound || isDuplicateSlug) {
            toast({
                title: "No se puede guardar",
                description: duplicateNameFound ? "Ya existe un arma con este nombre." : "Ya existe un arma con este slug.",
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

            // 3. Guardar stats base si se seleccionó
            if (configureBaseStats && !weapon) {
                const baseMode = "operations"; 
                const basePayload = {
                    table: "delta_force_weapons_base",
                    weapon_name: name,
                    category: CATEGORY_LABELS[category] || category,
                    game_mode: baseMode,
                    ...baseStats,
                    caliber: baseStats.caliber === "" ? null : baseStats.caliber
                };
                
                const baseRes = await fetch("/api/games/delta-force/base-data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(basePayload),
                });
                
                if (!baseRes.ok) {
                    console.error("Error guardando estadisticas base");
                }
            }

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
            <DialogContent className="max-w-2xl border-zinc-200/50 dark:border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{weapon ? "Editar Arma" : "Nueva Arma Meta"}</DialogTitle>
                    <DialogDescription>
                        {weapon ? "Modifica los datos del arma." : "Agrega una nueva arma al catálogo oficial de Delta Force."}
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

                    {/* Configurar Base Stats */}
                    {!weapon && (
                        <div className="space-y-4 pt-2 border-t border-border mt-2">
                            <div className={`flex items-center justify-between rounded-lg p-3 border transition-colors ${configureBaseStats ? "border-df-green-500/30 bg-df-green-500/5" : "border-border bg-muted/30"}`}>
                                <div>
                                    <p className="text-sm font-medium text-foreground">Configurar Estadísticas Base</p>
                                    <p className="text-xs text-muted-foreground">Agregar el calibre y las barras de stats ahora</p>
                                </div>
                                <button onClick={() => setConfigureBaseStats(!configureBaseStats)} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-df-green-500 rounded">
                                    {configureBaseStats
                                        ? <ToggleRight className="h-8 w-8 text-df-green-500" />
                                        : <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                                    }
                                </button>
                            </div>

                            {configureBaseStats && (
                                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-1.5 col-span-2">
                                        <Label>Calibre</Label>
                                        <Select value={baseStats.caliber} onValueChange={(v) => setBaseStats(prev => ({ ...prev, caliber: v }))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona calibre..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {calibersList.map(c => (
                                                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Daño Base</Label>
                                        <Input value={baseStats.base_damage} onChange={e => setBaseStats(prev => ({ ...prev, base_damage: e.target.value }))} placeholder="Ej: 33" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Cadencia</Label>
                                        <Input type="number" value={baseStats.base_fire_rate || ""} onChange={e => setBaseStats(prev => ({ ...prev, base_fire_rate: Number(e.target.value) }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Control</Label>
                                        <Input type="number" value={baseStats.base_control || ""} onChange={e => setBaseStats(prev => ({ ...prev, base_control: Number(e.target.value) }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Manejo</Label>
                                        <Input type="number" value={baseStats.base_handling || ""} onChange={e => setBaseStats(prev => ({ ...prev, base_handling: Number(e.target.value) }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Estabilidad</Label>
                                        <Input type="number" value={baseStats.base_stability || ""} onChange={e => setBaseStats(prev => ({ ...prev, base_stability: Number(e.target.value) }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Precisión</Label>
                                        <Input type="number" value={baseStats.base_accuracy || ""} onChange={e => setBaseStats(prev => ({ ...prev, base_accuracy: Number(e.target.value) }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Alcance</Label>
                                        <Input type="number" value={baseStats.base_range || ""} onChange={e => setBaseStats(prev => ({ ...prev, base_range: Number(e.target.value) }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Capacidad</Label>
                                        <Input type="number" value={baseStats.base_capacity || ""} onChange={e => setBaseStats(prev => ({ ...prev, base_capacity: Number(e.target.value) }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Velocidad de boca</Label>
                                        <Input type="number" value={baseStats.base_muzzle_velocity || ""} onChange={e => setBaseStats(prev => ({ ...prev, base_muzzle_velocity: Number(e.target.value) }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Perf. de armadura</Label>
                                        <Input value={baseStats.base_armor_penetration} onChange={e => setBaseStats(prev => ({ ...prev, base_armor_penetration: e.target.value }))} placeholder="Ej: 0" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving || isDuplicateName || isDuplicateSlug}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                        {weapon ? "Guardar cambios" : "Crear arma meta"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
