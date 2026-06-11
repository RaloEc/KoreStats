import { calculateStandardTTK, simulateTTK } from "./src/lib/delta-force/defaultData.ts";

// Let's duplicate the logic of simulateTTK to inspect it step by step
const damage = 40;
const fireRate = 600;
const bulletLevel = 4;
const armorLevel = 4;
const penetration = 42; // weaponPenetration
const weaponRange = 52;
const distance = 30;

const rps = fireRate / 60;
let hp = 100;
const d1 = weaponRange * 0.8; 
const d2 = weaponRange * 1.25; 
let multiplier = 1.0;
if (distance > d2) {
    multiplier = 0.85;
} else if (distance > d1) {
    multiplier = 0.92;
}

const damageAfterFalloff = damage * multiplier;
const bulletDamage = damageAfterFalloff; // damage_ratio is 100
const armorDamageMult = 100 / 100; // calculateDamagePenetration(4, 4) = 50 -> wait! Let's check!
// In defaultData.ts:
// calculateDamagePenetration(bulletLevel, armorLevel) -> diff = 0 -> returns 50!
// So:
const damagePenPct = bulletLevel === armorLevel ? 50 : (bulletLevel > armorLevel ? 75 : 0); // diff = 0 -> 50
const armorDamage = 15 * (50 / 100); // 7.5
let durability = 110; // tier 4 mock armor max_durability is 110
let materialMult = 1.0; // aramida

let btk = 0;
while (hp > 0 && btk < 30) {
    btk++;
    let currentDamage = bulletDamage * 1.0;
    let tierDiff = bulletLevel - armorLevel; // 0
    let text = "";
    if (armorLevel > 0 && durability > 0) {
        if (tierDiff >= 0) {
            let mitigation = 0.95;
            if (tierDiff === 0) {
                mitigation = 0.65;
            }
            currentDamage = currentDamage * mitigation;
            durability -= Math.max(2, armorDamage * materialMult * (penetration / 40));
        } else {
            currentDamage = 0;
            durability -= Math.max(2, armorDamage * materialMult * (penetration / 40));
        }
    }
    hp -= currentDamage;
    console.log(`Bala ${btk}: daño infligido = ${currentDamage}, durabilidad restante = ${durability}, salud restante = ${hp}`);
}

console.log("Calculated BTK:", btk, "TTK:", (btk - 1) / rps);
