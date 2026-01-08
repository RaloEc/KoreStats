# Solución para errores de ChunkLoadError

Si estás experimentando errores de carga de chunks (ChunkLoadError), sigue estos pasos:

## Opción 1: Limpieza Automática (Recomendado)

1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Ejecuta el siguiente comando:

```javascript
// Cargar y ejecutar el script de limpieza
const script = document.createElement('script');
script.src = '/clear-sw.js';
document.head.appendChild(script);
```

4. Espera a que aparezca el mensaje "Limpieza completada"
5. La página se recargará automáticamente

## Opción 2: Limpieza Manual

### Paso 1: Desregistrar Service Workers

1. Abre DevTools (F12)
2. Ve a la pestaña "Application" (o "Aplicación")
3. En el menú lateral, selecciona "Service Workers"
4. Haz clic en "Unregister" para cada Service Worker listado

### Paso 2: Limpiar Caché

1. En la misma pestaña "Application"
2. Selecciona "Cache Storage" en el menú lateral
3. Haz clic derecho en cada caché y selecciona "Delete"
4. También limpia "Local Storage" si hay entradas relacionadas con PWA

### Paso 3: Recarga Forzada

1. Presiona `Ctrl + Shift + R` (Windows/Linux) o `Cmd + Shift + R` (Mac)
2. Esto forzará una recarga completa sin usar caché

## Opción 3: Desde la Consola del Navegador

Ejecuta estos comandos uno por uno en la consola:

```javascript
// 1. Desregistrar todos los Service Workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
  console.log('Service Workers desregistrados');
});

// 2. Limpiar todos los cachés
caches.keys().then(cacheNames => {
  return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
}).then(() => {
  console.log('Cachés limpiados');
  location.reload(true);
});
```

## Prevención

El sistema ahora incluye:

1. **Detección automática de errores de chunks**: Si se detecta un ChunkLoadError, el sistema limpiará automáticamente el caché y recargará la página.

2. **Actualización automática del Service Worker**: El Service Worker se actualizará automáticamente cada 60 segundos y se activará inmediatamente sin esperar.

3. **Estrategia NetworkFirst para JavaScript**: Los archivos JavaScript ahora se cargan primero desde la red para evitar usar versiones obsoletas del caché.

## Si el problema persiste

Si después de seguir estos pasos el problema continúa:

1. Cierra todas las pestañas del sitio
2. Limpia el caché del navegador completamente (Ctrl+Shift+Delete)
3. Reinicia el navegador
4. Vuelve a acceder al sitio

## Para Desarrolladores

Si estás desplegando una nueva versión:

1. Asegúrate de hacer un build completo: `npm run build`
2. Despliega todos los archivos generados
3. El Service Worker se actualizará automáticamente en los clientes
4. Los usuarios verán la nueva versión sin necesidad de limpiar caché manualmente

## Configuración Actual

- **Service Worker**: Configurado con `skipWaiting: true` y `clients.claim()`
- **Estrategia de caché JS**: NetworkFirst con timeout de 10 segundos
- **Actualización automática**: Cada 60 segundos
- **Detección de errores**: Automática con limpieza y recarga
