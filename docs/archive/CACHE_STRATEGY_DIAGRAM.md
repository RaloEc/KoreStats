# Diagrama de Flujo: Estrategia de Caché para Rankings

## Flujo General de Sincronización

```
┌─────────────────────────────────────────────────────────────────┐
│ Usuario hace clic en "Actualizar" (botón en MatchHistoryList)  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/riot/matches/sync                                     │
│ - Obtiene userId del header                                     │
│ - Obtiene PUUID de linked_accounts_riot                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ syncMatchHistory(puuid, region, apiKey, count=20)              │
│ - Obtiene últimos 20 IDs de partidas desde Riot API            │
│ - Filtra partidas que ya existen en BD                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Para cada partida nueva:                                        │
│ - getMatchDetails(matchId) desde Riot API                      │
│ - saveMatch(matchData)                                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │ saveMatch(matchData)                │
        └────────────┬───────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    ┌────────────┐          ┌──────────────┐
    │ Inserta en │          │ Inserta en   │
    │  matches   │          │ match_       │
    │            │          │ participants │
    └────────────┘          └──────────────┘
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │ Para cada participante:            │
        │ getOrUpdateSummonerRank(puuid)    │
        └────────────┬───────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ Intenta obtener  │    │ Si NO existe o   │
    │ del caché        │    │ está expirado:   │
    │ (summoners)      │    │ Consulta Riot    │
    │                  │    │ API (League-V4)  │
    │ ¿Existe y es     │    │                  │
    │ fresco (<1h)?    │    │ Actualiza caché  │
    │                  │    │ en summoners     │
    │ SÍ → Devuelve    │    │ (UPSERT)         │
    │ datos en caché   │    │                  │
    └──────────────────┘    └──────────────────┘
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │ Retorna:                           │
        │ {                                  │
        │   tier: "GOLD",                    │
        │   rank: "II",                      │
        │   league_points: 75,               │
        │   wins: 45,                        │
        │   losses: 32                       │
        │ }                                  │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │ Construye rankSnapshot:            │
        │ {                                  │
        │   match_id: "LA1_abc123",          │
        │   puuid: "...",                    │
        │   summoner_id: "...",              │
        │   tier: "GOLD",                    │
        │   rank: "II",                      │
        │   league_points: 75,               │
        │   wins: 45,                        │
        │   losses: 32                       │
        │ }                                  │
        └────────────┬───────────────────────┘
                     │
        (Repite para cada participante)
                     │
                     ▼
        ┌────────────────────────────────────┐
        │ Inserta en                         │
        │ match_participant_ranks            │
        │ (10 snapshots con datos completos) │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │ ✅ Partida guardada exitosamente   │
        │ - matches: 1 fila                  │
        │ - match_participants: 10 filas     │
        │ - match_participant_ranks: 10 filas│
        │   (CON DATOS COMPLETOS)            │
        └────────────────────────────────────┘
```

---

## Comparación: Sin Caché vs Con Caché

### SIN CACHÉ (Antes)

```
saveMatch()
├─ Inserta en matches ✓
├─ Inserta en match_participants ✓
├─ Inserta en match_participant_ranks (VACÍOS) ✗
│  └─ tier: null
│  └─ rank: null
│  └─ league_points: 0
│  └─ wins: 0
│  └─ losses: 0
│
└─ updateMatchRankings() en BACKGROUND (async)
   ├─ Para cada participante:
   │  ├─ Consulta Riot API (League-V4) ← LENTO
   │  ├─ UPDATE match_participant_ranks
   │  └─ Delay 500ms
   │
   └─ ⚠️ Operación impredecible
      - Puede fallar silenciosamente
      - Rate limits causan retrasos
      - Datos inconsistentes temporalmente
```

**Problemas:**

- ❌ match_participant_ranks vacío inicialmente
- ❌ Operaciones en background (impredecible)
- ❌ ~10 llamadas a Riot API por partida
- ❌ Rate limits causan esperas largas

---

### CON CACHÉ (Después)

