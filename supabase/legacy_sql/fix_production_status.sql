-- PRODUCITON FIX: RUN THIS IN SUPABASE SQL EDITOR

-- 1. Asegurar que la columna status existe en perfiles
ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';

-- 2. Asegurar restricción de valores permitidos
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'perfiles_status_check') THEN
        ALTER TABLE public.perfiles
        ADD CONSTRAINT perfiles_status_check 
        CHECK (status IN ('online', 'in-game', 'offline'));
    END IF;
END $$;

-- 3. Asegurar índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_perfiles_status ON public.perfiles(status);
CREATE INDEX IF NOT EXISTS idx_perfiles_id_status ON public.perfiles(id, status);

-- 4. Verificar configuración (Esto no arregla ENV vars, pero ayuda a debug)
-- No se puede verificar ENV vars desde SQL
