# Corrección: Avatar y Username en Respuestas a Comentarios

## Problema Identificado

Al responder a un comentario en las noticias, aparece:
- **Username:** "Usuario" (en lugar del nombre real)
- **Avatar:** Genérico o vacío (en lugar del avatar personalizado)
- **Color:** Azul por defecto (en lugar del color del perfil)

## Causa Raíz

La función PostgreSQL `obtener_comentarios_noticia` tiene un **`JOIN`** en lugar de **`LEFT JOIN`** al obtener los datos del autor de las respuestas (línea 76-77 de la migración original).

Esto causa que:
1. Si hay algún problema con la relación entre `comentarios` y `perfiles`, la respuesta se omite completamente
2. El objeto `autor` no se construye correctamente en el JSON
3. El frontend recibe `autor: undefined` y usa los valores por defecto

## Solución

### Paso 1: Ejecutar el Script de Corrección

1. **Abre tu proyecto en Supabase Dashboard**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "New query"

3. **Copia y pega el script**
   - Abre el archivo: `scripts/corregir_obtener_comentarios_noticia.sql`
   - Copia todo el contenido
   - Pégalo en el SQL Editor

4. **Ejecuta el script**
   - Haz clic en el botón "Run" o presiona Ctrl+Enter
   - Deberías ver: "Función obtener_comentarios_noticia actualizada correctamente"

### Paso 2: Verificar la Corrección

1. **Recarga la aplicación**
   - Detén el servidor de desarrollo (Ctrl+C)
   - Inicia nuevamente: `npm run dev`

2. **Prueba responder a un comentario**
   - Ve a cualquier noticia
   - Responde a un comentario existente
   - Verifica que aparezca tu información correcta

3. **Revisa los logs**
   - En la terminal del servidor, busca:
   ```
   [API Comentarios] Respuesta 1: {
     id: '...',
     tiene_autor: true,  ← Debe ser true
     username: 'TuNombre',  ← Tu username real
     avatar_url: 'https://...'  ← Tu avatar real
   }
   ```

## Cambios Técnicos Realizados

### En la función SQL (línea 76):

**Antes:**
```sql
JOIN perfiles p ON c.usuario_id = p.id
```

**Después:**
```sql
LEFT JOIN perfiles p ON c.usuario_id = p.id
```

### Valores por defecto añadidos (líneas 67-73):

```sql
'autor', jsonb_build_object(
    'id', COALESCE(p.id, c.usuario_id),
    'username', COALESCE(p.username, 'Usuario'),
    'avatar_url', COALESCE(p.avatar_url, ''),
    'color', COALESCE(p.color, '#3b82f6'),
    'role', COALESCE(p.role, 'usuario'),
    'is_own', c.usuario_id = v_user_id
)
```

Esto asegura que:
- Siempre se devuelva un objeto `autor` válido
- Si falta algún campo, se use un valor por defecto
- No se omitan respuestas por problemas de JOIN

## Archivos Relacionados

- **Script de corrección:** `scripts/corregir_obtener_comentarios_noticia.sql`
- **Función original:** `supabase/migrations/20250917012000_obtener_comentarios_noticia_final_corregido.sql`
- **API que usa la función:** `src/app/api/comentarios/route.ts`
- **Hook del frontend:** `src/components/noticias/hooks/useNoticiaComentarios.ts`

## Notas Adicionales

Esta corrección también:
- Añade el campo `isEdited` a las respuestas
- Usa `COALESCE` para manejar valores NULL de forma segura
- Mantiene compatibilidad con el código existente

## Error 500 al Cargar Comentarios

Si después de ejecutar el script obtienes un error 500:

**Causa:** La tabla `comentarios` no tiene la columna `editado`, usa `historial_ediciones` en su lugar.

**Solución:** El script ya está corregido para usar `historial_ediciones IS NOT NULL` en lugar de `editado`.

## Solución de Problemas

Si después de ejecutar el script sigues viendo "Usuario":

1. **Verifica que el script se ejecutó sin errores**
   - Revisa el SQL Editor por mensajes de error

2. **Limpia la caché de React Query**
   - Recarga la página con Ctrl+F5
   - O cierra y abre el navegador

3. **Verifica los logs del servidor**
   - Busca `[API Comentarios] Respuesta` en la terminal
   - Confirma que `tiene_autor: true`

4. **Verifica que exista el perfil**
   - En Supabase, ve a Table Editor → perfiles
   - Busca tu usuario por ID
   - Confirma que tenga username, avatar_url y color
