# Testing: Optimización de Tarjeta LoL

## Verificación Rápida en Navegador

### 1. Skeleton UI

```
✅ Ir a /perfil
✅ Esperar a que cargue la tarjeta LoL
✅ Verificar que muestra skeleton animado (no "No hay cuenta")
✅ Skeleton debe desaparecer cuando carguen los datos
```

### 2. Caché en React Query

```
✅ Abrir DevTools → Network
✅ Ir a /perfil (primera carga)
✅ Verificar llamadas:
   - GET /api/riot/account (BD) → ~100ms
   - GET /api/riot/champion-mastery (Riot API) → ~500ms
✅ Recargar página (Cmd+R)
✅ Verificar que las llamadas son más rápidas
✅ Abrir DevTools → Application → Cache Storage
✅ Verificar que React Query cachea los datos
```

### 3. Caché en BD

```
✅ Ir a /perfil (primera carga)
✅ Abrir DevTools → Console
✅ Buscar logs: "[GET /api/riot/champion-mastery] source: riot-api"
✅ Esperar 1-2 segundos
✅ Recargar página
✅ Buscar logs: "[GET /api/riot/champion-mastery] source: cache"
✅ Verificar que el tiempo de respuesta es < 100ms
```

### 4. Splash Art

```
✅ Ir a /perfil
✅ Verificar que el splash art del campeón se carga
✅ No debe bloquear la tarjeta (carga en paralelo)
✅ Verificar en DevTools → Network que la imagen se descarga con priority=false
```

## Verificación en Supabase Dashboard

### 1. Tabla de Caché Creada

```sql
-- Ir a Supabase Dashboard → SQL Editor
SELECT * FROM champion_mastery_cache LIMIT 5;

-- Debe retornar registros después de cargar /perfil
-- Columnas: user_id, puuid, champion_id, mastery_level, etc.
```

### 2. RLS Funcionando

```sql
-- Conectarse como usuario A
SELECT * FROM champion_mastery_cache;
-- Debe ver solo su propio caché

-- Conectarse como usuario B
SELECT * FROM champion_mastery_cache;
-- Debe ver solo su propio caché (no el de usuario A)
```

### 3. Expiración de Caché

```sql
-- Ver registros con expiración próxima
SELECT user_id, expires_at, NOW() as ahora
FROM champion_mastery_cache
WHERE expires_at < NOW() + INTERVAL '5 minutes'
ORDER BY expires_at DESC;

-- Después de 30 minutos, los registros deben expirar
-- (se pueden limpiar manualmente con cleanup_expired_mastery_cache())
```

## Métricas de Performance

### Antes (Sin Optimizaciones)

```
Primera carga:
- RiotAccountCard: 100ms (BD)
- RiotAccountCardVisual: 500ms (Riot API)
- ChampionCenteredSplash: 800ms (imagen)
- Total: ~2-3 segundos

Cargas posteriores:
- Igual: ~2-3 segundos (sin caché)
```

### Después (Con Optimizaciones)

```
Primera carga:
- RiotAccountCard: 100ms (BD, caché React Query)
- RiotAccountCardVisual: 500ms (Riot API, caché en BD)
- ChampionCenteredSplash: 800ms (imagen, lazy load)
- Total: ~1-1.5 segundos

Cargas posteriores:
- RiotAccountCard: 0ms (caché React Query)
- RiotAccountCardVisual: 50ms (caché BD)
- ChampionCenteredSplash: 800ms (imagen, lazy load)
- Total: ~200-300 ms
```

## Debugging

### Logs Esperados

**Primera carga**:

```
[RiotAccountCard] Fetching Riot account for user ...
[RiotAccountCard] Riot account payload ...
[RiotAccountCardVisual] Fetching mastery...
[GET /api/riot/champion-mastery] Fetching from Riot API: ...
[GET /api/riot/champion-mastery] ✅ Datos obtenidos de Riot API: 3 campeones
[GET /api/riot/champion-mastery] ✅ Caché actualizado: 3 registros
```

