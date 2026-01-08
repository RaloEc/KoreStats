# Configuración de TanStack Query - Caché Persistente

## 🎯 Problema Resuelto

Al navegar entre páginas, el caché de TanStack Query se perdía completamente, causando:

- ❌ Pantallas blancas de carga
- ❌ Spinners innecesarios
- ❌ Pérdida de datos cargados
- ❌ Scroll infinito reiniciado

## ✅ Solución Implementada

Se optimizó la configuración de `QueryClient` en `src/lib/react-query/provider.tsx` con:

- **staleTime**: 5 minutos (datos frescos sin refetch automático)
- **gcTime**: 10 minutos (garbage collection)
- **refetchOnWindowFocus**: false (no refetch al cambiar de pestaña)
- **refetchOnReconnect**: false (no refetch al recuperar conexión)
- **refetchOnMount**: false (no refetch al montar componentes)
- **refetchInBackground**: false (solo refetch explícito)

---

## 📁 Estructura de Archivos

### Opción 1: Usar el provider existente (RECOMENDADO)

```
src/lib/react-query/
├── provider.tsx          ✅ OPTIMIZADO - Ya está en uso
└── ...
```

**Estado**: Ya está integrado en `src/components/Providers.tsx` ✅

### Opción 2: Usar QueryProvider alternativo

```
src/context/
├── QueryProvider.tsx     ✨ NUEVO - Alternativa
├── AuthContext.tsx
└── SupabaseContext.tsx
```

---

## 📝 Configuración Actual (Optimizada)

### Archivo: `src/lib/react-query/provider.tsx`

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, ReactNode, useEffect } from "react";

