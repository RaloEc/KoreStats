# Guía de Despliegue: Pipeline de Video Asíncrono

## ⏱️ Tiempo Estimado: 30 minutos

## 📋 Checklist Previo

- [ ] Acceso a Supabase Dashboard
- [ ] Supabase CLI instalado (`npm install -g supabase`)
- [ ] Git actualizado
- [ ] Proyecto Next.js corriendo localmente

---

## PASO 1: Aplicar Migración SQL (5 minutos)

### Opción A: Usar Supabase CLI (Recomendado)

```bash
# En la raíz del proyecto
supabase db push
```

**Salida esperada:**
```
✓ Migrations applied successfully
  20250109000000_create_videos_table.sql
```

### Opción B: Ejecutar Manualmente

1. Ir a: https://app.supabase.com → Proyecto → SQL Editor
2. Click en "New Query"
3. Copiar contenido de: `supabase/migrations/20250109000000_create_videos_table.sql`
4. Pegar en el editor
5. Click en "Run"

**Verificar:**
```sql
-- En SQL Editor, ejecutar:
SELECT * FROM videos LIMIT 1;
-- Debe retornar: (0 rows)
```

---

## PASO 2: Crear Buckets en Storage (5 minutos)

### Bucket 1: `video-uploads` (Privado)

1. Ir a: https://app.supabase.com → Proyecto → Storage
2. Click en "New Bucket"
3. Configurar:
   - **Name:** `video-uploads`
   - **Privacy:** Private
   - **File size limit:** 500 MB
4. Click en "Create bucket"

### Bucket 2: `videos` (Público)

1. Click en "New Bucket"
2. Configurar:
   - **Name:** `videos`
   - **Privacy:** Public
   - **File size limit:** 500 MB
3. Click en "Create bucket"

**Verificar:**
- Ir a Storage → Deberías ver ambos buckets listados

---

## PASO 3: Configurar RLS en Buckets (5 minutos)

### Para `video-uploads`

1. Ir a: Storage → `video-uploads` → Policies
2. Click en "New Policy"
3. Seleccionar: "For authenticated users"
4. Configurar:
   - **Operation:** SELECT
   - **Condition:** `auth.uid()::text = (storage.foldername(name))[1]`
5. Click en "Review" → "Save policy"

6. Repetir para INSERT y DELETE con las mismas condiciones

### Para `videos`

1. Ir a: Storage → `videos` → Policies
2. Click en "New Policy"
3. Seleccionar: "For public access"
4. Configurar:
   - **Operation:** SELECT
   - **Condition:** (dejar vacío)
5. Click en "Review" → "Save policy"

**Verificar:**
- Ambos buckets deben tener políticas listadas

---

## PASO 4: Desplegar Edge Function (10 minutos)

### Opción A: Usar Supabase CLI (Recomendado)

```bash
# Obtener tu project-ref
supabase projects list

# Desplegar la función
supabase functions deploy video-converter --project-ref=<tu-project-ref>
```

**Salida esperada:**
```
✓ Function deployed successfully
  video-converter
  URL: https://<project-ref>.supabase.co/functions/v1/video-converter
```

### Opción B: Desplegar desde Dashboard

1. Ir a: https://app.supabase.com → Proyecto → Edge Functions
2. Click en "Create a new function"
3. Nombre: `video-converter`
4. Copiar contenido de: `supabase/functions/video-converter/index.ts`
5. Pegar en el editor
6. Click en "Deploy"

**Verificar:**
```bash
# Probar la función
curl -X POST https://<project-ref>.supabase.co/functions/v1/video-converter \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"videoId":"test","originalPath":"test.mp4","userId":"test"}'

# Debe retornar error (esperado, archivo no existe)
```

---

## PASO 5: Habilitar Realtime (3 minutos)

1. Ir a: https://app.supabase.com → Proyecto → Replication
2. Buscar tabla: `videos`
3. Click en el toggle para habilitarla
4. Confirmar

**Verificar:**
- La tabla `videos` debe mostrar estado "Enabled"

---

## PASO 6: Integración en el Editor (2 minutos)

### Buscar el archivo del editor

```bash
# Encontrar dónde está la barra de herramientas
find src -name "*toolbar*" -o -name "*editor*" | grep -i toolbar
```

### Agregar VideoButton

```tsx
// En tu archivo de barra de herramientas (ej: EditorToolbar.tsx)

import { VideoButton } from '@/components/tiptap-editor/video-button'

export function EditorToolbar({ editor }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {/* Botones existentes */}
      
      {/* Agregar VideoButton */}
      <VideoButton editor={editor} />
    </div>
  )
}
```

---

## PASO 7: Prueba Local (5 minutos)

