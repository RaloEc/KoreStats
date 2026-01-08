# Guía: Implementar Lazy Load en Historial de Partidas

## Concepto

**Lazy Load**: Mostrar primeras 5 partidas inmediatamente, cargar el resto en background.

```
Tiempo percibido: 200-300ms (en lugar de 3-4s)
```

## Opción 1: Lazy Load Simple (RECOMENDADO)

### Cambios en MatchHistoryList.tsx

```typescript
// Constantes
const INITIAL_LOAD = 5; // Primeras 5 partidas
const MATCHES_PER_PAGE = 40; // Después, 40 por página

// En el hook useInfiniteQuery
const {
  data: matchPages,
  isLoading,
  error,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery<MatchHistoryPage>({
  queryKey: matchHistoryQueryKey,
  queryFn: async ({ pageParam }) => {
    if (!userId) throw new Error("No user");

    const params = new URLSearchParams();

    // Determinar límite según página
    const isFirstPage = pageParam === null;
    const limit = isFirstPage ? INITIAL_LOAD : MATCHES_PER_PAGE;
    params.set("limit", limit.toString());

    if (queueFilter && queueFilter !== "all") {
      params.set("queue", queueFilter);
    }

    if (typeof pageParam === "number") {
      params.set("cursor", pageParam.toString());
    }

    const response = await fetch(`/api/riot/matches?${params.toString()}`, {
      headers: {
        "x-user-id": userId,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch matches");
    }

    return (await response.json()) as MatchHistoryPage;
  },
  getNextPageParam: (lastPage) =>
    lastPage?.hasMore ? lastPage.nextCursor ?? undefined : undefined,
  enabled: !!userId,
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  initialPageParam: null,
});

// Cargar más partidas automáticamente después de 2 segundos
useEffect(() => {
  if (!isLoading && matchPages?.pages.length === 1 && hasNextPage) {
    const timer = setTimeout(() => {
      console.log("[MatchHistoryList] Cargando más partidas en background...");
      fetchNextPage();
    }, 2000);

    return () => clearTimeout(timer);
  }
}, [isLoading, matchPages?.pages.length, hasNextPage, fetchNextPage]);
```

### Ventajas

- ✅ Muy simple de implementar (5 líneas de código)
- ✅ Tiempo percibido: 200-300ms
- ✅ No requiere cambios en API
- ✅ Compatible con infinite scroll actual

### Desventajas

- ❌ Carga 35 partidas adicionales después de 2s (puede ser innecesario)

---

## Opción 2: Lazy Load Inteligente (AVANZADO)

### Concepto

Cargar más partidas solo si el usuario hace scroll o espera más de 5 segundos.

```typescript
// Cargar más partidas solo si:
// 1. Usuario hace scroll hacia abajo, O
// 2. Pasan 5 segundos sin interacción

const [userScrolled, setUserScrolled] = useState(false);

useEffect(() => {
  const container = scrollContainerRef.current;
  if (!container) return;

  const handleScroll = () => {
    setUserScrolled(true);
  };

  container.addEventListener("scroll", handleScroll);
  return () => container.removeEventListener("scroll", handleScroll);
}, []);

// Cargar automáticamente si: usuario scrolleó O pasaron 5s
useEffect(() => {
  if (!isLoading && matchPages?.pages.length === 1 && hasNextPage) {
    const timer = setTimeout(() => {
      if (userScrolled || Date.now() - loadStartTime > 5000) {
        fetchNextPage();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }
}, [
  isLoading,
  matchPages?.pages.length,
  hasNextPage,
  fetchNextPage,
  userScrolled,
]);
```

### Ventajas

- ✅ Solo carga si es necesario
- ✅ Ahorra ancho de banda
- ✅ Mejor UX

### Desventajas

- ❌ Más complejo
- ❌ Requiere tracking de interacción

---

## Opción 3: Progressive Loading (PROFESIONAL)

### Concepto

Mostrar skeleton mientras carga, actualizar progresivamente.

```typescript
// Mostrar primeras 5 + skeleton para las siguientes
const matchesToRender = useMemo(() => {
  const flatMatches = pages.flatMap((page) => page.matches ?? []);

  // Mostrar primeras 5 siempre
  const initialMatches = flatMatches.slice(0, INITIAL_LOAD);

  // Mostrar resto si ya cargó
  const additionalMatches = flatMatches.slice(INITIAL_LOAD);

  return {
    initial: initialMatches,
    additional: additionalMatches,
    isLoadingMore: isFetchingNextPage && pages.length === 1,
  };
}, [pages, isFetchingNextPage]);

// En el render
<div className="space-y-2">
  {/* Primeras 5 partidas */}
  {matchesToRender.initial.map((match) => (
    <MatchCard key={match.id} match={match} />
  ))}

  {/* Skeleton mientras carga más */}
  {matchesToRender.isLoadingMore && (
    <>
      {Array.from({ length: 3 }).map((_, idx) => (
        <MatchCardSkeleton key={`skeleton-${idx}`} />
      ))}
    </>
  )}

  {/* Partidas adicionales cuando carguen */}
  {matchesToRender.additional.map((match) => (
    <MatchCard key={match.id} match={match} />
  ))}
</div>;
```

