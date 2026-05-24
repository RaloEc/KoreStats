-- Migración: Agregar columnas body_damage y armor_penetration a la tabla delta_force_ammo
ALTER TABLE public.delta_force_ammo 
ADD COLUMN IF NOT EXISTS body_damage TEXT,
ADD COLUMN IF NOT EXISTS armor_penetration TEXT;

-- En caso de que ya se haya creado como INTEGER en un paso anterior, la convertimos a TEXT
ALTER TABLE public.delta_force_ammo 
ALTER COLUMN armor_penetration TYPE TEXT USING armor_penetration::TEXT;

-- Eliminar la restricción de unicidad de (name, caliber) para permitir múltiples municiones con el mismo nombre en el mismo calibre
ALTER TABLE public.delta_force_ammo 
DROP CONSTRAINT IF EXISTS delta_force_ammo_name_caliber_key;
