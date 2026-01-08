# Corrección: Error al eliminar comentarios

## Problema Identificado

Al intentar eliminar un comentario en la página de noticias, aparece el siguiente error:

```
Error al eliminar el comentario: Could not find the 'deleted_at' column of 'comentarios' in the schema cache
```

## Causa

Falta aplicar la migración que añade las columnas necesarias para el **soft delete** (borrado suave) en las tablas `comentarios` y `foro_posts`.

Las columnas faltantes son:
- `deleted` (BOOLEAN) - Indica si el comentario está eliminado
- `deleted_at` (TIMESTAMPTZ) - Fecha y hora de eliminación
- `deleted_by` (UUID) - ID del usuario que eliminó el comentario

## Solución

### Opción 1: Ejecutar desde el SQL Editor de Supabase (RECOMENDADO)

1. **Abre tu proyecto en Supabase:**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor:**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "New query"

3. **Copia y pega el script:**
   - Abre el archivo: `scripts/agregar_columnas_soft_delete.sql`
   - Copia todo el contenido
   - Pégalo en el SQL Editor

4. **Ejecuta el script:**
   - Haz clic en el botón "Run" o presiona Ctrl+Enter
   - Verás mensajes indicando qué columnas se agregaron

5. **Verifica el resultado:**
   - Al final del script se ejecuta una consulta que muestra las columnas agregadas
   - Deberías ver 6 filas (3 para `comentarios` y 3 para `foro_posts`)

### Opción 2: Ejecutar la migración completa

Si prefieres ejecutar la migración completa con todas las políticas RLS:

1. **Abre el SQL Editor en Supabase**

2. **Copia y pega el contenido de:**
   ```
   supabase/migrations/20250904000000_soft_delete_comentarios.sql
   ```

3. **Ejecuta el script**

**NOTA:** Esta opción también configura políticas de seguridad RLS, pero puede generar errores si algunas políticas ya existen. Si ves errores sobre políticas duplicadas, ignóralos.

## Verificación

Después de ejecutar el script, verifica que funciona:

1. **Recarga la página de la noticia** donde intentaste eliminar el comentario

2. **Intenta eliminar el comentario nuevamente**

3. **El comentario debería eliminarse sin errores**

## ¿Qué hace el soft delete?

En lugar de eliminar permanentemente los comentarios de la base de datos, el sistema ahora:

- Marca el comentario como `deleted = true`
- Registra la fecha de eliminación en `deleted_at`
- Guarda quién lo eliminó en `deleted_by`
- El comentario sigue existiendo en la base de datos pero no se muestra a los usuarios

Esto permite:
- Recuperar comentarios eliminados por error
- Mantener la integridad referencial (respuestas a comentarios eliminados)
- Auditoría de eliminaciones

## Archivos Relacionados

- **Script SQL simplificado:** `scripts/agregar_columnas_soft_delete.sql`
- **Migración completa:** `supabase/migrations/20250904000000_soft_delete_comentarios.sql`
- **API de eliminación:** `src/app/api/comentarios/delete/route.ts`
- **Hook de comentarios:** `src/components/noticias/hooks/useNoticiaComentarios.ts`

## Soporte

Si encuentras algún problema al ejecutar el script, verifica:

1. Que tienes permisos de administrador en el proyecto de Supabase
2. Que la conexión a la base de datos está activa
3. Que las tablas `comentarios` y `foro_posts` existen

Si el problema persiste, revisa los logs de error en el SQL Editor.
