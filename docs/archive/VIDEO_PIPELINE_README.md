# Pipeline de Video Asíncrono con Supabase y Next.js

## 📋 Descripción General

Este pipeline implementa un sistema completo de carga y procesamiento de videos asíncrono. Los usuarios pueden subir videos que se convierten automáticamente a WebM (VP9) en segundo plano usando FFmpeg en una Supabase Edge Function, con actualizaciones en tiempo real mediante Supabase Realtime.

### Flujo Completo

```
Usuario sube video
    ↓
VideoUploader crea registro en BD (status: 'uploading')
    ↓
Archivo se sube a bucket 'video-uploads' (privado)
    ↓
Estado cambia a 'processing'
    ↓
Edge Function 'video-converter' se invoca
    ↓
FFmpeg convierte a WebM (VP9) en segundo plano
    ↓
Archivo convertido se sube a bucket 'videos' (público)
    ↓
BD se actualiza (status: 'completed', public_url: URL)
    ↓
VideoPlayer recibe notificación por Realtime
    ↓
Video se renderiza en el editor
```

## 🗂️ Estructura de Archivos

### Backend (Supabase)

```
supabase/
├── migrations/
│   └── 20250109000000_create_videos_table.sql    # Tabla de seguimiento
└── functions/
    └── video-converter/
        ├── Dockerfile                             # Imagen con FFmpeg
        └── index.ts                               # Lógica de conversión
```

### Frontend (Next.js)

```
src/
├── hooks/
│   └── useVideoUploader.ts                        # Hook de carga
├── components/
│   ├── video/
│   │   ├── VideoPlayer.tsx                        # Reproductor con Realtime
│   │   ├── VideoUploader.tsx                      # UI de carga
│   │   └── VideoUploader.tsx                      # Componente principal
│   └── tiptap-editor/
│       ├── extensions/
│       │   ├── video.ts                           # Extensión Tiptap
│       │   └── video-component.tsx                # Componente del nodo
│       └── video-button.tsx                       # Botón en barra
└── lib/
    └── supabase/
        └── client.ts                              # Cliente Supabase
```

## 🚀 Instalación y Configuración

### 1. Aplicar Migración SQL

```bash
# Opción A: Usar Supabase CLI
supabase db push

# Opción B: Ejecutar manualmente en Supabase Dashboard
# Copiar contenido de: supabase/migrations/20250109000000_create_videos_table.sql
# Ir a: SQL Editor → New Query → Pegar y ejecutar
```

### 2. Crear Buckets en Supabase Storage

**Bucket 1: `video-uploads` (Privado)**
- Ir a: Storage → New bucket
- Nombre: `video-uploads`
- Privado: ✅ Sí
- Tamaño máximo: 500 MB
- Tipos MIME: `video/*`

**Bucket 2: `videos` (Público)**
- Ir a: Storage → New bucket
- Nombre: `videos`
- Privado: ❌ No
- Tamaño máximo: 500 MB
- Tipos MIME: `video/webm`

### 3. Configurar RLS en Buckets

**Para `video-uploads`:**

```sql
-- Usuarios pueden subir sus propios videos
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Usuarios pueden leer sus propios videos
CREATE POLICY "Allow authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role puede eliminar
CREATE POLICY "Allow service role delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'video-uploads');
```

**Para `videos`:**

```sql
-- Todos pueden leer
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- Service role puede subir
CREATE POLICY "Allow service role upload"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'videos');
```

### 4. Desplegar Edge Function

```bash
# Opción A: Usar Supabase CLI
supabase functions deploy video-converter --project-ref=<tu-project-ref>

# Opción B: Desplegar desde Supabase Dashboard
# Ir a: Edge Functions → Create function → video-converter
# Copiar contenido de: supabase/functions/video-converter/index.ts
```

### 5. Habilitar Realtime en Tabla

En Supabase Dashboard:
- Ir a: Replication → Tables
- Buscar tabla `videos`
- Habilitar Realtime: ✅

## 🔧 Uso en el Editor Tiptap

### Integración en la Barra de Herramientas

```tsx
import { VideoButton } from '@/components/tiptap-editor/video-button'

export function EditorToolbar({ editor }) {
  return (
    <div className="flex gap-2">
      {/* Otros botones... */}
      <VideoButton editor={editor} />
    </div>
  )
}
```

### Inserción Manual de Videos

```tsx
import { useEditor } from '@tiptap/react'

const editor = useEditor({ /* config */ })

// Insertar video
editor.commands.insertVideo('video-id-aqui')
```

## 📊 Tabla `videos`

```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'uploading',  -- uploading, processing, completed, failed
  original_path TEXT,               -- Ruta en video-uploads
  public_url TEXT,                  -- URL final en videos
  error_message TEXT,               -- Mensaje de error si falla
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Estados del Video

- **uploading**: Archivo se está subiendo a Storage
- **processing**: Edge Function está convirtiendo el video
- **completed**: Video listo, URL disponible
- **failed**: Error durante la conversión

## 🎬 Componentes

### VideoUploader

Componente de UI para subir videos con drag & drop.

```tsx
<VideoUploader
  userId={user.id}
  onVideoUploaded={(videoId) => console.log('Video:', videoId)}
  onError={(error) => console.error(error)}
