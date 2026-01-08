# Resumen Técnico: Pipeline de Video Asíncrono

## 🎯 Objetivo

Implementar un sistema completo de carga y procesamiento de videos asíncrono que:
- Permite a usuarios subir videos
- Convierte automáticamente a WebM (VP9) en segundo plano
- Actualiza la UI en tiempo real mediante Supabase Realtime
- Se integra seamlessly en el editor Tiptap

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  VideoUploader (UI)                                         │
│    ↓                                                        │
│  useVideoUploader (Hook)                                    │
│    ├─ Crea registro en BD (status: uploading)              │
│    ├─ Sube archivo a video-uploads (Storage)              │
│    ├─ Actualiza estado a processing                        │
│    └─ Invoca Edge Function                                │
│                                                             │
│  VideoPlayer (Componente)                                  │
│    ├─ Obtiene estado inicial                              │
│    ├─ Se suscribe a Realtime                              │
│    └─ Renderiza video cuando está listo                   │
│                                                             │
│  VideoButton (Tiptap)                                      │
│    └─ Inserta nodo de video en editor                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (Supabase)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tabla: videos                                             │
│    ├─ id (UUID)                                           │
│    ├─ user_id (FK)                                        │
│    ├─ status (uploading|processing|completed|failed)      │
│    ├─ original_path (ruta en video-uploads)              │
│    ├─ public_url (URL final en videos)                   │
│    └─ error_message (si falla)                           │
│                                                             │
│  Storage: video-uploads (Privado)                          │
│    └─ Almacena archivos originales temporalmente          │
│                                                             │
│  Storage: videos (Público)                                 │
│    └─ Almacena archivos WebM finales                      │
│                                                             │
│  Edge Function: video-converter                            │
│    ├─ Descarga archivo de video-uploads                   │
│    ├─ Ejecuta FFmpeg (conversión a WebM VP9)             │
│    ├─ Sube resultado a videos                             │
│    ├─ Actualiza BD con URL pública                        │
│    └─ Elimina archivo original                            │
│                                                             │
│  Realtime: Notificaciones en tiempo real                   │
│    └─ Notifica cambios en tabla videos                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Flujo de Datos

### 1. Carga Inicial

```
Usuario selecciona archivo
    ↓
VideoUploader valida (tipo, tamaño)
    ↓
useVideoUploader.uploadVideo()
    ├─ Genera videoId (UUID)
    ├─ Crea registro: INSERT videos (status: 'uploading')
    ├─ Sube archivo: Storage.upload(video-uploads)
    ├─ Actualiza: UPDATE videos (status: 'processing')
    └─ Invoca: functions.invoke('video-converter')
    ↓
Retorna videoId al componente
```

### 2. Procesamiento en Background

```
Edge Function recibe { videoId, originalPath, userId }
    ↓
Descarga archivo: Storage.download(video-uploads)
    ↓
Ejecuta FFmpeg:
    ffmpeg -i input -c:v libvpx-vp9 -b:v 1M -an -vf "scale=720:-1" output.webm
    ↓
Sube resultado: Storage.upload(videos)
    ↓
Obtiene URL pública: Storage.getPublicUrl()
    ↓
Actualiza BD: UPDATE videos (status: 'completed', public_url: URL)
    ↓
Elimina original: Storage.remove(video-uploads)
```

### 3. Actualización en Tiempo Real

```
VideoPlayer se suscribe a Realtime
    ↓
Realtime notifica: UPDATE videos WHERE id = videoId
    ↓
VideoPlayer recibe evento
    ↓
Actualiza estado: status = 'completed', public_url = URL
    ↓
Renderiza: <video src={public_url} />
```

## 🔐 Seguridad

### RLS (Row Level Security)

**Tabla `videos`:**
```sql
-- Usuarios autenticados pueden insertar sus propios videos
CREATE POLICY "Allow authenticated insert"
  ON videos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden ver sus propios videos
CREATE POLICY "Allow individual read"
  ON videos FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Todos pueden ver videos completados
CREATE POLICY "Allow public read on completed"
  ON videos FOR SELECT
  USING (status = 'completed');

-- Solo service role puede actualizar
CREATE POLICY "Allow service role update"
  ON videos FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);
```

