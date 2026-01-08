# ✅ Corrección Aplicada: Contador de Comentarios en Noticias

## 🔍 Problema Identificado

Tenías razón. El contador de comentarios en las tarjetas de noticias (página principal `/` y página `/noticias`) **estaba incluyendo comentarios eliminados** (soft-deleted).

## 🐛 Causa del Problema

Encontré **4 funciones SQL** que tenían errores en el filtrado:

1. ✅ `contar_comentarios_por_noticia(uuid[])` - Usaba campo incorrecto `eliminado` 
2. ✅ `contar_comentarios_por_noticia(text[])` - Usaba campo incorrecto `deleted_at`
3. ✅ `contar_comentarios_por_noticia_uuid(uuid[])` - No filtraba eliminados
4. ✅ `obtener_contador_comentarios_uuid(uuid)` - No filtraba eliminados

**Campo correcto:** `deleted` (booleano) según la migración `20250904000000_soft_delete_comentarios.sql`

## ✨ Solución Implementada

He creado una migración SQL que corrige las 4 funciones para:
- Filtrar comentarios donde `deleted IS NULL OR deleted = false`
- Hacer JOIN correcto con la tabla `comentarios` para acceder al campo `deleted`
- Mantener el mismo rendimiento y estructura

## 📁 Archivos Creados

1. **`supabase/migrations/20251012000000_fix_contar_comentarios_noticias_deleted.sql`**
   - Migración SQL con las correcciones

2. **`ejecutar_fix_contador_comentarios_noticias_simple.bat`**
   - Script para aplicar la migración fácilmente

3. **`docs/FIX_CONTADOR_COMENTARIOS_NOTICIAS.md`**
   - Documentación completa con ejemplos antes/después

## 🚀 Cómo Aplicar la Corrección

### Opción Recomendada:

```cmd
ejecutar_fix_contador_comentarios_noticias_simple.bat
```

### O manualmente:

```cmd
supabase db push
```

## ✅ Resultado Esperado

Después de aplicar la corrección:

- ✅ Los contadores en `/` no incluirán comentarios eliminados
- ✅ Los contadores en `/noticias` no incluirán comentarios eliminados
- ✅ Al eliminar un comentario, el contador disminuirá automáticamente
- ✅ Sin cambios necesarios en el código frontend
- ✅ Sin impacto en el rendimiento

## 📊 Prueba

1. Ve a una noticia con comentarios
2. Anota el contador actual
3. Elimina un comentario (soft-delete)
4. Recarga la página
5. El contador debe haber disminuido en 1

---

**Nota:** Esta corrección es similar a la que se hizo para el foro en `20251009000000_fix_comentarios_count_deleted.sql`
