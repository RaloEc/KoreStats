# SharedMatchCard - Estructura Modularizada

Este directorio contiene la versión modularizada del componente `SharedMatchCard`, dividido en módulos más pequeños y manejables para mejor mantenibilidad.

## Estructura

```
shared-match-card/
├── index.tsx                    # Componente principal (exporta SharedMatchCard)
├── types.ts                     # Tipos e interfaces TypeScript
├── constants.ts                 # Constantes (mapas de iconos, etiquetas, colores)
├── helpers.ts                   # Funciones auxiliares y utilidades
├── hooks/
│   ├── useRuneIcons.ts         # Hook para cargar iconos de runas dinámicamente
│   └── useMobileCarousel.ts    # Hook para manejar el carrusel móvil
├── components/
│   ├── ComparativeBullet.tsx   # Barra comparativa reutilizable
│   └── MatchItems.tsx          # Sección de items del jugador
└── utils/
    └── calculations.ts         # Cálculos de estadísticas de equipo y jugador
```

## Beneficios de la Modularización

1. **Mejor organización**: Cada archivo tiene una responsabilidad clara
2. **Más fácil de mantener**: Los cambios se hacen en archivos más pequeños
3. **Reutilización**: Los componentes y hooks pueden usarse en otros lugares
4. **Testing más simple**: Cada módulo puede testearse independientemente
5. **Mejor performance**: Imports más específicos y tree-shaking mejorado

## Uso

```tsx
import { SharedMatchCard } from "@/components/perfil/shared-match-card";

// Usar exactamente igual que antes
<SharedMatchCard
  partida={matchData}
  userColor="#3b82f6"
  isOwnProfile={true}
  // ... otras props
/>;
```

## Migración

El componente mantiene **exactamente la misma funcionalidad y API** que el original.
No se requieren cambios en los componentes que lo usan.
