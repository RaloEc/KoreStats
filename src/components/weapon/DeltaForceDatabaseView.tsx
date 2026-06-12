import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
    Shield,
    Swords,
    Wind,
    Package,
    Scale,
    Volume2,
    Eye,
    ChevronRight,
    Search,
    Edit,
    Trash2,
    Plus,
    X,
    Loader2,
    Activity,
    Focus,
    Gauge,
    Target,
    Zap,
    Clock,
    Crosshair,
    User,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BaseWeapon, BaseAmmo, BaseGear, BaseCaliber, calculateDamagePenetration } from "@/lib/delta-force/defaultData";

export const getCaliberImages = (urlStr: string | null | undefined): string[] => {
    if (!urlStr) return [];
    const trimmed = urlStr.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.filter(url => typeof url === "string" && url.trim() !== "");
            }
        } catch (e) {
            console.error("Error parsing caliber image_url JSON:", e);
        }
    }
    return [trimmed];
};

export const getFirstImageUrl = (urlStr: string | null | undefined): string => {
    const urls = getCaliberImages(urlStr);
    return urls.length > 0 ? urls[0] : "";
};

const CATEGORY_MAP: Record<string, string> = {
    "Assault": "Fusil de asalto",
    "Marksman": "Fusil de tirador",
    "Sniper": "Rifle de francotirador",
    "SMG": "Subfusil",
    "LMG": "Ametralladora ligera",
    "Secondary": "Pistola / Secundaria",
    "Shotgun": "Escopeta",
    "Special": "Arma Especial",
    "Fusil de asalto": "Fusil de asalto",
    "Fusil de batalla": "Fusil de batalla",
    "Rifle de francotirador": "Rifle de francotirador",
    "Subfusil": "Subfusil",
    "Ametralladora ligera": "Ametralladora ligera",
    "Pistola": "Pistola / Secundaria",
    "Escopeta": "Escopeta",
    "Arma Especial": "Arma Especial",
};

const getCategoryLabel = (category: string) => {
    return CATEGORY_MAP[category] || category;
};

const parseNumericValue = (val: string | number | null | undefined): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim().toLowerCase();
    if (str.includes('x')) {
        const parts = str.split('x');
        const num1 = parseFloat(parts[0]) || 0;
        const num2 = parseFloat(parts[1]) || 1;
        return num1 * num2;
    }
    return parseFloat(str) || 0;
};

const BASE_STAT_BARS = [
    { key: "base_damage", label: "Daño Base", icon: Crosshair, max: 60, unit: "" },
    { key: "base_range", label: "Alcance", icon: Target, max: 100, unit: "m" },
    { key: "base_control", label: "Control", icon: Activity, max: 100, unit: "" },
    { key: "base_handling", label: "Manejo", icon: Zap, max: 100, unit: "" },
    { key: "base_stability", label: "Estabilidad", icon: Gauge, max: 100, unit: "" },
    { key: "base_accuracy", label: "Precisión", icon: Focus, max: 100, unit: "" },
] as const;

// Stat solo de Operaciones
const ARMOR_PEN_STAT = { key: "base_armor_penetration", label: "Perf. Blindaje", icon: Shield, max: 100, unit: "" };

const ARMOR_LEVEL_COLORS: Record<number, string> = {
    1: "text-zinc-500 dark:text-zinc-300",      // Blanco/Gris claro
    2: "text-emerald-500 dark:text-emerald-400",  // Verde
    3: "text-sky-500 dark:text-sky-400",          // Celeste
    4: "text-purple-500 dark:text-purple-400",    // Morado
    5: "text-amber-500 dark:text-amber-400",      // Dorado
    6: "text-red-500 dark:text-red-400",          // Rojo
};

interface DatabaseResponse {
    weapons?: BaseWeapon[];
    ammo?: BaseAmmo[];
    gear?: BaseGear[];
    calibers?: BaseCaliber[];
}

interface DeltaForceDatabaseViewProps {
    subTab?: "weapons" | "ammo" | "gear";
    setSubTab?: (tab: "weapons" | "ammo" | "gear") => void;
    searchQuery?: string;
    setSearchQuery?: (query: string) => void;
    showHeader?: boolean;
}