**Storage `video-uploads`:**
- Privado
- Usuarios solo acceden a sus propios archivos
- Service role puede eliminar

**Storage `videos`:**
- Público (solo lectura)
- Todos pueden descargar archivos finales
- Service role puede subir

## 💾 Base de Datos

### Tabla `videos`

```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'uploading',
  original_path TEXT,
  public_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_status ON videos(status);

-- Trigger para actualizar updated_at
CREATE TRIGGER videos_updated_at_trigger
BEFORE UPDATE ON videos
FOR EACH ROW
EXECUTE FUNCTION update_videos_updated_at();
```

### Estados

| Estado | Descripción | Duración |
|--------|-------------|----------|
| `uploading` | Archivo se está subiendo a Storage | Segundos |
| `processing` | Edge Function está convirtiendo | Minutos |
| `completed` | Listo para reproducir | Permanente |
| `failed` | Error durante conversión | Permanente |

## 🎬 Componentes Frontend

### VideoUploader

```tsx
interface VideoUploaderProps {
  userId: string
  onVideoUploaded: (videoId: string) => void
  onError?: (error: string) => void
}
```

**Características:**
- Drag & drop
- Validación de tipo y tamaño
- Barra de progreso
- Estados visuales (cargando, completado, error)

### VideoPlayer

```tsx
interface VideoPlayerProps {
  videoId: string
  className?: string
}
```

**Características:**
- Obtiene estado inicial de BD
- Se suscribe a Realtime
- Muestra spinner mientras procesa
- Renderiza video cuando está listo
- Maneja errores

### VideoButton

```tsx
interface VideoButtonProps {
  editor: ReturnType<typeof useEditor> | null
}
```

**Características:**
- Botón en barra de herramientas
- Abre modal con VideoUploader
- Inserta nodo de video en editor

## 🪝 Hooks

### useVideoUploader

```tsx
const { uploadVideo, uploadProgress, resetProgress } = useVideoUploader()

// uploadVideo(file: File, userId: string): Promise<string>
// uploadProgress: { status, videoId, error, progress }
// resetProgress(): void
```

## 🧩 Extensión Tiptap

### Video Node

```tsx
// Nodo personalizado para videos
const Video = Node.create({
  name: 'video',
  group: 'block',
  selectable: true,
  atom: true,
  
  addAttributes() {
    return {
      videoId: { default: null }
    }
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeComponent)
  },
  
  addCommands() {
    return {
      insertVideo: (videoId: string) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { videoId }
        })
      }
    }
  }
})
```

## 🚀 Edge Function

### video-converter

```typescript
// Recibe: { videoId, originalPath, userId }
// Retorna: { success: true, url: publicUrl } o { error: message }

// Pasos:
1. Descargar archivo de video-uploads
2. Ejecutar FFmpeg (conversión a WebM VP9)
3. Subir resultado a videos
4. Obtener URL pública
5. Actualizar BD
6. Eliminar archivo original
```

**Comando FFmpeg:**
```bash
ffmpeg -i input \
  -c:v libvpx-vp9 \    # Codec VP9
  -b:v 1M \             # Bitrate 1Mbps
  -an \                 # Sin audio
  -vf "scale=720:-1" \  # 720p de ancho
  -f webm output.webm
```

## 📈 Optimizaciones

### Tamaño de Archivo

| Formato | Tamaño | Compresión |
|---------|--------|-----------|
| MP4 (original) | 100 MB | - |
| WebM VP9 (1M) | 10-15 MB | 85-90% |

### Bitrate

- **1M**: Buena calidad, archivo pequeño (recomendado)
- **2M**: Mejor calidad, archivo más grande
- **500K**: Baja calidad, archivo muy pequeño

### Resolución

- **720p**: Buena para web (recomendado)
- **1080p**: Mejor calidad, archivo más grande
- **480p**: Baja calidad, archivo pequeño

## 🔄 Realtime

### Suscripción

```tsx
const channel = supabase
  .channel(`video-${videoId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'videos',
      filter: `id=eq.${videoId}`
    },
    (payload) => {
      // Actualizar estado
    }
  )
  .subscribe()
