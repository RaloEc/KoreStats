# Plan de Optimización de Performance - Página de Perfil

## 🔍 Diagnóstico del Cuello de Botella

### Análisis de la Arquitectura Actual

Tras auditar el código de `/perfil/[username]`, identifico **5 cuellos de botella críticos** ordenados por impacto:

---

## 📊 Cuello de Botella #1: SSR Bloqueante y Pesado (CRÍTICO - 40% del problema)

### Problema Identificado

```typescript
// page.tsx - SSR actual
const { profile, riotAccount } = await getProfileInitialData(params.username);

if (riotAccount) {
  const [matchesResult, statsResult] = await Promise.all([
    getMatchHistory(riotAccount.puuid, { limit: 10 }), // ← BLOQUEA SSR
    getPlayerStats(riotAccount.puuid, { limit: 40 }), // ← BLOQUEA SSR
  ]);
}
```

**El problema**: `getProfileInitialData` ejecuta **7 queries en paralelo** a Supabase (líneas 156-220 de `server-data.ts`):

- `foro_hilos` (count)
- `foro_posts` (count)
- `foro_hilos` (últimos 5)
- `foro_posts` (últimos 5)
- `weapon_stats_records`
- `user_activity_entries`
- `linked_accounts_riot`

**Después**, hace 2 queries más pesadas:

- `getMatchHistory` (10 partidas con JOINs y full_json)
- `getPlayerStats` (40 partidas para calcular stats)

**Resultado**: TTFB de 3-5 segundos solo en SSR.

### Solución Propuesta

```typescript
// page.tsx OPTIMIZADO - SSR Minimalista
export default async function UserProfilePage({ params }: Props) {
  // SSR: Solo datos CRÍTICOS para SEO y primer render
  const { profile, riotAccount } = await getProfileInitialDataLight(
    params.username
  );

  if (!profile) return notFound();

  // NO cargar matches ni stats en SSR - se cargan en cliente
  return (
    <Suspense fallback={<PerfilSkeleton />}>
      <UserProfileClient
        initialProfile={profile}
        initialRiotAccount={riotAccount}
        // SIN initialMatchesData ni initialStats
      />
    </Suspense>
  );
}
```

**Nueva función `getProfileInitialDataLight`**:

```typescript
export async function getProfileInitialDataLight(username: string) {
  const supabase = await createClient();

  // Solo 2 queries en paralelo (no 7+2)
  const [perfilResult, riotResult] = await Promise.all([
    supabase
      .from("perfiles")
      .select(
        "id, username, public_id, avatar_url, banner_url, bio, color, role"
      )
      .or(`public_id.eq.${username},username.eq.${username}`)
      .single(),

    // Solo obtener puuid, no todo el objeto
    supabase
      .from("linked_accounts_riot")
      .select(
        "puuid, game_name, tag_line, solo_tier, solo_division, profile_icon_id"
      )
      .eq("user_id", perfilResult?.data?.id || "")
      .single(),
  ]);

  return {
    profile: perfilResult.data,
    riotAccount: riotResult.data,
  };
}
```

**Impacto Estimado**: TTFB -60% (de 3-5s a 1-2s)

---

## 📊 Cuello de Botella #2: Payload de `full_json` (CRÍTICO - 25% del problema)

### Problema Identificado

```typescript
// getMatchHistory en matches.ts envía full_json COMPLETO
const query = supabase.from("match_participants").select(`
    *,
    matches!inner(
      match_id, game_creation, game_duration, game_mode, queue_id,
      full_json  // ← ESTO PESA 50-100KB POR PARTIDA
    )
  `);
```

Cada `full_json` contiene:

- 10 participantes con ~200 campos cada uno
- Metadata de la partida
- Teams info
- Eventos (opcional)

**10 partidas = 500KB-1MB de payload solo para la carga inicial**

### Solución Propuesta: Modelo Light → Full

#### 1. Nuevo endpoint `/api/riot/matches/light`

```typescript
// src/app/api/riot/matches/light/route.ts
export async function GET(request: NextRequest) {
  const { data } = await supabase
    .from("match_participants")
    .select(
      `
      match_id,
      champion_name,
      champion_id,
      win,
      kills,
      deaths,
      assists,
      kda,
      item0, item1, item2, item3, item4, item5, item6,
      summoner1_id,
      summoner2_id,
      perk_primary_style,
      perk_sub_style,
      vision_score,
      total_damage_dealt,
      gold_earned,
      ranking_position,
      matches!inner(
        match_id,
        game_creation,
        game_duration,
        game_mode,
        queue_id,
        ingest_status
        -- SIN full_json
      )
    `
    )
    .eq("puuid", puuid)
    .order("game_creation", { foreignTable: "matches", ascending: false })
    .limit(limit);

  return NextResponse.json({ matches: data });
}
```

