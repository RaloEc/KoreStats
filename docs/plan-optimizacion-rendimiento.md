# Plan de Optimización de Rendimiento - KoreStats

Este documento detalla los problemas de rendimiento identificados en la plataforma KoreStats, junto con sus respectivas soluciones paso a paso, para ser implementados de forma progresiva.

---

## 📌 Resumen de Puntos de Optimización

1. [Optimización de Fuentes Web en el Layout Principal (FCP & CLS)](#1-optimización-de-fuentes-web-en-el-layout-principal-fcp--cls)
2. [Refactor del Comparator de Armas a TanStack Query (Reducción de Peticiones y Latencia)](#2-refactor-del-comparator-de-armas-a-tanstack-query-reducción-de-peticiones-y-latencia)
3. [Optimización de Caché en API Routes del Servidor (Reducción de Carga en Supabase)](#3-optimización-de-caché-en-api-routes-del-servidor-reducción-de-carga-en-supabase)
4. [Depuración y Limpieza de Dependencias en `package.json` (Reducción del Bundle Size)](#4-depuración-y-limpieza-de-dependencias-en-packagejson-reducción-del-bundle-size)
5. [Optimización de Imágenes con `next/image` (Consumo de Red en Móviles)](#5-optimización-de-imágenes-con-nextimage-consumo-de-red-en-móviles)

---

## 1. Optimización de Fuentes Web en el Layout Principal (FCP & CLS)

### 🔴 El Problema
En el archivo [/src/app/layout.tsx](file:///r:/Programas/KoreStats/src/app/layout.tsx), se importan y precargan **6 fuentes personalizadas de Google Fonts** con múltiples pesos:
- `Nunito`, `Inter`, `Unbounded`, `Black_Ops_One`, `Saira_Stencil_One` y `Stardos_Stencil`.

Al auditar su uso en el código:
*   **`Saira_Stencil_One`** y **`Stardos_Stencil`** no se utilizan en ninguna clase CSS ni elemento JSX de todo el proyecto.
*   **`Black_Ops_One`** se utiliza únicamente en una cabecera del título de la página del juego (`GamePageClient.tsx`).
*   **`Unbounded`** se utiliza de forma muy aislada (solo 4-5 veces en tarjetas y headers del perfil).

La precarga de tantas fuentes añade peticiones de red innecesarias en el inicio, bloquea el renderizado (aumenta el FCP - First Contentful Paint) y puede causar parpadeo visual molesto (FOUC).

### 🟢 La Solución
1. Eliminar por completo `Saira_Stencil_One` y `Stardos_Stencil`.
2. Remover `Black_Ops_One` y `Unbounded` del layout raíz. Si es sumamente necesario usarlas, aplicarlas mediante fuentes del sistema como fallback o importarlas dinámicamente mediante `@import` condicional en CSS.
3. Mantener únicamente **`Inter`** como la fuente sans-serif base de la interfaz y **`Nunito`** para encabezados principales.

### 🛠️ Pasos para Implementar
Modificar [/src/app/layout.tsx](file:///r:/Programas/KoreStats/src/app/layout.tsx):

```diff
- import { Nunito, Inter, Unbounded, Black_Ops_One, Saira_Stencil_One, Stardos_Stencil } from "next/font/google";
+ import { Nunito, Inter } from "next/font/google";

...

- const unbounded = Unbounded({ ... });
- const blackOpsOne = Black_Ops_One({ ... });
- const sairaStencil = Saira_Stencil_One({ ... });
- const stardosStencil = Stardos_Stencil({ ... });

...

  <body
-   className={`${nunito.variable} ${inter.variable} ${unbounded.variable} ${blackOpsOne.variable} ${sairaStencil.variable} ${stardosStencil.variable} font-sans ...`}
+   className={`${nunito.variable} ${inter.variable} font-sans ...`}
  >
```

---

## 2. Refactor del Comparator de Armas a TanStack Query (Reducción de Peticiones y Latencia)

### 🔴 El Problema
En [/src/components/weapon/WeaponCompareView.tsx](file:///r:/Programas/KoreStats/src/components/weapon/WeaponCompareView.tsx), se realizan 4 consultas concurrentes con el comando `fetch` tradicional dentro de un `useEffect` cada vez que se monta la modal:
```typescript
useEffect(() => {
    Promise.all([
        fetch("/api/games/delta-force/base-data?type=weapons").then(r => r.json()),
        fetch("/api/games/delta-force/base-data?type=ammo").then(r => r.json()),
        fetch("/api/games/delta-force/base-data?type=gear").then(r => r.json()),
        fetch("/api/games/delta-force/base-data?type=calibers").then(r => r.json())
    ]).then(...)
}, []);
```
*   **Sin Caché en Cliente:** Al usar `fetch` directo, los datos no se guardan en la memoria compartida del cliente. Cada vez que abres y cierras la comparación, el navegador hace 4 peticiones HTTP de nuevo.
*   **Competencia con la base:** Esta vista se abre desde la base de datos de armas, que ya usa `@tanstack/react-query` para obtener exactamente esta misma información bajo las claves `df-base-weapons`, `df-base-ammo`, etc.

### 🟢 La Solución
Refactorizar el comparador para utilizar los hooks de **React Query** (`useQuery`). Al reutilizar las mismas claves de caché (`queryKey`), los datos del comparador se mostrarán **instantáneamente** sin realizar ninguna petición de red extra si el usuario ya venía de la vista de base de datos de armas.

### 🛠️ Pasos para Implementar
Modificar [/src/components/weapon/WeaponCompareView.tsx](file:///r:/Programas/KoreStats/src/components/weapon/WeaponCompareView.tsx):

1. Importar `useQuery` de `@tanstack/react-query`.
2. Reemplazar el `useEffect` de carga por:

```typescript
const { data: weaponsData } = useQuery({
    queryKey: ["df-base-weapons", "operations"], // Asegurar que coincida con el modo de juego activo
    queryFn: () => fetch("/api/games/delta-force/base-data?type=weapons&mode=operations").then(r => r.json()),
    staleTime: 1000 * 60 * 10, // 10 minutos de caché
});

const { data: ammoData } = useQuery({
    queryKey: ["df-base-ammo"],
    queryFn: () => fetch("/api/games/delta-force/base-data?type=ammo").then(r => r.json()),
    staleTime: 1000 * 60 * 10,
});

const { data: gearData } = useQuery({
    queryKey: ["df-base-gear"],
    queryFn: () => fetch("/api/games/delta-force/base-data?type=gear").then(r => r.json()),
    staleTime: 1000 * 60 * 10,
});

const { data: calibersData } = useQuery({
    queryKey: ["df-base-calibers"],
    queryFn: () => fetch("/api/games/delta-force/base-data?type=calibers").then(r => r.json()),
    staleTime: 1000 * 60 * 10,
});
```

---

## 3. Optimización de Caché en API Routes del Servidor (Reducción de Carga en Supabase)

### 🔴 El Problema
El endpoint [/src/app/api/games/delta-force/base-data/route.ts](file:///r:/Programas/KoreStats/src/app/api/games/delta-force/base-data/route.ts) realiza múltiples consultas en cascada a Supabase (por ejemplo, buscar el juego `delta-force`, luego las armas base, etc.).
Dado que estos datos son estáticos (solo cambian cuando un administrador los edita desde el panel), hacer consultas en tiempo real a Supabase en cada petición de los usuarios ralentiza el *Time to First Byte* (TTFB) de la API debido a la latencia de red entre la función Serverless y la base de datos PostgreSQL.

### 🟢 La Solución
Implementar políticas de caché HTTP para que la CDN (Netlify/Vercel) y los navegadores almacenen las respuestas por un periodo (por ejemplo, 1 hora). Al mismo tiempo, usar `unstable_cache` de Next.js para almacenar los resultados de la BD en memoria del servidor.

### 🛠️ Pasos para Implementar
Modificar la función `GET` en [/src/app/api/games/delta-force/base-data/route.ts](file:///r:/Programas/KoreStats/src/app/api/games/delta-force/base-data/route.ts) para devolver cabeceras de caché:

```typescript
// Al final de la respuesta exitosa en GET:
return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59", 
        // Almacena en CDN por 1 hora. Revalida en segundo plano si expira.
    }
});
```

*(Nota: En los métodos POST/PUT/DELETE, se debe implementar una invalidación explícita si se modifican las tablas).*

---

## 4. Depuración y Limpieza de Dependencias en `package.json` (Reducción del Bundle Size)

### 🔴 El Problema
El archivo [/package.json](file:///r:/Programas/KoreStats/package.json) contiene dependencias de gran tamaño y redundantes que aumentan el peso final del bundle de JavaScript que se descarga en el navegador de los usuarios:
1.  **Redundancia de UI:** `NextUI` + `RippleUI` + `shadcn/ui` (Radix).
2.  **Redundancia de Editores:** `Draft.js` (pesado y desaprobado) + `Tiptap` (ProseMirror moderno).
3.  **Redundancia de Iconos:** `FontAwesome`, `Lucide React`, `Heroicons` y `React Icons` a la vez.

### 🟢 La Solución
*   **Remover Draft.js:** Migrar todos los campos de texto enriquecido a Tiptap y desinstalar `draft-js` y `@types/draft-js`.
*   **Lazy Loading de Editores:** Tiptap es un módulo pesado. Asegurarse de importarlo usando `dynamic` en Next.js con la opción `ssr: false` para que su JS no se compile en el bundle principal.
*   **Consolidar Iconos:** Estandarizar toda la aplicación para usar exclusivamente `lucide-react` (es el set nativo para shadcn/ui). Eliminar progresivamente FontAwesome y React Icons.

---

## 5. Optimización de Imágenes con `next/image` (Consumo de Red en Móviles)

### 🔴 El Problema
En vistas como [/src/components/weapon/WeaponCompareView.tsx](file:///r:/Programas/KoreStats/src/components/weapon/WeaponCompareView.tsx) o las cards del foro, se utilizan etiquetas nativas de HTML `<img>`.
Esto causa que imágenes de gran tamaño subidas por usuarios o administradores se descarguen en su peso original en móviles, sin optimización de tamaño, ni conversión automática a formatos modernos y ligeros como `.webp` o `.avif`.

### 🟢 La Solución
Reemplazar las etiquetas `<img>` críticas por el componente `<Image />` importado de `next/image`.

### 🛠️ Pasos para Implementar
En lugar de:
```typescript
<img
    src={computedCombatStats[idx].caliberImageUrl}
    alt={computedCombatStats[idx].caliberName}
    className="w-full h-full object-contain p-0.5"
/>
```

Utilizar:
```typescript
import Image from "next/image";

// En el JSX (definiendo un width/height o usando layout fill):
<div className="relative w-5 h-5">
    <Image
        src={computedCombatStats[idx].caliberImageUrl}
        alt={computedCombatStats[idx].caliberName}
        fill
        sizes="20px"
        className="object-contain p-0.5"
        priority={false}
    />
</div>
```

---

## 📅 Hoja de Ruta Sugerida para la Implementación

1.  **Fase 1 (Inmediata y Segura):** Cambiar las fuentes web en `layout.tsx` (Punto 1). No rompe ninguna funcionalidad y el impacto en la velocidad inicial de carga de la página (FCP) es instantáneo.
2.  **Fase 2 (Optimización del comparador):** Refactorizar `WeaponCompareView.tsx` a React Query (Punto 2). Eliminará los parpadeos y retrasos al abrir y cerrar la comparación de armas.
3.  **Fase 3 (Optimización de API):** Añadir cabeceras de caché en el GET del API Route (Punto 3). Bajará drásticamente la latencia en las consultas al servidor.
4.  **Fase 4 (Limpieza de Dependencias):** Depurar `package.json`, migrando los iconos a Lucide y desinstalando Draft.js (Punto 4). Reducirá el tiempo total de descarga del sitio.
5.  **Fase 5 (Optimización de Imágenes):** Reemplazar `<img>` por `next/image` en las vistas principales.

---

## 6. Fluidez de Navegación y Percepción de Carga (Instant Navigation)

### 🔴 El Problema
Al hacer clic en enlaces hacia rutas dinámicas pesadas (como `/games/[slug]` o `/foro/[id]`), la navegación se siente "atascada" o con retraso (lag). Esto ocurre porque Next.js (App Router) por defecto bloquea la transición en el cliente hasta que el `Server Component` de destino haya terminado de hacer todas sus consultas a la base de datos (Supabase) y haya generado el HTML.

### 🟢 La Solución
1.  **Archivos `loading.tsx`:** Crear archivos `loading.tsx` con componentes tipo *Skeleton* (esqueletos de carga) en las rutas más pesadas. Esto le indica a Next.js que realice la transición de página **inmediatamente**, mostrando el esqueleto mientras el servidor termina de preparar la información real.
2.  **Prefetch de Enlaces Críticos:** Asegurarnos de que los enlaces principales en el Header (`<Link href="...">`) usen `prefetch={true}` para que el navegador descargue la estructura de la página destino en segundo plano.
3.  **Límites de Suspenso (`<Suspense>`):** Para los *Server Components* que agrupan demasiadas llamadas `await` (como `Promise.all` en `GamePage`), dividirlos y envolver secciones específicas (como los hilos del foro o los widgets) en `<Suspense>`, logrando un *Streaming* de datos progresivo.

### 🛠️ Pasos para Implementar
*   Crear `src/app/games/[slug]/loading.tsx` basado en la estructura de `GamePageClient`.
*   Añadir `prefetch={true}` en las barras de navegación (`Navbar.tsx` o `HeaderDesktopNav.tsx`).
*   Revisar si es necesario separar las queries en el `page.tsx` de juegos.
