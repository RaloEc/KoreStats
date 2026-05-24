-- Migración: Agregar campos específicos para chalecos tácticos en delta_force_gear
ALTER TABLE public.delta_force_gear
ADD COLUMN IF NOT EXISTS repair_efficiency TEXT DEFAULT 'medio' CHECK (repair_efficiency IN ('bajo', 'medio', 'alto')),
ADD COLUMN IF NOT EXISTS durability_cost TEXT DEFAULT 'medio' CHECK (durability_cost IN ('bajo', 'medio', 'alto')),
ADD COLUMN IF NOT EXISTS weight_kg DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS description TEXT;