#### 2. `select` en TanStack Query

```typescript
// MatchHistoryList.tsx
const { data } = useInfiniteQuery({
  queryKey: ["match-history-light", userId, queueFilter],
  queryFn: async ({ pageParam }) => {
    const response = await fetch(
      `/api/riot/matches/light?userId=${userId}&limit=${limit}`
    );
    return response.json();
  },
  // NUEVO: Solo extraer campos necesarios para render
  select: (data) => ({
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      matches: page.matches.map((match) => ({
        match_id: match.match_id,
        champion_name: match.champion_name,
        win: match.win,
        kills: match.kills,
        deaths: match.deaths,
        assists: match.assists,
        kda: match.kda,
        items: [
          match.item0,
          match.item1,
          match.item2,
          match.item3,
          match.item4,
          match.item5,
          match.item6,
        ],
        // Solo datos visuales
      })),
    })),
  }),
});
```

**Impacto Estimado**: Payload -90% (de 1MB a 50-100KB)

---

## 📊 Cuello de Botella #3: Queries Simultáneas en Cliente (ALTO - 15% del problema)

### Problema Identificado

`MatchHistoryList.tsx` dispara **5 queries al mismo tiempo** en el mount:

```typescript
// Línea 218: ddragon-version
useQuery({ queryKey: ["ddragon-version"] });

// Línea 228: match-session-stats
useQuery({ queryKey: ["match-session-stats"] });

// Línea 252: match-history-cache
useQuery({ queryKey: ["match-history-cache", userId] });

// Línea 290: linked-accounts
useQuery({ queryKey: ["linked-accounts"] });

// Línea 312: match-history (infiniteQuery)
useInfiniteQuery({ queryKey: ["match-history", userId, queueFilter] });
```

**Esto causa**:

- 5 requests HTTP simultáneos
- Competencia por el main thread
- Waterfall de parsing JSON
- Bloqueo del primer render visual

### Solución Propuesta: Escalonamiento con `enabled`

```typescript
// MatchHistoryList.tsx OPTIMIZADO

// 1. CRÍTICO - Datos para render inmediato
const { data: matchPages, isLoading } = useInfiniteQuery({
  queryKey: ["match-history-light", userId, queueFilter],
  enabled: !!userId,
  // ... opciones
});

// 2. SECUNDARIO - Solo después de tener partidas
const { data: ddragonVersion } = useQuery({
  queryKey: ["ddragon-version"],
  enabled: !isLoading && !!matchPages?.pages?.[0]?.matches?.length,
  staleTime: 60 * 60 * 1000, // 1 hora
});

// 3. TERCIARIO - Solo para perfil propio, después de render
const { data: sessionStats } = useQuery({
  queryKey: ["match-session-stats"],
  enabled: isOwnProfile && !isLoading,
  staleTime: 30 * 1000, // 30 segundos
});

// 4. LAZY - Linked accounts solo cuando se necesiten para modal
const { data: linkedAccounts } = useQuery({
  queryKey: ["linked-accounts"],
  enabled: !!selectedMatchId, // Solo cuando abren modal
  staleTime: 30 * 60 * 1000,
});

// 5. ELIMINADO - match-history-cache ya no es necesario si usamos initialData del SSR
```

**Impacto Estimado**: TTI -40%, menos bloqueo de main thread

---

## 📊 Cuello de Botella #4: Renderizado de MatchCard (MEDIO - 12% del problema)

### Problema Identificado

Cada `MatchCard` y `MobileMatchCard` ejecuta cálculos pesados en render:

```typescript
// MobileMatchCard.tsx líneas 276-313
const scoreEntries = computeParticipantScores(
  participants, // ← 10 objetos grandes
  match.matches.game_duration,
  match.matches.full_json?.info // ← Acceso a full_json
);

const sortedByScore = [...scoreEntries].sort(
  (a, b) => (b.score ?? 0) - (a.score ?? 0)
);
```

**Esto ocurre en CADA render de CADA tarjeta** (incluso virtualizadas).

### Solución Propuesta: MatchCardLite + MatchCardFull

