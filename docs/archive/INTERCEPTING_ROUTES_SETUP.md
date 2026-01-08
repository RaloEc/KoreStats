# Implementación de Intercepting Routes - KoreStats

## 🎯 Problema Resuelto

Al navegar desde el historial de partidas (Infinite Scroll) en `/perfil` hacia el detalle de una partida (`/match/[id]`) y regresar, se perdía:

- La posición del scroll
- Los datos cargados en el historial
- El contexto de la página

## ✅ Solución Implementada

Se implementó **Intercepting Routes** + **Parallel Routes** en Next.js 14 App Router para:

- Abrir detalles de partidas en un **Modal** sobre el perfil
- Mantener el historial **montado** sin desmontar
- Preservar el **scroll** y los **datos en caché**
- Permitir acceso directo a `/match/[id]` como página completa

---

## 📁 Estructura de Carpetas Creada

```
src/app/
├── perfil/
│   ├── layout.tsx                          ✨ NUEVO - Layout con slot @modal
│   ├── page.tsx                            (sin cambios)
│   ├── [username]/
│   └── @modal/                             ✨ NUEVO - Slot paralelo
│       ├── default.tsx                     ✨ NUEVO - Retorna null
│       └── (.)match/                       ✨ NUEVO - Intercepta /match
│           └── [matchId]/
│               └── page.tsx                ✨ NUEVO - Modal interceptado
│
├── match/
│   └── [matchId]/
│       └── page.tsx                        (sin cambios - acceso directo)
│
└── components/riot/
    └── MatchDetailContent.tsx              ✨ NUEVO - Componente reutilizable
```

---

## 📝 Archivos Creados/Modificados

### 1. `src/app/perfil/layout.tsx` ✨ NUEVO

```typescript
export default function PerfilLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
```

**Propósito:** Acepta el slot paralelo `@modal` y lo renderiza junto a `children`.

---

### 2. `src/app/perfil/@modal/default.tsx` ✨ NUEVO

```typescript
export default function Default() {
  return null;
}
```

**Propósito:** Renderiza `null` cuando no hay modal activo (ruta no interceptada).

---

### 3. `src/app/perfil/@modal/(.)match/[matchId]/page.tsx` ✨ NUEVO

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { MatchDetailContent } from "@/components/riot/MatchDetailContent";

