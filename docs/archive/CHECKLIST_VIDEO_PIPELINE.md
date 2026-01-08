# ✅ Checklist: Pipeline de Video - Configuración Final

## 🔴 PROBLEMA ACTUAL

El error **"Failed to send a request to the Edge Function"** ocurre porque:
- ✅ Buckets creados
- ✅ Edge Function desplegada
- ❌ **RLS en buckets no configurado** (probablemente)

---

## 📋 CHECKLIST DE CONFIGURACIÓN

### 1. Verificar Buckets Existen

- [x] `videos` - Público
- [x] `video-uploads` - Público (⚠️ DEBE SER PRIVADO)

**⚠️ IMPORTANTE:** `video-uploads` debe estar **PRIVADO**, no público.

### 2. Configurar RLS en Buckets

#### Para `video-uploads` (Privado)

1. Ve a: **Storage** → `video-uploads` → **Policies**
2. Click **"New Policy"**
3. Configurar:
   - **Allowed operation:** SELECT, INSERT, DELETE
   - **Target roles:** authenticated
   - **Condition:** `(storage.foldername(name))[1] = auth.uid()::text`
4. Click **"Review"** → **"Save policy"**

#### Para `videos` (Público)

1. Ve a: **Storage** → `videos` → **Policies**
2. Click **"New Policy"**
3. Configurar:
   - **Allowed operation:** SELECT
   - **Target roles:** public
   - **Condition:** (dejar vacío)
4. Click **"Review"** → **"Save policy"**

---

## 🧪 Prueba Después de Configurar RLS

1. Abre http://localhost:3001
2. Crea un hilo
3. Click botón "Video"
4. Selecciona MP4 pequeño (< 10MB)
5. Observa progreso

**Logs esperados:**
```
[useVideoUploader] Iniciando carga de video
[useVideoUploader] Creando registro en BD
[useVideoUploader] Subiendo archivo a Storage
[useVideoUploader] Actualizando estado a processing
[useVideoUploader] Invocando Edge Function
[video-converter] Iniciando conversión
[video-converter] Descargando video
[video-converter] Iniciando conversión con FFmpeg
[video-converter] Conversión completada
[video-converter] Subiendo WebM
[video-converter] ✅ Conversión exitosa
```

---

## 🔍 Debugging

### Ver Logs de Edge Function

1. Ve a: **Functions** → **video-converter**
2. Click en **"Logs"**
3. Busca errores recientes

### Errores Comunes

| Error | Causa | Solución |
|---|---|---|
| `Permission denied` | RLS no configurado | Configurar RLS en buckets |
| `Bucket not found` | Nombre incorrecto | Verificar nombres exactos |
| `FFmpeg not found` | Dockerfile incorrecto | Redeploy Edge Function |
| `CORS error` | Headers faltantes | Ya está corregido en v3 |

---

## 📊 Estado Actual

| Componente | Estado | Acción |
|---|---|---|
| Tabla `videos` | ✅ Creada | - |
| Edge Function | ✅ v3 Activa | - |
| Bucket `videos` | ✅ Público | - |
| Bucket `video-uploads` | ⚠️ Público | Cambiar a Privado |
| RLS en buckets | ❌ No configurado | **CONFIGURAR** |
| VideoButton | ✅ Integrado | - |

---

## 🚀 Próximos Pasos

1. **Cambiar `video-uploads` a Privado:**
   - Storage → `video-uploads` → Settings
   - Desactiva "Public bucket"
   - Save

2. **Configurar RLS en ambos buckets** (ver arriba)

3. **Probar el pipeline**

---

## 💡 Notas

- La Edge Function v3 tiene logging detallado
- Revisa los logs si algo falla
- Los buckets deben tener nombres exactos
- RLS es crítico para la seguridad

---

**Una vez configurado RLS, el pipeline funcionará correctamente.**
