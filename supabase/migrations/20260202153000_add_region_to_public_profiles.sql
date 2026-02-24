-- Agregar columna region a la tabla public_profiles
ALTER TABLE public.public_profiles 
ADD COLUMN IF NOT EXISTS region VARCHAR(10) DEFAULT 'la1';

COMMENT ON COLUMN public.public_profiles.region IS 'Región del servidor de Riot (la1, kr, euw1, etc)';
