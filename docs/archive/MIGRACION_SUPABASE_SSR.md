# Migración a @supabase/ssr

## Resumen de cambios

Se ha refactorizado la aplicación para usar correctamente `@supabase/ssr` y solucionar el error "Cookies can only be modified in a Server Action or Route Handler" en Netlify.

## Cambios realizados

### 1. Cliente del Servidor (`src/lib/supabase/server.ts`)

**ANTES:**
```typescript
export const createClient = () => {
  const cookieStore = cookies();
  // ...
}
```

**DESPUÉS:**
```typescript
export async function createClient() {
  const cookieStore = await cookies();
  // Usa getAll/setAll en lugar de get/set/remove
}
```

**IMPORTANTE:** `createClient()` ahora es **asíncrona** y debe llamarse con `await`.

### 2. Cliente del Navegador (`src/lib/supabase/client.ts`)

**ANTES:**
```typescript
// Código complejo con singleton y múltiples opciones
```

**DESPUÉS:**
```typescript
export function createClient(): SupabaseClient {
  return createBrowserClient(supabaseUrl, supabaseKey)
}
```

Simplificado para usar solo `createBrowserClient` de `@supabase/ssr`.

### 3. Layout (`src/app/layout.tsx`)

**ANTES:**
```typescript
const supabase = createClient();
```

**DESPUÉS:**
```typescript
const supabase = await createClient();
```

### 4. Middleware (`src/middleware.ts`)

Actualizado para usar `getAll/setAll` en lugar de `get/set/remove`:

```typescript
cookies: {
  getAll() {
    return request.cookies.getAll()
  },
  setAll(cookiesToSet) {
    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
    response = NextResponse.next({ request })
    cookiesToSet.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options)
    )
  },
}
```

### 5. Route Handlers

**ELIMINAR:**
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

const supabase = createRouteHandlerClient<Database>({ cookies })
```

**REEMPLAZAR CON:**
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
```

## Archivos que necesitan actualización

Los siguientes archivos aún usan `createRouteHandlerClient` y deben actualizarse:

### Route Handlers (API)
- `src/app/api/admin/foro/etiquetas/route.ts`
- `src/app/api/admin/eventos/[id]/route.ts`
- `src/app/api/admin/eventos/route.ts`
- `src/app/api/admin/news-ticker/route.ts`
- `src/app/api/admin/noticias/autores/route.ts`
- `src/app/api/admin/noticias/estado/route.ts`
- `src/app/api/admin/noticias/masivas/route.ts`
- `src/app/api/admin/noticias/route.ts`
- `src/app/api/foro/hilo/[id]/post/[postId]/route.ts`
- `src/app/api/mods/[id]/route.ts`
- `src/app/api/mods/categorias/route.ts`
- `src/app/api/mods/route.ts`
- `src/app/api/sync/modrinth/route.ts`
- `src/app/auth/callback/route.ts`

### Server Components (Pages)
- `src/app/admin/mods/crear/page.tsx`
- `src/app/admin/mods/editar/[id]/page.tsx`
- `src/app/foro/categoria/[slug]/page.tsx`

### Client Components
- `src/components/admin/NoticiaSelector.tsx`
- `src/components/admin/hooks/useAdminEstadisticas.ts`
- `src/components/admin/hooks/useNoticiasDashboard.ts`

## Patrón de migración

### Para Route Handlers:

1. Cambiar imports:
```typescript
// ANTES
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// DESPUÉS
import { createClient } from '@/lib/supabase/server'
```

2. Actualizar creación del cliente:
```typescript
// ANTES
const supabase = createRouteHandlerClient({ cookies })

// DESPUÉS
const supabase = await createClient()
```

3. Hacer la función async si no lo es:
```typescript
// ANTES
export function GET(request: NextRequest) {

// DESPUÉS
export async function GET(request: NextRequest) {
```

### Para Server Components:

1. Cambiar imports igual que route handlers
2. Agregar `await` al llamar `createClient()`
3. Asegurar que el componente sea `async`

### Para Client Components:

**NO CAMBIAR NADA** - Los client components deben seguir usando:
```typescript
import { createClient } from '@/lib/supabase/client'
```

## Beneficios

1. ✅ Elimina el error "Cookies can only be modified in a Server Action or Route Handler"
2. ✅ Compatible con Next.js 14/15 y Netlify
3. ✅ Usa el paquete oficial y actualizado `@supabase/ssr`
4. ✅ Mejor manejo de sesiones y cookies
5. ✅ Código más limpio y mantenible

## Paquetes obsoletos a eliminar

Una vez completada la migración, puedes eliminar:
```bash
npm uninstall @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
```

Estos paquetes están **deprecated** y no deben usarse en nuevos proyectos.
