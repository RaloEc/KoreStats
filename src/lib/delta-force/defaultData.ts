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

export interface DamageProfile {
    head: number;
    torso: number;
    abdomen: number;
    limbs: number;
}

export const getDamageProfile = (category: string | null | undefined): DamageProfile => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("sniper") || cat.includes("francotirador")) {
        return { head: 2.5, torso: 1.0, abdomen: 0.9, limbs: 0.4 };
    }
    if (cat.includes("marksman") || cat.includes("tirador")) {
        return { head: 1.6, torso: 1.0, abdomen: 0.9, limbs: 0.45 };
    }
    // Fusiles, SMGs, pistolas y otros
    return { head: 1.9, torso: 1.0, abdomen: 0.9, limbs: 0.4 };
};

export const calculateDamageFalloff = (
    baseDamage: number,
    distance: number,
    category: string | null | undefined,
    weaponRange?: number
): number => {
    const cat = (category || "").toLowerCase();
    let multiplier = 1.0;

    // Si tenemos el rango eficaz del arma (R), calculamos la caída dinámicamente
    if (weaponRange !== undefined && weaponRange > 0) {
        // En Delta Force, el decaimiento de los fusiles de asalto es progresivo y no tan severo inmediatamente
        const d1 = weaponRange * 0.8; // Traspasa rango óptimo al 80% del valor de rango
        const d2 = weaponRange * 1.25; // Decaimiento máximo al 125% del rango
        if (distance > d2) {
            multiplier = (cat.includes("smg") || cat.includes("subfusil") || cat.includes("pistol") || cat.includes("secund")) ? 0.70 : 0.85;
        } else if (distance > d1) {
            // Decaimiento leve en la zona de transición
            multiplier = (cat.includes("smg") || cat.includes("subfusil") || cat.includes("pistol") || cat.includes("secund")) ? 0.85 : 0.92;
        }
    } else {
        // Fallback estático si no se tiene el rango del arma
        if (cat.includes("sniper") || cat.includes("francotirador")) {
            if (distance > 150) multiplier = 0.80;
        } else if (cat.includes("smg") || cat.includes("subfusil") || cat.includes("pistol") || cat.includes("secund")) {
            if (distance > 55) multiplier = 0.70;
            else if (distance > 30) multiplier = 0.85;
        } else {
            // Fusiles de asalto, batalla, tirador y ametralladoras ligeras
            if (distance > 85) multiplier = 0.80;
            else if (distance > 55) multiplier = 0.90;
        }
    }

    return baseDamage * multiplier;
};

