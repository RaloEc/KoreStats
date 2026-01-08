# Instrucciones para Agregar Campos de Soft Delete

## ⚠️ Problema Actual

El error indica que las columnas `deleted`, `deleted_at` y `deleted_by` no existen en tu base de datos:

```
Error: Could not find the 'deleted' column of 'foro_posts' in the schema cache
```

## ✅ Solución

Necesitas ejecutar una migración SQL para agregar estas columnas a las tablas `comentarios` y `foro_posts`.

## 📋 Pasos para Aplicar la Migración

### Opción 1: Usando Supabase Dashboard (Recomendado)

1. **Abre Supabase Dashboard**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "+ New query"

3. **Copia y pega el siguiente SQL**

```sql
-- Migración para agregar campos de soft delete a las tablas
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar si las columnas ya existen antes de agregarlas
DO $$ 
BEGIN
    -- Agregar columna deleted a comentarios si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comentarios' AND column_name = 'deleted'
    ) THEN
        ALTER TABLE comentarios ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Agregar columna deleted_at a comentarios si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comentarios' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE comentarios ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Agregar columna deleted_by a comentarios si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comentarios' AND column_name = 'deleted_by'
    ) THEN
        ALTER TABLE comentarios ADD COLUMN deleted_by UUID REFERENCES perfiles(id);
    END IF;

    -- Agregar columna deleted a foro_posts si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'foro_posts' AND column_name = 'deleted'
    ) THEN
        ALTER TABLE foro_posts ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Agregar columna deleted_at a foro_posts si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'foro_posts' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE foro_posts ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Agregar columna deleted_by a foro_posts si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'foro_posts' AND column_name = 'deleted_by'
    ) THEN
        ALTER TABLE foro_posts ADD COLUMN deleted_by UUID REFERENCES perfiles(id);
    END IF;
END $$;

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS comentarios_deleted_idx ON comentarios(deleted);
CREATE INDEX IF NOT EXISTS foro_posts_deleted_idx ON foro_posts(deleted);

-- 3. Verificar que las columnas se crearon correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('comentarios', 'foro_posts')
    AND column_name IN ('deleted', 'deleted_at', 'deleted_by')
ORDER BY table_name, column_name;
```

4. **Ejecuta la consulta**
   - Haz clic en "Run" o presiona `Ctrl+Enter`
   - Deberías ver una tabla con las columnas creadas al final

5. **Verifica el resultado**
   - La última consulta SELECT debe mostrar 6 filas (3 columnas × 2 tablas)
   - Verifica que todas las columnas aparezcan en la lista

### Opción 2: Usando el archivo SQL

También he creado el archivo `scripts/agregar_campos_deleted.sql` que puedes ejecutar directamente.

## 🧪 Verificación

Después de aplicar la migración:

1. **Recarga tu aplicación** en el navegador
2. **Intenta borrar un comentario**
3. **Recarga la página**
4. El comentario debe permanecer eliminado

## 📝 Qué hace esta migración

- ✅ Agrega columna `deleted` (boolean) para marcar si está eliminado
- ✅ Agrega columna `deleted_at` (timestamp) para registrar cuándo se eliminó
- ✅ Agrega columna `deleted_by` (UUID) para registrar quién lo eliminó
- ✅ Crea índices para mejorar el rendimiento de las consultas
- ✅ Es segura: verifica si las columnas ya existen antes de crearlas

## ⚠️ Importante

- Esta migración NO elimina datos existentes
- Los comentarios actuales tendrán `deleted = false` por defecto
- Es seguro ejecutarla múltiples veces (no duplicará columnas)
