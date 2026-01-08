# 🏗️ Arquitectura Desacoplada - Video Pipeline

## 📋 Resumen de Cambios

Se ha implementado una **arquitectura desacoplada** para el pipeline de conversión de videos. El cliente ya no invoca directamente la Edge Function, sino que usa un **Trigger de Base de Datos** para procesamiento asíncrono en segundo plano.

---

## 🔄 Flujo Anterior (Acoplado)

```
Cliente (Frontend)
    ↓
1. Crear registro en BD
2. Subir archivo a Storage
3. Invocar Edge Function (BLOQUEANTE)
    ↓
Edge Function (video-converter)
    ↓
Actualizar BD + Realtime
```

**Problema:** El cliente espera a que la Edge Function termine (timeout posible).

---

## ✅ Flujo Nuevo (Desacoplado)

```
Cliente (Frontend)
    ↓
1. Crear registro en BD (status: 'uploading')
2. Subir archivo a Storage
3. Actualizar BD (status: 'processing') ← DISPARA TRIGGER
    ↓ (Retorna inmediatamente al cliente)
    
Trigger de BD (en segundo plano)
    ↓
Invoca Edge Function (video-converter)
    ↓
Edge Function procesa video
    ↓
Actualiza BD (status: 'completed')
    ↓
Realtime notifica al cliente
```

**Ventaja:** El cliente no espera. La conversión ocurre en segundo plano.

---

## 📝 Cambios Realizados

### 1. Hook `useVideoUploader.ts` - MODIFICADO

**Cambio:** Eliminada la llamada a `supabase.functions.invoke()`.

```typescript
// ANTES (Acoplado)
const { data: functionData, error: functionError } = await supabase.functions.invoke(
  'video-converter',
  { body: { videoId, originalPath, userId } }
)

// DESPUÉS (Desacoplado)
// Solo actualizar estado a 'processing'
const { error: updateError } = await supabase
  .from('videos')
  .update({ status: 'processing' })
  .eq('id', videoId)

// El trigger se encarga del resto
```

**Resultado:** El cliente devuelve el `videoId` inmediatamente sin esperar la conversión.

---

### 2. Trigger de Base de Datos - CREADO

**Archivo:** `supabase/migrations/20250109000001_create_video_trigger.sql`

**Función:** Cuando un video cambia a `status = 'processing'`, el trigger invoca automáticamente la Edge Function en segundo plano.

```sql
create trigger on_video_processing
after update of status on public.videos
for each row
when (NEW.status = 'processing' and OLD.status <> 'processing')
execute procedure public.trigger_video_conversion();
```

**Ventajas:**
- ✅ No depende del cliente
- ✅ Reintentos automáticos si falla
- ✅ Procesamiento garantizado
- ✅ Escalable

---

## 🔌 Componentes Involucrados

| Componente | Rol | Estado |
|---|---|---|
| `useVideoUploader.ts` | Hook del cliente | ✅ Actualizado |
| `VideoPlayer.tsx` | Escucha cambios vía Realtime | ✅ Sin cambios |
| `video-converter` Edge Function | Procesa videos | ✅ Sin cambios |
| Trigger de BD | Orquesta el flujo | ✅ Creado |
| `videos` tabla | Almacena estado | ✅ Sin cambios |

---

## 🧪 Flujo de Prueba

### Paso 1: Subir Video
```
Cliente: "Subiendo video..."
  ↓
BD: status = 'uploading'
  ↓
Storage: Archivo guardado
  ↓
BD: status = 'processing' ← TRIGGER DISPARA
  ↓
Cliente: "Video registrado. Esperando conversión..."
```

### Paso 2: Conversión en Segundo Plano
```
Trigger: Invoca Edge Function
  ↓
Edge Function: Descarga, convierte, sube WebM
  ↓
BD: status = 'completed'
  ↓
Realtime: Notifica al cliente
  ↓
Cliente: VideoPlayer muestra video convertido
```

---

## 📊 Ventajas de la Arquitectura Desacoplada

| Aspecto | Antes | Después |
|---|---|---|
| **Tiempo de respuesta** | Lento (espera conversión) | Rápido (retorna inmediatamente) |
| **Dependencia cliente-servidor** | Fuerte | Débil |
| **Reintentos** | Manual | Automático |
| **Escalabilidad** | Limitada | Ilimitada |
| **Confiabilidad** | Baja (timeout) | Alta (garantizado) |

---

## 🔍 Debugging

### Ver Logs del Trigger

1. Ve a: **SQL Editor** en Supabase
2. Ejecuta:
```sql
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%trigger_video_conversion%' 
ORDER BY calls DESC;
```

### Ver Logs de Edge Function

1. Ve a: **Functions** → **video-converter** → **Logs**
2. Busca invocaciones recientes

### Verificar Estado de Video

```sql
SELECT id, status, error_message, created_at 
FROM videos 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## ⚙️ Configuración Requerida

✅ **Ya está hecho:**
- Trigger de BD creado
- Hook `useVideoUploader` actualizado
- Extensión `pg_net` habilitada
- Service Role Key configurada

✅ **Verificar:**
- Buckets `video-uploads` y `videos` existen
- RLS configurado en buckets (si es necesario)
- Edge Function `video-converter` v3 activa

---

## 🚀 Próximos Pasos

1. **Probar el pipeline:**
   - Abre http://localhost:3001
   - Crea un hilo
   - Sube un video
   - Observa el progreso en tiempo real

2. **Monitorear logs:**
   - Revisa logs de Edge Function
   - Verifica cambios de estado en BD

3. **Optimizaciones futuras:**
   - Agregar reintentos configurables
   - Agregar notificaciones por email
   - Agregar métricas de rendimiento

---

## 📚 Referencias

- **Supabase pg_net:** https://supabase.com/docs/guides/database/extensions/pg_net
- **Supabase Triggers:** https://supabase.com/docs/guides/database/extensions/plpgsql
- **Supabase Realtime:** https://supabase.com/docs/guides/realtime

---

**La arquitectura desacoplada garantiza un pipeline robusto y escalable.**
