# Implementación: Pestaña League of Legends en Perfil Público

## Objetivo

Implementar la pestaña de League of Legends en `/perfil/[id]` para mostrar la información de la cuenta Riot vinculada del usuario visitado, incluyendo tarjeta visual, resumen de campeones e historial de partidas.

## Cambios Realizados

### 1. Nuevo Endpoint: `/api/riot/account/public`

**Ubicación**: `src/app/api/riot/account/public/route.ts`

Obtiene la cuenta Riot de un usuario público por su `public_id`:

- **Query param**: `publicId` (requerido)
- **Flujo**:
  1. Busca el perfil en tabla `perfiles` por `public_id`
  2. Si existe, obtiene la cuenta Riot vinculada desde `linked_accounts_riot`
  3. Retorna datos completos de la cuenta o 404 si no existe
- **Respuestas**:
  - 200: Cuenta encontrada
  - 400: `publicId` no proporcionado
  - 404: Usuario o cuenta Riot no encontrada
  - 500: Error interno

### 2. Actualización: `/perfil/[username]/page.tsx`

**Cambios principales**:

#### Imports agregados:

```typescript
import { useSearchParams } from "next/navigation";
import { ProfileTabs } from "@/components/perfil/ProfileTabs";
import { LinkedAccountRiot } from "@/types/riot";
import { RiotAccountCardVisual } from "@/components/riot/RiotAccountCardVisual";
import { ChampionStatsSummary } from "@/components/riot/ChampionStatsSummary";
import { MatchHistoryList } from "@/components/riot/MatchHistoryList";
```

#### Estado y lógica:

- Lee `activeTab` desde `searchParams.get('tab')` (default: 'posts')
- Estado `riotAccount` para almacenar cuenta Riot del usuario visitado
- `useEffect` que carga la cuenta Riot vía `/api/riot/account/public?publicId={publicId}`

#### Estructura de tabs:

- **Pestaña "posts"**: Muestra feed de actividad (comportamiento original)
- **Pestaña "lol"**: Muestra:
  - `RiotAccountCardVisual`: Tarjeta visual con información de la cuenta
  - `ChampionStatsSummary`: Top 5 campeones más jugados
  - `MatchHistoryList`: Historial de partidas del usuario (pasando `userId` y `puuid`)
  - Mensaje vacío si no hay cuenta Riot vinculada

#### Props pasados a componentes:

- `RiotAccountCardVisual`: `account={riotAccount}`, `isLoading={loadingRiotAccount}`
- `ChampionStatsSummary`: `puuid={riotAccount.puuid}`, `limit={5}`
- `MatchHistoryList`: `userId={profile.id}`, `puuid={riotAccount.puuid}`

### 3. Actualización: `MobileUserProfileLayout.tsx`

**Cambios principales**:

#### Imports agregados:

```typescript
import { useSearchParams, useRouter } from "next/navigation";
import { ProfileTabs } from "@/components/perfil/ProfileTabs";
import { RiotAccountCardVisual } from "@/components/riot/RiotAccountCardVisual";
import { ChampionStatsSummary } from "@/components/riot/ChampionStatsSummary";
import { MatchHistoryList } from "@/components/riot/MatchHistoryList";
import type { LinkedAccountRiot } from "@/types/riot";
```

#### Props interface:

```typescript
interface MobileUserProfileLayoutProps {
  profile: ProfileData;
  riotAccount?: LinkedAccountRiot | null;
}
```

#### Lógica:

- Lee `activeTab` desde `searchParams`
- Renderiza `ProfileTabs` debajo del header
- Muestra contenido según tab activo:
  - **"posts"**: Feed de actividad (original)
  - **"lol"**: Tarjeta Riot + Campeones + Historial (igual que desktop)

### 4. Integración en `/perfil/[username]/page.tsx`

```typescript
// Layout móvil
if (isMobile) {
  return (
    <MobileUserProfileLayout profile={profile} riotAccount={riotAccount} />
  );
}
```

