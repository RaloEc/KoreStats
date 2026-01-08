# Testing: Historial de Partidas - Scroll Infinito

## Checklist de Verificación

### ✅ Paso 1: Sincronización Inicial

1. Abre la página de historial de partidas
2. Haz click en el botón "Actualizar" / "Sincronizar"
3. **Esperado**:
   - Debe sincronizar 100 partidas (antes era 20)
   - Debe mostrar 40 partidas iniciales (antes era 20)
   - Debe completar en ~5-10 segundos
4. **Verificar en logs**: `[syncMatchHistory] ✅ Sincronización completada`

### ✅ Paso 2: Orden Correcto de Partidas

1. Después de sincronizar, verifica la primera partida
2. **Esperado**:
   - Primera partida = más reciente (hoy o ayer)
   - NO debe mostrar partidas de hace 398 días
   - Debe estar ordenada por `game_creation` DESC (más reciente primero)
3. **Verificar**: Compara fechas de partidas consecutivas (deben ir de reciente a antiguo)

### ✅ Paso 3: Scroll Infinito

1. Scrollea hacia el final de la lista
2. **Esperado**:
   - Debe cargar automáticamente más partidas
   - Debe cargar 40 partidas por página
   - Debe continuar cargando hasta que no haya más partidas
3. **Verificar en logs**:
   - `GET /api/riot/matches?limit=40&cursor=<number>`
   - Debe haber múltiples requests con cursores diferentes

### ✅ Paso 4: Cursor Correcto

1. Abre DevTools → Network
2. Scrollea para cargar más partidas
3. **Esperado**:
   - Primer request: `?limit=40` (sin cursor)
   - Segundo request: `?limit=40&cursor=1762493018011` (cursor = game_creation de última partida)
   - Cursor debe ser un número grande (timestamp en ms)
4. **NO debe ser**: `?limit=40&cursor=2025-02-27T...` (eso sería created_at)

### ✅ Paso 5: Filtros de Cola

1. Selecciona "Ranked SoloQ"
2. Scrollea y carga más partidas
3. **Esperado**:
   - Solo debe mostrar partidas de SoloQ (queue_id = 420)
   - Debe funcionar el scroll infinito con filtro
   - Cursor debe ser válido para el filtro seleccionado

### ✅ Paso 6: Performance

1. Sincroniza partidas
2. Scrollea rápidamente hasta el final
3. **Esperado**:
   - Debe ser fluido (sin lag)
   - Debe cargar páginas en <1 segundo
   - No debe haber errores en consola

## Logs Esperados

### Sincronización Exitosa

```
[syncMatchHistory] Iniciando sincronización para <puuid>
[syncMatchHistory] Región de ruteo: americas
[getMatchIds] Obteniendo 100 IDs de partidas...
[getMatchIds] ✅ Obtenidos 100 IDs de partidas
[syncMatchHistory] Verificando 100 partidas...
[syncMatchHistory] X partidas nuevas para descargar
[saveMatch] ✅ Partida <matchId> guardada exitosamente
[syncMatchHistory] ✅ Sincronización completada: X partidas nuevas
```

### Obtención de Historial

```
[getMatchHistory] Obteniendo historial para <puuid>
[getMatchHistory] Cursor: <number> (o null para primera página)
[getMatchHistory] Retornando X partidas, hasMore: true/false, nextCursor: <number>
```

### Errores a Evitar

```
❌ [getMatchHistory] Error: column match_participants.game_creation does not exist
❌ [getMatchCreationBoundary] Error: foreignTable is not valid
❌ Partidas de hace 398 días
❌ Solo 33 partidas en total
```

## Datos a Verificar en BD

### Tabla: match_participants

```sql
SELECT
  id,
  match_id,
  puuid,
  created_at,
  COUNT(*) OVER (PARTITION BY puuid) as total_for_player
FROM match_participants
WHERE puuid = '<tu_puuid>'
ORDER BY created_at DESC
LIMIT 10;
```

**Esperado**:

- `created_at` debe ser reciente (hoy, ayer)
- Debe haber muchos registros (100+)
- Ordenados por created_at DESC

### Tabla: matches

```sql
SELECT
  match_id,
  game_creation,
  game_duration,
  queue_id,
  created_at
FROM matches
WHERE match_id IN (
  SELECT DISTINCT match_id
  FROM match_participants
  WHERE puuid = '<tu_puuid>'
  ORDER BY created_at DESC
  LIMIT 10
)
ORDER BY game_creation DESC;
```

**Esperado**:

- `game_creation` debe ser reciente (timestamp en ms)
- `queue_id` debe ser válido (420=SoloQ, 440=Flex, etc)
- Ordenados por game_creation DESC

## Rollback (si algo falla)

Si necesitas revertir los cambios:

```bash
# Revertir cambios en código
git checkout src/lib/riot/matches.ts
git checkout src/app/api/riot/matches/route.ts
git checkout src/app/api/riot/matches/sync/route.ts
git checkout src/components/riot/MatchHistoryList.tsx

# Revertir migración SQL (opcional)
# Supabase Dashboard → SQL Editor → Ejecutar:
DROP INDEX IF EXISTS idx_match_participants_puuid_game_creation;
DROP INDEX IF EXISTS idx_matches_game_creation_desc;
DROP INDEX IF EXISTS idx_match_participants_match_id_puuid;
```

## Notas Importantes

- **game_creation**: Timestamp en milisegundos desde Riot (tiempo real de la partida)
- **created_at**: Timestamp de inserción en BD (cuando se guardó el registro)
- **Cursor**: Debe ser `game_creation` para paginación correcta
- **MATCHES_PER_PAGE**: Ahora 40 (antes 20) para llenar mejor el scroll
- **Sincronización**: Ahora 100 partidas (antes 20) para más historial disponible

## Contacto

Si encuentras problemas:

1. Revisa los logs en la consola del navegador (DevTools)
2. Revisa los logs del servidor (terminal donde corre Next.js)
3. Verifica la BD en Supabase Dashboard
4. Compara con los logs esperados arriba
