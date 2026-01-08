# 🪣 Crear Buckets en Supabase Storage

## ⚠️ PROBLEMA ACTUAL

El error **"Failed to send a request to the Edge Function"** ocurre porque los buckets de Storage no existen:
- `video-uploads` (privado)
- `videos` (público)

## ✅ SOLUCIÓN: Crear Buckets

### Paso 1: Ir al Dashboard de Supabase

1. Abre: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a: **Storage** (en el menú izquierdo)

### Paso 2: Crear Bucket `video-uploads` (Privado)

1. Click en **"New Bucket"**
2. Nombre: `video-uploads`
3. **Desactiva** "Public bucket" (debe ser privado)
4. Click **"Create bucket"**

**Configuración:**
- Nombre: `video-uploads`
- Privado: ✅ (no marcar "Public bucket")
- Tamaño máximo: 500 MB (por defecto)

### Paso 3: Crear Bucket `videos` (Público)

1. Click en **"New Bucket"**
2. Nombre: `videos`
3. **Activa** "Public bucket" (debe ser público)
4. Click **"Create bucket"**

**Configuración:**
- Nombre: `videos`
- Público: ✅ (marcar "Public bucket")
- Tamaño máximo: 500 MB (por defecto)

---

## 📋 Verificación

Después de crear los buckets, deberías ver:

```
Storage
├── video-uploads (🔒 Privado)
└── videos (🌐 Público)
```

---

## 🧪 Probar el Pipeline

Una vez creados los buckets:

1. Abre la aplicación en http://localhost:3001
2. Crea un hilo en el foro
3. Click en botón "Video" (icono de película)
4. Selecciona un archivo MP4 (< 50MB para pruebas)
5. Observa el progreso:
   - 0% → Creando registro
   - 25% → Subiendo archivo
   - 50% → Procesando
   - 75% → Convirtiendo con FFmpeg
   - 100% → Completado ✅

---

## 🔍 Logs para Debugging

Si hay errores, revisa los logs en Supabase:

1. Ve a: **Functions** → **video-converter**
2. Click en **"Logs"**
3. Busca errores recientes

---

## 📝 Notas Importantes

- Los buckets deben tener exactamente esos nombres
- `video-uploads` DEBE ser privado (solo el usuario que lo subió puede acceder)
- `videos` DEBE ser público (para que se reproduzca en el navegador)
- FFmpeg está instalado en la Edge Function
- La conversión toma ~30 segundos por video

---

## ❌ Si Sigue Fallando

1. Verifica que los buckets existen
2. Verifica que los nombres son exactos (sin espacios)
3. Revisa los logs de la Edge Function
4. Asegúrate de que el archivo MP4 es válido

---

**Una vez creados los buckets, el pipeline funcionará correctamente.**
