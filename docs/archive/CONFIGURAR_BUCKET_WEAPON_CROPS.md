# Configuración del Bucket `weapon-analysis-crops`

## Estado: ✅ COMPLETADO

El bucket `weapon-analysis-crops` ha sido creado y configurado correctamente en Supabase.

## Especificaciones del Bucket

| Propiedad | Valor |
|-----------|-------|
| **ID** | `weapon-analysis-crops` |
| **Nombre** | `weapon-analysis-crops` |
| **Público** | ✅ Sí |
| **Tamaño máximo por archivo** | 5 MB (5,242,880 bytes) |
| **Tipos MIME permitidos** | `image/png`, `image/jpeg`, `image/jpg`, `image/webp` |

## Estructura de Archivos

Los recortes se guardan con la siguiente estructura:

```
weapon-analysis-crops/
├── {userId}/
│   ├── statsPanel-{timestamp}.png
│   ├── statsPanel-{timestamp}.png
│   ├── arma-{timestamp}.png
│   └── arma-{timestamp}.png
```

**Ejemplo:**
```
weapon-analysis-crops/
├── 550e8400-e29b-41d4-a716-446655440000/
│   ├── statsPanel-1730900000000.png
│   ├── arma-1730900000000.png
│   └── ...
```

## Tabla de Auditoría

Se creó la tabla `weapon_analysis_crops_log` para registrar todos los recortes:

```sql
CREATE TABLE weapon_analysis_crops_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_type text NOT NULL CHECK (crop_type IN ('statsPanel', 'arma')),
  file_path text NOT NULL,
  file_size integer,
  created_at timestamp with time zone DEFAULT now()
);
```

### Campos

- **id**: Identificador único del registro
- **user_id**: ID del usuario que subió el recorte
- **crop_type**: Tipo de recorte (`statsPanel` o `arma`)
- **file_path**: Ruta del archivo en Storage
- **file_size**: Tamaño del archivo en bytes
- **created_at**: Fecha de creación

## Políticas RLS

### Tabla `weapon_analysis_crops_log`

1. **Ver propios registros**: Los usuarios pueden ver solo sus propios registros
   ```sql
   SELECT * FROM weapon_analysis_crops_log WHERE user_id = auth.uid()
   ```

2. **Service Role puede insertar**: La Edge Function (con service role) puede insertar registros
   ```sql
   INSERT INTO weapon_analysis_crops_log (...) -- Solo service role
   ```

### Bucket `weapon-analysis-crops`

El bucket es **público**, lo que significa:
- ✅ Cualquiera puede **leer** los archivos (sin autenticación)
- ✅ Usuarios autenticados pueden **subir** archivos
- ✅ Solo el propietario o service role puede **eliminar** archivos

## Flujo de Uso

### 1. Edge Function Sube Recorte

```typescript
const { data, error } = await supabase.storage
  .from('weapon-analysis-crops')
  .upload(`${userId}/statsPanel-${timestamp}.png`, croppedBuffer, {
    contentType: 'image/png',
    upsert: false,
  });
```

### 2. Trigger Registra Automáticamente

El trigger `weapon_crop_upload_trigger` se ejecuta automáticamente:
- Detecta si el archivo está en `weapon-analysis-crops`
- Extrae el tipo de recorte del nombre del archivo
- Inserta un registro en `weapon_analysis_crops_log`

### 3. Obtener URL Pública

```typescript
const { data: publicUrlData } = supabase.storage
  .from('weapon-analysis-crops')
  .getPublicUrl(`${userId}/statsPanel-${timestamp}.png`);

const publicUrl = publicUrlData?.publicUrl;
// Ejemplo: https://your-project.supabase.co/storage/v1/object/public/weapon-analysis-crops/...
```

## Consultas Útiles

### Ver todos los recortes de un usuario

```sql
SELECT crop_type, file_path, file_size, created_at
FROM weapon_analysis_crops_log
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC;
```

### Ver estadísticas de recortes

```sql
SELECT 
  crop_type,
  COUNT(*) as total,
  SUM(file_size) as tamaño_total_bytes,
  AVG(file_size) as tamaño_promedio_bytes
FROM weapon_analysis_crops_log
GROUP BY crop_type;
```

### Ver recortes recientes (últimas 24 horas)

```sql
SELECT user_id, crop_type, file_path, created_at
FROM weapon_analysis_crops_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Limpieza de Archivos Antiguos

Para eliminar archivos más antiguos de 30 días:

```sql
-- Obtener rutas de archivos antiguos
SELECT file_path
FROM weapon_analysis_crops_log
WHERE created_at < NOW() - INTERVAL '30 days';

-- Eliminar registros (los archivos se pueden eliminar manualmente desde Storage)
DELETE FROM weapon_analysis_crops_log
WHERE created_at < NOW() - INTERVAL '30 days';
```

## Troubleshooting

### Error: "Bucket not found"

**Solución**: Verificar que el bucket se creó correctamente:
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'weapon-analysis-crops';
```

### Error: "Permission denied"

**Solución**: Verificar que la Edge Function usa `service_role_key` (no `anon_key`)

### Archivos no se registran en la tabla

**Solución**: Verificar que el trigger está activo:
```sql
SELECT * FROM information_schema.triggers WHERE trigger_name = 'weapon_crop_upload_trigger';
```

## Próximos Pasos

1. ✅ Bucket creado
2. ✅ Tabla de auditoría creada
3. ✅ Trigger configurado
4. ⏳ Desplegar Edge Function actualizada
5. ⏳ Probar con imágenes reales

## Referencias

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
