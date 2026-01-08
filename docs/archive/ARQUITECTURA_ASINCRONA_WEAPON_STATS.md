# Arquitectura Asíncrona - Análisis de Estadísticas de Armas

## Descripción General

Se ha implementado una arquitectura completamente asíncrona para el análisis de imágenes de armas usando un sistema de jobs en segundo plano. Esto reemplaza la arquitectura síncrona anterior que fallaba con timeouts 504.

## Flujo de Funcionamiento

```
1. Usuario selecciona imagen en WeaponAnalyzer.tsx
   ↓
2. POST /api/analyze-weapon
   - Valida archivo (< 5MB, JPEG/PNG/WebP)
   - Sube imagen a Storage (bucket: weapon-analysis-temp)
   - Crea job en BD con status: 'pending'
   - Invoca Edge Function de forma asíncrona (fire-and-forget)
   - Responde inmediatamente con jobId
   ↓
3. Edge Function analyze-weapon-async (en segundo plano)
   - Actualiza job a status: 'processing'
   - Descarga imagen desde Storage
   - Convierte a base64
   - Llama API Gemini 1.5 Flash
   - Parsea respuesta JSON
   - Actualiza job con resultado o error
   ↓
4. Cliente hace polling cada 2 segundos
   - GET /api/check-analysis-status?jobId=...
   - Si status === 'completed': muestra resultado
   - Si status === 'failed': muestra error
   - Si status === 'processing': continúa polling
```

## Componentes Implementados

### 1. Base de Datos (SQL)

**Tabla:** `weapon_analysis_jobs`