export default function DeltaForceDatabaseView({
    subTab: externalSubTab,
    setSubTab: externalSetSubTab,
    searchQuery: externalSearchQuery,
    setSearchQuery: externalSetSearchQuery,
    showHeader = true,
}: DeltaForceDatabaseViewProps = {}) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    
    const [localSubTab, localSetSubTab] = useState<"weapons" | "ammo" | "gear">("weapons");
    const subTab = externalSubTab !== undefined ? externalSubTab : localSubTab;
    const setSubTab = externalSetSubTab !== undefined ? externalSetSubTab : localSetSubTab;

    const [gameMode, setGameMode] = useState<"operations" | "warfare">("operations");

    const [localSearchQuery, localSetSearchQuery] = useState("");
    const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
    const setSearchQuery = externalSetSearchQuery !== undefined ? externalSetSearchQuery : localSetSearchQuery;

    const [weaponSearchInForm, setWeaponSearchInForm] = useState("");
    
    // Accordion State for calibers in Ammo Tab
    const [expandedCalibers, setExpandedCalibers] = useState<Record<string, boolean>>({});

    // Accordion State for tiers in Gear Tab (false = collapsed by default, true = expanded)
    const [expandedTiers, setExpandedTiers] = useState<Record<number, boolean>>({});

    // Accordion State for weapon categories in Weapons Tab (false = collapsed by default)
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    // CRUD State
    const [activeFormType, setActiveFormType] = useState<"weapons" | "ammo" | "gear" | "calibers">("weapons");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editMode, setEditMode] = useState<"add" | "edit">("add");
    const [activeId, setActiveId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [tempCaliberImageUrl, setTempCaliberImageUrl] = useState("");

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState<{
        id: string;
        name: string;
        type: "weapons" | "ammo" | "gear" | "calibers";
    } | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Form fields
    const [weaponFields, setWeaponFields] = useState({
        weapon_name: "",
        category: "Fusil de asalto",
        caliber: "",
        base_damage: "33",
        base_fire_rate: 800,
        base_control: 65,
        base_handling: 70,
        base_stability: 68,
        base_accuracy: 65,
        base_range: 60,
        base_capacity: 30,
        base_muzzle_velocity: 880,
        base_armor_penetration: "20",
        image_url: "",
    });

    const [ammoFields, setAmmoFields] = useState({
        name: "",
        caliber: "",
        description: "",
        penetration_level: 3,
        damage_ratio: 100,
        armor_pen_degradation: "bajo" as "bajo" | "medio" | "alto",
        pen_falloff_coefficient: 0,
        damage_vs_armor_1: 100,
        damage_vs_armor_2: 100,
        damage_vs_armor_3: 100,
        damage_vs_armor_4: 100,
        damage_vs_armor_5: 100,
        damage_vs_armor_6: 100,
        image_url: "",
        compatible_weapons: [] as string[],
        body_damage: "",
        armor_penetration: "",
    });

    const [caliberFields, setCaliberFields] = useState({
        name: "",
        image_urls: [] as string[],
        weapons: [] as string[],
    });

    const [gearFields, setGearFields] = useState({
        name: "",
        type: "armor" as "armor" | "helmet",
        tier: 4,
        max_durability: 70,
        material: "Cerámica",
        speed_penalty: -3, // stored as double, input as percentage
        ergo_penalty: -3,  // stored as double, input as percentage
        zones_protected: ["pecho"] as string[],
        image_url: "",
        repair_efficiency: "medio" as "bajo" | "medio" | "alto",
        durability_cost: "medio" as "bajo" | "medio" | "alto",
        weight_kg: 0.0,
        description: "",
    });

    // Helper for uploading images
    const handleImageUpload = async (file: File, folder: string, callback: (url: string) => void) => {
        setUploadingImage(true);
        setErrorMsg(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", folder);

            const res = await fetch("/api/admin/imagenes", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (!res.ok || !data.success || !data.url) {
                throw new Error(data.error || "Error al subir la imagen");
            }

            callback(data.url);
        } catch (err: any) {
            setErrorMsg(`Error al subir imagen: ${err.message}`);
        } finally {
            setUploadingImage(false);
        }
    };

    // Fetch Base Weapons — refetch when gameMode changes
    const { data: weaponsData, isLoading: loadingWeapons } = useQuery<DatabaseResponse>({
        queryKey: ["df-base-weapons", gameMode],
        queryFn: async () => {
            const res = await fetch(`/api/games/delta-force/base-data?type=weapons&mode=${gameMode}`);
            if (!res.ok) throw new Error("Failed to fetch weapons");
            return res.json();
        },
    });

    // Fetch Base Ammo
    const { data: ammoData, isLoading: loadingAmmo } = useQuery<DatabaseResponse>({
        queryKey: ["df-base-ammo"],
        queryFn: async () => {
            const res = await fetch("/api/games/delta-force/base-data?type=ammo");
            if (!res.ok) throw new Error("Failed to fetch ammo");
            return res.json();
        },
    });

    // Fetch Base Calibers
    const { data: calibersData, isLoading: loadingCalibers } = useQuery<DatabaseResponse>({
        queryKey: ["df-base-calibers"],
        queryFn: async () => {
            const res = await fetch("/api/games/delta-force/base-data?type=calibers");
            if (!res.ok) throw new Error("Failed to fetch calibers");
            return res.json();
        },
    });

    // Fetch Base Gear
    const { data: gearData, isLoading: loadingGear } = useQuery<DatabaseResponse>({
        queryKey: ["df-base-gear"],
        queryFn: async () => {
            const res = await fetch("/api/games/delta-force/base-data?type=gear");
            if (!res.ok) throw new Error("Failed to fetch gear");
            return res.json();
        },
    });

    const weapons = weaponsData?.weapons || [];
    const ammo = ammoData?.ammo || [];
    const gear = gearData?.gear || [];
    const calibersList = calibersData?.calibers || [];

    // Filter calculations
    const filteredWeapons = weapons.filter((w) =>
        w.weapon_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredGear = gear.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedGear = useMemo(() => {
        const groups: Record<number, BaseGear[]> = {};
        filteredGear.forEach((g) => {
            const t = g.tier ?? 1;
            if (!groups[t]) groups[t] = [];
            groups[t].push(g);
        });
        return Object.keys(groups)
            .map(Number)
            .sort((a, b) => b - a)
            .map((tier) => ({
                tier,
                items: groups[tier],
            }));
    }, [filteredGear]);

    const groupedWeapons = useMemo(() => {
        const groups: Record<string, any[]> = {};
        filteredWeapons.forEach((w) => {
            const cat = w.category || "Otros";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(w);
        });

        // Orden de visualización estándar de armas
        const order = [
            "Assault", "Fusil de asalto",
            "Fusil de batalla",
            "Marksman", "Fusil de tirador",
            "Sniper", "Rifle de francotirador",
            "SMG", "Subfusil",
            "LMG", "Ametralladora ligera",
            "Shotgun", "Escopeta",
            "Secondary", "Pistola / Secundaria", "Pistola",
            "Special", "Arma Especial"
        ];

        return Object.keys(groups).sort((a, b) => {
            let idxA = order.indexOf(a);
            let idxB = order.indexOf(b);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            if (idxA !== idxB) return idxA - idxB;
            return a.localeCompare(b);
        }).map((category) => ({
            category,
            items: groups[category],
        }));
    }, [filteredWeapons]);

    const filteredCalibers = calibersList.filter((c) => {
        const query = searchQuery.toLowerCase();
        const matchesCaliberName = c.name && c.name.toLowerCase().includes(query);
        const caliberAmmo = ammo.filter(a => a.caliber && a.caliber.toLowerCase() === c.name.toLowerCase());
        const matchesAmmo = caliberAmmo.some(a => a.name && a.name.toLowerCase().includes(query));
        const caliberWeapons = weapons.filter(w => w.caliber && w.caliber.toLowerCase() === c.name.toLowerCase());
        const matchesWeapon = caliberWeapons.some(w => w.weapon_name && w.weapon_name.toLowerCase().includes(query));
        return matchesCaliberName || matchesAmmo || matchesWeapon;
    });

    const filteredAmmo = (() => {
        const queryClean = searchQuery.trim();
        if (!queryClean) return [];
        const terms = queryClean.toLowerCase().split(/\s+/).filter(Boolean);
        return ammo.filter((a) => {
            const caliberWeapons = weapons.filter(w => w.caliber && a.caliber && w.caliber.toLowerCase() === a.caliber.toLowerCase());
            return terms.every((term) => {
                const matchesAmmoName = a.name && a.name.toLowerCase().includes(term);
                const matchesCaliber = a.caliber && a.caliber.toLowerCase().includes(term);
                const matchesWeapon = caliberWeapons.some(w => w.weapon_name && w.weapon_name.toLowerCase().includes(term));
                return matchesAmmoName || matchesCaliber || matchesWeapon;
            });
        }).sort((a, b) => {
            const calCompare = (a.caliber || "").localeCompare(b.caliber || "");
            if (calCompare !== 0) return calCompare;
            return (a.penetration_level ?? 0) - (b.penetration_level ?? 0);
        });
    })();

    const isLoading = loadingWeapons || loadingAmmo || loadingGear || loadingCalibers;

    // Bullet Level color mapping
    const getTierColors = (tier: number) => {
        switch (tier) {
            case 6: return { text: "text-red-500", bg: "bg-red-500/10 border-red-500/30", label: "Nivel 6" };
            case 5: return { text: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30", label: "Nivel 5" };
            case 4: return { text: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/30", label: "Nivel 4" };
            case 3: return { text: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30", label: "Nivel 3" };
            case 2: return { text: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", label: "Nivel 2" };
            default: return { text: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20", label: "Nivel 1" };
        }
    };

    // Open Add Form
    const handleAddClick = (type: "weapons" | "ammo" | "gear" | "calibers", defaultCaliber?: string) => {
        setEditMode("add");
        setActiveFormType(type);
        setActiveId(null);
        setErrorMsg(null);
        setWeaponSearchInForm("");
        setTempCaliberImageUrl("");
        if (type === "weapons") {
            setWeaponFields({
                weapon_name: "",
                category: "Fusil de asalto",
                caliber: calibersList[0]?.name || "",
                base_damage: "33",
                base_fire_rate: 800,
                base_control: 65,
                base_handling: 70,
                base_stability: 68,
                base_accuracy: 65,
                base_range: 60,
                base_capacity: 30,
                base_muzzle_velocity: 880,
                base_armor_penetration: "20",
                image_url: "",
            });
        } else if (type === "ammo") {
            setAmmoFields({
                name: "",
                caliber: defaultCaliber || calibersList[0]?.name || "",
                description: "",
                penetration_level: 3,
                damage_ratio: 100,
                armor_pen_degradation: "bajo",
                pen_falloff_coefficient: 0,
                damage_vs_armor_1: 100,
                damage_vs_armor_2: 100,
                damage_vs_armor_3: 100,
                damage_vs_armor_4: 100,
                damage_vs_armor_5: 100,
                damage_vs_armor_6: 100,
                image_url: "",
                compatible_weapons: [],
                body_damage: "",
                armor_penetration: "",
            });
        } else if (type === "calibers") {
            setCaliberFields({
                name: "",
                image_urls: [],
                weapons: [],
            });
        } else if (type === "gear") {
            setGearFields({
                name: "",
                type: "armor",
                tier: 4,
                max_durability: 70,
                material: "Cerámica",
                speed_penalty: -3,
                ergo_penalty: -3,
                zones_protected: ["pecho"],
                image_url: "",
                repair_efficiency: "medio",
                durability_cost: "medio",
                weight_kg: 0.0,
                description: "",
            });
        }
        setIsFormOpen(true);
    };

    // Open Configure Stats Form (for weapons without base stats)
    const handleConfigureStats = (item: any) => {
        setEditMode("add");
        setActiveFormType("weapons");
        setActiveId(null);
        setErrorMsg(null);
        setWeaponFields({
            weapon_name: item.weapon_name,
            category: item.category,
            caliber: item.caliber || calibersList[0]?.name || "",
            base_damage: item.base_damage || 33,
            base_fire_rate: item.base_fire_rate || 800,
            base_control: item.base_control || 65,
            base_handling: item.base_handling || 70,
            base_stability: item.base_stability || 68,
            base_accuracy: item.base_accuracy || 65,
            base_range: item.base_range || 60,
            base_capacity: item.base_capacity || 30,
            base_muzzle_velocity: item.base_muzzle_velocity || 880,
            base_armor_penetration: item.base_armor_penetration || 20,
            image_url: item.image_url || "",
        });
        setIsFormOpen(true);
    };

    // Open Edit Form
    const handleEditClick = (item: any, type: "weapons" | "ammo" | "gear" | "calibers") => {
        setEditMode("edit");
        setActiveFormType(type);
        setActiveId(item.base_id || item.id);
        setErrorMsg(null);
        setWeaponSearchInForm("");
        setTempCaliberImageUrl("");
        if (type === "weapons") {
            setWeaponFields({
                weapon_name: item.weapon_name,
                category: item.category,
                caliber: item.caliber || calibersList[0]?.name || "",
                base_damage: item.base_damage ? String(item.base_damage) : "0",
                base_fire_rate: item.base_fire_rate,
                base_control: item.base_control,
                base_handling: item.base_handling,
                base_stability: item.base_stability,
                base_accuracy: item.base_accuracy,
                base_range: item.base_range,
                base_capacity: item.base_capacity,
                base_muzzle_velocity: item.base_muzzle_velocity,
                base_armor_penetration: item.base_armor_penetration ? String(item.base_armor_penetration) : "0",
                image_url: item.image_url || "",
            });
        } else if (type === "ammo") {
            setAmmoFields({
                name: item.name,
                caliber: item.caliber,
                description: item.description || "",
                penetration_level: item.penetration_level ?? 0,
                damage_ratio: item.damage_ratio ?? 100,
                armor_pen_degradation: item.armor_pen_degradation || "bajo",
                pen_falloff_coefficient: item.pen_falloff_coefficient ?? 0,
                damage_vs_armor_1: item.damage_vs_armor_1 ?? 100,
                damage_vs_armor_2: item.damage_vs_armor_2 ?? 100,
                damage_vs_armor_3: item.damage_vs_armor_3 ?? 100,
                damage_vs_armor_4: item.damage_vs_armor_4 ?? 100,
                damage_vs_armor_5: item.damage_vs_armor_5 ?? 100,
                damage_vs_armor_6: item.damage_vs_armor_6 ?? 100,
                image_url: item.image_url || "",
                compatible_weapons: item.compatible_weapons || [],
                body_damage: item.body_damage || "",
                armor_penetration: item.armor_penetration ? String(item.armor_penetration) : "",
            });
        } else if (type === "calibers") {
            // Obtener armas asociadas a este calibre comparando insensible a mayúsculas/minúsculas
            const associatedWeapons = weapons
                .filter((w: any) => w.caliber?.toLowerCase() === item.name?.toLowerCase())
                .map((w: any) => w.weapon_name);
            const uniqueAssociated = Array.from(new Set(associatedWeapons));

            setCaliberFields({
                name: item.name,
                image_urls: getCaliberImages(item.image_url),
                weapons: uniqueAssociated,
            });
        } else if (type === "gear") {
            setGearFields({
                name: item.name,
                type: item.type,
                tier: item.tier,
                max_durability: item.max_durability,
                material: item.material,
                speed_penalty: item.speed_penalty * 100, // convert back to percentage for UI
                ergo_penalty: item.ergo_penalty * 100,   // convert back to percentage for UI
                zones_protected: item.zones_protected || (item.type === "armor" ? ["pecho"] : []),
                image_url: item.image_url || "",
                repair_efficiency: item.repair_efficiency || "medio",
                durability_cost: item.durability_cost || "medio",
                weight_kg: item.weight_kg ?? 0.0,
                description: item.description || "",
            });
        }
        setIsFormOpen(true);
    };

    // Handle Delete Click (Opens Modal)
    const handleDeleteClick = (id: string, name: string, type: "weapons" | "ammo" | "gear" | "calibers") => {
        setDeleteError(null);
        setDeleteConfirm({ id, name, type });
    };

    // Execute Delete Action
    const executeDelete = async () => {
        if (!deleteConfirm) return;
        const { id, type } = deleteConfirm;

        const table = type === "weapons"
            ? "delta_force_weapons_base"
            : type === "ammo"
            ? "delta_force_ammo"
            : type === "calibers"
            ? "delta_force_calibers"
            : "delta_force_gear";

        setSubmitting(true);
        setDeleteError(null);

        try {
            const res = await fetch(`/api/games/delta-force/base-data?table=${table}&id=${id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || "Error al eliminar");
            }
            
            // Invalidate queries
            const queryKey = type === "weapons"
                ? "df-base-weapons"
                : type === "ammo"
                ? "df-base-ammo"
                : type === "calibers"
                ? "df-base-calibers"
                : "df-base-gear";
                
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            if (type === "calibers") {
                // Si eliminamos calibres, también invalidar las balas y las armas desvinculadas en cascada
                queryClient.invalidateQueries({ queryKey: ["df-base-ammo"] });
                queryClient.invalidateQueries({ queryKey: ["df-base-weapons"] });
            }
            setDeleteConfirm(null);
        } catch (err: any) {
            setDeleteError(err.message || "Ocurrió un error inesperado al eliminar el elemento.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDamageVsArmorChange = (n: number, valueStr: string) => {
        const val = parseInt(valueStr);
        setAmmoFields(prev => ({
            ...prev,
            [`damage_vs_armor_${n}`]: isNaN(val) ? 0 : val
        }));
    };

    // Handle Form Submit
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg(null);

        const table = activeFormType === "weapons"
            ? "delta_force_weapons_base"
            : activeFormType === "ammo"
            ? "delta_force_ammo"
            : activeFormType === "calibers"
            ? "delta_force_calibers"
            : "delta_force_gear";

        let payload: any = {};
        if (activeFormType === "weapons") {
            payload = {
                ...weaponFields,
                game_mode: gameMode,
                // In warfare mode, armor penetration is always 0
                base_armor_penetration: gameMode === "operations" ? weaponFields.base_armor_penetration : 0,
            };
        } else if (activeFormType === "ammo") {
            payload = { ...ammoFields };
        } else if (activeFormType === "calibers") {
            payload = {
                name: caliberFields.name,
                image_url: JSON.stringify(caliberFields.image_urls),
                weapons: caliberFields.weapons
            };
        } else if (activeFormType === "gear") {
            payload = {
                ...gearFields,
                speed_penalty: gearFields.speed_penalty / 100,
                ergo_penalty: gearFields.ergo_penalty / 100,
            };
        }

        if (editMode === "edit" && activeId) {
            payload.id = activeId;
        }
        payload.table = table;

        try {
            console.log("[DeltaForceDatabaseView] Enviando formulario para", activeFormType, "payload:", payload);
            const res = await fetch("/api/games/delta-force/base-data", {
                method: editMode === "add" ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            console.log("[DeltaForceDatabaseView] Respuesta del servidor:", data);
            if (data.logs && Array.isArray(data.logs)) {
                console.log("[DeltaForceDatabaseView] Trazas de sincronización del servidor:\n" + data.logs.join("\n"));
            }

            if (!res.ok || data.error) {
                const errMsg = data.error || "Error al procesar la solicitud";
                if (data.logs && Array.isArray(data.logs)) {
                    throw new Error(`${errMsg}\nDetalles:\n${data.logs.slice(-3).join("\n")}`);
                }
                throw new Error(errMsg);
            }

            // Success
            if (activeFormType === "weapons") {
                queryClient.invalidateQueries({ queryKey: ["df-base-weapons", gameMode] });
            } else if (activeFormType === "calibers") {
                queryClient.invalidateQueries({ queryKey: ["df-base-calibers"] });
                queryClient.invalidateQueries({ queryKey: ["df-base-ammo"] }); // Se autogeneran balas al crear calibres
                queryClient.invalidateQueries({ queryKey: ["df-base-weapons"] }); // Las armas se asocian al calibre
            } else {
                queryClient.invalidateQueries({ queryKey: [activeFormType === "ammo" ? "df-base-ammo" : "df-base-gear"] });
            }
            setIsFormOpen(false);
        } catch (err: any) {
            console.error("[DeltaForceDatabaseView] Error guardando formulario:", err);
            setErrorMsg(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleZone = (zone: string) => {
        setGearFields(prev => {
            const exists = prev.zones_protected.includes(zone);
            return {
                ...prev,
                zones_protected: exists
                    ? prev.zones_protected.filter(z => z !== zone)
                    : [...prev.zones_protected, zone]
            };
        });
    };

    return (
        <div className="space-y-6 relative">
            {/* Header / Sub-tabs selector */}
            {showHeader && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border/60 pb-4 relative min-h-[56px] w-full">
                    {/* Left placeholder to balance the absolute centered switch */}
                    <div className="hidden md:block w-48 shrink-0" />

                    <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-900/80 border border-gray-200 dark:border-white/5 rounded-xl overflow-x-auto max-w-full md:absolute md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 z-10">
                        <button
                            onClick={() => { setSubTab("weapons"); setSearchQuery(""); }}
                            className={cn(
                                "px-5 py-2 rounded-lg text-[0.6875rem] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shrink-0",
                                subTab === "weapons"
                                    ? "bg-white dark:bg-zinc-800 text-foreground shadow border border-gray-200/60 dark:border-gray-700/60"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Swords className="w-3.5 h-3.5" />
                            Armas Base
                        </button>
                        <button
                            onClick={() => { setSubTab("ammo"); setSearchQuery(""); }}
                            className={cn(
                                "px-5 py-2 rounded-lg text-[0.6875rem] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shrink-0",
                                subTab === "ammo"
                                    ? "bg-white dark:bg-zinc-800 text-foreground shadow border border-gray-200/60 dark:border-gray-700/60"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Wind className="w-3.5 h-3.5" />
                            Municiones
                        </button>
                        <button
                            onClick={() => { setSubTab("gear"); setSearchQuery(""); }}
                            className={cn(
                                "px-5 py-2 rounded-lg text-[0.6875rem] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shrink-0",
                                subTab === "gear"
                                    ? "bg-white dark:bg-zinc-800 text-foreground shadow border border-gray-200/60 dark:border-gray-700/60"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Shield className="w-3.5 h-3.5" />
                            Protección
                        </button>
                    </div>

                    {/* Search, Filters and Admin Add Button */}
                    <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto shrink-0 justify-end z-20">
                        <div className="relative flex-1 md:w-64 group">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground group-focus-within:text-df-green-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={`Buscar ${subTab === "weapons" ? "armas" : subTab === "ammo" ? "calibres o balas" : "equipamiento"}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 w-full text-xs bg-white dark:bg-zinc-950 border border-border/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-df-green-500/50"
                            />
                        </div>

                        {user && (
                            <>
                                {subTab === "gear" && (
                                    <button
                                        onClick={() => handleAddClick("gear")}
                                        className="px-3 py-2 rounded-xl bg-df-green-500 hover:bg-df-green-600 transition-all text-xs text-white font-black uppercase flex items-center gap-1.5 shadow-sm shadow-df-green-500/25 animate-in fade-in duration-200"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Agregar
                                    </button>
                                )}
                                {subTab === "ammo" && (
                                    <div className="flex gap-2 animate-in fade-in duration-200">
                                        <button
                                            onClick={() => handleAddClick("calibers")}
                                            className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-border/60 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-xs text-foreground font-black uppercase flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Nuevo Calibre
                                        </button>
                                        <button
                                            onClick={() => handleAddClick("ammo")}
                                            className="px-3 py-2 rounded-xl bg-df-green-500 hover:bg-df-green-600 transition-all text-xs text-white font-black uppercase flex items-center gap-1.5 shadow-sm shadow-df-green-500/25"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Nueva Munición
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {subTab === "weapons" && (
                <div className="space-y-3">
                    {/* MODE SWITCH */}
                    <div className="flex items-center justify-center">
                        <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-900 border border-border/60 rounded-xl gap-1">
                            <button
                                onClick={() => setGameMode("operations")}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200",
                                    gameMode === "operations"
                                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Shield className="w-3.5 h-3.5" />
                                Operaciones
                            </button>
                            <button
                                onClick={() => setGameMode("warfare")}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200",
                                    gameMode === "warfare"
                                        ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Swords className="w-3.5 h-3.5" />
                                Warfare
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-df-green-500"></div>
                    <span className="text-xs text-muted-foreground">Cargando base de datos oficial...</span>
                </div>
            )}

            {!isLoading && (
                <>
                    {/* WEAPONS SUB TAB */}
                    {subTab === "weapons" && (
                        <div className="space-y-6">
                            {groupedWeapons.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-3 text-muted-foreground bg-white dark:bg-zinc-950 border border-border/60 rounded-2xl">
                                    <Swords className="w-10 h-10 opacity-20" />
                                    <p className="text-sm font-semibold">No se encontraron armas base</p>
                                    <p className="text-xs opacity-60">Prueba con otra búsqueda o configura una nueva arma.</p>
                                </div>
                            ) : (
                                groupedWeapons.map(({ category, items }) => {
                                    const isExpanded = !!expandedCategories[category] || searchQuery.trim() !== "";
                                    const categoryLabel = getCategoryLabel(category);
                                    
                                    return (
                                        <div key={category} className="space-y-2">
                                            {/* Collapsible Header */}
                                            <div
                                                onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                                                className="flex items-center gap-3 cursor-pointer select-none group/category-header py-1"
                                            >
                                                <ChevronRight className={cn(
                                                    "w-4 h-4 text-muted-foreground transition-transform duration-300 group-hover/category-header:text-foreground shrink-0",
                                                    isExpanded ? "rotate-90" : "rotate-0"
                                                )} />
                                                <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border bg-zinc-100/60 dark:bg-zinc-900/60 border-border text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all duration-300 shrink-0 shadow-sm">
                                                    {categoryLabel}
                                                </span>
                                                <span className="text-[0.625rem] font-bold text-muted-foreground/60">
                                                    ({items.length} {items.length === 1 ? "arma" : "armas"})
                                                </span>
                                                <div className="h-px flex-1 bg-gradient-to-r from-zinc-200/60 dark:from-zinc-800/80 to-transparent" />
                                            </div>

                                            {/* Collapsible Content */}
                                            <div className={cn(
                                                "grid transition-all duration-300 ease-in-out",
                                                isExpanded ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 overflow-hidden pointer-events-none mt-0"
                                            )}>
                                                <div className="min-h-0 overflow-hidden">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-2">
                                                        {items.map((w: any) => (
                                                            <div
                                                                key={w.id}
                                                                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-white dark:bg-gray-950/60 shadow-sm dark:shadow-none flex flex-col h-full hover:border-df-green-500/30 transition-all duration-300"
                                                            >
                                                                <div className="relative p-3.5 flex flex-col flex-1 h-full">
                                                                    {/* Image Section with Overlays */}
                                                                    <div
                                                                        className="relative w-full h-32 flex items-center justify-center rounded-xl overflow-hidden border border-border/40 bg-zinc-100/50 dark:bg-zinc-900/30"
                                                                        style={{
                                                                            backgroundImage: [
                                                                                `repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(128,128,128,0.07) 19px, rgba(128,128,128,0.07) 20px)`,
                                                                                `repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(128,128,128,0.07) 19px, rgba(128,128,128,0.07) 20px)`,
                                                                            ].join(","),
                                                                        }}
                                                                    >
                                                                        {/* Glow */}
                                                                        <div
                                                                            className="absolute inset-0 pointer-events-none hidden dark:block"
                                                                            style={{ background: `radial-gradient(ellipse 85% 65% at 50% 75%, rgba(16,185,129,0.08), transparent)` }}
                                                                        />
                                                                        <div
                                                                            className="absolute inset-0 pointer-events-none dark:hidden"
                                                                            style={{ background: `radial-gradient(ellipse 85% 65% at 50% 75%, rgba(16,185,129,0.04), transparent)` }}
                                                                        />

                                                                        {/* Category Tag (Absolute Top-Left) */}
                                                                        <div className="absolute top-2 left-2 z-20 flex gap-1.5 items-center">
                                                                            <span className="text-[0.5625rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-md text-foreground border border-border shadow-sm">
                                                                                {getCategoryLabel(w.category)}
                                                                            </span>
                                                                        </div>

                                                                        {/* Configured Status Badge (Absolute Top-Right) */}
                                                                        <div className="absolute top-2 right-2 z-20">
                                                                            {!w.is_configured ? (
                                                                                <span className="text-[0.5rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-border/40 text-muted-foreground shadow-sm">
                                                                                    Por Defecto
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[0.5rem] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-df-green-500/10 border border-df-green-500/30 text-df-green-600 dark:text-df-green-400 shadow-sm">
                                                                                    Configurada
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {w.image_url ? (
                                                                            <img
                                                                                src={w.image_url}
                                                                                alt={w.weapon_name}
                                                                                className="relative z-10 w-full h-full object-contain p-2 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)] group-hover:scale-105 transition-transform duration-300"
                                                                                loading="lazy"
                                                                            />
                                                                        ) : (
                                                                            <Swords className="w-10 h-10 text-gray-300 dark:text-gray-700 opacity-60" />
                                                                        )}
                                                                    </div>

                                                                    {/* Name & Title */}
                                                                    <div className="text-center px-1 mt-3 flex flex-col gap-0.5">
                                                                        <h3 className="text-lg font-black text-gray-900 dark:text-white leading-none truncate uppercase tracking-tight">
                                                                            {w.weapon_name}
                                                                        </h3>
                                                                        <span className="text-[0.5625rem] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                                                            Calibre {w.caliber}
                                                                        </span>
                                                                    </div>

                                                                    {/* Main Stats - 2 Column Grid */}
                                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4">
                                                                        {BASE_STAT_BARS.map((stat) => {
                                                                            const value = (w as any)[stat.key] || 0;
                                                                            const numericVal = parseNumericValue(value);
                                                                            const pct = Math.min((numericVal / stat.max) * 100, 100);
                                                                            const Icon = stat.icon;
                                                                            const SEGMENTS = 20;
                                                                            const filledSegments = Math.round((pct / 100) * SEGMENTS);
                                                                            return (
                                                                                <div key={stat.key} className="space-y-0.5">
                                                                                    <div className="flex justify-between items-end text-[0.5625rem] sm:text-xs">
                                                                                        <div className="flex items-center gap-0.5 text-gray-500 dark:text-gray-400 pb-0.5 leading-none">
                                                                                            <Icon size={10} className="opacity-60" />
                                                                                            <span className="font-bold uppercase tracking-tighter text-[0.5625rem]">{stat.label}</span>
                                                                                        </div>
                                                                                        <span className="font-mono font-black text-gray-800 dark:text-gray-200 text-[0.75rem] sm:text-xs leading-none">{value}{stat.unit}</span>
                                                                                    </div>
                                                                                    <div className="flex gap-px h-1.5">
                                                                                        {Array.from({ length: SEGMENTS }).map((_, i) => {
                                                                                            const isFilled = i < filledSegments;
                                                                                            return (
                                                                                                <div
                                                                                                    key={i}
                                                                                                    className="flex-1 rounded-[1px] transition-all duration-500"
                                                                                                    style={{
                                                                                                        backgroundColor: isFilled
                                                                                                            ? "#10b981"
                                                                                                            : "rgba(128,128,128,0.15)",
                                                                                                        boxShadow: isFilled && i === filledSegments - 1
                                                                                                            ? "0 0 4px rgba(16,185,129,0.55)"
                                                                                                            : undefined,
                                                                                                    }}
                                                                                                />
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        {/* Perforación de blindaje — solo en Operaciones */}
                                                                        {gameMode === "operations" && (() => {
                                                                            const stat = ARMOR_PEN_STAT;
                                                                            const value = (w as any)[stat.key] || 0;
                                                                            const numericVal = parseNumericValue(value);
                                                                            const pct = Math.min((numericVal / stat.max) * 100, 100);
                                                                            const Icon = stat.icon;
                                                                            const SEGMENTS = 20;
                                                                            const filledSegments = Math.round((pct / 100) * SEGMENTS);
                                                                            return (
                                                                                <div className="col-span-2 space-y-0.5">
                                                                                    <div className="flex justify-between items-end text-[0.5625rem] sm:text-xs">
                                                                                        <div className="flex items-center gap-0.5 text-amber-500/85 pb-0.5 leading-none">
                                                                                            <Icon size={10} className="opacity-60" />
                                                                                            <span className="font-bold uppercase tracking-tighter text-[0.5625rem]">{stat.label}</span>
                                                                                        </div>
                                                                                        <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-[0.75rem] sm:text-xs leading-none">{value}</span>
                                                                                    </div>
                                                                                    <div className="flex gap-px h-1.5">
                                                                                        {Array.from({ length: SEGMENTS }).map((_, i) => {
                                                                                            const isFilled = i < filledSegments;
                                                                                            return (
                                                                                                <div
                                                                                                    key={i}
                                                                                                    className="flex-1 rounded-[1px] transition-all duration-500"
                                                                                                    style={{
                                                                                                        backgroundColor: isFilled
                                                                                                            ? "#f59e0b"
                                                                                                            : "rgba(128,128,128,0.15)",
                                                                                                        boxShadow: isFilled && i === filledSegments - 1
                                                                                                            ? "0 0 4px rgba(245,158,11,0.55)"
                                                                                                            : undefined,
                                                                                                    }}
                                                                                                />
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>

                                                                    {/* Extra Stats - Compact Row */}
                                                                    <div className="flex items-center justify-around py-3 border-y border-border/40 mt-4 gap-1 overflow-hidden">
                                                                        <div className="flex flex-col items-center gap-0.5 min-w-[40px] text-center">
                                                                            <Clock size={10} className="text-muted-foreground" />
                                                                            <span className="text-[0.625rem] text-muted-foreground leading-none font-bold">
                                                                                {w.base_fire_rate}
                                                                            </span>
                                                                            <span className="text-[0.4375rem] text-muted-foreground uppercase font-bold tracking-tighter whitespace-nowrap">Cadencia</span>
                                                                        </div>
                                                                        <div className="flex flex-col items-center gap-0.5 min-w-[40px] text-center">
                                                                            <Package size={10} className="text-muted-foreground" />
                                                                            <span className="text-[0.625rem] text-muted-foreground leading-none font-bold">
                                                                                {w.base_capacity}
                                                                            </span>
                                                                            <span className="text-[0.4375rem] text-muted-foreground uppercase font-bold tracking-tighter whitespace-nowrap">Capacidad</span>
                                                                        </div>
                                                                        <div className="flex flex-col items-center gap-0.5 min-w-[40px] text-center">
                                                                            <Wind size={10} className="text-muted-foreground" />
                                                                            <span className="text-[0.625rem] text-muted-foreground leading-none font-bold">
                                                                                {w.base_muzzle_velocity}m/s
                                                                            </span>
                                                                            <span className="text-[0.4375rem] text-muted-foreground uppercase font-bold tracking-tighter whitespace-nowrap">Vel. Boca</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Bottom Actions Section */}
                                                                    {(() => {
                                                                        const showAmmo = gameMode === "operations";
                                                                        const weaponCaliber = calibersList.find((c: any) => c.name.toLowerCase() === w.caliber.toLowerCase());
                                                                        const caliberImages = showAmmo && weaponCaliber ? getCaliberImages(weaponCaliber.image_url) : [];
                                                                        const renderAmmoThumbnails = () => {
                                                                            if (caliberImages.length === 0) {
                                                                                if (!showAmmo) {
                                                                                    return (
                                                                                        <span className="text-[0.5rem] text-muted-foreground uppercase font-bold tracking-wider">
                                                                                            Ajustes Base
                                                                                        </span>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            }
                                                                            return (
                                                                                <div className="flex flex-wrap items-center gap-2 py-0.5">
                                                                                    {caliberImages.map((img: string, idx: number) => {
                                                                                        return (
                                                                                            <div key={idx} className="group/ammo relative shrink-0" title={w.caliber}>
                                                                                                <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border/50 flex items-center justify-center overflow-hidden hover:border-df-green-500 transition-colors">
                                                                                                    <img src={img} alt={w.caliber} className="w-full h-full object-contain p-1" />
                                                                                                </div>
                                                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/ammo:block bg-zinc-950 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-30">
                                                                                                    {w.caliber}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            );
                                                                        };

                                                                        return user ? (
                                                                            <div className="mt-auto flex flex-col w-full">
                                                                                {w.is_configured ? (
                                                                                    <div className="flex items-center gap-2 w-full justify-between pt-2 border-t border-border/20">
                                                                                        {renderAmmoThumbnails()}
                                                                                        <div className="flex items-center gap-1">
                                                                                            <button
                                                                                                onClick={() => handleEditClick(w, "weapons")}
                                                                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all border border-border/40"
                                                                                                title="Editar estadísticas base"
                                                                                            >
                                                                                                <Edit className="w-3 h-3" />
                                                                                                <span>Editar</span>
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleDeleteClick(w.id, w.weapon_name, "weapons")}
                                                                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider bg-red-500/10 text-red-505 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-transparent"
                                                                                                title="Restablecer estadísticas a por defecto"
                                                                                            >
                                                                                                <Trash2 className="w-3 h-3" />
                                                                                                <span>Restablecer</span>
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="w-full flex flex-col gap-2">
                                                                                        {showAmmo && caliberImages.length > 0 && (
                                                                                            <div className="flex items-center gap-2 w-full justify-between pt-2 border-t border-border/20">
                                                                                                <span className="text-[0.5rem] text-muted-foreground uppercase font-bold tracking-wider">Munición</span>
                                                                                                {renderAmmoThumbnails()}
                                                                                            </div>
                                                                                        )}
                                                                                        <button
                                                                                            onClick={() => handleConfigureStats(w)}
                                                                                            className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-df-green-500 hover:bg-df-green-600 text-white text-[0.625rem] font-black uppercase tracking-wider transition-all shadow-sm shadow-df-green-500/20"
                                                                                            title="Configurar estadísticas base"
                                                                                        >
                                                                                            <Plus className="w-3.5 h-3.5" />
                                                                                            <span>Configurar Estadísticas Base</span>
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="mt-auto pt-2 border-t border-border/20 flex items-center justify-between w-full">
                                                                                {showAmmo ? renderAmmoThumbnails() : (
                                                                                    <span className="text-[0.5rem] text-muted-foreground uppercase font-bold tracking-wider opacity-60">
                                                                                        Estadísticas Oficiales Base
                                                                                    </span>
                                                                                )}
                                                                                <span className="text-[0.5rem] text-muted-foreground uppercase font-bold tracking-wider opacity-60">
                                                                                    Delta Force
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* AMMO SUB TAB */}
                    {subTab === "ammo" && (
                        <div className="space-y-4">
                            {searchQuery.trim() !== "" ? (
                                // Vista de búsqueda plana (sin acordeones)
                                filteredAmmo.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 space-y-3 text-muted-foreground bg-white dark:bg-zinc-950 border border-border/60 rounded-2xl">
                                        <Wind className="w-10 h-10 opacity-20" />
                                        <p className="text-sm font-semibold">No se encontraron municiones</p>
                                        <p className="text-xs opacity-60">Prueba con otra búsqueda o verifica los términos.</p>
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-zinc-950 border border-border/60 rounded-2xl overflow-hidden shadow-sm dark:shadow-none animate-in fade-in duration-300">
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse text-left">
                                                <thead>
                                                    <tr className="border-b border-border bg-zinc-50/50 dark:bg-zinc-900/40 text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest">
                                                        <th className="p-3 pl-4 w-[170px] min-w-[150px] max-w-[190px]">Bala</th>
                                                        <th className="p-3">Calibre / Armas Compatibles</th>
                                                        <th className="p-3 text-center">Nivel Perf.</th>
                                                        <th className="p-3 text-center">Puntos Perf.</th>
                                                        <th className="p-3 text-center">Daño Cuerpo</th>
                                                        <th className="p-3 text-center">Prop. Daño</th>
                                                        <th className="p-3 text-center">Daño Efectivo al Blindaje (Nv. 1-6)</th>
                                                        <th className="p-3 text-center">Pérdida Perf.</th>
                                                        <th className="p-3 text-center">Caída</th>
                                                        {user && <th className="p-3 text-right pr-4">Acción</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/40 text-xs">
                                                    {filteredAmmo.map((a) => {
                                                        const penLevel = (a as any).penetration_level ?? 0;
                                                        const dmgRatio = (a as any).damage_ratio ?? 100;
                                                        const degradation = (a as any).armor_pen_degradation ?? "bajo";
                                                        const falloff = (a as any).pen_falloff_coefficient ?? 0;
                                                        const armorPen = a.armor_penetration || "-";
                                                        const bodyDamage = a.body_damage || "-";
                                                        
                                                        // Obtener la imagen por defecto del calibre
                                                        const parentCaliber = a.caliber ? calibersList.find(c => c.name.toLowerCase() === a.caliber.toLowerCase()) : null;
                                                        const defaultImageUrl = parentCaliber ? getFirstImageUrl(parentCaliber.image_url) : "";
                                                        
                                                        // Armas compatibles
                                                        const caliberWeapons = weapons.filter(w => w.caliber && a.caliber && w.caliber.toLowerCase() === a.caliber.toLowerCase());
                                                        
                                                        const penColors = {
                                                            0: { bg: "bg-zinc-500/10 border border-zinc-500/20", text: "text-zinc-400" },
                                                            1: { bg: "bg-zinc-500/10 border border-zinc-500/20", text: "text-zinc-400" },
                                                            2: { bg: "bg-emerald-500/10 border border-emerald-500/30", text: "text-emerald-500" },
                                                            3: { bg: "bg-blue-500/10 border border-blue-500/30", text: "text-blue-500" },
                                                            4: { bg: "bg-purple-500/10 border border-purple-500/30", text: "text-purple-500" },
                                                            5: { bg: "bg-amber-500/10 border border-amber-500/30", text: "text-amber-500" },
                                                             6: { bg: "bg-red-500/10 border border-red-500/30", text: "text-red-500" },
                                                        };
                                                        const pc = penColors[penLevel] || penColors[0];
                                                        const dmgRatioColor = dmgRatio > 100 ? "text-df-green-650 dark:text-df-green-400" : dmgRatio < 100 ? "text-rose-500" : "text-muted-foreground";
                                                        
                                                        const degColors = {
                                                            bajo: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
                                                            medio: "bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400",
                                                            alto: "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400",
                                                        };
                                                        const armorVals = [1, 2, 3, 4, 5, 6].map(n => calculateDamagePenetration(penLevel, n));
                                                        
                                                        return (
                                                            <tr key={a.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors group/row">
                                                                <td className="p-3 pl-4 w-[170px] min-w-[150px] max-w-[190px]">
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className="w-14 h-14 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/30 overflow-hidden border border-border/40 shrink-0 flex items-center justify-center">
                                                                            {(a.image_url || defaultImageUrl) ? (
                                                                                <img
                                                                                    src={a.image_url || defaultImageUrl}
                                                                                    alt={a.name}
                                                                                    className="w-full h-full object-contain p-1"
                                                                                    loading="lazy"
                                                                                />
                                                                            ) : (
                                                                                <Package className="w-6 h-6 text-zinc-300 dark:text-zinc-700 opacity-60" />
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="font-extrabold text-[0.8125rem] text-foreground truncate">{a.name}</div>
                                                                            {a.description && (
                                                                                <div className="text-[0.625rem] text-muted-foreground/60 mt-0.5 max-w-[120px] truncate" title={a.description}>
                                                                                    {a.description}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 min-w-[180px]">
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="font-extrabold text-xs text-foreground uppercase">
                                                                            {a.caliber}
                                                                        </span>
                                                                        {caliberWeapons.length > 0 ? (
                                                                            <div className="flex flex-wrap items-center gap-1">
                                                                                {caliberWeapons.map((w) => (
                                                                                    <span
                                                                                        key={w.id}
                                                                                        className="px-1 py-0.5 rounded bg-zinc-50 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-300 font-semibold text-[0.5625rem] border border-zinc-200/50 dark:border-zinc-800 shadow-sm"
                                                                                    >
                                                                                        {w.weapon_name}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[0.5rem] text-muted-foreground/50 italic">Sin armas</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${pc.bg} ${pc.text}`}>
                                                                        Nv.{penLevel}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 text-center font-mono font-bold text-foreground">
                                                                    {armorPen}
                                                                </td>
                                                                <td className="p-3 text-center font-mono font-bold text-foreground">
                                                                    {bodyDamage}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                     <div className="flex items-center justify-center gap-1 group/ratio relative">
                                                                         <span className={cn("text-sm font-black font-mono tabular-nums", dmgRatioColor)}>
                                                                             {dmgRatio}%
                                                                         </span>
                                                                         <User className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-foreground cursor-help transition-colors" />
                                                                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/ratio:block bg-zinc-950 text-zinc-100 text-[0.5625rem] p-2 rounded-xl shadow-xl border border-zinc-800 z-50 w-44 text-center pointer-events-none">
                                                                             <span className="font-bold block mb-0.5 text-df-green-400 uppercase tracking-wider text-[0.5rem]">Daño Corporal</span>
                                                                             Daño aplicado en zonas sin blindaje o extremidades (Nv. 0)
                                                                         </div>
                                                                     </div>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                     <div className="flex items-end justify-center gap-1">
                                                                         {armorVals.map((val, i) => {
                                                                             let textClass = "";
                                                                             let bgClass = "bg-zinc-100 dark:bg-zinc-800";
                                                                             if (val === 100) {
                                                                                 textClass = "text-green-500 dark:text-green-400";
                                                                                 bgClass = "bg-green-500/10";
                                                                             } else if (val >= 75) {
                                                                                 textClass = "text-yellow-600 dark:text-yellow-400";
                                                                                 bgClass = "bg-yellow-500/10";
                                                                             } else if (val >= 50) {
                                                                                 textClass = "text-orange-600 dark:text-orange-500";
                                                                                 bgClass = "bg-orange-500/10";
                                                                             } else if (val === 0) {
                                                                                 textClass = "text-zinc-400 dark:text-zinc-650";
                                                                                 bgClass = "bg-zinc-100 dark:bg-zinc-900/60";
                                                                             }
                                                                             return (
                                                                                 <div key={i} className="flex flex-col items-center gap-1" title={`Nv.${i + 1}: ${val}%`}>
                                                                                     <div className={cn("text-[0.625rem] font-black w-8 text-center py-1 rounded-md", bgClass, textClass)}>
                                                                                         {val}%
                                                                                     </div>
                                                                                     <span className={cn("text-[0.625rem] font-black tracking-wide", ARMOR_LEVEL_COLORS[i + 1] || "text-muted-foreground/50")}>
                                                                                         {i + 1}
                                                                                     </span>
                                                                                 </div>
                                                                             );
                                                                         })}
                                                                     </div>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                     <div className="inline-block group/degraded relative">
                                                                         <span className={cn("px-2.5 py-1 rounded-xl text-[0.6875rem] font-black border capitalize cursor-help", degColors[degradation] || degColors.bajo)}>
                                                                             {degradation}
                                                                         </span>
                                                                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/degraded:block bg-zinc-950 text-zinc-100 text-[0.5625rem] p-2 rounded-xl shadow-xl border border-zinc-800 z-50 w-52 text-left pointer-events-none">
                                                                             <span className="font-bold block mb-1 text-center uppercase tracking-wider text-df-green-400 text-[0.5rem]">Pérdida de Perforación</span>
                                                                             {degradation === "bajo" && <span>El proyectil apenas pierde capacidad de penetración tras el primer impacto.</span>}
                                                                             {degradation === "medio" && <span>Pérdida de penetración moderada tras atravesar el primer blindaje.</span>}
                                                                             {degradation === "alto" && <span>Pérdida de penetración severa al impactar contra placas de blindaje.</span>}
                                                                         </div>
                                                                     </div>
                                                                </td>
                                                                <td className="p-3 text-center font-mono text-muted-foreground text-xs font-bold">
                                                                    {falloff}%
                                                                </td>
                                                                {user && (
                                                                    <td className="p-3 text-right pr-4">
                                                                        <div className="opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-end gap-1.5">
                                                                            <button
                                                                                onClick={() => handleEditClick(a, "ammo")}
                                                                                className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all border border-border/40"
                                                                                title="Editar munición"
                                                                            >
                                                                                <Edit className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteClick(a.id, a.name, "ammo")}
                                                                                className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                                                title="Eliminar munición"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )
                            ) : (
                                // Vista normal por calibres (Acordeones)
                                filteredCalibers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 space-y-3 text-muted-foreground bg-white dark:bg-zinc-950 border border-border/60 rounded-2xl">
                                        <Wind className="w-10 h-10 opacity-20" />
                                        <p className="text-sm font-semibold">No se encontraron calibres o municiones</p>
                                        <p className="text-xs opacity-60">Prueba con otra búsqueda o agrega un nuevo calibre.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredCalibers.map((c) => {
                                            const isExpanded = !!expandedCalibers[c.name];
                                            const caliberAmmo = ammo.filter(a => a.caliber && a.caliber.toLowerCase() === c.name.toLowerCase())
                                                .sort((a, b) => (a.penetration_level ?? 0) - (b.penetration_level ?? 0));
                                            const caliberWeapons = weapons.filter(w => w.caliber && w.caliber.toLowerCase() === c.name.toLowerCase());
                                            
                                            return (
                                                <div
                                                    key={c.id}
                                                    className="bg-white dark:bg-zinc-950 border border-border/60 rounded-2xl overflow-hidden shadow-sm dark:shadow-none transition-all duration-300 hover:border-df-green-500/30"
                                                >
                                                    {/* Accordion Header */}
                                                    <div
                                                        onClick={() => setExpandedCalibers(prev => ({ ...prev, [c.name]: !prev[c.name] }))}
                                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 select-none transition-colors"
                                                    >
                                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                                            {/* Caliber Gallery */}
                                                            <div
                                                                className={cn(
                                                                    "flex items-center gap-2 shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
                                                                    isExpanded
                                                                        ? "max-w-0 opacity-0 mr-0 scale-90 pointer-events-none"
                                                                        : "max-w-[400px] opacity-100 mr-2 scale-100"
                                                                )}
                                                            >
                                                                {(() => {
                                                                    const caliberImages = getCaliberImages(c.image_url);
                                                                    if (caliberImages.length > 0) {
                                                                        return caliberImages.map((url, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                className="w-16 h-16 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/30 overflow-hidden border border-border/40 flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-sm shrink-0"
                                                                            >
                                                                                <img
                                                                                    src={url}
                                                                                    alt={`${c.name} - ${idx + 1}`}
                                                                                    className="w-full h-full object-contain p-1"
                                                                                    loading="lazy"
                                                                                />
                                                                            </div>
                                                                        ));
                                                                    }
                                                                    return (
                                                                        <div className="w-16 h-16 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/30 overflow-hidden border border-border/40 flex items-center justify-center shrink-0">
                                                                            <Package className="w-6 h-6 text-zinc-300 dark:text-zinc-700 opacity-60" />
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
 
                                                            {/* Caliber details */}
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                                                                    <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-wider">
                                                                        {c.name}
                                                                    </h3>
                                                                    <span className="inline-flex text-[0.5625rem] font-black text-df-green-650 dark:text-df-green-400 bg-df-green-500/10 border border-df-green-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider w-fit">
                                                                        {caliberAmmo.length} Proyectiles
                                                                    </span>
                                                                </div>
 
                                                                {/* Compatible Weapons list */}
                                                                {caliberWeapons.length > 0 ? (
                                                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                                        <span className="text-[0.5rem] text-muted-foreground/60 uppercase font-black tracking-widest mr-1">Compatibilidad:</span>
                                                                        {caliberWeapons.map((w) => (
                                                                            <span
                                                                                key={w.id}
                                                                                className="px-1.5 py-0.5 rounded bg-zinc-50 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-300 font-semibold text-[0.5625rem] border border-zinc-200/50 dark:border-zinc-800 shadow-sm"
                                                                            >
                                                                                {w.weapon_name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[0.5625rem] text-muted-foreground/60 italic mt-1.5">
                                                                        Sin armas asociadas en el catálogo
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
 
                                                        {/* Right side controls */}
                                                        <div className="flex items-center gap-3 shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
                                                            {user && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        onClick={() => handleAddClick("ammo", c.name)}
                                                                        className="px-2.5 py-1.5 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider bg-df-green-500 hover:bg-df-green-600 text-white transition-all shadow-sm shadow-df-green-500/10 flex items-center gap-1"
                                                                        title="Agregar bala a este calibre"
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                        <span className="hidden sm:inline">Nueva Bala</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleEditClick(c, "calibers")}
                                                                        className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all border border-border/40"
                                                                        title="Editar Calibre"
                                                                    >
                                                                        <Edit className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteClick(c.id, c.name, "calibers")}
                                                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                                        title="Eliminar Calibre"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Expand Indicator Chevron */}
                                                            <div onClick={() => setExpandedCalibers(prev => ({ ...prev, [c.name]: !prev[c.name] }))} className="p-1 cursor-pointer">
                                                                <ChevronRight
                                                                    className={cn(
                                                                        "w-4 h-4 text-muted-foreground transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                                                                        isExpanded && "rotate-90"
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
 
                                                    {/* Accordion Content (Bullets Table) */}
                                                    <div
                                                        className={cn(
                                                            "grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-zinc-50/20 dark:bg-zinc-900/5 overflow-hidden",
                                                            isExpanded 
                                                                ? "grid-rows-[1fr] opacity-100" 
                                                                : "grid-rows-[0fr] opacity-0 pointer-events-none"
                                                        )}
                                                    >
                                                        <div className="min-h-0">
                                                            <div className="border-t border-border/40">
                                                        {caliberAmmo.length === 0 ? (
                                                            <div className="p-8 text-center text-xs text-muted-foreground italic">
                                                                No hay proyectiles configurados para este calibre.
                                                            </div>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full border-collapse text-left">
                                                                    <thead>
                                                                        <tr className="border-b border-border bg-zinc-50/50 dark:bg-zinc-900/40 text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest">
                                                                            <th className="p-3 pl-4 w-[170px] min-w-[150px] max-w-[190px]">Bala</th>
                                                                            <th className="p-3 text-center">Nivel Perf.</th>
                                                                            <th className="p-3 text-center">Puntos Perf.</th>
                                                                            <th className="p-3 text-center">Daño Cuerpo</th>
                                                                            <th className="p-3 text-center">Prop. Daño</th>
                                                                            <th className="p-3 text-center">Daño Efectivo al Blindaje (Nv. 1-6)</th>
                                                                            <th className="p-3 text-center">Pérdida Perf.</th>
                                                                            <th className="p-3 text-center">Caída</th>
                                                                            {user && <th className="p-3 text-right pr-4">Acción</th>}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-border/40 text-xs">
                                                                        {caliberAmmo.map((a) => {
                                                                            const penLevel = (a as any).penetration_level ?? 0;
                                                                            const dmgRatio = (a as any).damage_ratio ?? 100;
                                                                            const degradation = (a as any).armor_pen_degradation ?? "bajo";
                                                                            const falloff = (a as any).pen_falloff_coefficient ?? 0;
                                                                            const armorPen = a.armor_penetration || "-";
                                                                            const bodyDamage = a.body_damage || "-";
                                                                            const penColors = {
                                                                                0: { bg: "bg-zinc-500/10 border border-zinc-500/20", text: "text-zinc-400" },
                                                                                1: { bg: "bg-zinc-500/10 border border-zinc-500/20", text: "text-zinc-400" },
                                                                                2: { bg: "bg-emerald-500/10 border border-emerald-500/30", text: "text-emerald-500" },
                                                                                3: { bg: "bg-blue-500/10 border border-blue-500/30", text: "text-blue-500" },
                                                                                4: { bg: "bg-purple-500/10 border border-purple-500/30", text: "text-purple-500" },
                                                                                5: { bg: "bg-amber-500/10 border border-amber-500/30", text: "text-amber-500" },
                                                                                6: { bg: "bg-red-500/10 border border-red-500/30", text: "text-red-500" },
                                                                            };
                                                                            const pc = penColors[penLevel] || penColors[0];
                                                                            const dmgRatioColor = dmgRatio > 100 ? "text-df-green-650 dark:text-df-green-400" : dmgRatio < 100 ? "text-rose-500" : "text-muted-foreground";
                                                                            const degColors = {
                                                                                bajo: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
                                                                                medio: "bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400",
                                                                                alto: "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400",
                                                                            };
                                                                            const armorVals = [1, 2, 3, 4, 5, 6].map(n => calculateDamagePenetration(penLevel, n));
                                                                            
                                                                            return (
                                                                                <tr key={a.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10 transition-colors group/row">
                                                                                    <td className="p-3 pl-4 w-[170px] min-w-[150px] max-w-[190px]">
                                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                                            <div className="w-14 h-14 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/30 overflow-hidden border border-border/40 shrink-0 flex items-center justify-center">
                                                                                                {(a.image_url || getFirstImageUrl(c.image_url)) ? (
                                                                                                    <img
                                                                                                        src={a.image_url || getFirstImageUrl(c.image_url)}
                                                                                                        alt={a.name}
                                                                                                        className="w-full h-full object-contain p-1"
                                                                                                        loading="lazy"
                                                                                                    />
                                                                                                ) : (
                                                                                                    <Package className="w-6 h-6 text-zinc-300 dark:text-zinc-700 opacity-60" />
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="min-w-0 flex-1">
                                                                                                <div className="font-extrabold text-[0.8125rem] text-foreground truncate">{a.name}</div>
                                                                                                {a.description && (
                                                                                                    <div className="text-[0.625rem] text-muted-foreground/60 mt-0.5 max-w-[120px] truncate" title={a.description}>
                                                                                                        {a.description}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-3 text-center">
                                                                                        <span className={cn("px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider", pc.bg, pc.text)}>
                                                                                            Nv.{penLevel}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="p-3 text-center font-mono font-bold text-foreground">
                                                                                        {armorPen}
                                                                                    </td>
                                                                                    <td className="p-3 text-center font-mono font-bold text-foreground">
                                                                                        {bodyDamage}
                                                                                    </td>
                                                                                    <td className="p-3 text-center">
                                                                                         <div className="flex items-center justify-center gap-1 group/ratio relative">
                                                                                             <span className={cn("text-sm font-black font-mono tabular-nums", dmgRatioColor)}>
                                                                                                 {dmgRatio}%
                                                                                             </span>
                                                                                             <User className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-foreground cursor-help transition-colors" />
                                                                                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/ratio:block bg-zinc-950 text-zinc-100 text-[0.5625rem] p-2 rounded-xl shadow-xl border border-zinc-800 z-50 w-44 text-center pointer-events-none">
                                                                                                 <span className="font-bold block mb-0.5 text-df-green-400 uppercase tracking-wider text-[0.5rem]">Daño Corporal</span>
                                                                                                 Daño aplicado en zonas sin blindaje o extremidades (Nv. 0)
                                                                                             </div>
                                                                                         </div>
                                                                                    </td>
                                                                                    <td className="p-3 text-center">
                                                                                         <div className="flex items-end justify-center gap-1">
                                                                                             {armorVals.map((val, i) => {
                                                                                                 let textClass = "";
                                                                                                 let bgClass = "bg-zinc-100 dark:bg-zinc-800";
                                                                                                 
                                                                                                 if (val === 100) {
                                                                                                     textClass = "text-green-500 dark:text-green-400";
                                                                                                     bgClass = "bg-green-500/10";
                                                                                                 } else if (val >= 75) {
                                                                                                     textClass = "text-yellow-600 dark:text-yellow-400";
                                                                                                     bgClass = "bg-yellow-500/10";
                                                                                                 } else if (val >= 50) {
                                                                                                     textClass = "text-orange-605 dark:text-orange-500";
                                                                                                     bgClass = "bg-orange-500/10";
                                                                                                 } else if (val === 0) {
                                                                                                     textClass = "text-zinc-400 dark:text-zinc-650";
                                                                                                     bgClass = "bg-zinc-100 dark:bg-zinc-900/60";
                                                                                                 }
                                                                                                 
                                                                                                 return (
                                                                                                     <div key={i} className="flex flex-col items-center gap-1" title={`Nv.${i + 1}: ${val}%`}>
                                                                                                         <div className={cn("text-[0.625rem] font-black w-8 text-center py-1 rounded-md", bgClass, textClass)}>
                                                                                                             {val}%
                                                                                                         </div>
                                                                                                         <span className={cn("text-[0.625rem] font-black tracking-wide", ARMOR_LEVEL_COLORS[i + 1] || "text-muted-foreground/50")}>
                                                                                                             {i + 1}
                                                                                                         </span>
                                                                                                     </div>
                                                                                                 );
                                                                                             })}
                                                                                         </div>
                                                                                    </td>
                                                                                    <td className="p-3 text-center">
                                                                                         <div className="inline-block group/degraded relative">
                                                                                             <span className={cn("px-2.5 py-1 rounded-xl text-[0.6875rem] font-black border capitalize cursor-help", degColors[degradation] || degColors.bajo)}>
                                                                                                 {degradation}
                                                                                             </span>
                                                                                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/degraded:block bg-zinc-950 text-zinc-100 text-[0.5625rem] p-2 rounded-xl shadow-xl border border-zinc-800 z-50 w-52 text-left pointer-events-none">
                                                                                                 <span className="font-bold block mb-1 text-center uppercase tracking-wider text-df-green-400 text-[0.5rem]">Pérdida de Perforación</span>
                                                                                                 {degradation === "bajo" && <span>El proyectil apenas pierde capacidad de penetración tras el primer impacto.</span>}
                                                                                                 {degradation === "medio" && <span>Pérdida de penetración moderada tras atravesar el primer blindaje.</span>}
                                                                                                 {degradation === "alto" && <span>Pérdida de penetración severa al impactar contra placas de blindaje.</span>}
                                                                                             </div>
                                                                                         </div>
                                                                                    </td>
                                                                                    <td className="p-3 text-center font-mono text-muted-foreground text-xs font-bold">
                                                                                        {falloff}%
                                                                                    </td>
                                                                                    {user && (
                                                                                        <td className="p-3 text-right pr-4">
                                                                                            <div className="opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-end gap-1">
                                                                                                <button
                                                                                                    onClick={() => handleEditClick(a, "ammo")}
                                                                                                    className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                                                                                                    title="Editar munición"
                                                                                                >
                                                                                                    <Edit className="w-3 h-3" />
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => handleDeleteClick(a.id, a.name, "ammo")}
                                                                                                    className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                                                                    title="Eliminar munición"
                                                                                                >
                                                                                                    <Trash2 className="w-3 h-3" />
                                                                                                </button>
                                                                                            </div>
                                                                                        </td>
                                                                                    )}
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}

                                {subTab === "gear" && (
                                    <div className="space-y-10">
                                        {groupedGear.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 space-y-3 text-muted-foreground bg-white dark:bg-zinc-950 border border-border/60 rounded-2xl">
                                                <Shield className="w-10 h-10 opacity-20" />
                                                <p className="text-sm font-semibold">No se encontraron elementos de protección</p>
                                                <p className="text-xs opacity-60">Prueba con otra búsqueda o agrega un nuevo elemento.</p>
                                            </div>
                                        ) : (
                                            groupedGear.map(({ tier, items }) => {
                                                const tierConfig = getTierColors(tier);
                                                const isExpanded = !!expandedTiers[tier] || searchQuery.trim() !== "";
                                                return (
                                                    <div key={tier} className="space-y-2">
                                                        {/* Collapsible Header */}
                                                        <div 
                                                            onClick={() => setExpandedTiers(prev => ({ ...prev, [tier]: !prev[tier] }))}
                                                            className="flex items-center gap-3 cursor-pointer select-none group/tier-header py-1"
                                                        >
                                                            <ChevronRight className={cn(
                                                                "w-4 h-4 text-muted-foreground transition-transform duration-300 group-hover/tier-header:text-foreground shrink-0", 
                                                                isExpanded ? "rotate-90" : "rotate-0"
                                                            )} />
                                                            <span className={cn(
                                                                "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border transition-all duration-300 shrink-0",
                                                                tierConfig.bg,
                                                                tierConfig.text,
                                                                "group-hover/tier-header:shadow-sm"
                                                            )}>
                                                                {tierConfig.label}
                                                            </span>
                                                            <div className="h-px flex-1 bg-gradient-to-r from-zinc-200/60 dark:from-zinc-800/80 to-transparent" />
                                                        </div>

                                                        {/* Collapsible Content */}
                                                        <div className={cn(
                                                            "grid transition-all duration-300 ease-in-out",
                                                            isExpanded ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 overflow-hidden pointer-events-none mt-0"
                                                        )}>
                                                            <div className="min-h-0 overflow-hidden">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
                                                                    {items.map((g) => {
                                                                        const isHelmet = g.type === "helmet";
                                                                        return (
                                                                            <div
                                                                                key={g.id}
                                                                                className="group relative bg-zinc-50/40 dark:bg-zinc-950/70 border border-zinc-200/50 dark:border-zinc-800/80 hover:border-df-green-500/30 rounded-2xl transition-all duration-300 flex flex-col shadow-sm hover:shadow-md dark:shadow-none backdrop-blur-sm overflow-hidden"
                                                                            >
                                                                                {/* Image Section */}
                                                                                <div className="relative bg-zinc-100/50 dark:bg-zinc-900/30 border-b border-zinc-200/40 dark:border-zinc-800/50 w-full h-44 flex items-center justify-center overflow-hidden shrink-0 transition-all duration-500 group-hover:border-df-green-500/20">
                                                                                    {/* Tier Badge inside Image */}
                                                                                    <div className="absolute top-3 left-3 z-10">
                                                                                        <span className={cn(
                                                                                            "text-[0.5rem] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border backdrop-blur-md",
                                                                                            g.tier === 6 ? "bg-red-500/10 border-red-500/30 text-red-650 dark:text-red-400" :
                                                                                            g.tier === 5 ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" :
                                                                                            g.tier === 4 ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400" :
                                                                                            g.tier === 3 ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" :
                                                                                            g.tier === 2 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" :
                                                                                            "bg-zinc-800/20 border-zinc-700/30 text-zinc-400"
                                                                                        )}>
                                                                                            Nv. {g.tier}
                                                                                        </span>
                                                                                    </div>

                                                                                    {g.image_url ? (
                                                                                        <img
                                                                                            src={g.image_url}
                                                                                            alt={g.name}
                                                                                            className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04] filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
                                                                                            loading="lazy"
                                                                                        />
                                                                                    ) : (
                                                                                        <Shield className={cn("w-10 h-10 text-zinc-300 dark:text-zinc-700 opacity-40", isHelmet && "rotate-180")} />
                                                                                    )}
                                                                                </div>

                                                                                {/* Info Section */}
                                                                                <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                                                                                    <div className="space-y-3">
                                                                                        {/* Header: Title + Type + Actions */}
                                                                                        <div className="flex justify-between items-start gap-4">
                                                                                            <div className="min-w-0">
                                                                                                <span className={cn(
                                                                                                    "text-[0.5rem] font-black uppercase tracking-widest block mb-0.5",
                                                                                                    isHelmet ? "text-cyan-600 dark:text-cyan-400" : "text-rose-600 dark:text-rose-400"
                                                                                                )}>
                                                                                                    {isHelmet ? "Casco Táctico" : "Chaleco de Combate"} • Nv. {g.tier}
                                                                                                </span>
                                                                                                <h3 className="text-sm font-black tracking-tight text-zinc-900 dark:text-white uppercase leading-snug truncate" title={g.name}>
                                                                                                    {g.name}
                                                                                                </h3>
                                                                                            </div>

                                                                                            {/* Actions (Edit / Delete) */}
                                                                                            {user && (
                                                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shrink-0">
                                                                                                    <button
                                                                                                        onClick={() => handleEditClick(g, "gear")}
                                                                                                        className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-border hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-all"
                                                                                                        title="Editar"
                                                                                                    >
                                                                                                        <Edit className="w-3 h-3" />
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={() => handleDeleteClick(g.id, g.name, "gear")}
                                                                                                        className="p-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                                                                        title="Eliminar"
                                                                                                    >
                                                                                                        <Trash2 className="w-3 h-3" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>

                                                                                        {/* Stats List - Minimalist emulating the game UI */}
                                                                                        <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/70 text-[0.625rem]">
                                                                                            {/* Durability */}
                                                                                            <div className="py-1.5 space-y-1">
                                                                                                <div className="flex justify-between items-center text-muted-foreground">
                                                                                                    <span className="font-semibold text-zinc-500 dark:text-zinc-350">Durabilidad</span>
                                                                                                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-100">
                                                                                                        {(g.max_durability || 0).toFixed(1)} / {(g.max_durability || 0).toFixed(1)}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div className="h-[2px] w-full bg-zinc-200 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                                                                                                    <div
                                                                                                        className="h-full rounded-full bg-df-green-500 transition-all duration-700"
                                                                                                        style={{ width: "100%" }}
                                                                                                    />
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Shield Effects (Speed Penalties) */}
                                                                                            {(g.speed_penalty !== 0 || g.ergo_penalty !== 0) && (
                                                                                                <div className="py-1.5 space-y-1">
                                                                                                    <span className="block text-[0.5rem] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider">Efectos de blindaje</span>
                                                                                                    <div className="space-y-0.5">
                                                                                                        {g.ergo_penalty !== 0 && (
                                                                                                            <div className="flex items-center gap-1.5 text-zinc-650 dark:text-zinc-200 font-medium">
                                                                                                                <Zap size={9} className="text-zinc-400 dark:text-zinc-350 shrink-0" />
                                                                                                                <span>
                                                                                                                    {g.ergo_penalty < 0 ? "" : "+"}{(g.ergo_penalty * 100).toFixed(0)}% de velocidad de apuntado
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        )}
                                                                                                        {g.speed_penalty !== 0 && (
                                                                                                            <div className="flex items-center gap-1.5 text-zinc-650 dark:text-zinc-200 font-medium">
                                                                                                                <Activity size={9} className="text-zinc-400 dark:text-zinc-350 shrink-0" />
                                                                                                                <span>
                                                                                                                    {g.speed_penalty < 0 ? "" : "+"}{(g.speed_penalty * 100).toFixed(0)}% de velocidad de movimiento
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Protected Zones */}
                                                                                            {g.zones_protected && g.zones_protected.length > 0 && (
                                                                                                <div className="flex justify-between items-center py-1.5 text-zinc-650 dark:text-zinc-200">
                                                                                                    <span className="text-zinc-500 dark:text-zinc-350">Partes protegidas</span>
                                                                                                    <span className="font-bold text-zinc-800 dark:text-zinc-100 capitalize">
                                                                                                        {g.zones_protected.join(" / ")}
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Durability Cost */}
                                                                                            {!isHelmet && g.durability_cost && (
                                                                                                <div className="flex justify-between items-center py-1.5 text-zinc-650 dark:text-zinc-200">
                                                                                                    <span className="text-zinc-500 dark:text-zinc-350">Costo de durabilidad</span>
                                                                                                    <span className="font-bold text-zinc-800 dark:text-zinc-100 capitalize">
                                                                                                        {g.durability_cost}
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Repair Efficiency */}
                                                                                            {!isHelmet && g.repair_efficiency && (
                                                                                                <div className="flex justify-between items-center py-1.5 text-zinc-650 dark:text-zinc-200">
                                                                                                    <span className="text-zinc-500 dark:text-zinc-350">Eficiencia de reparación</span>
                                                                                                    <span className="font-bold text-zinc-800 dark:text-zinc-100 capitalize">
                                                                                                        {g.repair_efficiency === "medio" ? "Media" : g.repair_efficiency}
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Weight */}
                                                                                            {g.weight_kg !== undefined && g.weight_kg !== null && g.weight_kg > 0 && (
                                                                                                <div className="flex justify-between items-center py-1.5 text-zinc-650 dark:text-zinc-200">
                                                                                                    <span className="text-zinc-500 dark:text-zinc-350">Peso</span>
                                                                                                    <span className="font-mono font-bold text-zinc-850 dark:text-zinc-100">
                                                                                                        {(g.weight_kg || 0).toFixed(2)} KG
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Description */}
                                                                                    {g.description && (
                                                                                        <p className="text-[0.5625rem] text-zinc-600 dark:text-zinc-300/90 leading-relaxed mt-2.5 pt-2.5 border-t border-dashed border-zinc-200 dark:border-zinc-800/80 line-clamp-3">
                                                                                            {g.description}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                    {/* FLOATING ADMIN MODAL DIALOG */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        onClick={() => setIsFormOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all"
                    />

                    {/* Modal Content container */}
                    <div className="relative bg-white dark:bg-zinc-900 border border-border rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center pb-4 border-b border-border mb-4">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                                    {editMode === "add" ? "Configurar" : "Editar"} — {activeFormType === "weapons" ? "Estadísticas de Arma" : activeFormType === "ammo" ? "Munición" : activeFormType === "calibers" ? "Calibre" : "Equipamiento"}
                                </h2>
                                {activeFormType === "weapons" && (
                                    <span className={cn(
                                        "inline-flex items-center gap-1 text-[0.5625rem] font-black uppercase tracking-wider mt-0.5 px-2 py-0.5 rounded-md",
                                        gameMode === "operations"
                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                    )}>
                                        {gameMode === "operations" ? <Shield className="w-2.5 h-2.5" /> : <Swords className="w-2.5 h-2.5" />}
                                        Modo: {gameMode === "operations" ? "Operaciones" : "Warfare"}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                            {/* WEAPONS FIELD CONFIGS */}
                            {activeFormType === "weapons" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Nombre de Arma</label>
                                        <input
                                            type="text"
                                            value={weaponFields.weapon_name}
                                            disabled
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border text-muted-foreground cursor-not-allowed font-semibold focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Categoría</label>
                                        <input
                                            type="text"
                                            value={getCategoryLabel(weaponFields.category)}
                                            disabled
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border text-muted-foreground cursor-not-allowed font-semibold focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Calibre</label>
                                        <select
                                            value={weaponFields.caliber}
                                            onChange={(e) => setWeaponFields(prev => ({ ...prev, caliber: e.target.value }))}
                                            required
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        >
                                            {calibersList.map((c) => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Daño Base</label>
                                         <input
                                             type="text"
                                             value={weaponFields.base_damage}
                                             onChange={(e) => setWeaponFields(prev => ({ ...prev, base_damage: e.target.value }))}
                                             placeholder="Ej: 33 o 14x8"
                                            required
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Rango (m)</label>
                                        <input
                                            type="number"
                                            value={weaponFields.base_range}
                                            onChange={(e) => setWeaponFields(prev => ({ ...prev, base_range: parseInt(e.target.value) || 0 }))}
                                            required
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Control Retroceso (0-100)</label>
                                        <input
                                            type="number"
                                            value={weaponFields.base_control}
                                            onChange={(e) => setWeaponFields(prev => ({ ...prev, base_control: parseInt(e.target.value) || 0 }))}
                                            required
                                            min="0" max="100"
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Manejo/Ergonomía (0-100)</label>
                                        <input
                                            type="number"
                                            value={weaponFields.base_handling}
                                            onChange={(e) => setWeaponFields(prev => ({ ...prev, base_handling: parseInt(e.target.value) || 0 }))}
                                            required
                                            min="0" max="100"
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Estabilidad (0-100)</label>
                                        <input
                                            type="number"
                                            value={weaponFields.base_stability}
                                            onChange={(e) => setWeaponFields(prev => ({ ...prev, base_stability: parseInt(e.target.value) || 0 }))}
                                            required
                                            min="0" max="100"
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Precisión (0-100)</label>
                                        <input
                                            type="number"
                                            value={weaponFields.base_accuracy}
                                            onChange={(e) => setWeaponFields(prev => ({ ...prev, base_accuracy: parseInt(e.target.value) || 0 }))}
                                            required
                                            min="0" max="100"
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Cadencia (DPM)</label>
                                        <input
                                            type="number"
                                            value={weaponFields.base_fire_rate}
                                            onChange={(e) => setWeaponFields(prev => ({ ...prev, base_fire_rate: parseInt(e.target.value) || 0 }))}
                                            required
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Capacidad Mag (Rds)</label>
                                        <input
                                            type="number"
                                            value={weaponFields.base_capacity}
                                            onChange={(e) => setWeaponFields(prev => ({ ...prev, base_capacity: parseInt(e.target.value) || 0 }))}
                                            required
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Velocidad Boca (m/s)</label>
                                        <input
                                            type="number"
                                            value={weaponFields.base_muzzle_velocity}
                                            onChange={(e) => setWeaponFields(prev => ({ ...prev, base_muzzle_velocity: parseInt(e.target.value) || 0 }))}
                                            required
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    {/* Perforación de blindaje — solo visible en modo Operaciones */}
                                    {gameMode === "operations" && (
                                        <div className="sm:col-span-2">
                                            <label className="block text-[0.625rem] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">
                                                🛡️ Perforación de Blindaje Base (0-100) — Solo Operaciones</label>
                                             <input
                                                 type="text"
                                                 value={weaponFields.base_armor_penetration}
                                                 onChange={(e) => setWeaponFields(prev => ({ ...prev, base_armor_penetration: e.target.value }))}
                                                 required
                                                 placeholder="Ej: 20 o 16x8"
                                                className="w-full px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-400/40 focus:ring-1 focus:ring-amber-400 text-amber-900 dark:text-amber-200"
                                            />
                                        </div>
                                    )}

                                    <div className="sm:col-span-2">
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Imagen del Arma</label>
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={weaponFields.image_url}
                                                    onChange={(e) => setWeaponFields(prev => ({ ...prev, image_url: e.target.value }))}
                                                    placeholder="https://... o sube una imagen"
                                                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                                />
                                                <label className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-border rounded-xl text-xs font-bold text-foreground cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center shrink-0">
                                                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Subir archivo"}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                handleImageUpload(file, "delta-force-weapons", (url) => {
                                                                    setWeaponFields(prev => ({ ...prev, image_url: url }));
                                                                });
                                                            }
                                                        }}
                                                        className="hidden"
                                                        disabled={uploadingImage}
                                                    />
                                                </label>
                                            </div>
                                            {weaponFields.image_url && (
                                                <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-border bg-zinc-100/50 dark:bg-zinc-900/30 flex items-center justify-center">
                                                    <img src={weaponFields.image_url} alt="Preview" className="w-full h-full object-contain p-1" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setWeaponFields(prev => ({ ...prev, image_url: "" }))}
                                                        className="absolute top-1 right-1 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AMMO FIELD CONFIGS */}
                            {activeFormType === "ammo" && (
                                <div className="space-y-4">
                                    {/* Name & Caliber */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Nombre de Munición</label>
                                            <input
                                                type="text"
                                                value={ammoFields.name}
                                                onChange={(e) => setAmmoFields(prev => ({ ...prev, name: e.target.value }))}
                                                required
                                                placeholder=".45-70 Govt FTX, 5.56mm M995, etc."
                                                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Calibre</label>
                                            <select
                                                value={ammoFields.caliber}
                                                onChange={(e) => setAmmoFields(prev => ({ ...prev, caliber: e.target.value }))}
                                                required
                                                disabled={editMode === "edit"}
                                                className={cn(
                                                    "w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500",
                                                    editMode === "edit" && "bg-zinc-100 dark:bg-zinc-900 cursor-not-allowed text-muted-foreground"
                                                )}
                                            >
                                                {calibersList.map((c) => (
                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Proporción de Daño Corporal (%)</label>
                                            <input
                                                type="number"
                                                value={ammoFields.damage_ratio}
                                                onChange={(e) => setAmmoFields(prev => ({ ...prev, damage_ratio: parseInt(e.target.value) || 100 }))}
                                                required
                                                min="1"
                                                placeholder="100"
                                                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Daño al Cuerpo (Base)</label>
                                            <input
                                                type="text"
                                                value={ammoFields.body_damage}
                                                onChange={(e) => setAmmoFields(prev => ({ ...prev, body_damage: e.target.value }))}
                                                placeholder="Ej: 60 o 56x7"
                                                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Puntos de Perforación (Rating)</label>
                                            <input
                                                type="text"
                                                value={ammoFields.armor_penetration}
                                                onChange={(e) => setAmmoFields(prev => ({ ...prev, armor_penetration: e.target.value }))}
                                                placeholder="Ej: 45 o 16x8"
                                                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Descripción</label>
                                            <textarea
                                                value={ammoFields.description}
                                                onChange={(e) => setAmmoFields(prev => ({ ...prev, description: e.target.value }))}
                                                placeholder="Munición de punta blanda flexible con balística estable..."
                                                rows={2}
                                                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500 resize-none text-xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Penetration Level visual selector */}
                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-2">Nivel de Perforación</label>
                                        <div className="flex gap-1.5">
                                            {[0, 1, 2, 3, 4, 5, 6].map(lvl => {
                                                const lvlColors: Record<number, string> = {
                                                    0: "border-zinc-400/30 text-zinc-400 data-[active=true]:bg-zinc-500 data-[active=true]:text-white data-[active=true]:border-zinc-500",
                                                    1: "border-zinc-400/30 text-zinc-400 data-[active=true]:bg-zinc-500 data-[active=true]:text-white data-[active=true]:border-zinc-500",
                                                    2: "border-emerald-500/30 text-emerald-500 data-[active=true]:bg-emerald-500 data-[active=true]:text-white data-[active=true]:border-emerald-500",
                                                    3: "border-blue-500/30 text-blue-500 data-[active=true]:bg-blue-500 data-[active=true]:text-white data-[active=true]:border-blue-500",
                                                    4: "border-purple-500/30 text-purple-500 data-[active=true]:bg-purple-500 data-[active=true]:text-white data-[active=true]:border-purple-500",
                                                    5: "border-amber-500/30 text-amber-500 data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500",
                                                    6: "border-red-500/30 text-red-500 data-[active=true]:bg-red-500 data-[active=true]:text-white data-[active=true]:border-red-500",
                                                };
                                                return (
                                                    <button
                                                        key={lvl}
                                                        type="button"
                                                        data-active={ammoFields.penetration_level === lvl}
                                                        onClick={() => setAmmoFields(prev => ({
                                                            ...prev,
                                                            penetration_level: lvl,
                                                            damage_vs_armor_1: calculateDamagePenetration(lvl, 1),
                                                            damage_vs_armor_2: calculateDamagePenetration(lvl, 2),
                                                            damage_vs_armor_3: calculateDamagePenetration(lvl, 3),
                                                            damage_vs_armor_4: calculateDamagePenetration(lvl, 4),
                                                            damage_vs_armor_5: calculateDamagePenetration(lvl, 5),
                                                            damage_vs_armor_6: calculateDamagePenetration(lvl, 6),
                                                        }))}
                                                        className={cn("flex-1 py-2 rounded-lg border text-[0.6875rem] font-black transition-all", lvlColors[lvl])}
                                                    >
                                                        Nv.{lvl}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Degradation & Falloff */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-2">Disminución de Perforación</label>
                                            <div className="flex gap-2">
                                                {(["bajo", "medio", "alto"] as const).map(d => (
                                                    <button
                                                        key={d}
                                                        type="button"
                                                        onClick={() => setAmmoFields(prev => ({ ...prev, armor_pen_degradation: d }))}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg border text-[0.625rem] font-black uppercase tracking-wider transition-all capitalize",
                                                            ammoFields.armor_pen_degradation === d
                                                                ? d === "bajo" ? "bg-emerald-500 text-white border-emerald-500"
                                                                    : d === "medio" ? "bg-orange-500 text-white border-orange-500"
                                                                    : "bg-rose-500 text-white border-rose-500"
                                                                : "border-border text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {d}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Coeficiente de Caída (%)</label>
                                            <input
                                                type="number"
                                                value={ammoFields.pen_falloff_coefficient}
                                                onChange={(e) => setAmmoFields(prev => ({ ...prev, pen_falloff_coefficient: parseInt(e.target.value) || 0 }))}
                                                min="0" max="100"
                                                placeholder="0"
                                                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Damage vs Armor per level */}
                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-2">
                                            Eficiencia de Daño a Durabilidad de Blindaje (%) — por Nivel
                                        </label>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                            {[1, 2, 3, 4, 5, 6].map(n => (
                                                <div key={n}>
                                                    <label className="block text-[0.5625rem] text-center font-bold text-muted-foreground mb-1">Nv.{n}</label>
                                                    <input
                                                        type="number"
                                                        value={(ammoFields as any)[`damage_vs_armor_${n}`]}
                                                        onChange={(e) => handleDamageVsArmorChange(n, e.target.value)}
                                                        min="0"
                                                        className="w-full px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500 text-center text-xs font-mono"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Armas Compatibles (Automático) */}
                                    <div className="sm:col-span-2 p-3 bg-df-green-500/5 border border-df-green-500/20 rounded-xl text-[0.625rem] text-muted-foreground space-y-1">
                                        <span className="font-bold text-df-green-600 dark:text-df-green-400 block uppercase tracking-wider">💡 Compatibilidad Automática</span>
                                        <span>Las armas compatibles con esta munición se determinan dinámicamente en base a su calibre. Actualmente, las armas registradas con el calibre <span className="font-bold text-foreground">"{ammoFields.caliber}"</span> tendrán esta bala disponible de forma automática.</span>
                                    </div>

                                    {/* Imagen de la Munición con Fallback */}
                                    <div className="sm:col-span-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-xl space-y-2">
                                        <span className="text-[0.625rem] font-bold text-muted-foreground uppercase block">Imagen de la Munición</span>
                                        {(() => {
                                            const ammoCaliberObj = calibersList.find(c => c.name.toLowerCase() === ammoFields.caliber.toLowerCase());
                                            const caliberImg = ammoCaliberObj?.image_url || "";
                                            const hasCustomImage = !!ammoFields.image_url;
                                            const displayImg = ammoFields.image_url || caliberImg;

                                            return (
                                                <div className="space-y-3">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={ammoFields.image_url}
                                                            onChange={(e) => setAmmoFields(prev => ({ ...prev, image_url: e.target.value }))}
                                                            placeholder={caliberImg ? "Usando imagen del calibre (Heredada)" : "Sin imagen. Pega una URL o sube una imagen"}
                                                            className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border text-xs focus:ring-1 focus:ring-df-green-500"
                                                        />
                                                        <label className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-border rounded-xl text-xs font-bold text-foreground cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center shrink-0">
                                                            {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Subir Imagen"}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        handleImageUpload(file, "delta-force-ammo", (url) => {
                                                                            setAmmoFields(prev => ({ ...prev, image_url: url }));
                                                                        });
                                                                    }
                                                                }}
                                                                className="hidden"
                                                                disabled={uploadingImage}
                                                            />
                                                        </label>
                                                    </div>

                                                    {/* Selector visual de imágenes del calibre */}
                                                    {(() => {
                                                        const caliberImages = getCaliberImages(caliberImg);
                                                        if (caliberImages.length <= 0) return null;
                                                        return (
                                                            <div className="space-y-1.5 pt-1">
                                                                <span className="text-[0.5625rem] font-black text-muted-foreground uppercase tracking-wider block">
                                                                    Seleccionar de las imágenes del calibre:
                                                                </span>
                                                                <div className="flex flex-wrap gap-2 p-2 bg-zinc-50 dark:bg-zinc-900/30 border border-border rounded-xl">
                                                                    {caliberImages.map((url, idx) => {
                                                                        const isSelected = ammoFields.image_url === url || (!ammoFields.image_url && idx === 0);
                                                                        return (
                                                                            <button
                                                                                key={idx}
                                                                                type="button"
                                                                                onClick={() => setAmmoFields(prev => ({ ...prev, image_url: url }))}
                                                                                className={cn(
                                                                                    "relative w-12 h-12 rounded-lg border bg-white dark:bg-zinc-950 flex items-center justify-center overflow-hidden p-1 transition-all hover:scale-105 active:scale-95",
                                                                                    isSelected
                                                                                        ? "border-df-green-500 ring-1 ring-df-green-500/20 shadow-sm"
                                                                                        : "border-border hover:border-zinc-400"
                                                                                )}
                                                                                title={`Usar imagen #${idx + 1} del calibre`}
                                                                            >
                                                                                <img src={url} alt={`Caliber image ${idx + 1}`} className="w-full h-full object-contain" />
                                                                                {isSelected && (
                                                                                    <div className="absolute inset-0 bg-df-green-500/10 flex items-center justify-center">
                                                                                        <span className="bg-df-green-500 text-white text-[0.4375rem] font-bold px-1 rounded-sm shadow-sm">✓</span>
                                                                                    </div>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                    {displayImg ? (
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border bg-zinc-100/50 dark:bg-zinc-900/30 flex items-center justify-center">
                                                                <img src={displayImg} alt="Preview Munición" className="w-full h-full object-contain p-1" />
                                                                {hasCustomImage && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setAmmoFields(prev => ({ ...prev, image_url: "" }))}
                                                                        className="absolute top-1 right-1 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                                        title="Quitar imagen personalizada"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="text-[0.625rem] space-y-1">
                                                                {hasCustomImage ? (
                                                                    <>
                                                                        <span className="inline-flex items-center gap-1 font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase">
                                                                            Imagen Personalizada
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setAmmoFields(prev => ({ ...prev, image_url: "" }))}
                                                                            className="block text-red-500 hover:underline font-bold mt-1"
                                                                        >
                                                                            Restablecer a imagen del calibre
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 font-bold text-zinc-500 bg-zinc-550/10 border border-zinc-500/20 px-1.5 py-0.5 rounded uppercase">
                                                                        Heredada del calibre
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[0.625rem] text-muted-foreground italic">
                                                            Sube una imagen para esta bala, o sube una imagen al calibre "{ammoFields.caliber}" para usarla como fallback.
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* GEAR FIELD CONFIGS */}
                            {activeFormType === "gear" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Nombre del Equipamiento</label>
                                        <input
                                            type="text"
                                            value={gearFields.name}
                                            onChange={(e) => setGearFields(prev => ({ ...prev, name: e.target.value }))}
                                            required
                                            placeholder="Chaleco Pesado Vanguardia Nv.5"
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Tipo de Protección</label>
                                        <select
                                            value={gearFields.type}
                                            onChange={(e) => {
                                                const val = e.target.value as "armor" | "helmet";
                                                setGearFields(prev => ({
                                                    ...prev,
                                                    type: val,
                                                    zones_protected: val === "armor" ? ["pecho"] : ["Cabeza", "Orejas"]
                                                }));
                                            }}
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        >
                                            <option value="armor">Armadura de Torso</option>
                                            <option value="helmet">Casco</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Nivel (Tier 1-6)</label>
                                        <select
                                            value={gearFields.tier}
                                            onChange={(e) => setGearFields(prev => ({ ...prev, tier: parseInt(e.target.value) || 1 }))}
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        >
                                            {[1, 2, 3, 4, 5, 6].map(t => (
                                                <option key={t} value={t}>Nivel {t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Puntos de Durabilidad Máxima</label>
                                        <input
                                            type="number"
                                            value={gearFields.max_durability}
                                            onChange={(e) => setGearFields(prev => ({ ...prev, max_durability: parseInt(e.target.value) || 0 }))}
                                            required
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Penalización Velocidad (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={gearFields.speed_penalty}
                                            onChange={(e) => setGearFields(prev => ({ ...prev, speed_penalty: parseFloat(e.target.value) || 0 }))}
                                            placeholder="Ej: -3"
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Penalización Ergo (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={gearFields.ergo_penalty}
                                            onChange={(e) => setGearFields(prev => ({ ...prev, ergo_penalty: parseFloat(e.target.value) || 0 }))}
                                            placeholder="Ej: -3"
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                        />
                                    </div>

                                    {gearFields.type === "armor" ? (
                                        <>
                                            <div className="sm:col-span-2">
                                                <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-2">Zonas Protegidas (Chaleco)</label>
                                                <div className="flex gap-2">
                                                    {["pecho", "abdomen", "hombro"].map(z => {
                                                        const selected = gearFields.zones_protected.includes(z);
                                                        return (
                                                            <button
                                                                key={z}
                                                                type="button"
                                                                onClick={() => {
                                                                    setGearFields(prev => {
                                                                        const exists = prev.zones_protected.includes(z);
                                                                        const next = exists
                                                                            ? prev.zones_protected.filter(x => x !== z)
                                                                            : [...prev.zones_protected, z];
                                                                        if (next.length === 0) {
                                                                            return { ...prev, zones_protected: ["pecho"] };
                                                                        }
                                                                        return { ...prev, zones_protected: next };
                                                                    });
                                                                }}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-lg border font-bold text-[0.625rem] transition-all capitalize",
                                                                    selected
                                                                        ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400"
                                                                        : "bg-zinc-50 dark:bg-zinc-950 border-border text-muted-foreground"
                                                                )}
                                                            >
                                                                {z}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Eficiencia de Reparación</label>
                                                <select
                                                    value={gearFields.repair_efficiency}
                                                    onChange={(e) => setGearFields(prev => ({ ...prev, repair_efficiency: e.target.value as "bajo" | "medio" | "alto" }))}
                                                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                                >
                                                    <option value="bajo">Bajo</option>
                                                    <option value="medio">Medio</option>
                                                    <option value="alto">Alto</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Costo de Durabilidad (Reparación)</label>
                                                <select
                                                    value={gearFields.durability_cost}
                                                    onChange={(e) => setGearFields(prev => ({ ...prev, durability_cost: e.target.value as "bajo" | "medio" | "alto" }))}
                                                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                                >
                                                    <option value="bajo">Bajo</option>
                                                    <option value="medio">Medio</option>
                                                    <option value="alto">Alto</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Peso (kg)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={gearFields.weight_kg}
                                                    onChange={(e) => setGearFields(prev => ({ ...prev, weight_kg: parseFloat(e.target.value) || 0 }))}
                                                    placeholder="Ej: 8.5"
                                                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="sm:col-span-2">
                                            <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-2">Zonas Protegidas</label>
                                            <div className="flex gap-2">
                                                {["Cabeza", "Orejas", "Cara", "Cuello"].map(z => {
                                                    const selected = gearFields.zones_protected.includes(z);
                                                    return (
                                                        <button
                                                            key={z}
                                                            type="button"
                                                            onClick={() => toggleZone(z)}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-lg border font-bold text-[0.625rem] transition-all",
                                                                selected
                                                                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-600 dark:text-cyan-400"
                                                                    : "bg-zinc-50 dark:bg-zinc-950 border-border text-muted-foreground"
                                                            )}
                                                        >
                                                            {z}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="sm:col-span-2">
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Descripción</label>
                                        <textarea
                                            value={gearFields.description}
                                            onChange={(e) => setGearFields(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Chaleco pesado que ofrece excelente durabilidad pero limita el movimiento..."
                                            rows={2}
                                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500 resize-none text-xs"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Imagen de la Protección</label>
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={gearFields.image_url}
                                                    onChange={(e) => setGearFields(prev => ({ ...prev, image_url: e.target.value }))}
                                                    placeholder="https://... o sube una imagen"
                                                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                                />
                                                <label className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-border rounded-xl text-xs font-bold text-foreground cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center shrink-0">
                                                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Subir archivo"}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                handleImageUpload(file, "delta-force-gear", (url) => {
                                                                    setGearFields(prev => ({ ...prev, image_url: url }));
                                                                });
                                                            }
                                                        }}
                                                        className="hidden"
                                                        disabled={uploadingImage}
                                                    />
                                                </label>
                                            </div>
                                            {gearFields.image_url && (
                                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border bg-zinc-100/50 dark:bg-zinc-900/30 flex items-center justify-center">
                                                    <img src={gearFields.image_url} alt="Preview" className="w-full h-full object-contain p-1" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setGearFields(prev => ({ ...prev, image_url: "" }))}
                                                        className="absolute top-1 right-1 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                                    
                            {/* CALIBERS FIELD CONFIGS */}
                            {activeFormType === "calibers" && (
                                <div className="sm:col-span-2 space-y-4">
                                            <div>
                                                <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Nombre del Calibre</label>
                                                <input
                                                    type="text"
                                                    value={caliberFields.name}
                                                    onChange={(e) => setCaliberFields(prev => ({ ...prev, name: e.target.value }))}
                                                    required
                                                    
                                                    placeholder="5.56x45mm, 7.62x39mm..."
                                                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500"
                                                />
                                                {editMode === "add" && (
                                                    <span className="block text-[0.5625rem] text-amber-500 font-semibold mt-1">
                                                        ⚠️ Al agregar un calibre, se autogenerarán 5 niveles de munición de forma automática.
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div>
                                                <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">Imágenes del Calibre (Galería)</label>
                                                <div className="space-y-3">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={tempCaliberImageUrl}
                                                            onChange={(e) => setTempCaliberImageUrl(e.target.value)}
                                                            placeholder="Pegar URL de imagen..."
                                                            className="flex-1 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-border focus:ring-1 focus:ring-df-green-500 text-xs"
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    e.preventDefault();
                                                                    if (tempCaliberImageUrl.trim()) {
                                                                        setCaliberFields(prev => ({
                                                                            ...prev,
                                                                            image_urls: [...prev.image_urls, tempCaliberImageUrl.trim()]
                                                                        }));
                                                                        setTempCaliberImageUrl("");
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (tempCaliberImageUrl.trim()) {
                                                                    setCaliberFields(prev => ({
                                                                        ...prev,
                                                                        image_urls: [...prev.image_urls, tempCaliberImageUrl.trim()]
                                                                    }));
                                                                    setTempCaliberImageUrl("");
                                                                }
                                                            }}
                                                            className="px-3 py-2 bg-df-green-500/10 hover:bg-df-green-500/20 text-df-green-600 dark:text-df-green-400 border border-df-green-500/30 rounded-xl text-xs font-bold transition-colors"
                                                        >
                                                            Agregar
                                                        </button>
                                                        <label className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-border rounded-xl text-xs font-bold text-foreground cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center shrink-0">
                                                            {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Subir archivo"}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        handleImageUpload(file, "delta-force-calibers", (url) => {
                                                                            setCaliberFields(prev => ({
                                                                                ...prev,
                                                                                image_urls: [...prev.image_urls, url]
                                                                            }));
                                                                        });
                                                                    }
                                                                }}
                                                                className="hidden"
                                                                disabled={uploadingImage}
                                                            />
                                                        </label>
                                                    </div>

                                                    {caliberFields.image_urls.length > 0 ? (
                                                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 p-3 bg-zinc-100/50 dark:bg-zinc-900/30 border border-border rounded-xl">
                                                            {caliberFields.image_urls.map((url, idx) => (
                                                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-white dark:bg-zinc-950 flex items-center justify-center group">
                                                                    <img src={url} alt={`Imagen ${idx + 1}`} className="w-full h-full object-contain p-1" />
                                                                    
                                                                    {idx === 0 && (
                                                                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[0.5rem] font-bold bg-df-green-500 text-black rounded uppercase tracking-wider">
                                                                            Principal
                                                                        </span>
                                                                    )}

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setCaliberFields(prev => ({
                                                                                ...prev,
                                                                                image_urls: prev.image_urls.filter((_, i) => i !== idx)
                                                                            }));
                                                                        }}
                                                                        className="absolute top-1 right-1 p-0.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-md"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-6 border border-dashed border-border rounded-xl bg-zinc-50/50 dark:bg-zinc-900/10">
                                                            <p className="text-[0.625rem] text-muted-foreground italic">No hay imágenes en la galería del calibre.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[0.625rem] font-bold text-muted-foreground uppercase mb-1">
                                                    Armas Compatibles (Vincular directamente)
                                                </label>
                                                <div className="relative mb-2 group">
                                                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-df-green-500 transition-colors" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar arma para enlazar..."
                                                        value={weaponSearchInForm}
                                                        onChange={(e) => setWeaponSearchInForm(e.target.value)}
                                                        className="pl-8 pr-3 py-1.5 w-full text-[0.6875rem] bg-zinc-50 dark:bg-zinc-950 border border-border focus:outline-none focus:ring-1 focus:ring-df-green-500/50 rounded-xl"
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto border border-border rounded-xl p-2 bg-zinc-50 dark:bg-zinc-950 divide-y divide-border/20">
                                                    {(() => {
                                                        const uniqueWeapons = Array.from(
                                                            new Map(weapons.map(w => [w.weapon_name.toLowerCase(), w])).values()
                                                        );
                                                        const filteredFormWeapons = uniqueWeapons.filter(w =>
                                                            w.weapon_name.toLowerCase().includes(weaponSearchInForm.toLowerCase()) ||
                                                            getCategoryLabel(w.category).toLowerCase().includes(weaponSearchInForm.toLowerCase())
                                                        );
                                                        
                                                        if (filteredFormWeapons.length === 0) {
                                                            return (
                                                                <div className="text-center py-4 text-muted-foreground italic text-[0.625rem]">
                                                                    No se encontraron armas en el catálogo.
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return filteredFormWeapons.map((w) => {
                                                            const isSelected = caliberFields.weapons.includes(w.weapon_name);
                                                            return (
                                                                <div
                                                                    key={w.id}
                                                                    onClick={() => {
                                                                        setCaliberFields(prev => {
                                                                            const exists = prev.weapons.includes(w.weapon_name);
                                                                            return {
                                                                                ...prev,
                                                                                weapons: exists
                                                                                    ? prev.weapons.filter(name => name !== w.weapon_name)
                                                                                    : [...prev.weapons, w.weapon_name]
                                                                            };
                                                                        });
                                                                    }}
                                                                    className={cn(
                                                                        "flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors select-none",
                                                                        isSelected && "bg-df-green-500/5 dark:bg-df-green-500/10"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        {w.image_url ? (
                                                                            <img src={w.image_url} alt={w.weapon_name} className="w-8 h-5 object-contain" />
                                                                        ) : (
                                                                            <Swords className="w-4 h-4 text-muted-foreground" />
                                                                        )}
                                                                        <div>
                                                                            <span className="font-bold text-foreground block leading-tight text-[0.6875rem] uppercase">{w.weapon_name}</span>
                                                                            <span className="text-[0.5625rem] text-muted-foreground">{getCategoryLabel(w.category)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className={cn(
                                                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                                        isSelected
                                                                            ? "bg-df-green-500 border-df-green-500 text-white"
                                                                            : "border-border"
                                                                    )}>
                                                                        {isSelected && <span className="text-[0.625rem] font-bold">✓</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                                <span className="block text-[0.5625rem] text-muted-foreground mt-1.5">
                                                    Selecciona las armas que usan este calibre. Las armas seleccionadas se asociarán a este calibre, y las desmarcadas se desvincularán.
                                                </span>
                                            </div>
                                        </div>
                                    )}

                            {/* FOOTER ACTIONS */}
                            <div className="pt-4 border-t border-border flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-4 py-2 border border-border rounded-xl text-muted-foreground hover:text-foreground font-black uppercase tracking-wider"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-df-green-500 hover:bg-df-green-600 disabled:bg-df-green-500/40 text-white rounded-xl font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-df-green-500/25"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        "Guardar"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMACIÓN PREMIUM */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div 
                        className="bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl p-6 w-full max-w-md transform scale-100 transition-all duration-300 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header con Icono */}
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center border",
                                deleteConfirm.type === "calibers" 
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                                    : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                                <AlertTriangle className="w-6 h-6 animate-pulse" />
                            </div>
                            
                            <div className="space-y-1">
                                <h3 className="text-base font-black text-white uppercase tracking-wider">
                                    {deleteConfirm.type === "calibers" && "Eliminar Calibre"}
                                    {deleteConfirm.type === "weapons" && "Restablecer Arma"}
                                    {deleteConfirm.type === "ammo" && "Eliminar Munición"}
                                    {deleteConfirm.type === "gear" && "Eliminar Protección"}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Estás a punto de eliminar/modificar <span className="font-bold text-white">"{deleteConfirm.name}"</span>.
                                </p>
                            </div>
                        </div>

                        {/* Error de eliminación */}
                        {deleteError && (
                            <div className="p-3 my-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold text-center">
                                {deleteError}
                            </div>
                        )}

                        {/* Detalles específicos del impacto */}
                        <div className="my-5 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-xs text-zinc-300 space-y-3">
                            <p className="font-semibold text-zinc-100">
                                {deleteConfirm.type === "calibers" 
                                    ? "⚠️ ATENCIÓN: Esta acción es destructiva y tendrá los siguientes efectos en cascada:" 
                                    : "¿Confirmas que deseas proceder con esta acción?"}
                            </p>
                            
                            {deleteConfirm.type === "calibers" && (
                                <ul className="space-y-2.5 pl-1">
                                    <li className="flex items-start gap-2">
                                        <span className="text-red-500 shrink-0 font-bold">🔴</span>
                                        <span>Todas las balas/municiones asociadas a este calibre se eliminarán permanentemente.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber-500 shrink-0 font-bold">🔗</span>
                                        <span>Las armas de este calibre se desvincularán y volverán a su calibre original por defecto.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-zinc-500 shrink-0 font-bold">ℹ️</span>
                                        <span>Esta acción no se puede deshacer de forma automática.</span>
                                    </li>
                                </ul>
                            )}

                            {deleteConfirm.type === "weapons" && (
                                <p className="text-zinc-400">
                                    Las estadísticas de combate de esta arma serán devueltas a sus valores oficiales de fábrica. Todos los cambios personalizados se perderán.
                                </p>
                            )}

                            {deleteConfirm.type === "ammo" && (
                                <p className="text-zinc-400">
                                    Este proyectil se eliminará permanentemente de las tablas de datos y ya no se mostrará en las comparativas de munición ni estará disponible para armas de este calibre.
                                </p>
                            )}

                            {deleteConfirm.type === "gear" && (
                                <p className="text-zinc-400">
                                    Esta pieza de equipamiento (chaleco/casco) y sus estadísticas de durabilidad se eliminarán permanentemente de la enciclopedia.
                                </p>
                            )}
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center gap-3 justify-end mt-4">
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 sm:flex-initial px-4 py-2.5 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-xs font-black uppercase text-zinc-400 hover:text-white transition-all disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={executeDelete}
                                className={cn(
                                    "flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 text-white",
                                    deleteConfirm.type === "calibers"
                                        ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 disabled:bg-amber-500/40"
                                        : "bg-red-500 hover:bg-red-600 shadow-red-500/20 disabled:bg-red-500/40"
                                )}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>{deleteConfirm.type === "weapons" ? "Restablecer" : "Confirmar Eliminar"}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )}
</div>
    );
}
