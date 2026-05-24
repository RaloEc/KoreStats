export interface BaseWeapon {
    id: string;
    weapon_name: string;
    category: string;
    caliber: string | null;
    game_mode: 'operations' | 'warfare';
    base_damage: string;
    base_fire_rate: number;
    base_control: number;
    base_handling: number;
    base_stability: number;
    base_accuracy: number;
    base_range: number;
    base_capacity: number;
    base_muzzle_velocity: number;
    base_armor_penetration: string;
    image_url: string | null;
    // Extended fields from the merge with delta_force_weapons
    official_id?: string;
    base_id?: string | null;
    is_configured?: boolean;
}

export interface BaseCaliber {
    id: string;
    name: string;
    image_url: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface BaseAmmo {
    id: string;
    name: string;
    caliber: string;
    description: string | null;
    // Nivel de perforación 0-6: define contra qué niveles de blindaje penetra
    penetration_level: number;
    // Proporción de daño corporal (%). 100 = x1.0, 150 = x1.5 del daño base del arma
    damage_ratio: number;
    // Qué tan rápido pierde efectividad la penetración al atravesar blindaje
    armor_pen_degradation: 'bajo' | 'medio' | 'alto';
    // Coeficiente de caída de penetración (%)
    pen_falloff_coefficient: number;
    // Eficiencia destructora sobre la durabilidad del blindaje por nivel (100 = x1.0)
    damage_vs_armor_1: number;
    damage_vs_armor_2: number;
    damage_vs_armor_3: number;
    damage_vs_armor_4: number;
    damage_vs_armor_5: number;
    damage_vs_armor_6: number;
    image_url: string | null;
    compatible_weapons?: string[];
    body_damage?: string | null;
    armor_penetration?: string | null;
}

export interface BaseGear {
    id: string;
    name: string;
    type: "helmet" | "armor";
    tier: number;
    max_durability: number;
    material: string;
    speed_penalty: number;
    ergo_penalty: number;
    zones_protected?: string[];
    image_url: string | null;
    repair_efficiency?: 'bajo' | 'medio' | 'alto';
    durability_cost?: 'bajo' | 'medio' | 'alto';
    weight_kg?: number;
    description?: string | null;
}

export const DEFAULT_WEAPONS: BaseWeapon[] = [
    {
        id: "w-m4a1",
        weapon_name: "M4A1",
        category: "Fusil de asalto",
        caliber: "5.56x45mm",
        game_mode: "operations",
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
        image_url: null,
    },
    {
        id: "w-ak47",
        weapon_name: "AK-47",
        category: "Fusil de asalto",
        caliber: "7.62x39mm",
        game_mode: "operations",
        base_damage: "39",
        base_fire_rate: 600,
        base_control: 50,
        base_handling: 60,
        base_stability: 55,
        base_accuracy: 70,
        base_range: 65,
        base_capacity: 30,
        base_muzzle_velocity: 715,
        base_armor_penetration: "22",
        image_url: null,
    },
    {
        id: "w-qbz951",
        weapon_name: "QBZ-95-1",
        category: "Fusil de asalto",
        caliber: "5.56x45mm",
        game_mode: "operations",
        base_damage: "34",
        base_fire_rate: 650,
        base_control: 68,
        base_handling: 65,
        base_stability: 72,
        base_accuracy: 72,
        base_range: 60,
        base_capacity: 30,
        base_muzzle_velocity: 850,
        base_armor_penetration: "21",
        image_url: null,
    },
    {
        id: "w-mk47",
        weapon_name: "MK47 Tryhard",
        category: "Fusil de batalla",
        caliber: "7.62x39mm",
        game_mode: "operations",
        base_damage: "40",
        base_fire_rate: 550,
        base_control: 55,
        base_handling: 62,
        base_stability: 60,
        base_accuracy: 75,
        base_range: 70,
        base_capacity: 20,
        base_muzzle_velocity: 730,
        base_armor_penetration: "28",
        image_url: null,
    },
    {
        id: "w-awm",
        weapon_name: "AWM Sniper",
        category: "Rifle de francotirador",
        caliber: ".338 Lapua",
        game_mode: "operations",
        base_damage: "95",
        base_fire_rate: 40,
        base_control: 30,
        base_handling: 35,
        base_stability: 40,
        base_accuracy: 95,
        base_range: 100,
        base_capacity: 5,
        base_muzzle_velocity: 910,
        base_armor_penetration: "55",
        image_url: null,
    },
    {
        id: "w-mp5",
        weapon_name: "MP5",
        category: "Subfusil",
        caliber: "9x19mm",
        game_mode: "operations",
        base_damage: "28",
        base_fire_rate: 800,
        base_control: 75,
        base_handling: 82,
        base_stability: 80,
        base_accuracy: 55,
        base_range: 40,
        base_capacity: 30,
        base_muzzle_velocity: 400,
        base_armor_penetration: "10",
        image_url: null,
    }
];

// Sin datos por defecto: el admin los ingresa desde la UI
export const DEFAULT_AMMO: BaseAmmo[] = [];

export const DEFAULT_GEAR: BaseGear[] = [];

export const calculateDamagePenetration = (bulletLevel: number, armorLevel: number): number => {
    const diff = bulletLevel - armorLevel;
    if (diff < 0) return 0;
    if (diff === 0) return 50;
    if (diff === 1) return 75;
    return 100;
};