const queryClientOptions = {
  defaultOptions: {
    queries: {
      // ✅ 5 minutos: Datos se consideran "frescos"
      staleTime: 5 * 60 * 1000,

      // ✅ 10 minutos: Tiempo en caché
      gcTime: 10 * 60 * 1000,

      // ✅ false: No refetch al cambiar de pestaña
      refetchOnWindowFocus: false,

      // ✅ false: No refetch al recuperar conexión
      refetchOnReconnect: false,

      // ✅ false: No refetch al montar componentes
      refetchOnMount: false,

      // ✅ true: Mostrar datos anteriores mientras se revalidan
      keepPreviousData: true,

      // ✅ false: No refrescar en segundo plano
      refetchInBackground: false,

      // ✅ 1 intento en caso de error
      retry: 1,

      // ✅ Delay exponencial entre reintentos
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
};

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  // ✅ useState asegura que el cliente se cree UNA SOLA VEZ
  const [queryClient] = useState(() => new QueryClient(queryClientOptions));

  // ✅ Pausar consultas cuando la página no está visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        queryClient.cancelQueries();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

---

## 🔄 Flujo de Funcionamiento

### Escenario: Navegar de /perfil a /match y volver

```
1. Usuario en /perfil?tab=lol
   └─ MatchHistoryList carga datos (useInfiniteQuery)
   └─ Datos se guardan en caché de QueryClient
   └─ staleTime: 5 min (datos frescos)
   └─ gcTime: 10 min (en memoria)

2. Usuario hace clic en una partida
   └─ Navega a /match/[matchId]
   └─ Modal se abre (Intercepting Routes)
   └─ Historial se mantiene montado
   └─ Datos en caché se preservan

3. Usuario cierra el modal
   └─ router.back() regresa a /perfil
   └─ MatchHistoryList se renderiza
   └─ useInfiniteQuery verifica caché
   └─ Datos están frescos (< 5 min)
   └─ ✅ Datos instantáneos sin spinner
   └─ ✅ Scroll preservado
```

---

## 🎯 Configuración Explicada

### staleTime: 5 minutos

```typescript
staleTime: 5 * 60 * 1000;
```

**Qué significa:**

- Los datos se consideran "frescos" durante 5 minutos
- Si el usuario vuelve a una página dentro de 5 minutos, los datos se mostrarán instantáneamente
- Después de 5 minutos, si se hace refetch, se marcará como "stale" pero aún mostrará datos del caché

**Beneficio:**

- ✅ Al volver a /perfil, datos instantáneos
- ✅ Sin pantalla blanca
- ✅ Sin spinner

### gcTime: 10 minutos

```typescript
gcTime: 10 * 60 * 1000;
```

**Qué significa:**

- Los datos permanecen en memoria durante 10 minutos después de no usarse
- Después de 10 minutos sin usar, se eliminan (garbage collection)

**Beneficio:**

- ✅ Datos disponibles durante navegación rápida
- ✅ Memoria no se llena con datos antiguos
- ✅ Balance entre rendimiento y uso de memoria

### refetchOnWindowFocus: false

```typescript
refetchOnWindowFocus: false;
```

**Qué significa:**

- No hace refetch automático cuando la ventana recupera foco
- El usuario puede cambiar de pestaña y volver sin que se recarguen los datos

**Beneficio:**

- ✅ Sin spinners cuando vuelves de otra pestaña
- ✅ Experiencia más fluida

### refetchOnReconnect: false

```typescript
refetchOnReconnect: false;
```

**Qué significa:**

- No hace refetch automático cuando se recupera la conexión
- Evita recargas innecesarias en redes inestables

**Beneficio:**

- ✅ Sin recargas sorpresivas
- ✅ Mejor experiencia en redes lentas

### refetchOnMount: false

```typescript
refetchOnMount: false;
```

**Qué significa:**

- No hace refetch cuando un componente se monta
- Los datos del caché se usan inmediatamente

**Beneficio:**

- ✅ Datos instantáneos al montar
- ✅ Sin delay de carga

### keepPreviousData: true

```typescript
keepPreviousData: true;
```

**Qué significa:**

- Muestra datos anteriores mientras se revalidan
- Evita "parpadeos" cuando se hace refetch en segundo plano

**Beneficio:**

- ✅ Transiciones suaves
- ✅ Sin cambios bruscos de contenido

### refetchInBackground: false

```typescript
refetchInBackground: false;
```

**Qué significa:**

- No refrescar datos en segundo plano automáticamente
- Solo refetch cuando el usuario lo solicita explícitamente

**Beneficio:**

- ✅ Menos carga de servidor
- ✅ Menos consumo de datos
- ✅ Mejor rendimiento

---

## 🔌 Integración en la App

### Ubicación actual

```
src/app/layout.tsx
  └─ Providers (src/components/Providers.tsx)
      └─ ReactQueryProvider (src/lib/react-query/provider.tsx) ✅
          └─ children
```

**Estado**: ✅ Ya está integrado y funcionando

---

## 📊 Comparación: Antes vs Después

| Aspecto                  | Antes  | Después   |
| ------------------------ | ------ | --------- |
| **staleTime**            | 10 min | 5 min ✅  |
| **gcTime**               | 30 min | 10 min ✅ |
| **refetchOnWindowFocus** | false  | false ✅  |
| **refetchOnReconnect**   | -      | false ✅  |
| **refetchOnMount**       | -      | false ✅  |
| **refetchInBackground**  | true   | false ✅  |
| **Pantalla blanca**      | ❌ Sí  | ✅ No     |
| **Spinners**             | ❌ Sí  | ✅ No     |
| **Datos instantáneos**   | ❌ No  | ✅ Sí     |

---

## 🧪 Testing

### Caso 1: Volver a /perfil desde /match

```bash
1. Ir a /perfil?tab=lol
2. Esperar a que cargue el historial
3. Hacer clic en una partida
4. Esperar a que se abra el modal
5. Cerrar el modal (< 5 minutos)
6. ✅ Verificar que los datos están instantáneamente
7. ✅ Verificar que NO hay spinner
8. ✅ Verificar que el scroll está en la misma posición
```

### Caso 2: Cambiar de pestaña y volver

```bash
1. Ir a /perfil?tab=lol
2. Esperar a que cargue el historial
3. Cambiar a otra pestaña del navegador
4. Esperar 1 segundo
5. Volver a la pestaña de KoreStats
6. ✅ Verificar que NO hay refetch automático
7. ✅ Verificar que los datos están en caché
```

### Caso 3: Perder conexión y recuperarla

```bash
1. Ir a /perfil?tab=lol
2. Esperar a que cargue el historial
3. Abrir DevTools (F12)
4. Network → Offline
5. Esperar 1 segundo
6. Network → Online
7. ✅ Verificar que NO hay refetch automático
8. ✅ Verificar que los datos siguen en caché
```

---

## 🚀 Optimizaciones Adicionales

### Para MatchHistoryList

Ya está optimizado en `src/components/riot/MatchHistoryList.tsx`:

```typescript
useInfiniteQuery<MatchHistoryPage>({
  queryKey: ["match-history", userId, queueFilter],
  // ...
  staleTime: 5 * 60 * 1000, // 5 minutos
  gcTime: 30 * 60 * 1000, // 30 minutos (más que el global)
  initialPageParam: null,
});
```

**Nota**: El `gcTime` de MatchHistoryList (30 min) es mayor que el global (10 min) porque es una lista importante que queremos mantener en caché más tiempo.

---

## 📚 Referencias

- [TanStack Query - Caching](https://tanstack.com/query/latest/docs/react/guides/caching)
- [TanStack Query - Important Defaults](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Next.js - Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)

---

## ⚠️ Notas Importantes

1. **Singleton Pattern**: El `QueryClient` se crea UNA SOLA VEZ usando `useState` con lazy initialization
2. **Visibilidad**: Se pausan consultas cuando la página no está visible (optimización)
3. **DevTools**: Solo se carga en desarrollo (`NODE_ENV === 'development'`)
4. **Intercepting Routes**: Combinado con la solución de Intercepting Routes, proporciona UX óptima
5. **Caché Manual**: Puedes invalidar caché manualmente si es necesario:

```typescript
// Invalidar una query específica
queryClient.invalidateQueries({ queryKey: ["match-history"] });

// Invalidar todas las queries
queryClient.invalidateQueries();
```

---

## 🎉 Resultado Final

✅ **Datos instantáneos** al volver a una página  
✅ **Sin pantallas blancas** de carga  
✅ **Sin spinners** innecesarios  
✅ **Scroll preservado** en listas infinitas  
✅ **Experiencia fluida** entre navegación  
✅ **Memoria optimizada** con garbage collection
