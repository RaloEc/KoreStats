-- Migración: Cambiar base_damage y base_armor_penetration a TEXT en delta_force_weapons_base
ALTER TABLE public.delta_force_weapons_base 
ALTER COLUMN base_damage TYPE TEXT USING base_damage::TEXT,
ALTER COLUMN base_armor_penetration TYPE TEXT USING base_armor_penetration::TEXT;