## Flujo de Datos

```
/perfil/[username]/page.tsx
  ├─ usePerfilUsuario(publicId)
  │  └─ Obtiene ProfileData (perfil, stats, actividad)
  │
  ├─ useEffect: fetch(/api/riot/account/public?publicId={publicId})
  │  └─ Obtiene LinkedAccountRiot o null
  │
  ├─ Desktop Layout:
  │  ├─ PerfilHeader
  │  ├─ ProfileTabs (hasRiotAccount={!!riotAccount})
  │  └─ Contenido según tab:
  │     ├─ posts: FeedActividad + EstadisticasUnificadas
  │     └─ lol: RiotAccountCardVisual + ChampionStatsSummary + MatchHistoryList
  │
  └─ Mobile Layout:
     ├─ PerfilHeader
     ├─ ProfileTabs
     └─ Contenido según tab (igual que desktop)
```

## Archivos Modificados

1. ✅ `src/app/api/riot/account/public/route.ts` (NUEVO)

   - Endpoint para obtener cuenta Riot pública

2. ✅ `src/app/perfil/[username]/page.tsx`

   - Integración de ProfileTabs
   - Carga de cuenta Riot pública
   - Renderizado condicional de pestaña LoL

3. ✅ `src/components/perfil/MobileUserProfileLayout.tsx`
   - Soporte para prop `riotAccount`
   - Integración de ProfileTabs
   - Renderizado condicional de pestaña LoL

## Comportamiento

### Desktop

- Usuario visita `/perfil/username`
- Se carga el perfil y la cuenta Riot (si existe)
- Por defecto muestra pestaña "Actividad"
- Al hacer clic en "League of Legends":
  - URL cambia a `/perfil/username?tab=lol`
  - Se muestra tarjeta Riot, campeones e historial
  - Si no hay cuenta, muestra mensaje vacío

### Mobile

- Mismo flujo que desktop
- Tabs se muestran debajo del header
- Contenido se adapta al ancho de pantalla
- Historial de partidas es scrolleable

## Estados de Carga

- **Cargando perfil**: `PerfilSkeleton`
- **Error en perfil**: `PerfilError`
- **Cargando cuenta Riot**: `loadingRiotAccount` (spinner en `RiotAccountCardVisual`)
- **Sin cuenta Riot**: Mensaje vacío en pestaña LoL

## Notas Técnicas

1. **Reutilización de componentes**: Se usan los mismos componentes que en `/perfil` (propia cuenta)
2. **Props diferenciados**:
   - `MatchHistoryList` recibe `userId` del perfil visitado (no del usuario autenticado)
   - `RiotAccountCardVisual` no muestra botones de sincronización/desvinculación (solo lectura)
3. **Caché**: Los datos se cachean en React Query con TTL estándar
4. **Seguridad**: El endpoint `/api/riot/account/public` usa `getServiceClient()` (sin autenticación requerida)

## Próximos Pasos (Opcionales)

1. Agregar botón "Ver más" en `ChampionStatsSummary` para expandir a todos los campeones
2. Implementar filtros en `MatchHistoryList` para perfiles públicos
3. Agregar estadísticas agregadas (winrate, KDA promedio) en la pestaña LoL
4. Mostrar badges de logros si existen en la BD
5. Agregar comparativa de estadísticas si el usuario está autenticado

## Testing

Para verificar la implementación:

1. **Desktop**: Visita `/perfil/username?tab=lol`

   - Debe mostrar tarjeta Riot, campeones e historial
   - Sin cuenta Riot: mensaje vacío

2. **Mobile**: Mismo flujo en pantalla pequeña

   - Tabs deben ser clickeables
   - Contenido debe ser scrolleable

3. **Sin autenticación**: Debe funcionar igual

   - El endpoint `/api/riot/account/public` no requiere sesión

4. **Usuario sin cuenta Riot**: Debe mostrar mensaje amigable
   - Pestaña LoL disponible pero vacía