/>
```

**Props:**
- `userId: string` - ID del usuario autenticado
- `onVideoUploaded: (videoId: string) => void` - Callback cuando se completa
- `onError?: (error: string) => void` - Callback de errores

### VideoPlayer

Componente que reproduce videos con Realtime.

```tsx
<VideoPlayer videoId="video-id-aqui" />
```

**Props:**
- `videoId: string` - ID del video a reproducir
- `className?: string` - Clases CSS adicionales

**Características:**
- Muestra spinner mientras se procesa
- Actualiza automáticamente cuando está listo (Realtime)
- Maneja errores
- Reproductor nativo HTML5

### VideoButton

Botón para la barra de herramientas del editor.

```tsx
<VideoButton editor={editor} />
```

## 🪝 Hook useVideoUploader

```tsx
const { uploadVideo, uploadProgress, resetProgress } = useVideoUploader()

// Subir video
try {
  const videoId = await uploadVideo(file, userId)
  console.log('Video cargado:', videoId)
} catch (error) {
  console.error('Error:', error)
}

// Estados
console.log(uploadProgress.status)    // 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'
console.log(uploadProgress.progress)  // 0-100
console.log(uploadProgress.error)     // Mensaje de error
```

## 🔐 Seguridad

### RLS (Row Level Security)

- ✅ Usuarios solo ven sus propios videos (excepto completados)
- ✅ Todos pueden ver videos completados
- ✅ Solo service role puede actualizar estado

### Storage

- ✅ Bucket `video-uploads` es privado
- ✅ Bucket `videos` es público (solo para archivos finales)
- ✅ Límite de 500MB por archivo
- ✅ Solo tipos MIME de video

## 📈 Optimizaciones

### Conversión FFmpeg

```bash
ffmpeg -i input \
  -c:v libvpx-vp9 \    # Codec VP9
  -b:v 1M \             # Bitrate 1Mbps
  -an \                 # Sin audio
  -vf "scale=720:-1" \  # 720p de ancho
  -f webm output.webm
```

**Resultados:**
- Reducción de tamaño: ~80-90% vs MP4
- Compatibilidad: Navegadores modernos
- Calidad: 720p, 1Mbps

### Realtime

- Suscripción automática a cambios
- Actualización instantánea en UI
- Cleanup automático de canales

## 🐛 Troubleshooting

### Error: "FFmpeg not found"

**Causa:** Dockerfile no se construyó correctamente

**Solución:**
```bash
# Reconstruir imagen
supabase functions deploy video-converter --project-ref=<ref> --no-verify-jwt
```

### Error: "Permission denied" en Storage

**Causa:** RLS no configurado correctamente

**Solución:**
1. Verificar RLS en Supabase Dashboard
2. Asegurar que `user_id` coincide con `auth.uid()`
3. Verificar permisos de bucket

### Video no aparece después de completarse

**Causa:** Realtime no habilitado en tabla

**Solución:**
1. Ir a: Replication → Tables
2. Habilitar `videos`
3. Recargar página

### Conversión tarda mucho

**Causa:** Archivo muy grande o servidor sobrecargado

**Solución:**
1. Limitar tamaño a 500MB
2. Usar videos de menor resolución
3. Esperar a que se complete (puede tardar 5-10 minutos)

## 📝 Logs

### Edge Function

```
[video-converter] Iniciando conversión para videoId: xxx
[video-converter] Descargando video desde: user/video.mp4
[video-converter] Iniciando conversión con FFmpeg...
[video-converter] Conversión completada
[video-converter] Subiendo WebM a: user/video.webm
[video-converter] URL pública: https://...
[video-converter] ✅ Conversión exitosa
```

### Hook

```
[useVideoUploader] Iniciando carga de video: xxx
[useVideoUploader] Creando registro en BD...
[useVideoUploader] Subiendo archivo a Storage...
[useVideoUploader] Actualizando estado a processing...
[useVideoUploader] Invocando Edge Function...
[useVideoUploader] ✅ Video procesado exitosamente
```

### Componente

```
[VideoPlayer] Obteniendo estado inicial para: xxx
[VideoPlayer] Estado inicial: processing
[VideoPlayer] Suscribiendo a cambios de: xxx
[VideoPlayer] Actualización recibida: completed
```

## 🎯 Próximos Pasos

1. ✅ Aplicar migración SQL
2. ✅ Crear buckets en Storage
3. ✅ Configurar RLS
4. ✅ Desplegar Edge Function
5. ✅ Habilitar Realtime
6. ✅ Integrar VideoButton en editor
7. ✅ Probar carga de video
8. ✅ Verificar conversión
9. ✅ Confirmar reproducción

## 📚 Referencias

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Tiptap Extensions](https://tiptap.dev/guide/custom-extensions)
- [VP9 Codec](https://en.wikipedia.org/wiki/VP9)
