# Sincronización de Estadísticas de Riot Games

## 📋 Descripción General

Este documento explica cómo funciona la sincronización automática y manual de estadísticas de Riot Games (League of Legends) en tu aplicación.

## 🔄 Flujo de Sincronización

### Sincronización Automática (OAuth Callback)

Cuando un usuario vincula su cuenta de Riot por primera vez:

```
1. Usuario completa OAuth
   ↓
2. GET /api/riot/callback recibe el código
   ↓
3. Se intercambia por tokens
   ↓
4. Se obtiene información del jugador (PUUID, nombre, tag)
   ↓
5. syncRiotStats() se ejecuta automáticamente
   ↓
6. Se obtienen:
   - Shard activo (región exacta)
   - Datos del invocador (nivel, ícono)
   - Información de rango (tier, rank, LP, W/L)
   ↓
7. Se guarda todo en linked_accounts_riot
   ↓
8. Usuario redirigido a /perfil?riot_success=true
```

### Sincronización Manual

Los usuarios pueden actualizar sus estadísticas en cualquier momento:

```
1. Usuario hace click en "Actualizar" en RiotAccountCard
   ↓
2. POST /api/riot/sync
   ↓
3. Se obtiene la cuenta de Riot vinculada
   ↓
4. syncRiotStats() se ejecuta
   ↓
5. Se actualizan los datos en la BD
   ↓
6. Se recargan los datos en el componente
```

## 🔧 Funciones Principales

### syncRiotStats(puuid, accessToken, routingRegion)

Sincroniza todas las estadísticas del jugador.

**Parámetros:**

- `puuid` (string): PUUID del jugador
- `accessToken` (string): API Key de Riot
- `routingRegion` (string): Región de enrutamiento (americas, europe, asia, sea)

**Retorna:**

```typescript
{
  success: boolean;
  data?: {
    activeShard: string;           // ej: 'la1', 'euw1'
    summonerId: string;            // ID encriptado
    summonerLevel: number;         // 1-30
    profileIconId: number;         // ID del ícono
    tier: string;                  // IRON, BRONZE, SILVER, GOLD, PLATINUM, DIAMOND, MASTER, GRANDMASTER, CHALLENGER, UNRANKED
    rank: string | null;           // I, II, III, IV (null si UNRANKED)
    leaguePoints: number;          // 0-100
    wins: number;                  // Victorias en Ranked Solo
    losses: number;                // Derrotas en Ranked Solo
  };
  error?: string;
}
```

### Proceso Interno de syncRiotStats

#### 1. Detectar Shard Activo

```
GET https://{routingRegion}.api.riotgames.com/riot/account/v1/active-shards/by-game/lol/by-puuid/{puuid}
Authorization: Bearer {RIOT_API_KEY}

Respuesta:
{
  "activeShard": "la1"
}
```

#### 2. Obtener Datos del Invocador

```
GET https://{activeShard}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}
Authorization: Bearer {RIOT_API_KEY}

Respuesta:
{
  "id": "encrypted_summoner_id",
  "summonerLevel": 30,
  "profileIconId": 4567
}
```

#### 3. Obtener Información de Rango

```
GET https://{activeShard}.api.riotgames.com/lol/league/v4/entries/by-summoner/{summonerId}
Authorization: Bearer {RIOT_API_KEY}

Respuesta (array):
[
  {
    "queueType": "RANKED_SOLO_5x5",
    "tier": "GOLD",
    "rank": "IV",
    "leaguePoints": 75,
    "wins": 45,
    "losses": 38
  },
  {
    "queueType": "RANKED_FLEX_SR",
    "tier": "SILVER",
    ...
  }
]

Nota: Se filtra por RANKED_SOLO_5x5
Si no hay datos, se retorna UNRANKED
```

## 📊 Campos en la Base de Datos

La tabla `linked_accounts_riot` ahora incluye:

| Campo           | Tipo         | Descripción                         |
| --------------- | ------------ | ----------------------------------- |
| `active_shard`  | VARCHAR(50)  | Shard activo (ej: 'la1')            |
| `summoner_id`   | VARCHAR(255) | ID encriptado del invocador         |
| `tier`          | VARCHAR(50)  | Rango (IRON, BRONZE, ..., UNRANKED) |
| `rank`          | VARCHAR(10)  | Subdivisión (I, II, III, IV)        |
| `league_points` | INTEGER      | Puntos de liga (0-100)              |
| `wins`          | INTEGER      | Victorias en Ranked Solo            |
| `losses`        | INTEGER      | Derrotas en Ranked Solo             |

