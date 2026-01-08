# Análisis: Optimización de Carga del Historial de Partidas

## Problema Identificado

**Tiempo de carga actual**: ~7 segundos para mostrar las primeras partidas

### Cuello de Botella Principal

El endpoint `/api/riot/matches` hace **2 queries secuenciales a la BD**:

```typescript
// Query 1: Obtener historial (con JOIN a match_participant_ranks)
const matchHistory = await getMatchHistory(riotAccount.puuid, {
  limit: 40,
  cursor,
  queueIds,
});

// Query 2: Obtener estadísticas agregadas (otra query completa)
const stats = await getPlayerStats(riotAccount.puuid, {
  limit,
  queueIds,
});
```

**Problema**: Las queries se ejecutan **secuencialmente**, no en paralelo.

### Desglose de Tiempos (Estimado)

```
1. getMatchHistory() → ~3-4s
   - SELECT match_participants + matches (JOIN)
   - SELECT match_participant_ranks (JOIN adicional)
   - Mapeo de datos en memoria

2. getPlayerStats() → ~2-3s
   - SELECT match_participants + matches (JOIN)
   - Cálculos de agregación

3. Renderizado en cliente → ~1-2s
   - React Query procesa datos
   - MatchCard renderiza 40 tarjetas
   - Lazy load de imágenes

Total: ~6-9 segundos
```

## Soluciones Propuestas

### Opción 1: ✅ Caché de Últimas 5 Partidas (RECOMENDADO)

**Ventaja**: Rápido, simple, máximo impacto visual

```
Primera carga:
1. Mostrar skeleton UI (inmediato)
2. Cargar últimas 5 partidas desde caché BD (50-100ms)
3. Mostrar tarjetas mientras carga el resto (percepción de velocidad)
4. Cargar 35 partidas restantes en background

Tiempo percibido: ~500ms (en lugar de 7s)
```

**Implementación**:

- Tabla: `match_history_cache` (últimas 5 partidas por usuario)
- TTL: 5 minutos
- Actualización: Cada vez que se sincroniza

### Opción 2: ✅ Parallelizar Queries (FÁCIL)

**Ventaja**: Reduce tiempo a ~4-5 segundos

```typescript
// Antes (secuencial)
const matchHistory = await getMatchHistory(...);
const stats = await getPlayerStats(...);

// Después (paralelo)
const [matchHistory, stats] = await Promise.all([
  getMatchHistory(...),
  getPlayerStats(...),
]);
```

**Impacto**: -40% tiempo de carga

### Opción 3: ✅ Lazy Load de Partidas (EXCELENTE UX)

**Ventaja**: Carga inicial muy rápida

```
1. Mostrar primeras 5 partidas (100ms)
2. Mostrar skeleton para las siguientes (mientras carga)
3. Cargar 35 partidas restantes en background
4. Infinite scroll para más partidas

Tiempo percibido: ~200-300ms
```

### Opción 4: ✅ Índices y Optimización de BD

**Ventaja**: Mejora todas las queries

```sql
-- Índice compuesto para getMatchHistory
CREATE INDEX idx_match_participants_puuid_created
  ON match_participants(puuid, created_at DESC);

-- Índice para getPlayerStats
CREATE INDEX idx_match_participants_puuid_win
  ON match_participants(puuid, win);
```

**Impacto**: -30% tiempo de query

### Opción 5: ✅ Precalcular Estadísticas

**Ventaja**: Stats instantáneos

```sql
-- Tabla materializada con estadísticas precalculadas
CREATE TABLE player_stats_cache (
  user_id UUID,
  puuid TEXT,
  total_games INT,
  wins INT,
  losses INT,
  winrate INT,
  avg_kda DECIMAL,
  avg_damage INT,
  avg_gold INT,
  updated_at TIMESTAMP,
  UNIQUE(puuid)
);
```

**Impacto**: Stats en <10ms (en lugar de 2-3s)

## Plan de Implementación (Recomendado)