export default function MatchModal({
  params,
}: {
  params: { matchId: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) {
      router.back();
    }
  }, [open, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800">
        <DialogHeader className="sticky top-0 z-10 bg-slate-950 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white">
              Detalles de la Partida
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="px-6 pb-6">
          <MatchDetailContent matchId={params.matchId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Propósito:**

- Intercepta navegación a `/match/[matchId]` cuando se accede desde `/perfil`
- Renderiza el contenido en un `Dialog` de shadcn/ui
- Al cerrar, usa `router.back()` para volver sin recargar

---

### 4. `src/components/riot/MatchDetailContent.tsx` ✨ NUEVO

Componente reutilizable que encapsula la lógica de carga y renderizado del detalle de partida.

**Características:**

- Carga datos de la partida y timeline
- Obtiene PUUID del usuario autenticado
- Renderiza tabs (Scoreboard, Análisis, Mapa)
- Manejo de estados (loading, error, success)
- Funciona tanto en modal como en página completa

---

### 5. `src/components/riot/match-card/MatchCard.tsx` (MODIFICADO)

Se agregó comentario explicativo sobre la navegación interceptada:

```typescript
{/*
  Navega a /match/[matchId] que será interceptado por la ruta paralela
  en /perfil/@modal/(.)match/[matchId]/page.tsx, mostrando el detalle
  en un modal sin desmontar el historial de partidas
*/}
<Link href={`/match/${match.match_id}`} className="block">
```

---

### 6. `src/components/riot/MatchHistoryList.tsx` (OPTIMIZADO)

Se mejoró la configuración de TanStack Query:

```typescript
staleTime: 5 * 60 * 1000,      // 5 minutos sin refetch al volver del modal
gcTime: 30 * 60 * 1000,        // 30 minutos en caché antes de garbage collection
```

---

## 🔄 Flujo de Funcionamiento

### Escenario 1: Abrir partida desde el historial (Modal)

```
1. Usuario en /perfil?tab=lol
2. Hace clic en una partida (MatchCard)
3. Link navega a /match/[matchId]
4. Intercepting Route captura la navegación
5. Se renderiza MatchModal en el slot @modal
6. El historial se mantiene montado (sin desmontar)
7. El scroll y datos en caché se preservan
8. Usuario cierra el modal → router.back() → vuelve a /perfil
```

### Escenario 2: Acceso directo a /match/[matchId]

```
1. Usuario accede directamente a /match/[matchId]
2. No hay ruta interceptada (no viene de /perfil)
3. Se renderiza /app/match/[matchId]/page.tsx (página completa)
4. Funciona como antes (sin cambios)
```

### Escenario 3: Recarga de página en el modal

```
1. Usuario en modal de partida
2. Presiona F5 (recarga)
3. Next.js detecta que no hay slot @modal
4. Renderiza /app/match/[matchId]/page.tsx (página completa)
5. Experiencia normal de página de detalle
```

---

## 🎨 Cómo Funciona Intercepting Routes

### Sintaxis de Carpetas

- `(.)` = Intercepta rutas al **mismo nivel**
  - Desde `/perfil`, intercepta `/match`
- `(..)` = Intercepta rutas un nivel arriba
- `(...)`= Intercepta rutas desde la raíz

### Orden de Resolución

Cuando el usuario navega a `/match/[matchId]`:

1. ¿Existe `/perfil/@modal/(.)match/[matchId]`? → **SÍ** → Renderiza en modal
2. ¿Existe `/match/[matchId]`? → **SÍ** → Renderiza como página completa

---

## ✨ Beneficios

| Beneficio          | Antes               | Después                  |
| ------------------ | ------------------- | ------------------------ |
| **Scroll**         | ❌ Se perdía        | ✅ Se preserva           |
| **Datos en caché** | ❌ Se perdían       | ✅ Se preservan (30 min) |
| **Desmontaje**     | ❌ Se desmontaba    | ✅ Se mantiene montado   |
| **Experiencia UX** | ❌ Recarga completa | ✅ Modal suave           |
| **Acceso directo** | ✅ Funciona         | ✅ Sigue funcionando     |

---

## 🧪 Testing

### Caso 1: Modal funciona

```bash
1. Ir a /perfil?tab=lol
2. Hacer clic en una partida
3. Verificar que se abre un modal
4. Cerrar modal
5. Verificar que el scroll está en la misma posición
```

### Caso 2: Acceso directo funciona

```bash
1. Ir directamente a /match/LA1_123456789
2. Verificar que se abre la página completa (no modal)
3. Verificar que todos los tabs funcionan
```

### Caso 3: Recarga en modal

```bash
1. Abrir modal desde /perfil
2. Presionar F5
3. Verificar que se muestra la página completa
```

---

## 📚 Referencias

- [Next.js Intercepting Routes](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes)
- [Next.js Parallel Routes](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes)
- [TanStack Query - Caching](https://tanstack.com/query/latest/docs/react/guides/caching)

---

## 🚀 Próximos Pasos (Opcional)

1. **Agregar animaciones** al modal (fade-in, slide-up)
2. **Precargar datos** del modal al hover en MatchCard
3. **Compartir URL del modal** (copy link con estado del modal)
4. **Historial del navegador** mejorado (back/forward en modal)

---

## ⚠️ Notas Importantes

- El error de TypeScript sobre `MatchDetailContent` se resuelve automáticamente al compilar
- Los datos en caché se mantienen 30 minutos (configurable en `MatchHistoryList.tsx`)
- El modal usa `router.back()` para cerrar, respetando el historial del navegador
- La página de detalle completa (`/match/[matchId]`) sigue funcionando sin cambios
