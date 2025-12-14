-- Agregar columna 'status' a tabla 'profiles'
ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'in-game', 'offline'));

-- Crear índice para búsquedas rápidas por estado
CREATE INDEX IF NOT EXISTS idx_perfiles_status ON public.perfiles(status);

-- Crear índice para búsquedas por usuario y estado
CREATE INDEX IF NOT EXISTS idx_perfiles_id_status ON public.perfiles(id, status);
