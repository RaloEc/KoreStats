# Configuración de API Key de Tenor (Proxy Seguro)

## 🔒 Arquitectura Segura

Se implementó un **proxy de API seguro** que:

- ✅ Oculta la API key en el servidor (no se expone al cliente)
- ✅ Evita problemas de CORS
- ✅ Usa `TENOR_API_KEY` (sin `NEXT_PUBLIC_`)
- ✅ Todas las llamadas pasan por `/api/gifs`

## Paso 1: Obtener API Key (Google Cloud v2)

⚠️ **Importante**: Debes usar la API de **Google Cloud v2** (no el dashboard clásico de Tenor).

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o usa uno existente
3. Habilita la API de Tenor:
   - En la barra de búsqueda, busca "Tenor API"
   - Haz clic en "Enable"
4. Crea una clave de API:
   - Ve a "Credentials" en el menú izquierdo
   - Haz clic en "Create Credentials" → "API Key"
   - Copia la clave generada
5. (Opcional) Restringe la clave:
   - Haz clic en la clave creada
   - En "API restrictions", selecciona "Tenor API"
   - Guarda los cambios

## Paso 2: Configurar en `.env.local`

En la raíz del proyecto, abre o crea `.env.local`:

```env
TENOR_API_KEY=tu_api_key_aqui
```

**⚠️ IMPORTANTE**:

- Sin `NEXT_PUBLIC_` prefix
- Esto asegura que solo sea accesible en el servidor
- Nunca se envía al navegador

## Paso 3: Reiniciar Servidor

```bash
npm run dev
```

## Verificación

1. Abre la consola del navegador (F12)
2. Abre el modal de GIF
3. Deberías ver GIFs trending
4. En la consola del servidor verás logs como:
   ```
   [API GIFs] Obteniendo GIFs trending
   [API GIFs] Éxito: 20 GIFs obtenidos
   ```

## Cómo Funciona

### Flujo de Datos

```
Cliente (GifPicker.tsx)
    ↓
    GET /api/gifs?q=gato&limit=20
    ↓
Servidor (src/app/api/gifs/route.ts)
    ↓
    Lee TENOR_API_KEY de .env.local (privada)
    ↓
    GET https://tenor.googleapis.com/v2/search?q=gato&key=TENOR_API_KEY&limit=20&media_filter=gif
    ↓
Google Cloud Tenor API (v2)
    ↓
    Respuesta JSON { results: [...] }
    ↓
Servidor
    ↓
    Reenvía respuesta al cliente
    ↓
Cliente (GifPicker.tsx)
    ↓
    Renderiza GIFs en el modal
```

### Endpoints del Proxy

**Trending GIFs**:

```
GET /api/gifs?limit=20
```

**Buscar GIFs**:

```
GET /api/gifs?q=gato&limit=20
```

## Errores Comunes

### "Tenor API key not configured" (Error 500)

- **Causa**: `TENOR_API_KEY` no está en `.env.local`
- **Solución**:
  - Agrega `TENOR_API_KEY=tu_api_key` a `.env.local`
  - Reinicia el servidor: `Ctrl+C` y `npm run dev`

### "Error 401: Unauthorized"

- **Causa**: API key inválida, expirada o no habilitada en Google Cloud
- **Solución**:
  - Verifica que la clave viene de **Google Cloud Console** (no del dashboard clásico de Tenor)
  - Verifica que la API de Tenor está habilitada en Google Cloud
  - Genera una clave nueva si es necesario
  - Actualiza `.env.local` y reinicia el servidor

### "Error 404: Not Found"

- **Causa**: Endpoint incorrecto (ej: `https://g.tenor.com/v1/...` en lugar de `https://tenor.googleapis.com/v2/...`)
- **Solución**: Verifica que `src/app/api/gifs/route.ts` usa `https://tenor.googleapis.com/v2`

### "Internal server error" (Error 500)

- **Causa**: Error inesperado en el proxy
- **Solución**: Revisa los logs del servidor (`npm run dev`) para ver el stack trace

## Seguridad

✅ **Ventajas del Proxy**:

- API key nunca se expone al cliente
- CORS manejado automáticamente
- Validación en el servidor
- Logging centralizado
- Fácil de monitorear y auditar

## Recursos

- [Tenor API Docs](https://tenor.com/developer/documentation)
- [Tenor Dashboard](https://tenor.com/developer/dashboard)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

## Archivos Modificados

- `src/app/api/gifs/route.ts` - Nuevo proxy de API
- `src/components/comentarios/GifPicker.tsx` - Usa proxy en lugar de API directa
