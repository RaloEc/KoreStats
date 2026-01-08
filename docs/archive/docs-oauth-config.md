# Configuración de OAuth para Producción

## Problema Resuelto
Se ha corregido un problema donde después de iniciar sesión con Google OAuth en el sitio desplegado, la página intentaba cargar recursos desde localhost, causando que no cargara correctamente.

## Solución Implementada

### 1. Modificación en OAuthButtons.tsx
Se modificó la función `handleOAuthSignIn` para usar la variable de entorno `NEXT_PUBLIC_SITE_URL` cuando esté disponible, en lugar de siempre usar `window.location.origin`:

```typescript
const baseUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL 
  ? process.env.NEXT_PUBLIC_SITE_URL 
  : window.location.origin
```

### 2. Mejora en el Callback de Autenticación
Se mejoró el manejo de redirecciones en `src/app/auth/callback/route.ts` para usar la variable de entorno `NEXT_PUBLIC_SITE_URL` y verificar correctamente los dominios:

```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
```

## Configuración Necesaria para Producción

### Variables de Entorno
Es **CRÍTICO** configurar correctamente la variable `NEXT_PUBLIC_SITE_URL` en el entorno de producción:

1. En Netlify, ve a Settings > Build & deploy > Environment variables
2. Agrega la variable `NEXT_PUBLIC_SITE_URL` con el valor de la URL completa de tu sitio (ej: `https://tu-sitio.netlify.app`)
3. No incluyas una barra al final de la URL

### Configuración en Supabase
Asegúrate de que en la configuración de OAuth de Supabase:

1. La URL de redirección incluya el dominio de producción: `https://tu-sitio.netlify.app/auth/callback`
2. Si estás usando desarrollo local, también incluye: `http://localhost:3000/auth/callback`

### Configuración en Google Cloud Console
En la consola de Google Cloud para tu proyecto OAuth:

1. Agrega el dominio de producción como dominio autorizado
2. Agrega la URL de redirección completa: `https://tu-sitio.netlify.app/auth/callback`

## Verificación
Para verificar que la configuración funciona correctamente:

1. Despliega la aplicación con las variables de entorno configuradas
2. Intenta iniciar sesión con Google OAuth
3. Verifica en la consola del navegador que la URL de redirección use el dominio correcto
4. Confirma que después de la autenticación, no hay intentos de cargar recursos desde localhost