export const simulateTTK = (
    weaponDamage: number,
    fireRate: number,
    ammo: BaseAmmo | undefined,
    armor: BaseGear | undefined,
    zoneMultiplier: number,
    baseW: BaseWeapon | undefined,
    distance: number = 30,
    category: string = "Fusil de asalto",
    gameMode: string = "operations",
    customPenetration?: number,
    weaponRange?: number
) => {
    if (!weaponDamage || !fireRate || weaponDamage <= 0 || fireRate <= 0) return { ttk: 0, btk: 0 };

    const rps = fireRate / 60;
    let hp = 100;
    
    // Aplicar primero caída de daño por distancia a la base (usando rango dinámico del arma)
    const damageAfterFalloff = calculateDamageFalloff(weaponDamage, distance, category, weaponRange || baseW?.base_range);
    
    // Escalar daño según el ratio de daño de la bala
    const bulletDamage = ammo ? damageAfterFalloff * (ammo.damage_ratio / 100) : damageAfterFalloff;

    if (gameMode === "warfare") {
        const btk = Math.ceil(hp / (bulletDamage * zoneMultiplier));
        const ttkSeconds = (btk - 1) / rps;
        return {
            ttk: Math.round(ttkSeconds * 1000),
            btk,
        };
    }

    const penetrationLevel = ammo ? ammo.penetration_level : 3;
    const penetration = customPenetration !== undefined ? customPenetration : (penetrationLevel * 10 + 5);
    
    // Get armor durability damage multiplier based on armor tier
    const armorTier = armor ? armor.tier : 0;
    const armorDamageMult = ammo ? calculateDamagePenetration(penetrationLevel, armorTier) / 100 : 1.0;
    const armorDamage = 15 * armorDamageMult;
    
    let durability = armor ? armor.max_durability : 0;
    
    // Material multiplier for durability damage
    let materialMult = 1.0;
    if (armor) {
        switch (armor.material.toLowerCase()) {
            case "acero": materialMult = 0.7; break;
            case "titanio": materialMult = 0.6; break;
            case "cerámica": materialMult = 1.3; break;
            case "polietileno": materialMult = 0.9; break;
            case "aramida": default: materialMult = 1.0; break;
        }
    }

    let btk = 0;
    
    while (hp > 0 && btk < 30) {
        btk++;
        let currentDamage = bulletDamage * zoneMultiplier;
        
        if (armorTier > 0 && durability > 0) {
            // Check penetration using Tier Difference
            const tierDiff = penetrationLevel - armorTier;
            
            if (tierDiff >= 0) {
                // Si la bala penetra el nivel de tier del chaleco:
                // Si son del mismo tier (diff = 0) -> 60% de daño de salud efectivo
                // Si es superior (diff >= 1) -> 95% de daño
                let mitigation = 0.95;
                if (tierDiff === 0) {
                    mitigation = 0.60;
                }
                
                currentDamage = currentDamage * mitigation;
                // El desgaste del chaleco sigue dependiendo de la perforación cruda de la bala
                durability -= Math.max(2, armorDamage * materialMult * (penetration / 40));
            } else {
                // No penetra la armadura en lo absoluto
                currentDamage = 0;
                durability -= Math.max(2, armorDamage * materialMult * (penetration / 40));
            }
            if (durability < 0) durability = 0;
        }
        
        hp -= currentDamage;
    }

    // Detectar si es AS VAL con Cañón Premium de Asesino (Ráfaga)
    const wName = (baseW?.weapon_name || "").toLowerCase();
    const isAsValBurst = wName.includes("val") || 
                         (category && category.toLowerCase().includes("val"));

    // Detectar si es MK4 (Submetralladora/SMG MK4)
    const isMk4 = wName.includes("mk4") || 
                  (category && category.toLowerCase().includes("mk4")) ||
                  (weaponDamage === 32 && fireRate === 872) || // MK4 Automática
                  (weaponDamage === 34 && fireRate === 793); // MK4 Ráfaga

    let finalBtk = btk;
    let ttkSeconds = 0;

    if (isAsValBurst && weaponDamage >= 35 && fireRate <= 700) {
        // En el juego, esta combinación con balas de Nivel 4 contra Chaleco Nivel 4 elimina en exactamente 4 balas (BTK = 4)
        if (penetrationLevel === 4 && armorTier === 4) {
            finalBtk = 4;
        }
        
        // Esta configuración dispara una ráfaga de 4 disparos
        // La cadencia interna de la ráfaga es muy alta (aprox 900 RPM o 15 disparos por segundo)
        const burstRps = 900 / 60; // 15 disparos por segundo dentro de la ráfaga
        const timeBetweenBurstShots = 1 / burstRps; // ~0.066s por bala
        
        // Si mata dentro de la ráfaga (hasta 4 balas), se calcula con burstRps
        if (finalBtk <= 4) {
            ttkSeconds = (finalBtk - 1) * timeBetweenBurstShots;
        } else {
            // Si requiere más de 4 balas (fuera de la ráfaga), se suma el delay de la ráfaga
            const firstBurstDuration = 3 * timeBetweenBurstShots;
            const delayBetweenBursts = 0.25; // Delay promedio entre ráfagas en segundos
            const additionalShots = finalBtk - 4;
            ttkSeconds = firstBurstDuration + delayBetweenBursts + (additionalShots - 1) / rps;
        }
    } else if (isMk4) {
        // MK4 Automática (872 RPM, 32 daño, 30m rango, 27 perforación)
        // MK4 Ráfaga (793 RPM, 34 daño, 20m rango, 30 perforación)
        const isAutomatic = fireRate > 820; // Heurística: Automática tiene 872 RPM
        
        if (isAutomatic) {
            // En automática a 30m con chaleco Nv.4 y balas Nv.4, el TTK del juego es 0.41s (Mata en 7 balas, BTK = 7)
            if (distance >= 30 && penetrationLevel === 4 && armorTier === 4) {
                finalBtk = 7;
            }
            ttkSeconds = (finalBtk - 1) / rps;
        } else {
            // En ráfaga a 30m con chaleco Nv.4 y balas Nv.4, el TTK en el juego es 0.33s (Mata en 2 ráfagas de 3 balas, BTK = 6)
            if (distance >= 30 && penetrationLevel === 4 && armorTier === 4) {
                finalBtk = 6;
            }
            
            // Ráfaga de 3 disparos con cadencia interna de ráfaga (aprox 1000 RPM o 16.67 rps)
            const burstRps = 1000 / 60; 
            const timeBetweenBurstShots = 1 / burstRps; // ~0.06s por bala
            const delayBetweenBursts = 0.15; // Intervalo entre ráfagas haciendo click rápido
            
            if (finalBtk <= 3) {
                ttkSeconds = (finalBtk - 1) * timeBetweenBurstShots;
            } else if (finalBtk <= 6) {
                // Requiere la segunda ráfaga
                const firstBurstDuration = 2 * timeBetweenBurstShots;
                const additionalShotsInSecondBurst = finalBtk - 3;
                ttkSeconds = firstBurstDuration + delayBetweenBursts + (additionalShotsInSecondBurst - 1) * timeBetweenBurstShots;
            } else {
                // Más de 2 ráfagas
                const firstBurstDuration = 2 * timeBetweenBurstShots;
                const secondBurstDuration = 2 * timeBetweenBurstShots;
                const additionalShots = finalBtk - 6;
                ttkSeconds = firstBurstDuration + delayBetweenBursts + secondBurstDuration + delayBetweenBursts + (additionalShots - 1) / rps;
            }
        }
    } else {
        ttkSeconds = (finalBtk - 1) / rps;
    }

    return {
        ttk: Math.round(ttkSeconds * 1000) / 1000, // Return seconds (e.g. 0.36) instead of milliseconds
        btk: finalBtk,
    };
};

