# Fix: Mostrar URLs de Recortes en la Preview

## Problema
Las URLs de los recortes (`statsPanelUrl` y `armaUrl`) se estaban guardando dentro del campo `result` (JSON), pero no estaban disponibles como columnas separadas en la tabla `weapon_analysis_jobs`. Esto hacía que el hook no pudiera acceder a ellas fácilmente para mostrarlas en la preview.

## Solución

### 1. Agregar Columnas a la BD

Se creó una migración para agregar dos columnas a `weapon_analysis_jobs`:

```sql
ALTER TABLE weapon_analysis_jobs
ADD COLUMN IF NOT EXISTS stats_panel_url text,
ADD COLUMN IF NOT EXISTS arma_url text;
```

También se agregaron índices para búsquedas rápidas:
```sql
CREATE INDEX idx_weapon_analysis_jobs_stats_panel_url 
ON weapon_analysis_jobs(stats_panel_url) 
WHERE stats_panel_url IS NOT NULL;

CREATE INDEX idx_weapon_analysis_jobs_arma_url 
ON weapon_analysis_jobs(arma_url) 
WHERE arma_url IS NOT NULL;
```

### 2. Actualizar Edge Function

**Función `updateJobStatus()`:**
- Agregados parámetros: `statsPanelUrl` y `armaUrl`
- Ahora guarda las URLs en las columnas correspondientes

```typescript
async function updateJobStatus(
  supabase,
  jobId,
  status,
  result,
  errorMessage,
  statsPanelUrl,  // ← Nuevo
  armaUrl         // ← Nuevo
)
```

**Llamada a `updateJobStatus()`:**
- Ahora pasa las URLs capturadas:

```typescript
await updateJobStatus(
  supabase, 
  jobId, 
  "completed", 
  normalizedResult, 
  undefined, 
  statsPanelUrl,  // ← Pasa URL
  armaUrl         // ← Pasa URL
);
```

### 3. Actualizar API Endpoint

El endpoint `/api/analyze-weapon/status` ahora devuelve las URLs:

```typescript
const { data: job } = await supabase
  .from("weapon_analysis_jobs")
  .select(
    "id, status, result, error_message, weapon_stats_record_id, stats_panel_url, arma_url"
    //                                                          ↑ Nuevas columnas
  )
  .eq("id", jobId)
  .single();
```

### 4. Actualizar Hook

El hook ahora captura las URLs desde las columnas de la BD:

```typescript
setStatsPanelUrl((job as any).stats_panel_url || null);
setArmaUrl((job as any).arma_url || null);
```

## Flujo Actualizado

```
1. Edge Function procesa imagen
   ↓
2. Jimp recorta y sube a Storage
   ↓
3. updateJobStatus() guarda URLs en columnas:
   - stats_panel_url
   - arma_url
   ↓
4. API devuelve job con URLs
   ↓
5. Hook captura URLs desde job
   ↓
6. Componente renderiza recortes lado a lado
```

## Archivos Modificados

- `supabase/functions/analyze-weapon-async/index.ts` - Actualizar updateJobStatus() y su llamada
- `src/app/api/analyze-weapon/status/route.ts` - Agregar columnas al SELECT
- `src/hooks/useWeaponAnalyzer.ts` - Capturar URLs con nombres correctos

## Migraciones Aplicadas

- ✅ `add_crop_urls_to_weapon_analysis_jobs` - Agregar columnas e índices

## Despliegue

- ✅ Edge Function desplegada con cambios

## Próximos Pasos

1. Probar end-to-end:
   - Subir imagen real
   - Esperar análisis
   - Verificar que aparecen los recortes en la preview

2. Verificar en Supabase Dashboard:
   - Storage: `weapon-analysis-crops` tiene los archivos PNG
   - BD: `weapon_analysis_jobs` tiene URLs en `stats_panel_url` y `arma_url`
   - Tabla de auditoría: `weapon_analysis_crops_log` registra los recortes

## Notas

- Las URLs ahora están en columnas separadas (más fácil de acceder)
- Las URLs también siguen en el campo `result` (para compatibilidad)
- Los índices aceleran búsquedas por URL
- El componente ya tiene la lógica para mostrar los recortes lado a lado
