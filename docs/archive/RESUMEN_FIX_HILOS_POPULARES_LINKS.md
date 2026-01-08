# Fix: Enlaces Rotos en Componente Hilos Más Populares

## Problema Identificado

El componente **HilosPopulares** en el dashboard del foro mostraba enlaces rotos:

### Error Observado
```
❌ Enlace generado: http://localhost:3000/foro/delta%20force/m4a1-para-extraccion-20251015135959-ej29no
✅ Enlace esperado: http://localhost:3000/foro/hilos/m4a1-para-extraccion-20251015135959-ej29no
```

### Causa Raíz
- La RPC `get_hilos_populares()` retornaba `categoria_nombre` (ej: "Delta Force")
- El componente usaba `categoria_nombre.toLowerCase()` en la URL
- Esto generaba URLs como `/foro/delta%20force/slug` en lugar de `/foro/hilos/slug`
- La ruta correcta es `/foro/hilos/[slug]` que busca el hilo por su slug único

## Solución Implementada

### 1. Actualizar RPC `get_hilos_populares()` ✅
**Archivo:** `supabase/migrations/20250123_fix_hilos_populares_categoria_slug.sql`

```sql
-- ANTES (incorrecto)
c.nombre::TEXT as categoria_nombre

-- DESPUÉS (correcto)
c.nombre::TEXT as categoria_nombre,
c.slug::TEXT as categoria_slug
```

**Cambios:**
- Agregado campo `categoria_slug` a la tabla de retorno
- Ahora retorna tanto `categoria_nombre` como `categoria_slug`
- Mantiene compatibilidad con componentes que usan `categoria_nombre` para mostrar

### 2. Actualizar Interfaz TypeScript ✅
**Archivo:** `src/components/admin/foro/hooks/useEstadisticasForo.ts`

```typescript
export interface HiloPopular {
  // ... otros campos ...
  categoria_nombre: string;
  categoria_slug: string;  // ← NUEVO
  // ... otros campos ...
}
```

### 3. Actualizar Componente HilosPopulares ✅
**Archivo:** `src/components/admin/foro/HilosPopulares.tsx`

#### Enlace del Título (línea 125)
```typescript
// ANTES
href={`/foro/${hilo.categoria_nombre.toLowerCase()}/${hilo.slug}`}

// DESPUÉS
href={`/foro/hilos/${hilo.slug}`}
```

#### Botón Externo (línea 139)
```typescript
// ANTES
href={`/foro/${hilo.categoria_nombre.toLowerCase()}/${hilo.slug}`}

// DESPUÉS
href={`/foro/hilos/${hilo.slug}`}
```

## Cambios Clave

| Aspecto | Antes | Después |
|--------|-------|---------|
| **Ruta URL** | `/foro/delta%20force/slug` | `/foro/hilos/slug` |
| **Parámetro usado** | `categoria_nombre` | `slug` del hilo |
| **RPC retorna** | Solo `categoria_nombre` | `categoria_nombre` + `categoria_slug` |
| **Ambos enlaces** | Diferentes rutas | Misma ruta correcta |

## Archivos Modificados

```
supabase/migrations/
└── 20250123_fix_hilos_populares_categoria_slug.sql (NUEVO)

src/components/admin/foro/
├── HilosPopulares.tsx (ACTUALIZADO)
└── hooks/useEstadisticasForo.ts (ACTUALIZADO)
```

## Verificación

Ahora al hacer clic en:
- ✅ **Título del hilo**: Abre `/foro/hilos/m4a1-para-extraccion-20251015135959-ej29no`
- ✅ **Botón externo**: Abre en nueva pestaña `/foro/hilos/m4a1-para-extraccion-20251015135959-ej29no`
- ✅ **Ambos usan la misma ruta correcta**

## Impacto

- **Antes**: Enlaces rotos (404 Not Found)
- **Después**: Enlaces funcionales que abren el hilo correctamente

## Notas Técnicas

- La ruta `/foro/hilos/[slug]` busca el hilo por su slug único
- El slug es único a nivel global, no necesita el nombre de la categoría
- La categoría se muestra en el badge pero no se usa en la URL
- Ambos enlaces (título y botón) ahora son consistentes

## Testing Recomendado

1. Ir al dashboard del foro (`/admin/foro`)
2. Ir a la pestaña "Dashboard"
3. Buscar el componente "Hilos Más Populares"
4. Hacer clic en el título de un hilo
5. Verificar que se abre correctamente
6. Hacer clic en el botón externo (icono de flecha)
7. Verificar que se abre en nueva pestaña sin errores 404
