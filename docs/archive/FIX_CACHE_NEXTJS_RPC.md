# Fix: Cache de Next.js en Endpoint RPC

## 🐛 Problema

**Síntoma**: 
```
Total vistas desde RPC: 60
Vistas últimos 30 días: undefined
Vistas 30-60 días atrás: undefined
```

Pero al ejecutar la función directamente en Supabase:
```sql
SELECT obtener_estadisticas_admin_noticias();
-- Devuelve: total_vistas: 86, vistas_ultimos_30_dias: 86
```

**Causa**: Next.js está cacheando la respuesta de la ruta API `/api/admin/noticias/estadisticas`.

## 🔍 Diagnóstico

### 1. La función RPC está correcta ✅
```sql
SELECT 
  (obtener_estadisticas_admin_noticias()::json->>'total_vistas')::int as total_vistas,
  (obtener_estadisticas_admin_noticias()::json->>'vistas_ultimos_30_dias')::int as vistas_ultimos_30_dias;
  
-- Resultado: 86, 86 ✅
```

### 2. El endpoint está devolviendo datos viejos ❌
```
Total vistas desde RPC: 60  ← Cache viejo
```

### 3. Next.js está cacheando por defecto
Next.js 13+ cachea las rutas API por defecto para optimizar rendimiento.

## ✅ Solución

Agregar configuración para **deshabilitar cache** en el endpoint.

**Archivo**: `src/app/api/admin/noticias/estadisticas/route.ts`

```typescript
// AGREGAR AL INICIO DEL ARCHIVO (después de los imports)
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

### Explicación

- **`dynamic = 'force-dynamic'`**: Fuerza que la ruta sea dinámica (no estática)
- **`revalidate = 0`**: Deshabilita la revalidación/cache

## 📝 Cambios Aplicados

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { getServiceClient } from '@/utils/supabase-service'

// ✅ NUEVO: Configuración para deshabilitar cache de Next.js
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ... resto del código
```

## 🔄 Cómo Aplicar el Fix

### Opción 1: Reiniciar el servidor (RECOMENDADO)
```bash
# Detener el servidor (Ctrl+C)
npm run dev
```

### Opción 2: Forzar recarga en el navegador
1. Abre DevTools (F12)
2. Click derecho en el botón de recargar
3. Selecciona "Empty Cache and Hard Reload"

## 🧪 Verificación

Después de reiniciar el servidor, deberías ver en la terminal:

```
✅ Estadísticas obtenidas mediante función RPC optimizada
Total vistas desde RPC: 86          ← ✅ Correcto
Vistas últimos 30 días: 86          ← ✅ Correcto
Vistas 30-60 días atrás: 0          ← ✅ Correcto
```

Y en la consola del navegador:
```
📊 Cálculo de trend de vistas: {
  vistasRecientes: 86,
  vistasAnteriores: 0,
  trend: 100
}
```

## 📊 Comparación

### Antes (CON CACHE)
```
GET /api/admin/noticias/estadisticas
→ Devuelve datos cacheados (60 vistas)
→ No consulta la BD
→ Datos desactualizados
```

### Ahora (SIN CACHE)
```
GET /api/admin/noticias/estadisticas
→ Ejecuta la función RPC cada vez
→ Consulta la BD en tiempo real
→ Datos siempre actualizados (86 vistas)
```

## 🎯 Beneficios

1. ✅ **Datos en tiempo real**: Siempre muestra el valor actual de la BD
2. ✅ **No más cache viejo**: Elimina el problema de datos desactualizados
3. ✅ **Trends correctos**: Los cálculos usan datos frescos
4. ✅ **Sincronización**: El admin se actualiza automáticamente cada 10 segundos

## 📚 Documentación de Next.js

Más información sobre Route Segment Config:
- https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic
- https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#revalidate

## ⚠️ Nota Importante

**DEBES REINICIAR EL SERVIDOR** para que los cambios tomen efecto. Los cambios en la configuración de rutas (`export const dynamic`) no se aplican con hot reload.

```bash
# En la terminal:
Ctrl+C  (detener servidor)
npm run dev  (iniciar de nuevo)
```

## 🔮 Próximos Pasos

Si en el futuro quieres cache pero con revalidación periódica:

```typescript
// Cache con revalidación cada 10 segundos
export const revalidate = 10

// O usar ISR (Incremental Static Regeneration)
export const dynamic = 'force-static'
export const revalidate = 60 // Revalidar cada 60 segundos
```

Pero para un panel de admin con datos en tiempo real, **`force-dynamic`** es la mejor opción.

---

**Fecha**: 15 de Octubre, 2025  
**Estado**: ✅ IMPLEMENTADO - REQUIERE REINICIO DEL SERVIDOR
