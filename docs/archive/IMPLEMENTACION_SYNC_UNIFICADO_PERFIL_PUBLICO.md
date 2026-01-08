# Implementación: Sincronización Unificada en Perfil Público

## Objetivo

Permitir que visitantes de un perfil público puedan actualizar la información de la cuenta Riot (LP, wins/losses, rangos, etc.) Y el historial de partidas con un **único botón**, mientras que el botón "Desvincular" solo aparece en el perfil propio (`/perfil`).

## Cambios Realizados

### 1. Actualización: `RiotAccountCardVisual.tsx`

**Cambios principales**:

#### Renderizado condicional de botones:

```typescript
{onSync && (
  <button onClick={onSync} ...>
    Actualizar Datos
  </button>
)}

{onUnlink && (
  <button onClick={onUnlink} ...>
    Desvincular
  </button>
)}
```

**Resultado**:

- Si `onSync` no se pasa → botón "Actualizar Datos" no aparece
- Si `onUnlink` no se pasa → botón "Desvincular" no aparece
- En `/perfil` (propio): ambos botones visibles (se pasan ambos callbacks)
- En `/perfil/[id]` (público): solo botón "Actualizar Datos" visible (solo se pasa `onSync`)

### 2. Nuevo Endpoint: `/api/riot/account/public/sync`

**Ubicación**: `src/app/api/riot/account/public/sync/route.ts`

**Flujo**:

1. Recibe `x-user-id` en headers (ID del usuario cuya cuenta se sincroniza)
2. Obtiene cuenta Riot vinculada del usuario desde `linked_accounts_riot`
3. **Sincroniza estadísticas de cuenta**:
   - Llama `syncRiotStats()` para refrescar LP, wins/losses, rangos, nivel, icono, etc.
   - Actualiza tabla `linked_accounts_riot` con datos nuevos
4. **Sincroniza historial de partidas**:
   - Llama `syncMatchHistory()` para traer últimas 100 partidas
   - Guarda nuevas partidas en BD
5. **Limpia cachés**:
   - `player_stats_cache` (estadísticas agregadas)
   - `match_history_cache` (primeras 5 partidas)
6. Devuelve datos actualizados

**Respuestas**:

- 200: Éxito (cuenta + partidas sincronizadas)
- 400: `x-user-id` no proporcionado
- 404: No hay cuenta Riot vinculada
- 500: Error interno

### 3. Actualización: `/perfil/[username]/page.tsx`

**Cambios principales**:

#### Imports:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
```

#### Estado y mutación:

```typescript
const queryClient = useQueryClient();
const [syncError, setSyncError] = useState<string | null>(null);

const syncMutation = useMutation({
  mutationFn: async () => {
    const response = await fetch("/api/riot/account/public/sync", {
      method: "POST",
      headers: {
        "x-user-id": profile.id, // ID del usuario visitado
      },
    });
    // ...
  },
  onSuccess: async (data) => {
    // Invalidar queries de historial y maestría
    queryClient.invalidateQueries({ queryKey: ["match-history", profile?.id] });
    queryClient.invalidateQueries({
      queryKey: ["match-history-cache", profile?.id],
    });
    queryClient.invalidateQueries({
      queryKey: ["champion-mastery", riotAccount.puuid],
    });

    // Recargar datos de la cuenta
    const newResponse = await fetch(
      `/api/riot/account/public?publicId=${publicId}`
    );
    if (newResponse.ok) {
      const newData = await newResponse.json();
      setRiotAccount(newData.account);
    }
  },
});
```

#### Renderizado de tarjeta:

```typescript
<RiotAccountCardVisual
  account={riotAccount}
  isLoading={loadingRiotAccount || syncMutation.isPending}
  isSyncing={syncMutation.isPending}
  syncError={syncError}
  onSync={() => syncMutation.mutate()} // ✅ Botón visible
  // onUnlink no se pasa → botón no aparece
/>
```

### 4. Actualización: `MobileUserProfileLayout.tsx`

**Cambios principales**:

#### Props interface:

```typescript
interface MobileUserProfileLayoutProps {
  profile: ProfileData;
  riotAccount?: LinkedAccountRiot | null;
  onSync?: () => void;
  isSyncing?: boolean;
  syncError?: string | null;
}
```

#### Renderizado de tarjeta:

```typescript
<RiotAccountCardVisual
  account={riotAccount}
  isSyncing={isSyncing}
  syncError={syncError}
  onSync={onSync} // ✅ Botón visible si se pasa
