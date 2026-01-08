# 🧪 Prueba del Pipeline de Video - Arquitectura Desacoplada

## ✅ Estado Actual

| Componente | Estado |
|---|---|
| Hook `useVideoUploader` | ✅ Desacoplado |
| Trigger de BD | ✅ Creado |
| Edge Function v3 | ✅ Activa |
| Buckets Storage | ✅ Creados |
| Realtime | ✅ Configurado |

---

## 🚀 Instrucciones de Prueba

### Paso 1: Asegurar que el Dev Server está corriendo

```cmd
npm run dev
```

Debería estar en: http://localhost:3001

### Paso 2: Crear un Hilo en el Foro

1. Abre http://localhost:3001
2. Ve a la sección **Foro**
3. Click en **"Crear Hilo"** (botón flotante)
4. Completa el formulario:
   - **Título:** "Prueba de Video"
   - **Contenido:** Escribe algo en el editor

### Paso 3: Subir un Video

1. En el editor Tiptap, busca el botón **"Video"** (icono de película 🎬)
2. Click en el botón
3. Selecciona un archivo MP4:
   - **Tamaño recomendado:** 5-20 MB (para pruebas rápidas)
   - **Formato:** MP4, WebM, AVI, MOV
4. Click en **"Subir"**

### Paso 4: Observar el Progreso

**En la consola del navegador (F12 → Console):**

```
[useVideoUploader] Iniciando carga de video: <videoId>
[useVideoUploader] Creando registro en BD...
[useVideoUploader] Subiendo archivo a Storage: <path>
[useVideoUploader] Actualizando estado a processing (dispara trigger)...
[useVideoUploader] ✅ Video registrado. Esperando conversión vía Realtime...
```

**En el componente VideoPlayer:**
- Estado inicial: "Procesando..." 🔄
- Después de ~30-60 segundos: "Completado" ✅
- Se muestra el video convertido a WebM

---

## 📊 Flujo Esperado

### Fase 1: Upload (0-10 segundos)
```
Progreso: 0% → 25% → 50%
Estado: uploading → processing
```

### Fase 2: Conversión en Segundo Plano (10-60 segundos)
```
Trigger dispara Edge Function
Edge Function: Descarga → Convierte → Sube
BD: status = 'processing'
```

### Fase 3: Completado (60+ segundos)
```
BD: status = 'completed'
Realtime: Notifica al cliente
VideoPlayer: Muestra video convertido
```

---

## 🔍 Debugging

### Ver Logs de la Consola del Navegador

**Abre DevTools (F12) → Console**

**Logs esperados:**
```
[useVideoUploader] Iniciando carga de video: abc123
[useVideoUploader] Creando registro en BD...
[useVideoUploader] Subiendo archivo a Storage: user123/abc123.mp4
[useVideoUploader] Actualizando estado a processing (dispara trigger)...
[useVideoUploader] ✅ Video registrado. Esperando conversión vía Realtime...
[VideoPlayer] Escuchando cambios en video: abc123
[VideoPlayer] Video actualizado: status = completed
```

### Ver Logs de la Edge Function

1. Ve a: https://app.supabase.com → Proyecto → Functions → video-converter
2. Click en **"Logs"**
3. Busca logs recientes (últimos 5 minutos)

**Logs esperados:**
```
[video-converter] Solicitud recibida
[video-converter] Iniciando conversión para videoId: abc123
[video-converter] Descargando video desde: user123/abc123.mp4
[video-converter] Video descargado exitosamente
[video-converter] Iniciando conversión con FFmpeg...
[video-converter] Conversión completada
[video-converter] Tamaño del archivo WebM: 5242880 bytes
[video-converter] Subiendo WebM a: user123/abc123.webm
[video-converter] WebM subido exitosamente
[video-converter] ✅ Conversión exitosa para videoId: abc123
```

### Ver Estado en la Base de Datos

1. Ve a: https://app.supabase.com → Proyecto → SQL Editor
2. Ejecuta:
```sql
SELECT id, user_id, status, public_url, error_message, created_at 
FROM videos 
ORDER BY created_at DESC 
LIMIT 5;
```

**Estados esperados:**
- `uploading` → `processing` → `completed`

---

## ⚠️ Posibles Errores y Soluciones

### Error: "Bucket not found"
**Causa:** Los buckets no existen o tienen nombre incorrecto
**Solución:** Verifica que existan:
- `video-uploads` (privado)
- `videos` (público)

### Error: "Permission denied"
**Causa:** RLS no configurado correctamente
**Solución:** Configura RLS en los buckets (ver CHECKLIST_VIDEO_PIPELINE.md)

### Error: "FFmpeg not found"
**Causa:** Edge Function no tiene FFmpeg instalado
**Solución:** Redeploy la Edge Function (ya está en v3)

### Error: "Timeout"
**Causa:** Video muy grande o conexión lenta
**Solución:** Usa un video más pequeño (<10 MB)

### Error: "CORS error"
**Causa:** Headers CORS incorrectos
**Solución:** Ya está corregido en Edge Function v3

---

## ✅ Checklist de Verificación

- [ ] Dev server corriendo en http://localhost:3001
- [ ] Buckets `video-uploads` y `videos` existen
- [ ] RLS configurado en buckets (si es necesario)
- [ ] Edge Function `video-converter` v3 activa
- [ ] Trigger de BD creado
- [ ] Hook `useVideoUploader` desacoplado
- [ ] VideoPlayer escucha Realtime
- [ ] Archivo MP4 válido (<20 MB)
- [ ] Consola del navegador sin errores
- [ ] Logs de Edge Function sin errores

---

## 📈 Métricas Esperadas

| Métrica | Valor |
|---|---|
| Tiempo de upload | 5-10 segundos |
| Tiempo de conversión | 30-60 segundos |
| Tamaño original | 10-50 MB |
| Tamaño convertido (WebM) | 2-5 MB |
| Resolución final | 720p |
| Codec | VP9 |

---

## 🎯 Resultado Esperado

Después de seguir estos pasos:

1. ✅ El video se sube correctamente
2. ✅ El cliente recibe confirmación inmediatamente
3. ✅ El trigger dispara la Edge Function
4. ✅ La conversión ocurre en segundo plano
5. ✅ El VideoPlayer muestra el video convertido
6. ✅ No hay errores en la consola

---

## 🆘 Si Algo Falla

1. **Revisa los logs:**
   - Consola del navegador (F12)
   - Logs de Edge Function en Supabase
   - Logs de BD en Supabase

2. **Verifica la configuración:**
   - Buckets existen y tienen nombres correctos
   - RLS configurado
   - Edge Function activa

3. **Prueba con un video más pequeño:**
   - Usa un MP4 de 5 MB máximo
   - Asegúrate de que sea válido

4. **Reinicia el dev server:**
   ```cmd
   npm run dev
   ```

---

**¡Listo para probar el pipeline desacoplado!**
