# Fix: Filtro de Hilos Borrados en Dashboard del Foro

## Problema Identificado

El panel de administración del foro estaba mostrando **hilos borrados** en varias secciones:
- ❌ **Total de Hilos**: Incluía hilos con `deleted_at IS NOT NULL`
- ❌ **Hilos Más Populares**: Listaba hilos borrados en el ranking
- ❌ **Estadísticas por Categoría**: Contaba hilos borrados
- ❌ **Actividad Diaria**: Incluía hilos borrados en métricas
- ❌ **Usuarios Más Activos**: Contaba actividad de hilos borrados
- ❌ **Panel de Moderación**: Mostraba hilos borrados en listados

## Causa Raíz

Las funciones RPC de Supabase no estaban filtrando el campo `deleted_at`:

```sql
-- ❌ ANTES (incorrecto)
SELECT COUNT(*) FROM foro_hilos  -- Incluye hilos borrados

-- ✅ DESPUÉS (correcto)
SELECT COUNT(*) FROM foro_hilos WHERE deleted_at IS NULL
```

## Solución Implementada

Se creó la migración **`20250123_fix_deleted_threads_filter.sql`** que actualiza **6 funciones RPC**:

### 1. `get_estadisticas_generales_foro()`
- Filtra hilos no borrados en: total_hilos, total_comentarios, total_usuarios, total_vistas
- Filtra hilos no borrados al buscar: hilo_mas_votado, hilo_menos_votado, hilo_mas_visto

### 2. `get_hilos_populares()`
- Agrega `WHERE h.deleted_at IS NULL` antes de calcular puntuación de popularidad
- Filtra por período y solo muestra hilos activos

### 3. `get_estadisticas_por_categoria()`
- Filtra hilos no borrados en conteos por categoría
- Aplica a: total_hilos, total_comentarios, total_vistas, hilos_activos_semana

### 4. `get_actividad_diaria_foro()`
- Filtra hilos no borrados en: hilos_por_dia, comentarios_por_dia, usuarios_por_dia
- Mantiene el rango de fechas pero solo cuenta actividad de hilos activos

### 5. `get_usuarios_mas_activos_foro()`
- Filtra hilos no borrados al contar: hilos_creados, comentarios_creados, total_votos_recibidos
- Filtra hilos no borrados al calcular: ultima_actividad

### 6. `get_hilos_recientes_moderacion()`
- Agrega `WHERE h.deleted_at IS NULL` en la consulta principal
- Filtra hilos borrados antes de aplicar ordenamiento y paginación

## Componentes Afectados (Ahora Funcionan Correctamente)

| Componente | Ubicación | Métrica Corregida |
|-----------|-----------|------------------|
| EstadisticasGenerales | `/admin/foro` | Total de hilos, comentarios, vistas |
| HilosPopulares | `/admin/foro` | Ranking de hilos más populares |
| EstadisticasCategorias | `/admin/foro` | Conteos por categoría |
| GraficoActividad | `/admin/foro` | Actividad diaria |
| UsuariosActivos | `/admin/foro` | Usuarios más activos |
| PanelModeracion | `/admin/foro/moderacion` | Listado de hilos recientes |

## Archivos Modificados

```
supabase/migrations/
└── 20250123_fix_deleted_threads_filter.sql (NUEVO)
```

## Cambios Clave en SQL

### Patrón de Filtrado Aplicado

```sql
-- En conteos
SELECT COUNT(*) FROM foro_hilos WHERE deleted_at IS NULL

-- En JOINs
FROM foro_posts fp
INNER JOIN foro_hilos h ON fp.hilo_id = h.id
WHERE h.deleted_at IS NULL

-- En subconsultas
(SELECT COUNT(*) FROM foro_posts fp WHERE fp.hilo_id = h.id)
-- Nota: Los posts se filtran por el hilo padre, no directamente
```

## Verificación

La migración fue aplicada correctamente a Supabase. Todas las funciones RPC ahora:
- ✅ Filtran hilos borrados automáticamente
- ✅ Mantienen la misma interfaz (sin cambios en parámetros)
- ✅ Funcionan con React Query sin cambios en componentes
- ✅ Tienen permisos GRANT EXECUTE para usuarios autenticados

## Impacto

- **Antes**: Dashboard mostraba datos inflados incluyendo hilos borrados
- **Después**: Dashboard muestra solo hilos activos, datos precisos y consistentes

## Testing Recomendado

1. Crear un hilo de prueba
2. Borrarlo (soft delete)
3. Verificar que no aparezca en:
   - Total de hilos
   - Hilos más populares
   - Estadísticas por categoría
   - Gráfico de actividad
   - Usuarios más activos
   - Panel de moderación

## Notas

- El filtro se aplica a nivel de base de datos (más eficiente)
- No requiere cambios en componentes frontend
- Compatible con paginación y ordenamiento
- Mantiene la integridad referencial con comentarios