```
saveMatch()
├─ Inserta en matches ✓
├─ Inserta en match_participants ✓
│
├─ Para cada participante:
│  └─ getOrUpdateSummonerRank(puuid)
│     ├─ ¿Existe en summoners?
│     │  ├─ SÍ y fresco (<1h)
│     │  │  └─ Devuelve datos en caché ← RÁPIDO (10ms)
│     │  │
│     │  └─ NO o expirado
│     │     ├─ Consulta Riot API ← LENTO (500-1000ms)
│     │     ├─ UPSERT en summoners (caché)
│     │     └─ Devuelve datos
│     │
│     └─ Delay 100ms
│
├─ Inserta en match_participant_ranks (COMPLETOS) ✓
│  └─ tier: "GOLD"
│  └─ rank: "II"
│  └─ league_points: 75
│  └─ wins: 45
│  └─ losses: 32
│
└─ ✅ Partida guardada exitosamente
   - Sincrónico y predecible
   - Datos completos desde el inicio
   - ~80% menos llamadas a Riot API
```

**Ventajas:**

- ✅ match_participant_ranks completo desde el inicio
- ✅ Sincrónico (predecible)
- ✅ ~1-2 llamadas a Riot API por partida (caché)
- ✅ ~80% menos presión en API

---

## Estadísticas de Caché

### Escenario: Sincronizar 20 partidas de 1 jugador

**SIN CACHÉ:**

```
Partida 1: 10 jugadores × 1 llamada = 10 llamadas a Riot
Partida 2: 10 jugadores × 1 llamada = 10 llamadas a Riot
...
Partida 20: 10 jugadores × 1 llamada = 10 llamadas a Riot
─────────────────────────────────────────────────────
TOTAL: 200 llamadas a Riot API
Tiempo: ~200 × 1s = 200 segundos = 3+ minutos
```

**CON CACHÉ (después de 1ª partida):**

```
Partida 1: 10 jugadores × 1 llamada = 10 llamadas a Riot (nuevos)
Partida 2: 10 jugadores × 0 llamadas = 0 llamadas (caché fresco)
Partida 3: 10 jugadores × 0 llamadas = 0 llamadas (caché fresco)
...
Partida 20: 10 jugadores × 0 llamadas = 0 llamadas (caché fresco)
─────────────────────────────────────────────────────
TOTAL: 10 llamadas a Riot API (solo 1ª partida)
Tiempo: ~10 × 1s + 19 × 0.1s = ~12 segundos
AHORRO: 95% de llamadas, 94% más rápido
```

---

## Tabla de Decisión: ¿Usar Caché o Riot API?

```
┌─────────────────────────────────────────────────────────────┐
│ getOrUpdateSummonerRank(puuid)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    ¿Existe en              ¿Existe en
    summoners?              summoners?
        │                         │
       NO                        SÍ
        │                         │
        ▼                         ▼
    Consulta          ¿Fresco (<1h)?
    Riot API              │
        │         ┌───────┴────────┐
        │         │                │
        │        SÍ               NO
        │         │                │
        │         ▼                ▼
        │    Devuelve      Consulta
        │    caché         Riot API
        │         │                │
        └─────────┴────────────────┘
                  │
                  ▼
          ┌──────────────────┐
          │ UPSERT en        │
          │ summoners        │
          │ (actualiza caché)│
          └──────────────────┘
                  │
                  ▼
          ┌──────────────────┐
          │ Devuelve datos   │
          │ de ranking       │
          └──────────────────┘
```

---

## Índices en Tabla `summoners`

```
┌─────────────────────────────────────────────────────────────┐
│ Tabla: summoners                                            │
├─────────────────────────────────────────────────────────────┤
│ Columnas:                                                   │
│ - id (UUID, PK)                                             │
│ - puuid (VARCHAR, UNIQUE) ← Búsqueda principal             │
│ - summoner_id (VARCHAR)                                     │
│ - tier (VARCHAR) ← Filtrado por rango                      │
│ - rank (VARCHAR)                                            │
│ - league_points (INTEGER)                                   │
│ - wins (INTEGER)                                            │
│ - losses (INTEGER)                                          │
│ - rank_updated_at (TIMESTAMP) ← Identificar caché expirado │
│ - created_at (TIMESTAMP)                                    │
│ - updated_at (TIMESTAMP)                                    │
├─────────────────────────────────────────────────────────────┤
│ Índices:                                                    │
│ 1. idx_summoners_puuid                                      │
│    └─ Búsqueda rápida: SELECT * WHERE puuid = '...'       │
│                                                             │
│ 2. idx_summoners_tier                                       │
│    └─ Filtrado por rango: SELECT * WHERE tier = 'GOLD'    │
│                                                             │
│ 3. idx_summoners_rank_updated_at                            │
│    └─ Caché expirado: SELECT * WHERE rank_updated_at < ... │
│                                                             │
│ 4. idx_summoners_puuid_rank_updated (COMPUESTO)            │
│    └─ Búsqueda de caché fresco:                            │
│       SELECT * WHERE puuid = '...' AND rank_updated_at > ..│
└─────────────────────────────────────────────────────────────┘
```

