# Diseño Visual de Tarjeta de Riot Games

## 📋 Descripción General

Se ha implementado un diseño visual mejorado y moderno para la tarjeta de cuenta de Riot Games con emblemas oficiales, barra de winrate y cooldown de sincronización.

## 🎨 Componentes Visuales

### RiotAccountCardVisual

Componente principal que muestra la información de forma visual atractiva.

**Características:**

- Banner horizontal con gradiente
- Ícono del invocador (redondo con borde)
- Nombre y tag del jugador
- Nivel del invocador
- Emblema de rango oficial
- Información de rango (tier, rank, LP)
- Barra visual de winrate (verde/rojo)
- Botones de acción (Actualizar, Desvincular)
- Cooldown visual de 60 segundos

### Estructura del Banner

```
┌─────────────────────────────────────────────────────────────┐
│  [ÍCONO]  │  NOMBRE#TAG                    │  [EMBLEMA]    │
│  Nivel 30 │  Región LA1                    │  GOLD IV      │
│           │  ████████░░ 80% Winrate        │  75 LP        │
│           │  45W - 11L                     │               │
└─────────────────────────────────────────────────────────────┘
```

## 🖼️ Emblemas de Rango

### URLs de CommunityDragon

```
https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-{tier}.png
```

**Tiers Soportados:**

- `emblem-iron.png` - Hierro
- `emblem-bronze.png` - Bronce
- `emblem-silver.png` - Plata
- `emblem-gold.png` - Oro
- `emblem-platinum.png` - Platino
- `emblem-diamond.png` - Diamante
- `emblem-master.png` - Maestro
- `emblem-grandmaster.png` - Gran Maestro
- `emblem-challenger.png` - Desafiante
- `emblem-unranked.png` - Sin Rango

### Función getRankEmblemUrl()

```typescript
import { getRankEmblemUrl } from "@/lib/riot/rank-emblems";

const url = getRankEmblemUrl("GOLD");
// Retorna: https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-gold.png
```

## 📊 Barra de Winrate

### Cálculo

```typescript
winrate = (wins / (wins + losses)) * 100;
```

### Colores por Rango

| Winrate | Color        | Clase Tailwind  |
| ------- | ------------ | --------------- |
| ≥ 55%   | Verde Oscuro | `bg-green-600`  |
| 50-54%  | Verde        | `bg-green-500`  |
| 45-49%  | Amarillo     | `bg-yellow-500` |
| < 45%   | Rojo         | `bg-red-500`    |

### Ejemplo

```
Victorias: 45
Derrotas: 11
Total: 56
Winrate: 80%

Barra: ████████░░ (80% lleno)
Color: Verde Oscuro
```

## ⏱️ Cooldown de Sincronización

### Funcionalidad

- **Duración:** 60 segundos después de sincronización exitosa
- **Propósito:** Proteger la API Key de Riot de spam
- **Comportamiento:**
  - Botón deshabilitado durante el cooldown
  - Muestra contador regresivo: "Espera 60s", "Espera 59s", etc.
  - Se reestablece después de 60 segundos

### Implementación

```typescript
const [cooldownSeconds, setCooldownSeconds] = useState(0);

// Iniciar cooldown
setCooldownSeconds(60);

// Efecto para decrementar
useEffect(() => {
  if (cooldownSeconds <= 0) return;

  const timer = setTimeout(() => {
    setCooldownSeconds((prev) => Math.max(0, prev - 1));
  }, 1000);

  return () => clearTimeout(timer);
}, [cooldownSeconds]);
```

## 🎯 Funciones Auxiliares

### getRankEmblemUrl(tier)

Obtiene la URL del emblema de rango.

```typescript
getRankEmblemUrl("GOLD"); // → URL de emblema gold
getRankEmblemUrl("UNRANKED"); // → URL de emblema gris
```

### getTierColor(tier)

Obtiene el color hexadecimal del tier.

```typescript
getTierColor("GOLD"); // → '#ffd700'
getTierColor("DIAMOND"); // → '#b9f2ff'
```

### getTierDisplayName(tier)

Obtiene el nombre formateado del tier.

```typescript
getTierDisplayName("GOLD"); // → 'Gold'
getTierDisplayName("PLATINUM"); // → 'Platinum'
```

### calculateWinrate(wins, losses)

Calcula el porcentaje de winrate.

```typescript
calculateWinrate(45, 11); // → 80
```

### getWinrateColor(winrate)

Obtiene la clase de color según el winrate.

```typescript
getWinrateColor(80); // → 'bg-green-600'
getWinrateColor(50); // → 'bg-green-500'
getWinrateColor(45); // → 'bg-yellow-500'
```

## 🎨 Colores por Tier

| Tier        | Color      | Hex     |
| ----------- | ---------- | ------- |
| Iron        | Gris Acero | #a09b8c |
| Bronze      | Cobre      | #cd7f32 |
| Silver      | Plata      | #c0c0c0 |
| Gold        | Oro        | #ffd700 |
| Platinum    | Platino    | #e5e4e2 |
| Diamond     | Diamante   | #b9f2ff |
| Master      | Púrpura    | #9d4edd |
| Grandmaster | Rojo       | #ff0000 |
| Challenger  | Azul       | #0099ff |
| Unranked    | Gris       | #808080 |

## 📱 Uso del Componente

### Con Diseño Visual (Recomendado)

```tsx
import { RiotAccountCard } from "@/components/riot/RiotAccountCard";

<RiotAccountCard
  useVisualDesign={true}
  onUnlink={() => window.location.reload()}
/>;
```

### Con Diseño Clásico

```tsx
<RiotAccountCard
  useVisualDesign={false}
  onUnlink={() => window.location.reload()}
/>
```

## 🔄 Flujo de Sincronización Visual

```
Usuario hace click en "Actualizar"
         ↓
Botón muestra: "Sincronizando..." (spinner)
         ↓
Solicitud a /api/riot/sync
         ↓
Sincronización exitosa
         ↓
Cooldown inicia: "Espera 60s"
         ↓
Contador regresivo: 59s, 58s, ..., 1s
         ↓
Botón se habilita nuevamente
```

## 🖼️ Ícono del Invocador

### Fuente

```
https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/{profileIconId}.jpg
```

### Fallback

Si la imagen no carga, se muestra un gradiente con la primera letra del nombre del jugador.

```tsx
<div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
  {account.game_name.charAt(0)}
</div>
```

## 🎯 Mejoras Implementadas

✅ **Diseño Moderno:** Banner horizontal con gradiente
✅ **Emblemas Oficiales:** Imágenes de CommunityDragon
✅ **Barra Visual:** Representación gráfica del winrate
✅ **Cooldown:** Protección contra spam de API
✅ **Responsive:** Se adapta a diferentes tamaños
✅ **Accesible:** Contraste adecuado y etiquetas semánticas
✅ **Rápido:** Imágenes optimizadas de CommunityDragon

## 📚 Archivos Relacionados

- `src/lib/riot/rank-emblems.ts` - Funciones auxiliares
- `src/components/riot/RiotAccountCardVisual.tsx` - Componente visual
- `src/components/riot/RiotAccountCard.tsx` - Componente principal
- `src/types/riot.ts` - Tipos TypeScript

## 🔒 Protección de API

El cooldown de 60 segundos protege tu API Key de:

- Spam de sincronización
- Abuso de recursos
- Límites de rate limiting de Riot

## 🚀 Próximos Pasos

1. Probar el nuevo diseño visual
2. Ajustar colores según preferencias
3. Agregar animaciones adicionales (opcional)
4. Crear versión para dispositivos móviles (opcional)
