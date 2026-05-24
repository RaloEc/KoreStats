-- Migración: Agregar columna compatible_weapons a la tabla delta_force_ammo
-- Esta columna permite asociar múltiples armas del catálogo con cada munición.

ALTER TABLE public.delta_force_ammo 
ADD COLUMN IF NOT EXISTS compatible_weapons TEXT[] DEFAULT '{}' NOT NULL;