---

## Logs Esperados

### Primera Sincronización (Caché Vacío)

```
[syncMatchHistory] Iniciando sincronización para puuid123...
[getMatchIds] Obtenidos 20 IDs de partidas
[getMatchDetails] Descargando partida LA1_match001...
[saveMatch] Obteniendo rankings desde caché para LA1_match001...
[getOrUpdateSummonerRank] Consultando Riot API para puuid_player1...
[getOrUpdateSummonerRank] ✅ Caché actualizado para puuid_player1...: GOLD II
[getOrUpdateSummonerRank] Consultando Riot API para puuid_player2...
[getOrUpdateSummonerRank] ✅ Caché actualizado para puuid_player2...: SILVER IV
... (8 más)
[saveMatch] ✅ 10 snapshots de ranking guardados
[saveMatch] ✅ Partida LA1_match001 guardada exitosamente
[getMatchDetails] Descargando partida LA1_match002...
[saveMatch] Obteniendo rankings desde caché para LA1_match002...
[getOrUpdateSummonerRank] Usando caché para puuid_player1...: GOLD II
[getOrUpdateSummonerRank] Usando caché para puuid_player2...: SILVER IV
... (8 más, todos desde caché)
[saveMatch] ✅ 10 snapshots de ranking guardados
[saveMatch] ✅ Partida LA1_match002 guardada exitosamente
... (18 más)
[syncMatchHistory] ✅ Sincronización completada: 20 partidas nuevas
```

### Estadísticas

```
Total de partidas: 20
Jugadores únicos: ~50 (estimado)
Llamadas a Riot API: ~50 (solo nuevos jugadores)
Llamadas desde caché: ~150 (jugadores repetidos)
Tasa de hit de caché: ~75%
Tiempo total: ~60 segundos (vs ~200 sin caché)
```

---

## Monitoreo en Producción

### Queries Útiles

```sql
-- Ver caché de jugador específico
SELECT * FROM summoners
WHERE puuid = 'puuid_target'
ORDER BY rank_updated_at DESC;

-- Ver caché expirado (> 1 hora)
SELECT COUNT(*) as expired_cache
FROM summoners
WHERE rank_updated_at < NOW() - INTERVAL '1 hour';

-- Ver caché fresco (< 1 hora)
SELECT COUNT(*) as fresh_cache
FROM summoners
WHERE rank_updated_at > NOW() - INTERVAL '1 hour';

-- Estadísticas de caché
SELECT
  COUNT(*) as total_summoners,
  COUNT(CASE WHEN rank_updated_at > NOW() - INTERVAL '1 hour' THEN 1 END) as fresh,
  COUNT(CASE WHEN rank_updated_at IS NULL THEN 1 END) as never_cached,
  ROUND(100.0 * COUNT(CASE WHEN rank_updated_at > NOW() - INTERVAL '1 hour' THEN 1 END) / COUNT(*), 2) as cache_hit_rate
FROM summoners;

-- Ver snapshots de partida
SELECT * FROM match_participant_ranks
WHERE match_id = 'LA1_match_target'
ORDER BY tier DESC, league_points DESC;

-- Verificar que no hay snapshots vacíos
SELECT COUNT(*) as empty_ranks
FROM match_participant_ranks
WHERE tier IS NULL OR rank IS NULL;
```

---

## Conclusión

La estrategia de caché reduce significativamente la carga en Riot API mientras mantiene datos completos e históricos en la base de datos. El flujo es predecible, sincrónico y escalable.
