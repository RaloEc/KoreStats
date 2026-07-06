// Catálogo estático o caché de armas base para Fuse.js
// Esto evita hacer un SELECT a la base de datos cada vez que alguien escribe mal un nombre.
// Se recomienda generar este archivo estáticamente durante el build, o mantener un caché en memoria.

export interface BaseWeapon {
  id: string;
  weapon_name: string;
  category: string;
  image_url: string;
}

export const baseWeapons: BaseWeapon[] = [
  {
    id: "m4a1-id-1234",
    weapon_name: "M4A1 Assault Rifle",
    category: "Assault Rifle",
    image_url: "https://korestats.com/images/weapons/m4a1.png"
  },
  {
    id: "scar-h-id-5678",
    weapon_name: "SCAR-H Battle Rifle",
    category: "Battle Rifle",
    image_url: "https://korestats.com/images/weapons/scar-h.png"
  },
  {
    id: "as-val-id-9012",
    weapon_name: "AS VAL",
    category: "Assault Rifle",
    image_url: "https://korestats.com/images/weapons/as-val.png"
  },
  {
    id: "m1a-id-3456",
    weapon_name: "M1A",
    category: "Marksman Rifle",
    image_url: "https://korestats.com/images/weapons/m1a.png"
  }
  // Añadir aquí las 131 armas o rellenar este archivo mediante un script
];
