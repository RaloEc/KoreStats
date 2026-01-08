# Fix: Ordenamiento por game_creation (Tiempo Real de Partida)

## Problema

El historial mostraba partidas de hace 400 días como más recientes, aunque la última partida fue hace 1 hora.

## Causa Raíz

Había dos problemas de ordenamiento:

### 1. `getMatchCreationBoundary()` ordenaba por `created_at`

```typescript
// ANTES (INCORRECTO)
.order("created_at", { ascending })

// DESPUÉS (CORRECTO)
.order("game_creation", { foreignTable: "matches", ascending })
```

**Impacto**:

- Obtenía la partida más recientemente GUARDADA en BD (created_at)
- No la más reciente JUGADA (game_creation)
- Cuando sincronizabas partidas antiguas (backfill), se guardaban con created_at reciente pero game_creation antiguo
- Esto causaba que `getLatestMatchCreation()` retornara un timestamp antiguo
- Luego sincronizaba desde ese punto antiguo, mostrando partidas viejas primero

### 2. Datos Inconsistentes en BD

```
Partida: LA1_1566388583
- game_creation: 1729576479508 (22 Oct 2024 - hace 401 días)
- created_at: 2025-11-27 09:00:18 (hoy - cuando se descargó del backfill)
```

## Solución

Cambiar `getMatchCreationBoundary()` para ordenar por `game_creation` en lugar de `created_at`.

Esto asegura que:

- ✅ Obtiene la partida más reciente JUGADA (no guardada)
- ✅ El cursor de sincronización es correcto
- ✅ Las partidas se muestran en orden correcto (más recientes primero)
- ✅ El backfill de partidas antiguas no interfiere

## Flujo Correcto

```
1. Usuario sincroniza
   ↓
2. getLatestMatchCreation() obtiene la partida más reciente JUGADA
   - Ordena por game_creation DESC
   - Retorna timestamp de la partida más reciente
   ↓
3. syncMatchHistory() sincroniza desde ese punto
   - Solo descarga partidas más recientes que ese timestamp
   - No re-descarga partidas antiguas
   ↓
4. getMatchHistory() obtiene historial
   - Ordena por game_creation DESC (más reciente primero)
   - Filtra por cursor (game_creation < cursor)
   - Retorna partidas en orden correcto
```

## Archivos Modificados

- `src/lib/riot/matches.ts` - Línea 247-249: Cambiar ordenamiento en `getMatchCreationBoundary()`

## Verificación en BD

```sql
-- Antes (incorrecto)
SELECT * FROM match_participants
WHERE puuid = '...'
ORDER BY created_at DESC
LIMIT 1;
-- Retorna: Partida de hace 401 días (guardada hoy)

-- Después (correcto)
SELECT * FROM match_participants
WHERE puuid = '...'
ORDER BY game_creation DESC (con foreignTable: "matches")
LIMIT 1;
-- Retorna: Partida de hace 1 hora (jugada hace 1 hora)
```

## Diferencia: game_creation vs created_at

| Campo           | Significado                         | Fuente   | Uso                                      |
| --------------- | ----------------------------------- | -------- | ---------------------------------------- |
| `game_creation` | Timestamp cuando se jugó la partida | Riot API | Ordenamiento, paginación, sincronización |
| `created_at`    | Timestamp cuando se guardó en BD    | Sistema  | Auditoría, debugging                     |

**Regla**: Siempre usa `game_creation` para lógica de negocio relacionada con partidas.