### Fase 1: Rápido (30 minutos)

1. **Parallelizar queries** en `/api/riot/matches`
2. **Lazy load de partidas**: Mostrar primeras 5 inmediato
3. **Skeleton UI mejorado**: Mostrar mientras carga

**Impacto**: 7s → 1-2s

### Fase 2: Medio (1 hora)

1. **Caché de últimas 5 partidas** en BD
2. **Precalcular estadísticas** en tabla cache
3. **Índices optimizados** en BD

**Impacto**: 1-2s → 200-300ms

### Fase 3: Avanzado (2 horas)

1. **Infinite scroll optimizado**
2. **Virtual scrolling** para 100+ partidas
3. **Compresión de datos** en caché

**Impacto**: Scroll suave sin lag

## Implementación Detallada

### 1. Parallelizar Queries (Más Fácil)

```typescript
// Archivo: src/app/api/riot/matches/route.ts

// Antes
const matchHistory = await getMatchHistory(...);
const stats = await getPlayerStats(...);

// Después
const [matchHistory, stats] = await Promise.all([
  getMatchHistory(riotAccount.puuid, { limit, cursor, queueIds }),
  getPlayerStats(riotAccount.puuid, { limit, queueIds }),
]);
```

**Tiempo**: 5 minutos de cambio

### 2. Lazy Load de Partidas

```typescript
// Archivo: src/components/riot/MatchHistoryList.tsx

// Mostrar primeras 5 partidas inmediatamente
const INITIAL_LOAD = 5;
const MATCHES_PER_PAGE = 40;

// Primera query: solo 5 partidas
const { data: initialMatches } = useInfiniteQuery({
  queryFn: async ({ pageParam }) => {
    const limit = pageParam === null ? INITIAL_LOAD : MATCHES_PER_PAGE;
    return fetch(`/api/riot/matches?limit=${limit}&cursor=${pageParam}`);
  },
});

// Cargar más en background después de 2 segundos
useEffect(() => {
  const timer = setTimeout(() => {
    if (hasNextPage) fetchNextPage();
  }, 2000);
  return () => clearTimeout(timer);
}, []);
```

**Tiempo**: 15 minutos de cambio

### 3. Caché de Últimas 5 Partidas

```sql
-- Migración: 20250228000001_create_match_history_cache.sql

CREATE TABLE match_history_cache (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  puuid TEXT NOT NULL,
  match_data JSONB NOT NULL, -- Datos completos de la partida
  rank INT NOT NULL, -- 1-5 (posición en el ranking)
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes'),

  UNIQUE(user_id, puuid, rank)
);

CREATE INDEX idx_match_cache_user_puuid
  ON match_history_cache(user_id, puuid);

ALTER TABLE match_history_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own match cache"
  ON match_history_cache FOR SELECT
  USING (auth.uid() = user_id);
```

**Tiempo**: 30 minutos de cambio

### 4. Precalcular Estadísticas

```sql
-- Migración: 20250228000002_create_player_stats_cache.sql

CREATE TABLE player_stats_cache (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  puuid TEXT NOT NULL UNIQUE,
  total_games INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  winrate INT DEFAULT 0,
  avg_kda DECIMAL(4,2) DEFAULT 0,
  avg_damage INT DEFAULT 0,
  avg_gold INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(puuid)
);

CREATE INDEX idx_player_stats_user_id
  ON player_stats_cache(user_id);

ALTER TABLE player_stats_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stats"
  ON player_stats_cache FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger para actualizar automáticamente
CREATE OR REPLACE FUNCTION update_player_stats_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular estadísticas cuando se inserta una partida
  UPDATE player_stats_cache
  SET
    total_games = (SELECT COUNT(*) FROM match_participants WHERE puuid = NEW.puuid),
    wins = (SELECT COUNT(*) FROM match_participants WHERE puuid = NEW.puuid AND win = true),
    updated_at = NOW()
  WHERE puuid = NEW.puuid;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_stats
AFTER INSERT ON match_participants
FOR EACH ROW
EXECUTE FUNCTION update_player_stats_cache();
```

