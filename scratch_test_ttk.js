import { calculateStandardTTK } from "./src/lib/delta-force/defaultData.ts";

const ttk = calculateStandardTTK(
    40, // damage
    600, // fireRate
    4, // armorLevel
    4, // bulletLevel
    "Assault", // category
    "operations", // gameMode
    30, // distance
    42, // weaponPenetration
    52 // weaponRange
);

console.log("Calculated TTK:", ttk);
