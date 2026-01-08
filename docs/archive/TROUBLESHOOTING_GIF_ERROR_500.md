# Troubleshooting: Error 500 en /api/gifs

## 🚨 Problema

El componente `GifPicker.tsx` muestra:

```
Error 500: Internal Server Error
```

---

## ✅ Solución Principal (99% de los casos)

### Paso 1: Detener el Servidor

En la terminal donde corre `npm run dev`, presiona:

```
Ctrl + C
```

### Paso 2: Reiniciar el Servidor

```bash
npm run dev
```

### Paso 3: Probar de Nuevo

1. Abre el modal de GIF
2. Deberías ver GIFs trending cargando
3. En la terminal del servidor verás logs como:

```
[API GIFs] ========== INICIO DE SOLICITUD ==========
[API GIFs] TENOR_API_KEY cargada: true
[API GIFs] TENOR_API_KEY valor (primeros 10 chars): abc123def4...
[API GIFs] Parámetros: { q: null, limit: '20' }
[API GIFs] 📊 Obteniendo GIFs trending
[API GIFs] URL de Tenor: https://tenor.googleapis.com/v2/trending?key=TENOR_API_KEY_HIDDEN&limit=20&media_filter=gif
[API GIFs] ⏳ Llamando a Tenor API...
[API GIFs] Respuesta de Tenor: { status: 200, statusText: 'OK', ok: true }
[API GIFs] ✅ Éxito: 20 GIFs obtenidos
[API GIFs] ========== FIN DE SOLICITUD ==========
```

---

## 🔍 Si Aún Tienes Error 500: Depuración

### Paso 1: Verificar `.env.local`

Abre `.env.local` en la raíz del proyecto y verifica:

```env
TENOR_API_KEY=tu_api_key_aqui
```

**Checklist**:

- ✅ ¿El archivo existe?
- ✅ ¿Contiene `TENOR_API_KEY=` (sin `NEXT_PUBLIC_`)?
- ✅ ¿La API key no está vacía?
- ✅ ¿No hay espacios extra?

### Paso 2: Revisar Logs del Servidor

Después de reiniciar, abre el modal de GIF y busca en los logs:

#### Escenario A: `TENOR_API_KEY cargada: false`

```
[API GIFs] TENOR_API_KEY cargada: false
[API GIFs] ERROR: TENOR_API_KEY no está configurada
```

**Soluciones**:

1. Verifica que `.env.local` tiene `TENOR_API_KEY=tu_api_key`
2. Asegúrate de que NO tiene `NEXT_PUBLIC_` prefix
3. Reinicia el servidor: `Ctrl+C` y `npm run dev`
4. Si aún no funciona, intenta:
   ```bash
   # Limpiar caché de Next.js
   rm -rf .next
   npm run dev
   ```

#### Escenario B: `TENOR_API_KEY cargada: true` pero error después

```
[API GIFs] TENOR_API_KEY cargada: true
[API GIFs] Respuesta de Tenor: { status: 401, statusText: 'Unauthorized', ok: false }
[API GIFs] Error de Tenor: 401 Unauthorized
```

**Soluciones**:

1. La API key es inválida o expirada
2. Ve a https://tenor.com/developer/dashboard
3. Copia una API key nueva
4. Actualiza `.env.local`
5. Reinicia el servidor

#### Escenario C: Error de red

```
[API GIFs] Error interno: TypeError: fetch failed
[API GIFs] Stack trace: ...
```

**Soluciones**:

1. Verifica conexión a internet
2. Verifica que `tenor.googleapis.com` no está bloqueado
3. Intenta en una ventana privada/incógnito
4. Verifica firewall/proxy

---

## 📊 Estructura de Logs

Cada solicitud a `/api/gifs` genera logs con esta estructura:

```
[API GIFs] ========== INICIO DE SOLICITUD ==========
[API GIFs] TENOR_API_KEY cargada: true/false
[API GIFs] TENOR_API_KEY valor (primeros 10 chars): ...
[API GIFs] Parámetros: { q, limit }
[API GIFs] 📊 Obteniendo GIFs trending  (o 🔍 Buscando: "query")
[API GIFs] URL de Tenor: https://...
[API GIFs] ⏳ Llamando a Tenor API...
[API GIFs] Respuesta de Tenor: { status, statusText, ok }
[API GIFs] ✅ Éxito: X GIFs obtenidos  (o ❌ Error)
[API GIFs] ========== FIN DE SOLICITUD ==========
```

---

## 🛠️ Checklist de Verificación

- [ ] `.env.local` existe en la raíz del proyecto
- [ ] `.env.local` contiene `TENOR_API_KEY=tu_api_key`
- [ ] NO tiene `NEXT_PUBLIC_` prefix
- [ ] La API key no está vacía
- [ ] El servidor fue reiniciado después de cambiar `.env.local`
- [ ] Los logs muestran `TENOR_API_KEY cargada: true`
- [ ] Tienes conexión a internet
- [ ] La API key es válida (obtenida de Tenor Dashboard)

---

## 🚀 Comandos Útiles

### Reiniciar servidor

```bash
# Ctrl+C en la terminal, luego:
npm run dev
```

### Limpiar caché de Next.js

```bash
rm -rf .next
npm run dev
```

### Ver variables de entorno (solo en servidor)

```bash
# En src/app/api/gifs/route.ts, agrega:
console.log('Todas las variables:', process.env);
```

### Verificar que .env.local se lee

```bash
# En la raíz del proyecto:
cat .env.local  # Linux/Mac
type .env.local # Windows
```

---

## 📞 Recursos

- [Tenor API Docs](https://tenor.com/developer/documentation)
- [Tenor Dashboard](https://tenor.com/developer/dashboard)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## 💡 Notas Importantes

1. **Variables de Entorno**: Las variables sin `NEXT_PUBLIC_` solo son accesibles en el servidor
2. **Reinicio Requerido**: Cambios en `.env.local` requieren reiniciar el servidor
3. **Logs en Terminal**: Los logs de `/api/gifs/route.ts` aparecen en la terminal del servidor, NO en el navegador
4. **Seguridad**: La API key nunca se expone al cliente (está oculta en los logs)

---

## Ejemplo de Flujo Correcto

```
1. Usuario abre modal de GIF
   ↓
2. GifPicker.tsx hace fetch('/api/gifs?limit=20')
   ↓
3. Servidor recibe solicitud en /api/gifs/route.ts
   ↓
4. Logs aparecen en terminal del servidor:
   [API GIFs] TENOR_API_KEY cargada: true
   [API GIFs] ⏳ Llamando a Tenor API...
   ↓
5. Servidor llama a Tenor API con TENOR_API_KEY privada
   ↓
6. Tenor responde con GIFs
   ↓
7. Servidor reenvía respuesta al cliente
   ↓
8. GifPicker renderiza GIFs en el navegador
   ↓
9. Logs finalizan en terminal:
   [API GIFs] ✅ Éxito: 20 GIFs obtenidos
```
