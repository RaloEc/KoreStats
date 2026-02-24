-- Agregar columna profile_icon_id a la tabla summoners
ALTER TABLE public.summoners 
ADD COLUMN IF NOT EXISTS profile_icon_id INTEGER;

COMMENT ON COLUMN public.summoners.profile_icon_id IS 'ID del icono de perfil del invocador';