### 1. Iniciar servidor de desarrollo

```bash
npm run dev
```

### 2. Ir a la página del editor

- Navegar a la página donde está el editor Tiptap
- Buscar el botón "Video" en la barra de herramientas

### 3. Probar carga

1. Click en botón "Video"
2. Seleccionar un archivo MP4 pequeño (< 50MB)
3. Observar progreso:
   - "Subiendo video..." (25%)
   - "Procesando video..." (75%)
   - "¡Video cargado exitosamente!" (100%)

### 4. Verificar en BD

```sql
-- En SQL Editor
SELECT id, status, public_url FROM videos ORDER BY created_at DESC LIMIT 1;

-- Debe mostrar:
-- id: <uuid>
-- status: 'completed'
-- public_url: 'https://...'
```

### 5. Verificar en Storage

- Ir a: Storage → `video-uploads` → Debe estar vacío (archivo eliminado)
- Ir a: Storage → `videos` → Debe haber un archivo `.webm`

---

## 🔍 Verificación Completa

### Checklist de Verificación

- [ ] Migración SQL aplicada
- [ ] Tabla `videos` existe
- [ ] Bucket `video-uploads` existe (privado)
- [ ] Bucket `videos` existe (público)
- [ ] RLS configurado en ambos buckets
- [ ] Edge Function `video-converter` desplegada
- [ ] Realtime habilitado en tabla `videos`
- [ ] VideoButton visible en editor
- [ ] Video se carga exitosamente
- [ ] Video aparece en Storage después de conversión
- [ ] BD muestra status `completed`

---

## 📊 Monitoreo

### Ver Logs de Edge Function

```bash
supabase functions logs video-converter --project-ref=<tu-project-ref>
```

### Ver Logs en Dashboard

1. Ir a: Edge Functions → `video-converter`
2. Click en "Logs"
3. Filtrar por fecha/hora

### Logs Esperados

```
[video-converter] Iniciando conversión para videoId: xxx
[video-converter] Descargando video desde: user/video.mp4
[video-converter] Iniciando conversión con FFmpeg...
[video-converter] Conversión completada
[video-converter] Subiendo WebM a: user/video.webm
[video-converter] URL pública: https://...
[video-converter] ✅ Conversión exitosa
```

---

## 🐛 Troubleshooting

### Error: "Function not found"

**Causa:** Edge Function no desplegada

**Solución:**
```bash
supabase functions deploy video-converter --project-ref=<tu-project-ref>
```

### Error: "Permission denied" en Storage

**Causa:** RLS no configurado

**Solución:**
1. Verificar RLS en Storage → Policies
2. Asegurar que existen políticas para INSERT, SELECT, DELETE
3. Recargar página

### Error: "FFmpeg not found"

**Causa:** Dockerfile no se construyó

**Solución:**
```bash
# Redeploy sin verificación JWT
supabase functions deploy video-converter --project-ref=<tu-project-ref> --no-verify-jwt
```

### Video no aparece después de completarse

**Causa:** Realtime no habilitado

**Solución:**
1. Ir a: Replication → Tables
2. Habilitar `videos`
3. Recargar página en navegador

### Conversión tarda mucho

**Causa:** Archivo muy grande

**Solución:**
- Esperar (puede tardar 5-10 minutos)
- Usar videos más pequeños para pruebas
- Limitar tamaño máximo a 500MB

---

## 📝 Comandos Útiles

```bash
# Ver estado de funciones
supabase functions list --project-ref=<tu-project-ref>

# Ver logs en tiempo real
supabase functions logs video-converter --project-ref=<tu-project-ref> --tail

# Redeploy
supabase functions deploy video-converter --project-ref=<tu-project-ref> --force

# Eliminar función
supabase functions delete video-converter --project-ref=<tu-project-ref>
```

---

## ✅ Completado

Una vez que hayas completado todos los pasos:

1. ✅ El pipeline está completamente funcional
2. ✅ Los usuarios pueden subir videos
3. ✅ Los videos se convierten automáticamente
4. ✅ Los videos se reproducen en el editor
5. ✅ Las actualizaciones son en tiempo real

## 📚 Documentación Adicional

- Ver: `VIDEO_PIPELINE_README.md` para más detalles
- Ver: `supabase/functions/video-converter/index.ts` para lógica de conversión
- Ver: `src/hooks/useVideoUploader.ts` para lógica de carga
- Ver: `src/components/video/VideoPlayer.tsx` para componente de reproducción

---

## 🆘 Soporte

Si encuentras problemas:

1. Revisar logs en Supabase Dashboard
2. Verificar que todos los pasos fueron completados
3. Revisar la sección de Troubleshooting arriba
4. Consultar documentación oficial de Supabase