**Cargas posteriores**:

```
[RiotAccountCard] Fetching Riot account for user ... (desde caché React Query)
[RiotAccountCard] Riot account payload ...
[RiotAccountCardVisual] Fetching mastery... (desde caché React Query)
[GET /api/riot/champion-mastery] ✅ Datos obtenidos del caché: 3 campeones
```

### Limpiar Caché Manualmente

```sql
-- Limpiar todo el caché de un usuario
DELETE FROM champion_mastery_cache
WHERE user_id = 'your-user-id';

-- Limpiar caché expirado
SELECT cleanup_expired_mastery_cache();

-- Limpiar caché de un PUUID específico
DELETE FROM champion_mastery_cache
WHERE puuid = 'your-puuid';
```

### Verificar Caché en BD

```sql
-- Ver caché de un usuario
SELECT
  user_id,
  puuid,
  champion_id,
  mastery_level,
  mastery_points,
  rank_position,
  cached_at,
  expires_at,
  NOW() as ahora,
  (expires_at - NOW()) as tiempo_restante
FROM champion_mastery_cache
WHERE user_id = 'your-user-id'
ORDER BY rank_position;

-- Ver estadísticas de caché
SELECT
  COUNT(*) as total_registros,
  COUNT(DISTINCT user_id) as usuarios_unicos,
  COUNT(DISTINCT puuid) as puuids_unicos,
  MIN(cached_at) as primer_cache,
  MAX(cached_at) as ultimo_cache
FROM champion_mastery_cache;
```

## Casos de Prueba

### Caso 1: Primer acceso a /perfil

```
1. Limpiar caché de navegador (DevTools → Application → Clear Storage)
2. Limpiar caché de BD:
   DELETE FROM champion_mastery_cache WHERE user_id = 'your-id';
3. Ir a /perfil
4. Verificar:
   - Skeleton se muestra
   - Datos cargan en ~1-1.5s
   - Logs muestran "source: riot-api"
   - Caché se inserta en BD
```

### Caso 2: Recarga rápida

```
1. Ir a /perfil (primera carga)
2. Esperar a que cargue completamente
3. Recargar página (Cmd+R)
4. Verificar:
   - Skeleton se muestra
   - Datos cargan en ~200-300ms
   - Logs muestran "source: cache"
   - No hay llamadas a Riot API
```

### Caso 3: Expiración de caché

```
1. Ir a /perfil
2. Esperar 30 minutos
3. Recargar página
4. Verificar:
   - Logs muestran "source: riot-api" (caché expirado)
   - Nuevos datos se cachean en BD
```

### Caso 4: Múltiples usuarios

```
1. Usuario A: Ir a /perfil
2. Verificar que caché de A está en BD
3. Usuario B: Ir a /perfil
4. Verificar que caché de B está en BD
5. Verificar que A no puede ver caché de B (RLS)
```

## Checklist de Validación

- [ ] Skeleton UI se muestra mientras carga
- [ ] Datos cargan más rápido (< 1.5s primera carga)
- [ ] Cargas posteriores son muy rápidas (< 300ms)
- [ ] Tabla `champion_mastery_cache` existe en BD
- [ ] Caché se inserta correctamente en BD
- [ ] RLS protege datos de otros usuarios
- [ ] Logs muestran "source: cache" en cargas posteriores
- [ ] Splash art carga sin bloquear
- [ ] No hay errores en console
- [ ] Responsive en mobile
- [ ] Funciona con diferentes campeones
- [ ] Caché expira después de 30 minutos

## Notas

- El caché de React Query es en memoria (se pierde al cerrar navegador)
- El caché en BD es persistente (se mantiene entre sesiones)
- La combinación de ambos proporciona máxima velocidad
- Los logs están prefijados con `[RiotAccountCard]`, `[RiotAccountCardVisual]`, `[GET /api/riot/champion-mastery]`