## 🎯 Endpoints Disponibles

### POST /api/riot/sync

Sincroniza manualmente las estadísticas del usuario autenticado.

**Autenticación:** Requerida (usuario autenticado)

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "message": "Estadísticas sincronizadas exitosamente",
  "data": {
    "activeShard": "la1",
    "summonerId": "...",
    "summonerLevel": 30,
    "profileIconId": 4567,
    "tier": "GOLD",
    "rank": "IV",
    "leaguePoints": 75,
    "wins": 45,
    "losses": 38
  }
}
```

**Errores:**

- 401: Usuario no autenticado
- 404: No hay cuenta de Riot vinculada
- 500: Error al sincronizar

## 🔐 Manejo de Errores

### Casos Especiales

**Usuario sin Ranked:**

```
GET /lol/league/v4/entries/by-summoner/{id}
Respuesta: 404 Not Found

Resultado: Se guarda tier='UNRANKED', rank=null, LP=0, W/L=0
```

**API Key Inválida:**

```
Respuesta: 403 Forbidden

Resultado: Error en sincronización, se mantienen datos anteriores
```

**Shard No Disponible:**

```
Respuesta: 404 Not Found

Resultado: Error en sincronización
```

## 📱 Componente React: RiotAccountCard

El componente muestra toda la información sincronizada:

```tsx
import { RiotAccountCard } from "@/components/riot/RiotAccountCard";

<RiotAccountCard
  onUnlink={() => {
    // Manejar desvinculación
    window.location.reload();
  }}
/>;
```

**Características:**

- Muestra información del jugador
- Muestra rango actual (tier, rank, LP)
- Muestra W/L en Ranked Solo
- Botón para actualizar estadísticas manualmente
- Botón para desvincular cuenta
- Manejo de errores de sincronización

## 🚀 Flujo Completo de Usuario

### Primera Vez (OAuth)

```
1. Usuario hace click en "Vincular Cuenta de Riot"
2. Se redirige a /api/riot/login
3. Usuario autoriza en Riot
4. Riot redirige a /api/riot/callback?code=...
5. Se intercambia código por tokens
6. Se obtiene PUUID y nombre del jugador
7. syncRiotStats() obtiene automáticamente:
   - Shard activo
   - Nivel e ícono
   - Rango actual
8. Se guarda todo en BD
9. Usuario ve su perfil con estadísticas completas
```

### Actualizaciones Posteriores

```
1. Usuario hace click en "Actualizar" en RiotAccountCard
2. POST /api/riot/sync se ejecuta
3. Se obtienen nuevas estadísticas
4. Se actualizan en BD
5. Componente se refresca automáticamente
```

## 🔄 Frecuencia de Sincronización Recomendada

- **Automática (OAuth)**: Una sola vez al vincular
- **Manual**: Cuando el usuario lo solicite
- **Programada (opcional)**: Cada 24 horas (requiere cron job)

## 📝 Notas Importantes

1. **API Key de Riot**: Se usa para obtener estadísticas, NO para OAuth
2. **Shard Activo**: Necesario para consultar estadísticas del jugador
3. **UNRANKED**: Se asigna si el usuario no ha jugado Ranked Solo
4. **Caché**: Los datos se cachean 5 minutos en el cliente
5. **Errores No Fatales**: Si la sincronización falla, se mantienen datos anteriores

## 🐛 Troubleshooting

### "Error al sincronizar estadísticas"

**Posibles causas:**

- API Key de Riot inválida o expirada
- Usuario no tiene cuenta de League of Legends
- Shard no disponible
- Problema de conectividad

**Solución:**

- Verificar RIOT_API_KEY en .env.local
- Asegurarse de que el usuario tiene LoL instalado
- Reintentar más tarde

### "No hay cuenta de Riot vinculada"

**Causa:** El usuario no ha completado el OAuth

**Solución:** Hacer click en "Vincular Cuenta de Riot"

### Estadísticas desactualizadas

**Causa:** El caché de 5 minutos aún está activo

**Solución:** Hacer click en "Actualizar" para forzar sincronización

## 📚 Referencias

- [Riot API Documentation](https://developer.riotgames.com/apis)
- [Active Shards Endpoint](https://developer.riotgames.com/apis#lol-account-v1)
- [Summoner V4 Endpoint](https://developer.riotgames.com/apis#lol-summoner-v4)
- [League V4 Endpoint](https://developer.riotgames.com/apis#lol-league-v4)