/>
```

#### Desde `/perfil/[username]/page.tsx`:

```typescript
<MobileUserProfileLayout
  profile={profile}
  riotAccount={riotAccount}
  onSync={() => syncMutation.mutate()}
  isSyncing={syncMutation.isPending}
  syncError={syncError}
/>
```

## Flujo de Datos

```
Visitante en /perfil/[id]
  ├─ Carga perfil y cuenta Riot
  ├─ Ve tarjeta con botón "Actualizar Datos" (sin "Desvincular")
  └─ Al hacer clic:
     ├─ Llama POST /api/riot/account/public/sync con x-user-id
     ├─ Endpoint sincroniza:
     │  ├─ Estadísticas de cuenta (LP, wins, rangos, etc.)
     │  └─ Historial de partidas (últimas 100)
     ├─ Limpia cachés
     ├─ Devuelve datos actualizados
     └─ Frontend invalida queries y recarga:
        ├─ Tarjeta de cuenta (con nuevos datos)
        ├─ Historial de partidas
        └─ Estadísticas de campeones
```

## Comportamiento

### Desktop

1. Usuario visita `/perfil/username`
2. Se carga perfil y cuenta Riot (si existe)
3. En pestaña "League of Legends":
   - Tarjeta muestra botón "Actualizar Datos" (sin "Desvincular")
   - Al hacer clic: sincroniza todo (cuenta + partidas)
   - Spinner indica progreso
   - Datos se refrescan automáticamente

### Mobile

- Mismo comportamiento que desktop
- Botón accesible en la tarjeta
- Historial se actualiza al sincronizar

### Perfil Propio (`/perfil`)

- Tarjeta muestra **ambos botones**: "Actualizar Datos" + "Desvincular"
- Comportamiento sin cambios (usa endpoints existentes)

## Ventajas

✅ **Un solo botón para todo**: Actualiza cuenta + partidas en una acción
✅ **Botón "Desvincular" privado**: Solo visible en perfil propio
✅ **Endpoint reutilizable**: Funciona para cualquier usuario (no requiere autenticación)
✅ **Cachés limpios**: Automáticamente invalida queries para refrescar datos
✅ **UX mejorada**: Visitantes pueden ver datos actualizados sin recargar página
✅ **Seguridad**: No expone acciones privadas en perfiles públicos

## Archivos Modificados

1. ✅ `src/components/riot/RiotAccountCardVisual.tsx`

   - Renderizado condicional de botones

2. ✅ `src/app/api/riot/account/public/sync/route.ts` (NUEVO)

   - Endpoint de sincronización pública

3. ✅ `src/app/perfil/[username]/page.tsx`

   - Mutación de sincronización
   - Invalidación de queries
   - Props a `RiotAccountCardVisual`

4. ✅ `src/components/perfil/MobileUserProfileLayout.tsx`
   - Props para sincronización
   - Renderizado de tarjeta con callbacks

## Testing

Para verificar la implementación:

1. **Perfil público (visitante)**:

   - Visita `/perfil/username` de otro usuario
   - Pestaña "League of Legends" debe mostrar:
     - ✅ Botón "Actualizar Datos"
     - ❌ NO botón "Desvincular"
   - Al hacer clic: debe sincronizar cuenta + partidas

2. **Perfil propio**:

   - Visita `/perfil`
   - Pestaña "League of Legends" debe mostrar:
     - ✅ Botón "Actualizar Datos"
     - ✅ Botón "Desvincular"
   - Ambos botones deben funcionar

3. **Mobile**:
   - Mismo comportamiento en pantalla pequeña
   - Botones accesibles en tarjeta

## Próximos Pasos (Opcionales)

1. Agregar cooldown de sincronización (ej: máximo 1 vez por minuto)
2. Mostrar timestamp de última sincronización
3. Agregar notificación toast al completar sincronización
4. Implementar retry automático en caso de error
5. Agregar estadísticas de cambios (ej: "+50 LP", "-2 victorias")
