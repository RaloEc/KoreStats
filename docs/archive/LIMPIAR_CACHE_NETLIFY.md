# Guía: Limpiar Caché de Netlify y Service Worker del Navegador

## Problema
Después de actualizar la configuración del PWA, es posible que el navegador tenga caché antiguo o un Service Worker problemático registrado. Esto puede causar errores como:
```
Failed to update a ServiceWorker for scope ('https://bitarena.netlify.app/') with script ('Unknown'): Not found
InvalidStateError: The object is in an invalid state.
```

## Solución: 3 Pasos

### Paso 1: Limpiar Caché en Netlify

1. Ve a tu dashboard de Netlify: https://app.netlify.com
2. Selecciona tu sitio: **bitarena** (o el nombre de tu proyecto)
3. En la sección de **Deploys**, busca el último deploy
4. Haz clic en el botón **"Trigger deploy"** (o similar)
5. Selecciona la opción **"Clear cache and deploy site"** (o "Deploy site")
6. Espera a que el deploy se complete (verás un checkmark verde)

**Resultado esperado:**
```
✓ Deploy published
✓ Site is live
```

### Paso 2: Desregistrar Service Worker en el Navegador

1. **Abre las Herramientas de Desarrollador:**
   - Windows/Linux: `F12` o `Ctrl + Shift + I`
   - Mac: `Cmd + Option + I`

2. **Ve a la pestaña "Aplicación" (o "Application")**
   - Si no ves esta pestaña, puede estar bajo "More tools" (⋯)

3. **En el menú lateral, busca "Service Workers"**
   - Verás algo como: `https://bitarena.netlify.app/`

4. **Si hay un Service Worker registrado:**
   - Haz clic en el botón **"Unregister"** (Anular registro)
   - Confirma la acción

5. **Limpia el almacenamiento:**
   - En el menú lateral, busca **"Storage"** (Almacenamiento)
   - Haz clic en **"Clear site data"** (Borrar datos del sitio)
   - Selecciona todas las opciones:
     - ☑ Cookies
     - ☑ Cache storage
     - ☑ IndexedDB
     - ☑ Local storage
     - ☑ Session storage
   - Haz clic en **"Clear"** (Borrar)

**Resultado esperado:**
```
✓ Service Worker unregistered
✓ All site data cleared
```

### Paso 3: Recarga Forzada del Navegador

1. **Cierra las DevTools** (F12)
2. **Vuelve a la pestaña del sitio**
3. **Recarga forzada:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
   - O: `Ctrl + F5`

**Resultado esperado:**
- La página se recarga completamente
- El navegador descarga todos los archivos nuevamente
- No hay errores de Service Worker en la consola

## Verificación

Después de completar los 3 pasos, verifica que todo funciona:

1. **Abre la consola (F12)**
2. **Ve a la pestaña "Console"**
3. **Busca mensajes de PWA:**
   - ✅ Correcto: `[PWA] ServiceWorker registered successfully`
   - ❌ Incorrecto: `Failed to update a ServiceWorker`
   - ❌ Incorrecto: `InvalidStateError`

4. **Prueba la funcionalidad:**
   - Crea un post con estadísticas de arma
   - Sube una captura de pantalla
   - Verifica que se analiza correctamente
   - Revisa que no hay errores en consola

## Troubleshooting

### Si aún ves errores de Service Worker:

1. **Limpia el caché del navegador completamente:**
   - Chrome/Edge: `Ctrl + Shift + Delete`
   - Firefox: `Ctrl + Shift + Delete`
   - Safari: Preferences → Privacy → Manage Website Data

2. **Intenta en modo incógnito/privado:**
   - Windows/Linux: `Ctrl + Shift + N` (Chrome) o `Ctrl + Shift + P` (Firefox)
   - Mac: `Cmd + Shift + N` (Chrome) o `Cmd + Shift + P` (Firefox)
   - Esto carga el sitio sin caché

3. **Si el problema persiste:**
   - Espera 5-10 minutos (Netlify puede tardar en propagar cambios)
   - Intenta en otro navegador
   - Contacta al soporte de Netlify

### Si el Service Worker no se registra:

1. Verifica que el sitio está en HTTPS (obligatorio para PWA)
2. Abre la consola y busca errores específicos
3. Revisa que `manifest.json` existe en `/public`
4. Verifica que `next.config.js` tiene la configuración correcta

## Referencia Rápida

```bash
# Limpiar caché local (si usas npm)
npm run build

# Limpiar caché de Next.js
rm -rf .next

# Limpiar caché de node_modules (si es necesario)
rm -rf node_modules
npm install
```

## Próximos Pasos

1. ✅ Limpiar caché de Netlify
2. ✅ Desregistrar Service Worker
3. ✅ Recarga forzada
4. ✅ Verificar que funciona
5. ✅ Crear post con estadísticas de arma
6. ✅ Confirmar que no hay errores

## Documentación Relacionada

- `MIGRACION_NEXT_PWA.md` - Migración a @ducanh2912/next-pwa
- `AUDITORIA_TIPTAP_REGEX.md` - Auditoría de RegExp en Tiptap
- [Netlify Docs - Cache Control](https://docs.netlify.com/site-configuration/build-caching/)
- [MDN - Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