**Tiempo**: 45 minutos de cambio

### 5. Índices Optimizados

```sql
-- Migración: 20250228000003_optimize_match_queries.sql

-- Índice para getMatchHistory (búsqueda por PUUID + ordenamiento)
CREATE INDEX IF NOT EXISTS idx_match_participants_puuid_game_creation
  ON match_participants(puuid, created_at DESC)
  INCLUDE (champion_id, win, kda);

-- Índice para getPlayerStats (búsqueda por PUUID + filtro de victoria)
CREATE INDEX IF NOT EXISTS idx_match_participants_puuid_win
  ON match_participants(puuid, win)
  INCLUDE (kda, total_damage_dealt, gold_earned);

-- Índice para match_participant_ranks (JOIN rápido)
CREATE INDEX IF NOT EXISTS idx_match_participant_ranks_match_summoner
  ON match_participant_ranks(match_id, summoner_id)
  INCLUDE (tier, rank, league_points);

-- Analizar tablas para optimizar query planner
ANALYZE match_participants;
ANALYZE match_participant_ranks;
ANALYZE matches;
```

**Tiempo**: 10 minutos de cambio

## Comparativa de Soluciones

| Solución             | Tiempo Implementación | Impacto       | Complejidad | Recomendación |
| -------------------- | --------------------- | ------------- | ----------- | ------------- |
| Parallelizar queries | 5 min                 | 7s → 4-5s     | Muy baja    | ✅ PRIMERO    |
| Lazy load            | 15 min                | 4-5s → 1-2s   | Baja        | ✅ SEGUNDO    |
| Caché últimas 5      | 30 min                | 1-2s → 500ms  | Media       | ✅ TERCERO    |
| Precalcular stats    | 45 min                | 500ms → 200ms | Media       | ✅ CUARTO     |
| Índices BD           | 10 min                | -30% queries  | Muy baja    | ✅ PARALELO   |

## Orden de Implementación Recomendado

```
1. Parallelizar queries (5 min) → 7s a 4-5s
2. Agregar índices (10 min) → 4-5s a 3-4s
3. Lazy load (15 min) → 3-4s a 1-2s
4. Caché últimas 5 (30 min) → 1-2s a 500ms
5. Precalcular stats (45 min) → 500ms a 200ms

Total: ~2 horas para máxima optimización
```

## Resultados Esperados

### Antes

```
Primera carga: 7 segundos
- Skeleton UI: 0-1s
- Espera de datos: 6-7s
- Renderizado: 1s
```

### Después (Fase 1)

```
Primera carga: 2-3 segundos
- Skeleton UI: 0-1s
- Primeras 5 partidas: 1-2s
- Renderizado: 0.5s
```

### Después (Fase 2)

```
Primera carga: 500-700ms
- Skeleton UI: 0-1s
- Primeras 5 partidas (caché): 50-100ms
- Renderizado: 0.5s
```

### Después (Fase 3)

```
Primera carga: 200-300ms
- Skeleton UI: 0-1s
- Primeras 5 partidas (caché): 50-100ms
- Stats precalculadas: <10ms
- Renderizado: 0.5s
```

## Notas Importantes

1. **Caché de 5 partidas**: Sí, es una buena opción. Proporciona máximo impacto visual.
2. **Parallelizar queries**: Debe hacerse primero. Es trivial y da -40% tiempo.
3. **Índices**: Críticos para performance. Deben aplicarse antes de caché.
4. **Stats precalculadas**: Opcional pero recomendado para máxima velocidad.
5. **Lazy load**: Excelente para UX. Hace que parezca que carga instantáneamente.

## Próximos Pasos

1. Implementar parallelización de queries
2. Agregar índices a BD
3. Crear caché de últimas 5 partidas
4. Implementar lazy load en componente
5. Precalcular estadísticas