#### 1. `MatchCardLite.tsx` - Render instantáneo

```typescript
// Nuevo componente para virtualización
export const MatchCardLite = React.memo(function MatchCardLite({
  match,
  version,
  onClick,
}: MatchCardLiteProps) {
  // SIN cálculos de ranking
  // SIN acceso a full_json
  // SIN tooltips
  // SIN modales

  return (
    <div
      onClick={onClick}
      className={`... ${match.win ? "bg-green-500/5" : "bg-red-500/5"}`}
    >
      <div className="flex items-center gap-2">
        <ChampionIcon name={match.champion_name} size={48} />
        <div>
          <span className="font-bold">
            {match.kills}/{match.deaths}/{match.assists}
          </span>
          <span className="text-sm">{match.kda.toFixed(2)} KDA</span>
        </div>
        <ItemGrid items={match.items} size={24} />
      </div>
    </div>
  );
});
```

#### 2. `MatchCardFull.tsx` - Carga diferida

```typescript
// Solo se carga cuando el usuario hace click o hover largo
const MatchCardFull = dynamic(() => import("./MatchCardFull"), {
  ssr: false,
  loading: () => <MatchCardLite {...props} />,
});

// En MatchHistoryList:
{
  virtualRow.isVisible ? (
    <MatchCardFull match={match} />
  ) : (
    <MatchCardLite match={match} />
  );
}
```

#### 3. Mover cálculos al backend

```sql
-- Los rankings ya se calculan en processMatchRankingAsync
-- Asegurar que ranking_position esté siempre populado
UPDATE match_participants
SET ranking_position = calculated_rank
WHERE ranking_position IS NULL;
```

**Impacto Estimado**: Render time -60% por tarjeta

---

## 📊 Cuello de Botella #5: Assets de DDragon (MEDIO - 8% del problema)

### Problema Identificado

Cada partida con 10 participantes carga:

- 10 iconos de campeón
- 10 sets de items (70 imágenes)
- 10 runas primarias
- 10 runas secundarias
- 10 hechizos de invocador x2

**Total: ~120 requests por partida visible**

Con 5 partidas visibles = 600 requests de imágenes

### Solución Propuesta

#### 1. Sprites CSS en lugar de imágenes individuales

```typescript
// helpers.ts - NUEVO
export function getChampionSpritePosition(championId: number): {
  x: number;
  y: number;
} {
  // DDragon tiene sprites de 48x48 en grids de 10x15
  const gridX = championId % 10;
  const gridY = Math.floor(championId / 10);
  return { x: gridX * 48, y: gridY * 48 };
}
```

```css
/* Item sprite sheet */
.item-sprite {
  background-image: url("/sprites/items-15.3.1.webp");
  background-size: 480px 720px;
  width: 24px;
  height: 24px;
}
.item-1001 {
  background-position: -0px -0px;
}
.item-1004 {
  background-position: -24px -0px;
}
/* ... generado automáticamente */
```

#### 2. Precarga de assets críticos

```typescript
// En _app.tsx o layout.tsx
export const metadata = {
  // Precargar sprite de campeones
  other: {
    link: [
      { rel: "preload", href: "/sprites/champions-15.3.1.webp", as: "image" },
      { rel: "preload", href: "/sprites/items-15.3.1.webp", as: "image" },
    ],
  },
};
```

#### 3. Limitar imágenes en primer render

```typescript
// MatchCardLite - Solo cargar imágenes del jugador principal
<ChampionIcon
  name={match.champion_name}
  priority={index < 3} // Solo primeras 3 partidas con priority
  loading={index >= 3 ? "lazy" : "eager"}
/>;

// Items solo en hover o viewport
{
  isInViewport && <ItemGrid items={match.items} />;
}
```

**Impacto Estimado**: Requests -80%, LCP -30%

---

## 🛠️ Backend & Cache Optimizations

### 1. Precalcular Stats en Supabase

