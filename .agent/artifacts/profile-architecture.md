# Arquitectura de la Página de Perfil Público y Historial de Partidas

## Índice

1. [Resumen General](#resumen-general)
2. [Estructura de Archivos](#estructura-de-archivos)
3. [Flujo de Datos](#flujo-de-datos)
4. [Componentes Principales](#componentes-principales)
5. [Tecnologías Utilizadas](#tecnologías-utilizadas)
6. [Base de Datos](#base-de-datos)
7. [APIs](#apis)
8. [Historial de Partidas - Detalle Técnico](#historial-de-partidas---detalle-técnico)

---

## Resumen General

La página de perfil público (`/perfil/[username]`) es una página **híbrida SSR + CSR** que muestra:

- Información del perfil del usuario
- Cuenta de Riot Games vinculada (si existe)
- Estadísticas de campeones
- Historial de partidas de League of Legends
- Feed de actividad social

### Patrón Arquitectónico

- **Server-Side Rendering (SSR)**: Los datos iniciales se cargan en el servidor para SEO y rendimiento
- **Client-Side Hydration**: El componente cliente toma el control para interactividad y actualizaciones
- **Infinite Query + Virtualización**: El historial usa scroll infinito virtualizado para rendimiento

---

## Estructura de Archivos

```
src/
├── app/
│   └── perfil/
│       └── [username]/
│           └── page.tsx                    # Página principal (Server Component)
│
├── components/
│   ├── perfil/
│   │   ├── UserProfileClient.tsx           # Layout principal del cliente
│   │   ├── PerfilHeader.tsx                # Cabecera del perfil
│   │   ├── ProfileTabs.tsx                 # Sistema de pestañas
│   │   ├── MobileUserProfileLayout.tsx     # Layout móvil
│   │   └── PerfilSkeleton.tsx              # Estado de carga
│   │
│   └── riot/
│       ├── MatchHistoryList.tsx            # 🔑 Lista principal de partidas
│       ├── RiotAccountCardVisual.tsx       # Tarjeta de cuenta Riot
│       ├── ChampionStatsSummary.tsx        # Resumen de campeones
│       ├── ScoreboardModal.tsx             # Modal de detalles de partida
│       ├── ActiveMatchCard.tsx             # Tarjeta de partida en vivo
│       ├── EndedMatchPreviewCard.tsx       # Preview de partida terminada
│       │
│       └── match-card/                     # Subcomponentes de partidas
│           ├── index.ts                    # Exports centralizados
│           ├── MatchCard.tsx               # Tarjeta desktop
│           ├── MobileMatchCard.tsx         # Tarjeta móvil completa
│           ├── CompactMobileMatchCard.tsx  # Tarjeta móvil compacta
│           ├── MatchCardShareButton.tsx    # Botón compartir
│           ├── PlayerSummaryClient.tsx     # Resumen del jugador
│           ├── RunesTooltip.tsx            # Tooltip de runas
│           ├── TeamPlayerList.tsx          # Lista de jugadores del equipo
│           ├── helpers.ts                  # Funciones auxiliares
│           └── performance-utils.ts        # Cálculos de rendimiento
│
├── lib/
│   ├── perfil/
│   │   ├── server-data.ts                  # Funciones SSR para obtener datos
│   │   └── match-processor.ts              # Procesamiento de partidas
│   │
│   └── riot/
│       ├── matches.ts                      # 🔑 Servicio principal de partidas
│       ├── helpers.ts                      # URLs de assets (DDragon/CDragon)
│       ├── league.ts                       # Sistema de rangos
│       └── match-analyzer.ts               # Análisis de rendimiento
│
├── hooks/
│   ├── use-perfil-usuario.ts               # Hook para datos de perfil
│   ├── use-match-status-detector.ts        # Detección de partida activa
│   └── useMatchDetails.ts                  # Detalles de partida
│
└── app/api/riot/
    ├── matches/
    │   ├── route.ts                        # GET /api/riot/matches
    │   ├── sync/route.ts                   # POST /api/riot/matches/sync
    │   ├── cache/route.ts                  # GET /api/riot/matches/cache
    │   └── session-stats/route.ts          # Estadísticas de sesión
    │
    └── account/
        └── public/
            ├── route.ts                    # GET cuenta pública
            └── sync/route.ts               # POST sincronizar cuenta
```

---

## Flujo de Datos

### 1. Carga Inicial (Server-Side)

```
Usuario visita /perfil/ralo
        │
        ▼
┌─────────────────────────────────────┐
│  page.tsx (Server Component)        │
│  - getProfileInitialData(username)  │
│  - getMatchHistory(puuid, limit:10) │
│  - getPlayerStats(puuid, limit:40)  │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  UserProfileClient                  │
│  (recibe datos iniciales como props)│
└─────────────────────────────────────┘
```

### 2. Hidratación del Cliente

```
┌─────────────────────────────────────┐
│  UserProfileClient                  │
│  - usePerfilUsuario(publicId)       │
│  - useState para riotAccount        │
│  - useMutation para sincronización  │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  MatchHistoryList                   │
│  - useInfiniteQuery (match-history) │
│  - useQuery (match-history-cache)   │
│  - useQuery (session-stats)         │
│  - useWindowVirtualizer             │
└─────────────────────────────────────┘
```

### 3. Sincronización de Partidas

```
Usuario hace clic en "Actualizar"
        │
        ▼
┌─────────────────────────────────────┐
│  POST /api/riot/matches/sync        │
│  - Obtiene IDs de Riot API          │
│  - Filtra IDs ya existentes         │
│  - Descarga detalles de nuevas      │
│  - Guarda en matches + participants │
│  - Calcula rankings async           │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Invalidación de React Query        │
│  - match-history                    │
│  - match-history-cache              │
│  - match-session-stats              │
└─────────────────────────────────────┘
```

---

## Componentes Principales

### `page.tsx` (Server Component)

```typescript
// Configuración
export const dynamic = "force-dynamic";
export const revalidate = 60;

// Función principal
export default async function UserProfilePage({ params }) {
  const { profile, riotAccount } = await getProfileInitialData(params.username);

  // Si hay cuenta Riot, cargar datos iniciales
  if (riotAccount) {
    const [matchesResult, statsResult] = await Promise.all([
      getMatchHistory(riotAccount.puuid, { limit: 10 }),
      getPlayerStats(riotAccount.puuid, { limit: 40 }),
    ]);
  }

  return (
    <Suspense fallback={<PerfilSkeleton />}>
      <UserProfileClient
        initialProfile={profile}
        initialRiotAccount={riotAccount}
        initialMatchesData={matchesResult}
        initialStats={statsResult}
      />
    </Suspense>
  );
}
```

### `UserProfileClient.tsx`

**Responsabilidades:**

- Manejo de estado del cliente
- Sistema de pestañas (posts / lol)
- Sincronización con Riot API
- Layouts responsivos (desktop/mobile)

**Props:**

```typescript
interface UserProfileClientProps {
  initialProfile?: ProfileData | null;
  initialRiotAccount?: LinkedAccountRiot | null;
  initialMatchesData?: any;
  initialStats?: any;
}
```

**Render condicional:**

- Si pestaña = "posts" → `StatusFeed` + `FriendsListCompact`
- Si pestaña = "lol" → `RiotAccountCardVisual` + `ChampionStatsSummary` + `MatchHistoryList`

### `MatchHistoryList.tsx`

**Componente core del historial de partidas.**

**Estado principal:**

```typescript
const [queueFilter, setQueueFilter] = useState("all"); // Filtro de cola
const [mobileViewMode, setMobileViewMode] = useState("full"); // Vista móvil
const [selectedMatchId, setSelectedMatchId] = useState(null); // Modal
```

**Queries de React Query:**

| Query Key             | Propósito                        | Stale Time |
| --------------------- | -------------------------------- | ---------- |
| `match-history`       | Historial paginado infinito      | 5 min      |
| `match-history-cache` | Caché rápido para UI instantánea | 30 min     |
| `match-session-stats` | Stats del día/sesión             | 5 seg      |
| `ddragon-version`     | Versión de assets                | 1 hora     |
| `linked-accounts`     | PUUIDs de usuarios registrados   | 30 min     |

**Virtualización:**

```typescript
const rowVirtualizer = useWindowVirtualizer({
  count: matchesToRender.length,
  estimateSize: (index) => (isMobile ? mobileRowHeight : 160),
  overscan: 5,
  scrollMargin: listOffset,
});
```

---

## Tecnologías Utilizadas

### Frontend

| Tecnología           | Uso                                           |
| -------------------- | --------------------------------------------- |
| **Next.js 15**       | Framework React con App Router                |
| **React 19**         | Librería UI                                   |
| **TypeScript**       | Tipado estático                               |
| **TanStack Query**   | Gestión de estado servidor (caching, refetch) |
| **TanStack Virtual** | Virtualización de listas largas               |
| **Framer Motion**    | Animaciones (uso limitado por rendimiento)    |
| **Tailwind CSS**     | Estilos utilitarios                           |
| **Lucide React**     | Iconos                                        |
| **Radix UI**         | Componentes accesibles (Dialog, etc.)         |

### Backend

| Tecnología            | Uso                               |
| --------------------- | --------------------------------- |
| **Supabase**          | Base de datos PostgreSQL + Auth   |
| **Riot Games API**    | Match-V5, Summoner-V4, League-V4  |
| **DDragon / CDragon** | Assets de campeones, items, runas |
| **html-to-image**     | Generación de PNG para compartir  |

### Optimizaciones

| Técnica              | Implementación                               |
| -------------------- | -------------------------------------------- |
| **SSR Inicial**      | Datos pre-cargados en servidor               |
| **Virtualización**   | Solo renderiza filas visibles                |
| **Lazy Load**        | Primeras 5 partidas, luego paginación        |
| **Placeholder Data** | Muestra datos anteriores mientras carga      |
| **Memoización**      | `React.memo` en MatchCards                   |
| **Image Loader**     | Caché centralizado con concurrencia limitada |

---

## Base de Datos

### Tablas Principales

```sql
-- Partidas
CREATE TABLE matches (
  match_id TEXT PRIMARY KEY,
  data_version TEXT,
  game_creation BIGINT,
  game_duration INTEGER,
  game_mode TEXT,
  queue_id INTEGER,
  full_json JSONB,
  ingest_status TEXT DEFAULT 'processing'
);

-- Participantes de partidas
CREATE TABLE match_participants (
  id SERIAL PRIMARY KEY,
  match_id TEXT REFERENCES matches(match_id),
  puuid TEXT,
  summoner_id TEXT,
  summoner_name TEXT,
  champion_id INTEGER,
  champion_name TEXT,
  win BOOLEAN,
  kills INTEGER,
  deaths INTEGER,
  assists INTEGER,
  kda NUMERIC,
  total_damage_dealt_to_champions INTEGER,
  gold_earned INTEGER,
  vision_score INTEGER,
  -- ... más campos de estadísticas
  performance_score NUMERIC,
  rank_position INTEGER
);

-- Cuentas Riot vinculadas
CREATE TABLE linked_accounts_riot (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  puuid TEXT UNIQUE,
  game_name TEXT,
  tag_line TEXT,
  region TEXT,
  summoner_id TEXT,
  profile_icon_id INTEGER,
  -- Rangos
  solo_tier TEXT,
  solo_division TEXT,
  solo_lp INTEGER,
  flex_tier TEXT,
  flex_division TEXT,
  flex_lp INTEGER
);

-- Caché de historial (para carga instantánea)
CREATE TABLE match_history_cache (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  puuid TEXT,
  match_id TEXT,
  match_data JSONB,
  rank_position INTEGER,
  cached_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

---

## APIs

### GET `/api/riot/matches`

Obtiene historial de partidas paginado.

**Parámetros:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `userId` | string | ID del usuario |
| `limit` | number | Cantidad de partidas (default: 15) |
| `cursor` | number | Offset para paginación |
| `queue` | string | Filtro de cola (soloq, flex, aram...) |

**Respuesta:**

```typescript
{
  success: boolean;
  matches: Match[];
  stats: PlayerStats;
  hasMore: boolean;
  nextCursor: number | null;
}
```

### POST `/api/riot/matches/sync`

Sincroniza nuevas partidas desde Riot API.

**Body:**

```json
{ "userId": "uuid-del-usuario" }
```

**Proceso:**

1. Obtiene PUUID de la cuenta vinculada
2. Llama a Match-V5 para obtener IDs recientes
3. Filtra partidas ya existentes en BD
4. Descarga detalles de nuevas partidas
5. Guarda en `matches` y `match_participants`
6. Dispara cálculo de rankings async

### GET `/api/riot/matches/cache`

Obtiene caché de partidas para UI instantánea.

### GET `/api/riot/matches/session-stats`

Estadísticas de la sesión de juego actual (wins/losses del día).

---

## Historial de Partidas - Detalle Técnico

### Ciclo de Vida de una Partida

```
1. DESCUBRIMIENTO
   Riot API → GET /lol/match/v5/matches/by-puuid/{puuid}/ids

2. FILTRADO
   filterExistingMatchIds() → Excluye IDs ya en BD

3. DESCARGA
   getMatchDetails() → GET /lol/match/v5/matches/{matchId}

4. GUARDADO RÁPIDO
   saveMatch() → INSERT en matches + match_participants
   → Marca ingest_status = 'processing'

5. PROCESAMIENTO ASYNC
   processMatchRankingAsync() → Calcula scores y rankings
   → Actualiza ingest_status = 'ready'
```

### Estructura de una Partida (Match)

```typescript
interface Match {
  id: string;
  match_id: string;
  game_creation: number;        // Timestamp
  game_duration: number;        // Segundos
  game_mode: string;           // CLASSIC, ARAM, etc.
  queue_id: number;            // 420=SoloQ, 440=Flex, etc.

  // Datos del jugador en esta partida
  champion_name: string;
  champion_id: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;

  // Estadísticas avanzadas
  total_damage_dealt: number;
  gold_earned: number;
  vision_score: number;

  // Items
  item0-6: number;

  // Runas
  perk_primary_style: number;
  perk_sub_style: number;

  // Ranking en la partida
  performance_score: number;
  rank_position: number;

  // JSON completo para modal de detalles
  full_json: MatchData;
}
```

### Componentes de Visualización

| Componente               | Uso             | Altura estimada |
| ------------------------ | --------------- | --------------- |
| `MatchCard`              | Desktop         | 160px           |
| `MobileMatchCard`        | Móvil (full)    | 320px           |
| `CompactMobileMatchCard` | Móvil (compact) | 80px            |

### Indicadores de Estado

| Estado                   | Indicador Visual               |
| ------------------------ | ------------------------------ |
| Cargando inicial         | Skeleton animado               |
| Refrescando              | Badge "Actualizando..."        |
| Partida en vivo          | `ActiveMatchCard` (glow verde) |
| Partida recién terminada | `EndedMatchPreviewCard`        |
| Error de carga           | `PerfilError` con retry        |

### Detección de Partida Activa

```typescript
useMatchStatusDetector({
  enabled: isOwnProfile,
  onSnapshotChange: (snapshot) => {
    // Actualizar UI con datos de partida en vivo
  },
  onStatusChange: (status) => {
    // 'in-game' → 'online' = partida terminó
    // → Disparar auto-sync
  },
});
```

---

## Optimizaciones Clave

### 1. Datos Iniciales SSR

- Primeras 10 partidas se cargan en el servidor
- SEO optimizado con metadata dinámica
- Time to First Paint reducido

### 2. Caché de React Query

- `match-history-cache`: Datos instantáneos mientras carga paginación
- `placeholderData`: Muestra datos anteriores durante refetch
- `staleTime`: Evita refetch innecesarios

### 3. Virtualización

- Solo ~10 elementos renderizados a la vez
- `overscan: 5` para scroll suave
- Re-medición automática al cambiar modo de vista

### 4. Lazy Loading de Imágenes

- Módulo centralizado `@/lib/image-loader.ts`
- Concurrencia limitada (6 simultáneas)
- Caché en memoria con TTL

### 5. Sincronización Inteligente

- Auto-sync cuando partida termina
- Cooldown para evitar spam
- Procesamiento de rankings async (no bloquea UI)

---

## Diagrama de Componentes

```
┌────────────────────────────────────────────────────────────┐
│                     UserProfileClient                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    PerfilHeader                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    ProfileTabs                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │   Tab: "posts"      │  │      Tab: "lol"              │ │
│  │  ┌───────────────┐  │  │  ┌────────────────────────┐ ││ │
│  │  │  StatusFeed   │  │  │  │ RiotAccountCardVisual  │ ││ │
│  │  └───────────────┘  │  │  └────────────────────────┘ ││ │
│  │  ┌───────────────┐  │  │  ┌────────────────────────┐ ││ │
│  │  │FriendsListCom │  │  │  │ ChampionStatsSummary   │ ││ │
│  │  └───────────────┘  │  │  └────────────────────────┘ ││ │
│  │                     │  │  ┌────────────────────────┐ ││ │
│  │                     │  │  │   MatchHistoryList     │ ││ │
│  │                     │  │  │  ┌──────────────────┐  │ ││ │
│  │                     │  │  │  │ ActiveMatchCard  │  │ ││ │
│  │                     │  │  │  └──────────────────┘  │ ││ │
│  │                     │  │  │  ┌──────────────────┐  │ ││ │
│  │                     │  │  │  │ VirtualizedList  │  │ ││ │
│  │                     │  │  │  │  ├─ MatchCard 1  │  │ ││ │
│  │                     │  │  │  │  ├─ MatchCard 2  │  │ ││ │
│  │                     │  │  │  │  ├─ AdBanner     │  │ ││ │
│  │                     │  │  │  │  ├─ MatchCard 3  │  │ ││ │
│  │                     │  │  │  │  └─ ...          │  │ ││ │
│  │                     │  │  │  └──────────────────┘  │ ││ │
│  │                     │  │  │  ┌──────────────────┐  │ ││ │
│  │                     │  │  │  │ ScoreboardModal  │  │ ││ │
│  │                     │  │  │  └──────────────────┘  │ ││ │
│  │                     │  │  └────────────────────────┘ ││ │
│  └─────────────────────┘  └──────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## Notas de Implementación

### Manejo de Errores

- Try/catch en todas las llamadas API
- Estados de error con opción de reintento
- Fallbacks para datos faltantes

### Responsive Design

- `useIsMobile(1024)` para detectar dispositivo
- Layouts completamente separados para mobile
- Modo compacto opcional en mobile

### Accesibilidad

- Componentes Radix UI para modales
- Keyboard navigation en listas
- ARIA labels en botones interactivos

### Caché y Sincronización

- `queryClient.invalidateQueries()` después de sync
- `refetchOnWindowFocus: false` para evitar spam
- Cache TTL configurables por tipo de dato