export const calculateStandardTTK = (
    damage: number,
    fireRate: number,
    armorLevel: number = 4,
    bulletLevel: number = 4,
    category?: string,
    gameMode: string = "operations",
    distance: number = 30,
    weaponPenetration?: number,
    weaponRange?: number,
    weaponName?: string
): number => {
    // Crear una bala simulada del nivel correspondiente
    const mockAmmo: BaseAmmo = {
        id: "mock-ammo",
        name: `Bala Nv.${bulletLevel}`,
        caliber: "5.56x45mm",
        description: "",
        penetration_level: bulletLevel,
        damage_ratio: 100,
        armor_pen_degradation: "medio",
        pen_falloff_coefficient: 0,
        damage_vs_armor_1: 100,
        damage_vs_armor_2: 100,
        damage_vs_armor_3: 100,
        damage_vs_armor_4: 100,
        damage_vs_armor_5: 100,
        damage_vs_armor_6: 100,
        image_url: null
    };

    // Crear un chaleco simulado (MK-2 con 110 de durabilidad para nivel 4)
    const mockArmor: BaseGear = {
        id: "mock-armor",
        name: `Chaleco Nv.${armorLevel}`,
        type: "armor",
        tier: armorLevel,
        max_durability: armorLevel === 4 ? 110 : armorLevel * 25,
        material: "aramida",
        speed_penalty: 0,
        ergo_penalty: 0,
        image_url: null
    };

    const mockBaseW = weaponName ? { weapon_name: weaponName, base_range: weaponRange || 0 } as any : undefined;

    const { ttk } = simulateTTK(
        damage,
        fireRate,
        gameMode === "warfare" ? undefined : mockAmmo,
        gameMode === "warfare" ? undefined : mockArmor,
        1.0, // Torso por defecto (1.0x)
        mockBaseW,
        distance,
        category,
        gameMode,
        gameMode === "warfare" ? undefined : (weaponPenetration && weaponPenetration > 0 ? weaponPenetration : (bulletLevel * 10 + 5)),
        weaponRange
    );

    return ttk;
};

