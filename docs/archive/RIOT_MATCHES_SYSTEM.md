# Sistema de Almacenamiento de Partidas de Riot Games

## 📋 Descripción General

Sistema completo para descargar, almacenar y mostrar el historial de partidas de League of Legends. Utiliza la API Match-V5 de Riot Games y almacena los datos en Supabase para evitar solicitudes repetidas.

## 🗄️ Estructura de Base de Datos

### Tabla: matches

Almacena información general de cada partida.

```sql
CREATE TABLE matches (
  match_id VARCHAR(255) PRIMARY KEY,
  data_version VARCHAR(50),
  game_creation BIGINT,
  game_duration INTEGER,
  game_mode VARCHAR(50),
  queue_id INTEGER,
  full_json JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Campos:**

- `match_id` - ID único de la partida (ej: 'LA1_123456')
- `data_version` - Versión de datos de Riot
- `game_creation` - Timestamp de creación (milisegundos)
- `game_duration` - Duración en segundos
- `game_mode` - Modo de juego (CLASSIC, ARAM, etc.)
- `queue_id` - ID de cola (420=Ranked Solo, 440=Flex, 450=ARAM)
- `full_json` - Objeto JSON completo para análisis futuro
- `created_at` - Cuándo se guardó en BD
- `updated_at` - Última actualización

### Tabla: match_participants

Almacena rendimiento individual de cada jugador en cada partida.

```sql
CREATE TABLE match_participants (
  id UUID PRIMARY KEY,
  match_id VARCHAR(255) REFERENCES matches,
  puuid VARCHAR(255),
  summoner_name VARCHAR(255),
  champion_id INTEGER,
  champion_name VARCHAR(255),
  win BOOLEAN,
  kills INTEGER,
  deaths INTEGER,
  assists INTEGER,
  kda DECIMAL,
  total_damage_dealt INTEGER,
  gold_earned INTEGER,
  vision_score INTEGER,
  item0 INTEGER,
  item1 INTEGER,
  item2 INTEGER,
  item3 INTEGER,
  item4 INTEGER,
  item5 INTEGER,
  item6 INTEGER,
  perk_primary_style INTEGER,
  perk_sub_style INTEGER,
  lane VARCHAR(50),
  role VARCHAR(50),
  created_at TIMESTAMP
);
```

**Índices Optimizados:**

- `idx_match_participants_puuid_match_id` - Búsqueda rápida por jugador
- `idx_match_participants_puuid_created` - Historial ordenado por fecha

---

## 🔄 Flujo de Sincronización

### Paso 1: Obtener IDs de Partidas

```
GET https://{routingRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count=20
```

Retorna array de IDs de partidas recientes.

### Paso 2: Filtrar Partidas Existentes

```
SELECT match_id FROM matches WHERE match_id IN (...)
```

Solo descargamos partidas que NO existan en BD.

### Paso 3: Descargar Detalles

```
GET https://{routingRegion}.api.riotgames.com/lol/match/v5/matches/{matchId}
```

Obtiene datos completos de cada partida.

### Paso 4: Guardar en BD

```
INSERT INTO matches (...)
INSERT INTO match_participants (...)
```

Guarda información general y participantes.

---

## 🌍 Mapeo de Regiones

La API Match-V5 requiere **regiones de ruteo**, no regiones de plataforma.

```typescript
function getRoutingRegion(platformRegion: string): string {
  // Americas
  if (["la1", "la2", "na1", "br1"].includes(region)) return "americas";

  // Europe
  if (["euw1", "eune1", "tr1", "ru"].includes(region)) return "europe";

  // Asia
  if (["kr", "jp1"].includes(region)) return "asia";
}
```

**Mapeo:**
| Plataforma | Región de Ruteo |
|-----------|-----------------|
| LA1, LA2, NA1, BR1 | americas |
| EUW1, EUNE1, TR1, RU | europe |
| KR, JP1 | asia |

---

## 📡 Funciones Principales

### syncMatchHistory(puuid, platformRegion, apiKey, count)

Sincroniza el historial de partidas de un jugador.

```typescript
const result = await syncMatchHistory(
  'PUUID-123',
  'la1',
  'RIOT-API-KEY',
  20
);

// Retorna:
{
  success: true,
  newMatches: 5,
  totalMatches: 20
}
```

**Parámetros:**

- `puuid` - PUUID del jugador
- `platformRegion` - Región de plataforma (ej: 'la1')
- `apiKey` - API Key de Riot
- `count` - Número de partidas a sincronizar (default: 20)

**Retorna:**

- `success` - Éxito de la operación
- `newMatches` - Número de partidas nuevas guardadas
- `totalMatches` - Total de partidas procesadas
- `error` - Mensaje de error si falla

### getMatchHistory(puuid, limit)

Obtiene el historial de partidas desde BD.

```typescript
const matches = await getMatchHistory("PUUID-123", 10);

// Retorna array de partidas con información del jugador
```

### getPlayerStats(puuid, limit)

Obtiene estadísticas agregadas de un jugador.

```typescript
const stats = await getPlayerStats('PUUID-123', 20);

