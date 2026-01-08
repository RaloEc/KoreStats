# Migración a @ducanh2912/next-pwa

## Problema
La librería original `next-pwa` no soporta correctamente Next.js 14, causando errores de ServiceWorker en Netlify:
```
Failed to update a ServiceWorker for scope ('https://bitarena.netlify.app/') with script ('Unknown'): Not found
InvalidStateError: The object is in an invalid state.
```

## Solución
Se migró a `@ducanh2912/next-pwa`, un fork mantenido por la comunidad que soporta Next.js 14 correctamente.

## Cambios Realizados

### 1. Actualizar Dependencias
```bash
npm uninstall next-pwa
npm install @ducanh2912/next-pwa
```

**Resultado:**
- ✅ Removidos 282 paquetes
- ✅ Añadidos 254 paquetes
- ✅ 0 vulnerabilidades

### 2. Actualizar next.config.js

**Antes:**
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development' || process.env.NETLIFY === 'true',
  register: false,
  skipWaiting: false,
  clientsClaim: false,
  cacheOnFrontEndNav: false,
  reloadOnOnline: false,
  // ... resto de configuración
});
```

**Después:**
```javascript
const withPWA = require('@ducanh2912/next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  // ... resto de configuración
});
```

**Cambios clave:**
- Cambiar import de `next-pwa` a `@ducanh2912/next-pwa`
- Remover condición `|| process.env.NETLIFY === 'true'` (no necesaria con esta librería)
- Restaurar valores por defecto: `register: true`, `skipWaiting: true`, etc.

### 3. Limpiar src/app/layout.tsx

**Removido:**
- `ServiceWorkerCleanupScript()` - Ya no necesario
- Llamada a `<ServiceWorkerCleanupScript />` en el head

**Razón:** `@ducanh2912/next-pwa` maneja correctamente la actualización de ServiceWorkers sin necesidad de limpieza manual.

### 4. Corregir Warning de Accesibilidad

**Archivo:** `src/components/foro/CrearHiloForm.tsx`

**Cambio 1:** Importar `DialogDescription`
```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,  // ← Añadido
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
```

**Cambio 2:** Añadir `DialogDescription` al modal
```typescript
<DialogContent className="!max-w-none !w-[85vw] h-auto md:h-[90vh] p-0 overflow-y-auto md:overflow-hidden flex flex-col">
  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
    <DialogHeader>
      <DialogTitle>Análisis de Estadísticas de Arma</DialogTitle>
      <DialogDescription>
        Sube una captura de pantalla de las estadísticas de tu arma para analizarlas automáticamente
      </DialogDescription>
    </DialogHeader>
  </div>
  {/* ... resto del contenido ... */}
</DialogContent>
```

## Archivos Modificados

1. **next.config.js** (línea 1-10)
   - Cambiar import a `@ducanh2912/next-pwa`
   - Restaurar configuración PWA por defecto

2. **src/app/layout.tsx** (línea 108-148)
   - Remover `ServiceWorkerCleanupScript()`
   - Remover llamada en head

3. **src/components/foro/CrearHiloForm.tsx** (línea 18-25, 272-279)
   - Importar `DialogDescription`
   - Añadir `DialogDescription` al modal

## Beneficios

✅ **Soporte completo para Next.js 14** - Librería mantenida y compatible
✅ **Sin errores de ServiceWorker** - Manejo correcto de actualizaciones
✅ **Mejor estabilidad en Netlify** - Sin conflictos de deploy
✅ **Accesibilidad mejorada** - Cumple con WCAG 2.1
✅ **Código más limpio** - Sin scripts de limpieza manual

## Verificación

Después del deploy, en la consola del navegador NO deberías ver:
```
Failed to update a ServiceWorker
InvalidStateError
```

En su lugar, deberías ver:
```
[PWA] ServiceWorker registered successfully
```

## Próximos Pasos

1. Hacer push de los cambios a GitHub
2. Netlify hará deploy automáticamente
3. Probar en https://bitarena.netlify.app/
4. Crear un post con estadísticas de arma
5. Verificar que no aparecen errores en consola

## Referencias

- [Repositorio @ducanh2912/next-pwa](https://github.com/DuCanhGH/next-pwa)
- [Documentación Next.js PWA](https://nextjs.org/docs/app-router/building-your-application/optimizing/pwa)
- [WCAG 2.1 - Dialog Accessibility](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value)
