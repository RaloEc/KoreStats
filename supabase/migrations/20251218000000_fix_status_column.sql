-- Asegurar que la columna status existe en perfiles
ALTER TABLE public.perfiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';

-- Asegurar restricción de valores permitidos
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'perfiles_status_check') THEN
        ALTER TABLE public.perfiles
        ADD CONSTRAINT perfiles_status_check 
        CHECK (status IN ('online', 'in-game', 'offline'));
    END IF;
END $$;

-- Asegurar índices
CREATE INDEX IF NOT EXISTS idx_perfiles_status ON public.perfiles(status);
CREATE INDEX IF NOT EXISTS idx_perfiles_id_status ON public.perfiles(id, status);

-- Actualizar función de manejo de usuarios si es necesario
-- (Opcional, depende de cómo creas usuarios)
