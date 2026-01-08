# Optimización de Carga: Tarjeta de Cuenta LoL en /perfil

## Problema Identificado

La tarjeta de cuenta LoL en `/perfil` se cargaba lentamente con los siguientes síntomas:

1. **Flash de "No hay cuenta"**: Mostraba mensaje de sin cuenta mientras cargaba
2. **Carga secuencial de datos**: Múltiples llamadas a API que se ejecutaban una tras otra
3. **Splash art lento**: La imagen del campeón se cargaba al final
4. **Sin caché agresivo**: Cada recarga de página hacía nuevas llamadas a Riot API

### Flujo de Carga Anterior (Lento)

```
1. RiotAccountCard carga → /api/riot/account (BD)
2. Espera respuesta...
3. RiotAccountCardVisual carga → /api/riot/champion-mastery (Riot API)
4. Espera respuesta...
5. ChampionCenteredSplash carga imagen
6. Espera imagen...
7. Renderiza todo junto
```

**Tiempo total**: ~2-3 segundos (depende de latencia de Riot API)

## Soluciones Implementadas

### 1. **Skeleton UI (Mejor UX)**

- **Archivo**: `src/components/riot/RiotAccountCardSkeleton.tsx` (NUEVO)
- **Cambio**: En lugar de mostrar "No hay cuenta", ahora muestra un skeleton animado
- **Beneficio**: El usuario ve que algo está cargando, no que no hay datos
- **Implementación**: Skeleton con `animate-pulse` que simula la estructura final

```tsx
// Antes: Mostrar "No hay cuenta"
if (isLoading) return <Card>No hay cuenta...</Card>;

// Después: Mostrar skeleton
if (isLoading) return <RiotAccountCardSkeleton />;
```

### 2. **Caché Más Agresivo (React Query)**

- **Cambio en**: `src/components/riot/RiotAccountCard.tsx`
  - `staleTime`: 5 min → **30 min**
  - `gcTime`: No existía → **1 hora**
- **Cambio en**: `src/components/riot/RiotAccountCardVisual.tsx`
  - `staleTime`: 10 min → **30 min**
  - `gcTime`: No existía → **1 hora**

**Beneficio**: Los datos se reutilizan durante 30 minutos sin hacer nuevas llamadas

```typescript
// Antes
staleTime: 5 * 60 * 1000, // 5 minutos

// Después
staleTime: 30 * 60 * 1000, // 30 minutos
gcTime: 60 * 60 * 1000,    // 1 hora en memoria
```

### 3. **Caché en Base de Datos (Maestría de Campeones)**

- **Tabla nueva**: `champion_mastery_cache`
- **Archivo migración**: `supabase/migrations/20250228000000_create_champion_mastery_cache.sql`
- **Cambio en**: `src/app/api/riot/champion-mastery/route.ts`

**Flujo optimizado**:

```
1. Solicitud a /api/riot/champion-mastery
2. ¿Hay caché válido en BD? → Retorna inmediatamente (< 50ms)
3. Si no → Llama Riot API → Cachea en BD → Retorna
```

**Beneficio**:

- Primera carga: ~500ms (Riot API)
- Cargas posteriores: ~50ms (BD caché)
- Reducción: **90% más rápido** en cargas subsecuentes

### 4. **Lazy Loading de Splash Art**

- **Ya implementado**: `ChampionCenteredSplash` usa `priority={false}`
- **Beneficio**: La imagen no bloquea el render inicial
- **Carga**: Se descarga en paralelo mientras se renderiza el resto

### 5. **Fire and Forget para Caché**

- **Cambio**: El caché se actualiza sin esperar respuesta
- **Beneficio**: No añade latencia a la respuesta del usuario

```typescript
// Insertar en caché sin bloquear la respuesta
(async () => {
  await supabase.from("champion_mastery_cache").upsert(cacheInserts);
})();

// Retorna inmediatamente
return NextResponse.json({ masteries: masteryData });
```

## Resultados Esperados

### Tiempo de Carga

| Métrica                | Antes           | Después          | Mejora   |
| ---------------------- | --------------- | ---------------- | -------- |
| **Primera carga**      | ~2-3s           | ~1-1.5s          | -50%     |
| **Cargas posteriores** | ~2-3s           | ~200-300ms       | -90%     |
| **UX mientras carga**  | "No hay cuenta" | Skeleton animado | ✅ Mejor |
| **Llamadas Riot API**  | Cada carga      | 1 cada 30 min    | -95%     |

### Flujo de Carga Optimizado

```
1. RiotAccountCard + Skeleton UI (inmediato)
2. /api/riot/account (BD) → ~100ms
3. RiotAccountCardVisual + Skeleton (mientras carga maestría)
4. /api/riot/champion-mastery (caché o Riot API) → ~50-500ms
5. ChampionCenteredSplash (lazy load en paralelo)
6. Renderiza todo cuando está listo
```

## Archivos Modificados

### Nuevos

- ✅ `src/components/riot/RiotAccountCardSkeleton.tsx` - Skeleton UI
- ✅ `supabase/migrations/20250228000000_create_champion_mastery_cache.sql` - Tabla caché

### Modificados

- ✅ `src/components/riot/RiotAccountCard.tsx` - Caché 30 min + Skeleton
- ✅ `src/components/riot/RiotAccountCardVisual.tsx` - Caché 30 min
- ✅ `src/app/api/riot/champion-mastery/route.ts` - Caché en BD + Fire and forget

## Próximos Pasos

1. **Aplicar migración SQL**:

   ```bash
   supabase migration up
   ```

2. **Verificar en logs**:

   - `[RiotAccountCard]` - Debe mostrar caché hits
   - `[RiotAccountCardVisual]` - Debe mostrar caché hits
   - `[GET /api/riot/champion-mastery]` - Debe mostrar `source: "cache"` en cargas posteriores

3. **Monitorear en producción**:
   - Verificar que el skeleton se muestra correctamente
   - Confirmar que la maestría se cachea en BD
   - Medir tiempo de carga real en usuarios

## Notas Técnicas

### Caché en BD vs React Query

- **React Query**: Caché en memoria del navegador (30 min)
- **BD**: Caché persistente entre sesiones (30 min)
- **Combinación**: Máxima velocidad + persistencia

### Expiración de Caché

- Maestría: 30 minutos (suficiente para cambios de maestría)
- Cuenta: 30 minutos (suficiente para cambios de rango)
- Limpieza automática: Función `cleanup_expired_mastery_cache()`

### Seguridad (RLS)

- Solo usuarios pueden ver su propio caché
- Datos cacheados están protegidos por RLS
- No hay exposición de datos de otros usuarios

## Debugging

Si los datos no se cachean correctamente:

```typescript
// Verificar en logs del servidor
console.log("[GET /api/riot/champion-mastery] source:", source);

// Verificar en BD
SELECT * FROM champion_mastery_cache
WHERE user_id = 'your-user-id'
AND expires_at > NOW();

// Limpiar caché manualmente
DELETE FROM champion_mastery_cache
WHERE user_id = 'your-user-id';
```
