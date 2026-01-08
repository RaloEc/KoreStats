-- Script para agregar columnas faltantes a la tabla perfiles
-- Ejecutar en Supabase SQL Editor

-- Agregar columna activo si no existe (para sistema de baneo)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'perfiles' AND column_name = 'activo') THEN
        ALTER TABLE perfiles ADD COLUMN activo BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Agregar columna bio si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'perfiles' AND column_name = 'bio') THEN
        ALTER TABLE perfiles ADD COLUMN bio TEXT;
    END IF;
END $$;

-- Agregar columna ubicacion si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'perfiles' AND column_name = 'ubicacion') THEN
        ALTER TABLE perfiles ADD COLUMN ubicacion VARCHAR(255);
    END IF;
END $$;

-- Agregar columna sitio_web si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'perfiles' AND column_name = 'sitio_web') THEN
        ALTER TABLE perfiles ADD COLUMN sitio_web VARCHAR(500);
    END IF;
END $$;

-- Agregar columna fecha_ultimo_acceso si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'perfiles' AND column_name = 'fecha_ultimo_acceso') THEN
        ALTER TABLE perfiles ADD COLUMN fecha_ultimo_acceso TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_perfiles_activo ON perfiles(activo);
CREATE INDEX IF NOT EXISTS idx_perfiles_role ON perfiles(role);
CREATE INDEX IF NOT EXISTS idx_perfiles_username ON perfiles(username);

-- Actualizar usuarios existentes para que tengan activo = true por defecto
UPDATE perfiles SET activo = true WHERE activo IS NULL;

-- Comentarios sobre las columnas agregadas
COMMENT ON COLUMN perfiles.activo IS 'Indica si la cuenta del usuario está activa (para sistema de baneo)';
COMMENT ON COLUMN perfiles.bio IS 'Biografía del usuario';
COMMENT ON COLUMN perfiles.ubicacion IS 'Ubicación geográfica del usuario';
COMMENT ON COLUMN perfiles.sitio_web IS 'URL del sitio web personal del usuario';
COMMENT ON COLUMN perfiles.fecha_ultimo_acceso IS 'Fecha y hora del último acceso del usuario';

-- Mostrar estructura actualizada de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'perfiles' 
ORDER BY ordinal_position;