### Ventajas

- ✅ Mejor UX (muestra progreso)
- ✅ Tiempo percibido: 200-300ms
- ✅ Profesional

### Desventajas

- ❌ Más código
- ❌ Requiere MatchCardSkeleton

---

## Opción 4: Virtual Scrolling (PARA 100+ PARTIDAS)

### Concepto

Renderizar solo partidas visibles. Ideal para scroll largo.

```bash
npm install react-window
```

```typescript
import { FixedSizeList as List } from "react-window";

const Row = ({
  index,
  style,
}: {
  index: number;
  style: React.CSSProperties;
}) => (
  <div style={style}>
    <MatchCard match={matchesToRender[index]} />
  </div>
);

return (
  <List
    height={600}
    itemCount={matchesToRender.length}
    itemSize={120}
    width="100%"
  >
    {Row}
  </List>
);
```

### Ventajas

- ✅ Scroll suave con 100+ partidas
- ✅ Bajo uso de memoria
- ✅ Profesional

### Desventajas

- ❌ Requiere librería externa
- ❌ Más complejo

---

## Recomendación

### Para Implementar Ahora (Opción 1)

```typescript
// En MatchHistoryList.tsx, agregar después del useEffect de scroll

// Cargar más partidas automáticamente después de 2 segundos
useEffect(() => {
  if (!isLoading && matchPages?.pages.length === 1 && hasNextPage) {
    const timer = setTimeout(() => {
      console.log("[MatchHistoryList] Lazy loading: cargando más partidas...");
      fetchNextPage();
    }, 2000);

    return () => clearTimeout(timer);
  }
}, [isLoading, matchPages?.pages.length, hasNextPage, fetchNextPage]);
```

**Tiempo de implementación**: 5 minutos
**Impacto**: 3-4s → 1-2s (tiempo percibido)

---

## Comparativa

| Opción         | Tiempo | Complejidad | Impacto      | Recomendación |
| -------------- | ------ | ----------- | ------------ | ------------- |
| 1. Simple      | 5 min  | Muy baja    | 3-4s → 1-2s  | ✅ PRIMERO    |
| 2. Inteligente | 15 min | Media       | 3-4s → 1-2s  | ⏳ Después    |
| 3. Progressive | 20 min | Media       | 3-4s → 500ms | ⏳ Después    |
| 4. Virtual     | 30 min | Alta        | 3-4s → 200ms | ⏳ Para 100+  |

---

## Implementación Paso a Paso

### Paso 1: Agregar constante

```typescript
const INITIAL_LOAD = 5;
```

### Paso 2: Modificar queryFn

```typescript
const isFirstPage = pageParam === null;
const limit = isFirstPage ? INITIAL_LOAD : MATCHES_PER_PAGE;
params.set("limit", limit.toString());
```

### Paso 3: Agregar auto-load

```typescript
useEffect(() => {
  if (!isLoading && matchPages?.pages.length === 1 && hasNextPage) {
    const timer = setTimeout(() => {
      fetchNextPage();
    }, 2000);
    return () => clearTimeout(timer);
  }
}, [isLoading, matchPages?.pages.length, hasNextPage, fetchNextPage]);
```

### Paso 4: Verificar en navegador

- Ir a /perfil
- Ver que primeras 5 partidas cargan rápido (200-300ms)
- Esperar 2 segundos
- Ver que cargan más partidas en background

---

## Debugging

### Logs para agregar

```typescript
console.log("[MatchHistoryList] Lazy load: primeras 5 partidas cargadas");
console.log(
  "[MatchHistoryList] Lazy load: cargando más partidas en background..."
);
console.log("[MatchHistoryList] Lazy load: más partidas cargadas");
```

### Verificar en DevTools

- Network: Ver que primer request es `limit=5`
- Network: Ver que segundo request es `limit=40` después de 2s
- Performance: Tiempo total < 1s

---

## Conclusión

**Opción 1 (Simple)** es la mejor para implementar ahora:

- 5 minutos de código
- Impacto visual inmediato
- Compatible con todo lo existente
- Tiempo percibido: 200-300ms (en lugar de 3-4s)