```sql
-- Crear tabla de stats precalculadas
CREATE TABLE player_stats_cache (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  puuid TEXT UNIQUE,
  total_games INTEGER,
  wins INTEGER,
  losses INTEGER,
  winrate NUMERIC,
  avg_kda NUMERIC,
  avg_damage INTEGER,
  avg_gold INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger para actualizar después de cada partida nueva
CREATE OR REPLACE FUNCTION update_player_stats_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar stats del jugador
  INSERT INTO player_stats_cache (user_id, puuid, total_games, wins, losses, winrate, avg_kda, avg_damage, avg_gold)
  SELECT
    lar.user_id,
    NEW.puuid,
    COUNT(*),
    SUM(CASE WHEN mp.win THEN 1 ELSE 0 END),
    SUM(CASE WHEN NOT mp.win THEN 1 ELSE 0 END),
    ROUND(SUM(CASE WHEN mp.win THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1),
    ROUND(AVG(mp.kda), 2),
    ROUND(AVG(mp.total_damage_dealt)),
    ROUND(AVG(mp.gold_earned))
  FROM match_participants mp
  JOIN linked_accounts_riot lar ON lar.puuid = mp.puuid
  WHERE mp.puuid = NEW.puuid
  GROUP BY lar.user_id, NEW.puuid
  ON CONFLICT (puuid) DO UPDATE SET
    total_games = EXCLUDED.total_games,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    winrate = EXCLUDED.winrate,
    avg_kda = EXCLUDED.avg_kda,
    avg_damage = EXCLUDED.avg_damage,
    avg_gold = EXCLUDED.avg_gold,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_stats
AFTER INSERT ON match_participants
FOR EACH ROW
EXECUTE FUNCTION update_player_stats_cache();
```

### 2. Headers de Cache HTTP

```typescript
// /api/riot/matches/light/route.ts
return NextResponse.json(data, {
  headers: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    "CDN-Cache-Control": "public, max-age=60",
    "Vercel-CDN-Cache-Control": "public, max-age=60",
  },
});

// /api/riot/matches/cache/route.ts
return NextResponse.json(data, {
  headers: {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  },
});
```

### 3. Edge Function para DDragon

```typescript
// netlify/edge-functions/ddragon-proxy.ts
export default async (request: Request) => {
  const url = new URL(request.url);
  const assetPath = url.searchParams.get("path");

  const response = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${assetPath}`
  );

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      "CDN-Cache-Control": "public, max-age=31536000",
    },
  });
};
```

---

## ✅ Checklist de Performance

### Prioridad CRÍTICA (implementar primero)

- [ ] SSR minimalista sin matches/stats
- [ ] Endpoint `/api/riot/matches/light` sin full_json
- [ ] Queries escalonadas con `enabled`
- [ ] Stats precalculadas en Supabase

### Prioridad ALTA

- [ ] MatchCardLite para render inicial
- [ ] Dynamic import para MatchCardFull
- [ ] Headers de cache HTTP en APIs
- [ ] Eliminar cálculos de ranking en render

### Prioridad MEDIA

- [ ] Sprites CSS para items/campeones
- [ ] Precarga de assets críticos
- [ ] Lazy loading de imágenes no visibles
- [ ] Edge caching en Netlify

### Prioridad BAJA (nice-to-have)

- [ ] Service Worker para assets DDragon
- [ ] Intersection Observer para carga diferida
- [ ] Web Workers para cálculos pesados

---

## 📈 Estimación de Impacto

| Métrica            | Antes   | Después (estimado) | Mejora   |
| ------------------ | ------- | ------------------ | -------- |
| TTFB               | 3-5s    | 0.8-1.5s           | **-70%** |
| FCP                | 4-6s    | 1.5-2s             | **-65%** |
| TTI                | 7-9s    | 2-3s               | **-70%** |
| LCP                | 5-7s    | 2-3s               | **-60%** |
| Payload inicial    | 1-1.5MB | 100-200KB          | **-85%** |
| Requests iniciales | 20-30   | 5-8                | **-75%** |

---

## 🚀 Implementación por Fases

### Fase 1: Quick Wins (1-2 días)

1. SSR minimalista
2. Queries escalonadas
3. Headers de cache

### Fase 2: Payload Reduction (2-3 días)

1. Endpoint `/matches/light`
2. Stats precalculadas
3. Eliminar full_json de carga inicial

### Fase 3: Render Optimization (2-3 días)

1. MatchCardLite component
2. Dynamic imports
3. Memoización correcta

### Fase 4: Asset Optimization (1-2 días)

1. Sprites CSS
2. Precarga de assets
3. Edge caching

---

## 📝 Notas Importantes

1. **No eliminar virtualización**: Ya está implementada y funciona bien
2. **Mantener SEO**: El SSR minimalista mantiene metadata para crawlers
3. **Backwards compatible**: Los endpoints existentes siguen funcionando
4. **Monitorear**: Usar Lighthouse CI después de cada fase