// Retorna:
{
  totalGames: 20,
  wins: 12,
  losses: 8,
  winrate: 60,
  avgKda: 2.5,
  avgDamage: 15000,
  avgGold: 8500
}
```

---

## 🎯 API Endpoints

### GET /api/riot/matches

Obtiene el historial de partidas del usuario autenticado.

**Headers:**

```
x-user-id: {userId}
```

**Query Parameters:**

```
?limit=10
```

**Respuesta:**

```json
{
  "success": true,
  "matches": [...],
  "stats": {
    "totalGames": 20,
    "wins": 12,
    "losses": 8,
    "winrate": 60,
    "avgKda": 2.5,
    "avgDamage": 15000,
    "avgGold": 8500
  }
}
```

### POST /api/riot/matches/sync

Sincroniza partidas nuevas desde Riot API.

**Headers:**

```
x-user-id: {userId}
```

**Respuesta:**

```json
{
  "success": true,
  "message": "5 partidas nuevas sincronizadas",
  "newMatches": 5,
  "totalMatches": 20,
  "matches": [...],
  "stats": {...}
}
```

---

## 📱 Componente React: MatchHistoryList

Muestra el historial de partidas de forma visual.

```tsx
import { MatchHistoryList } from "@/components/riot/MatchHistoryList";

<MatchHistoryList />;
```

**Características:**

- Lista de tarjetas verticales
- Información de campeón (imagen + nivel)
- KDA (Kills/Deaths/Assists)
- Objetos equipados
- Estadísticas (daño, oro, visión)
- Tipo de juego y duración
- Tiempo relativo (hace 2 horas)
- Borde de color: Verde (victoria) / Rojo (derrota)
- Botón para sincronizar manualmente

### Estructura de Tarjeta

```
┌──────────────────────────────────────────────────────────┐
│ [CAMPEÓN] │ VICTORIA │ 5/2/10 │ [ITEMS] │ Ranked Solo   │
│ Nivel 18  │ KDA 2.5  │        │ [ITEMS] │ 35:42         │
│           │          │        │ [ITEMS] │ Hace 2 horas  │
│           │ Daño: 15k│        │         │               │
│           │ Oro: 8.5k│        │         │               │
└──────────────────────────────────────────────────────────┘
```

---

## 🖼️ Imágenes desde DataDragon

### Campeones

```
https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-tiles/{championId}/tile.jpg
```

### Objetos

```
https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/items/{itemId}/icon.png
```

---

## 🔒 Seguridad

**RLS (Row Level Security):**

- Lectura pública permitida (sin restricciones)
- Inserción/actualización solo por service role

**Autenticación:**

- Endpoints requieren `x-user-id` header
- Solo se retornan datos de la cuenta vinculada del usuario

**Rate Limiting:**

- Pequeño delay (100ms) entre solicitudes a Riot API
- Evita saturación de la API

---

## 📊 Colas de Juego Soportadas

| Queue ID | Nombre          |
| -------- | --------------- |
| 420      | Ranked Solo/Duo |
| 440      | Ranked Flex     |
| 450      | ARAM            |
| 400      | Normal Draft    |
| 430      | Normal Blind    |
| 700      | Clash           |

---

## 🚀 Integración en Perfil

Agregar el componente debajo de `RiotAccountCard`:

```tsx
import { RiotAccountCard } from "@/components/riot/RiotAccountCard";
import { MatchHistoryList } from "@/components/riot/MatchHistoryList";

export default function RiotProfile() {
  return (
    <div className="space-y-6">
      <RiotAccountCard />
      <MatchHistoryList />
    </div>
  );
}
```

---

## 📚 Archivos del Sistema

**Migraciones:**

- `supabase/migrations/20250119000002_create_matches_tables.sql`

**Servicios:**

- `src/lib/riot/matches.ts` - Lógica de sincronización

**API Routes:**

- `src/app/api/riot/matches/route.ts` - GET/POST endpoints

**Componentes:**

- `src/components/riot/MatchHistoryList.tsx` - UI del historial

**Tipos:**

- `src/types/riot.ts` - Interfaces TypeScript

---

## 🔧 Próximos Pasos

1. Ejecutar migración: `npx supabase db push`
2. Probar sincronización de partidas
3. Verificar que las imágenes cargan correctamente
4. Integrar componente en perfil de usuario
5. Crear página de estadísticas detalladas (opcional)

---

## 🐛 Troubleshooting

**"No hay partidas registradas"**

- Ejecutar POST /api/riot/matches/sync para sincronizar
- Verificar que el usuario tiene partidas recientes

**"Error al sincronizar"**

- Verificar RIOT_API_KEY en .env.local
- Verificar conexión a internet
- Revisar logs del servidor

**Imágenes no cargan**

- Verificar que CommunityDragon está disponible
- Revisar IDs de campeones y objetos
- Usar fallback en caso de error

---

## 📈 Estadísticas

El sistema calcula automáticamente:

- **Winrate**: (Victorias / Total) \* 100
- **KDA**: (Kills + Assists) / Deaths
- **Daño Promedio**: Total Daño / Partidas
- **Oro Promedio**: Total Oro / Partidas

Todos basados en las últimas 20 partidas.
