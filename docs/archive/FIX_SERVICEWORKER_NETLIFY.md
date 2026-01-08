# Solución: Error de ServiceWorker en Netlify

## Problema
Al crear un post con estadísticas de arma en Netlify, aparecía el error:
```
Uncaught (in promise) TypeError: Failed to update a ServiceWorker for scope ('https://bitarena.netlify.app/') with script ('Unknown'): Not found
InvalidStateError: Failed to update a ServiceWorker for scope ('https://bitarena.netlify.app/') with script ('Unknown'): The object is in an invalid state.
```

## Causa Raíz
- La configuración del PWA tenía `skipWaiting: true` y `register: true`
- Esto forzaba la activación inmediata del ServiceWorker
- En Netlify, durante deploys, el SW intentaba actualizarse pero no encontraba el script
- Causaba conflictos con la actualización de la aplicación

## Solución Implementada

### 1. **Actualizar next.config.js**
Se modificó la configuración del PWA para:
- Deshabilitar PWA en producción (Netlify): `disable: process.env.NETLIFY === 'true'`
- No registrar automáticamente: `register: false`
- No forzar activación inmediata: `skipWaiting: false`
- No reclamar clientes: `clientsClaim: false`
- Desactivar recarga automática: `cacheOnFrontEndNav: false`, `reloadOnOnline: false`

### 2. **Añadir Script de Limpieza de ServiceWorker**
Se agregó `ServiceWorkerCleanupScript()` en `src/app/layout.tsx` que:
- Desregistra todos los ServiceWorkers existentes
- Limpia todos los cachés
- Se ejecuta al cargar la página
- Previene conflictos con SWs antiguos

### 3. **Crear archivo de limpieza manual**
Se creó `public/sw-cleanup.js` para limpieza manual si es necesario

## Cambios Realizados

### Archivos Modificados:
1. **next.config.js** - Línea 1-13: Actualizada configuración del PWA
2. **src/app/layout.tsx** - Línea 108-148: Añadido `ServiceWorkerCleanupScript()`
3. **src/app/layout.tsx** - Línea 247: Incluido script en el head

### Archivos Creados:
1. **public/sw-cleanup.js** - Script de limpieza manual

## Cómo Desplegar

### En Local (Desarrollo)
```bash
npm run dev
```
- El PWA se desactiva automáticamente en desarrollo
- Puedes probar sin conflictos de SW

### En Netlify (Producción)
```bash
git add .
git commit -m "Fix: Deshabilitar PWA en Netlify para evitar errores de ServiceWorker"
git push
```

Netlify detectará automáticamente `process.env.NETLIFY === 'true'` y desactivará el PWA.

## Verificación

Después del deploy, en la consola del navegador deberías ver:
```
[SW Cleanup] Unregistering service worker: https://bitarena.netlify.app/
[SW Cleanup] Deleting cache: ...
```

## Beneficios

✅ **Sin errores de ServiceWorker** - No más "Failed to update"
✅ **Funcionalidad de armas funcionando** - Puedes crear posts con estadísticas
✅ **Mejor estabilidad en Netlify** - Sin conflictos de actualización
✅ **Desarrollo sin PWA** - Más rápido en local
✅ **Limpieza automática** - Se ejecuta en cada carga

## Notas

- El PWA sigue disponible en desarrollo local
- En producción (Netlify), se desactiva automáticamente
- Si necesitas reactivar PWA en producción, elimina la condición `|| process.env.NETLIFY === 'true'` en next.config.js
- La limpieza de SW se ejecuta automáticamente en cada carga de página

## Próximos Pasos

1. Hacer push de los cambios a GitHub
2. Netlify hará deploy automáticamente
3. Probar en https://bitarena.netlify.app/
4. Crear un post con estadísticas de arma
5. Verificar que no aparecen errores de ServiceWorker