```

### Eventos

- `INSERT`: Nuevo video
- `UPDATE`: Cambio de estado
- `DELETE`: Video eliminado

## 📝 Logging

### Niveles

```
[video-converter] Iniciando conversión...      // INFO
[video-converter] ✅ Conversión exitosa       // SUCCESS
[video-converter] ❌ Error: ...               // ERROR
[VideoPlayer] Actualización recibida          // DEBUG
```

### Ubicación

- **Edge Function**: Supabase Dashboard → Edge Functions → Logs
- **Hook**: Console del navegador (F12)
- **Componente**: Console del navegador (F12)

## 🐛 Manejo de Errores

### Errores Posibles

| Error | Causa | Solución |
|-------|-------|----------|
| "FFmpeg not found" | Dockerfile no construido | Redeploy |
| "Permission denied" | RLS no configurado | Verificar RLS |
| "File not found" | Archivo no existe en Storage | Verificar bucket |
| "Timeout" | Conversión tarda mucho | Esperar o usar archivo más pequeño |

### Recuperación

```tsx
// Si falla, el estado se actualiza a 'failed'
// Usuario puede reintentar desde VideoUploader
// El registro en BD se mantiene para auditoría
```

## 📊 Monitoreo

### Métricas Importantes

- Tiempo de conversión promedio
- Tasa de éxito/fallo
- Tamaño promedio de archivo
- Uso de Storage

### Queries de Monitoreo

```sql
-- Videos completados hoy
SELECT COUNT(*) FROM videos 
WHERE status = 'completed' 
AND created_at > NOW() - INTERVAL '1 day';

-- Tiempo promedio de conversión
SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) 
FROM videos 
WHERE status = 'completed';

-- Errores
SELECT error_message, COUNT(*) 
FROM videos 
WHERE status = 'failed' 
GROUP BY error_message;
```

## 🎯 Casos de Uso

### 1. Insertar Video en Hilo del Foro

```tsx
// En CrearHiloForm.tsx
const { uploadVideo } = useVideoUploader()

const handleVideoUploaded = (videoId: string) => {
  editor.commands.insertVideo(videoId)
}

// En template
<VideoButton editor={editor} />
```

### 2. Galería de Videos del Usuario

```tsx
// En perfil del usuario
const { data: videos } = useQuery({
  queryKey: ['user-videos', userId],
  queryFn: async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
    return data
  }
})

return videos.map(video => (
  <VideoPlayer key={video.id} videoId={video.id} />
))
```

### 3. Validación de Videos

```tsx
// Antes de insertar
if (uploadProgress.status !== 'completed') {
  throw new Error('Video aún se está procesando')
}

// Después de insertar
const { data } = await supabase
  .from('videos')
  .select('public_url')
  .eq('id', videoId)
  .single()

if (!data?.public_url) {
  throw new Error('Video no tiene URL pública')
}
```

## 🔮 Mejoras Futuras

1. **Thumbnails**: Generar miniatura automáticamente
2. **Múltiples Bitrates**: Ofrecer diferentes calidades
3. **Subtítulos**: Soporte para subtítulos
4. **Transcripción**: Transcribir audio automáticamente
5. **Estadísticas**: Rastrear reproducciones
6. **Caché**: Cachear videos en CDN
7. **Compresión**: Múltiples formatos (HEVC, AV1)

## 📚 Referencias

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [VP9 Codec](https://en.wikipedia.org/wiki/VP9)
- [Tiptap Extensions](https://tiptap.dev/guide/custom-extensions)

## ✅ Checklist de Implementación

- [x] Migración SQL
- [x] Buckets en Storage
- [x] RLS configurado
- [x] Edge Function desplegada
- [x] Realtime habilitado
- [x] Hook useVideoUploader
- [x] Componente VideoPlayer
- [x] Componente VideoUploader
- [x] Extensión Tiptap
- [x] Botón VideoButton
- [x] Documentación
- [ ] Pruebas unitarias
- [ ] Pruebas E2E
- [ ] Monitoreo en producción

---

**Versión:** 1.0  
**Fecha:** 2025-01-09  
**Autor:** Cascade AI  
**Estado:** Completado ✅