```sql
CREATE TABLE weapon_analysis_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (FK auth.users),
  storage_path TEXT NOT NULL,
  bucket TEXT DEFAULT 'weapon-analysis-temp',
  status TEXT ('pending', 'processing', 'completed', 'failed'),
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**RLS Policies:**
- INSERT: Usuarios pueden crear jobs solo para sí mismos
- SELECT: Usuarios pueden leer solo sus propios jobs
- UPDATE: Usuarios pueden actualizar solo sus propios jobs

**Índices:**
- `idx_weapon_analysis_jobs_user_id` - Para búsquedas por usuario
- `idx_weapon_analysis_jobs_status` - Para filtrar por estado

**Trigger:**
- `trigger_weapon_analysis_jobs_updated_at` - Actualiza `updated_at` automáticamente

### 2. API Route POST - Crear Job

**Archivo:** `src/app/api/analyze-weapon/route.ts`

**Responsabilidades:**
- Autenticar usuario
- Validar archivo (tamaño, tipo MIME)
- Subir imagen a Storage con ruta única: `{userId}/{timestamp}.{ext}`
- Crear registro en BD con status 'pending'
- Invocar Edge Function de forma asíncrona
- Responder inmediatamente con jobId

**Respuesta exitosa:**
```json
{
  "success": true,
  "jobId": "uuid-del-job"
}
```

### 3. API Route GET - Consultar Estado

**Archivo:** `src/app/api/check-analysis-status/route.ts`

**Responsabilidades:**
- Autenticar usuario
- Validar parámetro `jobId`
- Consultar job en BD
- Verificar que pertenece al usuario autenticado
- Retornar estado actual

**Respuesta:**
```json
{
  "status": "completed|processing|failed|pending",
  "result": { ... },
  "error": "mensaje de error si aplica",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 4. Edge Function - Procesamiento Asíncrono

**Archivo:** `supabase/functions/analyze-weapon-async/index.ts`

**Responsabilidades:**
1. Recibe `jobId` en el body
2. Actualiza job a status 'processing'
3. Descarga imagen desde Storage
4. Convierte a base64
5. Llama API Gemini 1.5 Flash con prompt de análisis
6. Parsea respuesta JSON
7. Si `type === 'stats'`: actualiza job con resultado
8. Si `type === 'descripcion'`: actualiza job con error (descripción cómica)
9. En caso de error: actualiza job con mensaje de error

**Prompt de Gemini:**
```
Analiza esta imagen de un arma de videojuego y extrae las estadísticas.

Si la imagen contiene estadísticas claras, responde con JSON:
{
  "type": "stats",
  "stats": {
    "damage": <número>,
    "range": <número en metros>,
    "control": <número>,
    "handling": <número>,
    "stability": <número>,
    "accuracy": <número>,
    "armorPenetration": <número>,
    "fireRate": <número en dpm>,
    "capacity": <número>,
    "muzzleVelocity": <número en m/s>,
    "soundRange": <número en metros>
  }
}

Si NO contiene estadísticas claras, responde con:
{
  "type": "descripcion",
  "descripcion": "<descripción cómica de por qué no se pueden extraer>"
}
```

### 5. Componente React - UI con Polling

**Archivo:** `src/components/weapon/WeaponAnalyzer.tsx`

**Estados:**
- `idle` - Esperando selección de archivo
- `uploading` - Subiendo imagen
- `processing` - Analizando (polling activo)
- `completed` - Análisis exitoso
- `error` - Error en cualquier etapa

**Características:**
- Input de archivo con validación
- Polling automático cada 2 segundos
- Limpieza de intervalo al completar
- Muestra estadísticas en grid
- Soporte para modo claro/oscuro
- Manejo robusto de errores

## Variables de Entorno Necesarias

### En `.env.local` (desarrollo):
```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
```

### En Supabase Dashboard (Edge Functions):
```
GEMINI_API_KEY=...
```

## Flujo de Despliegue

### 1. Aplicar Migración SQL
```bash
supabase db push
```

### 2. Desplegar Edge Function
```bash
npx supabase functions deploy analyze-weapon-async --project-ref=qeeaptyhcqfaqdecsuqc
```

### 3. Configurar Variables de Entorno
- Dashboard Supabase → Settings → Edge Functions → Environment Variables
- Agregar `GEMINI_API_KEY`

### 4. Usar el Componente
```tsx
import { WeaponAnalyzer } from '@/components/weapon/WeaponAnalyzer';

export default function Page() {
  return <WeaponAnalyzer />;
}
```

## Ventajas de esta Arquitectura

✅ **Sin Timeouts 504**: La respuesta es inmediata, el procesamiento ocurre en segundo plano
✅ **Escalable**: Múltiples análisis simultáneos sin bloquear al usuario
✅ **Resiliente**: Si falla Gemini, el job se marca como failed pero no afecta al usuario
✅ **Auditable**: Todos los análisis quedan registrados en BD
✅ **Seguro**: RLS garantiza que usuarios solo vean sus propios jobs
✅ **UX Mejorada**: Feedback en tiempo real con polling
✅ **Mantenible**: Separación clara de responsabilidades

## Monitoreo y Debugging

### Ver jobs en BD:
```sql
SELECT * FROM weapon_analysis_jobs 
WHERE user_id = 'user-uuid' 
ORDER BY created_at DESC;
```

### Ver logs de Edge Function:
```bash
supabase functions logs analyze-weapon-async --project-ref=qeeaptyhcqfaqdecsuqc
```

### Verificar estado de un job:
```bash
curl -X GET "http://localhost:3000/api/check-analysis-status?jobId=job-uuid" \
  -H "Authorization: Bearer token"
```

## Limitaciones y Consideraciones

- **Timeout de Gemini**: Si Gemini tarda > 60s, la Edge Function falla
- **Tamaño de archivo**: Limitado a 5MB (configurable)
- **Tipos de imagen**: JPEG, PNG, WebP (configurable)
- **Retención de archivos**: Las imágenes se guardan en Storage indefinidamente (considerar limpieza)
- **Costo**: Cada análisis consume tokens de Gemini

## Próximos Pasos Opcionales

1. **Limpieza automática**: Crear función para eliminar archivos después de X días
2. **Caché de resultados**: Guardar análisis para imágenes idénticas
3. **Historial**: Mostrar análisis anteriores del usuario
4. **Exportación**: Permitir descargar resultados como JSON/PDF
5. **Comparación**: Comparar estadísticas de múltiples armas
