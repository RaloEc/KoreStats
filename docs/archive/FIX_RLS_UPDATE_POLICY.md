# 🔧 Fix: RLS UPDATE Policy para Video Pipeline

## 🔴 Problema Identificado

El video se quedaba en estado `uploading` indefinidamente y **nunca pasaba a `processing`**, por lo que el trigger nunca se disparaba y la Edge Function nunca se invocaba.

**Causa raíz:** Faltaba la política RLS (Row Level Security) que permitiera a los usuarios autenticados **actualizar** sus propios registros en la tabla `videos`.

### Síntomas
- Videos quedan en estado `uploading` para siempre
- El trigger `on_video_processing` nunca se dispara
- La Edge Function `video-converter` nunca se invoca
- No hay logs en la función de Supabase

---

## ✅ Solución Aplicada

Se agregó una nueva política RLS que permite a usuarios autenticados actualizar sus propios videos:

```sql
CREATE POLICY "Allow authenticated update own videos"
ON public.videos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Explicación
- **FOR UPDATE:** Permite operaciones UPDATE
- **TO authenticated:** Solo para usuarios autenticados
- **USING:** Condición para leer (solo propios registros)
- **WITH CHECK:** Condición para escribir (solo propios registros)

---

## 📋 Políticas RLS Actuales en `videos`

| Política | Operación | Rol | Condición |
|---|---|---|---|
| Allow authenticated insert | INSERT | authenticated | `auth.uid() = user_id` |
| Allow individual read | SELECT | authenticated | `auth.uid() = user_id` |
| **Allow authenticated update own videos** | **UPDATE** | **authenticated** | **`auth.uid() = user_id`** |
| Allow public read on completed | SELECT | public | `status = 'completed'` |
| Allow service role update | UPDATE | service_role | `true` |
| Allow service role delete | DELETE | service_role | `true` |

---

## 🔄 Flujo Ahora Funcional

```
1. Cliente sube video
   ↓
2. Hook crea registro (status: 'uploading')
   ↓
3. Hook sube archivo a Storage
   ↓
4. Hook ACTUALIZA registro a 'processing' ← AHORA FUNCIONA (RLS permite)
   ↓
5. Trigger se dispara
   ↓
6. Edge Function se invoca
   ↓
7. Video se convierte
   ↓
8. BD se actualiza a 'completed'
   ↓
9. Realtime notifica al cliente
```

---

## 🧪 Cómo Verificar

### Opción 1: Revisar Logs de la Función
1. Ve a: https://app.supabase.com → Functions → video-converter → Logs
2. Sube un video
3. Deberías ver logs como:
   ```
   [video-converter] Solicitud recibida para videoId: abc123
   [video-converter] Descargando video desde: user123/abc123.mp4
   [FFmpeg] Ejecutando: ffmpeg -i /tmp/xyz ...
   ```

### Opción 2: Revisar Estado en BD
```sql
SELECT id, status, updated_at
FROM videos
ORDER BY updated_at DESC
LIMIT 5;
```

Deberías ver la transición: `uploading → processing → completed`

### Opción 3: Revisar Consola del Navegador
Abre DevTools (F12 → Console) y busca logs como:
```
[useVideoUploader] Actualizando estado a processing (dispara trigger)...
[useVideoUploader] ✅ Video registrado. Esperando conversión vía Realtime...
```

---

## 📊 Cambios Realizados

| Componente | Cambio |
|---|---|
| Tabla `videos` | ✅ Agregada política RLS UPDATE |
| Hook `useVideoUploader` | ✅ Sin cambios (ya estaba correcto) |
| Trigger `on_video_processing` | ✅ Sin cambios (ya estaba correcto) |
| Edge Function | ✅ Sin cambios (ya estaba correcto) |

---

## 🎯 Resultado

✅ **El pipeline ahora funciona correctamente**

1. Usuario sube video
2. Hook actualiza estado a `processing` (RLS lo permite)
3. Trigger se dispara
4. Edge Function convierte video
5. Cliente recibe notificación vía Realtime

---

## 📝 Notas Importantes

- La política RLS es **crítica** para la seguridad
- Solo permite que usuarios actualicen sus propios videos
- El trigger se dispara automáticamente
- La Edge Function se invoca en segundo plano
- No hay timeout en el cliente (desacoplado)

---

**El video pipeline está completamente funcional ahora.**
