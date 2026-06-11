export interface WeaponItem {
  id: string;
  weapon_name: string;
  category: string;
  game_mode: string;
  caliber: string | null;
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
  is_configured: boolean;
}

let weaponsPromise: Promise<WeaponItem[]> | null = null;
let cachedWeapons: WeaponItem[] | null = null;

// Cargar armas oficiales de Delta Force desde la API con caché en el cliente
export async function getDeltaForceWeapons(): Promise<WeaponItem[]> {
  if (cachedWeapons) return cachedWeapons;
  if (weaponsPromise) return weaponsPromise;

  weaponsPromise = fetch("/api/games/delta-force/base-data?type=weapons&mode=operations")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch weapons base data");
      return res.json();
    })
    .then((data) => {
      cachedWeapons = data.weapons || [];
      return cachedWeapons!;
    })
    .catch((err) => {
      console.error("[weapon-service] Error fetching weapons:", err);
      weaponsPromise = null; // Reintentar en caso de fallo
      return [];
    });

  return weaponsPromise;
}

// Buscar armas base en local según la consulta
export async function searchWeaponsContent(query: string): Promise<any[]> {
  const weapons = await getDeltaForceWeapons();
  const cleanQuery = query.toLowerCase().trim();

  const filtered = weapons.filter((w) =>
    w.weapon_name.toLowerCase().includes(cleanQuery) ||
    w.category.toLowerCase().includes(cleanQuery)
  );

  return filtered.map((w) => ({
    id: w.weapon_name, // Usamos el nombre como id para identificarlo en el texto
    name: w.weapon_name,
    type: "weapon",
    image: w.image_url,
    description: `Categoría: ${w.category} • Calibre: ${w.caliber || "N/A"}`,
  }));
}
